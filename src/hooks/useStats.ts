import useSWR from 'swr';
import type { UserStats } from '@/types';
import { fetcher } from '@/lib/fetcher';

export function useStats() {
    const { data, error, isLoading, mutate } = useSWR<UserStats>(
        '/api/stats',
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 60_000 }
    );

    return {
        stats: data || null,
        isLoading,
        error,
        refresh: () => mutate(),
    };
}

export async function updateGoals(goals: { dailyGoal?: number; weeklyGoal?: number }): Promise<void> {
    const res = await fetch('/api/stats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goals),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update goals');
    }
}
