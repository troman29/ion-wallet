import { NativeBiometric } from '@capgo/capacitor-native-biometric';

import { APP_NAME, NATIVE_BIOMETRICS_SERVER, NATIVE_BIOMETRICS_USERNAME } from '../../config';
import { base64FromBuffer, bufferFromBase64 } from '../../util/casting';
import { randomBytes } from '../../util/random';

import BaseAuth from './BaseAuth';

const KEY_MATERIAL_BYTES = 32;
const MAX_ATTEMPTS = 1;

/**
 * Face ID and the Android biometric prompt guard a secret held by Keychain or Keystore, so the key
 * material lives there rather than in the enclave storage - the OS releases it only after the user
 * passes the prompt.
 */
export default class CapacitorBiometricAuth extends BaseAuth {
  readonly type = 'biometric';

  async setup(_passcode?: string, isLong?: boolean, usageCount?: number) {
    const keyMaterial = Buffer.from(randomBytes(KEY_MATERIAL_BYTES));

    await NativeBiometric.setCredentials({
      username: NATIVE_BIOMETRICS_USERNAME,
      password: base64FromBuffer(keyMaterial),
      server: NATIVE_BIOMETRICS_SERVER,
    });

    return this.setupSession(keyMaterial, isLong, usageCount);
  }

  async authorize(isLong?: boolean, _passcode?: string, usageCount?: number) {
    const { password } = await NativeBiometric.verifyIdentityAndGetCredentials({
      title: APP_NAME,
      subtitle: '',
      maxAttempts: MAX_ATTEMPTS,
      server: NATIVE_BIOMETRICS_SERVER,
    });

    if (!password) {
      throw new Error('CapacitorBiometricAuth: no stored key material');
    }

    return this.setupSession(bufferFromBase64(password), isLong, usageCount);
  }

  async destroy() {
    this.clearSession();
    await NativeBiometric.deleteCredentials({ server: NATIVE_BIOMETRICS_SERVER });
  }
}
