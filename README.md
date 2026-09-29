# ION Wallet

ION Wallet is a self-custodial wallet being migrated from the MyTonWallet codebase for the ION ecosystem. The target product supports ION/TON and ION on BNB Chain across web, browser extension, Electron, Android, and iOS through Capacitor.

This repository is in active migration. Public endpoints, wallet registries, mobile-store listings, policies, help pages, and brand assets are not yet release-ready. Their current status and required work live in [Migration to ION](MIGRATION_TO_ION.md) and the [rebranding resource registry](REBRANDING_RESOURCE_REGISTRY.md).

## Product scope

- ION/TON wallet functionality
- ION as the supported ION asset on BNB Chain
- Self-custodial key management
- Web, browser extension, Electron, and Capacitor mobile applications

## Removed features

The migration has removed these legacy product areas:

- Native Adobe AIR client, Telegram Mini App integration, Telegram Gifts, MFA, Agent, gasless/Diesel, My Wallet Cards, and Giveaway
- DEX/CEX swapping: providers, quotes, routing, slippage, fees, swap signing, swap history, and reconciliation
- Portfolio and token net-worth views, multisend, MyCoin vesting, nominator staking, and bank-card purchase/sale flows
- Tron and Solana support; from EVM chains, only BNB Chain remains

The Exchange window remains as a non-transactional placeholder for the future ION Network ↔ BNB Chain bridge. It will send a standard transfer to an approved bridge address only after the bridge contract, recipient, and fee model are defined in [Migration to ION](MIGRATION_TO_ION.md).

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

Useful checks:

```sh
npm run check
npm test -- --runInBand
npm run build
```

See [Electron notes](docs/electron.md) and [GPG verification](docs/gpg-check.md) for platform-specific development details.

## Release work

Do not publish an artifact solely from the repository configuration. Before a public release, complete the endpoint, registry, store, policy, signing, and visual-asset work in [REBRANDING_RESOURCE_REGISTRY.md](REBRANDING_RESOURCE_REGISTRY.md).

## Contributing

Please open a pull request with a focused change and the checks you ran. Follow the repository style and commit conventions.
