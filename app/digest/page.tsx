import {
  allRowsForLatestDate,
  distinctDailyDates,
  dailyForDate,
} from "@/lib/storage";
import { computeMovers } from "@/lib/movers";
import { generateMarkdownDigest } from "@/lib/digest";
import { PageHeader } from "@/components/ui/PageHeader";
import { DigestClient } from "./DigestClient";

export const dynamic = "force-dynamic";

export default async function DigestPage() {
  const [{ rows: daily, capturedAt }, { rows: weekly }, { rows: monthly }, dates] =
    await Promise.all([
      allRowsForLatestDate("daily"),
      allRowsForLatestDate("weekly"),
      allRowsForLatestDate("monthly"),
      distinctDailyDates(),
    ]);

  let movers;
  if (dates.length >= 2) {
    const [today, yesterday] = await Promise.all([
      dailyForDate(dates[0]),
      dailyForDate(dates[1]),
    ]);
    const m = computeMovers(today, yesterday);
    movers = {
      risers: m.risers.map((x) => ({
        owner: x.owner,
        repo: x.repo,
        from: x.yesterdayRank ?? 0,
        to: x.todayRank ?? 0,
      })),
      fallers: m.fallers.map((x) => ({
        owner: x.owner,
        repo: x.repo,
        from: x.yesterdayRank ?? 0,
        to: x.todayRank ?? 0,
      })),
      newEntries: m.newEntries.map((x) => ({
        owner: x.owner,
        repo: x.repo,
        rank: x.todayRank ?? 0,
      })),
    };
  }

  const md = generateMarkdownDigest({
    capturedAt: capturedAt ?? "—",
    daily,
    weekly,
    monthly,
    movers,
  });

  return (
    <main>
      <PageHeader
        eyebrow="Digest"
        title="Bản tin Markdown"
        description="Mở đầu bằng Brand Spotlight (DOSCOM/NOMA tuần này). Copy & paste vào Slack / email / blog."
      />
      <DigestClient markdown={md} />
    </main>
  );
}
