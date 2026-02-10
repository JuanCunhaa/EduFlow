import useSWR, { mutate } from 'swr';
import type { Question, Certification, Difficulty } from '@/types';
import type { CreateQuestionInput, UpdateQuestionInput } from '@/lib/validators';
import { fetcher } from '@/lib/fetcher';

interface UseQuestionsOptions {
    certification?: Certification;
    domainNumber?: number;
    difficulty?: Difficulty | 'all';
}

export function useQuestions(options: UseQuestionsOptions = {}) {
    const params = new URLSearchParams();
    if (options.certification) params.set('certification', options.certification);
    if (options.domainNumber) params.set('domainNumber', String(options.domainNumber));
    if (options.difficulty && options.difficulty !== 'all') params.set('difficulty', options.difficulty);

    const queryString = params.toString();
    const url = `/api/questions${queryString ? `?${queryString}` : ''}`;

    const { data, error, isLoading } = useSWR<Question[]>(url, fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60_000,
        keepPreviousData: true,
    });

    return {
        questions: data || [],
        isLoading,
        error,
        refresh: () => mutate(url),
    };
}

export async function createQuestion(data: CreateQuestionInput): Promise<string> {
    const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create question');
    }
    const json = await res.json();
    return json.data.id;
}

export async function updateQuestion(id: string, data: UpdateQuestionInput): Promise<void> {
    const res = await fetch(`/api/questions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update question');
    }
}

export async function deleteQuestion(id: string): Promise<void> {
    const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete question');
    }
}

export async function importQuestions(
    questions: CreateQuestionInput[]
): Promise<{ imported: number }> {
    const res = await fetch('/api/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to import questions');
    }
    const json = await res.json();
    return json.data;
}
