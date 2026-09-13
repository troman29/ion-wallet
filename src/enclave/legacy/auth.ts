/**
 * Legacy authentication module for migration purposes.
 * This module retrieves passwords from old biometric storage systems.
 */
import { logDebugError } from '../../util/logs';
import { randomBytes } from '../../util/random';

export interface LegacyAuthPassword {
  kind: 'password';
}

export interface LegacyWebAuthn {
  kind: 'webauthn';
  type: 'largeBlob' | 'credBlob' | 'userHandle';
  credentialId: string;
  transports?: AuthenticatorTransport[];
}

export interface LegacyElectronSafeStorage {
  kind: 'electron-safe-storage';
  encryptedPassword: string;
}

export interface LegacyNativeBiometrics {
  kind: 'native-biometrics';
}

export type LegacyAuthConfig =
  | LegacyAuthPassword
  | LegacyWebAuthn
  | LegacyElectronSafeStorage
  | LegacyNativeBiometrics;

const CREDENTIAL_SIZE = 32;

/**
 * Retrieves password from legacy biometric storage.
 * Used during migration to decrypt old mnemonics.
 */
export async function getLegacyBiometricPassword(config: LegacyAuthConfig): Promise<string | undefined> {
  try {
    if (config.kind === 'webauthn') {
      return await getWebAuthnPassword(config);
    }

    if (config.kind === 'electron-safe-storage') {
      return await window.electron?.decryptPassword?.(config.encryptedPassword);
    }

    if (config.kind === 'native-biometrics') {
      return undefined;
    }
  } catch (err: any) {
    logDebugError('getLegacyBiometricPassword', err);
  }

  return undefined;
}

async function getWebAuthnPassword(config: LegacyWebAuthn): Promise<string | undefined> {
  const { credentialId, transports, type } = config;

  const options: CredentialRequestOptions = {
    publicKey: {
      challenge: randomBytes(CREDENTIAL_SIZE),
      allowCredentials: [
        {
          id: Buffer.from(credentialId, 'hex'),
          type: 'public-key',
          transports,
        },
      ],
      userVerification: 'required',
      extensions: {
        getCredBlob: true,
      },
    },
  };

  const assertion = (await navigator.credentials.get(options)) as PublicKeyCredential;
  if (!assertion) {
    throw new Error('WebAuthn assertion failed');
  }

  const response = assertion.response as AuthenticatorAssertionResponse;
  const extensions = assertion.getClientExtensionResults();

  if (type === 'userHandle') {
    if (!response.userHandle) {
      throw new Error('Missing userHandle');
    }
    return Buffer.from(response.userHandle).toString('hex');
  }

  const blob = extensions.getCredBlob;
  if (!blob) {
    throw new Error('Missing credBlob');
  }
  return Buffer.from(blob).toString('hex');
}

export function isLegacyBiometricAuth(config: LegacyAuthConfig): boolean {
  return config.kind !== 'password';
}
