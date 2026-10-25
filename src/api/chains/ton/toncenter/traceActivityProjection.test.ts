import type { ParsedAction, ParsedTrace, TraceOutput } from '../types';

import { TRACE_ACTIVITY_RULES } from './technicalChildRules';
import { getHiddenActivityIdsFromTrace } from './traceActivityProjection';

const HOLDER = '0:wallet';

function request(): ParsedAction {
  return {
    action: {
      type: 'stake_withdrawal_request',
      success: false,
      details: { stake_holder: HOLDER, pool: '0:pool' },
    },
    activities: [{ id: 'request' }],
  } as ParsedAction;
}

function refund(id: string, opcode: string): ParsedAction {
  return {
    action: {
      type: 'call_contract',
      details: { destination: HOLDER, opcode },
    },
    activities: [{ id }],
  } as ParsedAction;
}

function trace(outputs: ParsedAction[][]): ParsedTrace {
  return {
    traceOutputs: outputs.map((walletActions) => ({ walletActions } as TraceOutput)),
  } as ParsedTrace;
}

describe('trace output activity projection', () => {
  it('hides technical returns belonging to the same output as a failed request', () => {
    const hiddenIds = getHiddenActivityIdsFromTrace(trace([[
      request(),
      refund('notification', '0x7362d09c'),
      refund('excess', '0xd53276db'),
    ]]), TRACE_ACTIVITY_RULES);

    expect([...hiddenIds]).toEqual(['notification', 'excess']);
  });

  it('keeps an action in another output of the same trace', () => {
    const hiddenIds = getHiddenActivityIdsFromTrace(trace([
      [request()],
      [refund('excess', '0xd53276db')],
    ]), TRACE_ACTIVITY_RULES);

    expect([...hiddenIds]).toEqual([]);
  });

  it('keeps an action that is also visible in another output', () => {
    const excess = refund('excess', '0xd53276db');
    const hiddenIds = getHiddenActivityIdsFromTrace(trace([
      [request(), excess],
      [excess],
    ]), TRACE_ACTIVITY_RULES);

    expect([...hiddenIds]).toEqual([]);
  });
});
