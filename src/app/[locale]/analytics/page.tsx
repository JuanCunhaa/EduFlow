'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Shell } from '@/components/layout/Shell';
import { Spinner } from '@/components/ui/Spinner';
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  ChevronDown,
  Crown,
  Lock,
  Minus,
  Play,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useStudies } from '@/hooks/useStudies';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useState } from 'react';
import type { AnalyticsData } from '@/services/exam-analytics-service';
import type {
  ReadinessResult,
  ReadinessBand,
  StudyPlan,
  PlanEntry,
} from '@/types';

// ── Band Config ──────────────────────────────────

const BAND_CONFIG: Record<
  ReadinessBand,
  { color: string; icon: string; labelKey: string; descKey: string }
> = {
  not_ready: {
    color: 'text-red-400',
    icon: '🔴',
    labelKey: 'notReady',
    descKey: 'notReadyDesc',
  },
  building: {
    color: 'text-orange-400',
    icon: '🟠',
    labelKey: 'building',
    descKey: 'buildingDesc',
  },
  getting_close: {
    color: 'text-amber-400',
    icon: '🟡',
    labelKey: 'gettingClose',
    descKey: 'gettingCloseDesc',
  },
  likely_ready: {
    color: 'text-emerald-400',
    icon: '🟢',
    labelKey: 'likelyReady',
    descKey: 'likelyReadyDesc',
  },
  highly_ready: {
    color: 'text-blue-400',
    icon: '🔵',
    labelKey: 'highlyReady',
    descKey: 'highlyReadyDesc',
  },
};

const FACTOR_KEYS = [
  { key: 'weightedDomainAccuracy', label: 'factorDomain' },
  { key: 'recentScores', label: 'factorScores' },
  { key: 'hardQuestionAccuracy', label: 'factorHard' },
  { key: 'questionCoverage', label: 'factorCoverage' },
  { key: 'weakDomainPenalty', label: 'factorWeak' },
  { key: 'trendBonus', label: 'factorTrend' },
  { key: 'timeManagement', label: 'factorTime' },
] as const;

// ── Page ─────────────────────────────────────────

export default function AnalyticsPage() {
  const t = useTranslations('analytics');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { studies } = useStudies();
  const { isFree } = usePlanLimits();

  const { data: analytics, isLoading } = useSWR<AnalyticsData>(
    '/api/analytics',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const activeStudyId = studies[0]?.id;
  const { data: readinessData } = useSWR<{ data: ReadinessResult }>(
    activeStudyId ? `/api/analytics/readiness?studyId=${activeStudyId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const { data: planData } = useSWR<{ data: StudyPlan }>(
    activeStudyId && !isFree ? `/api/analytics/study-plan` : null,
    (url: string) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyId: activeStudyId }),
      }).then((r) => r.json()),
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  if (isLoading) {
    return (
      <Shell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner size={28} />
        </div>
      </Shell>
    );
  }

  if (!analytics || analytics.totalExams === 0) {
    return (
      <Shell>
        <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-4 text-center">
          <BarChart3
            className="text-muted-foreground"
            size={48}
            strokeWidth={1}
          />
          <p className="text-muted-foreground">{t('emptyState')}</p>
          <Link
            href="/exams"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            {t('startExam')}
            <ArrowRight size={16} />
          </Link>
        </div>
      </Shell>
    );
  }

  const readiness = readinessData?.data;
  const plan = planData?.data;
  const trend = analytics.scoreTrend;
  const scoreDiff =
    trend.length >= 2
      ? trend[trend.length - 1].score - trend[trend.length - 2].score
      : 0;
  const TrendIcon =
    scoreDiff > 0 ? TrendingUp : scoreDiff < 0 ? TrendingDown : Minus;
  const trendColor =
    scoreDiff > 0
      ? 'text-emerald-400'
      : scoreDiff < 0
        ? 'text-red-400'
        : 'text-muted-foreground';

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
        </div>

        {/* ── Readiness Score Card ── */}
        <ReadinessCard readiness={readiness} isFree={isFree} t={t} />

        {/* ── Top stats row ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Last Exam Trend */}
          <div className="border-border bg-card space-y-2 rounded-xl border p-5">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <TrendIcon size={14} className={trendColor} />
              {t('lastExamTrend')}
            </div>
            <p className={`text-3xl font-bold ${trendColor}`}>
              {scoreDiff > 0 ? '+' : ''}
              {scoreDiff}%
            </p>
            <p className="text-muted-foreground text-xs">{t('vsPrevious')}</p>
          </div>

          {/* Overall stats */}
          <div className="border-border bg-card space-y-2 rounded-xl border p-5">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Award size={14} />
              {tc('score')}
            </div>
            <p className="text-foreground text-3xl font-bold">
              {analytics.avgScore}%
            </p>
            <p className="text-muted-foreground text-xs">
              {analytics.totalExams} {tc('exams')}
            </p>
          </div>
        </div>

        {/* ── Weakness Map ── */}
        {analytics.domainStats.length > 0 && (
          <WeaknessChart domainStats={analytics.domainStats} t={t} />
        )}

        {/* ── Study Plan ── */}
        <StudyPlanCard plan={plan} isFree={isFree} t={t} />

        {/* ── By Study ── */}
        {Object.keys(analytics.studyBreakdown).length > 0 && (
          <div className="border-border bg-card space-y-4 rounded-xl border p-5">
            <div className="text-foreground flex items-center gap-2 text-sm font-medium">
              <BookOpen size={16} />
              {t('byStudy')}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(analytics.studyBreakdown).map(
                ([studyId, data]) => {
                  const study = studies.find((s) => s.id === studyId);
                  return (
                    <div
                      key={studyId}
                      className="border-border/50 flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div>
                        <p className="text-foreground text-sm font-medium">
                          {study?.name || studyId}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {t('examsCount', { count: data.exams })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-foreground text-lg font-bold">
                          {data.avgScore}%
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {t('averageScore')}
                        </p>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* ── Exam History ── */}
        {trend.length > 0 && (
          <div className="border-border bg-card space-y-4 rounded-xl border p-5">
            <h2 className="text-foreground text-sm font-medium">
              {t('examHistory')}
            </h2>
            <div className="divide-border divide-y">
              {trend
                .slice()
                .reverse()
                .map((exam) => (
                  <div
                    key={exam.examId}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-foreground text-sm font-medium">
                        {studies.find((s) => s.id === exam.studyId)?.name ||
                          exam.studyId}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(exam.date).toLocaleDateString(locale, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold ${exam.score >= 70 ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      {exam.score}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

// ── ReadinessCard ────────────────────────────────

function ReadinessCard({
  readiness,
  isFree,
  t,
}: {
  readiness: ReadinessResult | undefined;
  isFree: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!readiness) return null;

  const band = BAND_CONFIG[readiness.band];
  const trendDir = t(readiness.trend.direction);

  return (
    <div className="border-border bg-card space-y-4 rounded-xl border p-6">
      <div className="flex items-start justify-between">
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Target size={14} />
          {t('readinessScore')}
        </div>
        {readiness.trend.examsAnalyzed >= 2 && (
          <span className="text-muted-foreground text-xs">
            {t('trendDelta', {
              direction: trendDir,
              delta: `${readiness.trend.delta > 0 ? '+' : ''}${readiness.trend.delta}`,
              count: readiness.trend.examsAnalyzed,
            })}
          </span>
        )}
      </div>

      {/* Big number + band */}
      <div className="flex items-center gap-4">
        <p className={`text-5xl font-bold ${band.color}`}>
          {readiness.readiness}
        </p>
        <div>
          <p className={`text-sm font-medium ${band.color}`}>
            {band.icon} {t(band.labelKey)}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t(band.descKey)}
          </p>
        </div>
      </div>

      {/* Factor breakdown (Pro only) */}
      {isFree ? (
        <div className="border-border/50 bg-muted/30 flex items-center gap-2 rounded-lg border px-4 py-3">
          <Lock size={14} className="text-muted-foreground" />
          <span className="text-muted-foreground flex-1 text-xs">
            {t('upgradeForFactors')}
          </span>
          <Link
            href="/pricing"
            className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
          >
            <Crown size={12} /> {t('proOnly')}
          </Link>
        </div>
      ) : (
        readiness.factors && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
            >
              {t('factors')}
              <ChevronDown
                size={12}
                className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
            {expanded && (
              <div className="mt-3 space-y-2">
                {FACTOR_KEYS.map(({ key, label }) => {
                  const factor =
                    readiness.factors![key as keyof typeof readiness.factors];
                  if (!factor) return null;
                  const pct = Math.round(factor.value * 100);
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground">{t(label)}</span>
                        <span className="text-muted-foreground">{pct}%</span>
                      </div>
                      <div className="bg-muted h-1 rounded-full">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

// ── WeaknessChart ────────────────────────────────

function WeaknessChart({
  domainStats,
  t,
}: {
  domainStats: AnalyticsData['domainStats'];
  t: ReturnType<typeof useTranslations>;
}) {
  const sorted = [...domainStats].sort((a, b) => a.percentage - b.percentage);
  const weakDomains = sorted.filter((d) => d.percentage < 70);
  const weakest = sorted[0];

  let recommendation: string;
  if (weakDomains.length === 0) {
    recommendation = t('allPassingRecommendation');
  } else if (weakDomains.length === 1) {
    recommendation = t('weakRecommendation1', { domain: weakest.domain });
  } else {
    recommendation = t('weakRecommendationMulti', { domain: weakest.domain });
  }

  return (
    <div className="border-border bg-card space-y-4 rounded-xl border p-5">
      <h2 className="text-foreground text-sm font-medium">
        {t('weaknessMap')}
      </h2>

      {/* Domain bars */}
      <div className="space-y-3">
        {sorted.map((ds) => (
          <div key={ds.domainId} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-foreground flex items-center gap-1.5">
                {ds.domain}
                {ds.percentage < 70 && (
                  <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                    {t('weakLabel')}
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">
                {ds.percentage}% ({ds.correct}/{ds.total})
              </span>
            </div>
            <div className="bg-muted h-2 rounded-full">
              <div
                className={`h-full rounded-full transition-all ${ds.percentage >= 70 ? 'bg-emerald-500' : ds.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${ds.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div className="border-border/50 bg-muted/30 flex items-start gap-3 rounded-lg border px-4 py-3">
        <span className="mt-0.5 text-sm text-amber-400">⚡</span>
        <div className="flex-1">
          <p className="text-foreground text-xs">{recommendation}</p>
          {weakest && weakest.percentage < 70 && (
            <Link
              href={`/exams`}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <Play size={10} />
              {t('startFocusedExam')}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── StudyPlanCard ─────────────────────────────────

function StudyPlanCard({
  plan,
  isFree,
  t,
}: {
  plan: StudyPlan | undefined;
  isFree: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  if (isFree) {
    return (
      <div className="border-border bg-card space-y-3 rounded-xl border p-5">
        <div className="text-foreground flex items-center gap-2 text-sm font-medium">
          <BookOpen size={16} />
          {t('studyPlan')}
        </div>
        <div className="border-border/50 bg-muted/30 flex items-center gap-2 rounded-lg border px-4 py-3">
          <Lock size={14} className="text-muted-foreground" />
          <span className="text-muted-foreground flex-1 text-xs">
            {t('studyPlanProOnly')}
          </span>
          <Link
            href="/pricing"
            className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
          >
            <Crown size={12} /> {t('proOnly')}
          </Link>
        </div>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="border-border bg-card space-y-4 rounded-xl border p-5">
      <div>
        <div className="text-foreground flex items-center gap-2 text-sm font-medium">
          <BookOpen size={16} />
          {t('studyPlan')}
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          {t('studyPlanDesc')}
        </p>
      </div>

      {/* Target vs current */}
      <div className="flex gap-4 text-xs">
        <span className="text-muted-foreground">
          {t('planTarget', { target: plan.targetReadiness })}
        </span>
        <span className="text-muted-foreground">
          {t('planCurrent', { current: plan.currentReadiness })}
        </span>
      </div>

      {/* Daily entries */}
      <div className="divide-border divide-y">
        {plan.entries.map((entry) => (
          <PlanEntryRow key={entry.day} entry={entry} t={t} />
        ))}
      </div>
    </div>
  );
}

function PlanEntryRow({
  entry,
  t,
}: {
  entry: PlanEntry;
  t: ReturnType<typeof useTranslations>;
}) {
  const activityLabel = getActivityLabel(entry, t);
  const isRest = entry.activity.type === 'rest';

  return (
    <div className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
      <div className="text-muted-foreground w-8 text-center text-xs font-medium">
        {entry.dayOfWeek.slice(0, 3)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-medium">
          {activityLabel}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {entry.rationale}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {entry.estimatedMinutes > 0 && (
          <span className="text-muted-foreground text-xs">
            {t('estMinutes', { min: entry.estimatedMinutes })}
          </span>
        )}
        {entry.examConfig && !isRest && (
          <Link
            href="/exams"
            className="bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
          >
            <Play size={10} />
            {t('startSession')}
          </Link>
        )}
      </div>
    </div>
  );
}

function getActivityLabel(
  entry: PlanEntry,
  t: ReturnType<typeof useTranslations>
): string {
  switch (entry.activity.type) {
    case 'domain_focus':
      return t('actDomainFocus', { domain: entry.activity.domainName });
    case 'weak_domains':
      return t('actWeakDomains');
    case 'spaced_review':
      return t('actSpacedReview', { count: entry.activity.questionsDue });
    case 'hard_questions':
      return t('actHardQuestions');
    case 'full_length_exam':
      return t('actFullLength');
    case 'review_mistakes':
      return t('actReviewMistakes');
    case 'rest':
      return t('actRest');
  }
}
