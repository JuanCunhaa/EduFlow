'use client';

import { useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, TrendingUp, BarChart3, FileSearch, Award } from 'lucide-react';
import Link from 'next/link';
import type { BadgeId } from '@/types';

const BADGE_LABELS: Record<string, { label: string; emoji: string }> = {
    first_exam: { label: 'First Exam', emoji: '🎓' },
    streak_3: { label: '3-Day Streak', emoji: '🔥' },
    streak_7: { label: 'Week Warrior', emoji: '⚡' },
    streak_30: { label: 'Monthly Master', emoji: '💎' },
    perfect_score: { label: 'Perfect Score', emoji: '🏆' },
    centurion: { label: 'Centurion', emoji: '💯' },
    domain_master: { label: 'Domain Master', emoji: '🎯' },
};

/** Lightweight confetti burst using CSS-only particles */
function ConfettiBurst() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        const particles: Array<{
            x: number; y: number; vx: number; vy: number;
            color: string; size: number; life: number;
        }> = [];

        // Create particles
        for (let i = 0; i < 120; i++) {
            particles.push({
                x: canvas.width / 2,
                y: canvas.height / 3,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 1) * 10 - 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 6 + 2,
                life: 1,
            });
        }

        let animId: number;
        function animate() {
            ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
            let alive = false;
            for (const p of particles) {
                if (p.life <= 0) continue;
                alive = true;
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.15; // gravity
                p.life -= 0.012;
                ctx!.globalAlpha = p.life;
                ctx!.fillStyle = p.color;
                ctx!.fillRect(p.x, p.y, p.size, p.size);
            }
            if (alive) animId = requestAnimationFrame(animate);
        }
        animate();

        return () => cancelAnimationFrame(animId);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none fixed inset-0 z-50"
            aria-hidden="true"
        />
    );
}

interface ExamResultsProps {
    examId: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    domainScores: Record<string, { correct: number; total: number; percentage: number }>;
    studyName: string;
    passingScore?: number;
    newBadges?: BadgeId[];
    onBackToExams: () => void;
    onRetry: () => void;
}

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
    examId,
    score,
    correctAnswers,
    totalQuestions,
    domainScores,
    studyName,
    passingScore: passingScoreProp,
    newBadges = [],
    onBackToExams,
    onRetry,
}: Readonly<ExamResultsProps>) {
    const passingScore = passingScoreProp ?? 70;
    const passed = score >= passingScore;
    const sortedDomains = Object.entries(domainScores).sort(
        ([, a], [, b]) => a.percentage - b.percentage
    );

    return (
        <div className="mx-auto max-w-2xl space-y-8 py-8 animate-fade-in">
            {/* Confetti on perfect score */}
            {score === 100 && <ConfettiBurst />}

            {/* Badge notification */}
            {newBadges.length > 0 && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 animate-slide-up">
                    <div className="flex items-center gap-2 mb-3">
                        <Award className="h-5 w-5 text-primary" />
                        <h3 className="text-sm font-bold text-foreground">
                            {newBadges.length === 1 ? 'Badge Unlocked!' : `${newBadges.length} Badges Unlocked!`}
                        </h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {newBadges.map(badge => {
                            const info = BADGE_LABELS[badge] || { label: badge, emoji: '🏅' };
                            return (
                                <div key={badge} className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 shadow-[0_0_12px_var(--glow)]">
                                    <span className="text-xl">{info.emoji}</span>
                                    <span className="text-sm font-semibold text-foreground">{info.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
                    {correctAnswers} correct out of {totalQuestions} questions • {studyName}
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
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center sm:items-center">
                <button
                    onClick={onBackToExams}
                    className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-accent/30 hover:text-foreground"
                >
                    Back to Exams
                </button>
                <Link
                    href={`/exams/${examId}/review`}
                    className="flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-accent/30 hover:text-foreground"
                >
                    <FileSearch className="h-4 w-4" />
                    Review Answers
                </Link>
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
