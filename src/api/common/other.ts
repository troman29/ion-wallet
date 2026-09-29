import { randomBytes } from '../../util/random';
import { storage } from '../storages';

let clientId: string | undefined;
export async function initClientId() {
  if (!clientId) {
    clientId = await storage.getItem('clientId');
  }

  if (!clientId) {
    const hex = Buffer.from(randomBytes(10)).toString('hex');
    clientId = hex;
    void storage.setItem('clientId', clientId);
  }
}

export function getClientId() {
  return clientId!;
}
