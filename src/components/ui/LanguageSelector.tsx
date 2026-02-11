'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { Globe } from 'lucide-react';
import { useTransition, useState, useRef, useEffect } from 'react';

const FLAG: Record<Locale, string> = { en: '🇺🇸', 'pt-BR': '🇧🇷' };

export function LanguageSelector({ variant = 'default' }: { variant?: 'default' | 'minimal' }) {
    const t = useTranslations('language');
    const locale = useLocale() as Locale;
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function switchLocale(next: Locale) {
        setOpen(false);
        startTransition(() => {
            router.replace(pathname, { locale: next });
        });
    }

    if (variant === 'minimal') {
        return (
            <div ref={ref} className="relative">
                <button
                    onClick={() => setOpen(o => !o)}
                    disabled={isPending}
                    className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    aria-label={t('label')}
                >
                    <Globe size={14} />
                    {FLAG[locale]}
                </button>
                {open && (
                    <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-md border border-border bg-popover p-1 shadow-lg">
                        {routing.locales.map(l => (
                            <button
                                key={l}
                                onClick={() => switchLocale(l)}
                                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors ${
                                    l === locale ? 'bg-accent text-accent-foreground' : 'text-popover-foreground hover:bg-accent/50'
                                }`}
                            >
                                <span>{FLAG[l]}</span>
                                {t(l === 'pt-BR' ? 'ptBR' : l)}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                disabled={isPending}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                aria-label={t('label')}
            >
                <Globe size={16} />
                <span>{FLAG[locale]}</span>
                <span className="hidden sm:inline">{t(locale === 'pt-BR' ? 'ptBR' : locale)}</span>
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md border border-border bg-popover p-1 shadow-lg">
                    {routing.locales.map(l => (
                        <button
                            key={l}
                            onClick={() => switchLocale(l)}
                            className={`flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors ${
                                l === locale ? 'bg-accent text-accent-foreground' : 'text-popover-foreground hover:bg-accent/50'
                            }`}
                        >
                            <span>{FLAG[l]}</span>
                            {t(l === 'pt-BR' ? 'ptBR' : l)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
