import { Skeleton } from "@/components/ui/Skeleton";

export default function CompareLoading() {
  return (
    <main>
      <header className="mb-8 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </header>

      {/* Input + presets */}
      <Skeleton className="h-24 w-full" />
      <div className="mt-3 flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>

      {/* Conclusion + table */}
      <Skeleton className="mt-6 h-32 w-full" />
      <Skeleton className="mt-6 h-72 w-full" />
    </main>
  );
}
