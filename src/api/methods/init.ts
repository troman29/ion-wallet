import type { ApiInitArgs, OnApiUpdate } from '../types';

import { initWindowConnector } from '../../util/windowProvider/connector';
import { connectUpdater, disconnectUpdater, tryMigrateStorage } from '../common/helpers';
import { initClientId } from '../common/other';
import { getProtocolManager, initProtocolManager } from '../dappProtocols';
import { setEnvironment } from '../environment';
import { addHooks } from '../hooks';
import { configureStorage, createStorage, withStorage } from '../storages';
import { destroyPolling } from './polling';
import * as methods from '.';

export default async function init(onUpdate: OnApiUpdate, args: ApiInitArgs) {
  const runtimeStorage = createStorage(args.storage);

  configureStorage(args.storage);
  connectUpdater(onUpdate);

  const environment = setEnvironment(args);
  initWindowConnector();

  if (args.langCode) {
    await runtimeStorage.setItem('langCode', args.langCode);
  }

  await withStorage(runtimeStorage, async () => {
    await initClientId();
    await tryMigrateStorage(onUpdate);
  });

  methods.initAccounts(onUpdate);
  methods.initAuth(onUpdate);
  methods.initPolling(onUpdate);
  methods.initTransfer(onUpdate);
  methods.initTokens(onUpdate);
  methods.initNfts(onUpdate);
  if (process.env.NO_EXTRA_FEATURES !== '1') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const extra = require('./extra') as typeof import('./extra');
    extra.initStaking();
  }
  await initProtocolManager(onUpdate, environment);

  if (environment.isDappSupported) {
    methods.initDapps(onUpdate);
  }

  const protocolManager = getProtocolManager();

  addHooks({
    onDappDisconnected: protocolManager.closeRemoteConnection.bind(protocolManager),
    onDappsChanged: protocolManager.resetupRemoteConnection.bind(protocolManager),
  });
}

export function destroy() {
  void destroyPolling();
  disconnectUpdater();
}
