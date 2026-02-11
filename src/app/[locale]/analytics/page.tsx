'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Shell } from '@/components/layout/Shell';
import { Spinner } from '@/components/ui/Spinner';
import { ArrowRight, Award, BarChart3, BookOpen, Minus, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useStudies } from '@/hooks/useStudies';
import { useStats } from '@/hooks/useStats';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { AnalyticsData } from '@/services/exam-analytics-service';

const ActivityHeatmap = dynamic(() => import('@/components/retention/ActivityHeatmap').then(m => ({ default: m.ActivityHeatmap })), { ssr: false });

export default function AnalyticsPage() {
    const t = useTranslations('analytics');
    const tc = useTranslations('common');
    const locale = useLocale();
    const { studies } = useStudies();
    const { stats } = useStats();

    const { data: analytics, isLoading } = useSWR<AnalyticsData>(
        '/api/analytics',
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 60_000 }
    );

    if (isLoading) {
        return <Shell><div className="flex items-center justify-center min-h-[40vh]"><Spinner size={28} /></div></Shell>;
    }

    if (!analytics || analytics.totalExams === 0) {
        return (
            <Shell>
                <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-4">
                    <BarChart3 className="text-muted-foreground" size={48} strokeWidth={1} />
                    <p className="text-muted-foreground">{t('emptyState')}</p>
                    <Link
                        href="/exams"
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        {t('startExam')}
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </Shell>
        );
    }

    // Compute score trend from last two exams
    const trend = analytics.scoreTrend;
    const scoreDiff = trend.length >= 2 ? trend[trend.length - 1].score - trend[trend.length - 2].score : 0;
    const readinessColor = analytics.readiness >= 70 ? 'text-emerald-400' : analytics.readiness >= 50 ? 'text-amber-400' : 'text-red-400';
    const readinessLabel = analytics.readiness >= 70 ? t('onTrack') : analytics.readiness >= 50 ? t('keepStudying') : t('focusWeak');
    const TrendIcon = scoreDiff > 0 ? TrendingUp : scoreDiff < 0 ? TrendingDown : Minus;
    const trendColor = scoreDiff > 0 ? 'text-emerald-400' : scoreDiff < 0 ? 'text-red-400' : 'text-muted-foreground';

    return (
        <Shell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
                </div>

                {/* Top cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Readiness */}
                    <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Target size={14} />
                            {t('readinessScore')}
                        </div>
                        <p className={`text-3xl font-bold ${readinessColor}`}>{analytics.readiness}%</p>
                        <p className="text-xs text-muted-foreground">{readinessLabel}</p>
                    </div>

                    {/* Last Exam Trend */}
                    <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <TrendIcon size={14} className={trendColor} />
                            {t('lastExamTrend')}
                        </div>
                        <p className={`text-3xl font-bold ${trendColor}`}>
                            {scoreDiff > 0 ? '+' : ''}{scoreDiff}%
                        </p>
                        <p className="text-xs text-muted-foreground">{t('vsPrevious')}</p>
                    </div>

                    {/* Overall stats */}
                    <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Award size={14} />
                            {tc('score')}
                        </div>
                        <p className="text-3xl font-bold text-foreground">{analytics.avgScore}%</p>
                        <p className="text-xs text-muted-foreground">{analytics.totalExams} {tc('exams')}</p>
                    </div>
                </div>

                {/* By Study */}
                {Object.keys(analytics.studyBreakdown).length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <BookOpen size={16} />
                            {t('byStudy')}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {Object.entries(analytics.studyBreakdown).map(([studyId, data]) => {
                                const study = studies.find(s => s.id === studyId);
                                return (
                                    <div key={studyId} className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{study?.name || studyId}</p>
                                            <p className="text-xs text-muted-foreground">{t('examsCount', { count: data.exams })}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-foreground">{data.avgScore}%</p>
                                            <p className="text-xs text-muted-foreground">{t('averageScore')}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Domain Mastery */}
                {analytics.domainStats.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                        <h2 className="text-sm font-medium text-foreground">{t('domainMastery')}</h2>
                        <div className="space-y-3">
                            {analytics.domainStats
                                .sort((a, b) => a.percentage - b.percentage)
                                .map((ds) => (
                                    <div key={ds.domainId} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-foreground">{ds.domain}</span>
                                            <span className="text-muted-foreground">{ds.percentage}% ({ds.correct}/{ds.total})</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-muted">
                                            <div
                                                className={`h-full rounded-full transition-all ${
                                                    ds.percentage >= 70 ? 'bg-emerald-500' : ds.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${ds.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* Activity Heatmap */}
                {stats && <ActivityHeatmap recentDays={stats.recentDays} />}

                {/* Exam History */}
                {trend.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                        <h2 className="text-sm font-medium text-foreground">{t('examHistory')}</h2>
                        <div className="divide-y divide-border">
                            {trend.slice().reverse().map((exam) => (
                                <div key={exam.examId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {studies.find(s => s.id === exam.studyId)?.name || exam.studyId}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(exam.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <span className={`text-sm font-bold ${exam.score >= 70 ? 'text-emerald-400' : 'text-red-400'}`}>
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
