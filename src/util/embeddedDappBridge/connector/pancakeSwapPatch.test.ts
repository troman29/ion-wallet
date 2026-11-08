import { patchPancakeSwap } from './pancakeSwapPatch';

const ION_ADDRESS = '0xE1ab61f7b093435204dF32F5b3A405de55445Ea8';

function row(symbol: string, name: string) {
  return `<div class="pcs-swap-picker-row"><span class="pcs-swap-picker-symbol">${symbol}</span>`
    + `<div class="pcs-swap-picker-token-name">${name}</div></div>`;
}

describe('patchPancakeSwap', () => {
  // The in-app browser injects the function as text into every page
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const patch = new Function(`return (${patchPancakeSwap.toString()})`)() as typeof patchPancakeSwap;

  it('leaves only BNB and ION in the token picker', async () => {
    document.body.innerHTML = '<div class="pcs-swap-picker-list"></div>';
    const stop = patch(window.location.hostname, ION_ADDRESS);

    document.querySelector('.pcs-swap-picker-list')!.innerHTML = [
      row('BNB', 'BNB Chain Native Token'),
      row('ION', 'Ice Open Network'),
      row('ION', 'Some Other Coin'),
      row('USDT', 'Tether USD'),
    ].join('');
    await Promise.resolve();

    const visible = [...document.querySelectorAll<HTMLElement>('.pcs-swap-picker-row')]
      .filter((element) => element.style.display !== 'none')
      .map((element) => element.textContent);
    stop?.();
    expect(visible).toEqual(['BNBBNB Chain Native Token', 'IONIce Open Network']);
  });

  it('does nothing on other sites', () => {
    document.body.innerHTML = row('USDT', 'Tether USD');
    patch('pancakeswap.finance', ION_ADDRESS);

    expect(document.querySelector<HTMLElement>('.pcs-swap-picker-row')!.style.display).toBe('');
  });
});
