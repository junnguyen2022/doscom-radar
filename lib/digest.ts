import type { SnapshotRow } from "./storage";
import { computeHeat } from "./heat";
import { classify } from "./classify";
import { computeBrandFit } from "./brand-fit";
import { BRAND_LIST } from "./config/brand-core";

export type DigestData = {
  capturedAt: string;
  daily: SnapshotRow[];
  weekly: SnapshotRow[];
  monthly: SnapshotRow[];
  movers?: {
    risers: { owner: string; repo: string; from: number; to: number }[];
    fallers: { owner: string; repo: string; from: number; to: number }[];
    newEntries: { owner: string; repo: string; rank: number }[];
  };
};

const BRAND_EMOJI: Record<string, string> = { doscom: "🛡️", noma: "🚗" };

// Brand Spotlight — top repo phù hợp từng thương hiệu trong tập rows cho trước.
function brandSpotlightSection(rows: SnapshotRow[], perBrand = 5): string[] {
  const lines: string[] = [];
  lines.push("## 🎯 Brand Spotlight tuần này");
  lines.push("");
  lines.push(
    "_Repo đáng chú ý cho từng thương hiệu — chấm theo mô tả + ngôn ngữ (chi tiết hơn ở trang repo)._",
  );
  lines.push("");

  // Tính brand fit 1 lần cho mọi row.
  const scored = rows.map((r) => ({
    row: r,
    fits: computeBrandFit({ language: r.language, description: r.description }),
  }));

  let anyMatch = false;
  for (const brand of BRAND_LIST) {
    const matched = scored
      .map((s) => ({
        row: s.row,
        fit: s.fits.find((f) => f.brand === brand.id),
      }))
      .filter((x): x is { row: SnapshotRow; fit: NonNullable<typeof x.fit> } =>
        Boolean(x.fit),
      )
      .sort(
        (a, b) =>
          b.fit.score - a.fit.score ||
          (b.row.stars_gained ?? 0) - (a.row.stars_gained ?? 0),
      )
      .slice(0, perBrand);

    lines.push(`### ${BRAND_EMOJI[brand.id] ?? ""} ${brand.name}`);
    if (matched.length === 0) {
      lines.push(
        "_Tuần này chưa có repo trending khớp rõ — không ép gợi ý._",
      );
      lines.push("");
      continue;
    }
    anyMatch = true;
    for (const m of matched) {
      const tierMark = m.fit.tier === "high" ? "★" : "";
      const total =
        m.row.total_stars != null ? m.row.total_stars.toLocaleString() : "?";
      lines.push(
        `- **[${m.row.owner}/${m.row.repo}](${m.row.url})** ${tierMark} — fit \`${m.fit.score}\` (${m.fit.tier}) · ${total} ★ · \`${m.row.language ?? "—"}\``,
      );
      lines.push(`  - Khớp: ${m.fit.matched.join(", ")}`);
      if (m.row.description) {
        lines.push(`  - ${m.row.description.slice(0, 160)}`);
      }
    }
    lines.push("");
  }

  if (!anyMatch) {
    lines.push(
      "> Không có repo nào khớp DOSCOM/NOMA trong trending tuần này. Bình thường khi trending nghiêng về dev-tools.",
    );
    lines.push("");
  }

  return lines;
}

export function generateMarkdownDigest(data: DigestData): string {
  const lines: string[] = [];

  lines.push(`# GitHub Trending Digest — ${data.capturedAt}`);
  lines.push("");

  // Brand Spotlight lên đầu — ưu tiên dữ liệu weekly (bản tin tuần), fallback daily.
  const brandRows = data.weekly.length > 0 ? data.weekly : data.daily;
  lines.push(...brandSpotlightSection(brandRows));

  const sections: { title: string; rows: SnapshotRow[]; tag: string }[] = [
    { title: "🔥 Top hôm nay (Daily)", rows: data.daily, tag: "today" },
    { title: "📅 Top tuần này (Weekly)", rows: data.weekly, tag: "week" },
    { title: "📆 Top tháng này (Monthly)", rows: data.monthly, tag: "month" },
  ];

  for (const sec of sections) {
    lines.push(`## ${sec.title}`);
    lines.push("");
    if (sec.rows.length === 0) {
      lines.push("_No data._");
      lines.push("");
      continue;
    }
    for (const r of sec.rows.slice(0, 10)) {
      const heat = computeHeat({
        starsGained: r.stars_gained,
        totalStars: r.total_stars,
        rank: r.rank,
      });
      const cls = classify({
        starsGained: r.stars_gained,
        totalStars: r.total_stars,
        language: r.language,
      });
      const lang = r.language ?? "—";
      const gained =
        r.stars_gained != null ? `+${r.stars_gained.toLocaleString()}` : "?";
      const total =
        r.total_stars != null ? r.total_stars.toLocaleString() : "?";
      lines.push(
        `${r.rank}. **[${r.owner}/${r.repo}](${r.url})** — \`${lang}\` · ${gained} ★ today · ${total} total · heat \`${heat}\` · _${cls}_`,
      );
      if (r.description) {
        lines.push(`   > ${r.description.slice(0, 200)}`);
      }
    }
    lines.push("");
  }

  if (data.movers) {
    lines.push("## 📊 Movers vs hôm qua");
    lines.push("");

    if (data.movers.risers.length) {
      lines.push("### ▲ Risers");
      for (const m of data.movers.risers.slice(0, 5)) {
        lines.push(`- **${m.owner}/${m.repo}**: #${m.from} → #${m.to}`);
      }
      lines.push("");
    }

    if (data.movers.newEntries.length) {
      lines.push("### 🆕 New entries");
      for (const m of data.movers.newEntries.slice(0, 5)) {
        lines.push(`- **${m.owner}/${m.repo}** at #${m.rank}`);
      }
      lines.push("");
    }

    if (data.movers.fallers.length) {
      lines.push("### ▼ Fallers");
      for (const m of data.movers.fallers.slice(0, 5)) {
        lines.push(`- **${m.owner}/${m.repo}**: #${m.from} → #${m.to}`);
      }
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("");
  lines.push("_Generated by Agent Radar — github.com/trending snapshot_");
  return lines.join("\n");
}
