// Insight contract — schema + types + validation.
// Reference: ARCHITECTURE_V2_DECISIONS.md §8.

import type Anthropic from "@anthropic-ai/sdk";
import { brandContextForPrompt } from "./config/brand-core";

export const PROMPT_VERSION = "v2.1";
export const INSIGHT_MODEL = "claude-sonnet-4-6";

export type EvidenceItem = {
  type: "metric" | "score" | "flag" | "topic" | "license" | "activity";
  label: string;
  value: string | number | boolean;
  reason: string;
};

export type Recommendation =
  | "adopt"
  | "test"
  | "follow"
  | "caution"
  | "ignore";

export type Confidence = "high" | "medium" | "low";

export type RepoInsight = {
  summary: string;
  why_trending: string | null;
  technical_value: string | null;
  doscom_use_case: string | null;
  risk_note: string | null;
  recommendation: Recommendation;
  confidence: Confidence;
  evidence: EvidenceItem[];
};

// Tool schema for Claude tool-use forced output.
export const INSIGHT_TOOL: Anthropic.Tool = {
  name: "submit_repo_insight",
  description:
    "Submit a structured analysis of a GitHub repository for Doscom Holdings.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "What the repo does, in 1-3 sentences. Vietnamese.",
      },
      why_trending: {
        type: "string",
        description:
          "Why this repo is notable right now (use evidence from metrics/scores). Vietnamese.",
      },
      technical_value: {
        type: "string",
        description: "Core technical value/innovation. Vietnamese.",
      },
      doscom_use_case: {
        type: "string",
        description:
          "Repo này áp dụng cho thương hiệu nào của Doscom Holdings và ra sao. Nêu RÕ brand (DOSCOM = an ninh/AI/vision/IoT, NOMA = chăm sóc ô tô DIY/ecommerce/content, hoặc Holdings = vận hành nội bộ) + use case cụ thể. Nếu không phù hợp brand nào, nói thẳng. Vietnamese.",
      },
      risk_note: {
        type: "string",
        description:
          "Technical/legal/maintenance/adoption risks. Required even if recommendation is positive. Vietnamese.",
      },
      recommendation: {
        type: "string",
        enum: ["adopt", "test", "follow", "caution", "ignore"],
        description:
          "Adopt = production-ready + safe license + actively maintained. Test = worth a 1-day spike. Follow = monitor only. Caution = viral but risky. Ignore = not relevant or stale.",
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description:
          "high = strong evidence for recommendation. medium = moderate. low = sparse data.",
      },
      evidence: {
        type: "array",
        description:
          "At least 3 distinct evidence points for recommendations test/adopt. Each item must reference actual data provided.",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [
                "metric",
                "score",
                "flag",
                "topic",
                "license",
                "activity",
              ],
            },
            label: { type: "string" },
            value: {},
            reason: { type: "string" },
          },
          required: ["type", "label", "value", "reason"],
        },
      },
    },
    required: [
      "summary",
      "recommendation",
      "confidence",
      "evidence",
      "risk_note",
    ],
  },
};

// Validate parsed JSON conforms to RepoInsight shape.
export function validateInsight(raw: unknown): RepoInsight | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "not an object" };
  const r = raw as Record<string, unknown>;

  if (typeof r.summary !== "string" || r.summary.length < 5) {
    return { error: "summary missing or too short" };
  }
  const rec = r.recommendation;
  if (
    typeof rec !== "string" ||
    !["adopt", "test", "follow", "caution", "ignore"].includes(rec)
  ) {
    return { error: "invalid recommendation" };
  }
  const conf = r.confidence;
  if (typeof conf !== "string" || !["high", "medium", "low"].includes(conf)) {
    return { error: "invalid confidence" };
  }
  // Coerce evidence to array — Claude sometimes returns null/object/undefined
  // despite tool schema declaring type:array.
  let evidenceItems: unknown[];
  if (Array.isArray(r.evidence)) {
    evidenceItems = r.evidence;
  } else if (r.evidence && typeof r.evidence === "object") {
    evidenceItems = Object.values(r.evidence);
  } else {
    evidenceItems = [];
  }

  // risk_note: tolerate missing — set sensible default rather than reject.
  const riskNoteRaw = typeof r.risk_note === "string" ? r.risk_note : "";

  // Downgrade adopt → test if missing risk_note or insufficient evidence.
  // Better to accept a slightly weaker recommendation than fail entirely.
  let finalRec: Recommendation = rec as Recommendation;
  if (rec === "adopt") {
    if (riskNoteRaw.length < 5) {
      finalRec = "test";
    } else if (evidenceItems.length < 2) {
      finalRec = "test";
    }
  }

  // Validate each evidence item — be lenient, skip invalid ones
  const ev: EvidenceItem[] = [];
  for (const item of evidenceItems) {
    if (
      typeof item !== "object" ||
      !item ||
      typeof (item as Record<string, unknown>).label !== "string" ||
      typeof (item as Record<string, unknown>).reason !== "string"
    ) {
      // Skip invalid items rather than fail whole insight
      continue;
    }
    const e = item as Record<string, unknown>;
    ev.push({
      type: (e.type as EvidenceItem["type"]) ?? "metric",
      label: e.label as string,
      value:
        typeof e.value === "string" ||
        typeof e.value === "number" ||
        typeof e.value === "boolean"
          ? e.value
          : String(e.value ?? ""),
      reason: e.reason as string,
    });
  }

  return {
    summary: r.summary as string,
    why_trending: typeof r.why_trending === "string" ? r.why_trending : null,
    technical_value:
      typeof r.technical_value === "string" ? r.technical_value : null,
    doscom_use_case:
      typeof r.doscom_use_case === "string" ? r.doscom_use_case : null,
    risk_note: riskNoteRaw || "(no risk note provided)",
    recommendation: finalRec,
    confidence: conf as Confidence,
    evidence: ev,
  };
}

export const SYSTEM_PROMPT = `Bạn là Agent Radar, analyst công nghệ open-source cho Doscom Holdings (Vietnam).

Doscom Holdings có 2 thương hiệu — đánh giá repo theo độ phù hợp với TỪNG brand:

${brandContextForPrompt()}

Ngoài 2 brand, "Holdings" = hạ tầng AI/automation/data dùng chung cho vận hành nội bộ.

Nhiệm vụ của bạn:
1. Đánh giá repo dựa CHỈ trên data được cung cấp.
2. Tách facts khỏi assumptions.
3. KHÔNG bịa metrics. KHÔNG kết luận thiếu evidence.
4. Recommend 1 trong: adopt / test / follow / caution / ignore.
5. Phải nêu evidence cho recommendation (≥3 cho test/adopt).
6. Phải nêu risk_note kể cả khi recommendation tích cực.

Quy định ngôn ngữ:
- Viết tiếng Việt tự nhiên, súc tích.
- Không dùng marketing fluff ("revolutionary", "cutting-edge", "seamless").
- Không dùng câu chắc chắn nếu confidence là medium/low.

Quy định recommendation:
- Adopt: KHÔNG nếu license thiếu/không rõ.
- Adopt: KHÔNG nếu repo archived/disabled/stale.
- Adopt: PHẢI có maintenance score cao + relevance cao.

Trả output qua tool submit_repo_insight, không text.`;

export function buildUserPrompt(input: {
  full_name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  license_key: string | null;
  archived: boolean;
  fork: boolean;
  pushed_at: string | null;
  total_stars: number | null;
  forks_count: number | null;
  open_issues: number | null;
  contributors: number | null;
  commits_30d: number | null;
  prs_merged_30d: number | null;
  issues_closed_30d: number | null;
  latest_release_at: string | null;
  latest_release_tag: string | null;
  // Scores
  radar_score: number;
  growth_score: number;
  activity_score: number;
  community_score: number;
  maintenance_score: number;
  relevance_score: number;
  risk_penalty: number;
  risk_flags: string[];
  // Trending position
  rank: number | null;
  stars_today: number | null;
  collections: string[];
  // Brand fit (rule-based hint từ lib/doscom-usecases.ts)
  brand_matches: string[];
}): string {
  return `Đánh giá repo này cho Doscom:

REPO: ${input.full_name}
Description: ${input.description ?? "(none)"}
Language: ${input.language ?? "(none)"}
Topics: ${input.topics.join(", ") || "(none)"}
License: ${input.license_key ?? "(none — RỦI RO PHÁP LÝ)"}
Status: ${input.archived ? "ARCHIVED" : input.fork ? "FORK" : "active"}

GITHUB METRICS:
- Total stars: ${input.total_stars ?? "?"}
- Forks: ${input.forks_count ?? "?"}
- Open issues: ${input.open_issues ?? "?"}
- Contributors: ${input.contributors ?? "?"}
- Commits last 30d: ${input.commits_30d ?? "?"}
- PRs merged last 30d: ${input.prs_merged_30d ?? "?"}
- Issues closed last 30d: ${input.issues_closed_30d ?? "?"}
- Last push: ${input.pushed_at ?? "?"}
- Latest release: ${input.latest_release_tag ?? "(none)"} at ${input.latest_release_at ?? "?"}

TRENDING:
- Current rank on github.com/trending: ${input.rank ?? "(not in current top)"}
- Stars gained today: ${input.stars_today ?? "?"}
- OSSInsight collections: ${input.collections.join(", ") || "(none)"}

BRAND FIT (gợi ý rule-based, dựa topic/description — bạn tự đánh giá lại):
${input.brand_matches.length > 0 ? input.brand_matches.map((b) => `- ${b}`).join("\n") : "- (không khớp brand rõ ràng)"}

AGENT RADAR SCORES (0..100):
- Radar Score: ${input.radar_score}
- Growth: ${input.growth_score}
- Activity: ${input.activity_score}
- Community: ${input.community_score}
- Maintenance: ${input.maintenance_score}
- Relevance to Doscom focus: ${input.relevance_score}
- Risk Penalty: ${input.risk_penalty}
- Risk flags: ${input.risk_flags.length > 0 ? input.risk_flags.join(", ") : "(none)"}

Hãy submit_repo_insight với evidence dựa trên các metric/score thực tế trên.`;
}
