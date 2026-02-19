import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock global fetch ────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { fetcher } from '@/lib/fetcher';

describe('fetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns data from successful JSON response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: '1', name: 'Test' } }),
    });

    const result = await fetcher('/api/studies');
    expect(result).toEqual({ id: '1', name: 'Test' });
  });

  it('throws on non-ok response with JSON error body', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid input' }),
    });

    await expect(fetcher('/api/studies')).rejects.toThrow('Invalid input');
  });

  it('throws with status code when response body is not JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    });

    await expect(fetcher('/api/studies')).rejects.toThrow(
      'Request failed: 500'
    );
  });

  it('throws with status code when error body has no error field', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'forbidden' }),
    });

    await expect(fetcher('/api/studies')).rejects.toThrow(
      'Request failed: 403'
    );
  });

  it('calls fetch with the provided URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    });

    await fetcher('/api/exams');
    expect(mockFetch).toHaveBeenCalledWith('/api/exams');
  });

  it('extracts data property from response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: '1' }, { id: '2' }],
        extra: 'ignored',
      }),
    });

    const result = await fetcher<Array<{ id: string }>>('/api/questions');
    expect(result).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('returns undefined when data is undefined', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const result = await fetcher('/api/empty');
    expect(result).toBeUndefined();
  });
});
