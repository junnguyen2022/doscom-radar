// V2.5 §23.4 — five free AI news sources.

export type AiNewsSource =
  | {
      name: string;
      type: "github_trending";
      query: string;
    }
  | {
      name: string;
      type: "hn_search";
      query: string;
    }
  | {
      name: string;
      type: "rss";
      url: string;
    };

export const AI_NEWS_SOURCES: AiNewsSource[] = [
  {
    name: "GitHub Trending AI",
    type: "github_trending",
    query: "ai OR llm OR agent OR rag OR automation",
  },
  {
    name: "Hacker News AI",
    type: "hn_search",
    query: "AI OR LLM OR agent OR OpenAI OR Anthropic OR Google DeepMind",
  },
  {
    name: "Hugging Face Blog",
    type: "rss",
    url: "https://huggingface.co/blog/feed.xml",
  },
  {
    name: "OpenAI News",
    type: "rss",
    url: "https://openai.com/news/rss.xml",
  },
  {
    name: "Anthropic News",
    type: "rss",
    url: "https://www.anthropic.com/news/rss.xml",
  },
];
