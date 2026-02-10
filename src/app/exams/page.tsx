'use client';

import { useState, useCallback, useEffect } from 'react';
import { Shell } from '@/components/layout/Shell';
import { ExamConfigForm } from '@/components/exams/ExamConfigForm';
import { ExamSession } from '@/components/exams/ExamSession';
import { ExamResults } from '@/components/exams/ExamResults';
import { ExamErrorBoundary } from '@/components/exams/ExamErrorBoundary';
import { createExam, saveAnswer, submitExam } from '@/hooks/useExams';
import { useToast } from '@/components/ui/Toast';
import type { Certification, Difficulty } from '@/types';

type ExamView = 'config' | 'session' | 'results';

interface ActiveExam {
    id: string;
    certification: Certification;
    timeLimitMinutes: number;
    questions: Array<{
        id: string;
        text: string;
        options: Array<{ label: string; text: string }>;
        domain: string;
        domainNumber: number;
        difficulty: string;
    }>;
    answers: Record<string, number | null>;
}

interface ExamResultData {
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    domainScores: Record<string, { correct: number; total: number; percentage: number }>;
    certification: Certification;
}

const STORAGE_KEY = 'isc2_active_exam';

function persistExam(exam: ActiveExam) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(exam));
    } catch { /* quota exceeded — non-critical */ }
}

function recoverExam(): ActiveExam | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as ActiveExam;
    } catch {
        return null;
    }
}

function clearPersistedExam() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export default function ExamsPage() {
    const [view, setView] = useState<ExamView>('config');
    const [activeExam, setActiveExam] = useState<ActiveExam | null>(null);
    const [results, setResults] = useState<ExamResultData | null>(null);
    const { addToast } = useToast();
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Recover exam session on mount (F5 recovery)
    useEffect(() => {
        const recovered = recoverExam();
        if (recovered) {
            setActiveExam(recovered);
            setView('session');
        }
    }, []);

    async function handleStartExam(config: {
        certification: Certification;
        questionCount: number;
        timeLimitMinutes: number;
        difficulty: Difficulty | 'all';
        domains: number[];
    }) {
        setIsCreating(true);
        try {
            const result = await createExam(config);
            const answers: Record<string, number | null> = {};
            for (const q of result.questions) {
                answers[q.id] = null;
            }

            const exam: ActiveExam = {
                id: result.id,
                certification: config.certification,
                timeLimitMinutes: config.timeLimitMinutes,
                questions: result.questions,
                answers,
            };

            setActiveExam(exam);
            persistExam(exam);
            setView('session');
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to create exam', 'error');
        } finally {
            setIsCreating(false);
        }
    }

    function handleAnswer(questionId: string, selectedOptionIndex: number) {
        if (!activeExam) return;

        setActiveExam((prev) => {
            if (!prev) return prev;
            const updated = {
                ...prev,
                answers: { ...prev.answers, [questionId]: selectedOptionIndex },
            };
            persistExam(updated);
            return updated;
        });

        // Fire-and-forget server save
        saveAnswer(activeExam.id, questionId, selectedOptionIndex).catch(console.error);
    }

    const handleSubmit = useCallback(async () => {
        if (!activeExam || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const result = await submitExam(activeExam.id, activeExam.answers);
            clearPersistedExam();
            setResults({
                score: result.score,
                correctAnswers: result.correctAnswers,
                totalQuestions: result.totalQuestions,
                domainScores: result.domainScores,
                certification: activeExam.certification,
            });
            setView('results');
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to submit exam', 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [activeExam, isSubmitting, addToast]);

    if (view === 'session' && activeExam) {
        return (
            <ExamErrorBoundary examId={activeExam.id}>
                <ExamSession
                    questions={activeExam.questions}
                    timeLimitMinutes={activeExam.timeLimitMinutes}
                    answers={activeExam.answers}
                    onAnswer={handleAnswer}
                    onSubmit={handleSubmit}
                />
            </ExamErrorBoundary>
        );
    }

    return (
        <Shell>
            {view === 'config' && (
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Start Exam</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Configure and start a practice exam
                        </p>
                    </div>
                    <ExamConfigForm onStart={handleStartExam} isLoading={isCreating} />
                </div>
            )}

            {view === 'results' && results && (
                <ExamResults
                    score={results.score}
                    correctAnswers={results.correctAnswers}
                    totalQuestions={results.totalQuestions}
                    domainScores={results.domainScores}
                    certification={results.certification}
                    onBackToExams={() => { setView('config'); setResults(null); }}
                    onRetry={() => { setView('config'); setResults(null); }}
                />
            )}
        </Shell>
    );
}
