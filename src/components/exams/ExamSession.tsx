'use client';

import { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertTriangle,
} from 'lucide-react';

interface SessionQuestion {
  id: string;
  text: string;
  options: Array<{ label: string; text: string }>;
  domainIds: string[];
  difficulty: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const DOTS_PER_PAGE = 20;

/** Isolated timer — re-renders every second WITHOUT re-rendering the parent. */
function Timer({
  timeLimitMinutes,
  initialTimeRemaining,
  onTimeUp,
}: {
  timeLimitMinutes: number;
  initialTimeRemaining?: number;
  onTimeUp: () => void;
}) {
  const [timeRemaining, setTimeRemaining] = useState(
    initialTimeRemaining ?? timeLimitMinutes * 60
  );
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    setTimeRemaining(initialTimeRemaining ?? timeLimitMinutes * 60);
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeUpRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLimitMinutes, initialTimeRemaining]);

  const isTimeLow = timeRemaining < 60;
  const isTimeWarning = timeRemaining < timeLimitMinutes * 60 * 0.1;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm font-semibold transition-all ${
        isTimeWarning
          ? 'animate-pulse bg-red-500/20 text-red-400 shadow-[0_0_12px_oklch(0.65_0.20_25/20%)]'
          : isTimeLow
            ? 'bg-amber-500/10 text-amber-400'
            : 'bg-muted/50 text-muted-foreground'
      }`}
    >
      <Clock className="h-3.5 w-3.5" />
      {formatTime(timeRemaining)}
    </div>
  );
}

/** Memoized question body — only re-renders when question or answer changes. */
const QuestionBody = memo(function QuestionBody({
  question,
  currentAnswer,
  onAnswer,
  domainMap = {},
}: {
  question: SessionQuestion;
  currentAnswer: number | null;
  onAnswer: (questionId: string, optionIndex: number) => void;
  domainMap?: Record<string, string>;
}) {
  return (
    <div className="animate-fade-in mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <div className="mb-3 flex items-center gap-2">
        {question.domainIds.map((did) => (
          <span
            key={did}
            className="bg-primary/10 text-primary rounded-md px-2.5 py-0.5 text-xs font-semibold"
          >
            {domainMap[did] || did}
          </span>
        ))}
      </div>

      <h2 className="text-foreground mb-8 text-lg leading-relaxed font-medium">
        {question.text}
      </h2>

      <div className="space-y-3">
        {question.options.map((opt, i) => (
          <button
            key={opt.label}
            onClick={() => onAnswer(question.id, i)}
            className={`flex w-full items-start gap-3 rounded-xl border px-4 py-4 text-left transition-all duration-200 ${
              currentAnswer === i
                ? 'border-primary/30 bg-primary/5 shadow-[0_0_12px_var(--glow)]'
                : 'border-border bg-card hover:border-border hover:bg-accent/30 hover:-translate-y-0.5'
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                currentAnswer === i
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {opt.label}
            </span>
            <span className="text-foreground pt-0.5 text-sm">{opt.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

interface ExamSessionProps {
  questions: SessionQuestion[];
  answers: Record<string, number | null>;
  onAnswer: (questionId: string, optionIndex: number) => void;
  onSubmit: () => void;
  timeLimitMinutes: number;
  initialTimeRemaining?: number;
  /** Map of domainId → display name */
  domainMap?: Record<string, string>;
}

export function ExamSession({
  questions,
  answers,
  onAnswer,
  onSubmit,
  timeLimitMinutes,
  initialTimeRemaining,
  domainMap = {},
}: ExamSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [navPage, setNavPage] = useState(0);
  const t = useTranslations('examSession');
  const tc = useTranslations('common');

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion.id] ?? null;
  const answeredCount = Object.values(answers).filter((a) => a !== null).length;

  // Stable callback ref for Timer onTimeUp
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  const handleTimeUp = useCallback(() => onSubmitRef.current(), []);

  // Auto-follow current question in paginated navigator
  useEffect(() => {
    if (questions.length > DOTS_PER_PAGE) {
      setNavPage(Math.floor(currentIndex / DOTS_PER_PAGE));
    }
  }, [currentIndex, questions.length]);

  // Escape key for submit confirm dialog
  useEffect(() => {
    if (!showSubmitConfirm) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSubmitConfirm(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showSubmitConfirm]);

  // Keyboard shortcuts: 1-5 select option, ←/→ or J/K navigate, Space toggle flag, Enter submit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (showSubmitConfirm) return;

      const q = questions[currentIndex];
      if (!q) return;

      switch (e.key) {
        case '1':
        case '2':
        case '3':
        case '4':
        case '5': {
          const optIndex = parseInt(e.key, 10) - 1;
          if (optIndex < q.options.length) {
            e.preventDefault();
            onAnswer(q.id, optIndex);
          }
          break;
        }
        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          setCurrentIndex((i) => Math.max(0, i - 1));
          break;
        case 'ArrowRight':
        case 'k':
        case 'K':
          e.preventDefault();
          setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
          break;
        case 'Enter':
          if (currentIndex === questions.length - 1) {
            e.preventDefault();
            setShowSubmitConfirm(true);
          }
          break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [currentIndex, questions, showSubmitConfirm, onAnswer]);

  const progress = (answeredCount / questions.length) * 100;
  const usePagination = questions.length > DOTS_PER_PAGE;
  const totalNavPages = Math.ceil(questions.length / DOTS_PER_PAGE);
  const navPageStart = navPage * DOTS_PER_PAGE;
  const navPageEnd = Math.min(navPageStart + DOTS_PER_PAGE, questions.length);

  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Top bar */}
      <div className="border-border glass-panel sticky top-0 z-20 border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="text-foreground font-mono text-sm font-semibold">
              {currentIndex + 1} / {questions.length}
            </span>
            <div className="bg-muted/50 h-2 w-48 overflow-hidden rounded-full">
              <div
                className="gradient-bar-success h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-muted-foreground text-xs">
              {t('answered', { count: answeredCount })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Timer
              timeLimitMinutes={timeLimitMinutes}
              initialTimeRemaining={initialTimeRemaining}
              onTimeUp={handleTimeUp}
            />

            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="from-primary to-primary/80 text-primary-foreground shadow-primary/20 hover:shadow-primary/30 flex items-center gap-1.5 rounded-lg bg-gradient-to-r px-3.5 py-1.5 text-sm font-semibold shadow-md transition-all hover:shadow-lg"
            >
              <Flag className="h-3.5 w-3.5" />
              {tc('submit')}
            </button>
          </div>
        </div>
      </div>

      {/* Question */}
      <QuestionBody
        question={currentQuestion}
        currentAnswer={currentAnswer}
        onAnswer={onAnswer}
        domainMap={domainMap}
      />

      {/* Navigation */}
      <div className="border-border glass-panel sticky bottom-0 border-t">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" /> {tc('previous')}
          </button>

          {/* Question navigator */}
          {usePagination ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setNavPage((p) => Math.max(0, p - 1))}
                disabled={navPage === 0}
                className="text-muted-foreground hover:bg-muted flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold transition-colors disabled:opacity-30"
                aria-label={t('previousPage')}
              >
                «
              </button>
              <div className="flex max-w-[200px] flex-wrap justify-center gap-1 sm:max-w-lg">
                {questions.slice(navPageStart, navPageEnd).map((q, i) => {
                  const idx = navPageStart + i;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-7 w-7 rounded-md text-[10px] font-bold transition-all duration-200 sm:h-6 sm:w-6 ${
                        idx === currentIndex
                          ? 'bg-primary text-primary-foreground shadow-primary/20 shadow-md'
                          : answers[q.id] !== null
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() =>
                  setNavPage((p) => Math.min(totalNavPages - 1, p + 1))
                }
                disabled={navPage >= totalNavPages - 1}
                className="text-muted-foreground hover:bg-muted flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold transition-colors disabled:opacity-30"
                aria-label={t('nextPage')}
              >
                »
              </button>
              <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                {navPageStart + 1}–{navPageEnd}
              </span>
            </div>
          ) : (
            <div className="flex max-w-lg flex-wrap justify-center gap-1.5">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-7 w-7 rounded-md text-[10px] font-bold transition-all duration-200 sm:h-6 sm:w-6 ${
                    i === currentIndex
                      ? 'bg-primary text-primary-foreground shadow-primary/20 shadow-md'
                      : answers[q.id] !== null
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() =>
              setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
            }
            disabled={currentIndex === questions.length - 1}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-30"
          >
            {tc('next')} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {/* Keyboard shortcut hints */}
        <div className="text-muted-foreground/50 hidden items-center justify-center gap-4 py-1 text-[10px] sm:flex">
          <span>
            <kbd className="bg-muted/50 rounded px-1 font-mono">
              1-{currentQuestion.options.length}
            </kbd>{' '}
            {t('select')}
          </span>
          <span>
            <kbd className="bg-muted/50 rounded px-1 font-mono">←→</kbd>{' '}
            {t('navigate')}
          </span>
          <span>
            <kbd className="bg-muted/50 rounded px-1 font-mono">Enter</kbd>{' '}
            {tc('submit')}
          </span>
        </div>
      </div>

      {/* Submit confirmation */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="border-border glass-panel animate-slide-up w-full max-w-sm rounded-2xl border p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-bold">{t('submitExam')}</h3>
            </div>
            <p className="text-muted-foreground mb-2 text-sm">
              {t('answeredOf', {
                answered: answeredCount,
                total: questions.length,
              })}
            </p>
            {answeredCount < questions.length && (
              <p className="mb-4 text-xs text-amber-400/80">
                {t('unanswered', { count: questions.length - answeredCount })}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="border-border text-muted-foreground hover:bg-accent/30 hover:text-foreground flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              >
                {t('continueExam')}
              </button>
              <button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  onSubmit();
                }}
                className="from-primary to-primary/80 text-primary-foreground shadow-primary/20 flex-1 rounded-lg bg-gradient-to-r px-3 py-2 text-sm font-bold shadow-md transition-all hover:shadow-lg"
              >
                {tc('submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
