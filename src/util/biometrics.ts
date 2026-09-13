import { IS_CAPACITOR } from '../config';
import {
  getIsCapacitorBiometricAuthSupported,
  getIsCapacitorFaceIdAvailable,
  getIsCapacitorTouchIdAvailable,
} from './capacitor';
import { IS_BIOMETRIC_AUTH_SUPPORTED } from './windowEnvironment';

export function getIsBiometricAuthSupported() {
  return IS_BIOMETRIC_AUTH_SUPPORTED || getIsNativeBiometricAuthSupported();
}

export function getIsNativeBiometricAuthSupported() {
  return IS_CAPACITOR && getIsCapacitorBiometricAuthSupported();
}

export function getIsFaceIdAvailable() {
  return IS_CAPACITOR && getIsCapacitorFaceIdAvailable();
}

export function getIsTouchIdAvailable() {
  return IS_CAPACITOR && getIsCapacitorTouchIdAvailable();
}

export function getDoesUsePinPad() {
  return IS_CAPACITOR;
}
