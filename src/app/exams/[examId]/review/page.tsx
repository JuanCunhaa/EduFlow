'use client';

import { useParams } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Spinner } from '@/components/ui/Spinner';
import { fetcher } from '@/lib/fetcher';
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Eye,
    EyeOff,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useCallback, useRef } from 'react';
import useSWR from 'swr';
import { StickyNote, Save, Loader2 } from 'lucide-react';

interface ReviewQuestion {
    id: string;
    text: string;
    options: Array<{ label: string; text: string }>;
    domainIds: string[];
    difficulty: string;
    correctOptionIndex: number;
    explanation: { short: string; whyOthersWrong: Record<string, string> };
    userAnswer: number | null;
    isCorrect: boolean;
}

interface ReviewData {
    exam: {
        id: string;
        studyId: string;
        score: number;
        questionIds: string[];
    };
    questions: ReviewQuestion[];
}

export default function ExamReviewPage() {
    const { examId } = useParams<{ examId: string }>();
    const { data: review, isLoading, error } = useSWR<ReviewData>(
        examId ? `/api/exams/${examId}/review` : null,
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 60_000 }
    );

    const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
    const [showAll, setShowAll] = useState(false);

    const toggleReveal = useCallback((qId: string) => {
        setRevealedIds(prev => {
            const next = new Set(prev);
            if (next.has(qId)) next.delete(qId);
            else next.add(qId);
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
        if (showAll) {
            setRevealedIds(new Set());
            setShowAll(false);
        } else {
            setRevealedIds(new Set(review?.questions.map(q => q.id) || []));
            setShowAll(true);
        }
    }, [showAll, review]);

    /* ── Per-question notes ── */
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [savingNote, setSavingNote] = useState<string | null>(null);
    const notesFetched = useRef(false);

    // Fetch existing notes once review loads
    const fetchNotes = useCallback(async () => {
        if (!examId || notesFetched.current) return;
        notesFetched.current = true;
        try {
            const res = await fetch(`/api/notes?examId=${examId}`);
            if (res.ok) {
                const json = await res.json();
                if (json.data) setNotes(json.data);
            }
        } catch { /* silent */ }
    }, [examId]);

    // trigger once
    if (review && !notesFetched.current) fetchNotes();

    const saveNote = useCallback(async (questionId: string, content: string) => {
        setSavingNote(questionId);
        try {
            await fetch('/api/notes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionId, note: content }),
            });
        } catch { /* silent */ }
        setSavingNote(null);
    }, [examId]);

    if (isLoading) {
        return (
            <Shell>
                <div className="flex items-center justify-center py-20">
                    <Spinner size={24} />
                </div>
            </Shell>
        );
    }

    if (error || !review) {
        return (
            <Shell>
                <div className="flex flex-col items-center gap-4 py-20 text-center">
                    <p className="text-muted-foreground">
                        {error?.message || 'Unable to load review. Only completed exams can be reviewed.'}
                    </p>
                    <Link href="/exams" className="text-sm text-primary hover:underline">
                        Back to Exams
                    </Link>
                </div>
            </Shell>
        );
    }

    const { questions } = review;
    const correctCount = questions.filter(q => q.isCorrect).length;
    const score = review.exam.score || Math.round((correctCount / questions.length) * 100);

    return (
        <Shell>
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div>
                    <Link
                        href="/exams"
                        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Exams
                    </Link>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Exam Review</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {correctCount}/{questions.length} correct • Score: {score}%
                            </p>
                        </div>
                        <button
                            onClick={toggleAll}
                            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                            {showAll ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            {showAll ? 'Hide All' : 'Reveal All'}
                        </button>
                    </div>
                </div>

                {/* Questions list */}
                <div className="space-y-4">
                    {questions.map((q, idx) => {
                        const revealed = revealedIds.has(q.id);
                        return (
                            <div key={q.id} className="card-premium overflow-hidden">
                                {/* Question header */}
                                <button
                                    onClick={() => toggleReveal(q.id)}
                                    className="flex w-full items-start gap-3 p-5 text-left"
                                >
                                    <div className="mt-0.5">
                                        {q.isCorrect ? (
                                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold text-muted-foreground">
                                                Q{idx + 1}
                                            </span>
                                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${q.difficulty === 'hard' ? 'bg-red-500/10 text-red-400' : q.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                {q.difficulty}
                                            </span>
                                        </div>
                                        <p className="text-sm text-foreground leading-relaxed">{q.text}</p>
                                    </div>
                                    {revealed ? (
                                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
                                    )}
                                </button>

                                {/* Expanded answer section */}
                                {revealed && (
                                    <div className="border-t border-border px-5 py-4 space-y-4 animate-slide-up">
                                        {/* Options */}
                                        <div className="space-y-2">
                                            {q.options.map((opt, oi) => {
                                                const isCorrect = oi === q.correctOptionIndex;
                                                const isUserAnswer = oi === q.userAnswer;
                                                let optionStyle = 'border-border bg-transparent';
                                                if (isCorrect) {
                                                    optionStyle = 'border-emerald-500/30 bg-emerald-500/5';
                                                } else if (isUserAnswer && !isCorrect) {
                                                    optionStyle = 'border-red-500/30 bg-red-500/5';
                                                }

                                                return (
                                                    <div
                                                        key={oi}
                                                        className={`flex items-start gap-3 rounded-lg border p-3 ${optionStyle}`}
                                                    >
                                                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isCorrect ? 'bg-emerald-500/20 text-emerald-400' : isUserAnswer ? 'bg-red-500/20 text-red-400' : 'bg-muted text-muted-foreground'}`}>
                                                            {opt.label}
                                                        </span>
                                                        <span className={`text-sm ${isCorrect ? 'text-emerald-300' : isUserAnswer && !isCorrect ? 'text-red-300' : 'text-muted-foreground'}`}>
                                                            {opt.text}
                                                        </span>
                                                        {isCorrect && (
                                                            <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-400" />
                                                        )}
                                                        {isUserAnswer && !isCorrect && (
                                                            <XCircle className="ml-auto h-4 w-4 shrink-0 text-red-400" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Explanation */}
                                        <div className="rounded-lg bg-muted/30 p-4">
                                            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Explanation
                                            </h4>
                                            <p className="text-sm text-foreground leading-relaxed">
                                                {typeof q.explanation === 'string' ? q.explanation : q.explanation.short}
                                            </p>
                                        </div>

                                        {/* Why others wrong — per option */}
                                        {(() => {
                                            const wrongEntries = typeof q.explanation === 'object'
                                                ? Object.entries(q.explanation.whyOthersWrong || {})
                                                : [];
                                            if (wrongEntries.length === 0) return null;
                                            return (
                                                <div className="rounded-lg bg-muted/20 p-4">
                                                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                        Why Other Options Are Wrong
                                                    </h4>
                                                    <div className="space-y-1.5">
                                                        {wrongEntries.map(([label, reason]) => (
                                                            <div key={label} className="flex items-start gap-2 text-sm">
                                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
                                                                    {label}
                                                                </span>
                                                                <span className="text-muted-foreground">{reason}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Personal notes */}
                                        <div className="rounded-lg bg-muted/20 p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                    <StickyNote className="h-3 w-3" /> My Notes
                                                </h4>
                                                <button
                                                    type="button"
                                                    onClick={() => saveNote(q.id, notes[q.id] || '')}
                                                    disabled={savingNote === q.id}
                                                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                                                >
                                                    {savingNote === q.id ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <Save className="h-3 w-3" />
                                                    )}
                                                    Save
                                                </button>
                                            </div>
                                            <textarea
                                                value={notes[q.id] || ''}
                                                onChange={(e) => setNotes(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                placeholder="Add your notes about this question..."
                                                rows={2}
                                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none resize-y focus:ring-1 focus:ring-primary/30"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Shell>
    );
}
