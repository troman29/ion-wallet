import type { ApiActivity } from '../../../types';
import type { ParsedTrace } from '../types';

import { fetchAndParseTrace } from '../traces';
import { projectActivitiesWithTraceOutputs } from './projectActivitiesWithTraceOutputs';

jest.mock('../traces', () => ({ fetchAndParseTrace: jest.fn() }));

const HASH = 'external-message-hash';

function activity(id: string, type?: ApiActivity['type'], status: ApiActivity['status'] = 'completed'): ApiActivity {
  return { id, type, status, externalMsgHashNorm: HASH } as ApiActivity;
}

describe('projectActivitiesWithTraceOutputs', () => {
  const request = activity('request', 'unstakeRequest', 'failed');
  const refund = activity('refund', 'excess');

  beforeEach(() => jest.resetAllMocks());

  it('suppresses a child only after the full trace assigns it to the request output', async () => {
    (fetchAndParseTrace as jest.Mock).mockResolvedValue({
      traceOutputs: [{
        walletActions: [
          {
            action: { type: 'stake_withdrawal_request', success: false, details: { stake_holder: '0:wallet' } },
            activities: [request],
          },
          {
            action: { type: 'call_contract', details: { destination: '0:wallet', opcode: '0xd53276db' } },
            activities: [refund],
          },
        ],
      }],
    } as ParsedTrace);

    const result = await projectActivitiesWithTraceOutputs('mainnet', 'wallet', [request, refund]);

    expect(result).toEqual([request, { ...refund, shouldHide: true }]);
    expect(fetchAndParseTrace).toHaveBeenCalledTimes(1);
  });

  it('keeps the raw activities when the full trace is unavailable', async () => {
    (fetchAndParseTrace as jest.Mock).mockResolvedValue(undefined);

    expect(await projectActivitiesWithTraceOutputs('mainnet', 'wallet', [request, refund]))
      .toEqual([request, refund]);
  });
});
