import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "./Card";

const ACCENT = {
  default: {
    text: "text-zinc-900 dark:text-zinc-100",
    icon: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
  brand: {
    text: "text-brand-700 dark:text-brand-400",
    icon: "bg-brand-100 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400",
  },
  emerald: {
    text: "text-emerald-700 dark:text-emerald-400",
    icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  amber: {
    text: "text-amber-700 dark:text-amber-400",
    icon: "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  },
  rose: {
    text: "text-rose-700 dark:text-rose-400",
    icon: "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
  },
  blue: {
    text: "text-blue-700 dark:text-blue-400",
    icon: "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
  },
} as const;

export type StatAccent = keyof typeof ACCENT;

export function StatCard({
  label,
  value,
  hint,
  accent = "default",
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: StatAccent;
  icon?: LucideIcon;
}) {
  const a = ACCENT[accent];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {label}
          </div>
          <div
            className={`mt-1 truncate text-2xl font-bold tabular-nums tracking-tight ${a.text}`}
          >
            {value}
          </div>
          {hint && (
            <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
              {hint}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`shrink-0 rounded-lg p-2 ${a.icon}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </Card>
  );
}
