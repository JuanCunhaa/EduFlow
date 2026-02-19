'use client';

import { useTranslations } from 'next-intl';

export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const t = useTranslations('error');

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <h2 className="text-foreground text-xl font-semibold">{t('title')}</h2>
        <p className="text-muted-foreground text-sm">{t('description')}</p>
        <button
          onClick={reset}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          {t('retry')}
        </button>
      </div>
    </div>
  );
}
