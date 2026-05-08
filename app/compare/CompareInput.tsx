"use client";

import { GitCompare, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { COMPARE_PRESETS } from "@/lib/compare/presets";
import { parseRepos, serializeRepos } from "@/lib/compare/parse-repos";

export function CompareInput({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  function submit(text: string) {
    const { repos, invalid } = parseRepos(text);
    if (repos.length === 0) {
      setError(
        "Không nhận diện được repo nào. Nhập owner/repo hoặc URL GitHub đầy đủ.",
      );
      return;
    }
    setError(
      invalid.length > 0
        ? `Bỏ qua ${invalid.length} mục không hợp lệ: ${invalid
            .slice(0, 3)
            .join(", ")}${invalid.length > 3 ? "…" : ""}`
        : null,
    );
    router.push(`?repos=${encodeURIComponent(serializeRepos(repos))}`);
  }

  function applyPreset(repos: string[]) {
    const text = repos.join(", ");
    setValue(text);
    submit(text);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              submit(value);
            }
          }}
          rows={2}
          placeholder={
            "vercel/next.js, facebook/react\nhttps://github.com/sveltejs/svelte"
          }
          className="min-w-[280px] flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-500"
        />
        <Button onClick={() => submit(value)} className="shrink-0">
          <GitCompare className="h-3.5 w-3.5" />
          Compare
        </Button>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Hỗ trợ: <code>owner/repo</code>, full GitHub URL, comma hoặc xuống
        dòng. Nhấn{" "}
        <kbd className="rounded border border-zinc-300 px-1 py-0.5 text-[10px] dark:border-zinc-700">
          Ctrl/⌘ + Enter
        </kbd>{" "}
        để so sánh.
      </p>
      {error && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{error}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <Sparkles className="h-3 w-3" />
          Presets
        </span>
        {COMPARE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.repos)}
            title={p.description.vi}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-brand-500 dark:hover:bg-brand-950/30 dark:hover:text-brand-300"
          >
            {p.label.vi}
          </button>
        ))}
      </div>
    </div>
  );
}
