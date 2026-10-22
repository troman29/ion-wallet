import type { LangCode } from '../types';

import { HELP_CENTER_URL } from '../../config';

export function getHelpCenterUrl(
  langCode: LangCode | undefined, type: keyof typeof HELP_CENTER_URL,
): string | undefined {
  if (!langCode) return undefined;

  return HELP_CENTER_URL[type]?.[langCode] ?? HELP_CENTER_URL[type].en;
}
