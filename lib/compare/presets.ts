// V2.5 §22.5 — Compare presets for Doscom focus areas.
// Click a preset to instantly fill 3 representative repos in each domain.

export type ComparePreset = {
  id: string;
  label: { vi: string; en: string };
  description: { vi: string; en: string };
  repos: string[];
};

export const COMPARE_PRESETS: ComparePreset[] = [
  {
    id: "ai-agent",
    label: { vi: "AI Agent", en: "AI Agent" },
    description: {
      vi: "Multi-agent framework, autonomous workflow",
      en: "Multi-agent frameworks, autonomous workflows",
    },
    repos: ["microsoft/autogen", "crewAIInc/crewAI", "langchain-ai/langgraph"],
  },
  {
    id: "rag-tools",
    label: { vi: "RAG Tools", en: "RAG Tools" },
    description: {
      vi: "Retrieval-augmented generation, knowledge base",
      en: "Retrieval-augmented generation, knowledge base",
    },
    repos: [
      "run-llama/llama_index",
      "langchain-ai/langchain",
      "deepset-ai/haystack",
    ],
  },
  {
    id: "coding-agent",
    label: { vi: "Coding Agent", en: "Coding Agent" },
    description: {
      vi: "AI coding assistant trong IDE/terminal",
      en: "AI coding assistants in IDE/terminal",
    },
    repos: ["continuedev/continue", "cline/cline", "openai/codex"],
  },
  {
    id: "devtools",
    label: { vi: "DevTools", en: "DevTools" },
    description: {
      vi: "Web framework + meta-framework chính",
      en: "Web frameworks & meta-frameworks",
    },
    repos: ["vercel/next.js", "facebook/react", "sveltejs/svelte"],
  },
  {
    id: "data-bi",
    label: { vi: "Data / BI", en: "Data / BI" },
    description: {
      vi: "Dashboard, BI tools, analytics",
      en: "Dashboard, BI tools, analytics",
    },
    repos: ["metabase/metabase", "apache/superset", "grafana/grafana"],
  },
];

export function getPresetById(id: string): ComparePreset | null {
  return COMPARE_PRESETS.find((p) => p.id === id) ?? null;
}
