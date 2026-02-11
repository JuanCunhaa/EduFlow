'use client';

import { useState, useMemo, useRef } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Spinner } from '@/components/ui/Spinner';
import { useQuestions } from '@/hooks/useQuestions';
import type { Certification, Difficulty, Question } from '@/types';
import { Eye, EyeOff, ChevronLeft, ChevronRight, Shuffle, BookOpen } from 'lucide-react';

const CERTIFICATIONS: Certification[] = ['CISSP', 'CC', 'SSCP', 'CCSP', 'CGRC'];

export default function StudyPage() {
    const [certification, setCertification] = useState<Certification>('CISSP');
    const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [shuffled, setShuffled] = useState(false);

    const { questions, isLoading } = useQuestions({
        certification,
        difficulty: difficulty === 'all' ? undefined : difficulty,
    });

    const shuffledRef = useRef<Question[]>([]);

    const orderedQuestions = useMemo(() => {
        if (!shuffled) return questions;
        const currentIds = new Set(shuffledRef.current.map(q => q.id));
        const newIds = new Set(questions.map(q => q.id));
        const sameSet = currentIds.size === newIds.size && [...currentIds].every(id => newIds.has(id));
        if (sameSet && shuffledRef.current.length > 0) return shuffledRef.current;
        const arr = [...questions];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        shuffledRef.current = arr;
        return arr;
    }, [questions, shuffled]);

    const question = orderedQuestions[currentIndex];

    function goTo(index: number) {
        setCurrentIndex(index);
        setShowAnswer(false);
    }

    function handleShuffle() {
        shuffledRef.current = [];
        setShuffled(!shuffled);
        setCurrentIndex(0);
        setShowAnswer(false);
    }

    return (
        <Shell>
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Study Mode</h1>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        Review questions at your own pace — no timer, no pressure
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={certification}
                        onChange={(e) => { setCertification(e.target.value as Certification); setCurrentIndex(0); setShowAnswer(false); }}
                        className="rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary/30"
                    >
                        {CERTIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select
                        value={difficulty}
                        onChange={(e) => { setDifficulty(e.target.value as Difficulty | 'all'); setCurrentIndex(0); setShowAnswer(false); }}
                        className="rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary/30"
                    >
                        <option value="all">All Difficulties</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>

                    <button
                        onClick={handleShuffle}
                        className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${shuffled
                            ? 'border-primary/30 bg-primary/10 text-primary shadow-[0_0_8px_var(--glow)]'
                            : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/30'
                            }`}
                    >
                        <Shuffle className="h-3.5 w-3.5" />
                        Shuffle
                    </button>

                    <span className="font-mono text-sm text-muted-foreground">
                        {orderedQuestions.length} questions
                    </span>
                </div>

                {/* Card */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Spinner size={24} />
                    </div>
                ) : orderedQuestions.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-20 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                            <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                        <p className="text-muted-foreground">No questions found for this selection</p>
                    </div>
                ) : question ? (
                    <div className="mx-auto max-w-3xl space-y-6">
                        {/* Progress */}
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="font-mono font-medium">{currentIndex + 1} / {orderedQuestions.length}</span>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/50">
                                <div
                                    className="h-full rounded-full gradient-bar-success transition-all duration-500"
                                    style={{ width: `${((currentIndex + 1) / orderedQuestions.length) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Question card */}
                        <div className="card-premium p-7">
                            <div className="mb-3 flex items-center gap-2">
                                <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                                    {question.certification} • Domain {question.domainNumber}
                                </span>
                                <span className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${question.difficulty === 'easy' ? 'bg-emerald-400/10 text-emerald-400' :
                                    question.difficulty === 'medium' ? 'bg-amber-400/10 text-amber-400' :
                                        'bg-red-400/10 text-red-400'
                                    }`}>
                                    {question.difficulty}
                                </span>
                            </div>

                            <h2 className="mb-8 text-lg font-medium leading-relaxed text-foreground">
                                {question.text}
                            </h2>

                            <div className="space-y-2.5">
                                {question.options.map((opt, i) => (
                                    <div
                                        key={opt.label}
                                        className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 transition-all duration-200 ${showAnswer && i === question.correctOptionIndex
                                            ? 'border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_12px_oklch(0.60_0.15_165/10%)]'
                                            : 'border-border bg-background'
                                            }`}
                                    >
                                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${showAnswer && i === question.correctOptionIndex
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'bg-muted text-muted-foreground'
                                            }`}>
                                            {opt.label}
                                        </span>
                                        <span className="text-sm text-foreground pt-0.5">{opt.text}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Reveal / explanation */}
                            <div className="mt-7">
                                <button
                                    onClick={() => setShowAnswer(!showAnswer)}
                                    className="flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                                >
                                    {showAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    {showAnswer ? 'Hide Answer' : 'Show Answer'}
                                </button>

                                {showAnswer && (
                                    <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-muted-foreground">
                                        <p className="mb-1.5 font-bold text-emerald-400">
                                            Correct: {question.options[question.correctOptionIndex].label}
                                        </p>
                                        {question.explanation}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => goTo(Math.max(0, currentIndex - 1))}
                                disabled={currentIndex === 0}
                                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30"
                            >
                                <ChevronLeft className="h-4 w-4" /> Previous
                            </button>
                            <button
                                onClick={() => goTo(Math.min(orderedQuestions.length - 1, currentIndex + 1))}
                                disabled={currentIndex === orderedQuestions.length - 1}
                                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30"
                            >
                                Next <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </Shell>
    );
}
