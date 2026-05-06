import { allRowsForLatestDate } from "@/lib/storage";
import { placeOnRadar, type RadarPoint } from "@/lib/radar";
import { TechRadar } from "@/components/radar/TechRadar";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Radar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const [daily, weekly, monthly] = await Promise.all([
    allRowsForLatestDate("daily"),
    allRowsForLatestDate("weekly"),
    allRowsForLatestDate("monthly"),
  ]);

  const seen = new Set<string>();
  const points: RadarPoint[] = [];

  for (const r of [...monthly.rows, ...weekly.rows, ...daily.rows]) {
    const key = `${r.owner}/${r.repo}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push(
      placeOnRadar({
        owner: r.owner,
        repo: r.repo,
        url: r.url,
        language: r.language,
        description: r.description,
        totalStars: r.total_stars,
        starsGained: r.stars_gained,
        rank: r.rank,
      }),
    );
  }

  return (
    <main>
      <PageHeader
        eyebrow="Tech Radar"
        title="Tech Radar"
        description="Phân loại repos theo quadrant (Languages/Tools/Platforms/Techniques) × ring (Adopt/Trial/Assess/Hold). Heuristic dựa trên ngôn ngữ + keyword."
      />

      {points.length === 0 ? (
        <EmptyState
          icon={Radar}
          title="Chưa có data"
          description="Vào /settings để chạy snapshot."
        />
      ) : (
        <Card className="p-6">
          <TechRadar points={points} />
        </Card>
      )}

      <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
        Tổng: {points.length} repos · daily: {daily.rows.length}, weekly:{" "}
        {weekly.rows.length}, monthly: {monthly.rows.length} (sau khi dedupe).
      </p>
    </main>
  );
}
