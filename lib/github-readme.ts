// V2.5 §24 — fetch raw README via GitHub REST.
// Cached 24h via Next fetch revalidate. Returns null on 404 / rate-limit / network error.

const README_REVALIDATE_SECONDS = 60 * 60 * 24;

export type ReadmeFetchResult = {
  content: string;
  encoding: string;
  url: string;
  fetched_at: string;
} | null;

export async function fetchReadme(
  owner: string,
  repo: string,
): Promise<ReadmeFetchResult> {
  const url = `https://api.github.com/repos/${encodeURIComponent(
    owner,
  )}/${encodeURIComponent(repo)}/readme`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.raw+json",
    "User-Agent": "agent-radar",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(url, {
      headers,
      next: { revalidate: README_REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.length < 20) return null;
    return {
      content: text,
      encoding: "utf-8",
      url,
      fetched_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
