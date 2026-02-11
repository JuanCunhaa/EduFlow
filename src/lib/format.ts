/**
 * Format utilities — date/time formatting for UI display.
 */

/**
 * Format a Firestore Timestamp or date string for display.
 */
export function formatDate(ts: unknown): string {
    if (!ts) return '—';
    const date = typeof ts === 'object' && ts !== null && 'seconds' in ts
        ? new Date((ts as { seconds: number }).seconds * 1000)
        : new Date(ts as string);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a Firestore Timestamp as relative time (e.g. "2h ago", "3d ago").
 */
export function formatTimeAgo(ts: unknown): string {
    if (!ts) return '—';
    const date = typeof ts === 'object' && ts !== null && 'seconds' in ts
        ? new Date((ts as { seconds: number }).seconds * 1000)
        : new Date(ts as string);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 30) return `${diffD}d ago`;
    return formatDate(ts);
}
