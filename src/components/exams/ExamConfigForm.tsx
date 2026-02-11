'use client';

import { useState } from 'react';
import type { Difficulty, Study, StudyDomain, ExamMode } from '@/types';
import { useTranslations } from 'next-intl';
import { ChevronRight, Clock, BookOpen, Target, Zap, Layers } from 'lucide-react';

interface ExamConfigFormProps {
    /** Available studies — the user picks one */
    studies: Study[];
    /** Pre-selected study (e.g. active study from context) */
    activeStudyId?: string;
    onStart: (config: {
        studyId: string;
        questionCount: number;
        timeLimitMinutes: number;
        difficulty: Difficulty | 'all';
        domainIds: string[];
        mode: ExamMode;
    }) => Promise<void>;
    isLoading: boolean;
}

const QUESTION_COUNTS = [10, 25, 50, 100, 150];

const MODE_KEYS: ExamMode[] = ['practice', 'weak_domains', 'recent_misses', 'real_mix', 'domain_focus', 'spaced_review'];

const MODE_I18N_MAP: Record<ExamMode, { label: string; desc: string }> = {
    practice: { label: 'practice', desc: 'practiceDesc' },
    weak_domains: { label: 'weakDomains', desc: 'weakDomainsDesc' },
    recent_misses: { label: 'recentMisses', desc: 'recentMissesDesc' },
    real_mix: { label: 'realMix', desc: 'realMixDesc' },
    domain_focus: { label: 'domainFocus', desc: 'domainFocusDesc' },
    spaced_review: { label: 'spacedReview', desc: 'spacedReviewDesc' },
};

export function ExamConfigForm({ studies, activeStudyId, onStart, isLoading }: Readonly<ExamConfigFormProps>) {
    const t = useTranslations('examConfig');
    const tc = useTranslations('common');
    const [selectedStudyId, setSelectedStudyId] = useState(activeStudyId || studies[0]?.id || '');
    const [questionCount, setQuestionCount] = useState(25);
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(60);
    const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
    const [selectedDomainIds, setSelectedDomainIds] = useState<string[]>([]);
    const [mode, setMode] = useState<ExamMode>('practice');

    const currentStudy = studies.find((s) => s.id === selectedStudyId);
    const domains: StudyDomain[] = currentStudy?.domains || [];

    function toggleDomain(domainId: string) {
        setSelectedDomainIds((prev) =>
            prev.includes(domainId) ? prev.filter((x) => x !== domainId) : [...prev, domainId]
        );
    }

    return (
        <div className="mx-auto max-w-2xl space-y-10 animate-fade-in">
            {/* Study selection */}
            <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="h-px w-3 bg-primary/50" />
                    {t('study')}
                </h2>
                <div className="grid gap-2">
                    {studies.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => { setSelectedStudyId(s.id); setSelectedDomainIds([]); }}
                            className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ${selectedStudyId === s.id
                                ? 'border-primary/30 bg-primary/5 text-foreground shadow-[0_0_12px_var(--glow)]'
                                : 'border-border bg-card text-muted-foreground hover:border-border hover:bg-accent/30'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition-colors ${selectedStudyId === s.id
                                    ? 'bg-primary/20 text-primary'
                                    : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {s.abbreviation.slice(0, 2)}
                                </div>
                                <span className="text-sm font-medium">{s.name}</span>
                            </div>
                            {selectedStudyId === s.id && (
                                <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_var(--glow)]" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Exam Mode */}
            <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Layers className="h-3.5 w-3.5" /> {t('mode')}
                </h2>
                <div className="grid gap-2">
                    {MODE_KEYS.map((mValue) => {
                        const keys = MODE_I18N_MAP[mValue];
                        return (
                            <button
                                key={mValue}
                                onClick={() => setMode(mValue)}
                                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all duration-200 ${mode === mValue
                                    ? 'border-primary/30 bg-primary/5 text-foreground'
                                    : 'border-border bg-card text-muted-foreground hover:bg-accent/30'
                                    }`}
                            >
                                <div>
                                    <span className="text-sm font-medium">{t(keys.label)}</span>
                                    <p className="text-xs text-muted-foreground">{t(keys.desc)}</p>
                                </div>
                                {mode === mValue && (
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Question count */}
            <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <BookOpen className="h-3.5 w-3.5" /> {t('questions')}
                </h2>
                <div className="flex flex-wrap gap-2">
                    {QUESTION_COUNTS.map((n) => (
                        <button
                            key={n}
                            onClick={() => setQuestionCount(n)}
                            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${questionCount === n
                                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                : 'border border-border bg-card text-muted-foreground hover:bg-accent/30'
                                }`}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </div>

            {/* Time limit */}
            <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Clock className="h-3.5 w-3.5" /> {t('timeLimit')}
                </h2>
                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        min={10}
                        max={180}
                        step={5}
                        value={timeLimitMinutes}
                        onChange={(e) => setTimeLimitMinutes(Number.parseInt(e.target.value, 10))}
                        className="flex-1 accent-primary"
                        aria-label={t('timeLimitLabel')}
                    />
                    <span className="min-w-[4rem] text-right font-mono text-sm font-semibold text-foreground">
                        {timeLimitMinutes} {t('min')}
                    </span>
                </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Target className="h-3.5 w-3.5" /> {t('difficulty')}
                </h2>
                <div className="flex flex-wrap gap-2">
                    {(['all', 'easy', 'medium', 'hard'] as const).map((d) => (
                        <button
                            key={d}
                            onClick={() => setDifficulty(d)}
                            className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition-all duration-200 ${difficulty === d
                                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                : 'border border-border bg-card text-muted-foreground hover:bg-accent/30'
                                }`}
                        >
                            {d === 'all' ? tc('all') : tc(d)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Domains */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <Zap className="h-3.5 w-3.5" /> {t('domains')}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                        {selectedDomainIds.length === 0 ? t('allDomains') : t('selectedCount', { count: selectedDomainIds.length })}
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {domains.map((d) => (
                        <button
                            key={d.id}
                            onClick={() => toggleDomain(d.id)}
                            className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${selectedDomainIds.includes(d.id)
                                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                : 'border border-border bg-card text-muted-foreground hover:bg-accent/30'
                                }`}
                        >
                            {d.abbreviation}
                        </button>
                    ))}
                </div>
            </div>

            {/* Start button */}
            <button
                onClick={() =>
                    onStart({
                        studyId: selectedStudyId,
                        questionCount,
                        timeLimitMinutes,
                        difficulty,
                        domainIds: selectedDomainIds,
                        mode,
                    })
                }
                disabled={isLoading || !selectedStudyId}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
            >
                {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                ) : (
                    <>
                        {t('startExam')} <ChevronRight className="h-4 w-4" />
                    </>
                )}
            </button>
        </div>
    );
}
