'use client';

import { useState } from 'react';
import type { Certification, Difficulty } from '@/types';
import { ChevronRight, Clock, BookOpen, Target, Zap } from 'lucide-react';

interface ExamConfigFormProps {
    onStart: (config: {
        certification: Certification;
        questionCount: number;
        timeLimitMinutes: number;
        difficulty: Difficulty | 'all';
        domains: number[];
    }) => Promise<void>;
    isLoading: boolean;
}

const CERTIFICATIONS: { value: Certification; label: string; domains: number }[] = [
    { value: 'CISSP', label: 'CISSP — Certified Information Systems Security Professional', domains: 8 },
    { value: 'CC', label: 'CC — Certified in Cybersecurity', domains: 5 },
    { value: 'SSCP', label: 'SSCP — Systems Security Certified Practitioner', domains: 7 },
    { value: 'CCSP', label: 'CCSP — Certified Cloud Security Professional', domains: 6 },
    { value: 'CGRC', label: 'CGRC — Governance, Risk and Compliance', domains: 5 },
];

const QUESTION_COUNTS = [10, 25, 50, 100, 150];

export function ExamConfigForm({ onStart, isLoading }: Readonly<ExamConfigFormProps>) {
    const [certification, setCertification] = useState<Certification>('CISSP');
    const [questionCount, setQuestionCount] = useState(25);
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(60);
    const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
    const [selectedDomains, setSelectedDomains] = useState<number[]>([]);

    const certConfig = CERTIFICATIONS.find((c) => c.value === certification)!;
    const allDomains = Array.from({ length: certConfig.domains }, (_, i) => i + 1);

    function toggleDomain(d: number) {
        setSelectedDomains((prev) =>
            prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
        );
    }

    return (
        <div className="mx-auto max-w-2xl space-y-10 animate-fade-in">
            {/* Certification selection */}
            <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="h-px w-3 bg-primary/50" />
                    Certification
                </h2>
                <div className="grid gap-2">
                    {CERTIFICATIONS.map((c) => (
                        <button
                            key={c.value}
                            onClick={() => { setCertification(c.value); setSelectedDomains([]); }}
                            className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ${certification === c.value
                                ? 'border-primary/30 bg-primary/5 text-foreground shadow-[0_0_12px_var(--glow)]'
                                : 'border-border bg-card text-muted-foreground hover:border-border hover:bg-accent/30'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition-colors ${certification === c.value
                                    ? 'bg-primary/20 text-primary'
                                    : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {c.value.slice(0, 2)}
                                </div>
                                <span className="text-sm font-medium">{c.label}</span>
                            </div>
                            {certification === c.value && (
                                <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_var(--glow)]" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Question count */}
            <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <BookOpen className="h-3.5 w-3.5" /> Questions
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
                    <Clock className="h-3.5 w-3.5" /> Time Limit
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
                    />
                    <span className="min-w-[4rem] text-right font-mono text-sm font-semibold text-foreground">
                        {timeLimitMinutes} min
                    </span>
                </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Target className="h-3.5 w-3.5" /> Difficulty
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
                            {d}
                        </button>
                    ))}
                </div>
            </div>

            {/* Domains */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <Zap className="h-3.5 w-3.5" /> Domains
                    </h2>
                    <span className="text-xs text-muted-foreground">
                        {selectedDomains.length === 0 ? 'All domains' : `${selectedDomains.length} selected`}
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {allDomains.map((d) => (
                        <button
                            key={d}
                            onClick={() => toggleDomain(d)}
                            className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${selectedDomains.includes(d)
                                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                : 'border border-border bg-card text-muted-foreground hover:bg-accent/30'
                                }`}
                        >
                            Domain {d}
                        </button>
                    ))}
                </div>
            </div>

            {/* Start button */}
            <button
                onClick={() =>
                    onStart({
                        certification,
                        questionCount,
                        timeLimitMinutes,
                        difficulty,
                        domains: selectedDomains,
                    })
                }
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
            >
                {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                ) : (
                    <>
                        Start Exam <ChevronRight className="h-4 w-4" />
                    </>
                )}
            </button>
        </div>
    );
}
