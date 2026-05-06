"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { runSnapshotAction } from "@/lib/actions";

export function SettingsClient() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  function trigger() {
    setResult(null);
    startTransition(async () => {
      const r = await runSnapshotAction();
      setResult({ ok: r.ok, message: r.message });
      if (r.ok) router.refresh();
    });
  }

  return (
    <Card className="p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider">
        Manual snapshot
      </h2>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Trigger scrape ngay lập tức (không đợi cron). Hữu ích để refresh data
        sau khi GitHub trending đã đổi.
      </p>
      <Button onClick={trigger} disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang chạy...
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5" />
            Chạy snapshot ngay
          </>
        )}
      </Button>
      {result && (
        <div
          className={`mt-3 flex items-start gap-2 rounded-lg p-3 text-sm ${
            result.ok
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{result.message}</span>
        </div>
      )}
    </Card>
  );
}
