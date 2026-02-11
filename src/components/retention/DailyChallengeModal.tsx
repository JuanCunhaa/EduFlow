'use client';

import { useState, useCallback } from 'react';
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
                        <h2 className="text-base font-semibold text-foreground">Daily Challenge</h2>
                        <p className="text-xs text-muted-foreground">
                            {data?.date || 'Loading...'} — {totalQuestions} questions from your weak domains
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
                            {error ? 'Failed to load challenge. Try again later.' : 'No questions available for today. Add more questions to your study.'}
                        </div>
                    ) : submitted ? (
                        /* ── Results ── */
                        <div className="space-y-5 text-center animate-fade-in">
                            <div className="text-4xl">🎯</div>
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Challenge Complete!</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    You answered {answeredCount} of {totalQuestions} questions
                                </p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="rounded-xl bg-gradient-to-r from-primary to-primary/80 px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
                            >
                                Done
                            </button>
                        </div>
                    ) : currentQ ? (
                        /* ── Question ── */
                        <div className="space-y-5 animate-fade-in" key={currentQ.id}>
                            {/* Progress */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Question {currentIdx + 1} of {totalQuestions}</span>
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${currentQ.difficulty === 'hard' ? 'bg-red-500/10 text-red-400' : currentQ.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                    {currentQ.difficulty}
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
                                {currentQ.options.map((opt, oi) => {
                                    const selected = answers[currentQ.id] === oi;
                                    const answered = answers[currentQ.id] !== undefined;
                                    return (
                                        <button
                                            key={oi}
                                            onClick={() => selectAnswer(oi)}
                                            disabled={answered}
                                            className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                                                selected
                                                    ? 'border-primary/40 bg-primary/5'
                                                    : answered
                                                        ? 'border-border opacity-50'
                                                        : 'border-border hover:border-primary/20 hover:bg-accent/20'
                                            }`}
                                        >
                                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                selected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                                            }`}>
                                                {opt.label}
                                            </span>
                                            <span className="text-sm text-foreground">{opt.text}</span>
                                            {selected && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-primary" />}
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
                                        {currentIdx < totalQuestions - 1 ? 'Next' : 'Finish'}
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
