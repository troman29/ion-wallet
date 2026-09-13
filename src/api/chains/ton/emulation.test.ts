import type { ApiActivity } from '../../types';
import type { EmulationResponse } from './toncenter/emulation';
import type { TracesResponse } from './toncenter/traces';

import { tryUpdateKnownAddresses } from '../../common/addresses';
import { parseEmulation } from './emulation';

describe('parseEmulation', () => {
  // The request for the list of trusted collections does not work in the test environment,
  // so we add the trusted collections manually.
  const trustedCollections = [
    'EQCA14o1-VWhS2efqoh_9M1b_A9DtKTuoqfmkn83AbJzwnPi',
  ];

  // You can use a regular trace, as it is converted to emulation format by the convertTraceToEmulation function.
  // Alternatively, you can obtain the emulation format from the `/api/emulate/v1/emulateTrace` response.
  const testCases: {
    name: string;
    walletAddress: string;
    traceResponse: TracesResponse | EmulationResponse;
    expectedActivities: Partial<ApiActivity>[];
    expectedRealFee: bigint;
  }[] = [
    {
      name: 'ton swap usdt (bidask)',
      walletAddress: 'UQC5p9zhlDG1YEQlTGmFjo3BH-xcB2He1BXjhvvktOEW9Xi0',
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      traceResponse: require('./testData/bidask/tonSwapUsdtTraceResponse.json'),
      expectedActivities: [
        {
          kind: 'transaction',
          isIncoming: false,
          amount: -1500000000n,
          status: 'completed',
          slug: 'toncoin',
          type: 'callContract',
        },
        {
          kind: 'transaction',
          amount: 2202373n,
          slug: 'ton-eqcxe6mutq',
          isIncoming: true,
          status: 'completed',
        },
        {
          kind: 'transaction',
          amount: 464808177n,
          slug: 'toncoin',
          isIncoming: true,
          type: 'excess',
          status: 'completed',
        },
      ],
      expectedRealFee: 38079117n,
    },
    {
      name: 'usdt swap ton (bidask)',
      walletAddress: 'UQC5p9zhlDG1YEQlTGmFjo3BH-xcB2He1BXjhvvktOEW9Xi0',
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      traceResponse: require('./testData/bidask/usdtSwapTonTraceResponse.json'),
      expectedActivities: [
        {
          kind: 'transaction',
          amount: -1000000n,
          slug: 'ton-eqcxe6mutq',
          isIncoming: false,
          status: 'completed',
        },
        {
          kind: 'transaction',
          isIncoming: true,
          amount: 918967397n,
          status: 'completed',
          slug: 'toncoin',
        },
        {
          kind: 'transaction',
          amount: 975358597n,
          slug: 'toncoin',
          isIncoming: true,
          type: 'excess',
          status: 'completed',
        },
      ],
      expectedRealFee: 39872842n,
    },
    {
      name: 'usdt swap tgusd (bidask)',
      walletAddress: 'UQC5p9zhlDG1YEQlTGmFjo3BH-xcB2He1BXjhvvktOEW9Xi0',
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      traceResponse: require('./testData/bidask/usdtSwapTgusdTraceResponse.json'),
      expectedActivities: [
        {
          kind: 'transaction',
          isIncoming: false,
          amount: -1000000n,
          status: 'completed',
          slug: 'ton-eqcxe6mutq',
        },
        {
          kind: 'transaction',
          isIncoming: true,
          amount: 1000948n,
          status: 'completed',
          slug: 'ton-eqcj7asxok',
        },
        {
          kind: 'transaction',
          amount: 506814520n,
          slug: 'toncoin',
          isIncoming: true,
          type: 'excess',
          status: 'completed',
        },
      ],
      expectedRealFee: 56669485n,
    },
    {
      name: 'transfer token (ton minter)',
      walletAddress: 'UQC5p9zhlDG1YEQlTGmFjo3BH-xcB2He1BXjhvvktOEW9Xi0',
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      traceResponse: require('./testData/transferTokenTraceResponse.json'),
      expectedActivities: [
        {
          kind: 'transaction',
          isIncoming: false,
          amount: -1000000000n,
          status: 'completed',
          slug: 'ton-eqa60e89jy',
        },
        {
          kind: 'transaction',
          amount: 16951968n,
          slug: 'toncoin',
          isIncoming: true,
          type: 'excess',
          status: 'completed',
        },
      ],
      expectedRealFee: 35888836n,
    },
    {
      name: 'usdt swap build 2 split (swap coffee)',
      walletAddress: 'UQC5p9zhlDG1YEQlTGmFjo3BH-xcB2He1BXjhvvktOEW9Xi0',
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      traceResponse: require('./testData/swapCoffee/usdtSwapBuild2SplitTraceResponse.json'),
      expectedActivities: [
        {
          kind: 'transaction',
          isIncoming: false,
          amount: -17288589n,
          status: 'completed',
          slug: 'ton-eqcxe6mutq',

        },
        {
          kind: 'swap',
          from: 'ton-eqcxe6mutq',
          fromAmount: '12.711411',
          to: 'ton-eqbynurilw',
          toAmount: '147.049519323',
          status: 'completed',
        },
        {
          kind: 'transaction',
          amount: 380918669n,
          slug: 'toncoin',
          isIncoming: true,
          type: 'excess',
          status: 'completed',
        },
      ],
      expectedRealFee: 494980102n,
    },
  ];

  beforeAll(async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    jest.spyOn(require('../../common/backend'), 'callBackendGet')
      .mockResolvedValue({
        knownAddresses: {},
        scamMarkers: [],
        trustedSites: [],
        trustedCollections,
        tonNftSuperCollections: [],
      });

    await tryUpdateKnownAddresses();
  });

  test.each(testCases)('$name', (params) => {
    const {
      walletAddress,
      traceResponse,
      expectedActivities,
      expectedRealFee,
    } = params;

    const emulationResponse = 'traces' in traceResponse ? convertTraceToEmulation(traceResponse) : traceResponse;
    const result = parseEmulation('mainnet', walletAddress, emulationResponse, {});

    expect(result.realFee).toBe(expectedRealFee);
    expect(result.activities).toEqual(
      expectedActivities.map((expectedActivity) => expect.objectContaining(expectedActivity)),
    );
  });
});

function convertTraceToEmulation(traceResponse: TracesResponse): EmulationResponse {
  const trace = traceResponse.traces[0];

  if (!trace) {
    throw new Error('No traces found in TracesResponse');
  }

  return {
    mc_block_seqno: parseInt(trace.mc_seqno_end, 10),
    trace: trace.trace,
    actions: trace.actions,
    transactions: trace.transactions,
    account_states: {},
    rand_seed: '',
    metadata: traceResponse.metadata,
    address_book: traceResponse.address_book,
  };
}
