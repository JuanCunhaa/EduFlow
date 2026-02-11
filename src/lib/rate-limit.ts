import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

/**
 * Firestore-backed rate limiter — works consistently across serverless instances.
 * Uses a document per key with atomic increment and TTL-based expiry.
 *
 * Includes:
 * - TTL field (`expireAt`) for Firestore TTL policy auto-cleanup
 * - Configurable fail behavior (open vs closed)
 *
 * Firestore TTL policy should be set on `_rateLimits` collection
 * for the `expireAt` field to auto-delete expired documents.
 *
 * @param key - Unique rate limit key (e.g., `exam-create:${uid}`)
 * @param maxHits - Maximum allowed requests in the window
 * @param windowMs - Time window in milliseconds
 * @param failOpen - If true, allows on error (default: true for reads, false for sensitive ops)
 * @returns `true` if allowed, `false` if rate-limited.
 */
export async function rateLimit(
    key: string,
    maxHits: number,
    windowMs: number,
    failOpen = true
): Promise<boolean> {
    const db = getAdminDb();
    const ref = db.collection('_rateLimits').doc(key);

    try {
        const result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const now = Date.now();

            // TTL expiry date for Firestore TTL policy auto-cleanup
            const expireAt = new Date(now + windowMs + 86_400_000); // window + 24h buffer

            if (!snap.exists) {
                tx.set(ref, { count: 1, resetAt: now + windowMs, expireAt });
                return true;
            }

            const data = snap.data()!;
            const resetAt = data.resetAt as number;

            // Window expired — reset
            if (now > resetAt) {
                tx.set(ref, { count: 1, resetAt: now + windowMs, expireAt });
                return true;
            }

            // Within window — check limit
            if ((data.count as number) >= maxHits) {
                return false;
            }

            tx.update(ref, { count: FieldValue.increment(1) });
            return true;
        });

        return result;
    } catch (error) {
        logger.error('Rate limit check failed', { error });

        // Configurable fail behavior:
        // - failOpen=true: allow (avoid blocking legitimate users on infra issues)
        // - failOpen=false: deny (for sensitive operations like exam creation)
        return failOpen;
    }
}
