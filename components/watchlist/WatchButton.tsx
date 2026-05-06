"use client";

import { Star } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";

export function WatchButton({
  owner,
  repo,
  className = "",
}: {
  owner: string;
  repo: string;
  className?: string;
}) {
  const { isWatched, toggleWatch } = useApp();
  const key = `${owner}/${repo}`;
  const watched = isWatched(key);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWatch(key);
      }}
      className={`shrink-0 rounded-md p-1.5 transition-colors ${
        watched
          ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          : "text-zinc-300 hover:bg-zinc-100 hover:text-amber-500 dark:text-zinc-600 dark:hover:bg-zinc-800"
      } ${className}`}
      aria-label={watched ? "Unpin" : "Pin"}
      title={watched ? "Bỏ pin" : "Pin"}
    >
      <Star className={`h-4 w-4 ${watched ? "fill-current" : ""}`} />
    </button>
  );
}
