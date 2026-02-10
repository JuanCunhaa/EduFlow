import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Firestore-backed rate limiter — works consistently across serverless instances.
 * Uses a document per key with atomic increment and TTL-based expiry.
 *
 * P1 #5: Replaces the previous in-memory Map-based rate limiter
 * which was useless in serverless environments (each instance had its own Map).
 *
 * @returns `true` if allowed, `false` if rate-limited.
 */
export async function rateLimit(key: string, maxHits: number, windowMs: number): Promise<boolean> {
    const db = getAdminDb();
    const ref = db.collection('_rateLimits').doc(key);

    try {
        const result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const now = Date.now();

            if (!snap.exists) {
                tx.set(ref, { count: 1, resetAt: now + windowMs });
                return true;
            }

            const data = snap.data()!;
            const resetAt = data.resetAt as number;

            // Window expired — reset
            if (now > resetAt) {
                tx.set(ref, { count: 1, resetAt: now + windowMs });
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
        // On transaction failure, fail open (allow) to avoid blocking legitimate users
        console.error('Rate limit check failed:', error);
        return true;
    }
}
