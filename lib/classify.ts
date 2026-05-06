// Auto-classify a repo into adopt / monitor / caution.
// Used for the "tech-radar style" classification badge.

export type Classification = "adopt" | "monitor" | "caution";

export function classify(input: {
  starsGained: number | null;
  totalStars: number | null;
  language: string | null;
}): Classification {
  const gained = input.starsGained ?? 0;
  const total = input.totalStars ?? 0;

  // Adopt: established + currently active
  // - >= 10k total stars (signal of community endorsement)
  // - >= 50 stars/day (still active, not stagnant)
  if (total >= 10_000 && gained >= 50) return "adopt";

  // Caution: viral spike but tiny base — likely fad or recently published
  // - gained > total * 0.5 (more than half of all stars came TODAY)
  // - or no language detected
  if (total > 0 && gained / total > 0.5) return "caution";
  if (!input.language) return "caution";

  // Otherwise — worth monitoring (growing but not yet critical)
  return "monitor";
}

export const CLASS_LABEL: Record<Classification, { vi: string; en: string }> = {
  adopt: { vi: "Có thể adopt", en: "Adopt" },
  monitor: { vi: "Đáng theo dõi", en: "Monitor" },
  caution: { vi: "Cẩn trọng", en: "Caution" },
};

export const CLASS_COLOR: Record<Classification, string> = {
  adopt:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  monitor:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  caution: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};
