import { Skeleton } from "@/components/ui/Skeleton";

export default function AiNewsLoading() {
  return (
    <main>
      <header className="mb-8 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </header>

      <div className="space-y-8">
        {[0, 1, 2, 3, 4].map((block) => (
          <section key={block}>
            <Skeleton className="mb-3 h-5 w-48" />
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
