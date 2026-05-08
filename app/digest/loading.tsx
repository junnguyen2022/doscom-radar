import { Skeleton } from "@/components/ui/Skeleton";

export default function DigestLoading() {
  return (
    <main>
      <header className="mb-8 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </header>
      <Skeleton className="h-[480px] w-full" />
    </main>
  );
}
