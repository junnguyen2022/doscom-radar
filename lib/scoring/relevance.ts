// Relevance Score — how well repo fits Doscom focus areas.
// Config in lib/config/doscom-focus.ts.
// Formula: ARCHITECTURE_V2_DECISIONS.md §3.2.

import {
  DOSCOM_FOCUS,
  RELEVANCE_WEIGHTS,
  type RelevanceTier,
} from "../config/doscom-focus";

export type RelevanceInput = {
  topics: string[] | null;
  language: string | null;
  description: string | null;
  collectionSlugs: string[];
};

export type RelevanceResult = {
  score: number;
  tier: RelevanceTier;
  matchedTokens: string[];
};

export function computeRelevance(input: RelevanceInput): RelevanceResult {
  const topics = (input.topics ?? []).map((t) => t.toLowerCase());
  const desc = (input.description ?? "").toLowerCase();
  const matched: string[] = [];

  let highHit = 0;
  let mediumHit = 0;
  let lowHit = 0;

  for (const t of DOSCOM_FOCUS.high.topics) {
    if (topics.includes(t) || desc.includes(t)) {
      highHit++;
      matched.push(`topic:${t}`);
    }
  }
  for (const t of DOSCOM_FOCUS.medium.topics) {
    if (topics.includes(t) || desc.includes(t)) {
      mediumHit++;
      matched.push(`topic-med:${t}`);
    }
  }
  for (const t of DOSCOM_FOCUS.low.topics) {
    if (topics.includes(t) || desc.includes(t)) {
      lowHit++;
      matched.push(`topic-low:${t}`);
    }
  }

  if (input.language && DOSCOM_FOCUS.high.languages.includes(input.language)) {
    highHit++;
    matched.push(`lang:${input.language}`);
  } else if (
    input.language &&
    DOSCOM_FOCUS.medium.languages.includes(input.language)
  ) {
    mediumHit++;
  } else if (
    input.language &&
    DOSCOM_FOCUS.low.languages.includes(input.language)
  ) {
    lowHit++;
  }

  for (const c of input.collectionSlugs) {
    if (DOSCOM_FOCUS.high.collections.includes(c)) {
      highHit++;
      matched.push(`coll:${c}`);
    } else if (DOSCOM_FOCUS.medium.collections.includes(c)) {
      mediumHit++;
    } else if (DOSCOM_FOCUS.low.collections.includes(c)) {
      lowHit++;
    }
  }

  let score =
    highHit * RELEVANCE_WEIGHTS.highHitPoints +
    mediumHit * RELEVANCE_WEIGHTS.mediumHitPoints -
    lowHit * RELEVANCE_WEIGHTS.lowHitPenalty;
  score = Math.max(0, Math.min(100, score));

  const t = RELEVANCE_WEIGHTS.tierThresholds;
  const tier: RelevanceTier =
    score >= t.high
      ? "high"
      : score >= t.medium
        ? "medium"
        : score >= t.low
          ? "low"
          : "none";

  return { score: Math.round(score), tier, matchedTokens: matched };
}
