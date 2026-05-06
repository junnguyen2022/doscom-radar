// Doscom Holdings — focus areas for relevance scoring.
// Refine these tiers when you see false positives/negatives in /trending.
//
// High = direct fit cho roadmap (AI agents, automation, internal tools, ecommerce).
// Medium = supporting infra (data, devops, monitoring).
// Low = không phải core business (gamedev, crypto, mobile-only).

export type RelevanceTier = "high" | "medium" | "low" | "none";

type FocusBucket = {
  topics: string[];
  languages: string[];
  collections: string[];
};

export const DOSCOM_FOCUS: Record<"high" | "medium" | "low", FocusBucket> = {
  high: {
    topics: [
      // AI/Agent (top priority)
      "ai-agent",
      "agent",
      "agents",
      "llm",
      "rag",
      "mcp",
      "anthropic",
      "claude",
      "openai",
      "gpt",
      // Automation & workflow
      "automation",
      "workflow",
      "no-code",
      "low-code",
      // Dev productivity
      "devtool",
      "developer-tools",
      // Business apps (Doscom core)
      "crm",
      "erp",
      "hr",
      "ecommerce",
      "business",
      "internal-tool",
      "company-os",
      // Data & insights
      "analytics",
      "observability",
      "dashboard",
    ],
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
    topics: [
      "data-pipeline",
      "etl",
      "monitoring",
      "kubernetes",
      "k8s",
      "serverless",
      "container",
      "vector-database",
      "embedding",
    ],
    languages: ["Go", "Rust", "Java"],
    collections: [
      "time-series-database",
      "graph-database",
      "apm-tool",
      "google-analytics-alternative",
    ],
  },
  low: {
    topics: [
      "game",
      "gamedev",
      "godot",
      "crypto",
      "blockchain",
      "nft",
      "defi",
      "web3",
      "mobile-only",
      "ios-only",
      "android-only",
    ],
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
