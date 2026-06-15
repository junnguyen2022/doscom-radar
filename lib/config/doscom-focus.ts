// Doscom Holdings — focus areas for relevance scoring.
// Refine these tiers when you see false positives/negatives in /trending.
//
// High = direct fit cho roadmap (AI agents, automation, internal tools, ecommerce,
//        + brand-specific: DOSCOM security/vision/IoT, NOMA ecommerce/content).
// Medium = supporting infra (data, devops, monitoring).
// Low = không phải core business (gamedev, crypto, mobile-only).
//
// Brand-specific topics được merge từ lib/config/brand-core.ts (single source).

import {
  allBrandTechHigh,
  allBrandTechMedium,
  HOLDINGS_AVOID,
} from "./brand-core";

export type RelevanceTier = "high" | "medium" | "low" | "none";

type FocusBucket = {
  topics: string[];
  languages: string[];
  collections: string[];
};

// Topics gắn với roadmap chung (không thuộc brand cụ thể).
const BASE_HIGH_TOPICS = [
  // AI/Agent (top priority)
  "anthropic",
  "claude",
  "openai",
  "gpt",
  // Dev productivity
  "devtool",
  "developer-tools",
  // Business apps
  "erp",
  "hr",
  "business",
  "company-os",
];

const BASE_MEDIUM_TOPICS = [
  "kubernetes",
  "k8s",
  "serverless",
  "container",
];

const dedupe = (xs: string[]) => Array.from(new Set(xs));

export const DOSCOM_FOCUS: Record<"high" | "medium" | "low", FocusBucket> = {
  high: {
    // Merge: roadmap chung + tín hiệu tech của 2 brand (DOSCOM + NOMA) + AI backbone.
    topics: dedupe([...BASE_HIGH_TOPICS, ...allBrandTechHigh()]),
    languages: ["TypeScript", "Python"],
    collections: [
      "artificial-intelligence",
      "ai-coding-agent",
      "low-code-development-tool",
      "business-intelligence",
      "web-framework",
      "headless-cms",
    ],
  },
  medium: {
    topics: dedupe([...BASE_MEDIUM_TOPICS, ...allBrandTechMedium()]),
    languages: ["Go", "Rust", "Java"],
    collections: [
      "time-series-database",
      "graph-database",
      "apm-tool",
      "google-analytics-alternative",
    ],
  },
  low: {
    topics: dedupe([
      ...HOLDINGS_AVOID,
      "mobile-only",
      "ios-only",
      "android-only",
    ]),
    languages: ["Solidity", "Move", "Cairo"],
    collections: ["game-engine", "javascript-game-engine"],
  },
};

// Score config — relevance formula (see ARCHITECTURE_V2_DECISIONS.md §3.2)
export const RELEVANCE_WEIGHTS = {
  highHitPoints: 30,
  mediumHitPoints: 15,
  lowHitPenalty: 25,
  tierThresholds: {
    high: 70,
    medium: 40,
    low: 1,
  },
};
