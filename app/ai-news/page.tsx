import { fetchAiNews } from "@/lib/ai-news/fetch";
import type { AiNewsItem } from "@/lib/ai-news/types";
import { AiNewsCard } from "@/components/ai-news/AiNewsCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import {
  Newspaper,
  Wrench,
  Sparkles,
  Building2,
  ListChecks,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 1800; // 30 min

type Block = {
  id: string;
  title: string;
  description: string;
  icon: typeof Newspaper;
  filter: (i: AiNewsItem) => boolean;
  limit: number;
};

const BLOCKS: Block[] = [
  {
    id: "top-news",
    title: "Top AI News",
    description: "Tin tức quan trọng nhất 24h qua",
    icon: Newspaper,
    filter: (i) =>
      i.relevance !== "low" &&
      (i.category === "news" || i.category === "research"),
    limit: 8,
  },
  {
    id: "tools-repos",
    title: "Top Tools / Repos",
    description: "Tools / repos AI mới đáng test",
    icon: Wrench,
    filter: (i) => i.category === "tool_repo" && i.relevance !== "low",
    limit: 8,
  },
  {
    id: "model-updates",
    title: "Model Updates",
    description: "Cập nhật từ Anthropic, OpenAI, Google, ...",
    icon: Sparkles,
    filter: (i) => i.category === "model_update",
    limit: 6,
  },
  {
    id: "doscom-impact",
    title: "Doscom Impact",
    description: "Tin có thể áp dụng vào Doscom",
    icon: Building2,
    filter: (i) => !!i.doscom_impact,
    limit: 8,
  },
  {
    id: "actions",
    title: "Suggested Actions",
    description: "Tin với hành động test/follow rõ ràng",
    icon: ListChecks,
    filter: (i) => i.suggested_action === "test" || i.suggested_action === "follow",
    limit: 8,
  },
];

export default async function AiNewsPage() {
  const all = await fetchAiNews();

  return (
    <main>
      <PageHeader
        eyebrow="AI News"
        title="AI News Daily"
        description="Tổng hợp tin tức AI từ GitHub Trending, Hacker News, Hugging Face, OpenAI, Anthropic. Lọc theo Doscom focus."
        meta={
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {all.length} mục — cache 30 phút. Relevance + suggested action tính
            theo keyword (rule-based).
          </p>
        }
      />

      {all.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Chưa load được tin"
          description="Có thể do rate-limit hoặc network. Thử lại sau ít phút."
        />
      ) : (
        <div className="space-y-8">
          {BLOCKS.map((b) => {
            const items = all.filter(b.filter).slice(0, b.limit);
            if (items.length === 0) return null;
            const Icon = b.icon;
            return (
              <section key={b.id} id={b.id}>
                <header className="mb-3 flex items-baseline justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      <Icon className="h-4 w-4 text-brand-500" />
                      {b.title}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {b.description}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-zinc-400">
                    {items.length}
                  </span>
                </header>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((it) => (
                    <AiNewsCard key={it.id} item={it} />
                  ))}
                </div>
              </section>
            );
          })}

          <Card className="p-4 text-xs text-zinc-500 dark:text-zinc-400">
            💡 Nguồn: GitHub Trending, Hacker News (Algolia), Hugging Face,
            OpenAI, Anthropic. Tất cả miễn phí. Tin được phân loại bằng
            keyword-based rule (không dùng AI để giữ chi phí ≈ $0).
          </Card>
        </div>
      )}
    </main>
  );
}
