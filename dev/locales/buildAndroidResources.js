const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { convertI18nYamlToJson } = require('./convertI18nYamlToJson');

const ROOT_DIR = path.resolve(__dirname, '../..');
const I18N_DIR = path.resolve(ROOT_DIR, 'src/i18n');
const APP_RES_DIR = path.resolve(ROOT_DIR, 'mobile/android/app/src/main/res');
const APP_RES_SHARED_DIR = path.resolve(ROOT_DIR, 'mobile/android/app/src/main/res-shared');
const APP_I18N_ASSETS_DIR = path.resolve(ROOT_DIR, 'mobile/android/app/src/main/assets/public/i18n');

const DEFAULT_LOCALE = 'en';
// Overrides for the strings the Capacitor bridge shows in its WebView permission prompt
const WEB_PERMISSION_KEYS = [
  '$web_permission_prompt',
  '$web_permission_allow',
  '$web_permission_deny',
  '$web_permission_camera',
  '$web_permission_microphone',
  '$web_permission_location',
  '$web_permission_device_features',
  '$web_permission_this_site',
];
const ENCLAVE_STRING_KEYS = [
  '$enclave_use_biometrics',
  '$enclave_enter_passcode_or_use_biometrics',
  '$enclave_use_pin',
  '$enclave_cancel',
];

const SPECIAL_LOCALE_QUALIFIERS = {
  en: 'values',
  'zh-Hans': 'values-zh-rCN',
  'zh-Hant': 'values-zh-rTW',
};

function sortLocales(locales) {
  return locales.slice().sort((left, right) => {
    if (left === DEFAULT_LOCALE) {
      return -1;
    }
    if (right === DEFAULT_LOCALE) {
      return 1;
    }
    return left.localeCompare(right);
  });
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resolveQualifier(locale) {
  if (SPECIAL_LOCALE_QUALIFIERS[locale]) {
    return SPECIAL_LOCALE_QUALIFIERS[locale];
  }

  const [language, region] = locale.split('-');
  if (!region) return `values-${language}`;
  if (region.length === 2) return `values-${language}-r${region.toUpperCase()}`;
  return `values-${language}`;
}


function renderLocalesConfig(locales) {
  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<locale-config xmlns:android="http://schemas.android.com/apk/res/android">',
  ];

  for (const locale of locales) {
    lines.push(`    <locale android:name="${locale}" />`);
  }

  lines.push('</locale-config>', '');
  return lines.join('\n');
}

function writeLocalesConfig(locales) {
  const xmlContent = renderLocalesConfig(locales);
  const filePath = path.resolve(APP_RES_SHARED_DIR, 'xml/locales_config.xml');
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, xmlContent, 'utf8');
}

function writeI18nJsonAssets(locales) {
  ensureDir(APP_I18N_ASSETS_DIR);

  for (const fileName of fs.readdirSync(APP_I18N_ASSETS_DIR)) {
    if (fileName.endsWith('.json')) {
      fs.unlinkSync(path.resolve(APP_I18N_ASSETS_DIR, fileName));
    }
  }

  for (const locale of locales) {
    const yamlPath = ['yaml', 'yml']
      .map((extension) => path.resolve(I18N_DIR, `${locale}.${extension}`))
      .find((filePath) => fs.existsSync(filePath));
    const jsonContent = convertI18nYamlToJson(fs.readFileSync(yamlPath, 'utf8'));
    fs.writeFileSync(path.resolve(APP_I18N_ASSETS_DIR, `${locale}.json`), jsonContent, 'utf8');
  }
}

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, "\\'");
}

// The bridge numbers its placeholders, while the locale files name them
function applyAndroidPlaceholderMapping(value) {
  return value
    .replace(/%origin%/g, '%1$s')
    .replace(/%permissions%/g, '%2$s');
}

function renderWebPermissionXml(locale, localeMap, fallbackMap) {
  const lines = ['<?xml version="1.0" encoding="utf-8"?>', '<resources>'];

  for (const key of WEB_PERMISSION_KEYS) {
    const resourceName = key.replace(/^\$/, '');
    const rawValue = localeMap[key] ?? fallbackMap[key];
    if (typeof rawValue !== 'string') {
      throw new Error(`Missing key "${key}" for locale "${locale}" with no fallback in "${DEFAULT_LOCALE}"`);
    }
    lines.push(`    <string name="${resourceName}">${escapeXml(applyAndroidPlaceholderMapping(rawValue))}</string>`);
  }

  lines.push('</resources>', '');
  return lines.join('\n');
}

// A locale dropped from the app leaves its file behind, and Android would keep serving it
function removeStaleWebPermissionFiles(expectedFilePaths) {
  const expected = new Set(expectedFilePaths);

  for (const entry of fs.readdirSync(APP_RES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('values')) continue;

    const filePath = path.resolve(APP_RES_DIR, entry.name, 'web_permission_strings.xml');
    if (fs.existsSync(filePath) && !expected.has(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

function writeWebPermissionResources(locales, perLocale) {
  const fallbackMap = perLocale[DEFAULT_LOCALE];
  if (!fallbackMap) {
    throw new Error(`Missing required default locale "${DEFAULT_LOCALE}"`);
  }

  const expectedFilePaths = [];
  for (const locale of locales) {
    const localeDir = path.resolve(APP_RES_DIR, resolveQualifier(locale));
    const filePath = path.resolve(localeDir, 'web_permission_strings.xml');

    ensureDir(localeDir);
    fs.writeFileSync(filePath, renderWebPermissionXml(locale, perLocale[locale], fallbackMap), 'utf8');
    expectedFilePaths.push(filePath);
  }

  removeStaleWebPermissionFiles(expectedFilePaths);
}

function renderStringsXml(locale, localeMap, fallbackMap) {
  const lines = ['<?xml version="1.0" encoding="utf-8"?>', '<resources>'];

  for (const key of ENCLAVE_STRING_KEYS) {
    const resourceName = key.replace(/^\$/, '');
    const rawValue = localeMap[key] ?? fallbackMap[key];
    if (typeof rawValue !== 'string') {
      throw new Error(`Missing key "${key}" for locale "${locale}" with no fallback in "${DEFAULT_LOCALE}"`);
    }
    lines.push(`    <string name="${resourceName}">${escapeXml(String(rawValue))}</string>`);
  }

  lines.push('</resources>', '');
  return lines.join('\n');
}

function loadLocales() {
  const localeFiles = fs.readdirSync(I18N_DIR)
    .filter((fileName) => fileName.endsWith('.yaml') || fileName.endsWith('.yml'))
    .map((fileName) => ({
      locale: fileName.replace(/\.(yaml|yml)$/i, ''),
      filePath: path.resolve(I18N_DIR, fileName),
    }));

  if (!localeFiles.length) {
    throw new Error(`No locale files found in ${I18N_DIR}`);
  }

  const perLocale = {};
  for (const { locale, filePath } of localeFiles) {
    perLocale[locale] = yaml.load(fs.readFileSync(filePath, 'utf8')) || {};
  }

  return {
    locales: sortLocales(localeFiles.map(({ locale }) => locale)),
    perLocale,
  };
}

function writeEnclaveStrings(locales, perLocale) {
  const fallbackMap = perLocale[DEFAULT_LOCALE];
  if (!fallbackMap) {
    throw new Error(`Missing required default locale "${DEFAULT_LOCALE}"`);
  }

  for (const locale of locales) {
    const localeDir = path.resolve(APP_RES_DIR, resolveQualifier(locale));
    ensureDir(localeDir);
    fs.writeFileSync(
      path.resolve(localeDir, 'enclave_strings.xml'),
      renderStringsXml(locale, perLocale[locale], fallbackMap),
      'utf8',
    );
  }
}

function main() {
  const { locales, perLocale } = loadLocales();

  writeLocalesConfig(locales);
  writeI18nJsonAssets(locales);
  writeWebPermissionResources(locales, perLocale);
  writeEnclaveStrings(locales, perLocale);

  console.log(
    `Generated Android locales_config.xml, i18n JSON assets, web permission and biometric strings `
    + `for ${locales.length} locales.`,
  );
}

main();
