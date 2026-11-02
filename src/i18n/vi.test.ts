import { readFileSync } from 'fs';
import { load } from 'js-yaml';

import type { LangPack } from '../global/types';

import { LANG_LIST } from '../config';
import * as cacheApi from '../util/cacheApi';
import { formatEnumeration, getTranslation, setLanguage } from '../util/langProvider';

const english = load(readFileSync('src/i18n/en.yaml', 'utf8')) as LangPack;
const vietnamese = load(readFileSync('src/i18n/vi.yaml', 'utf8')) as LangPack;
const PLACEHOLDER_REGEX = /%[a-zA-Z_][a-zA-Z0-9_]*%|\$\{[^}]+\}/g;

describe('Vietnamese language pack', () => {
  it('translates every English key and retains plural forms, placeholders and emphasis', () => {
    expect(Object.keys(vietnamese)).toEqual(Object.keys(english));

    for (const [key, source] of Object.entries(english)) {
      const target = vietnamese[key];
      expect(typeof target).toBe(typeof source);
      const sourceForms = typeof source === 'string' ? { value: source } : { ...source };
      const targetForms: Record<string, string> = typeof target === 'string' ? { value: target } : { ...target };
      expect(Object.keys(targetForms)).toEqual(Object.keys(sourceForms));

      for (const [form, text] of Object.entries(sourceForms)) {
        const translated = targetForms[form];
        expect(translated.trim()).not.toBe('');
        expect(translated.match(PLACEHOLDER_REGEX)).toEqual(text.match(PLACEHOLDER_REGEX));
        expect(translated.match(/\*\*/g)).toEqual(text.match(/\*\*/g));
      }
    }
  });

  describe('language selection and rendering', () => {
    beforeAll(async () => {
      jest.spyOn(cacheApi, 'fetch').mockResolvedValue(vietnamese);
      await setLanguage('vi');
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('selects Tiếng Việt with left-to-right text', () => {
      expect(LANG_LIST.find(({ langCode }) => langCode === 'vi')).toMatchObject({
        nativeName: 'Tiếng Việt', rtl: false,
      });
      expect(document.documentElement.lang).toBe('vi');
      expect(document.documentElement.dir).toBe('ltr');
      expect(getTranslation.langName).toBe('Tiếng Việt');
      expect(getTranslation('Language')).toBe('Ngôn ngữ');
    });

    it.each([1, 2, 5, 21, 0.5])('renders count %s without an English fallback', (count) => {
      expect(getTranslation('$many_transactions', count)).toBe(`${count} giao dịch chuyển tiền`);
    });

    it('renders the empty state and multiple named parameters', () => {
      expect(getTranslation('$many_transactions', 0)).toBe('Không có giao dịch chuyển tiền');
      expect(getTranslation('%amount% to %address%', ['10 ION', 'UQ123'])).toBe('10 ION đến UQ123');
      expect(formatEnumeration(getTranslation, ['A', 'B', 'C'], 'and')).toBe('A, B và C');
    });
  });
});
