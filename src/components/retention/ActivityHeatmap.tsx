'use client';

import { useTranslations } from 'next-intl';
import type { DailyRecord } from '@/types';

interface ActivityHeatmapProps {
    recentDays: DailyRecord[];
}

/**
 * GitHub-style contribution heatmap showing daily study activity.
 * Renders a grid of squares, one per day, colored by activity level.
 */
export function ActivityHeatmap({ recentDays }: ActivityHeatmapProps) {
    const t = useTranslations('heatmap');
    // Build a map of date → questions answered
    const activityMap = new Map<string, number>();
    let maxActivity = 1;
    for (const day of recentDays) {
        activityMap.set(day.date, day.questionsAnswered);
        if (day.questionsAnswered > maxActivity) maxActivity = day.questionsAnswered;
    }

    // Generate last 180 days (26 weeks)
    const days: Array<{ date: string; count: number; level: number }> = [];
    const today = new Date();

    for (let i = 179; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const count = activityMap.get(dateStr) || 0;
        const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / maxActivity) * 4));
        days.push({ date: dateStr, count, level });
    }

    // Organize into weeks (columns), starting from Sunday
    const weeks: typeof days[] = [];
    let currentWeek: typeof days = [];

    // Pad first week to align with day-of-week
    const firstDayOfWeek = new Date(days[0].date).getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push({ date: '', count: 0, level: -1 }); // placeholder
    }

    for (const day of days) {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }
    if (currentWeek.length > 0) {
        weeks.push(currentWeek);
    }

    const LEVEL_COLORS = [
        'bg-muted/30',                  // 0 — no activity
        'bg-emerald-900/50',            // 1
        'bg-emerald-700/60',            // 2
        'bg-emerald-500/70',            // 3
        'bg-emerald-400',               // 4
    ];

    const MONTH_LABELS = t.raw('months') as string[];

    // Determine month labels positions
    const monthPositions: Array<{ label: string; col: number }> = [];
    let lastMonth = -1;
    for (let col = 0; col < weeks.length; col++) {
        const firstRealDay = weeks[col].find(d => d.date);
        if (firstRealDay?.date) {
            const month = new Date(firstRealDay.date).getMonth();
            if (month !== lastMonth) {
                monthPositions.push({ label: MONTH_LABELS[month], col });
                lastMonth = month;
            }
        }
    }

    const totalActivity = recentDays.reduce((sum, d) => sum + d.questionsAnswered, 0);
    const activeDays = recentDays.filter(d => d.questionsAnswered > 0).length;

    return (
        <div className="card-premium p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground">{t('title')}</h3>
                <span className="text-xs text-muted-foreground">
                    {t('summary', { questions: totalActivity, days: activeDays })}
                </span>
            </div>

            {/* Month labels */}
            <div className="mb-1 flex text-[10px] text-muted-foreground/60">
                <div className="w-5 shrink-0" /> {/* spacer for day labels */}
                <div className="flex" style={{ gap: '2px' }}>
                    {weeks.map((_, col) => {
                        const monthLabel = monthPositions.find(m => m.col === col);
                        return (
                            <div key={col} className="w-[11px]" style={{ fontSize: '9px' }}>
                                {monthLabel?.label || ''}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Grid */}
            <div className="flex overflow-x-auto">
                {/* Day labels */}
                <div className="flex flex-col shrink-0 mr-[2px]" style={{ gap: '2px' }}>
                    {(t.raw('days') as string[]).map((label, i) => (
                        <div key={i} className="h-[11px] flex items-center text-[9px] text-muted-foreground/50 w-5">
                            {label}
                        </div>
                    ))}
                </div>

                {/* Weeks */}
                <div className="flex" style={{ gap: '2px' }}>
                    {weeks.map((week, wi) => (
                        <div key={wi} className="flex flex-col" style={{ gap: '2px' }}>
                            {week.map((day, di) => (
                                <div
                                    key={`${wi}-${di}`}
                                    className={`h-[11px] w-[11px] rounded-[2px] transition-colors ${
                                        day.level === -1
                                            ? 'bg-transparent'
                                            : LEVEL_COLORS[day.level]
                                    }`}
                                    title={day.date ? t('tooltip', { date: day.date, count: day.count }) : ''}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-end gap-1 text-[9px] text-muted-foreground/50">
                <span>{t('less')}</span>
                {LEVEL_COLORS.map((color, i) => (
                    <div key={i} className={`h-[9px] w-[9px] rounded-[1px] ${color}`} />
                ))}
                <span>{t('more')}</span>
            </div>
        </div>
    );
}
