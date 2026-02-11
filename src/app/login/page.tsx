'use client';

import { Suspense, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Shield } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

function LoginContent() {
    const { user, loading, signIn } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [signingIn, setSigningIn] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && user) {
            const raw = searchParams.get('redirect') || '/dashboard';
            const redirect = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
            router.replace(redirect);
        }
    }, [user, loading, router, searchParams]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[120px]" />
                <div className="absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
            </div>

            <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8 animate-fade-in">
                {/* Logo & Title */}
                <div className="flex flex-col items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card/50 backdrop-blur-sm animate-glow-pulse">
                        <Shield className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">ExamFlow</h1>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            Cybersecurity certification practice platform
                        </p>
                    </div>
                </div>

                {/* Sign In Card */}
                <div className="w-full rounded-2xl border border-border glass-panel p-8">
                    <button
                        onClick={async () => {
                            if (signingIn) return;
                            setSigningIn(true);
                            setError(null);
                            try {
                                await signIn();
                            } catch {
                                setError('Sign-in failed. Please try again.');
                            } finally {
                                setSigningIn(false);
                            }
                        }}
                        disabled={signingIn}
                        className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        {signingIn ? 'Signing in…' : 'Sign in with Google'}
                    </button>
                    {error && (
                        <p className="mt-3 text-center text-sm text-red-400 animate-fade-in">{error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                    <div className="h-px w-8 bg-border" />
                    <span>Secure authentication powered by Firebase</span>
                    <div className="h-px w-8 bg-border" />
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-background">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
                </div>
            }
        >
            <LoginContent />
        </Suspense>
    );
}
