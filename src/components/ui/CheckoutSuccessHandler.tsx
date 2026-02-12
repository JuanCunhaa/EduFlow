/**
 * Checkout success handler — detects ?checkout=success and handles the activation flow.
 * Shows a toast, polls billing status, and removes the query param.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePlan } from '@/hooks/usePlan';
import { useToast } from '@/components/ui/Toast';

export function CheckoutSuccessHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const t = useTranslations('billing.checkout');
    const { plan, refresh, isLoading } = usePlan();
    const { addToast } = useToast();
    const handledRef = useRef(false);
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (searchParams.get('checkout') !== 'success') return;
        if (handledRef.current) return;
        handledRef.current = true;

        // Remove query param from URL (replace state, don't push)
        const url = new URL(window.location.href);
        url.searchParams.delete('checkout');
        window.history.replaceState({}, '', url.toString());

        // If plan is already Pro, show success immediately
        if (plan === 'pro' || plan === 'team') {
            addToast(t('success'), 'success');
            return;
        }

        // Show activating toast
        addToast(t('activating'), 'info');

        // Poll billing status every 2s for up to 15s
        let attempts = 0;
        const maxAttempts = 8;

        pollRef.current = setInterval(async () => {
            attempts++;
            await refresh();

            if (attempts >= maxAttempts) {
                if (pollRef.current) clearInterval(pollRef.current);
                addToast(t('activatingDetail'), 'info');
                return;
            }
        }, 2000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Watch for plan change to Pro during polling
    useEffect(() => {
        if ((plan === 'pro' || plan === 'team') && handledRef.current) {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
            addToast(t('success'), 'success');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plan]);

    return null;
}
