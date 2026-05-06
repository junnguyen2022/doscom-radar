"use client";

import { GitCompare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CompareInput({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  function submit() {
    const cleaned = value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.includes("/"))
      .join(",");
    if (cleaned) router.push(`?repos=${encodeURIComponent(cleaned)}`);
    else router.push("?");
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="vercel/next.js, facebook/react, sveltejs/svelte"
        className="min-w-[280px] flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-500"
      />
      <Button onClick={submit}>
        <GitCompare className="h-3.5 w-3.5" />
        Compare
      </Button>
    </div>
  );
}
