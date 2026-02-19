import useSWR, { mutate } from 'swr';
import type { Study } from '@/types';
import type { CreateStudyInput, UpdateStudyInput } from '@/lib/validators';
import { fetcher } from '@/lib/fetcher';

// ── Read hooks ───────────────────────────────────

export function useStudies() {
  const {
    data,
    error,
    isLoading,
    mutate: refresh,
  } = useSWR<Study[]>('/api/studies', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
    keepPreviousData: true,
  });

  return {
    studies: data || [],
    isLoading,
    error,
    refresh: () => refresh(),
  };
}

export function useStudy(studyId: string | null) {
  const {
    data,
    error,
    isLoading,
    mutate: refresh,
  } = useSWR<Study>(studyId ? `/api/studies/${studyId}` : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  return {
    study: data || null,
    isLoading,
    error,
    refresh: () => refresh(),
  };
}

// ── Mutations ────────────────────────────────────

function invalidateStudies() {
  mutate(
    (key: string) => typeof key === 'string' && key.startsWith('/api/studies')
  );
}

export async function createStudy(data: CreateStudyInput): Promise<string> {
  const res = await fetch('/api/studies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create study');
  }
  const json = await res.json();
  invalidateStudies();
  return json.data.id;
}

export async function updateStudy(
  studyId: string,
  data: UpdateStudyInput
): Promise<void> {
  const res = await fetch(`/api/studies/${studyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update study');
  }
  invalidateStudies();
}

export async function deleteStudy(
  studyId: string
): Promise<{ deletedQuestions: number; deletedExams: number }> {
  const res = await fetch(`/api/studies/${studyId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete study');
  }
  const json = await res.json();
  invalidateStudies();
  return json.data;
}
