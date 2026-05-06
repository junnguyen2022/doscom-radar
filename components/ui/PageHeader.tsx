import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  meta,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="flex-1">
        {eyebrow && (
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
            {description}
          </p>
        )}
        {meta && <div className="mt-2">{meta}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
