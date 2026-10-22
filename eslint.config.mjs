import baseConfig from '@mytonwallet/eslint-config';
import { globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  baseConfig.configs.frontendRecommended,
  globalIgnores([
    'dev',
    'public',
    'mobile',
    'src/lib/big.js/',
    'src/lib/rlottie/rlottie-wasm.js',
    'src/lib/aes-js/index.js',
    'src/lib/noble-ed25519/index.js',
    'src/lib/dexie/',
    'src/lib/LovelyChart/',
    'src/push/lib/zk-email-helpers/',
    '.github/',
    '.claude/',
    'headless/',
    'babel.config.js',
    'jest.config.js',
    'postcss.config.js',
    'coverage',
    'trash',
    'deploy',
    'dist',
    'dist-electron',
    'dist-push',
  ]),
);
