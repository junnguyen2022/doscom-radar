# Agent Radar Free MVP — Prompt triển khai cho Dev / AI Coder

> Mục tiêu: dùng tài liệu này để copy vào Antigravity / Cursor / Gemini / Claude Code nhằm triển khai Free MVP cho Agent Radar.

---

## 1. Cách dùng

### Dùng prompt nào?

- **Prompt A — Build Prompt**: gửi cho AI coder để sửa code, thêm route, sửa UI, thêm logic.
- **Prompt B — Runtime AI Prompt**: nhúng vào source code app, chỉ dùng khi người dùng bấm nút **Generate AI Analysis** trên từng repo.

### Nguyên tắc bắt buộc

- Không dùng dịch vụ trả phí mới.
- Không tự động gọi AI hàng loạt.
- Không ingest GH Archive trong Free MVP.
- Không crawl dữ liệu lớn.
- Ưu tiên rule-based extraction trước AI.
- AI chỉ chạy thủ công nếu có `ANTHROPIC_API_KEY`.

---

# Prompt A — Câu lệnh giao cho Dev / AI Coder

Copy nguyên prompt dưới đây vào Antigravity / Cursor / Gemini / Claude Code.

```text
Implement Free MVP improvements for Agent Radar.

Project context:
- The current app is Agent Radar, a GitHub trending tracker built with Next.js, TypeScript, Supabase/Postgres or JSON fallback, GitHub Trending scraper, GitHub REST enrichment, Claude optional AI insight, Tech Radar, Watchlist, Decisions, Digest, Compare and Repo Detail pages.
- The goal is to improve the existing app without adding paid services.
- The current priority is not to add more visual pages, but to make Compare, AI News and Repo Detail useful for actual decision-making.

Hard constraints:
- Do not add any paid service.
- Do not add GH Archive ingestion.
- Do not auto-generate AI summaries for all repos or all news items.
- Keep the current Vercel/Supabase free-compatible architecture.
- Prefer rule-based extraction over AI.
- Manual AI generation may remain optional behind the existing `ANTHROPIC_API_KEY`, but it must not run automatically.
- Keep the app working even if `ANTHROPIC_API_KEY` is missing.
- Limit enrichment to the top 100–300 repos/day.
- Cache README/profile extraction where possible.
- Avoid repeated GitHub API calls on every page load.
- Gracefully degrade if GitHub API rate limit is hit.

Main tasks:

1. Improve Compare page

Requirements:
- Accept both `owner/repo` and full GitHub URLs.
- Support comma-separated repo input.
- Examples of valid input:
  - `vercel/next.js`
  - `https://github.com/vercel/next.js`
  - `vercel/next.js, facebook/react, sveltejs/svelte`
- Add helper text explaining the input format.
- Add clear empty state with practical examples.
- Add preset compare buttons:
  - AI Agent
  - RAG Tools
  - Coding Agent
  - DevTools
  - Data/BI
- Add or update comparison sections:
  - Overview
  - Growth
  - Activity
  - Community
  - Risk
  - Recommendation
- If repo data is missing, fetch/enrich using the existing GitHub API flow or show graceful fallback.
- Add clear final recommendation comparing the selected repos.

Suggested compare presets:

```ts
const COMPARE_PRESETS = {
  "AI Agent": [
    "microsoft/autogen",
    "crewAIInc/crewAI",
    "langchain-ai/langgraph"
  ],
  "RAG Tools": [
    "run-llama/llama_index",
    "langchain-ai/langchain",
    "deepset-ai/haystack"
  ],
  "Coding Agent": [
    "continuedev/continue",
    "cline/cline",
    "openai/codex"
  ],
  "DevTools": [
    "vercel/next.js",
    "facebook/react",
    "sveltejs/svelte"
  ],
  "Data/BI": [
    "metabase/metabase",
    "apache/superset",
    "grafana/grafana"
  ]
};
```

2. Add AI News Daily free mode

Requirements:
- Create a new route `/ai-news`.
- Add a nav item: `AI News` or `Bảng tin AI`.
- Fetch only free/public sources.
- Start with GitHub Trending AI-related repos and RSS feeds if available.
- Store or render normalized news items with:
  - title
  - source
  - url
  - published_at
  - tags
  - short_description
  - relevance
  - suggested_action
- Do not call AI automatically.
- Add optional button `Generate AI summary` only if `ANTHROPIC_API_KEY` exists.
- If an RSS/source fails, skip that source and do not fail the entire page.
- Add markdown export support later, but it is not required in the first pass.

Suggested free sources:

```ts
const AI_NEWS_SOURCES = [
  {
    name: "Hacker News AI",
    type: "hn_search",
    query: "AI OR LLM OR agent OR OpenAI OR Anthropic"
  },
  {
    name: "GitHub Trending AI",
    type: "github_trending",
    language: "python,typescript"
  },
  {
    name: "Hugging Face Blog",
    type: "rss",
    url: "https://huggingface.co/blog/feed.xml"
  },
  {
    name: "OpenAI Blog",
    type: "rss",
    url: "https://openai.com/news/rss.xml"
  },
  {
    name: "Anthropic News",
    type: "rss",
    url: "https://www.anthropic.com/news/rss.xml"
  }
];
```

Suggested relevance keywords:

```ts
const HIGH_RELEVANCE_KEYWORDS = [
  "agent",
  "ai agent",
  "workflow",
  "automation",
  "rag",
  "retrieval",
  "customer support",
  "chatbot",
  "coding assistant",
  "data analysis",
  "dashboard",
  "ecommerce",
  "marketing automation",
  "voice ai"
];

const LOW_RELEVANCE_KEYWORDS = [
  "crypto",
  "nft",
  "gaming",
  "blockchain",
  "metaverse"
];
```

3. Upgrade Repo Detail page into Repo Intelligence Profile

Requirements:
- Fetch README via GitHub REST API.
- Add README extractor with this output:

```ts
type ReadmeProfile = {
  overview: string;
  keyFeatures: string[];
  useCases: string[];
  installation?: string;
  usage?: string;
  docsLinks: string[];
  confidence: "high" | "medium" | "low";
};
```

- Extract content using common README headings:
  - Features
  - Key Features
  - Usage
  - Use Cases
  - Installation
  - Getting Started
  - Quick Start
  - Documentation
  - Why
  - About
  - Overview
- If README has no clear headings:
  - Use the first 2–3 meaningful paragraphs as overview.
  - Use the first relevant bullet list as features.
  - Set confidence to `medium` or `low`.
- Add Doscom use-case mapper based on repo topics, README keywords, language and description.
- Add risk/recommendation card using rule-based scoring.

Display these sections clearly on the Repo Detail page:
- Repo này là gì?
- Tính năng chính
- Ứng dụng phổ biến
- Ứng dụng cho Doscom
- Rủi ro cần kiểm tra
- Khuyến nghị: Follow / Test / Adopt / Ignore
- Missing data / confidence

Suggested Doscom use-case rules:

```ts
const DOSCOM_USECASE_RULES = [
  {
    keywords: ["agent", "llm", "multi-agent", "workflow"],
    useCases: [
      "Xây AI agent hỗ trợ các phòng ban",
      "Tự động hóa quy trình vận hành nội bộ",
      "Hỗ trợ phòng Tech thử nghiệm agent workflow"
    ]
  },
  {
    keywords: ["rag", "retrieval", "knowledge", "document"],
    useCases: [
      "Xây Knowledge Base AI cho SOP, quy trình, tài liệu đào tạo",
      "Tìm kiếm nội bộ theo ngữ nghĩa",
      "Hỗ trợ nhân sự tra cứu chính sách và hướng dẫn"
    ]
  },
  {
    keywords: ["chatbot", "customer support", "crm"],
    useCases: [
      "Hỗ trợ CSKH trả lời khách hàng",
      "Chuẩn hóa phản hồi theo kịch bản",
      "Giảm tải cho đội CSKH"
    ]
  },
  {
    keywords: ["dashboard", "analytics", "bi", "data"],
    useCases: [
      "Nâng cấp dashboard quản trị",
      "Tự động hóa báo cáo",
      "Phân tích dữ liệu kinh doanh, Marketing, CSKH"
    ]
  },
  {
    keywords: ["ecommerce", "marketplace", "pricing", "recommendation"],
    useCases: [
      "Tối ưu vận hành Shopee/TikTok/Lazada",
      "Theo dõi giá và đối thủ",
      "Gợi ý sản phẩm và tối ưu conversion"
    ]
  },
  {
    keywords: ["content", "marketing", "seo", "social"],
    useCases: [
      "Tự động hóa sản xuất nội dung",
      "Hỗ trợ Marketing phân tích xu hướng",
      "Tăng tốc content operation"
    ]
  }
];
```

Suggested recommended action rule:

```ts
function getRecommendedAction(score: number, risk: number, relevance: number) {
  if (relevance >= 80 && score >= 85 && risk <= 20) return "Adopt";
  if (relevance >= 80 && score >= 70 && risk <= 30) return "Test";
  if (relevance >= 50 && score >= 50) return "Follow";
  return "Ignore";
}
```

4. Optional manual AI analysis

Requirements:
- Add a manual button: `Generate AI Analysis`.
- Only show or enable it if `ANTHROPIC_API_KEY` exists.
- Do not run AI automatically.
- Use the runtime prompt provided separately as `Doscom GitHub Radar Analyst`.
- Store the generated result if a storage layer exists.
- If no AI key exists, show a clear message: `AI analysis is disabled in Free MVP mode.`

5. Acceptance criteria

The implementation is complete when:
- Compare page can be understood and used within 30 seconds.
- User can paste full GitHub URLs and compare successfully.
- Preset comparison buttons work.
- `/ai-news` shows daily AI-related items without paid AI calls.
- Repo detail clearly explains what the repo does, key features, use cases, Doscom relevance, risks and recommendation.
- README extraction works without AI.
- AI is never called automatically.
- The app remains functional without `ANTHROPIC_API_KEY`.
- No automatic paid API calls are introduced.
```

---

# Prompt B — Runtime AI Prompt cho tính năng Generate AI Analysis

Prompt này **không dùng để build app**. Nhúng prompt này vào source code, ví dụ:

```text
lib/prompts/repo-analyst.ts
```

Chỉ gọi prompt này khi người dùng bấm nút **Generate AI Analysis**.

```text
You are Doscom's GitHub Radar Analyst.

Your job is to analyze one GitHub repository for practical business and technical use by Doscom.

Important rules:
- Use only the provided repository data.
- Do not invent facts.
- If information is missing, say it is missing.
- Separate facts from assumptions.
- Prioritize practical usefulness for Doscom.
- Output must be valid JSON only.
- Do not include markdown.
- Write all user-facing fields in Vietnamese.

Context about Doscom:
Doscom is building AI-first internal tools, automation workflows, data dashboards, customer support systems, e-commerce operations, marketing automation, knowledge base/RAG, and technology-enabled operations.

Input data may include:
- repo metadata
- description
- topics
- language
- README content
- stars, forks, open issues
- latest release
- contributors
- pushed_at
- license
- scoring data
- trending data

Return this exact JSON structure:

{
  "repo_identity": {
    "name": "",
    "one_line_summary": "",
    "category": "",
    "primary_users": [],
    "problem_solved": ""
  },
  "fact_based_summary": {
    "what_it_is": "",
    "what_it_does": "",
    "based_on": [
      "README",
      "repo description",
      "topics",
      "metadata"
    ]
  },
  "key_features": [
    {
      "feature": "",
      "evidence": "",
      "confidence": "high | medium | low"
    }
  ],
  "common_use_cases": [
    {
      "use_case": "",
      "reason": ""
    }
  ],
  "doscom_use_cases": [
    {
      "department": "Tech | Marketing | Business | CSKH | Operations | Data/BI | Other",
      "use_case": "",
      "practical_value": "",
      "implementation_difficulty": "low | medium | high"
    }
  ],
  "fit_for_doscom": {
    "level": "high | medium | low",
    "reason": "",
    "best_fit_scenario": "",
    "not_fit_if": ""
  },
  "risk_analysis": {
    "technical_risk": "",
    "security_risk": "",
    "maintenance_risk": "",
    "license_risk": "",
    "adoption_risk": ""
  },
  "recommended_action": {
    "status": "follow | test | adopt | ignore",
    "reason": "",
    "next_step": "",
    "owner_suggestion": "Tech | Data/BI | Marketing | CSKH | Business | CEO/COO"
  },
  "decision_summary": {
    "executive_view": "",
    "why_now": "",
    "what_to_verify_next": []
  },
  "confidence": "high | medium | low",
  "missing_data": []
}

Decision rules:
- Use "adopt" only if the repo is mature, relevant, low-risk, and clearly useful.
- Use "test" if the repo is highly relevant but still needs validation.
- Use "follow" if the repo is interesting but not ready for action.
- Use "ignore" if relevance is low or risk is too high.
- If README is weak or missing, confidence must be low or medium.
- If license is missing, include license_risk.
- If recent activity is missing or stale, include maintenance_risk.
```

---

# 3. Checklist nghiệm thu Free MVP

## Compare Repo

- [ ] Người dùng hiểu cách dùng trong dưới 30 giây.
- [ ] Nhập được `owner/repo`.
- [ ] Nhập được full GitHub URL.
- [ ] Nhập được nhiều repo bằng dấu phẩy.
- [ ] Preset compare hoạt động.
- [ ] Empty state có ví dụ rõ.
- [ ] Có recommendation cuối.

## AI News Daily

- [ ] Có route `/ai-news`.
- [ ] Có nav item.
- [ ] Lấy được tin từ nguồn miễn phí/public.
- [ ] Không gọi AI tự động.
- [ ] Có relevance rule-based.
- [ ] Có suggested action.
- [ ] Source lỗi không làm hỏng toàn bộ trang.

## Repo Detail Intelligence

- [ ] Lấy được README qua GitHub API.
- [ ] Extract được overview.
- [ ] Extract được key features nếu README có dữ liệu.
- [ ] Có use case phổ biến.
- [ ] Có use case cho Doscom.
- [ ] Có risk card.
- [ ] Có recommendation Follow/Test/Adopt/Ignore.
- [ ] Có confidence và missing data.

## Cost Control

- [ ] Không có paid service mới.
- [ ] Không auto AI.
- [ ] Không GH Archive.
- [ ] Không crawl quá 100–300 repo/ngày.
- [ ] App vẫn chạy khi không có `ANTHROPIC_API_KEY`.

---

# 4. Quyết định triển khai

Khuyến nghị triển khai theo thứ tự:

```text
1. Compare Repo UX
2. Repo Detail Intelligence rule-based
3. AI News Daily free mode
4. Manual Generate AI Analysis
```

Không làm ngược lại. Nếu làm AI trước, dễ phát sinh phí và kết quả vẫn thiếu nền dữ liệu.

