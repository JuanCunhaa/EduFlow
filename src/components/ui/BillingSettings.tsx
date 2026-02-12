/**
 * Billing settings section — shows current plan and management controls.
 * No custom billing forms — uses Stripe Customer Portal for all management.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePlan } from '@/hooks/usePlan';
import { PlanBadge } from '@/components/ui/PlanBadge';
import { Link } from '@/i18n/navigation';
import { CreditCard, ExternalLink, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BillingSettings() {
    const t = useTranslations('billing');
    const { plan, isPro, isCanceling, isPastDue, periodEnd, isTrialing, trialEndsAt } = usePlan();
    const [loadingPortal, setLoadingPortal] = useState(false);

    const handleManageSubscription = async () => {
        setLoadingPortal(true);
        try {
            const res = await fetch('/api/billing/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error('Portal error:', err);
        } finally {
            setLoadingPortal(false);
        }
    };

    const formatDate = (epochMs: number) => {
        return new Date(epochMs).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="rounded-2xl border border-border bg-card/50 p-6">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <CreditCard className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Subscription</h3>
                    <div className="mt-0.5">
                        <PlanBadge compact />
                    </div>
                </div>
            </div>

            {/* Status messages */}
            {isPastDue && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <p className="text-sm text-red-400">{t('cta.pastDueNotice')}</p>
                </div>
            )}

            {isCanceling && periodEnd && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <p className="text-sm text-amber-400">
                        {t('cta.canceledNotice', { date: formatDate(periodEnd) })}
                    </p>
                </div>
            )}

            {isTrialing && trialEndsAt && (
                <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <p className="text-sm text-primary">
                        Trial ends {formatDate(trialEndsAt)}
                    </p>
                </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
                {isPro ? (
                    <button
                        onClick={handleManageSubscription}
                        disabled={loadingPortal}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-all hover:bg-accent/30 disabled:opacity-50"
                    >
                        {loadingPortal ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                            <ExternalLink className="h-4 w-4" />
                        )}
                        {t('cta.managePlan')}
                    </button>
                ) : (
                    <Link
                        href="/pricing"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
                    >
                        {t('cta.upgrade')}
                    </Link>
                )}
            </div>
        </div>
    );
}
