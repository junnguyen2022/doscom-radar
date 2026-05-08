// V2.5 §24 — RepoIntelligenceProfile renders the README-derived profile +
// Doscom use case mapping in a compact 9-section block (overview, problem,
// features, use cases, install, usage, docs, missing-data note).

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BookOpen, Lightbulb, Zap, Target, Wrench, Code2, Link2 } from "lucide-react";
import type { ReadmeProfile } from "@/lib/readme-extractor";
import type { DoscomMatch } from "@/lib/doscom-usecases";

export function RepoIntelligenceProfile({
  profile,
  doscomMatches,
  fetched,
}: {
  profile: ReadmeProfile | null;
  doscomMatches: DoscomMatch[];
  fetched: boolean;
}) {
  if (!fetched) {
    return (
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          <BookOpen className="h-4 w-4 text-brand-500" />
          Repo Intelligence Profile
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Không lấy được README (rate-limit hoặc repo private).
        </p>
      </Card>
    );
  }
  if (!profile) {
    return (
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          <BookOpen className="h-4 w-4 text-brand-500" />
          Repo Intelligence Profile
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          README chưa parse được nội dung có cấu trúc.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          <BookOpen className="h-4 w-4 text-brand-500" />
          Repo Intelligence Profile
        </h2>
        <Badge
          tone={
            profile.confidence === "high"
              ? "success"
              : profile.confidence === "medium"
                ? "warning"
                : "danger"
          }
          className="text-[10px] uppercase"
        >
          confidence: {profile.confidence}
        </Badge>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section icon={Lightbulb} title="Overview">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {profile.overview}
          </p>
          {profile.problemSolved && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold">Problem solved: </span>
              {profile.problemSolved}
            </p>
          )}
        </Section>

        <Section icon={Zap} title="Key features">
          {profile.keyFeatures.length > 0 ? (
            <ul className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
              {profile.keyFeatures.map((f, i) => (
                <li key={i}>• {f}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-400">Không tìm thấy danh sách features.</p>
          )}
        </Section>

        <Section icon={Target} title="Common use cases">
          {profile.commonUseCases.length > 0 ? (
            <ul className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
              {profile.commonUseCases.map((u, i) => (
                <li key={i}>• {u}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-400">README không liệt kê use cases.</p>
          )}
        </Section>

        <Section icon={Wrench} title="Doscom mapping">
          {doscomMatches.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {doscomMatches.map((m, i) => (
                <li key={i}>
                  <span className="rounded bg-brand-50 px-1.5 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                    {m.department}
                  </span>
                  <ul className="mt-1 space-y-0.5 pl-3 text-xs text-zinc-600 dark:text-zinc-400">
                    {m.useCases.slice(0, 3).map((u, j) => (
                      <li key={j}>– {u}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-400">
              Không khớp use case rõ ràng với phòng ban Doscom.
            </p>
          )}
        </Section>

        {profile.installation && (
          <Section icon={Code2} title="Installation">
            <pre className="overflow-x-auto rounded-md bg-zinc-900 p-3 text-xs text-zinc-100 dark:bg-zinc-950">
              {profile.installation}
            </pre>
          </Section>
        )}

        {profile.usage && (
          <Section icon={Code2} title="Usage">
            <pre className="overflow-x-auto rounded-md bg-zinc-900 p-3 text-xs text-zinc-100 dark:bg-zinc-950">
              {profile.usage}
            </pre>
          </Section>
        )}

        {profile.docsLinks.length > 0 && (
          <Section icon={Link2} title="Docs">
            <ul className="space-y-0.5 text-sm">
              {profile.docsLinks.map((l, i) => (
                <li key={i}>
                  <a
                    href={l}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-brand-600 hover:underline dark:text-brand-400"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {profile.missingData.length > 0 && (
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          ⚠ README thiếu các phần: {profile.missingData.join(", ")} — rút gọn
          recommendation cho phù hợp.
        </p>
      )}
    </Card>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof BookOpen;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h3>
      {children}
    </section>
  );
}
