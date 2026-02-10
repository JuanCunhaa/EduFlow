'use client';

import { CheckCircle2, XCircle, TrendingUp, BarChart3 } from 'lucide-react';


interface ExamResultsProps {
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    domainScores: Record<string, { correct: number; total: number; percentage: number }>;
    certification: string;
    onBackToExams: () => void;
    onRetry: () => void;
}

/** P3 #17: Per-certification passing thresholds */
const PASSING_SCORES: Record<string, number> = {
    CISSP: 70,
    CC: 75,
    CCSP: 70,
    SSCP: 70,
    CGRC: 70,
};

function getBarColor(pct: number, threshold: number): string {
    if (pct >= threshold) return 'gradient-bar-success';
    if (pct >= 50) return 'gradient-bar-warning';
    return 'gradient-bar-danger';
}

function getTextColor(pct: number, threshold: number): string {
    if (pct >= threshold) return 'text-emerald-400';
    if (pct >= 50) return 'text-amber-400';
    return 'text-red-400';
}

export function ExamResults({
    score,
    correctAnswers,
    totalQuestions,
    domainScores,
    certification,
    onBackToExams,
    onRetry,
}: Readonly<ExamResultsProps>) {
    const passingScore = PASSING_SCORES[certification] ?? 70;
    const passed = score >= passingScore;
    const sortedDomains = Object.entries(domainScores).sort(
        ([, a], [, b]) => a.percentage - b.percentage
    );

    return (
        <div className="mx-auto max-w-2xl space-y-8 py-8 animate-fade-in">
            {/* Score hero */}
            <div className="flex flex-col items-center gap-5 text-center">
                <div
                    className={`flex h-36 w-36 items-center justify-center rounded-full border-4 ${passed
                        ? 'border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_30px_oklch(0.60_0.15_165/15%)]'
                        : 'border-red-500/30 bg-red-500/10 shadow-[0_0_30px_oklch(0.60_0.20_25/15%)]'
                        }`}
                >
                    <div>
                        <div className={`font-mono text-4xl font-bold ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
                            {score}%
                        </div>
                        <div className="text-xs text-muted-foreground">score</div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {passed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                        <XCircle className="h-5 w-5 text-red-400" />
                    )}
                    <span className={`text-lg font-bold ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
                        {passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                    </span>
                </div>

                <p className="text-sm text-muted-foreground">
                    {correctAnswers} correct out of {totalQuestions} questions • {certification}
                </p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-3 animate-stagger">
                <div className="card-premium p-4 text-center">
                    <div className="font-mono text-2xl font-bold text-foreground">{correctAnswers}</div>
                    <div className="mt-1.5 text-xs text-muted-foreground">Correct</div>
                </div>
                <div className="card-premium p-4 text-center">
                    <div className="font-mono text-2xl font-bold text-foreground">{totalQuestions - correctAnswers}</div>
                    <div className="mt-1.5 text-xs text-muted-foreground">Incorrect</div>
                </div>
                <div className="card-premium p-4 text-center">
                    <div className="font-mono text-2xl font-bold text-foreground">{passingScore}%</div>
                    <div className="mt-1.5 text-xs text-muted-foreground">Passing Score</div>
                </div>
            </div>

            {/* Domain breakdown */}
            <div className="card-premium p-6">
                <div className="mb-5 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-bold text-foreground">Domain Breakdown</h3>
                </div>
                <div className="space-y-4">
                    {sortedDomains.map(([domain, ds]) => (
                        <div key={domain} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground truncate max-w-xs">{domain}</span>
                                <span className={`font-mono font-semibold ${getTextColor(ds.percentage, passingScore)}`}>
                                    {ds.correct}/{ds.total} ({ds.percentage}%)
                                </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${getBarColor(ds.percentage, passingScore)}`}
                                    style={{ width: `${ds.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Weakest domain highlight */}
            {sortedDomains.length > 0 && sortedDomains[0][1].percentage < passingScore && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                    <div className="flex items-center gap-2 text-sm text-amber-400">
                        <TrendingUp className="h-4 w-4" />
                        <span className="font-bold">Focus Area</span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        Your weakest domain is <strong className="text-foreground">{sortedDomains[0][0]}</strong> at{' '}
                        {sortedDomains[0][1].percentage}%. Consider reviewing this area in study mode.
                    </p>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-3">
                <button
                    onClick={onBackToExams}
                    className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-accent/30 hover:text-foreground"
                >
                    Back to Exams
                </button>
                <button
                    onClick={onRetry}
                    className="rounded-xl bg-gradient-to-r from-primary to-primary/80 px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                >
                    Take Another Exam
                </button>
            </div>
        </div>
    );
}
