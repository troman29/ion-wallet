import { Address, beginCell } from '@ton/core';

import type { TonClient } from './TonClient';
import type { TonWallet } from './tonCore';

import { sendExternal } from './sendExternal';

describe('sendExternal', () => {
  it('awaits durable persistence before sending and never broadcasts if persistence fails', async () => {
    const client = { sendFile: jest.fn() } as unknown as TonClient;
    const wallet = { address: Address.parseRaw(`0:${'0'.repeat(64)}`) } as TonWallet;
    const message = beginCell().storeUint(0, 32).endCell();
    const persist = jest.fn(() => {
      expect(client.sendFile).not.toHaveBeenCalled();
      return Promise.reject(new Error('Storage unavailable'));
    });
    await expect(sendExternal(client, wallet, message, true, persist)).rejects.toThrow('Storage unavailable');
    expect(client.sendFile).not.toHaveBeenCalled();
  });

  it('waits for persistence to finish before broadcasting the same message', async () => {
    const client = { sendFile: jest.fn().mockResolvedValue(undefined) } as unknown as TonClient;
    const wallet = { address: Address.parseRaw(`0:${'0'.repeat(64)}`) } as TonWallet;
    const message = beginCell().storeUint(0, 32).endCell();
    let release: NoneToVoidFunction;
    const persist = jest.fn(() => new Promise<void>((resolve) => {
      release = resolve;
    }));
    const sending = sendExternal(client, wallet, message, true, persist);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(client.sendFile).not.toHaveBeenCalled();
    release!();
    const sent = await sending;
    expect(client.sendFile).toHaveBeenCalledWith(sent.boc);
  });

  it('sends an accepted BOC only once', async () => {
    const client = {
      sendFile: jest.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValue(new Error('Too old seqno')),
    } as unknown as TonClient;
    const wallet = {
      address: Address.parseRaw(`0:${'0'.repeat(64)}`),
    } as TonWallet;
    const message = beginCell().storeUint(0, 32).endCell();

    await sendExternal(client, wallet, message, true);

    expect(client.sendFile).toHaveBeenCalledTimes(1);
  });
});
