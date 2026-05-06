import { lastSnapshotInfo, currentBackend } from "@/lib/storage";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { SettingsClient } from "./SettingsClient";
import {
  Database,
  CalendarClock,
  Zap,
  Server,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

function nextCronUTC(): string {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(1, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

export default async function SettingsPage() {
  const info = await lastSnapshotInfo();
  const backend = currentBackend();

  const envChecks = [
    { name: "CRON_SECRET", ok: !!process.env.CRON_SECRET },
    {
      name: "NEXT_PUBLIC_SUPABASE_URL",
      ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
    {
      name: "SUPABASE_SERVICE_ROLE_KEY",
      ok: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    {
      name: "ANTHROPIC_API_KEY",
      ok: !!process.env.ANTHROPIC_API_KEY,
      optional: true,
      note: "AI insight",
    },
  ];

  return (
    <main>
      <PageHeader
        eyebrow="Settings"
        title="Cấu hình"
        description="Manual snapshot trigger, backend status, environment health."
      />

      <section className="mb-6 grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard
          label="Backend"
          value={backend}
          accent={backend === "supabase" ? "emerald" : "amber"}
          hint={backend === "file" ? "Local demo only" : "Production-ready"}
          icon={Server}
        />
        <StatCard
          label="Total snapshots"
          value={info.totalRows.toLocaleString()}
          icon={Database}
        />
        <StatCard
          label="Last snapshot"
          value={info.capturedAt ?? "—"}
          icon={CalendarClock}
        />
        <StatCard
          label="Next cron (UTC)"
          value={nextCronUTC().slice(11, 16)}
          hint={nextCronUTC().slice(0, 10)}
          accent="brand"
          icon={Zap}
        />
      </section>

      <SettingsClient />

      <Card className="mt-6 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          Cấu hình môi trường
        </h2>
        <ul className="space-y-2.5">
          {envChecks.map((c) => (
            <li
              key={c.name}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                {c.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : c.optional ? (
                  <XCircle className="h-4 w-4 text-amber-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-500" />
                )}
                <code className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  {c.name}
                </code>
                {c.optional && (
                  <Badge tone="neutral" className="text-[10px]">
                    optional
                  </Badge>
                )}
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {c.ok ? "configured" : c.note ? `missing — ${c.note}` : "missing"}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
