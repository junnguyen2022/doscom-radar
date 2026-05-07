// GitHub GraphQL client — single query for repo enrichment.
// 1 GraphQL call replaces ~5 REST calls → quota efficient.
// Reference: ARCHITECTURE_V2_DECISIONS.md §6.

const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

export type EnrichedRepo = {
  github_id: number | null;
  owner: string;
  repo: string;
  url: string;
  html_url: string | null;
  description: string | null;
  homepage: string | null;
  language: string | null;
  topics: string[];
  license_key: string | null;
  license_name: string | null;
  default_branch: string | null;
  visibility: string;
  archived: boolean;
  disabled: boolean;
  fork: boolean;
  github_created_at: string | null;
  github_updated_at: string | null;
  pushed_at: string | null;
  total_stars: number | null;
  forks_count: number | null;
  watchers_count: number | null;
  open_issues_count: number | null;
  contributors_sample: { login: string; avatar_url: string }[];
  contributors_count: number | null;
  commits_30d: number | null;
  prs_merged_30d: number | null;
  prs_open_30d: number | null;
  issues_opened_30d: number | null;
  issues_closed_30d: number | null;
  latest_release_at: string | null;
  latest_release_tag: string | null;
  prs_merged_total: number | null;
  raw: unknown;
};

const REPO_QUERY = `
  query RepoEnrichment(
    $owner: String!,
    $name: String!,
    $since: GitTimestamp!,
    $prsMergedQ: String!,
    $prsOpenQ: String!,
    $issuesOpenedQ: String!,
    $issuesClosedQ: String!
  ) {
    repository(owner: $owner, name: $name) {
      databaseId
      nameWithOwner
      description
      homepageUrl
      url
      isArchived
      isDisabled
      isFork
      visibility
      pushedAt
      createdAt
      updatedAt
      stargazerCount
      forkCount
      watchers { totalCount }
      issues(states: OPEN) { totalCount }
      defaultBranchRef {
        name
        target {
          ... on Commit {
            history(since: $since) { totalCount }
          }
        }
      }
      licenseInfo { key name }
      primaryLanguage { name }
      repositoryTopics(first: 20) {
        nodes { topic { name } }
      }
      releases(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes { publishedAt tagName }
      }
      pullRequests(states: MERGED, first: 1) { totalCount }
      mentionableUsers(first: 10) {
        totalCount
        nodes { login avatarUrl(size: 64) }
      }
    }
    prsMerged30d: search(query: $prsMergedQ, type: ISSUE) { issueCount }
    prsOpen30d: search(query: $prsOpenQ, type: ISSUE) { issueCount }
    issuesOpened30d: search(query: $issuesOpenedQ, type: ISSUE) { issueCount }
    issuesClosed30d: search(query: $issuesClosedQ, type: ISSUE) { issueCount }
    rateLimit { remaining limit resetAt cost }
  }
`;

type GraphQLResponse = {
  data?: {
    repository: {
      databaseId: number | null;
      nameWithOwner: string;
      description: string | null;
      homepageUrl: string | null;
      url: string;
      isArchived: boolean;
      isDisabled: boolean;
      isFork: boolean;
      visibility: string;
      pushedAt: string | null;
      createdAt: string | null;
      updatedAt: string | null;
      stargazerCount: number;
      forkCount: number;
      watchers: { totalCount: number };
      issues: { totalCount: number };
      defaultBranchRef: {
        name: string;
        target?: { history?: { totalCount: number } };
      } | null;
      licenseInfo: { key: string; name: string } | null;
      primaryLanguage: { name: string } | null;
      repositoryTopics: { nodes: { topic: { name: string } }[] };
      releases: { nodes: { publishedAt: string; tagName: string }[] };
      pullRequests: { totalCount: number };
      mentionableUsers: {
        totalCount: number;
        nodes: { login: string; avatarUrl: string }[];
      };
    } | null;
    prsMerged30d: { issueCount: number };
    prsOpen30d: { issueCount: number };
    issuesOpened30d: { issueCount: number };
    issuesClosed30d: { issueCount: number };
    rateLimit: {
      remaining: number;
      limit: number;
      resetAt: string;
      cost: number;
    };
  };
  errors?: { message: string; type?: string }[];
};

export type RateLimit = {
  remaining: number;
  limit: number;
  resetAt: string;
  costSoFar: number;
};

let lastRateLimit: RateLimit | null = null;

export function getLastRateLimit(): RateLimit | null {
  return lastRateLimit;
}

async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN not set — cannot enrich");
  }

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "agent-radar/0.2 (+https://doscom-radar.vercel.app)",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`GitHub GraphQL HTTP ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as GraphQLResponse;
  if (json.errors && json.errors.length > 0) {
    throw new Error(
      `GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}`,
    );
  }

  return json as T;
}

export async function fetchRepoEnrichment(
  owner: string,
  repo: string,
): Promise<EnrichedRepo | null> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const sinceDate = since.slice(0, 10);
  const repoQ = `repo:${owner}/${repo}`;
  const json = await gql<GraphQLResponse>(REPO_QUERY, {
    owner,
    name: repo,
    since,
    prsMergedQ: `${repoQ} is:pr is:merged merged:>=${sinceDate}`,
    prsOpenQ: `${repoQ} is:pr is:open created:>=${sinceDate}`,
    issuesOpenedQ: `${repoQ} is:issue created:>=${sinceDate}`,
    issuesClosedQ: `${repoQ} is:issue is:closed closed:>=${sinceDate}`,
  });

  if (!json.data?.repository) return null;

  if (json.data.rateLimit) {
    lastRateLimit = {
      remaining: json.data.rateLimit.remaining,
      limit: json.data.rateLimit.limit,
      resetAt: json.data.rateLimit.resetAt,
      costSoFar: json.data.rateLimit.cost,
    };
  }

  const r = json.data.repository;

  return {
    github_id: r.databaseId,
    owner,
    repo,
    url: r.url,
    html_url: r.url,
    description: r.description,
    homepage: r.homepageUrl,
    language: r.primaryLanguage?.name ?? null,
    topics: r.repositoryTopics.nodes.map((n) => n.topic.name),
    license_key: r.licenseInfo?.key ?? null,
    license_name: r.licenseInfo?.name ?? null,
    default_branch: r.defaultBranchRef?.name ?? null,
    visibility: r.visibility?.toLowerCase() ?? "public",
    archived: r.isArchived,
    disabled: r.isDisabled,
    fork: r.isFork,
    github_created_at: r.createdAt,
    github_updated_at: r.updatedAt,
    pushed_at: r.pushedAt,
    total_stars: r.stargazerCount,
    forks_count: r.forkCount,
    watchers_count: r.watchers.totalCount,
    open_issues_count: r.issues.totalCount,
    contributors_sample: r.mentionableUsers.nodes.map((u) => ({
      login: u.login,
      avatar_url: u.avatarUrl,
    })),
    contributors_count: r.mentionableUsers.totalCount ?? null,
    commits_30d: r.defaultBranchRef?.target?.history?.totalCount ?? null,
    prs_merged_30d: json.data.prsMerged30d?.issueCount ?? null,
    prs_open_30d: json.data.prsOpen30d?.issueCount ?? null,
    issues_opened_30d: json.data.issuesOpened30d?.issueCount ?? null,
    issues_closed_30d: json.data.issuesClosed30d?.issueCount ?? null,
    latest_release_at: r.releases.nodes[0]?.publishedAt ?? null,
    latest_release_tag: r.releases.nodes[0]?.tagName ?? null,
    prs_merged_total: r.pullRequests.totalCount,
    raw: r,
  };
}

// Sequential batch with sleep between calls — protect against secondary rate limit
export async function fetchEnrichmentBatch(
  targets: { owner: string; repo: string }[],
  options: { delayMs?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<{ ok: EnrichedRepo[]; failed: { key: string; error: string }[] }> {
  const ok: EnrichedRepo[] = [];
  const failed: { key: string; error: string }[] = [];
  const delay = options.delayMs ?? 100; // 10 req/s — well under 5000/h

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    try {
      const r = await fetchRepoEnrichment(t.owner, t.repo);
      if (r) ok.push(r);
      else failed.push({ key: `${t.owner}/${t.repo}`, error: "not_found" });
    } catch (err) {
      failed.push({
        key: `${t.owner}/${t.repo}`,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    options.onProgress?.(i + 1, targets.length);
    if (i < targets.length - 1 && delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return { ok, failed };
}
