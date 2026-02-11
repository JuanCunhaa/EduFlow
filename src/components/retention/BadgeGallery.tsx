'use client';

import { useTranslations } from 'next-intl';
import type { BadgeId } from '@/types';

const BADGE_IDS: { id: BadgeId; emoji: string; labelKey: string; descKey: string }[] = [
    { id: 'first_exam', emoji: '🎓', labelKey: 'firstExam', descKey: 'firstExamDesc' },
    { id: 'streak_3', emoji: '🔥', labelKey: 'streak3', descKey: 'streak3Desc' },
    { id: 'streak_7', emoji: '⚡', labelKey: 'weekWarrior', descKey: 'weekWarriorDesc' },
    { id: 'streak_30', emoji: '💎', labelKey: 'monthlyMaster', descKey: 'monthlyMasterDesc' },
    { id: 'perfect_score', emoji: '🏆', labelKey: 'perfectScore', descKey: 'perfectScoreDesc' },
    { id: 'centurion', emoji: '💯', labelKey: 'centurion', descKey: 'centurionDesc' },
    { id: 'domain_master', emoji: '🎯', labelKey: 'domainMaster', descKey: 'domainMasterDesc' },
];

interface BadgeGalleryProps {
    earned: string[];
}

export function BadgeGallery({ earned = [] }: BadgeGalleryProps) {
    const t = useTranslations('badges');
    const earnedSet = new Set(earned);

    return (
        <div className="card-premium p-6">
            <h3 className="mb-4 text-sm font-bold text-foreground">
                {t('title')}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {earned.length}/{BADGE_IDS.length}
                </span>
            </h3>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {BADGE_IDS.map((badge) => {
                    const unlocked = earnedSet.has(badge.id);
                    return (
                        <div
                            key={badge.id}
                            className="group relative flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-all"
                            title={t(badge.descKey)}
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
                                {t(badge.labelKey)}
                            </span>
                            {/* Tooltip */}
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block rounded-lg border border-border glass-panel px-2.5 py-1.5 text-[10px] text-foreground whitespace-nowrap z-10 shadow-lg">
                                {t(badge.descKey)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
