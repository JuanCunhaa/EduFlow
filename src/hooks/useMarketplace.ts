/**
 * useMarketplace — SWR hooks and mutation helpers for browsing and importing from the marketplace.
 */

import useSWR, { mutate } from 'swr';
import type { MarketplaceStudy, MarketplaceImportResult } from '@/types';
import { fetcher } from '@/lib/fetcher';

// ── Browse hooks ─────────────────────────────────

interface UseMarketplaceStudiesOptions {
  search?: string;
  cursor?: string;
  limit?: number;
}

function buildStudiesUrl(options: UseMarketplaceStudiesOptions): string {
  const params = new URLSearchParams();
  if (options.search) params.set('search', options.search);
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.limit) params.set('limit', String(options.limit));
  const qs = params.toString();
  return `/api/marketplace/studies${qs ? `?${qs}` : ''}`;
}

/** Custom fetcher that returns { data, nextCursor } shape */
async function marketplaceStudiesFetcher(
  url: string
): Promise<{ data: MarketplaceStudy[]; nextCursor: string | null }> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Failed to fetch marketplace studies');
  }
  return res.json();
}

export function useMarketplaceStudies(
  options: UseMarketplaceStudiesOptions = {}
) {
  const url = buildStudiesUrl(options);

  const { data, error, isLoading } = useSWR(url, marketplaceStudiesFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300_000, // 5 min — marketplace changes rarely
    keepPreviousData: true,
  });

  return {
    studies: data?.data || [],
    nextCursor: data?.nextCursor ?? null,
    isLoading,
    error,
    refresh: () => mutate(url),
  };
}

export function useMarketplaceStudy(studyId: string | null) {
  const {
    data,
    error,
    isLoading,
    mutate: refresh,
  } = useSWR<MarketplaceStudy>(
    studyId ? `/api/marketplace/studies/${studyId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  return {
    study: data || null,
    isLoading,
    error,
    refresh: () => refresh(),
  };
}

// ── Import mutation ──────────────────────────────

export async function importFromMarketplace(
  studyId: string,
  domainIds: string[]
): Promise<MarketplaceImportResult> {
  const res = await fetch('/api/marketplace/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studyId, domainIds }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Import failed' }));
    throw new Error(err.error || 'Failed to import from marketplace');
  }

  const json = await res.json();

  // Invalidate user's studies list so the new study appears
  mutate(
    (key: string) => typeof key === 'string' && key.startsWith('/api/studies')
  );

  return json.data as MarketplaceImportResult;
}
