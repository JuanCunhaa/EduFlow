import { getAdminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SESSION_EXPIRES_MS = 60 * 60 * 24 * 7 * 1000; // 7 days

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

        // Verify the ID token first
        await getAdminAuth().verifyIdToken(idToken);

        // Create a session cookie
        const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
            expiresIn: SESSION_EXPIRES_MS,
        });

        const cookieStore = await cookies();
        cookieStore.set('__session', sessionCookie, {
            maxAge: SESSION_EXPIRES_MS / 1000,
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
        });

        return NextResponse.json({ status: 'success' });
    } catch (error) {
        console.error('Auth verification failed:', error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
}

/**
 * DELETE /api/auth/verify
 * Clears the session cookie (sign out).
 */
export async function DELETE() {
    const cookieStore = await cookies();
    cookieStore.delete('__session');
    return NextResponse.json({ status: 'signed_out' });
}
