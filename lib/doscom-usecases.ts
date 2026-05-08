// V2.5 §24.5 — map repo signals → Doscom departments + suggested use cases.
// Rule-based, Vietnamese labels. Inputs: topics, language, README text/keywords.

export type DoscomMatch = {
  department: string;
  useCases: string[];
  matchedSignals: string[];
};

type Rule = {
  id: string;
  keywords: string[];
  departments: string[];
  useCases: string[];
};

const RULES: Rule[] = [
  {
    id: "ai-agent",
    keywords: [
      "agent",
      "ai agent",
      "ai-agent",
      "agents",
      "multi-agent",
      "multi agent",
      "autonomous",
      "llm",
      "workflow",
      "automation",
      "orchestration",
      "tool use",
      "tool-use",
    ],
    departments: ["Tech", "Operations"],
    useCases: [
      "Tự động hoá quy trình nội bộ (HR, kế toán, vận hành)",
      "Trợ lý nội bộ cho team kỹ thuật",
      "Pipeline review tự động",
    ],
  },
  {
    id: "rag-knowledge",
    keywords: [
      "rag",
      "retrieval",
      "retrieval-augmented",
      "vector",
      "embedding",
      "knowledge base",
      "knowledge-base",
      "document",
      "semantic search",
      "qa",
      "question answering",
    ],
    departments: ["Tech", "HCNS", "Operations"],
    useCases: [
      "Tra cứu chính sách / quy trình nội bộ",
      "Knowledge base cho CSKH (FAQ, sổ tay)",
      "Search trên kho tài liệu công ty",
    ],
  },
  {
    id: "chatbot-support",
    keywords: [
      "chatbot",
      "chat bot",
      "customer support",
      "support",
      "crm",
      "helpdesk",
      "ticketing",
      "messaging",
      "live chat",
      "livechat",
      "conversational",
    ],
    departments: ["CSKH", "Business"],
    useCases: [
      "Bot hỗ trợ khách hàng 24/7",
      "Auto-route ticket theo intent",
      "Tổng hợp hội thoại CRM",
    ],
  },
  {
    id: "data-bi",
    keywords: [
      "dashboard",
      "analytics",
      "bi",
      "business intelligence",
      "data visualization",
      "data-viz",
      "metrics",
      "kpi",
      "observability",
      "report",
      "reporting",
    ],
    departments: ["Data/BI", "CEO/COO"],
    useCases: [
      "Dashboard KPI điều hành",
      "Báo cáo doanh thu / tồn kho",
      "Theo dõi metric vận hành theo thời gian thực",
    ],
  },
  {
    id: "ecommerce",
    keywords: [
      "ecommerce",
      "e-commerce",
      "marketplace",
      "shop",
      "shopping",
      "pricing",
      "recommendation",
      "checkout",
      "order",
      "inventory",
      "fulfillment",
    ],
    departments: ["Business", "Marketing", "TMĐT"],
    useCases: [
      "Đề xuất sản phẩm cho khách",
      "Tối ưu giá / khuyến mãi",
      "Quản lý đơn hàng đa kênh",
    ],
  },
  {
    id: "marketing-content",
    keywords: [
      "content",
      "marketing",
      "seo",
      "social",
      "social-media",
      "social media",
      "newsletter",
      "campaign",
      "growth",
      "ads",
      "advertising",
      "copywriting",
    ],
    departments: ["Marketing"],
    useCases: [
      "Tự động sinh bài SEO / mạng xã hội",
      "Lập lịch & phân tích chiến dịch",
      "Tóm tắt insight khách hàng",
    ],
  },
  {
    id: "coding-devtools",
    keywords: [
      "ide",
      "code completion",
      "coding",
      "coding agent",
      "developer tool",
      "devtool",
      "developer-tools",
      "ci",
      "cd",
      "linter",
      "formatter",
      "refactor",
    ],
    departments: ["Tech"],
    useCases: [
      "Tăng tốc code review / refactor",
      "Bot trả lời PR / issue",
      "Tự động hoá CI nội bộ",
    ],
  },
];

function buildHaystack(input: {
  topics?: string[];
  language?: string | null;
  description?: string | null;
  readmeOverview?: string;
  readmeFeatures?: string[];
}): string {
  return [
    ...(input.topics ?? []),
    input.language ?? "",
    input.description ?? "",
    input.readmeOverview ?? "",
    ...(input.readmeFeatures ?? []),
  ]
    .join(" \n ")
    .toLowerCase();
}

export function mapDoscomUseCases(input: {
  topics?: string[];
  language?: string | null;
  description?: string | null;
  readmeOverview?: string;
  readmeFeatures?: string[];
}): DoscomMatch[] {
  const hay = buildHaystack(input);
  const matches: DoscomMatch[] = [];

  for (const rule of RULES) {
    const hits = rule.keywords.filter((k) => hay.includes(k));
    if (hits.length === 0) continue;
    matches.push({
      department: rule.departments.join(" + "),
      useCases: rule.useCases,
      matchedSignals: hits.slice(0, 5),
    });
  }

  return matches;
}
