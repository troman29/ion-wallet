import type * as EnclaveApi from './enclave';

import directEnclave from './providers/direct/connector';
export { getTokenAuthType } from './enclave';

const enclave: typeof EnclaveApi = directEnclave;
export { enclave };
