import { getAdminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const SESSION_EXPIRES_MS = 60 * 60 * 24 * 7 * 1000; // 7 days
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * POST /api/auth/verify
 * Receives a Firebase ID token, creates a session cookie, and sets it.
 */
export async function POST(request: Request) {
    try {
        const { idToken } = await request.json();

        if (!idToken || typeof idToken !== 'string') {
            return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
        }

        // Verify the ID token
        await getAdminAuth().verifyIdToken(idToken);

        // Create the session cookie
        const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
            expiresIn: SESSION_EXPIRES_MS,
        });

        const cookieStore = await cookies();
        cookieStore.set('__session', sessionCookie, {
            maxAge: SESSION_EXPIRES_MS / 1000,
            httpOnly: true,
            secure: IS_PRODUCTION,
            sameSite: 'lax',
            path: '/',
        });

        return NextResponse.json({ status: 'success' });
    } catch (error) {
        logger.error('Auth verification failed', { error });
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
}

/**
 * DELETE /api/auth/verify
 * Clears the session cookie and revokes refresh tokens (full sign out).
 */
export async function DELETE() {
    const cookieStore = await cookies();

    // Attempt to revoke refresh tokens for the current user
    const sessionCookie = cookieStore.get('__session')?.value;
    if (sessionCookie) {
        try {
            const decoded = await getAdminAuth().verifySessionCookie(sessionCookie);
            await getAdminAuth().revokeRefreshTokens(decoded.uid);
        } catch {
            // Session may already be invalid — just clear the cookie
        }
    }

    cookieStore.delete('__session');
    return NextResponse.json({ status: 'signed_out' });
}
