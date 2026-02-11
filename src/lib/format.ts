/**
 * Format utilities — locale-aware date/time formatting for UI display.
 */

type RelativeLabels = {
    justNow: string;
    min: (n: number) => string;
    hour: (n: number) => string;
    day: (n: number) => string;
};

const RELATIVE: Record<string, RelativeLabels> = {
    en: {
        justNow: 'just now',
        min: (n) => `${n}m ago`,
        hour: (n) => `${n}h ago`,
        day: (n) => `${n}d ago`,
    },
    'pt-BR': {
        justNow: 'agora',
        min: (n) => `há ${n}min`,
        hour: (n) => `há ${n}h`,
        day: (n) => `há ${n}d`,
    },
};

/**
 * Format a Firestore Timestamp or date string for display.
 */
export function formatDate(ts: unknown, locale = 'en'): string {
    if (!ts) return '—';
    const date = typeof ts === 'object' && ts !== null && 'seconds' in ts
        ? new Date((ts as { seconds: number }).seconds * 1000)
        : new Date(ts as string);
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

/**
 * Format a Firestore Timestamp as relative time (e.g. "2h ago", "há 3h").
 */
export function formatTimeAgo(ts: unknown, locale = 'en'): string {
    if (!ts) return '—';
    const date = typeof ts === 'object' && ts !== null && 'seconds' in ts
        ? new Date((ts as { seconds: number }).seconds * 1000)
        : new Date(ts as string);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const labels = RELATIVE[locale] ?? RELATIVE.en;
    if (diffMin < 1) return labels.justNow;
    if (diffMin < 60) return labels.min(diffMin);
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return labels.hour(diffH);
    const diffD = Math.floor(diffH / 24);
    if (diffD < 30) return labels.day(diffD);
    return formatDate(ts, locale);
}
