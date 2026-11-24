import type { ApiBridgeQuote, ApiBridgeTransfer } from '../../api/types/bridge';

export type BridgeOperation =
  | { type: 'send'; quote: ApiBridgeQuote }
  | { type: 'claim'; transfer: ApiBridgeTransfer; fee: string };

export type BridgeScreen =
  | { name: 'form' }
  | { name: 'status'; transferId: string }
  | { name: 'review' | 'password'; operation: BridgeOperation };
