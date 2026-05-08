import { Skeleton } from "@/components/ui/Skeleton";

export default function RepoDetailLoading() {
  return (
    <main>
      <Skeleton className="h-3 w-24" />

      {/* Hero */}
      <section className="mb-8 mt-3 space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-3 w-3/4" />
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-full" />
          ))}
        </div>
      </section>

      {/* Stat cards */}
      <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </section>

      {/* Score / insight */}
      <section className="mb-8 space-y-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </section>

      {/* Profile + similar */}
      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </section>
    </main>
  );
}
