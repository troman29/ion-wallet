import { authorizationify, Contract, hashAuthorization, Interface } from 'ethers';

import type { ApiNetwork, ApiRevokeWalletPermissionOptions, ApiWalletPermission, EVMChain } from '../../types';
import type { ApiAnyDisplayError } from '../../types/errors';
import type { BnbApproval } from './types';
import { ApiCommonError, ApiTransactionError } from '../../types';

import { parseAccountId } from '../../../util/account';
import { getChainConfig } from '../../../util/chain';
import { toDecimal } from '../../../util/decimals';
import { fetchJson } from '../../../util/fetch';
import { logDebugError } from '../../../util/logs';
import { getEvmProvider } from './util/client';
import { fetchStoredChainAccount } from '../../common/accounts';
import { getKnownAddressInfo } from '../../common/addresses';
import { buildTokenSlug } from '../../common/tokens';
import { normalizeAddress } from './address';
import { fetchPrivateKeyString, getSignerFromPrivateKey } from './auth';
import {
  EVM_DALEGATOR_ADDRESSES,
  EVM_MAX_NUMBER,
  getBnbApiUrl,
  ZERO_ADDRESS,
} from './constants';
import { estimateEvmFee } from './transfer';
import { getWalletBalance } from './wallet';

const ERC20_APPROVE_ABI = ['function approve(address spender, uint256 amount) returns (bool)'];
const erc20ApproveInterface = new Interface(ERC20_APPROVE_ABI);

const EIP7702_DELEGATION_PREFIX = '0xef0100';

type ApprovalCandidate = {
  tokenAddress: string;
  spenderAddress: string;
};

async function getErc20Allowance(
  chain: EVMChain,
  network: ApiNetwork,
  owner: string,
  tokenAddress: string,
  spender: string,
): Promise<bigint> {
  try {
    const contract = new Contract(
      tokenAddress,
      ['function allowance(address owner, address spender) view returns (uint256)'],
      getEvmProvider(network, chain),
    );
    const result = await contract.allowance(owner, spender);
    return BigInt(result.toString());
  } catch {
    return 0n;
  }
}

async function getEvmDelegationAddress(
  chain: EVMChain,
  network: ApiNetwork,
  address: string,
): Promise<string | undefined> {
  try {
    const code = await getEvmProvider(network, chain).getCode(normalizeAddress(address));
    if (!code || code.length <= EIP7702_DELEGATION_PREFIX.length) return undefined;
    if (!code.toLowerCase().startsWith(EIP7702_DELEGATION_PREFIX)) return undefined;

    const delegateHex = code.slice(EIP7702_DELEGATION_PREFIX.length);
    if (delegateHex.length !== 40) return undefined;

    return normalizeAddress(`0x${delegateHex}`);
  } catch {
    return undefined;
  }
}

/** Spenders the owner approved, from the backend's index of ION Approval events */
async function fetchApprovalCandidates(network: ApiNetwork, address: string) {
  const { approvals } = await fetchJson<{ approvals: BnbApproval[] }>(`${getBnbApiUrl(network)}/approvals/${address}`);

  return approvals.map(({ token, spender }) => ({
    tokenAddress: normalizeAddress(token),
    spenderAddress: normalizeAddress(spender),
  }));
}

async function buildApprovalPermissions(
  chain: EVMChain,
  network: ApiNetwork,
  checksumAddress: string,
  approvalCandidates: ApprovalCandidate[],
): Promise<ApiWalletPermission[]> {
  const results = await Promise.all(
    approvalCandidates.map(async ({ tokenAddress, spenderAddress }) => {
      const token = getChainConfig(chain).tokenInfo
        .find((item) => item.tokenAddress?.toLowerCase() === tokenAddress.toLowerCase());
      if (!token) return undefined;

      const allowance = await getErc20Allowance(chain, network, checksumAddress, tokenAddress, spenderAddress);
      if (allowance === 0n) return undefined;

      const isUnlimited = allowance >= EVM_MAX_NUMBER - (EVM_MAX_NUMBER * 10n / 100n);
      const knownName = getKnownAddressInfo(spenderAddress)?.name;

      const tokenSlug = buildTokenSlug(chain, tokenAddress);

      return {
        kind: 'approval',
        chain,
        tokenAddress,
        tokenSlug,
        tokenName: token.name,
        tokenSymbol: token.symbol,
        tokenDecimals: token.decimals,
        tokenImage: token.image,
        spenderAddress,
        spenderName: knownName,
        allowance: toDecimal(allowance, token.decimals),
        isUnlimited,
      } satisfies ApiWalletPermission;
    }),
  );

  return results.filter(Boolean) as ApiWalletPermission[];
}

function buildDelegationPermission(chain: EVMChain, activeDelegateAddress: string): ApiWalletPermission {
  return {
    kind: 'delegation',
    chain,
    delegateAddress: activeDelegateAddress,
    delegateName: EVM_DALEGATOR_ADDRESSES[activeDelegateAddress],
  } satisfies ApiWalletPermission;
}

export async function fetchEvmWalletPermissions(
  chain: EVMChain,
  network: ApiNetwork,
  address: string,
): Promise<ApiWalletPermission[]> {
  const checksumAddress = normalizeAddress(address);
  const approvalCandidates = await fetchApprovalCandidates(network, checksumAddress);

  const [approvals, activeDelegateAddress] = await Promise.all([
    buildApprovalPermissions(chain, network, checksumAddress, approvalCandidates),
    getEvmDelegationAddress(chain, network, checksumAddress),
  ]);

  const delegation = activeDelegateAddress ? buildDelegationPermission(chain, activeDelegateAddress) : undefined;

  if (!delegation) {
    return approvals;
  }

  return [...approvals, delegation];
}

async function revokeEvmApproval(
  chain: EVMChain,
  options: Extract<ApiRevokeWalletPermissionOptions, { kind: 'approval' }>,
): Promise<{ txId: string } | { error: ApiAnyDisplayError }> {
  const {
    accountId,
    enclaveToken = '',
    tokenAddress,
    spenderAddress,
  } = options;
  const { network } = parseAccountId(accountId);

  try {
    const account = await fetchStoredChainAccount(accountId, chain);

    if (account.type === 'view') throw new Error('Not supported by View accounts');

    const { address } = account.byChain[chain];
    const provider = getEvmProvider(network, chain);

    const transaction = {
      from: address,
      to: normalizeAddress(tokenAddress),
      value: 0n,
      data: erc20ApproveInterface.encodeFunctionData('approve', [
        normalizeAddress(spenderAddress),
        0n,
      ]),
    };

    const [nativeBalance, fee] = await Promise.all([
      getWalletBalance(chain, network, address),
      estimateEvmFee(provider, transaction),
    ]);

    if (nativeBalance < fee) {
      return { error: ApiTransactionError.InsufficientBalance };
    }

    const privateKey = await fetchPrivateKeyString(chain, accountId, enclaveToken, account);

    if (!privateKey) {
      return { error: ApiCommonError.InvalidPassword };
    }

    const signer = getSignerFromPrivateKey(network, privateKey).connect(provider);
    const response = await signer.sendTransaction(transaction);

    return { txId: response.hash };
  } catch (err) {
    logDebugError(`evm:${chain}:revokeEvmApproval`, err);

    return { error: ApiTransactionError.UnsuccesfulTransfer };
  }
}

async function revokeEvmDelegation(
  chain: EVMChain,
  options: Extract<ApiRevokeWalletPermissionOptions, { kind: 'delegation' }>,
): Promise<{ txId: string } | { error: ApiAnyDisplayError }> {
  const {
    accountId,
    enclaveToken = '',
    delegateAddress,
  } = options;
  const { network } = parseAccountId(accountId);

  try {
    const account = await fetchStoredChainAccount(accountId, chain);

    if (account.type === 'view') throw new Error('Not supported by View accounts');

    const { address } = account.byChain[chain];
    const provider = getEvmProvider(network, chain);
    const normalizedDelegateAddress = normalizeAddress(delegateAddress);
    const activeDelegateAddress = await getEvmDelegationAddress(chain, network, address);

    if (!activeDelegateAddress || activeDelegateAddress !== normalizedDelegateAddress) {
      return { error: ApiTransactionError.UnsuccesfulTransfer };
    }

    const [nonce, networkInfo] = await Promise.all([
      provider.getTransactionCount(address),
      provider.getNetwork(),
    ]);
    const chainId = networkInfo.chainId ?? undefined;

    if (chainId === undefined) {
      return { error: ApiTransactionError.WrongNetwork };
    }

    const privateKey = await fetchPrivateKeyString(chain, accountId, enclaveToken, account);

    if (!privateKey) {
      return { error: ApiCommonError.InvalidPassword };
    }

    const signer = getSignerFromPrivateKey(network, privateKey).connect(provider);
    const unsignedAuthorization = {
      chainId,
      address: ZERO_ADDRESS,
      nonce: BigInt(nonce),
    };
    const authorization = authorizationify({
      ...unsignedAuthorization,
      signature: signer.signingKey.sign(hashAuthorization(unsignedAuthorization)),
    });

    const transaction = {
      type: 4,
      from: address,
      to: address,
      value: 0n,
      data: '0x',
      chainId,
      authorizationList: [authorization],
    };

    const [nativeBalance, fee] = await Promise.all([
      getWalletBalance(chain, network, address),
      estimateEvmFee(provider, transaction),
    ]);

    if (nativeBalance < fee) {
      return { error: ApiTransactionError.InsufficientBalance };
    }

    const response = await signer.sendTransaction(transaction);

    return { txId: response.hash };
  } catch (err) {
    logDebugError(`evm:${chain}:revokeEvmDelegation`, err);

    return { error: ApiTransactionError.UnsuccesfulTransfer };
  }
}

export async function revokeEvmWalletPermission(
  chain: EVMChain,
  options: ApiRevokeWalletPermissionOptions,
): Promise<{ txId: string } | { error: ApiAnyDisplayError }> {
  if (options.kind === 'delegation') {
    return revokeEvmDelegation(chain, options);
  }

  return revokeEvmApproval(chain, options);
}
