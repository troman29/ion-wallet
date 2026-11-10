import type { ApiTokenWithPrice } from '../types';

import { omitUndefined } from '../../util/iteratees';
import { normalizeTokenIdentity } from '../../util/tokenSlug';

export function mergeCachedTokenIdentities(tokens: ApiTokenWithPrice[]) {
  const entries = tokens.map((original) => {
    const token = normalizeTokenIdentity(original);
    // Prefer the canonical record; backend metadata breaks ties between equivalent aliases.
    const priority = Number(original.slug === token.slug) * 2 + Number(Boolean(original.isFromBackend));
    return { token, priority };
  }).sort((left, right) => left.priority - right.priority);

  const bySlug = new Map<string, ApiTokenWithPrice>();
  for (const { token } of entries) {
    bySlug.set(token.slug, { ...bySlug.get(token.slug), ...omitUndefined(token) });
  }
  return Array.from(bySlug.values());
}
