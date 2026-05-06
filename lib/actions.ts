"use server";

import Anthropic from "@anthropic-ai/sdk";
import { fetchAllTrending } from "./github-trending";
import {
  upsertSnapshots,
  allRowsForLatestDate,
  type SnapshotRow,
} from "./storage";
import { unstable_cache } from "next/cache";

export async function runSnapshotAction(): Promise<{
  ok: boolean;
  message: string;
  inserted?: number;
}> {
  try {
    const buckets = await fetchAllTrending();
    const today = new Date().toISOString().slice(0, 10);
    const rows: SnapshotRow[] = [];
    for (const [tf, repos] of Object.entries(buckets) as [
      "daily" | "weekly" | "monthly",
      (typeof buckets)["daily"],
    ][]) {
      for (const r of repos) {
        rows.push({
          captured_at: today,
          timeframe: tf,
          rank: r.rank,
          owner: r.owner,
          repo: r.repo,
          language: r.language,
          description: r.description,
          stars_gained: r.starsGained,
          total_stars: r.totalStars,
          url: r.url,
        });
      }
    }
    if (rows.length === 0) {
      return { ok: false, message: "Không parse được repo nào (HTML changed?)" };
    }
    await upsertSnapshots(rows);
    return { ok: true, message: `Đã insert ${rows.length} rows`, inserted: rows.length };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

const generateInsightCached = unstable_cache(
  async (): Promise<string> => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return "_(Chưa cấu hình ANTHROPIC_API_KEY — skip AI insight.)_";
    }

    const { rows: daily } = await allRowsForLatestDate("daily");
    const { rows: weekly } = await allRowsForLatestDate("weekly");
    const { rows: monthly } = await allRowsForLatestDate("monthly");

    if (daily.length === 0) {
      return "_(Chưa có snapshot nào để phân tích.)_";
    }

    const summarize = (rows: SnapshotRow[], n: number) =>
      rows
        .slice(0, n)
        .map(
          (r) =>
            `${r.rank}. ${r.owner}/${r.repo} (${r.language ?? "?"}) — +${r.stars_gained ?? 0} today, ${r.total_stars ?? 0} total. ${r.description ?? ""}`,
        )
        .join("\n");

    const prompt = `Bạn là analyst công nghệ. Dưới đây là top GitHub trending hôm nay.

DAILY (top 10):
${summarize(daily, 10)}

WEEKLY (top 5):
${summarize(weekly, 5)}

MONTHLY (top 5):
${summarize(monthly, 5)}

Viết bằng TIẾNG VIỆT một insight ngắn 5-8 dòng:
1. Trend lớn nhất hôm nay là gì?
2. Pattern đáng chú ý (ngôn ngữ, chủ đề lặp lại)?
3. Repo nào đáng investigate nhất và tại sao?
4. So với weekly/monthly có gì khác biệt?

Đừng liệt kê lại — phải có nhận định, opinion. Concise, không marketing fluff.`;

    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: [
        {
          type: "text",
          text: "Bạn là analyst công nghệ Việt Nam, viết tiếng Việt tự nhiên, súc tích. Không dùng marketing fluff.",
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock && textBlock.type === "text"
      ? textBlock.text
      : "_(Empty response from Claude.)_";
  },
  ["ai-insight"],
  { revalidate: 3600 }, // 1 hour
);

export async function generateInsight(): Promise<string> {
  try {
    return await generateInsightCached();
  } catch (err) {
    return `_(AI insight error: ${err instanceof Error ? err.message : String(err)})_`;
  }
}
