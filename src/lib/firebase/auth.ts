import {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithRedirect,
    getRedirectResult,
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
 * Check for redirect result on page load.
 * After signInWithRedirect the user is navigated away to Google and then
 * back; this function picks up the result and sets the auth cookie.
 * Call this once when the app initialises.
 */
export async function handleRedirectResult(): Promise<User | null> {
    try {
        const result = await getRedirectResult(getClientAuth());
        if (result?.user) {
            const idToken = await result.user.getIdToken();
            await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });
            return result.user;
        }
        return null;
    } catch {
        return null;
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
