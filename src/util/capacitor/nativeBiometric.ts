import { registerPlugin } from '@capacitor/core';

export enum BiometryType {
  NONE = 0,
  TOUCH_ID = 1,
  FACE_ID = 2,
  FINGERPRINT = 3,
  FACE_AUTHENTICATION = 4,
  IRIS_AUTHENTICATION = 5,
  MULTIPLE = 6,
}

interface IsAvailableOptions {
  isWeakAuthenticatorAllowed?: boolean;
  useFallback?: boolean;
}

interface BiometricOptions {
  description?: string;
  fallbackTitle?: string;
  isWeakAuthenticatorAllowed?: boolean;
  maxAttempts?: number;
  negativeButtonText?: string;
  reason?: string;
  subtitle?: string;
  title?: string;
  useFallback?: boolean;
}

interface Credentials {
  password: string;
  username: string;
}

interface NativeBiometricPlugin {
  deleteCredentials(options: { server: string }): Promise<void>;
  isAvailable(options?: IsAvailableOptions): Promise<{
    biometryType: BiometryType;
    errorCode: number;
    isAvailable: boolean;
  }>;
  setCredentials(options: Credentials & { server: string }): Promise<void>;
  verifyIdentity(options?: BiometricOptions): Promise<void>;
  verifyIdentityAndGetCredentials(options: BiometricOptions & { server: string }): Promise<Credentials>;
}

// The custom native biometric package ships its Android and iOS implementations but, at the
// pinned revision, omits the generated JavaScript distribution. Register the same native plugin
// directly so Capacitor can call the shipped `NativeBiometric` implementation.
export const NativeBiometric = registerPlugin<NativeBiometricPlugin>('NativeBiometric');
