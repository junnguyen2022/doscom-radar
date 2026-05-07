"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  Beaker,
  ThumbsUp,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useApp } from "@/components/providers/AppProvider";

type Decision = "follow" | "review" | "test" | "adopt" | "ignore" | "caution";

const DECISIONS: {
  key: Decision;
  label: string;
  desc: string;
  icon: typeof Eye;
  tone: "warning" | "neutral" | "brand" | "success" | "danger";
}[] = [
  { key: "follow", label: "Follow", desc: "Đáng theo dõi, đặt review later", icon: Eye, tone: "warning" },
  { key: "review", label: "Review", desc: "Cần đánh giá sâu", icon: CheckCircle2, tone: "neutral" },
  { key: "test", label: "Test", desc: "Đưa vào test plan", icon: Beaker, tone: "brand" },
  { key: "adopt", label: "Adopt", desc: "Có thể dùng chính thức", icon: ThumbsUp, tone: "success" },
  { key: "caution", label: "Caution", desc: "Tốt nhưng có rủi ro", icon: AlertTriangle, tone: "danger" },
  { key: "ignore", label: "Ignore", desc: "Bỏ qua, không phù hợp", icon: XCircle, tone: "neutral" },
];

export function DecisionPanel({
  owner,
  repo,
  currentDecision,
}: {
  owner: string;
  repo: string;
  currentDecision: Decision | null;
}) {
  const { user } = useApp();
  const router = useRouter();
  const [selected, setSelected] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [testPlan, setTestPlan] = useState("");
  const [riskNote, setRiskNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <Card className="p-5">
        <h2 className="mb-2 text-lg font-semibold">Decision actions</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Đăng nhập để mark repo là Follow / Test / Adopt / Ignore và tracking
          decision history.
        </p>
        <a
          href={`/login?next=${encodeURIComponent(`/repo/${owner}/${repo}`)}`}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Sign in with GitHub
        </a>
      </Card>
    );
  }

  async function submit() {
    if (!selected) return;
    if (reason.trim().length < 5) {
      setError("Reason cần ít nhất 5 ký tự.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo,
          decision: selected,
          decision_reason: reason,
          test_plan: testPlan || undefined,
          risk_note: riskNote || undefined,
          due_date: dueDate || undefined,
        }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `HTTP ${res.status}`);
        return;
      }

      // Success — clear form, refresh page to show new history
      setSelected(null);
      setReason("");
      setTestPlan("");
      setRiskNote("");
      setDueDate("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Decision actions</h2>
        {currentDecision && (
          <Badge tone="brand">Current: {currentDecision}</Badge>
        )}
      </header>

      <div className="grid gap-2 grid-cols-3 sm:grid-cols-6">
        {DECISIONS.map((d) => {
          const Icon = d.icon;
          const isSelected = selected === d.key;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setSelected(d.key)}
              title={d.desc}
              className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-2.5 text-xs transition-all ${
                isSelected
                  ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500 dark:border-brand-400 dark:bg-brand-950/30 dark:text-brand-300"
                  : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{d.label}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-4 space-y-3 animate-fade-in">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Vì sao chọn quyết định này? (ít nhất 5 ký tự)"
              rows={2}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          {(selected === "test" || selected === "review") && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Test plan / Review notes
                </label>
                <textarea
                  value={testPlan}
                  onChange={(e) => setTestPlan(e.target.value)}
                  placeholder="Mục tiêu test, criteria pass/fail, owner..."
                  rows={2}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Due date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            </>
          )}

          {(selected === "caution" || selected === "test" || selected === "adopt") && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Risk note
              </label>
              <textarea
                value={riskNote}
                onChange={(e) => setRiskNote(e.target.value)}
                placeholder="Rủi ro pháp lý, kỹ thuật, maintain..."
                rows={2}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={submit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Save decision
            </Button>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            {error && (
              <span className="text-xs text-rose-600 dark:text-rose-400">
                {error}
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
