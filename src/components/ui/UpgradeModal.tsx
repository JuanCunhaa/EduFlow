/**
 * Upgrade modal — shown when a free user hits a paywall.
 * Uses the same modal patterns as ConfirmDialog (a11y, focus trap, dark theme).
 */

'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useModalA11y } from '@/hooks/useModalA11y';
import { Lock, Zap, X } from 'lucide-react';
import type { PaywallFeature } from '@/types';

interface UpgradeModalProps {
  /** Feature key from paywall response */
  feature: PaywallFeature;
  /** Current usage count (optional, for metered features) */
  currentUsage?: number;
  /** Limit count (optional, for metered features) */
  limit?: number;
  /** Close handler */
  onClose: () => void;
}

export function UpgradeModal({
  feature,
  currentUsage,
  limit,
  onClose,
}: UpgradeModalProps) {
  const t = useTranslations('billing.paywall');
  const router = useRouter();
  const containerRef = useModalA11y(onClose);

  const handleUpgrade = () => {
    onClose();
    router.push('/pricing');
  };

  // Feature-specific content from i18n
  const title = t(`${feature}.title`);
  const body = t(`${feature}.body`);

  const hasUsageBar = currentUsage !== undefined && limit !== undefined;
  const usagePercent = hasUsageBar
    ? Math.min((currentUsage / limit) * 100, 100)
    : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        className="border-border bg-card relative w-full max-w-md rounded-2xl border p-6 shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="text-muted-foreground hover:bg-accent/30 hover:text-foreground absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
          <Lock className="text-primary h-6 w-6" />
        </div>

        {/* Title */}
        <h2
          id="upgrade-title"
          className="text-foreground mb-2 text-center text-lg font-semibold"
        >
          {title}
        </h2>

        {/* Body */}
        <p className="text-muted-foreground mb-4 text-center text-sm">{body}</p>

        {/* Usage bar (for metered features) */}
        {hasUsageBar && (
          <div className="mb-5">
            <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-xs">
              <span>
                {currentUsage} / {limit} {t('used')}
              </span>
              <span>{usagePercent.toFixed(0)}%</span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleUpgrade}
            className="bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/20 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 hover:shadow-lg"
          >
            <Zap className="h-4 w-4" />
            {t('cta')}
          </button>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:bg-accent/30 hover:text-foreground rounded-xl px-4 py-2.5 text-sm transition-colors"
          >
            {t('maybeLater')}
          </button>
        </div>
      </div>
    </div>
  );
}
