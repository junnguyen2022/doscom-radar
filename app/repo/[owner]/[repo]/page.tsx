import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Flame,
  Star,
  TrendingUp,
  Award,
  FolderKanban,
  Clock,
  GitFork,
  AlertCircle,
  Scale,
  Tag,
  Users,
  Calendar,
  FolderOpen,
} from "lucide-react";
import { historyForRepo } from "@/lib/storage";
import { computeHeat } from "@/lib/heat";
import { classify, CLASS_LABEL, type Classification } from "@/lib/classify";
import { collectionsForRepo } from "@/lib/collections";
import {
  getRepository,
  getLatestMetrics,
  type MetricRow,
} from "@/lib/enrichment";
import { getLatestScoreForRepo } from "@/lib/scoring-store";
import { getDecisionHistoryForRepo } from "@/lib/decisions-store";
import { getLatestInsight } from "@/lib/insight-generator";
import { ScoreBreakdown, type ScoreData } from "@/components/repo/ScoreBreakdown";
import { DecisionPanel } from "@/components/decisions/DecisionPanel";
import { InsightCard, type InsightCardData } from "@/components/repo/InsightCard";
import { fetchReadme } from "@/lib/github-readme";
import { extractReadmeProfile, type ReadmeProfile } from "@/lib/readme-extractor";
import { mapDoscomUseCases } from "@/lib/doscom-usecases";
import { getSimilarRepos } from "@/lib/similar-repos";
import { RepoIntelligenceProfile } from "@/components/repo/RepoIntelligenceProfile";
import {
  RecommendationCard,
  buildRecommendation,
} from "@/components/repo/RecommendationCard";
import { SimilarRepos } from "@/components/repo/SimilarRepos";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LanguageDot } from "@/components/ui/LanguageDot";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import {
  StarsHistoryChart,
  RankHistoryChart,
} from "@/components/repo/StarsHistoryChart";
import { SocialShare } from "@/components/repo/SocialShare";
import { WatchButton } from "@/components/watchlist/WatchButton";

export const dynamic = "force-dynamic";

const CLASS_TONE: Record<Classification, "success" | "warning" | "danger"> = {
  adopt: "success",
  monitor: "warning",
  caution: "danger",
};

type Contributor = { login: string; avatar_url: string };

function getContributorsFromRaw(raw: unknown): Contributor[] {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;
  const mu = r.mentionableUsers as { nodes?: Contributor[] } | undefined;
  return (mu?.nodes ?? []).slice(0, 5);
}

// Streamed below-fold blocks — perf pass.
// README + Similar both add 200-500ms each on cold cache and aren't critical
// for above-the-fold paint. Wrapping them in Suspense lets the page shell,
// hero, score, AI insight, and decision panel paint immediately while these
// fetch in parallel and stream in.
async function ProfileBlock({
  owner,
  repo,
  repository,
  score,
}: {
  owner: string;
  repo: string;
  repository: Awaited<ReturnType<typeof getRepository>>;
  score: ScoreData | null;
}) {
  const readmeRaw = await fetchReadme(owner, repo);
  const readmeProfile: ReadmeProfile | null = readmeRaw
    ? extractReadmeProfile(readmeRaw.content)
    : null;
  const doscomMatches = mapDoscomUseCases({
    topics: repository?.topics ?? [],
    language: repository?.language ?? null,
    description: repository?.description ?? null,
    readmeOverview: readmeProfile?.overview,
    readmeFeatures: readmeProfile?.keyFeatures,
  });

  return (
    <>
      <section id="recommendation" className="mb-8">
        <RecommendationCard
          data={buildRecommendation({
            radar: score?.radar_score ?? null,
            risk: score?.risk_penalty ?? null,
            relevance: score?.relevance_score ?? null,
            maintenance: score?.maintenance_score ?? null,
            doscomMatches,
            readmeConfidence: readmeProfile?.confidence ?? "low",
            readmeMissingData: readmeProfile?.missingData ?? ["readme"],
            language: repository?.language ?? null,
            archived: repository?.archived ?? false,
            hasLicense: !!repository?.license_key,
          })}
        />
      </section>
      <section id="profile" className="mb-8">
        <RepoIntelligenceProfile
          profile={readmeProfile}
          doscomMatches={doscomMatches}
          fetched={!!readmeRaw}
        />
      </section>
    </>
  );
}

async function SimilarReposBlock({
  owner,
  repo,
  repository,
}: {
  owner: string;
  repo: string;
  repository: Awaited<ReturnType<typeof getRepository>>;
}) {
  if (!repository) {
    return (
      <section id="similar" className="mb-8">
        <SimilarRepos source={{ owner, repo }} similar={[]} />
      </section>
    );
  }
  const similar = await getSimilarRepos(owner, repo, {
    topics: repository.topics ?? [],
    language: repository.language,
    limit: 6,
  });
  return (
    <section id="similar" className="mb-8">
      <SimilarRepos source={{ owner, repo }} similar={similar} />
    </section>
  );
}

function ProfileBlockFallback() {
  return (
    <>
      <section className="mb-8">
        <Card className="p-5">
          <div className="space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </Card>
      </section>
      <section className="mb-8">
        <Card className="p-5">
          <div className="space-y-2">
            <div className="h-3 w-1/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </Card>
      </section>
    </>
  );
}

function SimilarBlockFallback() {
  return (
    <section className="mb-8">
      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800/40"
            />
          ))}
        </div>
      </Card>
    </section>
  );
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export default async function RepoDetail({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;

  // Wave 1 — required for above-the-fold render.
  const [daily, weekly, monthly, repository] = await Promise.all([
    historyForRepo(owner, repo, "daily"),
    historyForRepo(owner, repo, "weekly"),
    historyForRepo(owner, repo, "monthly"),
    getRepository(owner, repo),
  ]);

  // Wave 2 — enriched metrics + score + decisions + insight (depends on repository.id).
  // README + similar repos are streamed via Suspense below the fold.
  const [metrics, scoreRow, decisionHistory, insightRow] = repository
    ? await Promise.all([
        getLatestMetrics(repository.id),
        getLatestScoreForRepo(repository.id),
        getDecisionHistoryForRepo(owner, repo),
        getLatestInsight(repository.id),
      ])
    : ([null, null, [], null] as [
        MetricRow | null,
        Awaited<ReturnType<typeof getLatestScoreForRepo>>,
        Awaited<ReturnType<typeof getDecisionHistoryForRepo>>,
        Awaited<ReturnType<typeof getLatestInsight>>,
      ]);

  const currentDecision = decisionHistory[0]?.decision ?? null;

  const insight: InsightCardData | null = insightRow
    ? {
        insight_date: insightRow.insight_date,
        summary: insightRow.summary,
        why_trending: insightRow.why_trending,
        technical_value: insightRow.technical_value,
        doscom_use_case: insightRow.doscom_use_case,
        risk_note: insightRow.risk_note,
        recommendation: insightRow.recommendation,
        confidence: insightRow.confidence,
        evidence: insightRow.evidence,
        model: insightRow.model,
        generated_at: insightRow.generated_at,
      }
    : null;

  const score: ScoreData | null = scoreRow
    ? {
        radar_score: Number(scoreRow.radar_score),
        heat_score: Number(scoreRow.heat_score),
        growth_score: Number(scoreRow.growth_score),
        activity_score: Number(scoreRow.activity_score),
        community_score: Number(scoreRow.community_score),
        maintenance_score: Number(scoreRow.maintenance_score),
        relevance_score: Number(scoreRow.relevance_score),
        risk_penalty: Number(scoreRow.risk_penalty),
        recommendation: scoreRow.recommendation,
        confidence: scoreRow.confidence,
        risk_flags: scoreRow.risk_flags ?? [],
        relevance_tier: scoreRow.relevance_tier,
        score_reason: scoreRow.score_reason,
      }
    : null;

  if (
    daily.length === 0 &&
    weekly.length === 0 &&
    monthly.length === 0 &&
    !repository
  ) {
    return (
      <main>
        <Link
          href="/trending"
          className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-brand-600 dark:text-zinc-400 dark:hover:text-brand-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Trending
        </Link>
        <h1 className="mt-3 text-3xl font-bold">
          {owner}/{repo}
        </h1>
        <div className="mt-6">
          <EmptyState
            icon={FolderOpen}
            title="Repo chưa từng trending"
            description="Repo này chưa từng xuất hiện trong snapshot nào của ta. Nhưng bạn vẫn có thể mở trên GitHub."
          />
          <div className="mt-4 text-center">
            <a
              href={`https://github.com/${owner}/${repo}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Open on GitHub
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </main>
    );
  }

  const latest = daily.at(-1) ?? weekly.at(-1) ?? monthly.at(-1) ?? null;

  // Prefer enriched data when available, fall back to snapshot
  const totalStars = metrics?.total_stars ?? latest?.total_stars ?? null;
  const language = repository?.language ?? latest?.language ?? null;
  const description = repository?.description ?? latest?.description ?? null;
  const url = latest?.url ?? `https://github.com/${owner}/${repo}`;

  const heat = computeHeat({
    starsGained: latest?.stars_gained ?? null,
    totalStars,
    rank: latest?.rank ?? 25,
  });
  const cls = classify({
    starsGained: latest?.stars_gained ?? null,
    totalStars,
    language,
  });

  const collections = collectionsForRepo(owner, repo);
  const contributors = getContributorsFromRaw(repository?.raw ?? null);
  const topics: string[] = repository?.topics ?? [];

  // Stars chart data — combine snapshot stars + enriched metrics
  const starsHistory = daily
    .filter((s) => s.total_stars != null)
    .map((s) => ({ date: s.captured_at, value: s.total_stars! }));

  const rankHistory = daily.map((s) => ({
    date: s.captured_at,
    value: s.rank,
  }));

  const peakRank =
    daily.length > 0 ? Math.min(...daily.map((s) => s.rank)) : null;

  const enrichedAt = repository?.last_enriched_at;

  return (
    <main>
      <Link
        href="/trending"
        className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-brand-600 dark:text-zinc-400 dark:hover:text-brand-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Trending
      </Link>

      {/* Hero */}
      <section className="relative -mx-4 mt-3 mb-8 overflow-hidden border-b border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-brand-50/40 px-4 py-8 dark:border-zinc-800 dark:from-zinc-900/50 dark:via-zinc-950 dark:to-brand-950/20 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Repository Analytics
            </p>
            {enrichedAt ? (
              <Badge tone="success" className="text-[10px]">
                ✓ Enriched {relativeTime(enrichedAt)}
              </Badge>
            ) : (
              <Badge tone="neutral" className="text-[10px]">
                snapshot data only
              </Badge>
            )}
            {repository?.archived && (
              <Badge tone="danger" className="text-[10px]">
                ARCHIVED
              </Badge>
            )}
            {repository?.fork && (
              <Badge tone="warning" className="text-[10px]">
                FORK
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="flex flex-wrap items-center gap-2 text-3xl font-bold tracking-tight sm:text-4xl">
                <span className="text-zinc-900 dark:text-zinc-50">
                  {owner}
                  <span className="text-zinc-400 dark:text-zinc-600">/</span>
                  {repo}
                </span>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  title="Open on GitHub"
                  aria-label="Open on GitHub"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <WatchButton
                  owner={owner}
                  repo={repo}
                  className="text-2xl"
                />
              </h1>

              {description && (
                <p className="mt-2 max-w-3xl text-base text-zinc-600 dark:text-zinc-400">
                  {description}
                </p>
              )}

              {/* Meta badges row */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={CLASS_TONE[cls]}>{CLASS_LABEL[cls].vi}</Badge>
                {language && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    <LanguageDot language={language} />
                    {language}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                  <Flame className="h-3 w-3" />
                  Heat {heat}
                </span>
                {repository?.license_name && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                    title={`License: ${repository.license_name}`}
                  >
                    <Scale className="h-3 w-3" />
                    {repository.license_key?.toUpperCase() ?? "license"}
                  </span>
                )}
                {repository?.pushed_at && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    title={`Last push: ${repository.pushed_at}`}
                  >
                    <Calendar className="h-3 w-3" />
                    pushed {relativeTime(repository.pushed_at)}
                  </span>
                )}
                {metrics?.latest_release_tag && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    title={`Released ${relativeTime(metrics.latest_release_at)}`}
                  >
                    <Tag className="h-3 w-3" />
                    {metrics.latest_release_tag}
                  </span>
                )}
              </div>

              {/* Topics chips */}
              {topics.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Topics:
                  </span>
                  {topics.slice(0, 12).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900/40"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Contributors row */}
              {contributors.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Top contributors:
                  </span>
                  <div className="flex -space-x-1.5">
                    {contributors.map((c) => (
                      <a
                        key={c.login}
                        href={`https://github.com/${c.login}`}
                        target="_blank"
                        rel="noreferrer"
                        title={c.login}
                        className="block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.avatar_url}
                          alt={c.login}
                          width={24}
                          height={24}
                          className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-zinc-900"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <SocialShare
              text={`${owner}/${repo} — heat ${heat} on Agent Radar`}
              path={`/repo/${owner}/${repo}`}
            />
          </div>
        </div>
      </section>

      {/* Stat cards — extended with forks + open issues */}
      <section className="mb-8 grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Current rank"
          value={latest?.rank ? `#${latest.rank}` : "—"}
          accent="brand"
          icon={TrendingUp}
          hint={latest?.captured_at}
        />
        <StatCard
          label="Total stars"
          value={totalStars != null ? totalStars.toLocaleString() : "—"}
          icon={Star}
          hint={metrics ? "Live (enriched)" : "From snapshot"}
        />
        <StatCard
          label="Forks"
          value={
            metrics?.forks_count != null
              ? metrics.forks_count.toLocaleString()
              : "—"
          }
          icon={GitFork}
          hint="GitHub total"
        />
        <StatCard
          label="Open issues"
          value={
            metrics?.open_issues_count != null
              ? metrics.open_issues_count.toLocaleString()
              : "—"
          }
          accent="amber"
          icon={AlertCircle}
          hint="Currently open"
        />
        <StatCard
          label="Heat score"
          value={heat}
          accent="amber"
          icon={Flame}
          hint="0..100 composite"
        />
        <StatCard
          label="Peak rank"
          value={peakRank != null ? `#${peakRank}` : "—"}
          accent="rose"
          icon={Award}
          hint={`${daily.length} snapshots`}
        />
      </section>

      {/* Tabs (visual only — single page) */}
      <nav className="mb-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        <a
          href="#overview"
          className="border-b-2 border-brand-600 px-4 py-2.5 text-sm font-medium text-brand-700 dark:border-brand-400 dark:text-brand-400"
        >
          Overview
        </a>
        <a
          href="#collections"
          className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Collections{" "}
          {collections.length > 0 && (
            <span className="ml-0.5 rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] dark:bg-zinc-800">
              {collections.length}
            </span>
          )}
        </a>
        <a
          href="#snapshots"
          className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Snapshots
        </a>
      </nav>

      {/* AI Insight — Phase 4 */}
      {insight && (
        <section id="insight" className="mb-8">
          <InsightCard insight={insight} />
        </section>
      )}

      {/* Score breakdown — Phase 2 */}
      {score && (
        <section id="score" className="mb-8">
          <ScoreBreakdown score={score} />
        </section>
      )}

      {/* V2.5 — Recommendation Card + Profile (streamed; README is the slow leg) */}
      <Suspense fallback={<ProfileBlockFallback />}>
        <ProfileBlock
          owner={owner}
          repo={repo}
          repository={repository}
          score={score}
        />
      </Suspense>

      {/* V2.5 — Similar / Alternative repos (streamed; below the fold) */}
      <Suspense fallback={<SimilarBlockFallback />}>
        <SimilarReposBlock owner={owner} repo={repo} repository={repository} />
      </Suspense>

      {/* Decision panel — Phase 3 (auth-required) */}
      <section id="decision" className="mb-8">
        <DecisionPanel
          owner={owner}
          repo={repo}
          currentDecision={currentDecision as
            | "follow"
            | "review"
            | "test"
            | "adopt"
            | "ignore"
            | "caution"
            | null}
        />
      </section>

      {/* Decision history (if any) */}
      {decisionHistory.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Decision history ({decisionHistory.length})
          </h2>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {decisionHistory.map((d) => (
                <li key={d.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <Badge tone="brand" className="capitalize">
                      {d.decision}
                    </Badge>
                    <span className="font-mono text-xs text-zinc-500">
                      {d.decided_at.slice(0, 10)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {d.decision_reason}
                  </p>
                  {(d.test_plan || d.risk_note || d.due_date) && (
                    <div className="mt-2 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {d.test_plan && <div>📋 Plan: {d.test_plan}</div>}
                      {d.risk_note && <div>⚠️ Risk: {d.risk_note}</div>}
                      {d.due_date && <div>📅 Due: {d.due_date}</div>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* Overview — dual charts */}
      <section id="overview" className="mb-12 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <header className="mb-4 flex items-baseline justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Star className="h-4 w-4 text-amber-500" />
                Stars history
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Total stars qua các snapshot daily
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-400">
              {starsHistory.length} pts
            </span>
          </header>
          <StarsHistoryChart
            data={starsHistory}
            color="#f59e0b"
            yLabel="stars"
          />
        </Card>

        <Card className="p-5">
          <header className="mb-4 flex items-baseline justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Rank history
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Cao hơn = rank tốt hơn (rank 1 trên cùng)
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-400">
              {rankHistory.length} pts
            </span>
          </header>
          <RankHistoryChart data={rankHistory} />
        </Card>
      </section>

      {/* Collections this repo is in */}
      <section id="collections" className="mb-12">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <FolderKanban className="h-4 w-4 text-brand-500" />
          Collections ({collections.length})
        </h2>
        {collections.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400">
            Repo này chưa thuộc collection nào trong 138 collections của
            OSSInsight.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {collections.map((c) => (
              <Link
                key={c.slug}
                href={`/collections/${c.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-100 dark:border-brand-900/50 dark:bg-brand-950/40 dark:text-brand-300 dark:hover:bg-brand-950/60"
              >
                {c.name}
                <span className="text-[10px] opacity-70">
                  ({c.items.length})
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Snapshots table */}
      <section id="snapshots" className="mb-8">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-4 w-4 text-zinc-500" />
            All snapshots
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {daily.length + weekly.length + monthly.length} entries
          </span>
        </header>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-left">Timeframe</th>
                  <th className="px-4 py-2.5 text-right">Rank</th>
                  <th className="px-4 py-2.5 text-right">Gained</th>
                  <th className="px-4 py-2.5 text-right">Total ★</th>
                  <th className="px-4 py-2.5 text-right">Heat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {[...daily, ...weekly, ...monthly]
                  .sort((a, b) => b.captured_at.localeCompare(a.captured_at))
                  .map((s, i) => {
                    const h = computeHeat({
                      starsGained: s.stars_gained,
                      totalStars: s.total_stars,
                      rank: s.rank,
                    });
                    return (
                      <tr
                        key={i}
                        className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                          {s.captured_at}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge tone="neutral">{s.timeframe}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                          #{s.rank}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                          {s.stars_gained != null
                            ? `+${s.stars_gained.toLocaleString()}`
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {s.total_stars != null
                            ? s.total_stars.toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-orange-600 dark:text-orange-400">
                          {h}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        💡 Layout cảm hứng từ{" "}
        <a
          href="https://ossinsight.io"
          className="text-brand-600 hover:underline dark:text-brand-400"
        >
          OSSInsight.io
        </a>
        . Enriched data từ GitHub GraphQL API. Snapshot data từ
        github.com/trending scraper.
      </p>
    </main>
  );
}
