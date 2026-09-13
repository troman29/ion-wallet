import { enclave } from '../../../enclave';

export const importSecret = enclave.importSecret;
export const exportSecret = enclave.exportSecret;
export const resetEnclave = enclave.reset;

// Enclave authentication transitions
export const migrateAuth = enclave.migrateAuth;
