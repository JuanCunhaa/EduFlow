'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Difficulty, Study, StudyDomain, ExamMode } from '@/types';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight, Clock, BookOpen, Target, Zap, Rocket, Settings2 } from 'lucide-react';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { FeatureLock } from '@/components/ui/FeatureLock';

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

// ── Smart Practice defaults ────────────────────────
const SMART_DEFAULTS = {
    mode: 'real_mix' as ExamMode,
    questionCount: 25,
    timeLimitMinutes: 60,
    difficulty: 'all' as const,
    domainIds: [] as string[],
};

// ── Advanced mode tiles (reduced from 6 to 3) ─────
type ModeTile = {
    engineMode: ExamMode;
    label: string;
    desc: string;
    proOnly: boolean;
};

const ADVANCED_MODES: ModeTile[] = [
    { engineMode: 'domain_focus', label: 'domainFocus', desc: 'domainFocusDesc', proOnly: false },
    { engineMode: 'weak_domains', label: 'weakAreas', desc: 'weakAreasDesc', proOnly: true },
    { engineMode: 'spaced_review', label: 'spacedReview', desc: 'spacedReviewDesc', proOnly: true },
];

const QUESTION_COUNTS = [10, 25, 50];
const TIME_LIMITS = [30, 60, 90];

const STORAGE_KEY = 'examflow:advanced-config';

interface SavedConfig {
    mode: ExamMode;
    questionCount: number;
    timeLimitMinutes: number;
    difficulty: Difficulty | 'all';
}

function loadSavedConfig(): SavedConfig | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as SavedConfig;
    } catch {
        return null;
    }
}

function saveConfig(config: SavedConfig): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch { /* localStorage full or unavailable — ignore */ }
}

export function ExamConfigForm({ studies, activeStudyId, onStart, isLoading }: Readonly<ExamConfigFormProps>) {
    const t = useTranslations('examConfig');
    const tc = useTranslations('common');
    const { isModeAllowed, maxQuestionsPerExam, isFree } = usePlanLimits();

    const [selectedStudyId, setSelectedStudyId] = useState(activeStudyId || studies[0]?.id || '');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Advanced config — initialize from localStorage or defaults
    const [mode, setMode] = useState<ExamMode>('domain_focus');
    const [questionCount, setQuestionCount] = useState(25);
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(60);
    const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
    const [selectedDomainIds, setSelectedDomainIds] = useState<string[]>([]);

    // Restore saved advanced config on mount
    useEffect(() => {
        const saved = loadSavedConfig();
        if (saved) {
            setMode(saved.mode);
            setQuestionCount(saved.questionCount);
            setTimeLimitMinutes(saved.timeLimitMinutes);
            setDifficulty(saved.difficulty);
        }
    }, []);

    // Persist advanced config whenever it changes
    useEffect(() => {
        saveConfig({ mode, questionCount, timeLimitMinutes, difficulty });
    }, [mode, questionCount, timeLimitMinutes, difficulty]);

    const currentStudy = studies.find((s) => s.id === selectedStudyId);
    const domains: StudyDomain[] = currentStudy?.domains || [];

    const toggleDomain = useCallback((domainId: string) => {
        setSelectedDomainIds((prev) =>
            prev.includes(domainId) ? prev.filter((x) => x !== domainId) : [...prev, domainId]
        );
    }, []);

    const handleQuickStart = () => {
        if (!selectedStudyId) return;
        onStart({
            studyId: selectedStudyId,
            ...SMART_DEFAULTS,
        });
    };

    const handleAdvancedStart = () => {
        if (!selectedStudyId) return;
        onStart({
            studyId: selectedStudyId,
            questionCount,
            timeLimitMinutes,
            difficulty,
            domainIds: selectedDomainIds,
            mode,
        });
    };

    return (
        <div className="mx-auto max-w-2xl space-y-8 animate-fade-in">
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

            {/* Quick Start — Smart Practice */}
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                        <Rocket className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-foreground">{t('smartPractice')}</h3>
                        <p className="text-xs text-muted-foreground">{t('smartPracticeDesc')}</p>
                    </div>
                </div>
                <button
                    onClick={handleQuickStart}
                    disabled={isLoading || !selectedStudyId}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
                >
                    {isLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    ) : (
                        <>
                            {t('startNow')} <ChevronRight className="h-4 w-4" />
                        </>
                    )}
                </button>
            </div>

            {/* Advanced Options — Collapsed accordion */}
            <div className="space-y-4">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex w-full items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Settings2 className="h-4 w-4" />
                    {t('customize')}
                    <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
                </button>

                {showAdvanced && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Mode tiles */}
                        <div className="space-y-3">
                            <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <div className="h-px w-3 bg-primary/50" />
                                {t('mode')}
                            </h2>
                            <div className="grid gap-2">
                                {ADVANCED_MODES.map((tile) => {
                                    const locked = !isModeAllowed(tile.engineMode);
                                    const modeButton = (
                                        <button
                                            key={tile.engineMode}
                                            onClick={() => !locked && setMode(tile.engineMode)}
                                            disabled={locked}
                                            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all duration-200 ${mode === tile.engineMode
                                                ? 'border-primary/30 bg-primary/5 text-foreground'
                                                : 'border-border bg-card text-muted-foreground hover:bg-accent/30'
                                                }`}
                                        >
                                            <div>
                                                <span className="text-sm font-medium">{t(tile.label)}</span>
                                                <p className="text-xs text-muted-foreground">{t(tile.desc)}</p>
                                            </div>
                                            {mode === tile.engineMode && (
                                                <div className="h-2 w-2 rounded-full bg-primary" />
                                            )}
                                        </button>
                                    );
                                    return locked ? (
                                        <FeatureLock key={tile.engineMode} feature="advanced_exam_modes">
                                            {modeButton}
                                        </FeatureLock>
                                    ) : (
                                        modeButton
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
                                {QUESTION_COUNTS.map((n) => {
                                    const locked = isFree && n > maxQuestionsPerExam;
                                    const countButton = (
                                        <button
                                            key={n}
                                            onClick={() => !locked && setQuestionCount(n)}
                                            disabled={locked}
                                            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${questionCount === n
                                                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                                : 'border border-border bg-card text-muted-foreground hover:bg-accent/30'
                                                }`}
                                        >
                                            {n}
                                        </button>
                                    );
                                    return locked ? (
                                        <FeatureLock key={n} feature="exam_question_limit" showLabel={false}>
                                            {countButton}
                                        </FeatureLock>
                                    ) : (
                                        countButton
                                    );
                                })}
                            </div>
                        </div>

                        {/* Time limit — 3 buttons */}
                        <div className="space-y-3">
                            <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <Clock className="h-3.5 w-3.5" /> {t('timeLimit')}
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {TIME_LIMITS.map((mins) => (
                                    <button
                                        key={mins}
                                        onClick={() => setTimeLimitMinutes(mins)}
                                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${timeLimitMinutes === mins
                                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                            : 'border border-border bg-card text-muted-foreground hover:bg-accent/30'
                                            }`}
                                    >
                                        {mins} {t('min')}
                                    </button>
                                ))}
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

                        {/* Start Custom Exam button */}
                        <button
                            onClick={handleAdvancedStart}
                            disabled={isLoading || !selectedStudyId}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-6 py-3.5 text-sm font-bold text-foreground transition-all duration-200 hover:bg-primary/10 hover:shadow-md disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                            ) : (
                                <>
                                    {t('startExam')} <ChevronRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
