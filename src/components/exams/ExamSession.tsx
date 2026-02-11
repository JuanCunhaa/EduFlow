'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock, ChevronLeft, ChevronRight, Flag, AlertTriangle } from 'lucide-react';

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

interface ExamSessionProps {
    questions: SessionQuestion[];
    answers: Record<string, number | null>;
    onAnswer: (questionId: string, optionIndex: number) => void;
    onSubmit: () => void;
    timeLimitMinutes: number;
}

export function ExamSession({
    questions,
    answers,
    onAnswer,
    onSubmit,
    timeLimitMinutes,
}: ExamSessionProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(timeLimitMinutes * 60);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

    const currentQuestion = questions[currentIndex];
    const currentAnswer = answers[currentQuestion.id] ?? null;
    const answeredCount = Object.values(answers).filter((a) => a !== null).length;

    // Keep a stable ref to onSubmit so the interval doesn't depend on it
    const onSubmitRef = useRef(onSubmit);
    useEffect(() => {
        onSubmitRef.current = onSubmit;
    }, [onSubmit]);

    useEffect(() => {
        setTimeRemaining(timeLimitMinutes * 60);

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onSubmitRef.current();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLimitMinutes]);

    const isTimeLow = timeRemaining < 60;
    const isTimeWarning = timeRemaining < timeLimitMinutes * 60 * 0.1;
    const progress = (answeredCount / questions.length) * 100;

    return (
        <div className="flex min-h-screen flex-col bg-background">
            {/* Top bar */}
            <div className="sticky top-0 z-20 border-b border-border glass-panel">
                <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-foreground">
                            {currentIndex + 1} / {questions.length}
                        </span>
                        <div className="h-2 w-48 overflow-hidden rounded-full bg-muted/50">
                            <div
                                className="h-full rounded-full gradient-bar-success transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-xs text-muted-foreground">{answeredCount} answered</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm font-semibold transition-all ${isTimeWarning
                                ? 'animate-pulse bg-red-500/20 text-red-400 shadow-[0_0_12px_oklch(0.65_0.20_25/20%)]'
                                : isTimeLow
                                    ? 'bg-amber-500/10 text-amber-400'
                                    : 'bg-muted/50 text-muted-foreground'
                                }`}
                        >
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(timeRemaining)}
                        </div>

                        <button
                            onClick={() => setShowSubmitConfirm(true)}
                            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-primary/80 px-3.5 py-1.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
                        >
                            <Flag className="h-3.5 w-3.5" />
                            Submit
                        </button>
                    </div>
                </div>
            </div>

            {/* Question */}
            <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 animate-fade-in">
                <div className="mb-3 flex items-center gap-2">
                    {currentQuestion.domainIds.map((did) => (
                        <span key={did} className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                            {did}
                        </span>
                    ))}
                </div>

                <h2 className="mb-8 text-lg font-medium leading-relaxed text-foreground">
                    {currentQuestion.text}
                </h2>

                <div className="space-y-3">
                    {currentQuestion.options.map((opt, i) => (
                        <button
                            key={opt.label}
                            onClick={() => onAnswer(currentQuestion.id, i)}
                            className={`flex w-full items-start gap-3 rounded-xl border px-4 py-4 text-left transition-all duration-200 ${currentAnswer === i
                                ? 'border-primary/30 bg-primary/5 shadow-[0_0_12px_var(--glow)]'
                                : 'border-border bg-card hover:border-border hover:bg-accent/30 hover:-translate-y-0.5'
                                }`}
                        >
                            <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${currentAnswer === i
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                    }`}
                            >
                                {opt.label}
                            </span>
                            <span className="text-sm text-foreground pt-0.5">{opt.text}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Navigation */}
            <div className="sticky bottom-0 border-t border-border glass-panel">
                <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
                    <button
                        onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                        disabled={currentIndex === 0}
                        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                    >
                        <ChevronLeft className="h-4 w-4" /> Previous
                    </button>

                    {/* Question navigator dots */}
                    <div className="flex flex-wrap justify-center gap-1.5 max-w-lg">
                        {questions.map((q, i) => (
                            <button
                                key={q.id}
                                onClick={() => setCurrentIndex(i)}
                                className={`h-6 w-6 rounded-md text-[10px] font-bold transition-all duration-200 ${i === currentIndex
                                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                    : answers[q.id] !== null
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                        disabled={currentIndex === questions.length - 1}
                        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                    >
                        Next <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Submit confirmation */}
            {showSubmitConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
                    <div className="w-full max-w-sm rounded-2xl border border-border glass-panel p-6 shadow-2xl animate-slide-up">
                        <div className="mb-4 flex items-center gap-2 text-amber-400">
                            <AlertTriangle className="h-5 w-5" />
                            <h3 className="font-bold">Submit Exam?</h3>
                        </div>
                        <p className="mb-2 text-sm text-muted-foreground">
                            You have answered <strong className="text-foreground">{answeredCount}</strong> of{' '}
                            <strong className="text-foreground">{questions.length}</strong> questions.
                        </p>
                        {answeredCount < questions.length && (
                            <p className="mb-4 text-xs text-amber-400/80">
                                {questions.length - answeredCount} questions are unanswered and will be marked incorrect.
                            </p>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSubmitConfirm(false)}
                                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground"
                            >
                                Continue Exam
                            </button>
                            <button
                                onClick={() => { setShowSubmitConfirm(false); onSubmit(); }}
                                className="flex-1 rounded-lg bg-gradient-to-r from-primary to-primary/80 px-3 py-2 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
