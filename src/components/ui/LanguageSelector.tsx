'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { type Locale } from '@/i18n/routing';
import { useTransition } from 'react';

const LABELS: Record<Locale, string> = { en: 'EN', 'pt-BR': 'BR' };

/**
 * Inline language toggle — click to switch between en ↔ pt-BR.
 * No dropdown, no extra clicks. Clean pill design.
 */
export function LanguageSelector({
  variant = 'default',
}: {
  variant?: 'default' | 'minimal';
}) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const next: Locale = locale === 'en' ? 'pt-BR' : 'en';

  function toggle() {
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={toggle}
        disabled={isPending}
        className="bg-muted/50 flex items-center rounded-full p-0.5 text-[11px] font-semibold tracking-wide transition-all disabled:opacity-50"
        aria-label={`Switch to ${LABELS[next]}`}
      >
        <span
          className={`rounded-full px-2 py-0.5 transition-all duration-200 ${
            locale === 'en'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground'
          }`}
        >
          EN
        </span>
        <span
          className={`rounded-full px-2 py-0.5 transition-all duration-200 ${
            locale === 'pt-BR'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground'
          }`}
        >
          BR
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="border-border/60 bg-card/40 hover:border-border flex items-center rounded-full border p-0.5 text-xs font-semibold tracking-wide backdrop-blur-md transition-all disabled:opacity-50"
      aria-label={`Switch to ${LABELS[next]}`}
    >
      <span
        className={`rounded-full px-2.5 py-1 transition-all duration-200 ${
          locale === 'en'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        EN
      </span>
      <span
        className={`rounded-full px-2.5 py-1 transition-all duration-200 ${
          locale === 'pt-BR'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        BR
      </span>
    </button>
  );
}
