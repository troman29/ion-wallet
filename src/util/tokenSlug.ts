import { normalizeTonTokenAddress } from './tonAddress';

/** Converts token identifiers from older ION Wallet versions to the current namespace. */
export function normalizeTokenSlug(slug: string): string {
  if (slug === 'toncoin') return 'ioncoin';
  if (slug.startsWith('staking-')) return `staking-${normalizeTokenSlug(slug.slice(8))}`;
  if (slug.startsWith('ton-') || slug.startsWith('ion-')) {
    const address = slug.slice(4);
    try {
      return `ion-${normalizeTonTokenAddress(address)}`;
    } catch {
      // Keep unknown or invalid cached addresses intact instead of dropping their references.
      return `ion-${address}`;
    }
  }
  return slug;
}

export function normalizeTokenIdentity<T extends { slug: string; chain: string; tokenAddress?: string }>(token: T): T {
  if (token.chain === 'ton' && token.tokenAddress) {
    try {
      const tokenAddress = normalizeTonTokenAddress(token.tokenAddress);
      return { ...token, tokenAddress, slug: `ion-${tokenAddress}` };
    } catch {
      // Metadata for an unrecognized address can still be retained under its migrated slug.
    }
  }
  return { ...token, slug: normalizeTokenSlug(token.slug) };
}

/** A canonical entry wins if a cache contains both the old and new key. Balances must never be added together. */
export function normalizeTokenSlugKeys<T>(bySlug: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(bySlug).map(([slug, value]) => {
    const normalizedSlug = normalizeTokenSlug(slug);
    const normalizedValue = Object.prototype.hasOwnProperty.call(bySlug, normalizedSlug)
      ? bySlug[normalizedSlug] : value;
    return [normalizedSlug, normalizedValue];
  }));
}
