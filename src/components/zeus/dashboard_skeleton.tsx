import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Team Header Skeleton */}
      <Skeleton className="h-[200px] w-full rounded-xl" />

      {/* Top Section Grid Skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-4">
        <Skeleton className="h-[450px] rounded-xl" />
        <Skeleton className="h-[450px] rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[180px] rounded-xl" />
          <Skeleton className="h-[250px] rounded-xl" />
        </div>
      </div>

      {/* Bottom Section Skeleton */}
      <div className="mt-4">
        <Skeleton className="h-6 w-32 mb-3" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    </div>
  );
}
