import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="loading-layout" aria-busy="true" aria-label="Loading your household">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-40 w-full" />
      <div className="stats-grid">
        {[1, 2, 3, 4].map((n) => (
          <Skeleton key={n} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
