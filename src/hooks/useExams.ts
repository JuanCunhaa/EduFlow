import useSWR from 'swr';
import type { Exam, ExamConfig } from '@/types';
import { fetcher } from '@/lib/fetcher';

export function useExams(limit = 20) {
    const { data, error, isLoading, mutate } = useSWR<Exam[]>(
        `/api/exams?limit=${limit}`,
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 30_000, keepPreviousData: true }
    );

    return {
        exams: data || [],
        isLoading,
        error,
        refresh: () => mutate(),
    };
}

export function useExam(examId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<Exam>(
        examId ? `/api/exams/${examId}` : null,
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 30_000 }
    );

    return {
        exam: data || null,
        isLoading,
        error,
        refresh: () => mutate(),
    };
}

interface CreateExamResult {
    id: string;
    questions: Array<{
        id: string;
        text: string;
        options: Array<{ label: string; text: string }>;
        domain: string;
        domainNumber: number;
        difficulty: string;
    }>;
}

export async function createExam(config: ExamConfig): Promise<CreateExamResult> {
    const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create exam');
    }

    const json = await res.json();
    return json.data;
}

export async function saveAnswer(
    examId: string,
    questionId: string,
    selectedOptionIndex: number
): Promise<void> {
    const res = await fetch(`/api/exams/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, selectedOptionIndex }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save answer');
    }
}

interface SubmitResult {
    examId: string;
    score: number;
    domainScores: Record<string, { correct: number; total: number; percentage: number }>;
    totalQuestions: number;
    correctAnswers: number;
}

export async function submitExam(
    examId: string,
    answers?: Record<string, number | null>
): Promise<SubmitResult> {
    const res = await fetch(`/api/exams/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit exam');
    }

    const json = await res.json();
    return json.data;
}
