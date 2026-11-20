import { hexFromArrayBuffer } from '../../util/casting';
import { randomBase64 } from '../../util/random';
import { deriveBitsFromPasscode, LEGACY_PBKDF2_ITERATIONS, PBKDF2_ITERATIONS } from './deriveKey';

import BaseAuth from './BaseAuth';

const SALT_BYTES = 16;
const STORAGE_KEY_SALT = 'PasscodeAuth:salt';
const STORAGE_KEY_VERIFIER_SALT = 'PasscodeAuth:verifierSalt';
const STORAGE_KEY_VERIFIER = 'PasscodeAuth:verifier';
// Absent for passcodes created before the count was stored: those use LEGACY_PBKDF2_ITERATIONS
const STORAGE_KEY_ITERATIONS = 'PasscodeAuth:iterations';

export default class PasscodeAuth extends BaseAuth {
  readonly type = 'passcode';

  async setup(passcode: string) {
    const salt = randomBase64(SALT_BYTES);
    const verifierSalt = randomBase64(SALT_BYTES);
    const verifier = await generateVerifier(passcode, verifierSalt, PBKDF2_ITERATIONS);

    await Promise.all([
      this.storage.setItem(STORAGE_KEY_ITERATIONS, String(PBKDF2_ITERATIONS)),
      this.storage.setItem(STORAGE_KEY_SALT, salt),
      this.storage.setItem(STORAGE_KEY_VERIFIER_SALT, verifierSalt),
      this.storage.setItem(STORAGE_KEY_VERIFIER, verifier),
    ]);

    return this.setupSession([passcode, salt, PBKDF2_ITERATIONS]);
  }

  async authorize(isLong: boolean, passcode: string, usageCount?: number) {
    const [salt, verifierSalt, storedVerifier, storedIterations] = await Promise.all([
      this.storage.getItem(STORAGE_KEY_SALT),
      this.storage.getItem(STORAGE_KEY_VERIFIER_SALT),
      this.storage.getItem(STORAGE_KEY_VERIFIER),
      this.storage.getItem(STORAGE_KEY_ITERATIONS),
    ]);
    if (!salt || !verifierSalt || !storedVerifier) throw new Error('PasscodeAuth: Missing salt or verifier');

    const iterations = Number(storedIterations) || LEGACY_PBKDF2_ITERATIONS;
    const verifier = await generateVerifier(passcode, verifierSalt, iterations);
    if (verifier !== storedVerifier) throw new Error('PasscodeAuth: Invalid passcode');

    return this.setupSession([passcode, salt, iterations], isLong, usageCount);
  }

  async destroy() {
    this.clearSession();
    await Promise.all([
      this.storage.removeItem(STORAGE_KEY_SALT),
      this.storage.removeItem(STORAGE_KEY_VERIFIER_SALT),
      this.storage.removeItem(STORAGE_KEY_VERIFIER),
      this.storage.removeItem(STORAGE_KEY_ITERATIONS),
    ]);
  }
}

// The verifier is derived with PBKDF2, so every offline passcode guess costs a full derivation.
// Its salt must stay distinct from the session-key salt: with the same salt, the stored verifier
// would equal the KEK bits, letting anyone with storage access decrypt the master key directly.
async function generateVerifier(passcode: string, verifierSalt: string, iterations: number): Promise<string> {
  const verifierAb = await deriveBitsFromPasscode(passcode, verifierSalt, iterations);

  return hexFromArrayBuffer(verifierAb);
}
