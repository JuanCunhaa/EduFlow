import {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut as firebaseSignOut,
    type User,
} from 'firebase/auth';
import { getClientAuth } from './config';

const googleProvider = new GoogleAuthProvider();

/** Prevents concurrent popup requests */
let popupInProgress = false;

export async function signInWithGoogle(): Promise<User> {
    if (popupInProgress) {
        throw new Error('Sign-in already in progress');
    }
    popupInProgress = true;

    try {
        const result = await signInWithPopup(getClientAuth(), googleProvider);
        // Set auth cookie via our API
        const idToken = await result.user.getIdToken();
        await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });
        return result.user;
    } catch (err: unknown) {
        // If popup was blocked, fall back to redirect-based sign-in
        const code = (err as { code?: string })?.code;
        if (code === 'auth/popup-blocked') {
            await signInWithRedirect(getClientAuth(), googleProvider);
            // signInWithRedirect navigates away, so this won't be reached
            throw err;
        }
        throw err;
    } finally {
        popupInProgress = false;
    }
}

/**
 * Check for redirect result on page load (for popup-blocked fallback).
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
