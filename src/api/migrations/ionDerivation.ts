import type { ApiAccountAny, ApiBip39Account, ApiTonWallet, OnApiUpdate } from '../types';

import { parseAccountId } from '../../util/account';
import { logDebugError } from '../../util/logs';
import { callWindow } from '../../util/windowProvider/connector';
import { getWalletFromBip39Mnemonic } from '../chains/ton/auth';
import { ION_BIP39_PATH, TON_BIP39_PATH } from '../chains/ton/derivationConstants';
import { fetchStoredAccount, fetchStoredAccounts, getCurrentAccountId } from '../common/accounts';
import { getMnemonic, validateBip39Mnemonic } from '../common/mnemonic';
import { buildTonBackendAuthToken } from '../methods/auth';
import { addPollingAccount, removePollingAccount, setActivePollingAccount } from '../methods/polling';
import { storage } from '../storages';

export type Migration = {
  oldWallet: ApiTonWallet;
  newWallet: ApiTonWallet;
  committed?: true;
  lion?: PendingTransfer;
  ion?: PendingTransfer;
};

type PendingTransfer = {
  txId: string;
  oldSeqno: number;
  oldBalance: string;
  newBalance: string;
  completed?: true;
};

let onUpdate: OnApiUpdate;

export function initIonDerivationMigration(_onUpdate: OnApiUpdate) {
  onUpdate = _onUpdate;
}

export async function getMigrations(): Promise<Record<string, Migration>> {
  return await storage.getItem('ionDerivationMigrations') ?? {};
}

export async function saveMigration(accountId: string, migration: Migration) {
  await storage.mutateItem!('ionDerivationMigrations', (entries) => ({ ...entries, [accountId]: migration }));
}

export async function getLegacyIonDerivationCandidateIds() {
  const accounts = await fetchStoredAccounts();
  return Object.entries(accounts)
    .filter(([, account]) => account.type === 'bip39'
      && account.byChain.ton?.derivation?.path === TON_BIP39_PATH)
    .map(([accountId]) => accountId);
}

async function prepareMigration(accountId: string, account: ApiBip39Account, mnemonic: string[]) {
  const { network } = parseAccountId(accountId);
  const oldWallet = account.byChain.ton!;
  const derivation = { path: ION_BIP39_PATH, index: oldWallet.derivation!.index };
  const [newWallet] = await getWalletFromBip39Mnemonic(network, mnemonic, derivation, true);
  if (!newWallet || newWallet.address === oldWallet.address) throw new Error('Invalid ION derivation target');
  const authAccount: ApiBip39Account = { ...account, byChain: { ...account.byChain, ton: newWallet } };
  const authToken = await buildTonBackendAuthToken(mnemonic, authAccount);
  if (authToken) newWallet.authToken = authToken;

  const migration: Migration = { oldWallet, newWallet };
  await saveMigration(accountId, migration);
  return migration;
}

async function commitMigration(accountId: string, migration: Migration) {
  if (migration.committed) return;
  const oldAccount = await fetchStoredAccount<ApiBip39Account>(accountId);
  const newAccount: ApiBip39Account = {
    ...oldAccount,
    byChain: {
      ...oldAccount.byChain,
      ton: oldAccount.byChain.ton?.address === migration.newWallet.address
        ? oldAccount.byChain.ton
        : { ...migration.newWallet },
    },
  };

  await storage.mutateItem!('accounts', (accounts: Record<string, ApiAccountAny> = {}) => {
    const stored = accounts[accountId];
    if (stored?.byChain.ton?.address !== migration.oldWallet.address
      && stored?.byChain.ton?.address !== migration.newWallet.address) {
      throw new Error('ION account changed during migration');
    }
    return { ...accounts, [accountId]: newAccount };
  });

  const saved = await storage.getItem('accounts', true) as Record<string, ApiAccountAny>;
  if (saved[accountId]?.byChain.ton?.address !== migration.newWallet.address) {
    throw new Error('ION migration was not persisted');
  }

  const accepted = await callWindow(
    'commitIonDerivationMigration',
    accountId,
    migration.oldWallet.address,
    migration.newWallet.address,
    migration.newWallet.derivation!,
  );
  if (!accepted) throw new Error('ION address update was not accepted by the UI');

  removePollingAccount(accountId);
  addPollingAccount(accountId, newAccount);
  if (await getCurrentAccountId() === accountId) {
    await setActivePollingAccount(accountId, {}, true);
  }
  onUpdate({
    type: 'updateAccount',
    accountId,
    chain: 'ton',
    address: migration.newWallet.address,
    derivation: migration.newWallet.derivation,
  });
  await saveMigration(accountId, { ...migration, committed: true });
}

export async function reconcileIonDerivationMigrations() {
  const entries = await getMigrations();
  for (const [accountId, migration] of Object.entries(entries)) {
    if (migration.committed) continue;
    try {
      await commitMigration(accountId, migration);
    } catch (err) {
      logDebugError('reconcileIonDerivationMigrations', accountId, err);
    }
  }
}

export async function migrateLegacyIonDerivations(enclaveToken: string) {
  const ids = await getLegacyIonDerivationCandidateIds();
  const entries = await getMigrations();
  const failures: Record<string, string> = {};

  for (const accountId of ids) {
    try {
      const account = await fetchStoredAccount<ApiBip39Account>(accountId);
      const mnemonic = await getMnemonic(accountId, enclaveToken);
      if (!mnemonic || !validateBip39Mnemonic(mnemonic)) throw new Error('Cannot unlock BIP39 phrase');
      const existing = entries[accountId];
      const migration = existing?.oldWallet.address === account.byChain.ton?.address
        ? existing
        : await prepareMigration(accountId, account, mnemonic);
      await commitMigration(accountId, migration);
    } catch (err) {
      failures[accountId] = err instanceof Error ? err.message : String(err);
      logDebugError('migrateLegacyIonDerivations', accountId, err);
    }
  }
  return failures;
}
