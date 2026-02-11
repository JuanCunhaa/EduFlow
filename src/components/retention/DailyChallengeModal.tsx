'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, CheckCircle2, XCircle, ChevronRight, Loader2 } from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useModalA11y } from '@/hooks/useModalA11y';

interface ChallengeQuestion {
    id: string;
    text: string;
    options: Array<{ label: string; text: string }>;
    domainIds: string[];
    difficulty: string;
    correctOptionIndex?: number;
}

interface DailyChallengeData {
    questions: ChallengeQuestion[];
    date: string;
}

interface DailyChallengeModalProps {
    studyId: string;
    onClose: () => void;
    onCompleted: () => void;
}

export function DailyChallengeModal({ studyId, onClose, onCompleted }: DailyChallengeModalProps) {
    const t = useTranslations('dailyChallenge');
    const tc = useTranslations('common');
    const { data, isLoading, error } = useSWR<DailyChallengeData>(
        `/api/daily-challenge?studyId=${studyId}`,
        fetcher,
        { revalidateOnFocus: false }
    );

    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [showResult, setShowResult] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const questions = data?.questions ?? [];
    const currentQ = questions[currentIdx];
    const totalQuestions = questions.length;
    const answeredCount = Object.keys(answers).length;

    const selectAnswer = useCallback((optionIndex: number) => {
        if (!currentQ || answers[currentQ.id] !== undefined) return;
        setAnswers(prev => ({ ...prev, [currentQ.id]: optionIndex }));
    }, [currentQ, answers]);

    const goNext = useCallback(() => {
        if (currentIdx < totalQuestions - 1) {
            setCurrentIdx(prev => prev + 1);
        } else {
            setSubmitted(true);
        }
    }, [currentIdx, totalQuestions]);

    const handleClose = useCallback(() => {
        if (submitted) onCompleted();
        else onClose();
    }, [submitted, onCompleted, onClose]);

    const modalRef = useModalA11y(handleClose);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
            <div ref={modalRef} className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <div>
                        <h2 className="text-base font-semibold text-foreground">{t('title')}</h2>
                        <p className="text-xs text-muted-foreground">
                            {data?.date || '...'} — {t('questionsFromWeak', { count: totalQuestions })}
                        </p>
                    </div>
                    <button onClick={handleClose} className="rounded-md p-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : error || totalQuestions === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            {error ? t('loadFailed') : t('noQuestions')}
                        </div>
                    ) : submitted ? (
                        /* ── Results ── */
                        <div className="space-y-5 text-center animate-fade-in">
                            <div className="text-4xl">🎯</div>
                            <div>
                                <h3 className="text-lg font-bold text-foreground">{t('complete')}</h3>
                                {(() => {
                                    const correctCount = questions.reduce((sum, q) => {
                                        if (q.correctOptionIndex !== undefined && answers[q.id] === q.correctOptionIndex) return sum + 1;
                                        return sum;
                                    }, 0);
                                    return (
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {t('result', { correct: correctCount, total: totalQuestions })}
                                        </p>
                                    );
                                })()}
                            </div>
                            <button
                                onClick={handleClose}
                                className="rounded-xl bg-gradient-to-r from-primary to-primary/80 px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
                            >
                                {t('done')}
                            </button>
                        </div>
                    ) : currentQ ? (
                        /* ── Question ── */
                        <div className="space-y-5 animate-fade-in" key={currentQ.id}>
                            {/* Progress */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{t('progress', { current: currentIdx + 1, total: totalQuestions })}</span>
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${currentQ.difficulty === 'hard' ? 'bg-red-500/10 text-red-400' : currentQ.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                    {tc(currentQ.difficulty)}
                                </span>
                            </div>
                            <div className="h-1 overflow-hidden rounded-full bg-muted/50">
                                <div
                                    className="h-full rounded-full bg-primary transition-all duration-300"
                                    style={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%` }}
                                />
                            </div>

                            {/* Question text */}
                            <p className="text-sm text-foreground leading-relaxed">{currentQ.text}</p>

                            {/* Options */}
                            <div className="space-y-2">
                                {(currentQ.options ?? []).map((opt, oi) => {
                                    const selected = answers[currentQ.id] === oi;
                                    const answered = answers[currentQ.id] !== undefined;
                                    const isCorrect = currentQ.correctOptionIndex === oi;
                                    const showCorrect = answered && isCorrect;
                                    const showWrong = answered && selected && !isCorrect;
                                    return (
                                        <button
                                            key={oi}
                                            onClick={() => selectAnswer(oi)}
                                            disabled={answered}
                                            className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                                                showCorrect
                                                    ? 'border-emerald-500/40 bg-emerald-500/10'
                                                    : showWrong
                                                        ? 'border-red-500/40 bg-red-500/10'
                                                        : selected
                                                            ? 'border-primary/40 bg-primary/5'
                                                            : answered
                                                                ? 'border-border opacity-50'
                                                                : 'border-border hover:border-primary/20 hover:bg-accent/20'
                                            }`}
                                        >
                                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                showCorrect ? 'bg-emerald-500/20 text-emerald-400'
                                                : showWrong ? 'bg-red-500/20 text-red-400'
                                                : selected ? 'bg-primary/20 text-primary'
                                                : 'bg-muted text-muted-foreground'
                                            }`}>
                                                {opt.label}
                                            </span>
                                            <span className="text-sm text-foreground">{opt.text}</span>
                                            {showCorrect && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-400" />}
                                            {showWrong && <XCircle className="ml-auto h-4 w-4 shrink-0 text-red-400" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Next button (visible after answering) */}
                            {answers[currentQ.id] !== undefined && (
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={goNext}
                                        className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                                    >
                                        {currentIdx < totalQuestions - 1 ? tc('next') : t('finish')}
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
