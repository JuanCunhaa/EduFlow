import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock rate-limit ──────────────────────────────

const mockRateLimit = vi.fn();

vi.mock('@/lib/rate-limit', () => ({
    rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));

vi.mock('@/lib/logger', () => ({
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { checkScrapingSignals, addGuardHeaders } from '@/lib/scraping-guard';
import { NextResponse } from 'next/server';

// ── Helpers ──────────────────────────────────────

function makeRequest(overrides: {
    userAgent?: string;
    accept?: string;
    referer?: string;
    requestId?: string;
    url?: string;
} = {}): Request {
    const headers: Record<string, string> = {};
    if (overrides.userAgent) headers['user-agent'] = overrides.userAgent;
    if (overrides.accept) headers['accept'] = overrides.accept;
    if (overrides.referer) headers['referer'] = overrides.referer;
    if (overrides.requestId) headers['x-request-id'] = overrides.requestId;

    return new Request(overrides.url ?? 'http://localhost/api/questions', {
        method: 'GET',
        headers,
    });
}

describe('checkScrapingSignals', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // By default, rate limits pass
        mockRateLimit.mockResolvedValue(true);
    });

    // ── Header anomalies ─────────────────────────

    it('flags missing user-agent', async () => {
        const req = makeRequest({ accept: 'text/html', referer: 'http://localhost' });
        const result = await checkScrapingSignals(req, 'user-1');
        expect(result.reasons).toContain('missing_or_short_user_agent');
        expect(result.score).toBeGreaterThanOrEqual(25);
    });

    it('flags short user-agent', async () => {
        const req = makeRequest({
            userAgent: 'curl',
            accept: 'text/html',
            referer: 'http://localhost',
        });
        const result = await checkScrapingSignals(req, 'user-1');
        expect(result.reasons).toContain('missing_or_short_user_agent');
    });

    it('flags bot user-agent patterns', async () => {
        const req = makeRequest({
            userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)',
            accept: 'text/html',
            referer: 'http://localhost',
        });
        const result = await checkScrapingSignals(req, 'user-1');
        expect(result.reasons).toContain('bot_user_agent');
        expect(result.score).toBeGreaterThanOrEqual(30);
    });

    it('flags generic accept header', async () => {
        const req = makeRequest({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            accept: '*/*',
            referer: 'http://localhost',
        });
        const result = await checkScrapingSignals(req, 'user-1');
        expect(result.reasons).toContain('generic_accept_header');
    });

    it('flags missing referer', async () => {
        const req = makeRequest({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            accept: 'text/html',
        });
        const result = await checkScrapingSignals(req, 'user-1');
        expect(result.reasons).toContain('missing_referer');
    });

    it('flags suspicious request-id length', async () => {
        const req = makeRequest({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            accept: 'text/html',
            referer: 'http://localhost',
            requestId: 'x'.repeat(100),
        });
        const result = await checkScrapingSignals(req, 'user-1');
        expect(result.reasons).toContain('suspicious_request_id_length');
    });

    // ── Sequential paging detection ──────────────

    it('flags high limit with cursor (sequential paging)', async () => {
        const req = makeRequest({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            accept: 'text/html',
            referer: 'http://localhost',
            url: 'http://localhost/api/questions?cursor=abc123&limit=100',
        });
        const result = await checkScrapingSignals(req, 'user-1');
        expect(result.reasons).toContain('high_limit_with_cursor');
    });

    it('does not flag low limit with cursor', async () => {
        const req = makeRequest({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            accept: 'text/html',
            referer: 'http://localhost',
            url: 'http://localhost/api/questions?cursor=abc123&limit=25',
        });
        const result = await checkScrapingSignals(req, 'user-1');
        expect(result.reasons).not.toContain('high_limit_with_cursor');
    });

    // ── Filter enumeration ───────────────────────

    it('flags excessive filter params', async () => {
        const req = makeRequest({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            accept: 'text/html',
            referer: 'http://localhost',
            url: 'http://localhost/api/questions?a=1&b=2&c=3&d=4',
        });
        const result = await checkScrapingSignals(req, 'user-1');
        expect(result.reasons).toContain('excessive_filter_params');
    });

    // ── Rate limiting ────────────────────────────

    it('flags minute rate limit exceeded', async () => {
        mockRateLimit.mockImplementation(async (key: string) => {
            if (key.includes(':min')) return false;
            return true;
        });

        const req = makeRequest({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            accept: 'text/html',
            referer: 'http://localhost',
        });
        const result = await checkScrapingSignals(req, 'user-1');
        expect(result.reasons).toContain('rate_limit_minute_exceeded');
        expect(result.score).toBeGreaterThanOrEqual(30);
    });

    it('flags hour rate limit exceeded', async () => {
        mockRateLimit.mockImplementation(async (key: string) => {
            if (key.includes(':hr')) return false;
            return true;
        });

        const req = makeRequest({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            accept: 'text/html',
            referer: 'http://localhost',
        });
        const result = await checkScrapingSignals(req, 'user-1');
        expect(result.reasons).toContain('rate_limit_hour_exceeded');
    });

    // ── Blocking threshold ───────────────────────

    it('blocks when score >= blockThreshold', async () => {
        // No UA, no Accept, no Referer → 25 + 15 + 10 = 50
        // + minute rate limit exceeded → +30 = 80 → blocked at default 70
        mockRateLimit.mockImplementation(async (key: string) => {
            if (key.includes(':min')) return false;
            return true;
        });

        const req = makeRequest({}); // no headers at all
        const result = await checkScrapingSignals(req, 'user-1');
        expect(result.blocked).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it('does not block normal browser requests', async () => {
        const req = makeRequest({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120',
            accept: 'text/html,application/xhtml+xml',
            referer: 'http://localhost/dashboard',
        });
        const result = await checkScrapingSignals(req, 'user-1');
        expect(result.blocked).toBe(false);
        expect(result.score).toBeLessThan(70);
    });

    // ── Fingerprint ──────────────────────────────

    it('generates a deterministic fingerprint for same inputs', async () => {
        const req1 = makeRequest({
            userAgent: 'Mozilla/5.0',
            accept: 'text/html',
            referer: 'http://localhost',
        });
        const req2 = makeRequest({
            userAgent: 'Mozilla/5.0',
            accept: 'text/html',
            referer: 'http://localhost',
        });

        const result1 = await checkScrapingSignals(req1, 'user-1');
        const result2 = await checkScrapingSignals(req2, 'user-1');
        expect(result1.fingerprint).toBe(result2.fingerprint);
    });

    it('produces different fingerprints for different users', async () => {
        const req = makeRequest({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            accept: 'text/html',
            referer: 'http://localhost',
        });

        const result1 = await checkScrapingSignals(req, 'user-1');
        const result2 = await checkScrapingSignals(req, 'user-2');
        expect(result1.fingerprint).not.toBe(result2.fingerprint);
    });

    it('fingerprint starts with "fp_"', async () => {
        const req = makeRequest({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            accept: 'text/html',
            referer: 'http://localhost',
        });
        const result = await checkScrapingSignals(req, 'user-1');
        expect(result.fingerprint).toMatch(/^fp_/);
    });

    // ── Custom options ───────────────────────────

    it('respects custom blockThreshold', async () => {
        const req = makeRequest({}); // score ~50 (no UA, no Accept, no Referer)
        const result = await checkScrapingSignals(req, 'user-1', { blockThreshold: 40 });
        expect(result.blocked).toBe(true);
    });

    it('respects custom rate limit values', async () => {
        mockRateLimit.mockResolvedValue(true);
        const req = makeRequest({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            accept: 'text/html',
            referer: 'http://localhost',
        });
        await checkScrapingSignals(req, 'user-1', {
            maxRequestsPerMinute: 10,
            maxRequestsPerHour: 50,
        });
        // Verify rate limit was called with custom values
        expect(mockRateLimit).toHaveBeenCalledWith(
            expect.stringContaining(':min'),
            10,
            60_000,
            true
        );
        expect(mockRateLimit).toHaveBeenCalledWith(
            expect.stringContaining(':hr'),
            50,
            3_600_000,
            true
        );
    });
});

// ── addGuardHeaders ──────────────────────────────

describe('addGuardHeaders', () => {
    it('adds X-Request-Fingerprint header', () => {
        const response = NextResponse.json({ data: 'ok' });
        const signals = {
            score: 10,
            reasons: [],
            fingerprint: 'fp_abc123',
            blocked: false,
        };
        const result = addGuardHeaders(response, signals);
        expect(result.headers.get('X-Request-Fingerprint')).toBe('fp_abc123');
    });
});
