// V2.5 §22.3 — flexible repo input parser.
// Accepts:
//   - "owner/repo"
//   - "https://github.com/owner/repo" (with or without trailing slash, .git, hash, query)
//   - comma-separated lists
//   - newline-separated lists
//   - mixed; dedupes case-insensitively; preserves first-seen order.

export type ParsedRepo = { owner: string; repo: string; key: string };

export type ParseResult = {
  repos: ParsedRepo[];
  invalid: string[];
};

const GITHUB_URL_RE =
  /^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s?#]+)/i;
const OWNER_REPO_RE = /^([A-Za-z0-9][A-Za-z0-9-_.]*)\/([A-Za-z0-9-_.]+)$/;

function normalizeRepoSegment(s: string): string {
  return s.replace(/\.git$/i, "").replace(/[/?#].*$/, "");
}

export function parseOne(raw: string): ParsedRepo | null {
  const s = raw.trim();
  if (!s) return null;

  const url = s.match(GITHUB_URL_RE);
  if (url) {
    const owner = url[1].trim();
    const repo = normalizeRepoSegment(url[2]);
    if (!owner || !repo) return null;
    return { owner, repo, key: `${owner}/${repo}`.toLowerCase() };
  }

  const slash = s.match(OWNER_REPO_RE);
  if (slash) {
    const owner = slash[1];
    const repo = normalizeRepoSegment(slash[2]);
    return { owner, repo, key: `${owner}/${repo}`.toLowerCase() };
  }

  return null;
}

export function parseRepos(input: string): ParseResult {
  if (!input) return { repos: [], invalid: [] };

  const tokens = input
    .split(/[\n,]/g)
    .map((t) => t.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const repos: ParsedRepo[] = [];
  const invalid: string[] = [];

  for (const tok of tokens) {
    const parsed = parseOne(tok);
    if (!parsed) {
      invalid.push(tok);
      continue;
    }
    if (seen.has(parsed.key)) continue;
    seen.add(parsed.key);
    repos.push(parsed);
  }

  return { repos, invalid };
}

// Serialize repos back to a stable querystring value.
// Always lower-cased "owner/repo" joined by ","; safe for URLs.
export function serializeRepos(repos: ParsedRepo[]): string {
  return repos.map((r) => `${r.owner}/${r.repo}`).join(",");
}
