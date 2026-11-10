const mockFetchJson = jest.fn();

jest.mock('../../config', () => ({
  ...jest.requireActual('../../config'),
  BRILLIANT_API_BASE_URL: 'https://api.example.test',
  APP_VERSION: jest.requireActual('../../../package.json').version,
}));

jest.mock('../../util/fetch', () => ({
  fetchJson: (...args: unknown[]) => mockFetchJson(...args),
}));

jest.mock('../environment', () => ({
  getEnvironment: () => ({
    apiHeaders: {},
  }),
}));

jest.mock('./other', () => ({
  getClientId: () => 'test-client-id',
}));

describe('backend API helpers', () => {
  beforeEach(() => {
    mockFetchJson.mockResolvedValue({});
  });

  afterEach(() => {
    mockFetchJson.mockReset();
  });

  it('uses per-endpoint circuit breaker buckets for backend GET requests', async () => {
    const { callBackendGet } = await import('./backend');

    await callBackendGet('/swap/assets');

    expect(mockFetchJson).toHaveBeenCalledWith(
      expect.any(URL),
      undefined,
      expect.any(Object),
      { bucketKey: 'https://api.example.test/swap' },
    );
  });

  it('sends the release version on the asset catalogue request', async () => {
    const { callBackendGet } = await import('./backend');
    await callBackendGet('/assets');
    expect(mockFetchJson).toHaveBeenCalledWith(
      expect.any(URL),
      undefined,
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-App-Version': '1.0.2' }),
      }),
      { bucketKey: 'https://api.example.test/assets' },
    );
  });
});
