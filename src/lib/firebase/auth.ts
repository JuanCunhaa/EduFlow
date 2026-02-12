import {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithRedirect,
    signOut as firebaseSignOut,
    type User,
} from 'firebase/auth';
import { getClientAuth } from './config';

const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google using redirect flow.
 * This avoids the Cross-Origin-Opener-Policy issue that occurs with
 * signInWithPopup — Google's accounts.google.com returns a strict COOP
 * header that prevents the SDK from polling window.closed on the popup.
 * The redirect flow navigates the current page instead, so COOP is irrelevant.
 */
export async function signInWithGoogle(): Promise<void> {
    await signInWithRedirect(getClientAuth(), googleProvider);
    // signInWithRedirect navigates away; execution won't continue past here.
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
    const idToken = await user.getIdToken();
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
