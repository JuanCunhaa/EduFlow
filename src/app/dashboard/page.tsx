'use client';

import { Shell } from '@/components/layout/Shell';
import { useStudies } from '@/hooks/useStudies';
import { useStats } from '@/hooks/useStats';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import type { Study } from '@/types';
import {
    BookOpen,
    Database,
    ClipboardList,
    ChevronRight,
    Plus,
    GraduationCap,
    Flame,
    Target,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const StudyFormDialog = dynamic(() => import('@/components/studies/StudyFormDialog').then(m => ({ default: m.StudyFormDialog })), { ssr: false });

function StudyCard({ study }: { study: Study }) {
    const domainCount = study.domains.length;

    return (
        <Link
            href={`/dashboard/${study.id}`}
            className="card-premium group flex flex-col gap-4 p-6"
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary transition-colors group-hover:bg-primary/20">
                        {study.abbreviation.slice(0, 3)}
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground leading-tight">
                            {study.name}
                        </h3>
                        <span className="text-xs text-muted-foreground">{study.abbreviation}</span>
                    </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {domainCount} domains
                </span>
                <span className="flex items-center gap-1">
                    <Database className="h-3.5 w-3.5" />
                    {study.questionCount} questions
                </span>
                <span className="flex items-center gap-1">
                    <ClipboardList className="h-3.5 w-3.5" />
                    {study.examCount} exams
                </span>
            </div>

            {/* Domain chips */}
            <div className="flex flex-wrap gap-1">
                {study.domains.slice(0, 5).map((d) => (
                    <span
                        key={d.id}
                        className="rounded-md bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                        {d.abbreviation}
                    </span>
                ))}
                {study.domains.length > 5 && (
                    <span className="rounded-md bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        +{study.domains.length - 5}
                    </span>
                )}
            </div>
        </Link>
    );
}

export default function DashboardPage() {
    const { studies, isLoading, refresh } = useStudies();
    const { stats } = useStats();
    const [showCreate, setShowCreate] = useState(false);

    // Weekly progress computed from recentDays
    const weeklyAnswered = stats?.recentDays
        ?.filter(d => {
            const dDate = new Date(d.date);
            const now = new Date();
            const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            return dDate >= weekAgo;
        })
        .reduce((sum, d) => sum + d.questionsAnswered, 0) ?? 0;
    const weeklyGoal = stats?.weeklyGoal ?? 50;
    const weeklyPct = Math.min(100, Math.round((weeklyAnswered / weeklyGoal) * 100));

    return (
        <Shell>
            <div className="space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Studies</h1>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            Select a study to manage questions, take exams, and track progress
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5"
                    >
                        <Plus className="h-4 w-4" />
                        New Study
                    </button>
                </div>

                {/* Streak + Weekly goal bar */}
                {stats && (
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
                            <Flame className={`h-4 w-4 ${stats.currentStreak > 0 ? 'text-orange-400' : 'text-muted-foreground/30'}`} />
                            <span className="font-mono text-sm font-bold text-foreground">{stats.currentStreak}</span>
                            <span className="text-xs text-muted-foreground">
                                {stats.currentStreak === 0 ? 'Start your streak today!' : 'day streak'}
                            </span>
                        </div>
                        <div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 min-w-[200px]">
                            <Target className="h-4 w-4 text-primary shrink-0" />
                            <div className="flex-1">
                                <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${weeklyPct >= 100 ? 'gradient-bar-success' : weeklyPct >= 50 ? 'gradient-bar-warning' : 'gradient-bar-danger'}`}
                                        style={{ width: `${weeklyPct}%` }}
                                    />
                                </div>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{weeklyAnswered}/{weeklyGoal} weekly</span>
                        </div>
                    </div>
                )}

                {/* Studies grid */}
                {isLoading ? (
                    <SkeletonDashboard />
                ) : studies.length === 0 ? (
                    <div className="flex flex-col items-center gap-5 py-20 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/50">
                            <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-foreground">No studies yet</h3>
                            <p className="mt-1.5 text-sm text-muted-foreground">
                                Create your first study to start adding questions and taking exams
                            </p>
                        </div>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
                        >
                            <Plus className="h-4 w-4" />
                            Create Study
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-stagger">
                        {studies.map((study) => (
                            <StudyCard key={study.id} study={study} />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Study Dialog */}
            {showCreate && (
                <StudyFormDialog
                    onClose={() => setShowCreate(false)}
                    onSaved={() => { setShowCreate(false); refresh(); }}
                />
            )}
        </Shell>
    );
}
