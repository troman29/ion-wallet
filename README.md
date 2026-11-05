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

New wallets use a 24-word ION-only recovery phrase by default. Set `CREATE_MULTICHAIN_WALLET=1` at build time to create 12-word multichain wallets. Existing wallets can be imported with either format.

Exchange is hidden by default while its ION bridge flow is unfinished. Set `ENABLE_EXCHANGE=1` at build time to show it.

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
