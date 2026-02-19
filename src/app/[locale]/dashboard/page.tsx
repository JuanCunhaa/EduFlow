'use client';

import { useTranslations } from 'next-intl';
import { Shell } from '@/components/layout/Shell';
import { useStudies } from '@/hooks/useStudies';
import { useStats } from '@/hooks/useStats';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import type { Study } from '@/types';
import {
  BookOpen,
  Database,
  ClipboardList,
  ChevronRight,
  Plus,
  GraduationCap,
  Flame,
  Target,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { CheckoutSuccessHandler } from '@/components/ui/CheckoutSuccessHandler';

const StudyFormDialog = dynamic(
  () =>
    import('@/components/studies/StudyFormDialog').then((m) => ({
      default: m.StudyFormDialog,
    })),
  { ssr: false }
);

function StudyCard({ study }: { study: Study }) {
  const t = useTranslations('common');
  const domainCount = study.domains.length;

  return (
    <Link
      href={`/dashboard/${study.id}`}
      className="card-premium group flex flex-col gap-4 p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary group-hover:bg-primary/20 flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold transition-colors">
            {study.abbreviation.slice(0, 3)}
          </div>
          <div>
            <h3 className="text-foreground text-sm leading-tight font-semibold">
              {study.name}
            </h3>
            <span className="text-muted-foreground text-xs">
              {study.abbreviation}
            </span>
          </div>
        </div>
        <ChevronRight className="text-muted-foreground h-4 w-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>

      <div className="text-muted-foreground flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <GraduationCap className="h-3.5 w-3.5" />
          {domainCount} {t('domains')}
        </span>
        <span className="flex items-center gap-1">
          <Database className="h-3.5 w-3.5" />
          {study.questionCount} {t('questions')}
        </span>
        <span className="flex items-center gap-1">
          <ClipboardList className="h-3.5 w-3.5" />
          {study.examCount} {t('exams')}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {study.domains.slice(0, 5).map((d) => (
          <span
            key={d.id}
            className="bg-muted/50 text-muted-foreground rounded-md px-2 py-0.5 text-[10px] font-medium"
          >
            {d.abbreviation}
          </span>
        ))}
        {study.domains.length > 5 && (
          <span className="bg-muted/50 text-muted-foreground rounded-md px-2 py-0.5 text-[10px] font-medium">
            +{study.domains.length - 5}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { studies, isLoading, refresh } = useStudies();
  const { stats } = useStats();
  const [showCreate, setShowCreate] = useState(false);

  const weeklyAnswered =
    stats?.recentDays
      ?.filter((d) => {
        const dDate = new Date(d.date);
        const now = new Date();
        const weekAgo = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 7
        );
        return dDate >= weekAgo;
      })
      .reduce((sum, d) => sum + d.questionsAnswered, 0) ?? 0;
  const weeklyGoal = stats?.weeklyGoal ?? 50;
  const weeklyPct = Math.min(
    100,
    Math.round((weeklyAnswered / weeklyGoal) * 100)
  );

  return (
    <Shell>
      <Suspense fallback={null}>
        <CheckoutSuccessHandler />
      </Suspense>
      <div className="animate-fade-in space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold tracking-tight">
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {t('subtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="from-primary to-primary/80 text-primary-foreground shadow-primary/20 hover:shadow-primary/30 flex items-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <Plus className="h-4 w-4" />
            {t('newStudy')}
          </button>
        </div>

        {stats && (
          <div className="flex flex-wrap items-center gap-4">
            <div className="border-border bg-card flex items-center gap-2 rounded-xl border px-4 py-2.5">
              <Flame
                className={`h-4 w-4 ${stats.currentStreak > 0 ? 'text-orange-400' : 'text-muted-foreground/30'}`}
              />
              <span className="text-foreground font-mono text-sm font-bold">
                {stats.currentStreak}
              </span>
              <span className="text-muted-foreground text-xs">
                {stats.currentStreak === 0 ? t('streakToday') : t('dayStreak')}
              </span>
            </div>
            <div className="border-border bg-card flex min-w-[200px] flex-1 items-center gap-3 rounded-xl border px-4 py-2.5">
              <Target className="text-primary h-4 w-4 shrink-0" />
              <div className="flex-1">
                <div className="bg-muted/50 h-2 overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${weeklyPct >= 100 ? 'gradient-bar-success' : weeklyPct >= 50 ? 'gradient-bar-warning' : 'gradient-bar-danger'}`}
                    style={{ width: `${weeklyPct}%` }}
                  />
                </div>
              </div>
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                {weeklyAnswered}/{weeklyGoal} {t('weekly')}
              </span>
            </div>
          </div>
        )}

        {isLoading ? (
          <SkeletonDashboard />
        ) : studies.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-20 text-center">
            <div className="bg-muted/50 flex h-20 w-20 items-center justify-center rounded-3xl">
              <BookOpen className="text-muted-foreground/30 h-10 w-10" />
            </div>
            <div>
              <h3 className="text-foreground text-base font-semibold">
                {t('noStudies')}
              </h3>
              <p className="text-muted-foreground mt-1.5 text-sm">
                {t('noStudiesDescription')}
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="from-primary to-primary/80 text-primary-foreground shadow-primary/20 hover:shadow-primary/30 flex items-center gap-2 rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-bold shadow-lg transition-all hover:shadow-xl"
            >
              <Plus className="h-4 w-4" />
              {t('createStudy')}
            </button>
          </div>
        ) : (
          <div className="animate-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {studies.map((study) => (
              <StudyCard key={study.id} study={study} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <StudyFormDialog
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      )}
    </Shell>
  );
}
