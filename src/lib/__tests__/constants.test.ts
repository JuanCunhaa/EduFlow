import { describe, it, expect } from 'vitest';
import {
    DECAY_HALF_LIFE_DAYS,
    DECAY_LAMBDA,
    WEAK_DOMAIN_RATIO,
    WEAK_DOMAIN_THRESHOLD,
    REAL_MIX_DIFFICULTY,
    RECENT_EXAM_WINDOW,
    GRACE_PERIOD_SECONDS,
    DAILY_CHALLENGE_COUNT,
    HEATMAP_ROLLING_DAYS,
    EXAM_CREATE_RATE_LIMIT,
    ANSWER_SAVE_RATE_LIMIT,
} from '@/lib/constants';

describe('constants', () => {
    // ── Exam Engine ──────────────────────────────

    it('DECAY_HALF_LIFE_DAYS is a positive integer', () => {
        expect(DECAY_HALF_LIFE_DAYS).toBe(7);
        expect(Number.isInteger(DECAY_HALF_LIFE_DAYS)).toBe(true);
    });

    it('DECAY_LAMBDA follows ln(2)/halfLife formula', () => {
        const expected = Math.LN2 / DECAY_HALF_LIFE_DAYS;
        expect(DECAY_LAMBDA).toBeCloseTo(expected, 10);
    });

    it('WEAK_DOMAIN_RATIO is between 0 and 1', () => {
        expect(WEAK_DOMAIN_RATIO).toBe(0.7);
        expect(WEAK_DOMAIN_RATIO).toBeGreaterThan(0);
        expect(WEAK_DOMAIN_RATIO).toBeLessThanOrEqual(1);
    });

    it('WEAK_DOMAIN_THRESHOLD is between 0 and 1', () => {
        expect(WEAK_DOMAIN_THRESHOLD).toBe(0.7);
        expect(WEAK_DOMAIN_THRESHOLD).toBeGreaterThan(0);
        expect(WEAK_DOMAIN_THRESHOLD).toBeLessThanOrEqual(1);
    });

    it('REAL_MIX_DIFFICULTY sums to 1.0', () => {
        const sum = Object.values(REAL_MIX_DIFFICULTY).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0);
    });

    it('REAL_MIX_DIFFICULTY has easy/medium/hard keys', () => {
        expect(REAL_MIX_DIFFICULTY).toHaveProperty('easy');
        expect(REAL_MIX_DIFFICULTY).toHaveProperty('medium');
        expect(REAL_MIX_DIFFICULTY).toHaveProperty('hard');
    });

    it('REAL_MIX_DIFFICULTY values are positive', () => {
        for (const val of Object.values(REAL_MIX_DIFFICULTY)) {
            expect(val).toBeGreaterThan(0);
        }
    });

    it('RECENT_EXAM_WINDOW is a positive integer', () => {
        expect(RECENT_EXAM_WINDOW).toBe(3);
        expect(Number.isInteger(RECENT_EXAM_WINDOW)).toBe(true);
    });

    // ── Exam Service ─────────────────────────────

    it('GRACE_PERIOD_SECONDS is positive', () => {
        expect(GRACE_PERIOD_SECONDS).toBe(30);
        expect(GRACE_PERIOD_SECONDS).toBeGreaterThan(0);
    });

    // ── Stats ────────────────────────────────────

    it('DAILY_CHALLENGE_COUNT is a positive integer', () => {
        expect(DAILY_CHALLENGE_COUNT).toBe(5);
        expect(Number.isInteger(DAILY_CHALLENGE_COUNT)).toBe(true);
    });

    it('HEATMAP_ROLLING_DAYS is a positive integer', () => {
        expect(HEATMAP_ROLLING_DAYS).toBe(180);
        expect(Number.isInteger(HEATMAP_ROLLING_DAYS)).toBe(true);
    });

    // ── Rate Limits ──────────────────────────────

    it('EXAM_CREATE_RATE_LIMIT is a positive integer', () => {
        expect(EXAM_CREATE_RATE_LIMIT).toBe(5);
        expect(Number.isInteger(EXAM_CREATE_RATE_LIMIT)).toBe(true);
    });

    it('ANSWER_SAVE_RATE_LIMIT is a positive integer', () => {
        expect(ANSWER_SAVE_RATE_LIMIT).toBe(60);
        expect(Number.isInteger(ANSWER_SAVE_RATE_LIMIT)).toBe(true);
    });
});
