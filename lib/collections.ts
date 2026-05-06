import { COLLECTIONS, type Collection } from "./collections.data";

export type { Collection } from "./collections.data";

const BY_SLUG = new Map(COLLECTIONS.map((c) => [c.slug, c]));
const BY_REPO = new Map<string, Collection[]>();
for (const c of COLLECTIONS) {
  for (const item of c.items) {
    const k = item.toLowerCase();
    if (!BY_REPO.has(k)) BY_REPO.set(k, []);
    BY_REPO.get(k)!.push(c);
  }
}

export function listCollections(): Collection[] {
  return [...COLLECTIONS].sort((a, b) => a.name.localeCompare(b.name));
}

export function getCollection(slug: string): Collection | null {
  return BY_SLUG.get(slug) ?? null;
}

export function collectionsForRepo(owner: string, repo: string): Collection[] {
  return BY_REPO.get(`${owner}/${repo}`.toLowerCase()) ?? [];
}

// Trending intersection: count how many of a collection's curated items appear in the given trending set.
export function intersectWithTrending(
  collection: Collection,
  trendingKeys: Set<string>,
): { matched: string[]; unmatched: string[] } {
  const matched: string[] = [];
  const unmatched: string[] = [];
  for (const item of collection.items) {
    if (trendingKeys.has(item.toLowerCase())) matched.push(item);
    else unmatched.push(item);
  }
  return { matched, unmatched };
}

// Build a Set of "owner/repo" lowercase keys from snapshot rows
export function trendingKeysFromRows<T extends { owner: string; repo: string }>(
  rows: T[],
): Set<string> {
  return new Set(rows.map((r) => `${r.owner}/${r.repo}`.toLowerCase()));
}
