'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Shell } from '@/components/layout/Shell';
import { useStudies } from '@/hooks/useStudies';
import { useQuestions } from '@/hooks/useQuestions';
import { Shuffle, ChevronLeft, ChevronRight, Eye, EyeOff, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import type { Difficulty } from '@/types';

export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner size={28} />
          </div>
        </Shell>
      }
    >
      <StudyPageInner />
    </Suspense>
  );
}

function StudyPageInner() {
  const t = useTranslations('studyPage');
  const tc = useTranslations('common');
  const searchParams = useSearchParams();
  const studyId = searchParams.get('studyId') || '';
  const { studies } = useStudies();
  const { questions } = useQuestions({ studyId });

  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [shuffled, setShuffled] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const study = studies.find((s) => s.id === studyId);

  const filteredQuestions = useMemo(() => {
    let list = questions;
    if (difficulty !== 'all') {
      list = list.filter((q) => q.difficulty === difficulty);
    }
    if (shuffled) {
      list = [...list].sort(() => Math.random() - 0.5);
    }
    return list;
  }, [questions, difficulty, shuffled]);

  const current = filteredQuestions[currentIndex];

  function handlePrev() {
    setShowAnswer(false);
    setCurrentIndex((i) => Math.max(0, i - 1));
  }

  function handleNext() {
    setShowAnswer(false);
    setCurrentIndex((i) => Math.min(filteredQuestions.length - 1, i + 1));
  }

  function handleShuffle() {
    setShuffled((s) => !s);
    setCurrentIndex(0);
    setShowAnswer(false);
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            {study?.name ? `${study.name} — ${t('title')}` : t('title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value as Difficulty | 'all');
              setCurrentIndex(0);
              setShowAnswer(false);
            }}
            className="border-border bg-card text-foreground rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="all">{t('allDifficulties')}</option>
            <option value="easy">{tc('easy')}</option>
            <option value="medium">{tc('medium')}</option>
            <option value="hard">{tc('hard')}</option>
          </select>

          <button
            onClick={handleShuffle}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${shuffled
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground'
              }`}
          >
            <Shuffle size={14} />
            {t('shuffle')}
          </button>

          <span className="text-muted-foreground ml-auto text-xs">
            {t('questionsCount', { count: filteredQuestions.length })}
          </span>
        </div>

        {/* Card */}
        {!current ? (
          <div className="border-border bg-card rounded-xl border p-12 text-center">
            <p className="text-muted-foreground text-sm">{t('noQuestions')}</p>
          </div>
        ) : (
          <div className="border-border bg-card space-y-4 rounded-xl border p-6">
            <p className="text-muted-foreground text-sm">
              {currentIndex + 1} / {filteredQuestions.length}
            </p>
            <p className="text-foreground leading-relaxed font-medium">
              {current.text}
            </p>

            {showAnswer ? (
              <div className="border-border space-y-3 border-t pt-4">
                <button
                  onClick={() => setShowAnswer(false)}
                  className="text-primary flex items-center gap-1.5 text-xs hover:underline"
                >
                  <EyeOff size={14} />
                  {t('hideAnswer')}
                </button>

                <ul className="space-y-3">
                  {current.options.map((opt, i) => {
                    const isCorrect = i === current.correctOptionIndex;
                    return (
                      <li
                        key={i}
                        className={`rounded-lg px-4 py-3 text-sm transition-colors ${isCorrect
                            ? 'bg-emerald-500/10 border border-emerald-500/30'
                            : 'bg-muted/30 border border-border/50'
                          }`}
                      >
                        <div className="flex items-start">
                          <span className={`mr-3 font-mono font-bold mt-0.5 shrink-0 ${isCorrect ? 'text-emerald-400' : 'text-muted-foreground'
                            }`}>
                            {opt.label}
                          </span>
                          <div className="space-y-1.5 w-full">
                            <span className={`font-medium ${isCorrect ? 'text-emerald-50' : 'text-foreground'}`}>
                              {opt.text}
                            </span>

                            {current.explanation && (
                              <div className="text-xs pt-0.5">
                                {isCorrect ? (
                                  <span className="text-emerald-400/90 flex items-start gap-1.5 mt-1">
                                    <CheckCircle2 className="w-4 h-4 inline shrink-0" />
                                    <span>{current.explanation.short}</span>
                                  </span>
                                ) : current.explanation.whyOthersWrong?.[opt.label] ? (
                                  <span className="text-red-400/80 flex items-start gap-1.5 mt-1">
                                    <XCircle className="w-4 h-4 inline shrink-0" />
                                    <span>{current.explanation.whyOthersWrong[opt.label]}</span>
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {current.explanation?.examTip && (
                  <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                    <div>
                      <strong className="text-blue-400">{t('examTip')}:</strong> {current.explanation.examTip}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAnswer(true)}
                className="text-primary flex items-center gap-1.5 text-sm hover:underline"
              >
                <Eye size={14} />
                {t('showAnswer')}
              </button>
            )}
          </div>
        )}

        {/* Navigation */}
        {filteredQuestions.length > 0 && (
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="border-border text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              {tc('previous')}
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === filteredQuestions.length - 1}
              className="border-border text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              {tc('next')}
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}
