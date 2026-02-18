import {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut as firebaseSignOut,
    type User,
} from 'firebase/auth';
import { getClientAuth } from './config';

const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google using popup flow.
 * Returns the authenticated user immediately — no redirect needed.
 *
 * Note: The browser console may show a COOP (Cross-Origin-Opener-Policy)
 * warning because accounts.google.com sends `COOP: same-origin`. This is
 * a cosmetic warning — it does NOT block the sign-in. The popup closes
 * normally and the user credential is returned.
 *
 * We previously used signInWithRedirect to avoid this warning, but the
 * redirect flow has fundamental reliability issues in local development
 * (and sometimes in production) with Firebase v12+:
 * - Depends on Service Workers or cross-origin storage access
 * - getRedirectResult() often returns null after the redirect completes
 * - Race conditions between onAuthStateChanged and cookie creation
 */
export async function signInWithGoogle(): Promise<User> {
    const result = await signInWithPopup(getClientAuth(), googleProvider);
    return result.user;
}

/**
 * Ensure the server-side session cookie exists for the given user.
 * Called by AuthProvider every time onAuthStateChanged fires with a user,
 * guaranteeing that the cookie is set **before** any authenticated page
 * or API route is accessed.
 *
 * This replaces the old handleRedirectResult approach which suffered from
 * a race condition — onAuthStateChanged could fire before getRedirectResult
 * resolved, causing the UI to navigate to authenticated pages before the
 * cookie was created.
 */
export async function ensureSessionCookie(user: User): Promise<void> {
    const idToken = await user.getIdToken(true);
    const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
        throw new Error('Failed to create session cookie');
    }
}

export async function signOut(): Promise<void> {
    await firebaseSignOut(getClientAuth());
    // Clear auth cookie
    await fetch('/api/auth/verify', { method: 'DELETE' });
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(getClientAuth(), callback);
}

export async function getIdToken(): Promise<string | null> {
    const user = getClientAuth().currentUser;
    if (!user) return null;
    return user.getIdToken();
}
