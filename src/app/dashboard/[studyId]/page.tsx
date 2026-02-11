'use client';

import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { useStudy, deleteStudy } from '@/hooks/useStudies';
import { useExams } from '@/hooks/useExams';
import { useStats } from '@/hooks/useStats';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import dynamic from 'next/dynamic';

const StudyFormDialog = dynamic(() => import('@/components/studies/StudyFormDialog').then(m => ({ default: m.StudyFormDialog })), { ssr: false });
const BadgeGallery = dynamic(() => import('@/components/retention/BadgeGallery').then(m => ({ default: m.BadgeGallery })), { ssr: false });
const DailyChallengeModal = dynamic(() => import('@/components/retention/DailyChallengeModal').then(m => ({ default: m.DailyChallengeModal })), { ssr: false });
const ActivityHeatmap = dynamic(() => import('@/components/retention/ActivityHeatmap').then(m => ({ default: m.ActivityHeatmap })), { ssr: false });
const PomodoroTimer = dynamic(() => import('@/components/retention/PomodoroTimer').then(m => ({ default: m.PomodoroTimer })), { ssr: false });
import { formatTimeAgo } from '@/lib/format';
import {
    ArrowLeft,
    ClipboardList,
    Database,
    Download,
    Edit2,
    Flame,
    FlaskConical,
    GraduationCap,
    BookOpen,
    Share2,
    Sparkles,
    Target,
    Trash2,
    TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

// Domain accuracy from performance summary
interface DomainAccuracy {
    correct: number;
    total: number;
}

interface StudyAnalytics {
    totalExams: number;
    avgScore: number;
    passRate: number;
    readiness: number;
    domainStats: Array<{ domainId: string; domain: string; percentage: number; correct: number; total: number }>;
}

export default function StudyDetailPage() {
    const { studyId } = useParams<{ studyId: string }>();
    const router = useRouter();
    const { study, isLoading: studyLoading, refresh: refreshStudy } = useStudy(studyId);
    const { exams, isLoading: examsLoading } = useExams({ studyId, limit: 5, status: 'completed' });

    const { data: analytics } = useSWR<StudyAnalytics>(
        studyId ? `/api/analytics?studyId=${studyId}` : null,
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 60_000 }
    );

    const { stats } = useStats();

    const [showEdit, setShowEdit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [showDailyChallenge, setShowDailyChallenge] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const { addToast } = useToast();
    const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [pendingDelete, setPendingDelete] = useState(false);

    // Undo delete: show undo toast, delay actual deletion by 5s
    const handleDeleteWithUndo = useCallback(() => {
        setShowDelete(false);
        setPendingDelete(true);

        const toastId = Date.now();
        addToast('Study deleted. Click undo to restore.', 'warning');

        undoTimerRef.current = setTimeout(async () => {
            setPendingDelete(false);
            try {
                await deleteStudy(studyId);
                router.push('/dashboard');
            } catch {
                addToast('Failed to delete study', 'error');
            }
        }, 5000);
    }, [studyId, router, addToast]);

    // Cancel pending delete
    const handleUndoDelete = useCallback(() => {
        if (undoTimerRef.current) {
            clearTimeout(undoTimerRef.current);
            undoTimerRef.current = null;
        }
        setPendingDelete(false);
        addToast('Delete cancelled', 'success');
    }, [addToast]);

    async function handleDelete() {
        setDeleting(true);
        try {
            await deleteStudy(studyId);
            router.push('/dashboard');
        } catch {
            setDeleting(false);
        }
    }

    if (studyLoading) {
        return (
            <Shell>
                <div className="flex items-center justify-center py-20">
                    <Spinner size={24} />
                </div>
            </Shell>
        );
    }

    if (!study) {
        return (
            <Shell>
                <div className="flex flex-col items-center gap-4 py-20 text-center">
                    <p className="text-muted-foreground">Study not found</p>
                    <Link href="/dashboard" className="text-sm text-primary hover:underline">
                        Back to Studies
                    </Link>
                </div>
            </Shell>
        );
    }

    const domainAccuracy: Record<string, DomainAccuracy> = analytics?.domainStats?.reduce(
        (acc: Record<string, DomainAccuracy>, d: { domainId: string; correct: number; total: number }) => {
            acc[d.domainId] = { correct: d.correct, total: d.total };
            return acc;
        },
        {} as Record<string, DomainAccuracy>
    ) || {};

    const totalExams = analytics?.totalExams || 0;
    const avgScore = analytics?.avgScore || 0;
    const passRate = analytics?.passRate || 0;
    const readiness = analytics?.readiness || 0;

    return (
        <Shell>
            <div className="space-y-8 animate-fade-in">
                {/* Back + Header */}
                <div>
                    <Link
                        href="/dashboard"
                        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Studies
                    </Link>

                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                                {study.abbreviation.slice(0, 4)}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    {study.name}
                                </h1>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    {study.abbreviation} • {study.domains.length} domains • {study.questionCount} questions
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {pendingDelete && (
                                <button
                                    onClick={handleUndoDelete}
                                    className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
                                >
                                    Undo Delete
                                </button>
                            )}
                            <button
                                onClick={() => setShowEdit(true)}
                                className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                title="Edit study"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setShowDelete(true)}
                                className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                title="Delete study"
                                disabled={pendingDelete}
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Retention: streak + daily goal + daily challenge */}
                {stats && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 animate-stagger">
                        {/* Streak */}
                        <div className="card-premium flex items-center gap-4 p-5">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stats.currentStreak > 0 ? 'bg-orange-500/10' : 'bg-muted/30'}`}>
                                <Flame className={`h-5 w-5 ${stats.currentStreak > 0 ? 'text-orange-400' : 'text-muted-foreground/50'}`} />
                            </div>
                            <div>
                                <div className="font-mono text-2xl font-bold text-foreground">{stats.currentStreak}</div>
                                <div className="text-xs text-muted-foreground">day streak</div>
                            </div>
                        </div>

                        {/* Weekly goal */}
                        <div className="card-premium p-5">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                <Target className="h-3.5 w-3.5" />
                                Weekly Goal
                            </div>
                            {(() => {
                                const now = new Date();
                                const weekAgo = new Date(now);
                                weekAgo.setDate(weekAgo.getDate() - 7);
                                const weekKey = weekAgo.toISOString().slice(0, 10);
                                const weeklyAnswered = (stats.recentDays || [])
                                    .filter((d) => d.date >= weekKey)
                                    .reduce((sum, d) => sum + d.questionsAnswered, 0);
                                const goal = stats.weeklyGoal || 50;
                                const pct = Math.min(100, Math.round((weeklyAnswered / goal) * 100));
                                return (
                                    <>
                                        <div className="flex items-end justify-between mb-1">
                                            <span className="font-mono text-lg font-bold text-foreground">{weeklyAnswered}<span className="text-xs font-normal text-muted-foreground">/{goal}</span></span>
                                            <span className="text-xs text-muted-foreground">{pct}%</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'gradient-bar-success' : pct >= 50 ? 'gradient-bar-warning' : 'gradient-bar-danger'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Daily Challenge CTA */}
                        <button
                            onClick={() => setShowDailyChallenge(true)}
                            className="card-premium flex items-center gap-4 p-5 text-left transition-all hover:border-primary/30"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                                <Sparkles className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-foreground">Daily Challenge</div>
                                <div className="text-xs text-muted-foreground">5 quick questions</div>
                            </div>
                        </button>
                    </div>
                )}

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 animate-stagger">
                    {[
                        { label: 'Exams Taken', value: totalExams, icon: ClipboardList },
                        { label: 'Avg Score', value: `${avgScore}%`, icon: TrendingUp },
                        { label: 'Pass Rate', value: `${passRate}%`, icon: GraduationCap },
                        { label: 'Readiness', value: `${readiness}%`, icon: FlaskConical },
                    ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="card-premium p-5">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                            </div>
                            <div className="mt-2 font-mono text-2xl font-bold text-foreground">{value}</div>
                        </div>
                    ))}
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Link
                        href={`/exams?studyId=${studyId}`}
                        className="card-premium flex items-center gap-3 p-5 transition-all hover:border-primary/30"
                    >
                        <ClipboardList className="h-5 w-5 text-primary" />
                        <div>
                            <div className="text-sm font-semibold text-foreground">Start Exam</div>
                            <div className="text-xs text-muted-foreground">Practice with this study</div>
                        </div>
                    </Link>
                    <Link
                        href={`/questions?studyId=${studyId}`}
                        className="card-premium flex items-center gap-3 p-5 transition-all hover:border-primary/30"
                    >
                        <Database className="h-5 w-5 text-primary" />
                        <div>
                            <div className="text-sm font-semibold text-foreground">Question Bank</div>
                            <div className="text-xs text-muted-foreground">{study.questionCount} questions</div>
                        </div>
                    </Link>
                    <Link
                        href={`/study?studyId=${studyId}`}
                        className="card-premium flex items-center gap-3 p-5 transition-all hover:border-primary/30"
                    >
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div>
                            <div className="text-sm font-semibold text-foreground">Flashcards</div>
                            <div className="text-xs text-muted-foreground">Study mode</div>
                        </div>
                    </Link>
                </div>

                {/* Domain mastery */}
                <div className="card-premium p-6">
                    <h3 className="mb-5 text-sm font-bold text-foreground">Domain Mastery</h3>
                    <div className="space-y-4">
                        {study.domains.map((d) => {
                            const acc = domainAccuracy[d.id];
                            const pct = acc && acc.total > 0 ? Math.round((acc.correct / acc.total) * 100) : 0;
                            const hasData = acc && acc.total > 0;
                            return (
                                <div key={d.id} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground truncate max-w-[280px]">
                                            <span className="font-semibold text-foreground mr-1.5">{d.abbreviation}</span>
                                            {d.name}
                                        </span>
                                        {hasData ? (
                                            <span className={`font-mono font-semibold ${pct >= 70 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                                {acc.correct}/{acc.total} ({pct}%)
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground/50">No data</span>
                                        )}
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${pct >= 70 ? 'gradient-bar-success' : pct >= 50 ? 'gradient-bar-warning' : 'gradient-bar-danger'}`}
                                            style={{ width: hasData ? `${pct}%` : '0%' }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Badges */}
                {stats && <BadgeGallery earned={stats.badges} />}

                {/* Activity Heatmap */}
                {stats && stats.recentDays && stats.recentDays.length > 0 && (
                    <ActivityHeatmap recentDays={stats.recentDays} />
                )}

                {/* Study Timer (Pomodoro) */}
                <PomodoroTimer />

                {/* Share + Export progress */}
                <div className="flex justify-end gap-3">
                    <a
                        href={`/api/export?format=csv&studyId=${studyId}`}
                        download
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </a>
                    <a
                        href={`/api/share-image?studyId=${studyId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                        <Share2 className="h-4 w-4" />
                        Share Progress
                    </a>
                </div>

                {/* Recent exams */}
                {!examsLoading && exams.length > 0 && (
                    <div className="card-premium overflow-hidden">
                        <div className="px-6 py-5 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground">Recent Exams</h3>
                            <Link
                                href={`/analytics?studyId=${studyId}`}
                                className="text-xs text-primary hover:underline"
                            >
                                View all
                            </Link>
                        </div>
                        <table className="w-full">
                            <thead>
                                <tr className="border-t border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Questions</th>
                                    <th className="px-6 py-3 text-right">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {exams.map((exam) => (
                                    <tr key={exam.id} className="transition-colors hover:bg-accent/20">
                                        <td className="px-6 py-3 text-sm text-muted-foreground">
                                            {exam.completedAt ? formatTimeAgo(exam.completedAt) : '—'}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-muted-foreground">
                                            {exam.questionIds.length}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <span className={`font-mono text-sm font-semibold ${(exam.score || 0) >= 70 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {exam.score || 0}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit dialog */}
            {showEdit && (
                <StudyFormDialog
                    study={study}
                    onClose={() => setShowEdit(false)}
                    onSaved={() => { setShowEdit(false); refreshStudy(); }}
                />
            )}

            {/* Daily Challenge modal */}
            {showDailyChallenge && (
                <DailyChallengeModal
                    studyId={studyId}
                    onClose={() => setShowDailyChallenge(false)}
                    onCompleted={() => setShowDailyChallenge(false)}
                />
            )}

            {/* Delete confirm */}
            <ConfirmDialog
                open={showDelete}
                onClose={() => setShowDelete(false)}
                onConfirm={handleDeleteWithUndo}
                title="Delete Study"
                confirmLabel="Delete"
                variant="danger"
                loading={deleting}
            >
                <p>
                    This will permanently delete <strong>{study.name}</strong> and all its questions and exams.
                    You&apos;ll have 5 seconds to undo.
                </p>
            </ConfirmDialog>
        </Shell>
    );
}
