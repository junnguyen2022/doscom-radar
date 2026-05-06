import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  hoverable = false,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  as?: "div" | "article" | "section";
}) {
  return (
    <Tag
      className={`rounded-xl border border-zinc-200 bg-white shadow-soft dark:border-zinc-800 dark:bg-zinc-900 ${
        hoverable
          ? "transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lift dark:hover:border-zinc-700"
          : ""
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
