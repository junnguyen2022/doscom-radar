// V2.5 §23.5 — AI news item card.

import { Badge } from "@/components/ui/Badge";
import { ExternalLink, Bookmark, Eye, Beaker, XCircle } from "lucide-react";
import type { AiNewsItem, AiNewsAction } from "@/lib/ai-news/types";

const REL_TONE: Record<
  AiNewsItem["relevance"],
  "success" | "warning" | "neutral"
> = {
  high: "success",
  medium: "warning",
  low: "neutral",
};

const ACTION_META: Record<
  AiNewsAction,
  { icon: typeof Eye; label: string; tone: "success" | "warning" | "brand" | "neutral" }
> = {
  read: { icon: Eye, label: "Read", tone: "neutral" },
  follow: { icon: Bookmark, label: "Follow", tone: "warning" },
  test: { icon: Beaker, label: "Test", tone: "brand" },
  ignore: { icon: XCircle, label: "Ignore", tone: "neutral" },
};

function formatDate(iso?: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

export function AiNewsCard({ item }: { item: AiNewsItem }) {
  const ActionIcon = ACTION_META[item.suggested_action].icon;
  const dateStr = formatDate(item.published_at);

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-brand-300 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-brand-700">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-start gap-1 text-sm font-semibold text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
          >
            <span className="line-clamp-2">{item.title}</span>
            <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" />
          </a>
          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="font-medium">{item.source}</span>
            {dateStr && <span className="ml-1">· {dateStr}</span>}
          </p>
        </div>
        <Badge tone={REL_TONE[item.relevance]} className="shrink-0 text-[10px] uppercase">
          {item.relevance}
        </Badge>
      </div>

      {item.short_description && (
        <p className="mt-2 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
          {item.short_description}
        </p>
      )}

      {item.doscom_impact && (
        <p className="mt-2 rounded-md bg-brand-50 px-2 py-1 text-xs text-brand-800 dark:bg-brand-950/30 dark:text-brand-300">
          💡 {item.doscom_impact}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          <ActionIcon className="h-3 w-3" />
          {ACTION_META[item.suggested_action].label}
        </span>
        {item.tags.slice(0, 4).map((t) => (
          <span
            key={t}
            className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          >
            {t}
          </span>
        ))}
      </div>
    </article>
  );
}
