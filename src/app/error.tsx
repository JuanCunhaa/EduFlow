'use client';

import { Shell } from '@/components/layout/Shell';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <Shell>
            <div className="flex flex-col items-center gap-4 py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                    <span className="text-2xl">⚠</span>
                </div>
                <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                    {error.message || 'An unexpected error occurred. Please try again.'}
                </p>
                <button
                    onClick={reset}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                    Try Again
                </button>
            </div>
        </Shell>
    );
}
