import { TonClient } from './TonClient';

describe('TonClient.sendFile', () => {
  it('sends the BOC through the ION RPC method', async () => {
    const client = new TonClient({ endpoint: 'https://example.test' });
    const callRpc = jest.spyOn(client, 'callRpc').mockResolvedValue({ hash: 'hash' });

    await client.sendFile(Buffer.from([0xde, 0xad]));

    expect(callRpc).toHaveBeenCalledWith('sendBocReturnHash', { boc: '3q0=' });
  });

  it('propagates RPC errors', async () => {
    const client = new TonClient({ endpoint: 'https://example.test' });
    jest.spyOn(client, 'callRpc').mockRejectedValue(new Error('Invalid BOC'));

    await expect(client.sendFile('invalid')).rejects.toThrow('Invalid BOC');
  });
});
