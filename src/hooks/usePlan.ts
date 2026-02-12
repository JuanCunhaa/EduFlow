/**
 * Client-side hook for billing status.
 * Uses SWR to cache and revalidate billing state.
 * All client-side plan gating flows through this hook.
 */

'use client';

import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { BillingStatus, PlanTier } from '@/types';

interface UsePlanReturn {
    /** The user's effective plan */
    plan: PlanTier;
    /** Whether the user has Pro or Team access */
    isPro: boolean;
    /** Whether the user is on a trial */
    isTrialing: boolean;
    /** Whether the subscription is set to cancel at period end */
    isCanceling: boolean;
    /** Whether there's a payment issue */
    isPastDue: boolean;
    /** Epoch ms — current period end date */
    periodEnd: number | null;
    /** Epoch ms — trial end date */
    trialEndsAt: number | null;
    /** Loading state */
    isLoading: boolean;
    /** Error state */
    error: Error | undefined;
    /** Force refresh billing status */
    refresh: () => Promise<void>;
}

export function usePlan(): UsePlanReturn {
    const { data, error, isLoading } = useSWR<BillingStatus>(
        '/api/billing/status',
        fetcher,
        {
            revalidateOnFocus: true,
            dedupingInterval: 60_000,      // Dedupe within 60s
            revalidateOnReconnect: true,
        }
    );

    const plan = data?.plan ?? 'free';

    return {
        plan,
        isPro: plan === 'pro' || plan === 'team',
        isTrialing: data?.status === 'trialing',
        isCanceling: data?.cancelAtPeriodEnd ?? false,
        isPastDue: data?.status === 'past_due',
        periodEnd: data?.periodEnd ?? null,
        trialEndsAt: data?.trialEndsAt ?? null,
        isLoading,
        error,
        refresh: async () => {
            await mutate('/api/billing/status');
        },
    };
}
