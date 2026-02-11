import useSWR from 'swr';
import type { Exam, ExamConfig, ExamMode } from '@/types';
import { fetcher } from '@/lib/fetcher';

interface UseExamsOptions {
    studyId?: string;
    limit?: number;
    status?: string;
}

export function useExams(options: UseExamsOptions = {}) {
    const { studyId, limit = 20, status } = options;
    const params = new URLSearchParams({ limit: String(limit) });
    if (studyId) params.set('studyId', studyId);
    if (status) params.set('status', status);
    const url = `/api/exams?${params}`;

    const { data, error, isLoading, mutate } = useSWR<Exam[]>(
        url,
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

/** Check for an in-progress exam (resume flow) */
export function useInProgressExam(studyId?: string) {
    const params = new URLSearchParams();
    if (studyId) params.set('studyId', studyId);
    const url = `/api/exams/in-progress?${params}`;

    const { data, error, isLoading, mutate } = useSWR(
        url,
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 60_000 }
    );

    return {
        inProgressExam: data || null,
        isLoading,
        error,
        refresh: () => mutate(),
    };
}

interface CreateExamResult {
    id: string;
    studyId: string;
    status: string;
    config: {
        questionCount: number;
        timeLimitMinutes: number;
        domainIds: string[];
        difficulty: string;
        mode: ExamMode;
    };
    questions: Array<{
        id: string;
        text: string;
        options: Array<{ label: string; text: string }>;
        studyId: string;
        domainIds: string[];
        difficulty: string;
    }>;
}

export async function createExam(config: ExamConfig & { studyId: string }): Promise<CreateExamResult> {
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
    domainScores: Record<string, { domainId: string; domain: string; correct: number; total: number; percentage: number }>;
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

/** Abandon an in-progress exam */
export async function abandonExam(examId: string): Promise<void> {
    const res = await fetch(`/api/exams/${examId}/abandon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to abandon exam');
    }
}

/** Fetch post-exam review data */
export async function getExamReview(examId: string) {
    const res = await fetch(`/api/exams/${examId}/review`);

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch exam review');
    }

    const json = await res.json();
    return json.data;
}
