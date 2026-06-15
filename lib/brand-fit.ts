// Brand fit — chấm điểm độ phù hợp của 1 repo với TỪNG thương hiệu (DOSCOM / NOMA).
// Khác relevance gộp (lib/scoring/relevance.ts): đây tách riêng per-brand để lọc + hiển thị.
// Taxonomy: lib/config/brand-core.ts.

import { BRAND_LIST, type BrandId } from "./config/brand-core";

export type BrandTier = "high" | "medium" | "low" | "none";

export type BrandFit = {
  brand: BrandId;
  brandName: string;
  score: number; // 0..100
  tier: BrandTier;
  matched: string[];
};

const HIGH_PTS = 30;
const MED_PTS = 15;

// Chuẩn hoá text: gộp về 1 chuỗi, hạ thường, thay mọi ký tự không phải [a-z0-9] bằng
// khoảng trắng, bọc 2 đầu bằng space để match theo RANH GIỚI TỪ.
// Nhờ vậy "computer vision" (mô tả) và "computer-vision" (topic) đều khớp,
// đồng thời tránh false-positive kiểu "patriot" chứa "iot".
export function normalizeHay(parts: (string | null | undefined)[]): string {
  const joined = parts.filter(Boolean).join(" ").toLowerCase();
  return ` ${joined.replace(/[^a-z0-9]+/g, " ").trim()} `;
}

// Trả về các keyword khớp (so theo cụm từ trọn vẹn).
export function keywordHits(normHay: string, keywords: string[]): string[] {
  const out: string[] = [];
  for (const k of keywords) {
    const kw = k.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (kw && normHay.includes(` ${kw} `)) out.push(k);
  }
  return out;
}

function tierOf(score: number): BrandTier {
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  if (score >= 1) return "low";
  return "none";
}

export function computeBrandFit(input: {
  topics?: string[] | null;
  language?: string | null;
  description?: string | null;
  readme?: string | null;
}): BrandFit[] {
  const hay = normalizeHay([
    ...(input.topics ?? []),
    input.language,
    input.description,
    input.readme,
  ]);

  const fits: BrandFit[] = [];
  for (const b of BRAND_LIST) {
    const high = keywordHits(hay, b.techHigh);
    const med = keywordHits(hay, b.techMedium);
    const score = Math.min(100, high.length * HIGH_PTS + med.length * MED_PTS);
    if (score <= 0) continue;
    fits.push({
      brand: b.id,
      brandName: b.name,
      score,
      tier: tierOf(score),
      matched: [...high, ...med].slice(0, 6),
    });
  }
  return fits.sort((a, b) => b.score - a.score);
}
