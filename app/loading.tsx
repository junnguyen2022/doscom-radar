// Route-transition skeleton for / (home).
// Shown while the dashboard re-renders after navigation; replaced as soon as
// the server sends streamed RSC chunks.

import { Skeleton } from "@/components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <main>
      {/* Hero */}
      <section className="mb-8 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </section>

      {/* AI Insight + Movers */}
      <section className="mb-12 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </section>

      {/* Test candidates / risk popular cards */}
      <section className="mb-12 grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </section>

      {/* Trending table */}
      <section className="mb-12 space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-72" />
      </section>
    </main>
  );
}
