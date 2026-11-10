# ION Wallet

ION Wallet is a self-custodial wallet being migrated from the MyTonWallet codebase for the ION ecosystem. The target product supports the ION network and ION on BNB Chain (with native BNB for gas) across web, browser extension, Electron, Android, and iOS through Capacitor.

This repository is in active migration. Public endpoints, wallet registries, mobile-store listings, policies, help pages, and brand assets are not yet release-ready. Their status and required work are tracked in Linear.

## Product scope

- ION network wallet functionality
- ION as the supported ION asset on BNB Chain
- Self-custodial key management
- Web, browser extension, Electron, and Capacitor mobile applications

Removed product areas include the native Air client, Telegram Mini App integration, Telegram Gifts, gasless/Diesel, MFA, Agent, Ledger hardware wallets, My Wallet Cards and Giveaway, and legacy networks outside the current scope.

## Development

### Requirements

Development is supported on macOS and Linux. Windows builds additionally need a Bash-compatible shell and a ZIP utility.

### Local setup

```sh
cp .env.example .env
npm ci
```

### Run locally

```sh
npm run dev
```

New wallets use a 12-word multichain recovery phrase (ION and BNB Chain) by default. Set `CREATE_MULTICHAIN_WALLET=0` at build time to create 24-word ION-only wallets. Existing wallets can be imported with either format.

Exchange is hidden by default while its ION bridge flow is unfinished. Set `ENABLE_EXCHANGE=1` at build time to show it.

Price charts support ION, ION BEP-20, BNB, and LION for periods up to one year; the backend must provide
`GET /prices/chart/{assetId}`. LION's chart uses its historical pool redemption rate. Ordinary LION transfers
show the existing service-token warning via `STAKED_TOKEN_SLUGS`; unstaking remains available through the staking screen.

The token screen displays an information card beside the chart, or below it on narrow screens.
It loads `POST /assets?langCode=<language>` with `{ "assets": ["ton:ION"] }` and keeps token details
separate from the balance/price catalogue. The backend refreshes history and market snapshots in background
monitors; requests from the wallet only read its cache. Market cap and volume are quoted in USD by the backend and
converted to the selected currency in the client. Descriptions cover all 13 supported languages.
Opening the card refreshes its details; subsequent refreshes run once a minute while it is active.
Cached descriptions and metrics remain visible after failed refreshes in the same language.
Market metrics refresh on the server every 15 minutes. Cold history caches return a temporary error until
the background monitor fills them; chart polling retries automatically. Buy/sell volume bars require
a real breakdown and remain hidden when only total trading volume is available.
Unsupported tokens show an empty state, and failed initial requests offer a retry.

Token slugs use `ioncoin` for native ION and `ion-<full address>` for all ION Network jettons, including LION.
The internal chain ID remains `ton`; BNB Chain slugs stay unchanged. Cache schema 5 migrates token references,
balances, staking, and visibility settings, and clears cached transaction history so it is fetched again.
The legacy native slug `toncoin` migrates directly to `ioncoin`.
IndexedDB schema 8 canonicalizes token addresses and merges duplicate metadata records atomically.
Canonical records take priority while missing metadata is preserved.
LION configuration accepts raw, bounceable, non-bounceable and test-only addresses; token identities always
use URL-safe bounceable addresses without the test-only flag. The client sends `X-App-Version: 1.0.2` and also accepts
legacy `/assets` slugs. The updated backend returns ION slugs to wallets from `1.0.2` and legacy slugs to older
wallets or requests without a valid version, with `Vary: X-App-Version` to separate cached responses.

Pending activities, WebSockets, and trace emulation are disabled by default because the ION backend does not support them.
Unset or empty `NO_PENDING_ACTIVITIES`, `NO_WEBSOCKET`, and `NO_TRACE_EMULATION` values keep them disabled;
set a flag to `0` only when the configured backend supports that capability.

Useful checks:

```sh
npm run check
npm test -- --runInBand
npm run build
```

Platform configuration lives in `src/electron/config.yml`, `capacitor.config.ts`, and `mobile/`. Platform validation and signing remain release tasks (tracked in Linear).

## Release work

Do not publish an artifact solely from the repository configuration. Before a public release, complete the endpoint, registry, store, policy, signing, and visual-asset work tracked in Linear.

## Contributing

Please open a pull request with a focused change and the checks you ran. Follow the repository style and commit conventions.
