// V2.5 §23.6 — keyword-driven relevance + action mapping.

import type {
  AiNewsAction,
  AiNewsCategory,
  AiNewsRelevance,
} from "./types";

export const HIGH_RELEVANCE_KEYWORDS = [
  "agent",
  "ai agent",
  "ai-agent",
  "workflow",
  "automation",
  "rag",
  "retrieval",
  "customer support",
  "chatbot",
  "coding assistant",
  "coding agent",
  "data analysis",
  "dashboard",
  "ecommerce",
  "marketing automation",
  "voice ai",
  "vector database",
  "knowledge base",
];

export const LOW_RELEVANCE_KEYWORDS = [
  "crypto",
  "nft",
  "gaming",
  "blockchain",
  "metaverse",
  "web3",
  "memecoin",
];

const TOOL_REPO_HINTS = [
  "github.com",
  "release",
  "v0.",
  "v1.",
  "v2.",
  "v3.",
  "v4.",
  "open source",
  "open-source",
  "library",
  "framework",
  "sdk",
];

const MODEL_HINTS = [
  "claude",
  "gpt-",
  "gemini",
  "llama",
  "mistral",
  "qwen",
  "deepseek",
  "model card",
  "model release",
];

const RESEARCH_HINTS = ["paper", "arxiv", "benchmark", "research", "study"];

export function classifyRelevance(text: string): {
  relevance: AiNewsRelevance;
  category: AiNewsCategory;
  matchedHigh: string[];
  matchedLow: string[];
} {
  const t = text.toLowerCase();

  const matchedHigh = HIGH_RELEVANCE_KEYWORDS.filter((k) => t.includes(k));
  const matchedLow = LOW_RELEVANCE_KEYWORDS.filter((k) => t.includes(k));

  let relevance: AiNewsRelevance;
  if (matchedLow.length > 0 && matchedHigh.length === 0) relevance = "low";
  else if (matchedHigh.length >= 2) relevance = "high";
  else if (matchedHigh.length === 1) relevance = "medium";
  else relevance = "low";

  let category: AiNewsCategory = "news";
  if (MODEL_HINTS.some((h) => t.includes(h))) category = "model_update";
  else if (RESEARCH_HINTS.some((h) => t.includes(h))) category = "research";
  else if (TOOL_REPO_HINTS.some((h) => t.includes(h))) category = "tool_repo";

  return { relevance, category, matchedHigh, matchedLow };
}

export function suggestedAction(args: {
  relevance: AiNewsRelevance;
  category: AiNewsCategory;
}): AiNewsAction {
  if (args.relevance === "low") return "ignore";
  if (args.category === "tool_repo" && args.relevance === "high") return "test";
  if (args.relevance === "high") return "follow";
  return "read";
}

export function doscomImpact(args: {
  relevance: AiNewsRelevance;
  category: AiNewsCategory;
  matchedHigh: string[];
}): string | undefined {
  if (args.relevance === "low") return undefined;
  if (args.matchedHigh.includes("rag") || args.matchedHigh.includes("retrieval"))
    return "Khả năng áp dụng vào knowledge base nội bộ / CSKH.";
  if (
    args.matchedHigh.includes("agent") ||
    args.matchedHigh.includes("workflow") ||
    args.matchedHigh.includes("automation")
  )
    return "Có thể dùng cho automation nội bộ (HR, kế toán, vận hành).";
  if (
    args.matchedHigh.includes("dashboard") ||
    args.matchedHigh.includes("data analysis")
  )
    return "Phục vụ Data/BI — báo cáo điều hành.";
  if (
    args.matchedHigh.includes("ecommerce") ||
    args.matchedHigh.includes("marketing automation")
  )
    return "Áp dụng cho TMĐT / Marketing.";
  if (args.category === "model_update")
    return "Theo dõi để cập nhật vào pipeline AI hiện tại nếu giá / chất lượng tốt hơn.";
  return undefined;
}
