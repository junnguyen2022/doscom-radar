import {
  Sparkles,
  TrendingUp,
  Lightbulb,
  Briefcase,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { EvidenceItem } from "@/lib/insight-contract";

export type InsightCardData = {
  insight_date: string;
  summary: string;
  why_trending: string | null;
  technical_value: string | null;
  doscom_use_case: string | null;
  risk_note: string | null;
  recommendation: string;
  confidence: string;
  evidence: EvidenceItem[];
  model: string;
  generated_at: string;
};

const REC_TONE: Record<string, "success" | "warning" | "danger" | "brand" | "neutral"> = {
  adopt: "success",
  test: "brand",
  follow: "warning",
  caution: "danger",
  ignore: "neutral",
};

const REC_LABEL: Record<string, string> = {
  adopt: "Adopt",
  test: "Test",
  follow: "Follow",
  caution: "Caution",
  ignore: "Ignore",
};

const CONFIDENCE_TONE: Record<string, "success" | "warning" | "neutral"> = {
  high: "success",
  medium: "warning",
  low: "neutral",
};

function Section({
  icon: Icon,
  label,
  text,
  iconColor,
}: {
  icon: typeof TrendingUp;
  label: string;
  text: string;
  iconColor: string;
}) {
  return (
    <div className="flex gap-3">
      <div className={`mt-0.5 shrink-0 ${iconColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          {label}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {text}
        </p>
      </div>
    </div>
  );
}

export function InsightCard({ insight }: { insight: InsightCardData }) {
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-blue-50 dark:from-violet-950/30 dark:via-zinc-900 dark:to-blue-950/30">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="relative p-5">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-blue-500 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">AI Insight</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {insight.model} · {insight.insight_date}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge tone={REC_TONE[insight.recommendation] ?? "neutral"}>
              {REC_LABEL[insight.recommendation] ?? insight.recommendation}
            </Badge>
            <Badge
              tone={CONFIDENCE_TONE[insight.confidence] ?? "neutral"}
              className="text-[10px]"
            >
              {insight.confidence} confidence
            </Badge>
          </div>
        </header>

        {/* Summary */}
        <p className="mb-5 text-base leading-relaxed text-zinc-800 dark:text-zinc-200">
          {insight.summary}
        </p>

        <div className="space-y-4">
          {insight.why_trending && (
            <Section
              icon={TrendingUp}
              label="Why trending"
              text={insight.why_trending}
              iconColor="text-emerald-500"
            />
          )}
          {insight.technical_value && (
            <Section
              icon={Lightbulb}
              label="Technical value"
              text={insight.technical_value}
              iconColor="text-amber-500"
            />
          )}
          {insight.doscom_use_case && (
            <Section
              icon={Briefcase}
              label="Doscom use case"
              text={insight.doscom_use_case}
              iconColor="text-brand-500"
            />
          )}
          {insight.risk_note && (
            <Section
              icon={AlertTriangle}
              label="Risk note"
              text={insight.risk_note}
              iconColor="text-rose-500"
            />
          )}
        </div>

        {insight.evidence.length > 0 && (
          <details className="mt-5 group">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200">
              📊 Evidence ({insight.evidence.length}) — click để mở
            </summary>
            <ul className="mt-3 space-y-2">
              {insight.evidence.map((e, i) => (
                <li
                  key={i}
                  className="rounded-md border border-zinc-200 bg-white/60 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/60"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <Badge tone="neutral" className="text-[10px]">
                      {e.type}
                    </Badge>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">
                      {e.label}: <span className="font-semibold">{String(e.value)}</span>
                    </span>
                  </div>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                    {e.reason}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Card>
  );
}
