import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Firestore before importing module ───────

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();

const mockRunTransaction = vi.fn(async (fn: Function) => {
  const tx = {
    get: mockGet,
    set: mockSet,
    update: mockUpdate,
  };
  return fn(tx);
});

const mockDoc = vi.fn(() => 'mock-doc-ref');
const mockCollection = vi.fn(() => ({ doc: mockDoc }));

vi.mock('@/lib/firebase/admin', () => ({
  getAdminDb: () => ({
    collection: mockCollection,
    runTransaction: mockRunTransaction,
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { rateLimit } from '@/lib/rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows first request (no existing doc)', async () => {
    mockGet.mockResolvedValue({ exists: false });
    const result = await rateLimit('test-key', 5, 60_000);
    expect(result).toBe(true);
    expect(mockSet).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.objectContaining({ count: 1 })
    );
  });

  it('allows requests within limit', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        count: 3,
        resetAt: Date.now() + 30_000,
      }),
    });
    const result = await rateLimit('test-key', 5, 60_000);
    expect(result).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('blocks when limit is reached', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        count: 5,
        resetAt: Date.now() + 30_000,
      }),
    });
    const result = await rateLimit('test-key', 5, 60_000);
    expect(result).toBe(false);
  });

  it('resets counter when window has expired', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        count: 99,
        resetAt: Date.now() - 1000, // window expired
      }),
    });
    const result = await rateLimit('test-key', 5, 60_000);
    expect(result).toBe(true);
    expect(mockSet).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.objectContaining({ count: 1 })
    );
  });

  it('failOpen=true allows on error', async () => {
    mockRunTransaction.mockRejectedValueOnce(new Error('Firestore down'));
    const result = await rateLimit('test-key', 5, 60_000, true);
    expect(result).toBe(true);
  });

  it('failOpen=false blocks on error', async () => {
    mockRunTransaction.mockRejectedValueOnce(new Error('Firestore down'));
    const result = await rateLimit('test-key', 5, 60_000, false);
    expect(result).toBe(false);
  });

  it('uses correct collection and document key', async () => {
    mockGet.mockResolvedValue({ exists: false });
    await rateLimit('exam-create:user123', 5, 60_000);
    expect(mockCollection).toHaveBeenCalledWith('_rateLimits');
    expect(mockDoc).toHaveBeenCalledWith('exam-create:user123');
  });

  it('sets expireAt with TTL buffer', async () => {
    mockGet.mockResolvedValue({ exists: false });
    const before = Date.now();
    await rateLimit('test-key', 5, 60_000);

    const setCall = mockSet.mock.calls[0][1];
    expect(setCall.expireAt).toBeInstanceOf(Date);
    // expireAt should be now + windowMs + 24h buffer
    const expectedMin = before + 60_000 + 86_400_000;
    expect(setCall.expireAt.getTime()).toBeGreaterThanOrEqual(
      expectedMin - 100
    );
  });

  it('allows exactly maxHits - 1 requests', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        count: 4,
        resetAt: Date.now() + 30_000,
      }),
    });
    const result = await rateLimit('test-key', 5, 60_000);
    expect(result).toBe(true);
  });
});
