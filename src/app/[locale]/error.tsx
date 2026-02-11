'use client';

import { useTranslations } from 'next-intl';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
    const t = useTranslations('error');

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center space-y-4">
                <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
                <p className="text-muted-foreground text-sm">{t('description')}</p>
                <button
                    onClick={reset}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    {t('retry')}
                </button>
            </div>
        </div>
    );
}
