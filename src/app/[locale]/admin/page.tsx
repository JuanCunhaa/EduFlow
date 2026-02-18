'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Shell } from '@/components/layout/Shell';
import { usePlan } from '@/hooks/usePlan';
import { Link } from '@/i18n/navigation';
import {
    Shield,
    Users,
    Database,
    Sparkles,
    Store,
    BarChart3,
    AlertTriangle,
    BookOpen,
    Loader2,
} from 'lucide-react';

interface PlatformStats {
    totalUsers: number;
    totalStudies: number;
    totalQuestions: number;
    totalAuditEntries: number;
    openReports: number;
}

export default function AdminDashboardPage() {
    const t = useTranslations('admin');
    const { isAdmin, isLoading: authLoading } = usePlan();
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/admin/stats');
                if (!res.ok) throw new Error('Failed');
                const json = await res.json();
                setStats(json.data);
            } catch {
                // Silently fail — stats just show 0
            } finally {
                setLoading(false);
            }
        }
        if (isAdmin) fetchStats();
    }, [isAdmin]);

    if (authLoading) {
        return (
            <Shell>
                <div className="flex items-center justify-center py-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </Shell>
        );
    }

    if (!isAdmin) {
        return (
            <Shell>
                <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
                    <Shield className="h-12 w-12 text-muted-foreground/30" />
                    <h2 className="text-lg font-semibold text-foreground">{t('forbidden')}</h2>
                    <p className="text-sm text-muted-foreground">{t('forbiddenDesc')}</p>
                </div>
            </Shell>
        );
    }

    const statCards = [
        { label: t('totalUsers'), value: stats?.totalUsers ?? '—', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: t('totalStudies'), value: stats?.totalStudies ?? '—', icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: t('totalQuestions'), value: stats?.totalQuestions ?? '—', icon: Database, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        { label: t('openReports'), value: stats?.openReports ?? '—', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    ];

    const quickLinks = [
        { href: '/admin/users', label: t('userManagement'), icon: Users, desc: t('userManagementDesc') },
        { href: '/admin/generator', label: t('questionGenerator'), icon: Sparkles, desc: t('questionGeneratorDesc') },
        { href: '/marketplace/admin', label: t('marketplaceAdmin'), icon: Store, desc: t('marketplaceAdminDesc') },
    ];

    return (
        <Shell>
            <div className="space-y-8 animate-fade-in">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                        <Shield className="h-6 w-6 text-primary" />
                        {t('title')}
                    </h1>
                    <p className="mt-1.5 text-sm text-muted-foreground">{t('subtitle')}</p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {statCards.map((card) => (
                        <div
                            key={card.label}
                            className="rounded-xl border border-border bg-card p-5 transition-all hover:border-border/80 hover:shadow-lg hover:shadow-black/5"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    {card.label}
                                </span>
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
                                    <card.icon className={`h-4 w-4 ${card.color}`} />
                                </div>
                            </div>
                            <div className="mt-3">
                                {loading ? (
                                    <div className="h-8 w-16 animate-pulse rounded-md bg-muted/50" />
                                ) : (
                                    <span className="text-2xl font-bold text-foreground">
                                        {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Links */}
                <div>
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        {t('quickAccess')}
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {quickLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                                    <link.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                        {link.label}
                                    </h3>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {link.desc}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </Shell>
    );
}
