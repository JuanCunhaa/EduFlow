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
  const {
    plan,
    isPro,
    isCanceling,
    isPastDue,
    periodEnd,
    isTrialing,
    trialEndsAt,
  } = usePlan();
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
    <div className="border-border bg-card/50 rounded-2xl border p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-xl">
          <CreditCard className="text-primary h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="text-foreground text-sm font-semibold">
            Subscription
          </h3>
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
        <div className="border-primary/20 bg-primary/5 mb-4 rounded-xl border p-3">
          <p className="text-primary text-sm">
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
            className="border-border bg-card text-foreground hover:bg-accent/30 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all disabled:opacity-50"
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
            className="bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/20 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all hover:shadow-lg"
          >
            {t('cta.upgrade')}
          </Link>
        )}
      </div>
    </div>
  );
}
