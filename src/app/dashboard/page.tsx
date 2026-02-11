'use client';

import { useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useExams } from '@/hooks/useExams';
import { formatDate, computeDomainStats } from '@/lib/format';
import {
    BarChart3,
    Target,
    Clock,
    TrendingUp,
    ChevronRight,
    BookOpen,
} from 'lucide-react';
import Link from 'next/link';

function StatCard({
    icon: Icon,
    label,
    value,
    subtext,
    accentColor = 'primary',
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subtext?: string;
    accentColor?: string;
}) {
    const colorMap: Record<string, string> = {
        primary: 'bg-primary/10 text-primary',
        blue: 'bg-blue-500/10 text-blue-400',
        emerald: 'bg-emerald-500/10 text-emerald-400',
        purple: 'bg-purple-500/10 text-purple-400',
    };
    const iconStyle = colorMap[accentColor] || colorMap.primary;

    return (
        <div className="card-premium p-5">
            <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconStyle}`}>
                    <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
            </div>
            <div className="mt-3 font-mono text-3xl font-bold text-foreground">{value}</div>
            {subtext && <p className="mt-1.5 text-xs text-muted-foreground">{subtext}</p>}
        </div>
    );
}

function getBarColor(percentage: number): string {
    if (percentage >= 70) return 'gradient-bar-success';
    if (percentage >= 50) return 'gradient-bar-warning';
    return 'gradient-bar-danger';
}

function getTextColor(percentage: number): string {
    if (percentage >= 70) return 'text-emerald-400';
    if (percentage >= 50) return 'text-amber-400';
    return 'text-red-400';
}

export default function DashboardPage() {
    const { exams, isLoading } = useExams({ limit: 10 });

    const { totalExams, avgScore, passRate, recentExams, domainList } = useMemo(() => {
        const completed = exams.filter((e) => e.status === 'completed');
        const total = completed.length;
        const avg = total > 0
            ? Math.round(completed.reduce((sum, e) => sum + (e.score || 0), 0) / total)
            : 0;
        const passedCount = completed.filter((e) => (e.score || 0) >= 70).length;
        const rate = total > 0 ? Math.round((passedCount / total) * 100) : 0;
        const recent = completed.slice(0, 5);
        const domains = computeDomainStats(completed);

        return {
            totalExams: total,
            avgScore: avg,
            passRate: rate,
            recentExams: recent,
            domainList: domains,
        };
    }, [exams]);

    return (
        <Shell>
            <div className="space-y-8 animate-fade-in">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        Your certification training overview
                    </p>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-stagger">
                    <StatCard icon={BookOpen} label="Exams Taken" value={totalExams} accentColor="primary" />
                    <StatCard icon={Target} label="Avg Score" value={`${avgScore}%`} accentColor="emerald" />
                    <StatCard icon={TrendingUp} label="Pass Rate" value={`${passRate}%`} accentColor="blue" />
                    <StatCard
                        icon={BarChart3}
                        label="Domains Practiced"
                        value={domainList.length}
                        subtext={domainList.length > 0 ? `Weakest: ${domainList[0]?.percentage}%` : undefined}
                        accentColor="purple"
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Recent exams */}
                    <div className="card-premium p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-foreground">Recent Exams</h2>
                            <Link
                                href="/exams"
                                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                            >
                                New Exam <ChevronRight className="h-3 w-3" />
                            </Link>
                        </div>

                        {isLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 3 }, (_, i) => (
                                    <div key={`skeleton-${i}`} className="flex items-center justify-between rounded-lg px-3 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-5 w-14 rounded-md skeleton-shimmer" />
                                            <div className="h-4 w-24 rounded skeleton-shimmer" />
                                        </div>
                                        <div className="h-4 w-10 rounded skeleton-shimmer" />
                                    </div>
                                ))}
                            </div>
                        ) : recentExams.length === 0 ? (
                            <div className="flex flex-col items-center gap-4 py-10 text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50">
                                    <Clock className="h-6 w-6 text-muted-foreground/50" />
                                </div>
                                <p className="text-sm text-muted-foreground">No exams yet — start your first one!</p>
                                <Link
                                    href="/exams"
                                    className="rounded-lg bg-gradient-to-r from-primary to-primary/80 px-4 py-2 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
                                >
                                    Start Exam
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {recentExams.map((exam) => (
                                    <div
                                        key={exam.id}
                                        className="group flex items-center justify-between rounded-lg px-3 py-2.5 transition-all duration-200 hover:bg-accent/30"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                                {exam.certification}
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                {exam.config.questionCount} questions
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`font-mono text-sm font-semibold ${(exam.score || 0) >= 70 ? 'text-emerald-400' : 'text-red-400'}`}
                                            >
                                                {exam.score}%
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(exam.completedAt)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Domain performance */}
                    <div className="card-premium p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-foreground">Domain Performance</h2>
                            <Link
                                href="/analytics"
                                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                            >
                                Full Analytics <ChevronRight className="h-3 w-3" />
                            </Link>
                        </div>

                        {domainList.length === 0 ? (
                            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                                Complete an exam to see domain stats
                            </div>
                        ) : (
                            <div className="space-y-3.5">
                                {domainList.map(({ domain, percentage, correct, total }) => (
                                    <div key={domain} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground truncate max-w-[200px]">{domain}</span>
                                            <span className={`font-mono font-medium ${getTextColor(percentage)}`}>
                                                {correct}/{total} ({percentage}%)
                                            </span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${getBarColor(percentage)}`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 animate-stagger">
                    <Link
                        href="/exams"
                        className="card-premium group flex items-center gap-4 p-5"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                            <Target className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-foreground">Practice Exam</div>
                            <div className="text-xs text-muted-foreground">Start a timed exam</div>
                        </div>
                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5" />
                    </Link>

                    <Link
                        href="/study"
                        className="card-premium group flex items-center gap-4 p-5"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5">
                            <BookOpen className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-foreground">Study Mode</div>
                            <div className="text-xs text-muted-foreground">Review at your pace</div>
                        </div>
                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5" />
                    </Link>

                    <Link
                        href="/analytics"
                        className="card-premium group flex items-center gap-4 p-5"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5">
                            <BarChart3 className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-foreground">Analytics</div>
                            <div className="text-xs text-muted-foreground">Track your progress</div>
                        </div>
                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5" />
                    </Link>
                </div>
            </div>
        </Shell>
    );
}
