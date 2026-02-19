'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  BarChart3,
  FileSearch,
  Award,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { BadgeId } from '@/types';

const BADGE_EMOJI: Record<string, string> = {
  first_exam: '🎓',
  streak_3: '🔥',
  streak_7: '⚡',
  streak_30: '💎',
  perfect_score: '🏆',
  centurion: '💯',
  domain_master: '🎯',
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

    const colors = [
      '#10b981',
      '#3b82f6',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#ec4899',
    ];
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      life: number;
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
  domainScores: Record<
    string,
    { correct: number; total: number; percentage: number }
  >;
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
  const t = useTranslations('examResults');
  const passingScore = passingScoreProp ?? 70;
  const passed = score >= passingScore;
  const sortedDomains = Object.entries(domainScores).sort(
    ([, a], [, b]) => a.percentage - b.percentage
  );

  return (
    <div className="animate-fade-in mx-auto max-w-2xl space-y-8 py-8">
      {/* Confetti on perfect score */}
      {score === 100 && <ConfettiBurst />}

      {/* Badge notification */}
      {newBadges.length > 0 && (
        <div className="border-primary/20 bg-primary/5 animate-slide-up rounded-2xl border p-5">
          <div className="mb-3 flex items-center gap-2">
            <Award className="text-primary h-5 w-5" />
            <h3 className="text-foreground text-sm font-bold">
              {newBadges.length === 1
                ? t('badgeUnlockedSingle')
                : t('badgeUnlockedMulti', { count: newBadges.length })}
            </h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {newBadges.map((badge) => {
              const emoji = BADGE_EMOJI[badge] || '🏅';
              const BADGE_KEY_MAP: Record<string, string> = {
                first_exam: 'firstExam',
                streak_3: 'streak3',
                streak_7: 'weekWarrior',
                streak_30: 'monthlyMaster',
                perfect_score: 'perfectScore',
                centurion: 'centurion',
                domain_master: 'domainMaster',
              };
              return (
                <div
                  key={badge}
                  className="bg-primary/10 flex items-center gap-2 rounded-xl px-3 py-2 shadow-[0_0_12px_var(--glow)]"
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="text-foreground text-sm font-semibold">
                    {t(BADGE_KEY_MAP[badge] || badge)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Score hero */}
      <div className="flex flex-col items-center gap-5 text-center">
        <div
          className={`flex h-36 w-36 items-center justify-center rounded-full border-4 ${
            passed
              ? 'border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_30px_oklch(0.60_0.15_165/15%)]'
              : 'border-red-500/30 bg-red-500/10 shadow-[0_0_30px_oklch(0.60_0.20_25/15%)]'
          }`}
        >
          <div>
            <div
              className={`font-mono text-4xl font-bold ${passed ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {score}%
            </div>
            <div className="text-muted-foreground text-xs">{t('score')}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {passed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <XCircle className="h-5 w-5 text-red-400" />
          )}
          <span
            className={`text-lg font-bold ${passed ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {passed ? t('passed') : t('needsImprovement')}
          </span>
        </div>

        <p className="text-muted-foreground text-sm">
          {correctAnswers} {t('correctOutOf', { total: totalQuestions })} •{' '}
          {studyName}
        </p>
      </div>

      {/* Stats cards */}
      <div className="animate-stagger grid grid-cols-3 gap-3">
        <div className="card-premium p-4 text-center">
          <div className="text-foreground font-mono text-2xl font-bold">
            {correctAnswers}
          </div>
          <div className="text-muted-foreground mt-1.5 text-xs">
            {t('correct')}
          </div>
        </div>
        <div className="card-premium p-4 text-center">
          <div className="text-foreground font-mono text-2xl font-bold">
            {totalQuestions - correctAnswers}
          </div>
          <div className="text-muted-foreground mt-1.5 text-xs">
            {t('incorrect')}
          </div>
        </div>
        <div className="card-premium p-4 text-center">
          <div className="text-foreground font-mono text-2xl font-bold">
            {passingScore}%
          </div>
          <div className="text-muted-foreground mt-1.5 text-xs">
            {t('passingScore')}
          </div>
        </div>
      </div>

      {/* Domain breakdown */}
      <div className="card-premium p-6">
        <div className="mb-5 flex items-center gap-2">
          <BarChart3 className="text-muted-foreground h-4 w-4" />
          <h3 className="text-foreground text-sm font-bold">
            {t('domainBreakdown')}
          </h3>
        </div>
        <div className="space-y-4">
          {sortedDomains.map(([domain, ds]) => (
            <div key={domain} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground max-w-xs truncate">
                  {domain}
                </span>
                <span
                  className={`font-mono font-semibold ${getTextColor(ds.percentage, passingScore)}`}
                >
                  {ds.correct}/{ds.total} ({ds.percentage}%)
                </span>
              </div>
              <div className="bg-muted/50 h-2 overflow-hidden rounded-full">
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
      {sortedDomains.length > 0 &&
        sortedDomains[0][1].percentage < passingScore && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <TrendingUp className="h-4 w-4" />
              <span className="font-bold">{t('focusArea')}</span>
            </div>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {t('focusAreaTip', {
                domain: sortedDomains[0][0],
                pct: sortedDomains[0][1].percentage,
              })}
            </p>
          </div>
        )}

      {/* Actions */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
        <button
          onClick={onBackToExams}
          className="border-border text-muted-foreground hover:bg-accent/30 hover:text-foreground rounded-xl border px-5 py-2.5 text-sm font-medium transition-all duration-200"
        >
          {t('backToExams')}
        </button>
        <Link
          href={`/exams/${examId}/review`}
          className="border-border text-muted-foreground hover:bg-accent/30 hover:text-foreground flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition-all duration-200"
        >
          <FileSearch className="h-4 w-4" />
          {t('reviewAnswers')}
        </Link>
        <button
          onClick={onRetry}
          className="from-primary to-primary/80 text-primary-foreground shadow-primary/20 hover:shadow-primary/30 rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-bold shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
        >
          {t('takeAnother')}
        </button>
      </div>
    </div>
  );
}
