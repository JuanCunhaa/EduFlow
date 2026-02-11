'use client';

import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { useStudy, deleteStudy } from '@/hooks/useStudies';
import { useExams } from '@/hooks/useExams';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StudyFormDialog } from '@/components/studies/StudyFormDialog';
import { formatTimeAgo } from '@/lib/format';
import {
    ArrowLeft,
    ClipboardList,
    Database,
    Edit2,
    FlaskConical,
    GraduationCap,
    BookOpen,
    Trash2,
    TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
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

    const [showEdit, setShowEdit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

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
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

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

            {/* Delete confirm */}
            <ConfirmDialog
                open={showDelete}
                onClose={() => setShowDelete(false)}
                onConfirm={handleDelete}
                title="Delete Study"
                confirmLabel="Delete"
                variant="danger"
                loading={deleting}
            >
                <p>
                    This will permanently delete <strong>{study.name}</strong> and all its questions and exams.
                    This action cannot be undone.
                </p>
            </ConfirmDialog>
        </Shell>
    );
}
