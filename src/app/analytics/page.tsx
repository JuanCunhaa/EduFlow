'use client';

import { useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useExams } from '@/hooks/useExams';
import { formatDate, computeDomainStats } from '@/lib/format';
import { TrendingUp, Target, ArrowUp, ArrowDown, Minus } from 'lucide-react';

function getBarColor(pct: number): string {
    if (pct >= 70) return 'gradient-bar-success';
    if (pct >= 50) return 'gradient-bar-warning';
    return 'gradient-bar-danger';
}

function getTextColor(pct: number): string {
    if (pct >= 70) return 'text-emerald-400';
    if (pct >= 50) return 'text-amber-400';
    return 'text-red-400';
}

function getBarBgColor(score: number): string {
    if (score >= 70) return 'gradient-bar-success';
    if (score >= 50) return 'gradient-bar-warning';
    return 'gradient-bar-danger';
}

export default function AnalyticsPage() {
    const { exams, isLoading } = useExams(50);

    const { completed, scoreTrend, lastScore, scoreDelta, certBreakdown, domainList, readiness } = useMemo(() => {
        const comp = exams.filter((e) => e.status === 'completed');

        // Score trend (chronological order)
        const trend = [...comp].reverse().map((e, i) => ({
            index: i + 1,
            score: e.score || 0,
            certification: e.certification,
            date: formatDate(e.completedAt),
        }));

        const last = trend[trend.length - 1]?.score || 0;
        const prev = trend[trend.length - 2]?.score || 0;
        const delta = last - prev;

        // Certification breakdown
        const certs: Record<string, { exams: number; avgScore: number; scores: number[] }> = {};
        for (const exam of comp) {
            if (!certs[exam.certification]) {
                certs[exam.certification] = { exams: 0, avgScore: 0, scores: [] };
            }
            certs[exam.certification].exams++;
            certs[exam.certification].scores.push(exam.score || 0);
        }
        for (const cert of Object.values(certs)) {
            cert.avgScore = Math.round(cert.scores.reduce((a, b) => a + b, 0) / cert.scores.length);
        }

        // Domain aggregates via shared utility
        const domains = computeDomainStats(comp);

        // Readiness score
        const ready = domains.length > 0
            ? Math.round(domains.reduce((sum, d) => sum + d.percentage, 0) / domains.length)
            : 0;

        return {
            completed: comp,
            scoreTrend: trend,
            lastScore: last,
            scoreDelta: delta,
            certBreakdown: certs,
            domainList: domains,
            readiness: ready,
        };
    }, [exams]);

    return (
        <Shell>
            <div className="space-y-8 animate-fade-in">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics</h1>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        Track your exam performance and readiness
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
                    </div>
                ) : completed.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-20 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                            <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                        <p className="text-muted-foreground">Complete exams to see analytics</p>
                    </div>
                ) : (
                    <>
                        {/* Readiness gauge + score delta */}
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 animate-stagger">
                            <div className="card-premium flex flex-col items-center p-8">
                                <h3 className="mb-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Readiness Score
                                </h3>
                                <div
                                    className={`flex h-32 w-32 items-center justify-center rounded-full border-4 ${readiness >= 70
                                        ? 'border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_30px_oklch(0.60_0.15_165/15%)]'
                                        : readiness >= 50
                                            ? 'border-amber-500/30 bg-amber-500/10 shadow-[0_0_30px_oklch(0.75_0.15_80/15%)]'
                                            : 'border-red-500/30 bg-red-500/10 shadow-[0_0_30px_oklch(0.60_0.20_25/15%)]'
                                        }`}
                                >
                                    <div>
                                        <div
                                            className={`font-mono text-3xl font-bold ${readiness >= 70 ? 'text-emerald-400' : readiness >= 50 ? 'text-amber-400' : 'text-red-400'}`}
                                        >
                                            {readiness}%
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-4 text-xs text-muted-foreground">
                                    {readiness >= 70
                                        ? 'You\'re on track for the exam'
                                        : readiness >= 50
                                            ? 'Keep studying — you\'re getting closer'
                                            : 'Focus on your weak domains'}
                                </p>
                            </div>

                            <div className="card-premium p-8">
                                <h3 className="mb-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Last Exam Trend
                                </h3>
                                <div className="flex items-center gap-3">
                                    <div className="font-mono text-4xl font-bold text-foreground">{lastScore}%</div>
                                    {scoreTrend.length >= 2 && (
                                        <div
                                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-semibold ${scoreDelta > 0
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : scoreDelta < 0
                                                    ? 'bg-red-500/10 text-red-400'
                                                    : 'bg-muted text-muted-foreground'
                                                }`}
                                        >
                                            {scoreDelta > 0 ? <ArrowUp className="h-3 w-3" /> : scoreDelta < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                            {Math.abs(scoreDelta)}%
                                        </div>
                                    )}
                                </div>
                                <p className="mt-1.5 text-xs text-muted-foreground">vs previous exam</p>

                                {/* Mini score history */}
                                <div className="mt-6 flex items-end gap-1">
                                    {scoreTrend.slice(-15).map((s, i) => (
                                        <div key={i} className="group relative flex-1">
                                            <div
                                                className={`mx-auto w-full max-w-[12px] rounded-t transition-all duration-200 group-hover:opacity-90 ${getBarBgColor(s.score)}`}
                                                style={{ height: `${Math.max(4, s.score * 0.8)}px` }}
                                            />
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block rounded-lg border border-border glass-panel px-2.5 py-1.5 text-xs text-foreground whitespace-nowrap z-10 shadow-lg">
                                                {s.score}% • {s.date}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Certification breakdown */}
                        <div className="card-premium p-6">
                            <h3 className="mb-5 text-sm font-bold text-foreground">By Certification</h3>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {Object.entries(certBreakdown).map(([cert, data]) => (
                                    <div key={cert} className="rounded-xl border border-border bg-accent/20 p-5 transition-all duration-200 hover:bg-accent/40">
                                        <div className="flex items-center justify-between">
                                            <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                                                {cert}
                                            </span>
                                            <span className="text-xs text-muted-foreground">{data.exams} exams</span>
                                        </div>
                                        <div className="mt-3 font-mono text-2xl font-bold text-foreground">{data.avgScore}%</div>
                                        <div className="mt-1 text-xs text-muted-foreground">average score</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Domain heatmap */}
                        <div className="card-premium p-6">
                            <div className="mb-5 flex items-center gap-2">
                                <Target className="h-4 w-4 text-muted-foreground" />
                                <h3 className="text-sm font-bold text-foreground">Domain Mastery</h3>
                            </div>
                            <div className="space-y-4">
                                {domainList.map(({ domain, percentage, correct, total }) => (
                                    <div key={domain} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground truncate max-w-[250px]">{domain}</span>
                                            <span className={`font-mono font-semibold ${getTextColor(percentage)}`}>
                                                {correct}/{total} ({percentage}%)
                                            </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${getBarColor(percentage)}`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Exam history table */}
                        <div className="card-premium overflow-hidden">
                            <div className="px-6 py-5">
                                <h3 className="text-sm font-bold text-foreground">Exam History</h3>
                            </div>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-t border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Cert</th>
                                        <th className="px-6 py-3">Questions</th>
                                        <th className="px-6 py-3 text-right">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {completed.map((exam) => (
                                        <tr key={exam.id} className="transition-colors hover:bg-accent/20">
                                            <td className="px-6 py-3.5 text-sm text-muted-foreground">
                                                {formatDate(exam.completedAt)}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                                                    {exam.certification}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm text-muted-foreground">
                                                {exam.config.questionCount}
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <span
                                                    className={`font-mono text-sm font-semibold ${(exam.score || 0) >= 70 ? 'text-emerald-400' : 'text-red-400'}`}
                                                >
                                                    {exam.score}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </Shell>
    );
}
