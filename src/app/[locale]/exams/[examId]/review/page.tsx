'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Shell } from '@/components/layout/Shell';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { ChevronLeft, ChevronDown, ChevronUp, Check, X, Eye, EyeOff, StickyNote } from 'lucide-react';

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
        score: number;
        correctAnswers: number;
        totalQuestions: number;
    };
    questions: ReviewQuestion[];
}

export default function ExamReviewPage({ params }: { params: Promise<{ examId: string; locale: string }> }) {
    const { examId } = use(params);
    const t = useTranslations('examReview');
    const tc = useTranslations('common');
    const { addToast } = useToast();

    const [data, setData] = useState<ReviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
    const [openNoteId, setOpenNoteId] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/exams/${examId}/review`)
            .then(r => r.json())
            .then(json => {
                if (json.data) setData(json.data);
                else throw new Error(json.error || 'Failed');
            })
            .catch(() => addToast(t('loadFailed'), 'error'))
            .finally(() => setLoading(false));
    }, [examId, addToast, t]);

    const toggleReveal = useCallback((id: string) => {
        setRevealedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    function revealAll() {
        if (!data) return;
        setRevealedIds(new Set(data.questions.map(q => q.id)));
    }

    function hideAll() {
        setRevealedIds(new Set());
    }

    async function saveNote(questionId: string) {
        setSavingNoteId(questionId);
        try {
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionId, text: notes[questionId] || '' }),
            });
            if (!res.ok) throw new Error();
            addToast(t('noteSaved'), 'success');
        } catch {
            addToast(t('noteFailed'), 'error');
        } finally {
            setSavingNoteId(null);
        }
    }

    if (loading) {
        return <Shell><div className="flex items-center justify-center min-h-[40vh]"><Spinner size={28} /></div></Shell>;
    }

    if (!data) {
        return (
            <Shell>
                <div className="text-center py-20">
                    <p className="text-muted-foreground">{t('loadFailed')}</p>
                </div>
            </Shell>
        );
    }

    const allRevealed = revealedIds.size === data.questions.length;

    return (
        <Shell>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <Link href="/exams" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
                            <ChevronLeft size={14} />
                            {t('backToExams')}
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {data.exam.correctAnswers}/{data.exam.totalQuestions} — {data.exam.score}%
                        </p>
                    </div>
                    <button
                        onClick={allRevealed ? hideAll : revealAll}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {allRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                        {allRevealed ? t('hideAll') : t('revealAll')}
                    </button>
                </div>

                {/* Questions */}
                <div className="space-y-4">
                    {data.questions.map((q, idx) => {
                        const revealed = revealedIds.has(q.id);
                        return (
                            <div key={q.id} className="rounded-xl border border-border bg-card overflow-hidden">
                                {/* Question header */}
                                <button
                                    onClick={() => toggleReveal(q.id)}
                                    className="flex w-full items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                                >
                                    <div className={`mt-0.5 flex-none rounded-full p-1 ${q.isCorrect ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {q.isCorrect ? <Check size={14} /> : <X size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground mb-1">#{idx + 1}</p>
                                        <p className="text-sm font-medium text-foreground leading-relaxed">{q.text}</p>
                                    </div>
                                    {revealed ? <ChevronUp size={16} className="text-muted-foreground mt-1 flex-none" /> : <ChevronDown size={16} className="text-muted-foreground mt-1 flex-none" />}
                                </button>

                                {/* Expanded content */}
                                {revealed && (
                                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                                        {/* Options */}
                                        <ul className="space-y-2">
                                            {q.options.map((opt, i) => {
                                                const isCorrect = i === q.correctOptionIndex;
                                                const isUserAnswer = i === q.userAnswer;
                                                let style = 'text-muted-foreground';
                                                if (isCorrect) style = 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30';
                                                else if (isUserAnswer && !isCorrect) style = 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30';

                                                return (
                                                    <li key={i} className={`rounded-lg px-3 py-2 text-sm ${style}`}>
                                                        <span className="font-mono font-bold mr-2">{opt.label}</span>
                                                        {opt.text}
                                                        {isUserAnswer && !isCorrect && (
                                                            <span className="ml-2 text-xs opacity-70">← {t('yourAnswer')}</span>
                                                        )}
                                                        {isCorrect && (
                                                            <span className="ml-2 text-xs opacity-70">← {t('correctAnswer')}</span>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>

                                        {/* Explanation */}
                                        {q.explanation.short && (
                                            <div className="rounded-lg bg-muted/30 px-3 py-2 space-y-1">
                                                <p className="text-xs font-medium text-foreground">{t('explanation')}</p>
                                                <p className="text-sm text-muted-foreground">{q.explanation.short}</p>
                                            </div>
                                        )}

                                        {/* Why others wrong */}
                                        {Object.keys(q.explanation.whyOthersWrong).length > 0 && (
                                            <div className="rounded-lg bg-muted/30 px-3 py-2 space-y-1">
                                                <p className="text-xs font-medium text-foreground">{t('whyOthersWrong')}</p>
                                                <ul className="space-y-1">
                                                    {Object.entries(q.explanation.whyOthersWrong).map(([label, reason]) => (
                                                        <li key={label} className="text-sm text-muted-foreground">
                                                            <span className="font-mono font-bold mr-1">{label}:</span>{reason}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Notes */}
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => setOpenNoteId(openNoteId === q.id ? null : q.id)}
                                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                                            >
                                                <StickyNote size={12} />
                                                {t('myNotes')}
                                            </button>
                                            {openNoteId === q.id && (
                                                <div className="flex gap-2">
                                                    <textarea
                                                        value={notes[q.id] || ''}
                                                        onChange={e => setNotes(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                        placeholder={t('notesPlaceholder')}
                                                        className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
                                                        rows={2}
                                                    />
                                                    <button
                                                        onClick={() => saveNote(q.id)}
                                                        disabled={savingNoteId === q.id}
                                                        className="self-end rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                                    >
                                                        {savingNoteId === q.id ? tc('saving') : t('save')}
                                                    </button>
                                                </div>
                                            )}
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
