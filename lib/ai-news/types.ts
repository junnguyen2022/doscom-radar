// V2.5 §23.5 — AI News item shape.

export type AiNewsRelevance = "high" | "medium" | "low";
export type AiNewsAction = "read" | "follow" | "test" | "ignore";
export type AiNewsCategory =
  | "news"
  | "tool_repo"
  | "model_update"
  | "research"
  | "other";

export type AiNewsItem = {
  id: string; // hash of url
  title: string;
  source: string;
  source_type: "github_trending" | "hn_search" | "rss";
  url: string;
  published_at?: string;
  tags: string[];
  short_description?: string;
  relevance: AiNewsRelevance;
  suggested_action: AiNewsAction;
  doscom_impact?: string;
  category: AiNewsCategory;
};
