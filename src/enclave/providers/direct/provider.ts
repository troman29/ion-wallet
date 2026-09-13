import { IS_CAPACITOR } from '../../../config';
import { CHANNEL_NAME } from '../../config';
import { createPostMessageInterface } from '../../../util/createPostMessageInterface';
import { IS_ELECTRON } from '../../../util/windowEnvironment';
import * as enclaveApi from '../../enclave';
import idbStorage from '../../storage/idb';

const enclaveRpcApi = enclaveApi;

createPostMessageInterface(enclaveRpcApi, CHANNEL_NAME, window, true, window.location.origin);

void enclaveApi.setupStorage(idbStorage);

void (async () => {
  const { default: BiometricAuthClass } = IS_CAPACITOR
    ? await import('../../auth/CapacitorBiometricAuth')
    : (IS_ELECTRON
      ? await import('../../auth/ElectronAuth')
      : await import('../../auth/WebAuthnAuth')
    );

  void enclaveApi.setupBiometricAuthClass(BiometricAuthClass);
})();
