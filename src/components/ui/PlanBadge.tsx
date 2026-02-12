/**
 * Plan badge — shown in sidebar and header to indicate the user's current plan.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { usePlan } from '@/hooks/usePlan';
import { Crown, Sparkles, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanBadgeProps {
    /** Whether to show the full label or just the icon */
    compact?: boolean;
    className?: string;
}

export function PlanBadge({ compact = false, className }: PlanBadgeProps) {
    const t = useTranslations('billing');
    const { plan, isPro, isTrialing, isCanceling, isPastDue, periodEnd } = usePlan();

    // Determine badge variant
    const getVariant = () => {
        if (isPastDue) return 'danger';
        if (isCanceling) return 'warning';
        if (isTrialing) return 'trial';
        if (isPro) return 'pro';
        return 'free';
    };

    const variant = getVariant();

    const variantStyles = {
        free: 'bg-muted/50 text-muted-foreground border-border',
        pro: 'bg-primary/10 text-primary border-primary/20',
        trial: 'bg-primary/10 text-primary border-primary/20',
        warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    };

    const Icon = variant === 'danger' ? AlertTriangle : variant === 'free' ? Sparkles : Crown;

    const getLabel = () => {
        if (isPastDue) return t('plan.pastDue');
        if (isCanceling && periodEnd) {
            const date = new Date(periodEnd).toLocaleDateString();
            return t('plan.canceling', { date });
        }
        if (isTrialing) return t('plan.trial');
        if (plan === 'pro') return t('plan.pro');
        if (plan === 'team') return t('plan.team');
        return t('plan.free');
    };

    const badge = (
        <div
            className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-200',
                variantStyles[variant],
                className
            )}
        >
            <Icon className="h-3 w-3" />
            {!compact && <span>{getLabel()}</span>}
        </div>
    );

    // Free users get a link to pricing
    if (plan === 'free') {
        return (
            <Link
                href="/pricing"
                className="group flex items-center gap-2 rounded-lg transition-all duration-200 hover:bg-accent/30 px-1 py-0.5"
            >
                {badge}
                {!compact && (
                    <span className="text-xs font-medium text-primary opacity-80 group-hover:opacity-100 transition-opacity">
                        {t('cta.upgrade')}
                    </span>
                )}
            </Link>
        );
    }

    return badge;
}
