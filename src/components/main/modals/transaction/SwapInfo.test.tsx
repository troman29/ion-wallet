import React from '../../../../lib/teact/teact';
import TeactDOM from '../../../../lib/teact/teact-dom';

import type { ApiBridgeOperation } from '../../../../api/types';

import { waitForCondition } from '../../../../../tests/util/async';
import { buildBridgeActivity } from '../../../../api/common/activities/bridge/projection';

import SwapInfo from './SwapInfo';

const mockStartExchange = jest.fn();
jest.mock('../../../../global', () => ({
  ...jest.requireActual('../../../../global'),
  getActions: () => ({ startExchange: mockStartExchange }),
}));
jest.mock('../../../../hooks/useLang', () => ({ __esModule: true, default: () => (key: string) => key }));
jest.mock('../../../ui/InteractiveTextField', () => ({ __esModule: true, default: () => undefined }));

it('opens the selected waiting operation and shows the distinct ACK refund', async () => {
  const operation: ApiBridgeOperation = {
    id: 'bridge:mainnet:ton:token:source', revision: '1', network: 'mainnet', source: 'ton',
    fromAddress: 'sender', toAddress: 'recipient', amount: '10000000000', receiveAmount: '9500000000',
    bridgeFee: '500000000', timestamp: 1000, status: 'waiting', fees: [], components: [
      { role: 'ack', chain: 'ton', hash: 'ack', messageHash: 'message', amount: '100000000', token: 'native' },
      { role: 'ack', chain: 'ton', hash: 'ack', messageHash: 'message', amount: '100000000', token: 'native' },
    ],
  };
  const root = document.createElement('div');
  document.body.append(root);
  const close = jest.fn();
  TeactDOM.render(<SwapInfo activity={buildBridgeActivity(operation)} onClose={close} />, root);

  await waitForCondition(() => root.textContent!.includes('Refunded'));
  expect(root.textContent).toContain('0.1');
  const button = Array.from(root.querySelectorAll('button')).find((item) => item.textContent === 'Continue')!;
  button.click();

  expect(close).toHaveBeenCalled();
  expect(mockStartExchange).toHaveBeenCalledWith({ source: 'ton', bridgeOperationId: operation.id });
  TeactDOM.render(undefined, root);
  root.remove();
});
