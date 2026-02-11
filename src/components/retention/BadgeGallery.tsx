'use client';

import type { BadgeId } from '@/types';

interface BadgeDef {
    id: BadgeId;
    label: string;
    emoji: string;
    description: string;
}

const BADGES: BadgeDef[] = [
    { id: 'first_exam', label: 'First Exam', emoji: '🎓', description: 'Complete your first practice exam' },
    { id: 'streak_3', label: '3-Day Streak', emoji: '🔥', description: 'Study for 3 consecutive days' },
    { id: 'streak_7', label: 'Week Warrior', emoji: '⚡', description: 'Study for 7 consecutive days' },
    { id: 'streak_30', label: 'Monthly Master', emoji: '💎', description: 'Study for 30 consecutive days' },
    { id: 'perfect_score', label: 'Perfect Score', emoji: '🏆', description: 'Score 100% on any exam' },
    { id: 'centurion', label: 'Centurion', emoji: '💯', description: 'Answer 100 questions total' },
    { id: 'domain_master', label: 'Domain Master', emoji: '🎯', description: 'Score 70%+ in every domain on a single exam' },
];

interface BadgeGalleryProps {
    earned: string[];
}

export function BadgeGallery({ earned = [] }: BadgeGalleryProps) {
    const earnedSet = new Set(earned);

    return (
        <div className="card-premium p-6">
            <h3 className="mb-4 text-sm font-bold text-foreground">
                Badges
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {earned.length}/{BADGES.length}
                </span>
            </h3>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {BADGES.map((badge) => {
                    const unlocked = earnedSet.has(badge.id);
                    return (
                        <div
                            key={badge.id}
                            className="group relative flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-all"
                            title={badge.description}
                        >
                            <div
                                className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-all ${
                                    unlocked
                                        ? 'bg-primary/10 shadow-[0_0_12px_var(--glow)]'
                                        : 'bg-muted/30 grayscale opacity-30'
                                }`}
                            >
                                {badge.emoji}
                            </div>
                            <span className={`text-[10px] font-medium leading-tight ${
                                unlocked ? 'text-foreground' : 'text-muted-foreground/50'
                            }`}>
                                {badge.label}
                            </span>
                            {/* Tooltip */}
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block rounded-lg border border-border glass-panel px-2.5 py-1.5 text-[10px] text-foreground whitespace-nowrap z-10 shadow-lg">
                                {badge.description}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
