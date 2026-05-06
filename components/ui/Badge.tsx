import type { ReactNode } from "react";

type Tone =
  | "default"
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "hot";

const TONE: Record<Tone, string> = {
  default: "", // styling via className
  neutral:
    "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
  brand:
    "bg-brand-100 text-brand-800 ring-1 ring-inset ring-brand-200 dark:bg-brand-950/40 dark:text-brand-300 dark:ring-brand-900/50",
  success:
    "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50",
  warning:
    "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50",
  danger:
    "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/50",
  hot: "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm",
};

export function Badge({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
