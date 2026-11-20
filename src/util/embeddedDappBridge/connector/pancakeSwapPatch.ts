// pancakeswap.finance redirects to pancake.xyz; both stay in case the redirect goes away
export const PANCAKESWAP_HOSTS = ['pancake.xyz', 'pancakeswap.finance'];

/**
 * Narrows PancakeSwap in the in-app browser to swapping BNB and ION (BEP-20) with this wallet: other tokens,
 * the navigation, the search and the ads are hidden.
 *
 * PancakeSwap's mobile wallet list ignores EIP-6963 and lists only the wallets it knows. It connects the injected
 * provider by itself only inside a wallet browser it recognizes by a flag, so the patch marks ours with `isBinance`.
 *
 * Self-contained: the in-app browser injects its source text into every page, so it checks the host itself.
 * It relies on PancakeSwap's markup (`pcs-swap-picker-*` classes) and URL parameters; if they change, the token
 * picker shows all tokens again, but the URL check still puts BNB and ION back.
 */
export function patchPancakeSwap(hosts: string[], ionTokenAddress: string) {
  if (!hosts.includes(window.location.hostname)) return undefined;

  // PancakeSwap reads the flag while it loads, so it has to be set before DOMContentLoaded
  const { ethereum } = window as unknown as { ethereum?: { isBinance?: boolean } };
  if (ethereum) {
    ethereum.isBinance = true;
  }

  const ALLOWED_CURRENCIES = ['bnb', ionTokenAddress.toLowerCase()];
  const ALLOWED_TOKENS: Record<string, string> = { BNB: 'BNB CHAIN NATIVE TOKEN', ION: 'ICE OPEN NETWORK' };
  const REDIRECT_KEY = 'ionwallet:pancakeswap-redirected-at';
  const REDIRECT_INTERVAL = 10000;

  function keepAllowedCurrencies() {
    const url = new URL(window.location.href);
    if (!url.pathname.startsWith('/swap')) return;

    const input = url.searchParams.get('inputCurrency')?.toLowerCase();
    const output = url.searchParams.get('outputCurrency')?.toLowerCase();
    // Without the parameters PancakeSwap falls back to its own default tokens
    const isAllowed = (currency?: string) => currency !== undefined && ALLOWED_CURRENCIES.includes(currency);
    if (url.searchParams.get('chain') === 'bsc' && isAllowed(input) && isAllowed(output)) return;

    // Guards against a loop in case PancakeSwap ever rewrites the parameters right after the page loads
    const lastRedirectAt = Number(sessionStorage.getItem(REDIRECT_KEY));
    if (Date.now() - lastRedirectAt < REDIRECT_INTERVAL) return;
    sessionStorage.setItem(REDIRECT_KEY, String(Date.now()));

    url.searchParams.set('chain', 'bsc');
    url.searchParams.set('inputCurrency', 'BNB');
    url.searchParams.set('outputCurrency', ionTokenAddress);
    window.location.replace(url.toString());
  }

  function hideOtherTokens() {
    document.querySelectorAll<HTMLElement>('.pcs-swap-picker-row').forEach((row) => {
      const symbol = row.querySelector('.pcs-swap-picker-symbol')?.textContent?.trim() ?? '';
      const name = row.querySelector('.pcs-swap-picker-token-name')?.textContent?.trim().toUpperCase();
      const isAllowed = ALLOWED_TOKENS[symbol] !== undefined && ALLOWED_TOKENS[symbol] === name;
      row.style.display = isAllowed ? '' : 'none';
    });
  }

  const style = document.createElement('style');
  // Everything that leads to other tokens or other parts of PancakeSwap
  style.textContent = [
    '.pcs-swap-picker-search-row',
    '.pcs-swap-picker-network-label',
    '.pcs-swap-picker-network-row',
    '.pcs-swap-picker-group-label',
    '.pcs-swap-exchange-page-column > :not(.pcs-swap-module)',
    '.pcs-swap-module-tabs > .pcs-swap-module-tab:not(:first-child)',
    '[class*="styled__MobileNavBox"]',
    '[class*="styled__DesktopNavBox"]',
    '[class*="styled__SearchRoot"]',
    '[class*="styled__FooterWrapper"]',
    '[class*="SwapAdFrame__Frame"]',
  ].join(',') + '{display:none !important}';

  const observer = new MutationObserver(() => {
    keepAllowedCurrencies();
    hideOtherTokens();
  });

  function start() {
    document.head.appendChild(style);
    keepAllowedCurrencies();
    hideOtherTokens();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  return () => observer.disconnect();
}
