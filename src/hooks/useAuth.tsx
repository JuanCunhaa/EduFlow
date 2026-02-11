'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthChange, signInWithGoogle, signOut, handleRedirectResult } from '@/lib/firebase/auth';

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    signIn: () => Promise<void>;
    logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthChange((firebaseUser: User | null) => {
            setUser(firebaseUser);
            setLoading(false);
        });
        // Check for redirect result (fallback for popup-blocked)
        handleRedirectResult().catch(() => {});
        return unsubscribe;
    }, []);

    const handleSignIn = useCallback(async () => {
        try {
            await signInWithGoogle();
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code;
            // Silently ignore cancelled-popup — user closed it or a duplicate was suppressed
            if (code === 'auth/cancelled-popup-request' || code === 'auth/popup-closed-by-user') {
                return;
            }
            // popup-blocked is handled internally via redirect fallback
            if (code === 'auth/popup-blocked') {
                return;
            }
            console.error('Sign-in failed:', err);
            throw err;
        }
    }, []);

    const handleLogOut = useCallback(async () => {
        try {
            await signOut();
            setUser(null);
        } catch (err) {
            console.error('Sign-out failed:', err);
            throw err;
        }
    }, []);

    const value = useMemo<AuthContextValue>(() => ({
        user,
        loading,
        signIn: handleSignIn,
        logOut: handleLogOut,
    }), [user, loading, handleSignIn, handleLogOut]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
