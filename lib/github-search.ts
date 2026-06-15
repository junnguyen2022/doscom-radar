// Brand Discovery — chủ động tìm repo hợp DOSCOM/NOMA qua GitHub Search API,
// KHÔNG phụ thuộc github.com/trending (repo ngách hiếm khi lên trending).
// Query dựng từ discoveryTerms trong brand-core; kết quả re-rank bằng brand-fit.

import { BRANDS, type BrandId } from "./config/brand-core";
import { computeBrandFit, type BrandFit } from "./brand-fit";

const SEARCH_ENDPOINT = "https://api.github.com/search/repositories";

export type DiscoveredRepo = {
  owner: string;
  repo: string;
  url: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  pushedAt: string | null;
  fit: BrandFit;
};

export type DiscoverResult = {
  brand: BrandId;
  brandName: string;
  repos: DiscoveredRepo[];
  query: string;
  error: string | null;
};

type GhItem = {
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  pushed_at: string | null;
  archived: boolean;
  fork: boolean;
};

// Cutoff "pushed gần đây" — mặc định ~18 tháng để loại repo chết.
function pushedCutoff(monthsBack = 18): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  return d.toISOString().slice(0, 10);
}

function buildQuery(terms: string[], minStars: number): string {
  // GitHub Search: tối đa 5 toán tử OR/AND/NOT → giới hạn 6 term.
  // KHÔNG bọc ngoặc đơn — ngoặc + cụm có nháy ("computer vision") khiến API trả 0.
  const ors = terms.slice(0, 6).join(" OR ");
  // in:name,description = giới hạn nơi khớp để bớt nhiễu; lọc chất lượng tối thiểu.
  return `${ors} in:name,description stars:>${minStars} pushed:>${pushedCutoff()} archived:false`;
}

async function ghSearch(q: string, perPage: number): Promise<GhItem[]> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "agent-radar/0.2 (+https://doscom-radar.vercel.app)",
  };
  if (token) headers.Authorization = `bearer ${token}`;

  const url = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(
    q,
  )}&sort=stars&order=desc&per_page=${perPage}`;

  // Cache 6h — Search API rate limit chặt (30 req/phút), tránh gọi mỗi request.
  const res = await fetch(url, { headers, next: { revalidate: 21600 } });
  if (!res.ok) {
    throw new Error(`GitHub search HTTP ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { items?: GhItem[] };
  return json.items ?? [];
}

export async function discoverForBrand(
  brandId: BrandId,
  opts: { minStars?: number; perPage?: number; limit?: number } = {},
): Promise<DiscoverResult> {
  const brand = BRANDS[brandId];
  const minStars = opts.minStars ?? 150;
  const perPage = opts.perPage ?? 40;
  const limit = opts.limit ?? 24;
  const query = buildQuery(brand.discoveryTerms, minStars);

  try {
    const items = await ghSearch(query, perPage);
    const repos: DiscoveredRepo[] = [];
    const seen = new Set<string>();

    for (const it of items) {
      if (it.fork) continue;
      const [owner, repo] = it.full_name.split("/");
      if (!owner || !repo) continue;
      const key = it.full_name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      // Re-rank chính xác bằng brand-fit (dùng cả topics nếu search trả về).
      const fits = computeBrandFit({
        topics: it.topics ?? [],
        language: it.language,
        description: it.description,
      });
      const fit = fits.find((f) => f.brand === brandId);
      if (!fit) continue; // search rộng — chỉ giữ repo brand-fit thật sự khớp

      repos.push({
        owner,
        repo,
        url: it.html_url,
        description: it.description,
        language: it.language,
        topics: it.topics ?? [],
        stars: it.stargazers_count,
        pushedAt: it.pushed_at,
        fit,
      });
    }

    repos.sort((a, b) => b.fit.score - a.fit.score || b.stars - a.stars);
    return {
      brand: brandId,
      brandName: brand.name,
      repos: repos.slice(0, limit),
      query,
      error: null,
    };
  } catch (e) {
    return {
      brand: brandId,
      brandName: brand.name,
      repos: [],
      query,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
