describe('unsupported ION services', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    [undefined, true],
    ['', true],
    ['1', true],
    ['0', false],
  ] as const)(
    'requires an explicit 0 to enable services (env: %s)',
    (value, isDisabled) => {
      const env = { ...process.env };
      for (const key of ['NO_PENDING_ACTIVITIES', 'NO_WEBSOCKET', 'NO_TRACE_EMULATION']) {
        if (value === undefined) {
          delete env[key];
        } else {
          env[key] = value;
        }
      }
      jest.replaceProperty(process, 'env', env);

      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const config = require('./config') as typeof import('./config');

        expect(config.NO_PENDING_ACTIVITIES).toBe(isDisabled);
        expect(config.NO_WEBSOCKET).toBe(isDisabled);
        expect(config.NO_TRACE_EMULATION).toBe(isDisabled);
      });
    },
  );
});
