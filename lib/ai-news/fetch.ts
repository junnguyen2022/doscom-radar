// V2.5 §23 — fetch + classify AI news from 5 free sources.
// Uses Next fetch revalidate for 30-min cache. No new deps.

import { fetchTrending } from "../github-trending";
import { AI_NEWS_SOURCES, type AiNewsSource } from "./sources";
import {
  classifyRelevance,
  doscomImpact,
  suggestedAction,
} from "./relevance";
import type { AiNewsItem } from "./types";

const REVALIDATE = 60 * 30; // 30 min

function hashId(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function buildItem(args: {
  title: string;
  source: string;
  source_type: AiNewsItem["source_type"];
  url: string;
  published_at?: string;
  short_description?: string;
  hintTags?: string[];
}): AiNewsItem {
  const text = `${args.title}\n${args.short_description ?? ""}\n${(
    args.hintTags ?? []
  ).join(" ")}`;
  const { relevance, category, matchedHigh, matchedLow } =
    classifyRelevance(text);
  const action = suggestedAction({ relevance, category });
  const impact = doscomImpact({ relevance, category, matchedHigh });
  return {
    id: hashId(args.url),
    title: args.title,
    source: args.source,
    source_type: args.source_type,
    url: args.url,
    published_at: args.published_at,
    tags: [...new Set([...(args.hintTags ?? []), ...matchedHigh])].slice(0, 8),
    short_description: args.short_description,
    relevance,
    suggested_action: action,
    doscom_impact: impact,
    category,
    // matchedLow currently unused in payload but useful for debugging.
    ...(matchedLow.length > 0 ? {} : {}),
  };
}

// ---------- GitHub Trending source ----------
async function fetchGithubTrendingItems(name: string): Promise<AiNewsItem[]> {
  try {
    const repos = await fetchTrending("daily");
    const filtered = repos.filter((r) => {
      const desc = (r.description ?? "").toLowerCase();
      const lang = (r.language ?? "").toLowerCase();
      return /\b(ai|llm|agent|rag|automation|gpt|model|ml|machine learning)\b/.test(
        desc,
      ) || lang === "python" || lang === "typescript";
    });
    return filtered.slice(0, 20).map((r) =>
      buildItem({
        title: `${r.owner}/${r.repo}`,
        source: name,
        source_type: "github_trending",
        url: r.url,
        short_description: r.description ?? undefined,
        hintTags: [r.language ?? ""].filter(Boolean) as string[],
      }),
    );
  } catch {
    return [];
  }
}

// ---------- Hacker News (Algolia) source ----------
type HnHit = {
  objectID: string;
  title?: string;
  story_title?: string;
  url?: string;
  story_url?: string;
  created_at?: string;
  story_text?: string;
  _tags?: string[];
};

async function fetchHnItems(
  name: string,
  query: string,
): Promise<AiNewsItem[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(
    query,
  )}&tags=story&hitsPerPage=30&numericFilters=points%3E20`;
  try {
    const res = await fetch(url, {
      next: { revalidate: REVALIDATE },
      headers: { "User-Agent": "agent-radar/0.2" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { hits?: HnHit[] };
    const hits = json.hits ?? [];
    return hits
      .filter((h) => (h.title || h.story_title) && (h.url || h.story_url))
      .slice(0, 20)
      .map((h) =>
        buildItem({
          title: (h.title || h.story_title) as string,
          source: name,
          source_type: "hn_search",
          url: (h.url || h.story_url) as string,
          published_at: h.created_at,
        }),
      );
  } catch {
    return [];
  }
}

// ---------- RSS source (minimal regex parser) ----------
function parseRss(xml: string): { title: string; url: string; pub?: string }[] {
  const items: { title: string; url: string; pub?: string }[] = [];
  // Try <item> (RSS) first then <entry> (Atom).
  const blockRe = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const matches = xml.matchAll(blockRe);
  for (const m of matches) {
    const block = m[2];
    const title = pickXml(block, "title");
    let url = pickAttr(block, "link", "href");
    if (!url) url = pickXml(block, "link");
    if (!url) url = pickXml(block, "guid");
    const pub =
      pickXml(block, "pubDate") ||
      pickXml(block, "published") ||
      pickXml(block, "updated") ||
      undefined;
    if (title && url) items.push({ title: stripCdata(title), url, pub });
    if (items.length >= 20) break;
  }
  return items;
}

function pickXml(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? stripCdata(m[1]).trim() : undefined;
}

function pickAttr(
  block: string,
  tag: string,
  attr: string,
): string | undefined {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]+)"`, "i");
  const m = block.match(re);
  return m?.[1];
}

function stripCdata(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

async function fetchRssItems(name: string, url: string): Promise<AiNewsItem[]> {
  try {
    const res = await fetch(url, {
      next: { revalidate: REVALIDATE },
      headers: {
        "User-Agent": "agent-radar/0.2",
        Accept: "application/rss+xml, application/atom+xml, application/xml",
      },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = parseRss(xml);
    return items.map((it) =>
      buildItem({
        title: it.title,
        source: name,
        source_type: "rss",
        url: it.url,
        published_at: it.pub,
      }),
    );
  } catch {
    return [];
  }
}

async function fetchOne(src: AiNewsSource): Promise<AiNewsItem[]> {
  switch (src.type) {
    case "github_trending":
      return fetchGithubTrendingItems(src.name);
    case "hn_search":
      return fetchHnItems(src.name, src.query);
    case "rss":
      return fetchRssItems(src.name, src.url);
  }
}

export async function fetchAiNews(): Promise<AiNewsItem[]> {
  const results = await Promise.allSettled(AI_NEWS_SOURCES.map(fetchOne));
  const merged: AiNewsItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") merged.push(...r.value);
  }
  // Dedupe by URL (case-insensitive).
  const seen = new Set<string>();
  const deduped: AiNewsItem[] = [];
  for (const it of merged) {
    const k = it.url.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(it);
  }
  // Sort: high relevance first; then by published_at desc.
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  deduped.sort((a, b) => {
    const r = (order[a.relevance] ?? 9) - (order[b.relevance] ?? 9);
    if (r !== 0) return r;
    const at = a.published_at ? new Date(a.published_at).getTime() : 0;
    const bt = b.published_at ? new Date(b.published_at).getTime() : 0;
    return bt - at;
  });
  return deduped;
}
