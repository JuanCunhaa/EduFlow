import {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut as firebaseSignOut,
    type User,
} from 'firebase/auth';
import { getClientAuth } from './config';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User> {
    const result = await signInWithPopup(getClientAuth(), googleProvider);
    // Set auth cookie via our API
    const idToken = await result.user.getIdToken();
    await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
    });
    return result.user;
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
