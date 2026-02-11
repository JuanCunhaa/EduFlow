'use client';

import { useReducer, useCallback, useEffect, useRef } from 'react';
import { Shell } from '@/components/layout/Shell';
import { ExamConfigForm } from '@/components/exams/ExamConfigForm';
import { ExamSession } from '@/components/exams/ExamSession';
import { ExamResults } from '@/components/exams/ExamResults';
import { ExamErrorBoundary } from '@/components/exams/ExamErrorBoundary';
import { createExam, saveAnswer, submitExam } from '@/hooks/useExams';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import type { Certification, Difficulty } from '@/types';

// ── Types ────────────────────────────────────────

interface SessionQuestion {
    id: string;
    text: string;
    options: Array<{ label: string; text: string }>;
    domain: string;
    domainNumber: number;
    difficulty: string;
}

interface ActiveExam {
    id: string;
    certification: Certification;
    timeLimitMinutes: number;
    questions: SessionQuestion[];
    answers: Record<string, number | null>;
}

interface ExamResultData {
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    domainScores: Record<string, { correct: number; total: number; percentage: number }>;
    certification: Certification;
}

// ── State machine ────────────────────────────────

type ExamPhase = 'config' | 'creating' | 'session' | 'submitting' | 'results' | 'checking-resume';

interface ExamState {
    phase: ExamPhase;
    activeExam: ActiveExam | null;
    results: ExamResultData | null;
    error: string | null;
}

type ExamAction =
    | { type: 'START_CREATING' }
    | { type: 'EXAM_CREATED'; exam: ActiveExam }
    | { type: 'ANSWER'; questionId: string; optionIndex: number }
    | { type: 'START_SUBMITTING' }
    | { type: 'EXAM_SUBMITTED'; results: ExamResultData }
    | { type: 'RESET' }
    | { type: 'RESUME_EXAM'; exam: ActiveExam }
    | { type: 'SET_CHECKING_RESUME' }
    | { type: 'NO_RESUME_FOUND' }
    | { type: 'ERROR'; message: string };

function examReducer(state: ExamState, action: ExamAction): ExamState {
    switch (action.type) {
        case 'SET_CHECKING_RESUME':
            return { ...state, phase: 'checking-resume' };
        case 'NO_RESUME_FOUND':
            return { ...state, phase: 'config' };
        case 'START_CREATING':
            return { ...state, phase: 'creating', error: null };
        case 'EXAM_CREATED':
            return { ...state, phase: 'session', activeExam: action.exam, error: null };
        case 'RESUME_EXAM':
            return { ...state, phase: 'session', activeExam: action.exam, error: null };
        case 'ANSWER':
            if (!state.activeExam) return state;
            return {
                ...state,
                activeExam: {
                    ...state.activeExam,
                    answers: { ...state.activeExam.answers, [action.questionId]: action.optionIndex },
                },
            };
        case 'START_SUBMITTING':
            return { ...state, phase: 'submitting' };
        case 'EXAM_SUBMITTED':
            return { ...state, phase: 'results', results: action.results, activeExam: null };
        case 'RESET':
            return { phase: 'config', activeExam: null, results: null, error: null };
        case 'ERROR':
            return { ...state, phase: state.activeExam ? 'session' : 'config', error: action.message };
        default:
            return state;
    }
}

const STORAGE_KEY = 'eduflow_active_exam';

// ── Retry queue for saveAnswer ───────────────────

interface PendingSave {
    examId: string;
    questionId: string;
    optionIndex: number;
    attempt: number;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

function useAnswerRetryQueue() {
    const queueRef = useRef<PendingSave[]>([]);
    const processingRef = useRef(false);

    const processQueue = useCallback(async () => {
        if (processingRef.current || queueRef.current.length === 0) return;
        processingRef.current = true;

        while (queueRef.current.length > 0) {
            const item = queueRef.current[0];
            try {
                await saveAnswer(item.examId, item.questionId, item.optionIndex);
                queueRef.current.shift(); // success — remove from queue
            } catch {
                if (item.attempt >= MAX_RETRIES) {
                    // Drop after max retries — client answers will be reconciled on submit
                    queueRef.current.shift();
                    continue;
                }
                // Exponential backoff
                item.attempt++;
                const delay = BASE_DELAY_MS * Math.pow(2, item.attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        processingRef.current = false;
    }, []);

    const enqueue = useCallback(
        (examId: string, questionId: string, optionIndex: number) => {
            // Deduplicate: replace any existing entry for the same question
            queueRef.current = queueRef.current.filter(
                (p: PendingSave) => p.questionId !== questionId
            );
            queueRef.current.push({ examId, questionId, optionIndex, attempt: 0 });
            processQueue();
        },
        [processQueue]
    );

    return enqueue;
}

// ── Persistence ──────────────────────────────────

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

// ── Component ────────────────────────────────────

export default function ExamsPage() {
    const [state, dispatch] = useReducer(examReducer, {
        phase: 'config',
        activeExam: null,
        results: null,
        error: null,
    });
    const { addToast } = useToast();
    const enqueueSave = useAnswerRetryQueue();

    // Recover exam session on mount (F5 recovery + server resume)
    useEffect(() => {
        const recovered = recoverExam();
        if (recovered) {
            dispatch({ type: 'RESUME_EXAM', exam: recovered });
            return;
        }

        // Check server for in-progress exam
        dispatch({ type: 'SET_CHECKING_RESUME' });
        fetch('/api/exams/in-progress')
            .then((r) => r.json())
            .then((json) => {
                if (json.data) {
                    const exam: ActiveExam = {
                        id: json.data.id,
                        certification: json.data.certification,
                        timeLimitMinutes: json.data.config?.timeLimitMinutes || 0,
                        questions: json.data.questions || [],
                        answers: json.data.answers || {},
                    };
                    dispatch({ type: 'RESUME_EXAM', exam });
                    persistExam(exam);
                } else {
                    dispatch({ type: 'NO_RESUME_FOUND' });
                }
            })
            .catch(() => {
                dispatch({ type: 'NO_RESUME_FOUND' });
            });
    }, []);

    // Persist exam on answer changes
    useEffect(() => {
        if (state.activeExam) {
            persistExam(state.activeExam);
        }
    }, [state.activeExam]);

    async function handleStartExam(config: {
        certification: Certification;
        questionCount: number;
        timeLimitMinutes: number;
        difficulty: Difficulty | 'all';
        domains: number[];
    }) {
        dispatch({ type: 'START_CREATING' });
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

            dispatch({ type: 'EXAM_CREATED', exam });
            persistExam(exam);
        } catch (error) {
            dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'Failed to create exam' });
            addToast(error instanceof Error ? error.message : 'Failed to create exam', 'error');
        }
    }

    function handleAnswer(questionId: string, selectedOptionIndex: number) {
        if (!state.activeExam) return;

        dispatch({ type: 'ANSWER', questionId, optionIndex: selectedOptionIndex });

        // Enqueue server save with retry
        enqueueSave(state.activeExam.id, questionId, selectedOptionIndex);
    }

    const handleSubmit = useCallback(async () => {
        if (!state.activeExam || state.phase === 'submitting') return;

        dispatch({ type: 'START_SUBMITTING' });
        try {
            const result = await submitExam(state.activeExam.id, state.activeExam.answers);
            clearPersistedExam();
            dispatch({
                type: 'EXAM_SUBMITTED',
                results: {
                    score: result.score,
                    correctAnswers: result.correctAnswers,
                    totalQuestions: result.totalQuestions,
                    domainScores: result.domainScores,
                    certification: state.activeExam.certification,
                },
            });
        } catch (error) {
            dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'Failed to submit' });
            addToast(error instanceof Error ? error.message : 'Failed to submit exam', 'error');
        }
    }, [state.activeExam, state.phase, addToast]);

    // ── Render ──

    if (state.phase === 'checking-resume') {
        return (
            <Shell>
                <div className="flex items-center justify-center min-h-[40vh]">
                    <Spinner size={28} />
                </div>
            </Shell>
        );
    }

    if ((state.phase === 'session' || state.phase === 'submitting') && state.activeExam) {
        return (
            <ExamErrorBoundary examId={state.activeExam.id}>
                <ExamSession
                    questions={state.activeExam.questions}
                    timeLimitMinutes={state.activeExam.timeLimitMinutes}
                    answers={state.activeExam.answers}
                    onAnswer={handleAnswer}
                    onSubmit={handleSubmit}
                />
            </ExamErrorBoundary>
        );
    }

    return (
        <Shell>
            {(state.phase === 'config' || state.phase === 'creating') && (
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Start Exam</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Configure and start a practice exam
                        </p>
                    </div>
                    <ExamConfigForm onStart={handleStartExam} isLoading={state.phase === 'creating'} />
                </div>
            )}

            {state.phase === 'results' && state.results && (
                <ExamResults
                    score={state.results.score}
                    correctAnswers={state.results.correctAnswers}
                    totalQuestions={state.results.totalQuestions}
                    domainScores={state.results.domainScores}
                    certification={state.results.certification}
                    onBackToExams={() => dispatch({ type: 'RESET' })}
                    onRetry={() => dispatch({ type: 'RESET' })}
                />
            )}
        </Shell>
    );
}
