import { readdirSync, readFileSync } from 'fs';
import { parse } from 'yaml';

import { APP_DOWNLOAD_URLS } from '../config';
import { getHelpCenterUrl } from '../global/helpers/getHelpCenterUrl';

const locales = readdirSync('src/i18n').filter((file) => file.endsWith('.yaml'));

it.each(locales)('%s retains the warnings without missing links or promotional claims', (file) => {
  const locale = parse(readFileSync(`src/i18n/${file}`, 'utf8'));
  for (const key of ['$domain_like_scam_warning', '$seed_phrase_scam_warning']) {
    expect(locale[key].split('\n\n')).toHaveLength(3);
    expect(locale[key]).not.toMatch(/%help_center_link%/);
    expect(locale[key]).toContain('**');
  }
  expect(locale.$multisig_warning_text).toContain('%app_name%');
  expect(locale.$multisig_warning_text).not.toContain('%multisig_warning_link%');
  expect(locale.$safe_staking_description_jetton1).not.toMatch(/JVault|jvault|%/i);
  for (const key of ['$unverified_source_warning', '$update_required', '$update_channel_unavailable']) {
    expect(typeof locale[key]).toBe('string');
    expect(locale[key].length).toBeGreaterThan(10);
  }
});

it('does not synthesize unconfirmed install and help links', () => {
  expect(APP_DOWNLOAD_URLS).toEqual({});
  expect(getHelpCenterUrl('en', 'seedScam')).toBeUndefined();
  expect(getHelpCenterUrl('ru', 'domainScam')).toBeUndefined();
});
