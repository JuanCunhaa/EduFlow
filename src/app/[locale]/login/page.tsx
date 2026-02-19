'use client';

import { Suspense, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useEffect } from 'react';

function LoginContent() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('login');
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      const raw = searchParams.get('redirect') || '/dashboard';
      const redirect =
        raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
      router.replace(redirect);
    }
  }, [user, loading, router, searchParams]);

  if (loading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="border-muted-foreground border-t-primary h-8 w-8 animate-spin rounded-full border-2" />
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-primary/8 absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]" />
        <div className="bg-primary/5 absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full blur-[100px]" />
      </div>

      <div className="animate-fade-in relative z-10 flex w-full max-w-sm flex-col items-center gap-8">
        {/* Logo & Title */}
        <div className="flex flex-col items-center gap-4">
          <div className="animate-glow-pulse flex h-16 w-16 items-center justify-center rounded-2xl">
            <img
              src="/images/logo.png"
              alt="ExamFlow"
              width={64}
              height={64}
              className="h-16 w-16 rounded-2xl"
            />
          </div>
          <div className="text-center">
            <h1 className="text-foreground text-2xl font-bold tracking-tight">
              {t('brand')}
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {t('tagline')}
            </p>
          </div>
        </div>

        {/* Sign In Card */}
        <div className="border-border glass-panel w-full rounded-2xl border p-8">
          <button
            onClick={async () => {
              if (signingIn) return;
              setSigningIn(true);
              setError(null);
              try {
                await signIn();
              } catch (err) {
                // Don't show error if user just closed the popup
                const code = (err as { code?: string })?.code;
                if (
                  code !== 'auth/popup-closed-by-user' &&
                  code !== 'auth/cancelled-popup-request'
                ) {
                  setError(t('error'));
                }
              } finally {
                setSigningIn(false);
              }
            }}
            disabled={signingIn}
            className="from-primary to-primary/80 text-primary-foreground shadow-primary/20 hover:shadow-primary/30 flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r px-4 py-3 text-sm font-semibold shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:pointer-events-none disabled:opacity-60"
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
            {signingIn ? t('signingIn') : t('signInGoogle')}
          </button>
          {error && (
            <p className="animate-fade-in mt-3 text-center text-sm text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="text-muted-foreground/60 flex items-center gap-2 text-xs">
          <div className="bg-border h-px w-8" />
          <span>{t('poweredBy')}</span>
          <div className="bg-border h-px w-8" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-screen items-center justify-center">
          <div className="border-muted-foreground border-t-primary h-8 w-8 animate-spin rounded-full border-2" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
