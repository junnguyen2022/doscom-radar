import { TrendingUp, Activity, Users, Wrench, Target, Shield, Flame } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export type ScoreData = {
  radar_score: number;
  heat_score: number;
  growth_score: number;
  activity_score: number;
  community_score: number;
  maintenance_score: number;
  relevance_score: number;
  risk_penalty: number;
  recommendation: string;
  confidence: string;
  risk_flags: string[];
  relevance_tier: string;
  score_reason: string | null;
};

const REC_LABEL: Record<string, { label: string; tone: "success" | "warning" | "danger" | "brand" | "neutral" }> = {
  adopt: { label: "Adopt", tone: "success" },
  test: { label: "Test", tone: "brand" },
  follow: { label: "Follow", tone: "warning" },
  caution: { label: "Caution", tone: "danger" },
  ignore: { label: "Ignore", tone: "neutral" },
};

function ScoreBar({
  label,
  value,
  icon: Icon,
  weight,
  color,
}: {
  label: string;
  value: number;
  icon: typeof Flame;
  weight?: string;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
          <Icon className="h-3.5 w-3.5" />
          {label}
          {weight && (
            <span className="text-[10px] text-zinc-400">{weight}</span>
          )}
        </span>
        <span className="font-mono font-bold tabular-nums">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.max(2, value)}%` }}
        />
      </div>
    </div>
  );
}

export function ScoreBreakdown({ score }: { score: ScoreData }) {
  const rec = REC_LABEL[score.recommendation] ?? REC_LABEL.follow;

  return (
    <Card className="p-5">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Radar Score</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Composite 0..100. Confidence: {score.confidence}.
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl font-bold tabular-nums text-brand-600 dark:text-brand-400">
            {score.radar_score}
          </div>
          <Badge tone={rec.tone} className="mt-1">
            {rec.label}
          </Badge>
        </div>
      </header>

      <div className="space-y-3">
        <ScoreBar
          label="Growth"
          value={score.growth_score}
          icon={TrendingUp}
          weight="25%"
          color="bg-emerald-500"
        />
        <ScoreBar
          label="Activity"
          value={score.activity_score}
          icon={Activity}
          weight="20%"
          color="bg-blue-500"
        />
        <ScoreBar
          label="Community"
          value={score.community_score}
          icon={Users}
          weight="20%"
          color="bg-violet-500"
        />
        <ScoreBar
          label="Maintenance"
          value={score.maintenance_score}
          icon={Wrench}
          weight="15%"
          color="bg-amber-500"
        />
        <ScoreBar
          label="Relevance (Doscom)"
          value={score.relevance_score}
          icon={Target}
          weight="20%"
          color="bg-orange-500"
        />
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <ScoreBar
            label="Risk penalty"
            value={score.risk_penalty}
            icon={Shield}
            color="bg-rose-500"
          />
        </div>
      </div>

      {score.risk_flags.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Risk flags:
          </span>
          {score.risk_flags.map((f) => (
            <Badge key={f} tone="danger" className="text-[10px]">
              {f}
            </Badge>
          ))}
        </div>
      )}

      {score.score_reason && (
        <p className="mt-4 rounded-md bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400">
          💡 {score.score_reason}
        </p>
      )}
    </Card>
  );
}
