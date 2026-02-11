import useSWR, { mutate } from 'swr';
import type { Question, Difficulty } from '@/types';
import type { CreateQuestionInput, UpdateQuestionInput } from '@/lib/validators';

interface UseQuestionsOptions {
    studyId?: string;
    domainIds?: string[];
    difficulty?: Difficulty | 'all';
    search?: string;
    cursor?: string;
    limit?: number;
}

interface UseQuestionsResult {
    questions: Question[];
    isLoading: boolean;
    error: Error | undefined;
    nextCursor: string | null;
    refresh: () => void;
}

function buildUrl(options: UseQuestionsOptions): string | null {
    if (!options.studyId) return null;

    const params = new URLSearchParams();
    params.set('studyId', options.studyId);
    if (options.domainIds && options.domainIds.length > 0) {
        params.set('domainIds', options.domainIds.join(','));
    }
    if (options.difficulty && options.difficulty !== 'all') params.set('difficulty', options.difficulty);
    if (options.search) params.set('search', options.search);
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.limit) params.set('limit', String(options.limit));

    return '/api/questions?' + params.toString();
}

/** Custom fetcher that returns { data, nextCursor } shape */
async function questionsFetcher(url: string): Promise<{ data: Question[]; nextCursor: string | null }> {
    const res = await fetch(url);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Failed to fetch questions');
    }
    return res.json();
}

export function useQuestions(options: UseQuestionsOptions = {}): UseQuestionsResult {
    const url = buildUrl(options);

    const { data, error, isLoading } = useSWR(url, questionsFetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60_000,
        keepPreviousData: true,
    });

    return {
        questions: data?.data || [],
        nextCursor: data?.nextCursor ?? null,
        isLoading,
        error,
        refresh: () => mutate(url),
    };
}

/** Invalidate all question-list caches (used after mutations) */
function invalidateQuestions() {
    // Invalidate all SWR keys that start with /api/questions
    mutate((key: string) => typeof key === 'string' && key.startsWith('/api/questions'));
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
    invalidateQuestions();
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
    invalidateQuestions();
}

export async function deleteQuestion(id: string): Promise<void> {
    const res = await fetch(`/api/questions/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete question');
    }
    invalidateQuestions();
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
    invalidateQuestions();
    return json.data;
}
