import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatDate, formatTimeAgo } from '@/lib/format';

// ── formatDate ───────────────────────────────────

describe('formatDate', () => {
    it('returns "—" for null/undefined', () => {
        expect(formatDate(null)).toBe('—');
        expect(formatDate(undefined)).toBe('—');
        expect(formatDate('')).toBe('—');
    });

    it('formats a Firestore Timestamp object', () => {
        // Jan 15, 2026 UTC
        const ts = { seconds: 1768521600 };
        const result = formatDate(ts);
        expect(result).toMatch(/Jan\s+15/);
    });

    it('formats an ISO date string', () => {
        const result = formatDate('2025-07-04T12:00:00Z');
        expect(result).toMatch(/Jul\s+4/);
    });

    it('formats a date string with month/day correctly', () => {
        // Use midday UTC to avoid timezone boundary issues
        const result = formatDate('2025-12-25T12:00:00Z');
        expect(result).toMatch(/Dec\s+25/);
    });

    it('returns locale-formatted string with short month', () => {
        const result = formatDate('2025-03-01T10:00:00Z');
        expect(result).toMatch(/Mar/);
    });
});

// ── formatTimeAgo ────────────────────────────────

describe('formatTimeAgo', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns "—" for null/undefined', () => {
        expect(formatTimeAgo(null)).toBe('—');
        expect(formatTimeAgo(undefined)).toBe('—');
        expect(formatTimeAgo('')).toBe('—');
    });

    it('returns "just now" for < 1 minute ago', () => {
        const now = Date.now();
        vi.spyOn(Date, 'now').mockReturnValue(now);
        const ts = { seconds: Math.floor((now - 30_000) / 1000) }; // 30s ago
        expect(formatTimeAgo(ts)).toBe('just now');
    });

    it('returns minutes ago for < 60 minutes', () => {
        const now = Date.now();
        vi.spyOn(Date, 'now').mockReturnValue(now);
        const ts = { seconds: Math.floor((now - 5 * 60_000) / 1000) }; // 5m ago
        expect(formatTimeAgo(ts)).toBe('5m ago');
    });

    it('returns hours ago for < 24 hours', () => {
        const now = Date.now();
        vi.spyOn(Date, 'now').mockReturnValue(now);
        const ts = { seconds: Math.floor((now - 3 * 3_600_000) / 1000) }; // 3h ago
        expect(formatTimeAgo(ts)).toBe('3h ago');
    });

    it('returns days ago for < 30 days', () => {
        const now = Date.now();
        vi.spyOn(Date, 'now').mockReturnValue(now);
        const ts = { seconds: Math.floor((now - 7 * 86_400_000) / 1000) }; // 7d ago
        expect(formatTimeAgo(ts)).toBe('7d ago');
    });

    it('falls back to formatDate for >= 30 days', () => {
        const now = Date.now();
        vi.spyOn(Date, 'now').mockReturnValue(now);
        const ts = { seconds: Math.floor((now - 45 * 86_400_000) / 1000) }; // 45d ago
        const result = formatTimeAgo(ts);
        // Should return a formatted date string (e.g. "May 20"), not "Xd ago"
        expect(result).not.toContain('d ago');
        expect(result).not.toBe('—');
    });

    it('works with ISO date strings', () => {
        const now = Date.now();
        vi.spyOn(Date, 'now').mockReturnValue(now);
        const twoHoursAgo = new Date(now - 2 * 3_600_000).toISOString();
        expect(formatTimeAgo(twoHoursAgo)).toBe('2h ago');
    });

    it('returns "1m ago" at exactly 1 minute', () => {
        const now = Date.now();
        vi.spyOn(Date, 'now').mockReturnValue(now);
        const ts = { seconds: Math.floor((now - 60_000) / 1000) };
        expect(formatTimeAgo(ts)).toBe('1m ago');
    });

    it('returns "1h ago" at exactly 1 hour', () => {
        const now = Date.now();
        vi.spyOn(Date, 'now').mockReturnValue(now);
        const ts = { seconds: Math.floor((now - 3_600_000) / 1000) };
        expect(formatTimeAgo(ts)).toBe('1h ago');
    });

    it('returns "1d ago" at exactly 1 day', () => {
        const now = Date.now();
        vi.spyOn(Date, 'now').mockReturnValue(now);
        const ts = { seconds: Math.floor((now - 86_400_000) / 1000) };
        expect(formatTimeAgo(ts)).toBe('1d ago');
    });
});
