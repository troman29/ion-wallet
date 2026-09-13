import { isIonsiteAddress } from './isValidAddress';

describe('isIonsiteAddress', () => {
  it.each([
    'ionsite://example.ion',
    ' IONSITE://Example.ion ',
    'ion://example.ion',
  ])('recognizes %s', (address) => {
    expect(isIonsiteAddress(address)).toBe(true);
  });

  it.each([
    'tonsite://example.ton',
    'https://example.ion',
  ])('does not recognize %s', (address) => {
    expect(isIonsiteAddress(address)).toBe(false);
  });
});
