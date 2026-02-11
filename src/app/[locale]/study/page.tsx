'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Shell } from '@/components/layout/Shell';
import { useStudies } from '@/hooks/useStudies';
import { useQuestions } from '@/hooks/useQuestions';
import { Shuffle, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import type { Difficulty } from '@/types';

export default function StudyPage() {
    return (
        <Suspense fallback={<Shell><div className="flex items-center justify-center min-h-[40vh]"><Spinner size={28} /></div></Shell>}>
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

    const study = studies.find(s => s.id === studyId);

    const filteredQuestions = useMemo(() => {
        let list = questions;
        if (difficulty !== 'all') {
            list = list.filter(q => q.difficulty === difficulty);
        }
        if (shuffled) {
            list = [...list].sort(() => Math.random() - 0.5);
        }
        return list;
    }, [questions, difficulty, shuffled]);

    const current = filteredQuestions[currentIndex];

    function handlePrev() {
        setShowAnswer(false);
        setCurrentIndex(i => Math.max(0, i - 1));
    }

    function handleNext() {
        setShowAnswer(false);
        setCurrentIndex(i => Math.min(filteredQuestions.length - 1, i + 1));
    }

    function handleShuffle() {
        setShuffled(s => !s);
        setCurrentIndex(0);
        setShowAnswer(false);
    }

    return (
        <Shell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        {study?.name ? `${study.name} — ${t('title')}` : t('title')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={difficulty}
                        onChange={e => { setDifficulty(e.target.value as Difficulty | 'all'); setCurrentIndex(0); setShowAnswer(false); }}
                        className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground"
                    >
                        <option value="all">{t('allDifficulties')}</option>
                        <option value="easy">{tc('easy')}</option>
                        <option value="medium">{tc('medium')}</option>
                        <option value="hard">{tc('hard')}</option>
                    </select>

                    <button
                        onClick={handleShuffle}
                        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                            shuffled ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Shuffle size={14} />
                        {t('shuffle')}
                    </button>

                    <span className="text-xs text-muted-foreground ml-auto">
                        {t('questionsCount', { count: filteredQuestions.length })}
                    </span>
                </div>

                {/* Card */}
                {!current ? (
                    <div className="rounded-xl border border-border bg-card p-12 text-center">
                        <p className="text-muted-foreground text-sm">{t('noQuestions')}</p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            {currentIndex + 1} / {filteredQuestions.length}
                        </p>
                        <p className="text-foreground font-medium leading-relaxed">{current.text}</p>

                        {showAnswer ? (
                            <div className="space-y-3 border-t border-border pt-4">
                                <button
                                    onClick={() => setShowAnswer(false)}
                                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                                >
                                    <EyeOff size={14} />
                                    {t('hideAnswer')}
                                </button>

                                <ul className="space-y-2">
                                    {current.options.map((opt, i) => {
                                        const isCorrect = i === current.correctOptionIndex;
                                        return (
                                            <li
                                                key={i}
                                                className={`rounded-lg px-3 py-2 text-sm ${
                                                    isCorrect
                                                        ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                                                        : 'text-muted-foreground'
                                                }`}
                                            >
                                                <span className="font-mono font-bold mr-2">{opt.label}</span>
                                                {opt.text}
                                            </li>
                                        );
                                    })}
                                </ul>

                                {current.explanation && (
                                    <p className="text-xs text-muted-foreground mt-3">
                                        <strong>{t('correct')}</strong> {current.explanation.short}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAnswer(true)}
                                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
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
                            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
                        >
                            <ChevronLeft size={16} />
                            {tc('previous')}
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={currentIndex === filteredQuestions.length - 1}
                            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
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
