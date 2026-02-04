import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';

export function DashboardSkeleton() {
  return (
    <div className="h-full overflow-auto bg-[#0a0a0f] p-6">
      <div className="mb-6">
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#1a1a24] rounded-lg border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <Skeleton className="w-12 h-8" />
            </div>
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="bg-[#1a1a24] rounded-lg border border-white/10 p-4 mb-6">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-3 w-full rounded-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
