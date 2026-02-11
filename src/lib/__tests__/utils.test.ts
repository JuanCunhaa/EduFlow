import { describe, it, expect } from 'vitest';
import { secureRandom, cn } from '@/lib/utils';

// ── secureRandom ─────────────────────────────────

describe('secureRandom', () => {
    it('returns a number in [0, 1)', () => {
        for (let i = 0; i < 100; i++) {
            const val = secureRandom();
            expect(val).toBeGreaterThanOrEqual(0);
            expect(val).toBeLessThan(1);
        }
    });

    it('returns different values across calls (not constant)', () => {
        const values = new Set<number>();
        for (let i = 0; i < 50; i++) {
            values.add(secureRandom());
        }
        // With 50 random floats, collisions are astronomically unlikely
        expect(values.size).toBeGreaterThan(45);
    });

    it('returns a finite number', () => {
        const val = secureRandom();
        expect(Number.isFinite(val)).toBe(true);
        expect(Number.isNaN(val)).toBe(false);
    });
});

// ── cn (className merger) ────────────────────────

describe('cn', () => {
    it('merges class names', () => {
        const result = cn('px-4', 'py-2');
        expect(result).toContain('px-4');
        expect(result).toContain('py-2');
    });

    it('handles conditional classes', () => {
        const result = cn('base', false && 'hidden', 'extra');
        expect(result).toContain('base');
        expect(result).toContain('extra');
        expect(result).not.toContain('hidden');
    });

    it('resolves Tailwind conflicts (last wins)', () => {
        const result = cn('px-4', 'px-8');
        expect(result).toBe('px-8');
    });

    it('handles undefined and null inputs', () => {
        const result = cn('base', undefined, null, 'end');
        expect(result).toContain('base');
        expect(result).toContain('end');
    });

    it('returns empty string for no inputs', () => {
        expect(cn()).toBe('');
    });

    it('deduplicates identical classes', () => {
        const result = cn('flex', 'flex');
        expect(result).toBe('flex');
    });
});
