// V2.5 §24.6 — rule-based RecommendationCard.
// Composes existing scoring + Doscom matches into a clear "what should we do?" card.

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  CheckCircle2,
  Beaker,
  Eye,
  AlertTriangle,
  XCircle,
  Sparkles,
  Building2,
} from "lucide-react";
import type { DoscomMatch } from "@/lib/doscom-usecases";

export type RecommendationAction =
  | "adopt"
  | "test"
  | "follow"
  | "caution"
  | "ignore";

const ACTION_META: Record<
  RecommendationAction,
  {
    icon: typeof CheckCircle2;
    label: string;
    tone: "success" | "brand" | "warning" | "danger" | "neutral";
    nextStep: string;
  }
> = {
  adopt: {
    icon: CheckCircle2,
    label: "Adopt",
    tone: "success",
    nextStep:
      "Lập kế hoạch triển khai pilot trong 1 team. Phân công owner kỹ thuật + thời hạn 4 tuần.",
  },
  test: {
    icon: Beaker,
    label: "Test",
    tone: "brand",
    nextStep:
      "Dựng POC nhỏ (1-2 tuần) trên use-case nội bộ. Đánh giá tích hợp + chi phí trước khi scale.",
  },
  follow: {
    icon: Eye,
    label: "Follow",
    tone: "warning",
    nextStep:
      "Thêm vào watchlist + đặt next_review_at sau 30 ngày. Theo dõi release / community.",
  },
  caution: {
    icon: AlertTriangle,
    label: "Caution",
    tone: "danger",
    nextStep:
      "Chưa nên dùng cho production. Ghi nhận risk flags và cân nhắc lựa chọn thay thế.",
  },
  ignore: {
    icon: XCircle,
    label: "Ignore",
    tone: "neutral",
    nextStep: "Không phù hợp Doscom hiện tại. Bỏ qua trừ khi chiến lược thay đổi.",
  },
};

export function getRecommendedAction(
  radarScore: number | null,
  riskScore: number | null,
  relevanceScore: number | null,
  maintenanceScore: number | null,
): RecommendationAction {
  const radar = radarScore ?? 0;
  const risk = riskScore ?? 0;
  const rel = relevanceScore ?? 0;
  const maint = maintenanceScore ?? 0;

  if (radar >= 80 && risk <= 25 && rel >= 70 && maint >= 60) return "adopt";
  if (radar >= 65 && risk <= 40 && rel >= 60) return "test";
  if (radar >= 50 || rel >= 50) return "follow";
  if (risk >= 60) return "caution";
  return "ignore";
}

export type RecommendationCardData = {
  action: RecommendationAction;
  reason: string;
  ownerSuggestion?: string; // who should pick it up at Doscom
  confidence: "high" | "medium" | "low";
  missingData: string[];
  doscomMatches: DoscomMatch[];
  scoreSnapshot: {
    radar: number | null;
    risk: number | null;
    relevance: number | null;
    maintenance: number | null;
  };
};

export function buildRecommendation(args: {
  radar: number | null;
  risk: number | null;
  relevance: number | null;
  maintenance: number | null;
  doscomMatches: DoscomMatch[];
  readmeConfidence: "high" | "medium" | "low";
  readmeMissingData: string[];
  language: string | null;
  archived?: boolean;
  hasLicense?: boolean;
}): RecommendationCardData {
  const action = getRecommendedAction(
    args.radar,
    args.risk,
    args.relevance,
    args.maintenance,
  );

  const reasons: string[] = [];
  if (args.radar != null) reasons.push(`Radar ${args.radar}/100`);
  if (args.risk != null) reasons.push(`risk ${args.risk}`);
  if (args.relevance != null) reasons.push(`relevance ${args.relevance}`);
  if (args.maintenance != null) reasons.push(`maintenance ${args.maintenance}`);
  if (args.archived) reasons.push("repo đã archived");
  if (args.hasLicense === false) reasons.push("thiếu license rõ ràng");

  let ownerSuggestion: string | undefined;
  if (args.doscomMatches.length > 0) {
    const top = args.doscomMatches[0];
    ownerSuggestion = `Đề xuất giao team ${top.department} thử nghiệm.`;
  }

  // Confidence: lower of score-confidence (proxy via missing data) + readme confidence.
  let confidence: "high" | "medium" | "low" = args.readmeConfidence;
  const scoreMissing = [
    args.radar == null && "radar",
    args.risk == null && "risk",
    args.relevance == null && "relevance",
    args.maintenance == null && "maintenance",
  ].filter(Boolean) as string[];
  if (scoreMissing.length >= 2) confidence = "low";
  else if (scoreMissing.length === 1 && confidence === "high")
    confidence = "medium";

  return {
    action,
    reason: reasons.join(" · ") || "Chưa có đủ dữ liệu để đưa ra lý do.",
    ownerSuggestion,
    confidence,
    missingData: [...args.readmeMissingData, ...scoreMissing],
    doscomMatches: args.doscomMatches,
    scoreSnapshot: {
      radar: args.radar,
      risk: args.risk,
      relevance: args.relevance,
      maintenance: args.maintenance,
    },
  };
}

export function RecommendationCard({ data }: { data: RecommendationCardData }) {
  const meta = ACTION_META[data.action];
  const Icon = meta.icon;

  return (
    <Card className="relative overflow-hidden border-l-4 border-l-brand-500 p-5">
      <div className="absolute right-3 top-3">
        <Badge tone={meta.tone} className="text-[10px] uppercase">
          {meta.label}
        </Badge>
      </div>

      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
        <Sparkles className="h-4 w-4 text-brand-500" />
        Khuyến nghị cho Doscom
      </h2>

      <div className="mt-3 flex items-start gap-3">
        <div className="rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Action: {meta.label}
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium">Lý do:</span> {data.reason}
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium">Bước tiếp theo:</span>{" "}
            {meta.nextStep}
          </p>
          {data.ownerSuggestion && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
              <Building2 className="h-3.5 w-3.5 text-zinc-500" />
              {data.ownerSuggestion}
            </p>
          )}
        </div>
      </div>

      {data.doscomMatches.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {data.doscomMatches.slice(0, 4).map((m, i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/40"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-400">
                {m.department}
              </div>
              <ul className="mt-1 space-y-0.5 text-xs text-zinc-700 dark:text-zinc-300">
                {m.useCases.slice(0, 3).map((u, j) => (
                  <li key={j}>• {u}</li>
                ))}
              </ul>
              {m.matchedSignals.length > 0 && (
                <p className="mt-1 truncate text-[10px] font-mono text-zinc-400">
                  matched: {m.matchedSignals.join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <span>Confidence:</span>
          <Badge
            tone={
              data.confidence === "high"
                ? "success"
                : data.confidence === "medium"
                  ? "warning"
                  : "danger"
            }
            className="text-[10px] uppercase"
          >
            {data.confidence}
          </Badge>
        </div>
        {data.missingData.length > 0 && (
          <span className="truncate">
            Missing data: {data.missingData.join(", ")}
          </span>
        )}
      </div>
    </Card>
  );
}
