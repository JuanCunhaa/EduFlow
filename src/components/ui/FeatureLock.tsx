/**
 * Feature lock wrapper — displays a locked overlay on gated features for free users.
 * On click, opens the UpgradeModal with feature-specific messaging.
 */

'use client';

import { useState, type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { UpgradeModal } from '@/components/ui/UpgradeModal';
import type { PaywallFeature } from '@/types';
import { cn } from '@/lib/utils';

interface FeatureLockProps {
    /** Feature key for the paywall */
    feature: PaywallFeature;
    /** The element to render behind the lock */
    children: ReactNode;
    /** Whether to show the "Pro" text label (default: true) */
    showLabel?: boolean;
    /** Additional CSS classes */
    className?: string;
    /** Current usage for metered features */
    currentUsage?: number;
    /** Limit for metered features */
    limit?: number;
}

export function FeatureLock({
    feature,
    children,
    showLabel = true,
    className,
    currentUsage,
    limit,
}: FeatureLockProps) {
    const t = useTranslations('billing');
    const { isFree } = usePlanLimits();
    const [showModal, setShowModal] = useState(false);

    // Pro/Team users see the children directly
    if (!isFree) {
        return <>{children}</>;
    }

    return (
        <>
            <div
                className={cn('group relative cursor-pointer', className)}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowModal(true);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowModal(true);
                    }
                }}
                title={t('featureLock.tooltip')}
            >
                {/* Locked element with reduced opacity */}
                <div className="pointer-events-none select-none opacity-50 transition-opacity group-hover:opacity-40">
                    {children}
                </div>

                {/* Lock overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center gap-1.5 rounded-lg bg-card/90 px-2.5 py-1 border border-primary/20 shadow-sm backdrop-blur-sm">
                        <Lock className="h-3 w-3 text-primary" />
                        {showLabel && (
                            <span className="text-xs font-semibold text-primary">Pro</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Upgrade modal */}
            {showModal && (
                <UpgradeModal
                    feature={feature}
                    currentUsage={currentUsage}
                    limit={limit}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
}
