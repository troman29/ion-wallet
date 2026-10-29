import type { ApiBip39Account } from '../types';
import type { Migration } from './ionDerivationMigration';

import { LIQUID_JETTON, TONCOIN } from '../../config';
import { parseAccountId } from '../../util/account';
import { pause } from '../../util/schedulers';
import { getKeyPairFromStoredMnemonic } from '../chains/ton/auth';
import { submitGasfullTransfer } from '../chains/ton/transfer';
import { fetchBalances, getWalletInfo } from '../chains/ton/wallet';
import { fetchStoredAccount } from '../common/accounts';
import { getBackendConfigCacheSync } from '../common/cache';
import { getMnemonic, validateBip39Mnemonic } from '../common/mnemonic';
import { buildTokenSlug } from '../common/tokens';
import { bytesToHex } from '../common/utils';
import { getMigrations, saveMigration } from './ionDerivationMigration';

async function getBalances(accountId: string, address: string) {
  const { network } = parseAccountId(accountId);
  const balances = await fetchBalances(network, address, () => {});
  return {
    ion: balances[TONCOIN.slug] ?? 0n,
    lion: balances[buildTokenSlug('ton', LIQUID_JETTON)] ?? 0n,
  };
}

async function waitForTransfer(accountId: string, migration: Migration, asset: 'lion' | 'ion') {
  const pending = migration[asset]!;
  if (pending.completed) return true;
  const { network } = parseAccountId(accountId);
  for (let attempt = 0; attempt < 30; attempt++) {
    const [wallet, oldBalances, newBalances] = await Promise.all([
      getWalletInfo(network, migration.oldWallet.address),
      getBalances(accountId, migration.oldWallet.address),
      getBalances(accountId, migration.newWallet.address),
    ]);
    if ((wallet.seqno ?? 0) > pending.oldSeqno
      && oldBalances[asset] < BigInt(pending.oldBalance)
      && newBalances[asset] > BigInt(pending.newBalance)) {
      await saveMigration(accountId, { ...migration, [asset]: { ...pending, completed: true } });
      return true;
    }
    await pause(2000);
  }
  return false;
}

const recoveryInFlight = new Map<string, ReturnType<typeof runLegacyRecovery>>();

export function recoverLegacyIonFunds(accountId: string, enclaveToken: string) {
  const ongoing = recoveryInFlight.get(accountId);
  if (ongoing) return ongoing;
  const run = runLegacyRecovery(accountId, enclaveToken).finally(() => recoveryInFlight.delete(accountId));
  recoveryInFlight.set(accountId, run);
  return run;
}

async function runLegacyRecovery(accountId: string, enclaveToken: string) {
  if (getBackendConfigCacheSync()?.isLegacyIonRecoveryEnabled !== true) {
    return { error: 'Recovery is not enabled' };
  }
  let migration = (await getMigrations())[accountId];
  const account = await fetchStoredAccount<ApiBip39Account>(accountId);
  if (!migration?.committed || account.type !== 'bip39'
    || account.byChain.ton?.address !== migration.newWallet.address) {
    return { error: 'No migrated ION address found' };
  }

  const mnemonic = await getMnemonic(accountId, enclaveToken);
  if (!mnemonic || !validateBip39Mnemonic(mnemonic)) return { error: 'Cannot unlock BIP39 phrase' };
  const oldAccount: ApiBip39Account = { ...account, byChain: { ...account.byChain, ton: migration.oldWallet } };
  const oldKey = await getKeyPairFromStoredMnemonic(mnemonic, oldAccount, accountId);
  if (bytesToHex(oldKey.publicKey) !== migration.oldWallet.publicKey) {
    return { error: 'Legacy ION key does not match the saved address' };
  }

  const { network } = parseAccountId(accountId);
  for (const asset of ['lion', 'ion'] as const) {
    migration = (await getMigrations())[accountId];
    if (migration[asset]) {
      if (!await waitForTransfer(accountId, migration, asset)) return { status: 'pending' as const };
      continue;
    }

    const [oldBalances, newBalances, oldInfo] = await Promise.all([
      getBalances(accountId, migration.oldWallet.address),
      getBalances(accountId, migration.newWallet.address),
      getWalletInfo(network, migration.oldWallet.address),
    ]);
    const amount = oldBalances[asset];
    if (!amount) continue;
    const result = await submitGasfullTransfer({
      accountId,
      enclaveToken,
      sourceWallet: migration.oldWallet,
      toAddress: migration.newWallet.address,
      amount,
      ...(asset === 'lion' ? { tokenAddress: LIQUID_JETTON } : {}),
    });
    if ('error' in result) return { error: result.error };
    migration = {
      ...migration,
      [asset]: {
        txId: result.txId!,
        oldSeqno: oldInfo.seqno ?? 0,
        oldBalance: amount.toString(),
        newBalance: newBalances[asset].toString(),
      },
    };
    await saveMigration(accountId, migration);
    if (!await waitForTransfer(accountId, migration, asset)) return { status: 'pending' as const };
  }
  return { status: 'done' as const };
}
