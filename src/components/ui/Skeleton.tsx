'use client';

export function SkeletonCard() {
    return (
        <div className="card-premium p-5 space-y-4">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg skeleton-shimmer" />
                <div className="h-3 w-24 rounded skeleton-shimmer" />
            </div>
            <div className="h-7 w-16 rounded skeleton-shimmer" />
            <div className="h-3 w-32 rounded skeleton-shimmer" />
        </div>
    );
}

export function SkeletonTable() {
    return (
        <div className="card-premium overflow-hidden">
            <div className="px-6 py-5">
                <div className="h-4 w-28 rounded skeleton-shimmer" />
            </div>
            <div className="divide-y divide-border">
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={`skeleton-row-${i}`} className="flex items-center gap-4 px-6 py-3.5">
                        <div className="h-3 w-20 rounded skeleton-shimmer" />
                        <div className="h-5 w-14 rounded-md skeleton-shimmer" />
                        <div className="h-3 w-10 rounded skeleton-shimmer" />
                        <div className="ml-auto h-3 w-12 rounded skeleton-shimmer" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SkeletonDashboard() {
    return (
        <div className="space-y-8 animate-stagger">
            <div className="space-y-2">
                <div className="h-7 w-32 rounded skeleton-shimmer" />
                <div className="h-4 w-56 rounded skeleton-shimmer" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-stagger">
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
