'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import {
  onAuthChange,
  signInWithGoogle,
  signOut,
  ensureSessionCookie,
} from '@/lib/firebase/auth';

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
  const sessionSyncedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser: User | null) => {
      if (firebaseUser) {
        // Ensure the session cookie exists before exposing the user.
        // This avoids the race condition where the UI navigates to
        // an authenticated page before the cookie is set.
        if (!sessionSyncedRef.current) {
          try {
            await ensureSessionCookie(firebaseUser);
            sessionSyncedRef.current = true;
          } catch {
            // Cookie creation failed — treat as signed out
            setUser(null);
            setLoading(false);
            return;
          }
        }
        setUser(firebaseUser);
      } else {
        sessionSyncedRef.current = false;
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSignIn = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: handleSignIn,
      logOut: handleLogOut,
    }),
    [user, loading, handleSignIn, handleLogOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
