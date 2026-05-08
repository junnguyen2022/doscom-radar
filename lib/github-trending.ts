import * as cheerio from "cheerio";

export type Timeframe = "daily" | "weekly" | "monthly";

export type TrendingRepo = {
  rank: number;
  owner: string;
  repo: string;
  language: string | null;
  description: string | null;
  starsGained: number | null;
  totalStars: number | null;
  url: string;
};

const BASE = "https://github.com/trending";

function parseInt0(s: string): number | null {
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

export async function fetchTrending(
  timeframe: Timeframe,
  opts: { cached?: boolean } = {},
): Promise<TrendingRepo[]> {
  const url = timeframe === "daily" ? BASE : `${BASE}?since=${timeframe}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "agent-trending-tracker/0.1 (+https://github.com/yourname/agent)",
      Accept: "text/html",
    },
    // Cron pass-through wants fresh; user-facing pages opt into 30-min cache.
    ...(opts.cached
      ? { next: { revalidate: 60 * 30 } }
      : { cache: "no-store" as const }),
  });

  if (!res.ok) {
    throw new Error(`GitHub trending fetch failed: HTTP ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const out: TrendingRepo[] = [];

  $("article.Box-row").each((i, el) => {
    const $el = $(el);

    const link = $el.find("h2 a").first();
    const href = (link.attr("href") || "").trim();
    if (!href) return;

    const parts = href.replace(/^\//, "").split("/");
    if (parts.length < 2) return;
    const [owner, repo] = parts;

    const language =
      $el.find('[itemprop="programmingLanguage"]').first().text().trim() ||
      null;

    const description = $el.find("p").first().text().trim() || null;

    const starsText = $el.find(".float-sm-right").first().text().trim();
    const starsGained = parseInt0(starsText);

    const totalText = $el.find('a[href$="/stargazers"]').first().text().trim();
    const totalStars = parseInt0(totalText);

    out.push({
      rank: i + 1,
      owner,
      repo,
      language,
      description,
      starsGained,
      totalStars,
      url: `https://github.com${href}`,
    });
  });

  return out;
}

export async function fetchAllTrending(): Promise<
  Record<Timeframe, TrendingRepo[]>
> {
  const [daily, weekly, monthly] = await Promise.all([
    fetchTrending("daily"),
    fetchTrending("weekly"),
    fetchTrending("monthly"),
  ]);
  return { daily, weekly, monthly };
}
