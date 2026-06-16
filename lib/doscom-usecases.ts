// Map repo signals → brand (DOSCOM / NOMA / Holdings) + suggested use cases.
// Rule-based, Vietnamese labels. Inputs: topics, language, README text/keywords.
// Brand taxonomy: lib/config/brand-core.ts (single source).

import { BRANDS, HOLDINGS_SHARED_HIGH, type BrandId } from "./config/brand-core";
import { computeBrandFit } from "./brand-fit";

export type DoscomMatch = {
  // "doscom" | "noma" | "holdings" — holdings = AI/automation backbone dùng chung.
  brand: BrandId | "holdings";
  brandName: string;
  department: string;
  useCases: string[];
  matchedSignals: string[];
};

function buildHaystack(input: {
  topics?: string[];
  language?: string | null;
  description?: string | null;
  readmeOverview?: string;
  readmeFeatures?: string[];
}): string {
  return [
    ...(input.topics ?? []),
    input.language ?? "",
    input.description ?? "",
    input.readmeOverview ?? "",
    ...(input.readmeFeatures ?? []),
  ]
    .join(" \n ")
    .toLowerCase();
}

export function mapDoscomUseCases(input: {
  topics?: string[];
  language?: string | null;
  description?: string | null;
  readmeOverview?: string;
  readmeFeatures?: string[];
}): DoscomMatch[] {
  const matches: DoscomMatch[] = [];

  // Dùng CHUNG quy tắc qualification với brand-fit (≥1 core hoặc ≥2 supporting)
  // để chip /trending và use-case /repo luôn nhất quán.
  const fits = computeBrandFit({
    topics: input.topics,
    language: input.language,
    description: [input.description, input.readmeOverview]
      .filter(Boolean)
      .join(" "),
  });

  for (const fit of fits) {
    const brand = BRANDS[fit.brand];
    for (const uc of brand.useCases) {
      matches.push({
        brand: brand.id,
        brandName: brand.name,
        department: `${brand.name} · ${uc.department}`,
        useCases: uc.cases,
        matchedSignals: fit.matched.slice(0, 5),
      });
    }
  }

  // Holdings backbone — AI/automation dùng chung, chỉ thêm khi CHƯA khớp brand nào
  // (tránh nhiễu khi repo đã rõ thuộc DOSCOM/NOMA).
  if (matches.length === 0) {
    const hay = buildHaystack(input);
    const sharedHits = HOLDINGS_SHARED_HIGH.filter((k) => hay.includes(k));
    if (sharedHits.length > 0) {
      matches.push({
        brand: "holdings",
        brandName: "Holdings",
        department: "Holdings · Vận hành nội bộ",
        useCases: [
          "Tự động hoá quy trình nội bộ (HR, kế toán, vận hành)",
          "Trợ lý nội bộ / pipeline review cho team kỹ thuật",
          "Dashboard điều hành KPI",
        ],
        matchedSignals: sharedHits.slice(0, 5),
      });
    }
  }

  return matches;
}
