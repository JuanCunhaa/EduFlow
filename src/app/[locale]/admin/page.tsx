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
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
          <Shield className="text-muted-foreground/30 h-12 w-12" />
          <h2 className="text-foreground text-lg font-semibold">
            {t('forbidden')}
          </h2>
          <p className="text-muted-foreground text-sm">{t('forbiddenDesc')}</p>
        </div>
      </Shell>
    );
  }

  const statCards = [
    {
      label: t('totalUsers'),
      value: stats?.totalUsers ?? '—',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: t('totalStudies'),
      value: stats?.totalStudies ?? '—',
      icon: BookOpen,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: t('totalQuestions'),
      value: stats?.totalQuestions ?? '—',
      icon: Database,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      label: t('openReports'),
      value: stats?.openReports ?? '—',
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
  ];

  const quickLinks = [
    {
      href: '/admin/users',
      label: t('userManagement'),
      icon: Users,
      desc: t('userManagementDesc'),
    },
    {
      href: '/admin/generator',
      label: t('questionGenerator'),
      icon: Sparkles,
      desc: t('questionGeneratorDesc'),
    },
    {
      href: '/marketplace/admin',
      label: t('marketplaceAdmin'),
      icon: Store,
      desc: t('marketplaceAdminDesc'),
    },
  ];

  return (
    <Shell>
      <div className="animate-fade-in space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-foreground flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <Shield className="text-primary h-6 w-6" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {t('subtitle')}
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="border-border bg-card hover:border-border/80 rounded-xl border p-5 transition-all hover:shadow-lg hover:shadow-black/5"
            >
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  {card.label}
                </span>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}
                >
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <div className="mt-3">
                {loading ? (
                  <div className="bg-muted/50 h-8 w-16 animate-pulse rounded-md" />
                ) : (
                  <span className="text-foreground text-2xl font-bold">
                    {typeof card.value === 'number'
                      ? card.value.toLocaleString()
                      : card.value}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-muted-foreground mb-4 flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
            <BarChart3 className="h-4 w-4" />
            {t('quickAccess')}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group border-border bg-card hover:border-primary/30 hover:shadow-primary/5 flex items-start gap-4 rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="bg-primary/10 text-primary group-hover:bg-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors">
                  <link.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-foreground group-hover:text-primary text-sm font-semibold transition-colors">
                    {link.label}
                  </h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
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
