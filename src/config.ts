/* eslint-disable @stylistic/max-len */
import type { ApiTonWalletVersion } from './api/chains/ton/types';
import type {
  ApiBaseCurrency,
  ApiChain,
  ApiLiquidStakingState,
  ApiNftMarketplace,
  ApiSwapAsset,
  ApiSwapDexLabel,
  ApiToken,
} from './api/types';
import type { TOKEN_CARD_COLORS } from './components/main/helpers/cardColors';
import type { AutolockValueType, LangCode, LangItem } from './global/types';

export const APP_ENV = process.env.APP_ENV || 'production';

export const APP_NAME = process.env.APP_NAME || 'ION Wallet';
export const APP_VERSION = process.env.APP_VERSION!;
export const APP_COMMIT_HASH = process.env.APP_COMMIT_HASH!;
export const APP_ENV_MARKER = APP_ENV === 'staging' ? 'Beta' : APP_ENV === 'development' ? 'Dev' : undefined;
export const EXTENSION_NAME = 'ION Wallet • Crypto & Web3';
export const EXTENSION_DESCRIPTION = 'Self-custodial wallet for ION and BNB. '
  + 'Swap, stake, manage NFTs and explore dapps.';

export const DEBUG = APP_ENV !== 'production' && APP_ENV !== 'perf' && APP_ENV !== 'test';
export const DEBUG_MORE = false;
export const DEBUG_API = false;
export const DEBUG_VIEW_ACCOUNTS = false;
export const TEST_MNEMONIC = process.env.TEST_MNEMONIC?.trim();
export const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test';

export const IS_PRODUCTION = APP_ENV === 'production';
export const IS_STAGING = APP_ENV === 'staging';
export const IS_TEST = APP_ENV === 'test';
export const IS_PERF = APP_ENV === 'perf';
export const IS_EXTENSION = process.env.IS_EXTENSION === '1';
export const IS_FIREFOX_EXTENSION = process.env.IS_FIREFOX_EXTENSION === '1';
export const IS_OPERA_EXTENSION = process.env.IS_OPERA_EXTENSION === '1';
export const IS_PACKAGED_ELECTRON = process.env.IS_PACKAGED_ELECTRON === '1';
export const IS_CAPACITOR = process.env.IS_CAPACITOR === '1';
export const IS_ANDROID_DIRECT = process.env.IS_ANDROID_DIRECT === '1';
export const IS_ANDROID = IS_ANDROID_DIRECT || process.env.CAP_PLATFORM === 'android';
export const IS_HEADLESS = process.env.IS_HEADLESS === '1';

export const ELECTRON_HOST_URL = 'https://dumb-host';
export const INACTIVE_MARKER = '[Inactive]';
export const PRODUCTION_URL = 'https://wallet.ice.io';
export const BETA_URL = 'https://beta.wallet.ice.io';
// Beta desktop auto-update feed base. This is BOTH the staging gate poll base and the value baked
// into app-update.yml by the generic electron-builder provider - the two must agree.
export const BETA_UPDATE_URL = 'https://s3.wallet.ice.io/public/desktop-beta';
// Legacy brand hosts are intentionally not recognised by this build.
export const LEGACY_APP_HOSTS: string[] = [];
// Where a legacy-host visitor is nudged to continue on the current brand. Opened via a plain anchor or `window.open`,
// never `openUrl`: `SUBPROJECT_URL_MASK` treats every `*.wallet.ice.io` host as a subproject, so `openUrl` would append
// the wallet context (addresses included) and open it in the in-app iframe browser - where the site renders blank
// under `X-Frame-Options: Deny`. `utm_source` attributes the migrated traffic.
export const NEW_APP_URL = `${PRODUCTION_URL}?utm_source=legacy_web`;
export const APP_INSTALL_URL = 'https://wallet.ice.io/download';
export const APP_REPO_URL = 'https://wallet.ice.io';
export const SELF_UNIVERSAL_HOST_URL = 'https://wallet.ice.io';
export const APP_WEBSITE_URL = 'https://wallet.ice.io';
export const APP_ICON_URL = 'https://wallet.ice.io/icon-512x512.png';

// GitHub workflow uses an empty string as the default value if it's not in repository variables, so we cannot define a default value here
export const BASE_URL = process.env.BASE_URL || PRODUCTION_URL;

export const BOT_USERNAME = process.env.BOT_USERNAME || 'IONWalletBot';

export const SWAP_FEE_ADDRESS = process.env.SWAP_FEE_ADDRESS || 'UQDUkQbpTVIgt7v66-JTFR-3-eXRFz_4V66F-Ufn6vOg0GOp';

export const STRICTERDOM_ENABLED = DEBUG && !IS_PACKAGED_ELECTRON;

export const DEBUG_ALERT_MSG = 'Shoot!\nSomething went wrong, please see the error details in Dev Tools Console.';

export const PIN_LENGTH = 4;

/** If true, legacy auth data (mnemonicEncrypted, authConfig) will be removed after migration to Enclave */
export const SHOULD_CLEANUP_LEGACY_AUTH = false;
export const NATIVE_BIOMETRICS_PROMPT_KEY = 'confirm an action in ION Wallet';
// Keychain and Keystore address the stored secret by this pair, so changing either orphans
// the credentials already saved on the device
export const NATIVE_BIOMETRICS_USERNAME = 'IONWallet';
export const NATIVE_BIOMETRICS_SERVER = 'https://wallet.ice.io';

export const MNEMONIC_COUNT = 24;
export const MNEMONIC_COUNTS = [12, 24];

export const PRIVATE_KEY_HEX_LENGTH = 64;
export const MNEMONIC_CHECK_COUNT = 3;

export const MOBILE_SCREEN_MAX_WIDTH = 700; // px

export const VIEW_TRANSITION_CLASS_NAME = 'active-view-transition';

export const ANIMATION_END_DELAY = 50;

export const ANIMATED_STICKER_TINY_ICON_PX = 16;
export const ANIMATED_STICKER_ICON_PX = 30;
export const ANIMATED_STICKER_TINY_SIZE_PX = 70;
export const ANIMATED_STICKER_SMALL_SIZE_PX = 110;
export const ANIMATED_STICKER_MIDDLE_SIZE_PX = 120;
export const ANIMATED_STICKER_DEFAULT_PX = 150;
export const ANIMATED_STICKER_BIG_SIZE_PX = 156;
export const ANIMATED_STICKER_HUGE_SIZE_PX = 192;

export const DEFAULT_PORTRAIT_WINDOW_SIZE = { width: 368, height: 770 };
export const DEFAULT_LANDSCAPE_WINDOW_SIZE = { width: 980, height: 788 };
export const TRANSACTION_ADDRESS_SHIFT = 4;

export const WHOLE_PART_DELIMITER = ' '; // https://www.compart.com/en/unicode/U+202F

export const DEFAULT_SLIPPAGE_VALUE = 5;

export const GLOBAL_STATE_CACHE_DISABLED = false;
export const GLOBAL_STATE_CACHE_KEY = 'ionwallet-global-state';

export const ANIMATION_LEVEL_MIN = 0;
export const ANIMATION_LEVEL_MED = 1;
export const ANIMATION_LEVEL_MAX = 2;
export const ANIMATION_LEVEL_DEFAULT = ANIMATION_LEVEL_MAX;
export const THEME_DEFAULT = 'system';

export const MAIN_ACCOUNT_ID = '0-ton-mainnet';
export const TEMPORARY_ACCOUNT_NAME = 'Wallet';

export const TONCENTER_MAINNET_URL = process.env.TONCENTER_MAINNET_URL || 'https://toncenter.wallet.ice.io';
export const TONCENTER_MAINNET_KEY = process.env.TONCENTER_MAINNET_KEY;
export const ELECTRON_TONCENTER_MAINNET_KEY = process.env.ELECTRON_TONCENTER_MAINNET_KEY;
export const TONAPIIO_MAINNET_URL = process.env.TONAPIIO_MAINNET_URL || 'https://tonapiio.wallet.ice.io';

export const TONCENTER_TESTNET_URL = process.env.TONCENTER_TESTNET_URL || 'https://toncenter-testnet.wallet.ice.io';
export const TONCENTER_TESTNET_KEY = process.env.TONCENTER_TESTNET_KEY;
export const ELECTRON_TONCENTER_TESTNET_KEY = process.env.ELECTRON_TONCENTER_TESTNET_KEY;
export const TONAPIIO_TESTNET_URL = process.env.TONAPIIO_TESTNET_URL || 'https://tonapiio-testnet.wallet.ice.io';

export const BRILLIANT_API_BASE_URL = process.env.BRILLIANT_API_BASE_URL || 'https://api.wallet.ice.io';
export const PROXY_API_BASE_URL = process.env.PROXY_API_BASE_URL || 'https://api.wallet.ice.io/proxy';
export const IPFS_GATEWAY_BASE_URL = 'https://ipfs.io/ipfs/';
export const SSE_BRIDGE_URL = 'https://tonconnectbridge.wallet.ice.io/bridge/';

export const TON_CONNECT_ANALYTICS_URL = 'https://analytics.ton.org';

export const WALLET_CONNECT_BRIDGE_PATTERNS = 'https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org';

/** WalletConnect Pay API + collect iframe (multi-level subdomains; not covered by `*.walletconnect.com`). */
export const WALLET_CONNECT_PAY_CONNECT_ORIGINS = [
  'https://api.pay.walletconnect.com/',
  'https://api.pay.walletconnect.org/',
  'https://staging.api.pay.walletconnect.org/',
  'https://pay.walletconnect.com/',
];

export const WALLET_CONNECT_PAY_FRAME_ORIGINS = [
  'https://pay.walletconnect.com/',
];

export const WALLET_CONNECT_PROJECT_ID = process.env.WALLET_CONNECT_PROJECT_ID || '';
export const WALLET_CONNECT_PAY_APP_ID = process.env.WALLET_CONNECT_PAY_APP_ID || '';

export const EVM_MAINNET_RPC_URL = process.env.EVM_MAINNET_RPC_URL || 'https://evmapi.wallet.ice.io';
export const EVM_TESTNET_RPC_URL = process.env.EVM_TESTNET_RPC_URL || 'https://evmapi-testnet.wallet.ice.io';

export const FRACTION_DIGITS = 9;
export const SHORT_FRACTION_DIGITS = 2;

export const MAX_PUSH_NOTIFICATIONS_ACCOUNT_COUNT = 3;

export const SUPPORT_USERNAME = 'mysupport';
export const MW_NEWS_CHANNEL_NAME: Partial<Record<LangCode, string>> = {
  en: 'IONWalletEng',
  ru: 'IONWalletRus',
};
export const MW_TIPS_CHANNEL_NAME: Partial<Record<LangCode, string>> = {
  en: 'IONWalletTips',
  ru: 'IONWalletTipsRu',
};
export const NFT_MARKETPLACE_TITLES: Record<ApiNftMarketplace, string> = {
  getgems: 'Getgems',
  fragment: 'Fragment',
  opensea: 'OpenSea',
};
export const MW_STATIC_BASE_URL = 'https://static.wallet.ice.io';
export const MW_CARDS_BASE_URL = `${MW_STATIC_BASE_URL}/cards/v2/cards/`;
export const APP_PROMO_URL = 'https://wallet.ice.io/';
export const APP_WEBSITE_HOST = 'wallet.ice.io';
export const APP_TERMS_OF_USE_URL = 'https://wallet.ice.io/terms-of-use';
export const APP_PRIVACY_POLICY_URL = 'https://wallet.ice.io/privacy-policy';
export const MY_WALLET_BLOG: Partial<Record<LangCode, string>> = {
  en: 'https://wallet.ice.io/en/blog/',
  ru: 'https://wallet.ice.io/ru/blog/',
};

export const NFT_MARKETPLACE_URL = 'https://opensea.io/';
export const NFT_MARKETPLACE_TITLE = NFT_MARKETPLACE_TITLES.opensea;
export const TON_NFT_MARKETPLACE_URL = 'https://getgems.io/';
export const TON_NFT_MARKETPLACE_TITLE = NFT_MARKETPLACE_TITLES.getgems;
export const GETGEMS_BASE_MAINNET_URL = 'https://getgems.io/';
export const GETGEMS_BASE_TESTNET_URL = 'https://testnet.getgems.io/';
export const EMPTY_HASH_VALUE = 'NOHASH';

export const IFRAME_WHITELIST = [
  'http://localhost:*',
  'https://tonscan.org',
  'https://testnet.tonscan.org',
  'https://tonviewer.com',
  'https://testnet.tonviewer.com',
];
export const SUBPROJECT_URL_MASK = 'https://*.wallet.ice.io';

export const CEX_WAITING_DEADLINE = 3 * 60 * 60 * 1000; // 3 hours

export const PROXY_HOSTS = process.env.PROXY_HOSTS;

export const TINY_TRANSFER_MAX_COST = 0.01;

export const IMAGE_CACHE_NAME = 'mtw-image';
export const LANG_CACHE_NAME = 'mtw-lang-354';

export const LANG_LIST: LangItem[] = [{
  langCode: 'en',
  name: 'English',
  nativeName: 'English',
  rtl: false,
}, {
  langCode: 'es',
  name: 'Spanish',
  nativeName: 'Español',
  rtl: false,
}, {
  langCode: 'ru',
  name: 'Russian',
  nativeName: 'Русский',
  rtl: false,
}, {
  langCode: 'zh-Hans',
  name: 'Chinese (Simplified)',
  nativeName: '简体',
  rtl: false,
}, {
  langCode: 'zh-Hant',
  name: 'Chinese (Traditional)',
  nativeName: '繁體',
  rtl: false,
}, {
  langCode: 'tr',
  name: 'Turkish',
  nativeName: 'Türkçe',
  rtl: false,
}, {
  langCode: 'de',
  name: 'German',
  nativeName: 'Deutsch',
  rtl: false,
}, {
  langCode: 'th',
  name: 'Thai',
  nativeName: 'ไทย',
  rtl: false,
}, {
  langCode: 'uk',
  name: 'Ukrainian',
  nativeName: 'Українська',
  rtl: false,
}, {
  langCode: 'pl',
  name: 'Polish',
  nativeName: 'Polski',
  rtl: false,
}, {
  langCode: 'ar',
  name: 'Arabic',
  nativeName: 'العربية',
  rtl: true,
}, {
  langCode: 'fa',
  name: 'Persian',
  nativeName: 'فارسی',
  rtl: true,
}];

// Blacklist-style feature flags (default unset = feature ON). Each is substituted at build time by
// `EnvironmentPlugin`, so it both drives Webpack dead-code elimination (drops code + npm deps) and is
// readable at runtime to silence behaviour/network for anything still bundled.
export const NO_TON = process.env.NO_TON === '1';
export const NO_EVM = process.env.NO_EVM === '1';
/**
 * Drops the unconfirmed activities from the TON activity feed: the poller stops asking the indexer for
 * them, so a transfer shows up only once it is finalized.
 *
 * The ION indexer serves no `/pendingActions` and has no update socket, which are the two sources of
 * such activities; without this flag every poll spends a failing request on them. Clear it once the
 * indexer gains either.
 */
export const NO_PENDING_ACTIVITIES = process.env.NO_PENDING_ACTIVITIES === '1';
/**
 * Standalone SDK builds, embedded by third-party apps that ship their own UI, so nothing in the UI layer
 * reads this flag.
 *
 * What stays is a plain wallet: accounts, transfers, tokens, activities, NFTs, domains and TON Connect.
 * Swap, staking, WalletConnect, the explore catalogue, portfolio history, push notifications, legacy
 * (pre-Enclave) auth, the Agent, encrypted comments and the receive-screen backgrounds all go — their
 * methods leave the dispatch table and their modules leave the bundle.
 *
 * `NO_LEDGER` stays a separate axis: hardware wallet support is orthogonal to the extras.
 */
export const NO_EXTRA_FEATURES = process.env.NO_EXTRA_FEATURES === '1';
export const NO_LEDGER = process.env.NO_LEDGER === '1';
export const VALIDATION_PERIOD_MS = 65_536_000; // 18.2 h.
export const ONE_TON = 1_000_000_000n;
export const DEFAULT_FEE = 15_000_000n; // 0.015 TON
export const UNSTAKE_TON_GRACE_PERIOD = 20 * 60 * 1000; // 20 m.

export const LIQUID_POOL = process.env.LIQUID_POOL || 'EQD2_4d91M4TVbEBVyBF8J1UwpMJc361LKVCz6bBlffMW05o';
export const LIQUID_JETTON = process.env.LIQUID_JETTON || 'EQCqC6EhRJ_tpWngKxL6dV0k6DSnRUrs9GSVkLbfdCqsj6TE';
export const STAKING_MIN_AMOUNT = ONE_TON;
export const MIN_ACTIVE_STAKING_REWARDS = 100_000_000n; // 0.1 MY
// Staked tokens now showing with all other tokens, so we need to add a prefix to avoid collisions
export const STAKING_SLUG_PREFIX = 'staking-';

export const TONCONNECT_PROTOCOL_VERSION = 2;
export const TONCONNECT_WALLET_JSBRIDGE_KEY = 'ionwallet';
export const EMBEDDED_DAPP_BRIDGE_CHANNEL = 'embedded-dapp-bridge';

export const NFT_FRAGMENT_COLLECTIONS = [
  '0:0e41dc1dc3c9067ed24248580e12b3359818d83dee0304fabcf80845eafafdb2', // Anonymous Telegram Numbers
  '0:80d78a35f955a14b679faa887ff4cd5bfc0f43b4a4eea2a7e6927f3701b273c2', // Telegram Usernames
];
export const MW_CARDS_COLLECTION = 'EQCQE2L9hfwx1V8sgmF9keraHx1rNK9VmgR1ctVvINBGykyM';

export const TON_DNS_RENEWAL_WARNING_DAYS = 14;
export const TON_DNS_RENEWAL_NFT_WARNING_DAYS = 30;

export const TONCOIN = {
  name: 'ION',
  symbol: 'ION',
  slug: 'toncoin',
  decimals: 9,
  chain: 'ton',
  cmcSlug: 'toncoin',
  priceUsd: 1.5,
} as const;

export const BNB = {
  name: 'BNB',
  symbol: 'BNB',
  slug: 'bnb',
  decimals: 18,
  chain: 'bnb',
} as const;

export const STAKED_TON_SLUG = 'ton-eqcqc6ehrj';

// Tokens that do not accept new stakes; existing positions stay fully withdrawable
export const NEW_STAKE_DISABLED_TOKEN_SLUGS: ReadonlySet<string> = new Set();

export const ETHENA_STAKING_VAULT = 'EQChGuD1u0e7KUWHH5FaYh_ygcLXhsdG2nSHPXHW8qqnpZXW';
export const ETHENA_STAKING_MIN_AMOUNT = 1_000_000; // 1 USDe
export const ETHENA_ELIGIBILITY_CHECK_URL = 'https://t.me/id_app/start?startapp=cQeewNnc3pVphUcwY63WruKMQDpgePd1E7eMVoqphMZAdGoU9jwS4qRqrM1kSeaqrAiiDiC3EYAJPwZDGWqxZpw5vtGxmHma59XEt';

export const STON_PTON_ADDRESS = 'EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez';
export const STON_PTON_SLUG = 'ton-eqcm3b12qk';

export const DNS_IMAGE_GEN_URL = 'https://dns-image.wallet.ice.io/img?d=';

export const TON_USDT_MAINNET = {
  name: 'Tether USD',
  symbol: 'USD₮',
  chain: 'ton',
  slug: 'ton-eqcxe6mutq',
  decimals: 6,
  tokenAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  image: 'https://imgproxy.wallet.ice.io/imgproxy/T3PB4s7oprNVaJkwqbGg54nexKE0zzKhcrPv8jcWYzU/rs:fill:200:200:1/g:no/aHR0cHM6Ly90ZXRoZXIudG8vaW1hZ2VzL2xvZ29DaXJjbGUucG5n.webp',
  label: 'ION',
  priceUsd: 1,
} as const;

// Where to get this token: https://t.me/testgiver_ton_usdt_bot
export const TON_USDT_TESTNET = {
  ...TON_USDT_MAINNET,
  slug: 'ton-kqd0gkbm8z',
  tokenAddress: 'kQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPsyy',
  image: undefined,
} as const;

export const TON_USDE = {
  name: 'Ethena USDe',
  symbol: 'USDe',
  chain: 'ton',
  tokenAddress: 'EQAIb6KmdfdDR7CN1GBqVJuP25iCnLKCvBlJ07Evuu2dzP5f',
  slug: 'ton-eqaib6kmdf',
  decimals: 6,
  image: 'https://imgproxy.toncenter.com/binMwUmcnFtjvgjp4wSEbsECXwfXUwbPkhVvsvpubNw/pr:small/aHR0cHM6Ly9tZXRhZGF0YS5sYXllcnplcm8tYXBpLmNvbS9hc3NldHMvVVNEZS5wbmc',
} as const;

export const TON_TSUSDE = {
  name: 'Ethena tsUSDe',
  symbol: 'tsUSDe',
  chain: 'ton',
  tokenAddress: 'EQDQ5UUyPHrLcQJlPAczd_fjxn8SLrlNQwolBznxCdSlfQwr',
  slug: 'ton-eqdq5uuyph',
  decimals: 6,
  image: 'https://cache.tonapi.io/imgproxy/vGZJ7erwsWPo7DpVG_V7ygNn7VGs0szZXcNLHB_l0ms/rs:fill:200:200:1/g:no/aHR0cHM6Ly9tZXRhZGF0YS5sYXllcnplcm8tYXBpLmNvbS9hc3NldHMvdHNVU0RlLnBuZw.webp',
} as const;

/**
 * The display names this fork insists on, whatever the backend answers. The wallet still reads the
 * token list from IONWallet's backend, which calls the native coin Gram; until ION serves its own
 * list, the rebranded names would be overwritten on every poll.
 */
export const TOKEN_NAME_OVERRIDES: Record<string, { name: string; symbol: string }> = {
  [TONCOIN.slug]: { name: TONCOIN.name, symbol: TONCOIN.symbol },
};

// Wrapped ION on BNB Smart Chain: the bridged form of the native coin, verified on-chain
// (symbol ION, name "Ice Open Network", 9 decimals).
export const ION_BNB_MAINNET = {
  name: 'Ice Open Network',
  symbol: 'ION',
  decimals: 9,
  chain: 'bnb',
  slug: 'bnb-0xe1ab61f7',
  tokenAddress: '0xe1ab61f7b093435204df32f5b3a405de55445ea8',
  label: 'BEP-20',
} as const;

export const BSC_USDT_MAINNET = {
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 18,
  chain: 'bnb',
  slug: 'bnb-0x55d39832',
  tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
  label: 'BEP-20',
  image: 'https://imgproxy.wallet.ice.io/imgproxy/T3PB4s7oprNVaJkwqbGg54nexKE0zzKhcrPv8jcWYzU/rs:fill:200:200:1/g:no/aHR0cHM6Ly90ZXRoZXIudG8vaW1hZ2VzL2xvZ29DaXJjbGUucG5n.webp',
  priceUsd: 1,
} as const;

/** The properties not returned by the backend, and therefore not stored in token objects */
export const TOKEN_CUSTOM_STYLES: Partial<Record<string, {
  fontIcon?: string;
  cardColor?: keyof typeof TOKEN_CARD_COLORS;
}>> = {
  [TONCOIN.slug]: {
    fontIcon: 'icon-chain-ton',
    cardColor: 'blue',
  },
  [BNB.slug]: {
    fontIcon: 'icon-chain-bnb',
    cardColor: 'green',
  },
  [STAKED_TON_SLUG]: {
    cardColor: 'green',
  },
};

export const ALL_STAKING_POOLS = [
  LIQUID_POOL,
  ETHENA_STAKING_VAULT,
  TON_TSUSDE.tokenAddress,
];

// Native tokens in the UI display order (see CHAIN_DISPLAY_ORDER). Drives the empty-wallet token order.
export const PRIORITY_TOKENS = [
  TONCOIN,
  BNB,
] as ApiToken[];

export const INIT_SWAP_ASSETS: Record<'in' | 'out', ApiSwapAsset> = {
  in: {
    ...TONCOIN,
    isPopular: true,
  },
  out: {
    ...TON_USDT_MAINNET,
    isPopular: true,
  },
};

export const DEFAULT_SWAP_FIRST_TOKEN_SLUG = TONCOIN.slug;
export const DEFAULT_SWAP_SECOND_TOKEN_SLUG = TON_USDT_MAINNET.slug;
export const DEFAULT_SWAP_AMOUNT = '10';
export const DEFAULT_TRANSFER_TOKEN_SLUG = TONCOIN.slug;

export const SWAP_DEX_LABELS: Record<ApiSwapDexLabel, string> = {
  dedust: 'DeDust',
  ston: 'STON.fi',
};

export const ACTIVE_TAB_STORAGE_KEY = 'mtw-active-tab';

export const INDEXED_DB_NAME = 'keyval-store';
export const INDEXED_DB_STORE_NAME = 'keyval';

export const WINDOW_PROVIDER_CHANNEL = 'windowProvider';
export const WINDOW_PROVIDER_PORT = 'IONWallet_popup_reversed';

export const PORTRAIT_MIN_ASSETS_TAB_VIEW = 6;

export const DEFAULT_PRICE_CURRENCY = 'USD';
export const CURRENCIES: Record<
  ApiBaseCurrency,
  // Get the fallback rates at https://api.wallet.ice.io/currency-rates
  { name: string; decimals: number; shortSymbol?: string; shortSymbolPosition?: 'start' | 'end'; fallbackRate: string }
> = {
  USD: {
    name: 'US Dollar',
    decimals: 2,
    shortSymbol: '$',
    fallbackRate: '1',
  },
  EUR: {
    name: 'Euro',
    decimals: 2,
    shortSymbol: '€',
    fallbackRate: '0.85233500',
  },
  RUB: {
    name: 'Russian Ruble',
    decimals: 2,
    shortSymbol: '₽',
    fallbackRate: '84.49824600',
  },
  CNY: {
    name: 'Chinese Yuan',
    decimals: 2,
    shortSymbol: '¥',
    fallbackRate: '7.11865000',
  },
  BTC: {
    name: 'Bitcoin',
    decimals: 9,
    fallbackRate: '0.00000866',
  },
  TON: {
    name: 'ION',
    decimals: 9,
    shortSymbol: 'ION',
    shortSymbolPosition: 'end',
    fallbackRate: '0.31360000',
  },
};

export const BURN_ADDRESS = 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ';

export const DEFAULT_WALLET_VERSION: ApiTonWalletVersion = 'W5';
export const POPULAR_WALLET_VERSIONS: readonly ApiTonWalletVersion[] = ['v3R1', 'v3R2', 'v4R2', 'W5'];

export const DEFAULT_TIMEOUT = 10000;
export const DEFAULT_RETRIES = 3;
export const DEFAULT_ERROR_PAUSE = 500;

export const BROWSER_HISTORY_LIMIT = 10;

export const NFT_BATCH_SIZE = 4;
export const NOTCOIN_VOUCHERS_ADDRESS = 'EQDmkj65Ab_m0aZaW8IpKw4kYqIgITw_HRstYEkVQ6NIYCyW';
export const BURN_CHUNK_DURATION_APPROX_SEC = 30;
export const NOTCOIN_FORWARD_TON_AMOUNT = 30000000n; // 0.03 TON
export const NOTCOIN_EXCHANGERS = [
  'EQAPZauWVPUcm2hUJT9n36pxznEhl46rEn1bzBXN0RY_yiy2',
  'EQASgm0Qv3h2H2mF0W06ikPqYq2ctT3dyXMJH_svbEKKB3iZ',
  'EQArlmP-RhVIG2yAFGZyPZfM3m0YccxmpvoRi6sgRzWnAA0s',
  'EQA6pL-spYqZp1Ck6o3rpY45Cl-bvLMW_j3qdVejOkUWpLnm',
  'EQBJ_ehYjumQKbXfWUue1KHKXdTm1GuYJB0Fj2ST_DwORvpd',
  'EQBRmYSjxh9xlZpUqEmGjF5UjukI9v_Cm2kCTu4CoBn3XkOD',
  'EQBkiqncd7AFT5_23H-RoA2Vynk-Nzq_dLoeMVRthAU9RF0p',
  'EQB_OzTHXbztABe0QHgr4PtAV8T64LR6aDunXgaAoihOdxwO',
  'EQCL-x5kLg6tKVNGryItTuj6tG3FH5mhUEu0xRqQc-kbEmbe',
  'EQCZh2yJ46RaQH3AYmjEA8SMMXi77Oein4-3lvqkHseIAhD-',
  'EQChKo5IK3iNqUHUGDB9gtzjCjMTPtmsFqekuCA2MdreVEyu',
  'EQC6DNCBv076TIliRMfOt20RpbS7rNKDfSky3WrFEapFt8AH',
  'EQDE_XFZOYae_rl3ZMsgBCtRSmYhl8B4y2BZEP7oiGBDhlgy',
  'EQDddqpGA2ePXQF47A2DSL3GF6ZzIVmimfM2d16cdymy2noT',
  'EQDv0hNNAamhYltCh3pTJrq3oRB9RW2ZhEYkTP6fhj5BtZNu',
  'EQD2mP7zgO7-imUJhqYry3i07aJ_SR53DaokMupfAAobt0Xw',
] as const;

export const CLAIM_ADDRESS = 'EQB3zOTvPi1PmwdcTpqSfFKZnhi1GNKEVJM-LdoAirdLtash';
export const CLAIM_AMOUNT = 30000000n; // 0.03 TON
export const CLAIM_COMMENT = 'claim';

export const RE_LINK_TEMPLATE = /((ftp|https?):\/\/)?(?<host>(www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z][-a-zA-Z0-9]{1,62})\b([-a-zA-Z0-9()@:%_+.,~#?&/=]*)/g;

export const RE_TG_BOT_MENTION = /(telegram|tg)[:\s-]*@[a-z0-9_]+|(https?:\/\/)?(t\.me|telegram\.me|telegram\.dog)\/[a-z0-9_]+/mi;

export const STARS_SYMBOL = '⭐️';

export const AUTOLOCK_OPTIONS_LIST = [
  {
    value: 'never',
    name: 'Disabled',
    selectedName: 'Disabled',
    period: 0,
  },
  {
    value: '1',
    name: '30 seconds',
    selectedName: 'If away for 30 sec',
    period: 30_000,
  },
  {
    value: '2',
    name: '3 minutes',
    selectedName: 'If away for 3 min',
    period: 60_000 * 3,
  },
  {
    value: '3',
    name: '10 minutes',
    selectedName: 'If away for 10 min',
    period: 60_000 * 10,
  },
] as const;

export const AUTO_CONFIRM_DURATION_MINUTES = 5;

export const PRICELESS_TOKEN_HASHES = new Set([
  '173e31eee054cb0c76f77edc7956bed766bf48a1f63bd062d87040dcd3df700f', // FIVA SY tsTON EQAxGi9Al7hamLAORroxGkvfap6knGyzI50ThkP3CLPLTtOZ
  '5226dd4e6db9af26b24d5ca822bc4053b7e08152f923932abf25030c7e38bb42', // FIVA PT tsTON EQAkxIRGXgs2vD2zjt334MBjD3mXg2GsyEZHfzuYX_trQkFL
  'fea2c08a704e5192b7f37434927170440d445b87aab865c3ea2a68abe7168204', // FIVA YT tsTON EQAcy60qg22RCq87A_qgYK8hooEgjCZ44yxhdnKYdlWIfKXL
  'e691cf9081a8aeb22ed4d94829f6626c9d822752e035800b5543c43f83d134b5', // FIVA LP tsTON EQD3BjCjxuf8mu5kvxajVbe-Ila1ScZZlAi03oS7lMmAJjM3
  '301ce25925830d713b326824e552e962925c4ff45b1e3ea21fc363a459a49b43', // FIVA SY eUSDT EQDi9blCcyT-k8iMpFMYY0t7mHVyiCB50ZsRgyUECJDuGvIl
  '02250f83fbb8624d859c2c045ac70ee2b3b959688c3d843aec773be9b36dbfc3', // FIVA PT eUSDT EQBzVrYkYPHx8D_HPfQacm1xONa4XSRxl826vHkx_laP2HOe
  'dba3adb2c917db80fd71a6a68c1fc9e12976491a8309d5910f9722efc084ce4d', // FIVA YT eUSDT EQCwUSc2qrY5rn9BfFBG9ARAHePTUvITDl97UD0zOreWzLru
  '7da9223b90984d6a144e71611a8d7c65a6298cad734faed79438dc0f7a8e53d1', // FIVA LP eUSDT EQBNlIZxIbQGQ78cXgG3VRcyl8A0kLn_6BM9kabiHHhWC4qY
  'ddf80de336d580ab3c11d194f189c362e2ca1225cae224ea921deeaba7eca818', // tsUSDe EQDQ5UUyPHrLcQJlPAczd_fjxn8SLrlNQwolBznxCdSlfQwr
  'eb9d9891a32ec94425c09735f6ade73f4c171da0091f874d6e9d25247d583990', // Affluent TON Lending Vault EQADQ6JcK0NMuNM5uwCcS9bjcn2RTvcxYIZjNlhIhywUrfBN
  'f66c149de251ffd031bdb34b79abe43a062ba16b815433691e3ec40a77f01d71', // Affluent Ethena Multiply Vault EQDXmtbt1-WSP00tSh6N6FH-4lX7LbnrjORClmtmuZqg4Ymm
  'bca42dbdcbc0d885aaffb1eeeb027d9f338c2dd68701a05641c1d1c3171a7400', // Affluent TON Multiply Vault EQDtxQqkgIRQQR5hWlrQxiJMtLwjR3rEYNUBbEcvPDwCs1Ng
]);

export const STAKED_TOKEN_SLUGS = new Set([
  STAKED_TON_SLUG,
  TON_TSUSDE.slug,
]);

export const DEFAULT_OUR_SWAP_FEE = 0.875;
export const MW_AGGREGATOR_QUERY_ID = '4246015164496276000';

export const DEFAULT_STAKING_STATE: ApiLiquidStakingState = {
  type: 'liquid',
  id: 'liquid',
  tokenSlug: TONCOIN.slug,
  annualYield: 14.09,
  yieldType: 'APY',
  balance: 0n,
  pool: LIQUID_POOL,
  tokenBalance: 0n,
  loyaltyBalance: 0n,
  unstakeRequestAmount: 0n,
  instantAvailable: 0n,
  start: 0,
  end: 0,
  tvl: 0n,
  totalStakers: 0,
};

export const SWAP_API_VERSION = 3;
export const TONCENTER_ACTIONS_VERSION = 'v1';

export const JVAULT_URL = 'https://jvault.xyz';

export const HELP_CENTER_URL = {
  home: {
    en: 'https://help.wallet.ice.io/',
    ru: 'https://help.wallet.ice.io/ru',
  },
  domainScam: {
    en: 'https://help.wallet.ice.io/intro/scams/.ton-domain-scams',
    ru: 'https://help.wallet.ice.io/ru/baza-znanii/moshennichestvo-i-skamy/moshennichestvo-s-ispolzovaniem-domenov-.ton',
  },
  seedScam: {
    en: 'https://help.wallet.ice.io/intro/scams/leaked-seed-phrases',
    ru: 'https://help.wallet.ice.io/ru/baza-znanii/moshennichestvo-i-skamy/slitye-sid-frazy',
  },
  ethenaStaking: {
    en: 'https://help.wallet.ice.io/intro/staking/what-is-usde-how-does-the-ethena-protocol-work',
    ru: 'https://help.wallet.ice.io/ru/baza-znanii/steiking/chto-takoe-usde-kak-rabotaet-protokol-ethena',
  },
};

export const TON_DNS_ZONES = [
  {
    suffixes: ['ton'],
    baseFormat: /^([-\da-z]+\.){0,2}[-\da-z]{4,126}$/i,
    resolver: 'EQC3dNlesgVD8YbAazcauIrXBPfiVhMMr5YYk2in0Mtsz0Bz',
    collectionName: 'TON DNS Domains',
    isRenewable: true,
    isLinkable: true,
    isTelemint: false,
  },
  {
    suffixes: ['t.me'],
    baseFormat: /^([-\da-z]+\.){0,2}[-_\da-z]{4,32}$/i,
    resolver: 'EQCA14o1-VWhS2efqoh_9M1b_A9DtKTuoqfmkn83AbJzwnPi',
    collectionName: 'Telegram Usernames',
    isRenewable: false,
    isLinkable: true,
    isTelemint: true,
  },
  {
    suffixes: ['vip', 'ton.vip', 'vip.ton'],
    baseFormat: /^([-\da-z]+\.){0,2}[\da-z]{1,24}$/i,
    resolver: 'EQBWG4EBbPDv4Xj7xlPwzxd7hSyHMzwwLB5O6rY-0BBeaixS',
    collectionName: 'VIP DNS Domains',
    isRenewable: false,
    isLinkable: true,
    isTelemint: false,
  },
  {
    suffixes: ['grm'],
    baseFormat: /^([-\da-z]+\.){0,2}[-\da-z]{1,127}$/i,
    resolver: 'EQAic3zPce496ukFDhbco28FVsKKl2WUX_iJwaL87CBxSiLQ',
    collectionName: 'GRAM DNS Domains',
    isRenewable: false,
    isLinkable: true,
    isTelemint: false,
  },
] as const;

export const RENEWABLE_TON_DNS_COLLECTIONS = new Set<string>(
  TON_DNS_ZONES.filter((zone) => zone.isRenewable).map((zone) => zone.resolver),
);

export const DEFAULT_AUTOLOCK_OPTION: AutolockValueType = '3';
export const WRONG_ATTEMPTS_BEFORE_LOG_OUT_SUGGESTION = 2;

export const UNKNOWN_TOKEN = {
  symbol: '[Unknown]',
  decimals: 9,
} as const;

export const DEFAULT_CHAIN: ApiChain = 'ton';
