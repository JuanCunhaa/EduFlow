'use client';

export function SkeletonCard() {
  return (
    <div className="card-premium space-y-4 p-5">
      <div className="flex items-center gap-3">
        <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
        <div className="skeleton-shimmer h-3 w-24 rounded" />
      </div>
      <div className="skeleton-shimmer h-7 w-16 rounded" />
      <div className="skeleton-shimmer h-3 w-32 rounded" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="card-premium overflow-hidden">
      <div className="px-6 py-5">
        <div className="skeleton-shimmer h-4 w-28 rounded" />
      </div>
      <div className="divide-border divide-y">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={`skeleton-row-${i}`}
            className="flex items-center gap-4 px-6 py-3.5"
          >
            <div className="skeleton-shimmer h-3 w-20 rounded" />
            <div className="skeleton-shimmer h-5 w-14 rounded-md" />
            <div className="skeleton-shimmer h-3 w-10 rounded" />
            <div className="skeleton-shimmer ml-auto h-3 w-12 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="animate-stagger space-y-8">
      <div className="space-y-2">
        <div className="skeleton-shimmer h-7 w-32 rounded" />
        <div className="skeleton-shimmer h-4 w-56 rounded" />
      </div>
      <div className="animate-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={`skeleton-card-${i}`} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonTable />
        <SkeletonTable />
      </div>
    </div>
  );
}
