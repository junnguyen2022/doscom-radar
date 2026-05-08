// V2.5 §22.6 — Rule-based comparison conclusion.
// Picks a "best for adopt" + "best for monitor" + risk callouts using the
// existing radar/risk/relevance/maintenance scores. No AI required.

export type CompareSubject = {
  key: string;
  owner: string;
  repo: string;
  found: boolean;
  language: string | null;
  totalStars: number | null;
  forks: number | null;
  contributors: number | null;
  license: string | null;
  pushedAt: string | null;
  archived?: boolean;
  radarScore: number | null;
  riskPenalty: number | null;
  relevanceScore: number | null;
  maintenanceScore: number | null;
  recommendation: string | null;
  riskFlags: string[];
};

export type CompareConclusion = {
  bestForAdopt: { owner: string; repo: string; reason: string } | null;
  bestForMonitor: { owner: string; repo: string; reason: string } | null;
  riskCallouts: { owner: string; repo: string; flags: string[] }[];
  notes: string[];
  // Localised labels carried in payload to avoid coupling to client lang.
  vi: { headline: string };
  en: { headline: string };
};

function score(s: CompareSubject): number {
  // Composite: radar minus risk, weighted by relevance fit.
  const radar = s.radarScore ?? 0;
  const risk = s.riskPenalty ?? 0;
  const rel = s.relevanceScore ?? 0;
  return radar - risk * 0.5 + rel * 0.2;
}

export function deriveConclusion(
  subjects: CompareSubject[],
): CompareConclusion {
  const eligible = subjects.filter((s) => s.found);

  let bestAdopt: CompareSubject | null = null;
  for (const s of eligible) {
    const radar = s.radarScore ?? 0;
    const risk = s.riskPenalty ?? 999;
    const rel = s.relevanceScore ?? 0;
    const maint = s.maintenanceScore ?? 0;
    if (radar >= 70 && risk <= 30 && rel >= 60 && maint >= 50) {
      if (!bestAdopt || score(s) > score(bestAdopt)) bestAdopt = s;
    }
  }

  let bestMonitor: CompareSubject | null = null;
  for (const s of eligible) {
    if (bestAdopt && s.key === bestAdopt.key) continue;
    const radar = s.radarScore ?? 0;
    const rel = s.relevanceScore ?? 0;
    if (radar >= 50 || rel >= 50) {
      if (!bestMonitor || score(s) > score(bestMonitor)) bestMonitor = s;
    }
  }

  const riskCallouts = eligible
    .filter(
      (s) =>
        (s.riskPenalty ?? 0) >= 40 ||
        s.archived ||
        !s.license ||
        (s.riskFlags?.length ?? 0) > 0,
    )
    .map((s) => ({
      owner: s.owner,
      repo: s.repo,
      flags: [
        ...(s.riskFlags ?? []),
        ...(s.archived ? ["archived"] : []),
        ...(!s.license ? ["no-license"] : []),
      ],
    }));

  const notes: string[] = [];
  if (eligible.length < 2) {
    notes.push("Cần ít nhất 2 repo có dữ liệu để rút ra so sánh ý nghĩa.");
  }
  if (eligible.length > 0 && !bestAdopt) {
    notes.push(
      "Chưa có repo nào đạt ngưỡng adopt (radar≥70, risk≤30, relevance≥60, maintenance≥50).",
    );
  }

  const headlineVi = bestAdopt
    ? `${bestAdopt.owner}/${bestAdopt.repo} là ứng viên adopt mạnh nhất.`
    : bestMonitor
      ? `Chưa repo nào đủ tiêu chí adopt — đề xuất theo dõi ${bestMonitor.owner}/${bestMonitor.repo}.`
      : "Chưa đủ tín hiệu để khuyến nghị.";

  const headlineEn = bestAdopt
    ? `${bestAdopt.owner}/${bestAdopt.repo} is the strongest adopt candidate.`
    : bestMonitor
      ? `No repo meets adopt threshold — suggest monitoring ${bestMonitor.owner}/${bestMonitor.repo}.`
      : "Not enough signal for a recommendation yet.";

  return {
    bestForAdopt: bestAdopt
      ? {
          owner: bestAdopt.owner,
          repo: bestAdopt.repo,
          reason: `radar ${bestAdopt.radarScore ?? "?"}, risk ${
            bestAdopt.riskPenalty ?? "?"
          }, relevance ${bestAdopt.relevanceScore ?? "?"}, maintenance ${
            bestAdopt.maintenanceScore ?? "?"
          }.`,
        }
      : null,
    bestForMonitor: bestMonitor
      ? {
          owner: bestMonitor.owner,
          repo: bestMonitor.repo,
          reason: `radar ${bestMonitor.radarScore ?? "?"}, relevance ${
            bestMonitor.relevanceScore ?? "?"
          } — chưa đủ adopt nhưng đáng theo dõi.`,
        }
      : null,
    riskCallouts,
    notes,
    vi: { headline: headlineVi },
    en: { headline: headlineEn },
  };
}
