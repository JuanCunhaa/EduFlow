'use client';

import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Shell } from '@/components/layout/Shell';
import { useStudy, deleteStudy } from '@/hooks/useStudies';
import { useExams } from '@/hooks/useExams';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import dynamic from 'next/dynamic';

const StudyFormDialog = dynamic(
  () =>
    import('@/components/studies/StudyFormDialog').then((m) => ({
      default: m.StudyFormDialog,
    })),
  { ssr: false }
);
import { formatTimeAgo } from '@/lib/format';
import {
  ArrowLeft,
  ClipboardList,
  Database,
  Download,
  Edit2,
  FlaskConical,
  GraduationCap,
  BookOpen,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { useState, useRef, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

interface DomainAccuracy {
  correct: number;
  total: number;
}

interface StudyAnalytics {
  totalExams: number;
  avgScore: number;
  passRate: number;
  readiness: number;
  domainStats: Array<{
    domainId: string;
    domain: string;
    percentage: number;
    correct: number;
    total: number;
  }>;
}

export default function StudyDetailPage() {
  const t = useTranslations('studyDetail');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { studyId } = useParams<{ studyId: string }>();
  const router = useRouter();
  const {
    study,
    isLoading: studyLoading,
    refresh: refreshStudy,
  } = useStudy(studyId);
  const { exams, isLoading: examsLoading } = useExams({
    studyId,
    limit: 5,
    status: 'completed',
  });

  const { data: analytics } = useSWR<StudyAnalytics>(
    studyId ? `/api/analytics?studyId=${studyId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);

  const handleDeleteWithUndo = useCallback(() => {
    setShowDelete(false);
    setPendingDelete(true);
    addToast(t('deleteSuccess'), 'warning');

    undoTimerRef.current = setTimeout(async () => {
      setPendingDelete(false);
      try {
        await deleteStudy(studyId);
        router.push('/dashboard');
      } catch {
        addToast(t('deleteFailed'), 'error');
      }
    }, 5000);
  }, [studyId, router, addToast, t]);

  const handleUndoDelete = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setPendingDelete(false);
    addToast(t('deleteCancelled'), 'success');
  }, [addToast, t]);

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
          <p className="text-muted-foreground">{t('studyNotFound')}</p>
          <Link
            href="/dashboard"
            className="text-primary text-sm hover:underline"
          >
            {t('backToStudies')}
          </Link>
        </div>
      </Shell>
    );
  }

  const domainAccuracy: Record<string, DomainAccuracy> =
    analytics?.domainStats?.reduce(
      (
        acc: Record<string, DomainAccuracy>,
        d: { domainId: string; correct: number; total: number }
      ) => {
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
      <div className="animate-fade-in space-y-8">
        {/* Back + Header */}
        <div>
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('studies')}
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold">
                {study.abbreviation.slice(0, 4)}
              </div>
              <div>
                <h1 className="text-foreground text-2xl font-bold tracking-tight">
                  {study.name}
                </h1>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {study.abbreviation} • {study.domains.length} {tc('domains')}{' '}
                  • {study.questionCount} {tc('questions')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {pendingDelete && (
                <button
                  onClick={handleUndoDelete}
                  className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
                >
                  {t('undoDelete')}
                </button>
              )}
              <button
                onClick={() => setShowEdit(true)}
                className="border-border text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg border p-2 transition-colors"
                title={t('editStudy')}
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowDelete(true)}
                className="border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg border p-2 transition-colors"
                title={t('deleteStudy')}
                disabled={pendingDelete}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="animate-stagger grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: t('examsTaken'), value: totalExams, icon: ClipboardList },
            { label: t('avgScore'), value: `${avgScore}%`, icon: TrendingUp },
            {
              label: t('passRate'),
              value: `${passRate}%`,
              icon: GraduationCap,
            },
            {
              label: t('readiness'),
              value: `${readiness}%`,
              icon: FlaskConical,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="card-premium p-5">
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
              <div className="text-foreground mt-2 font-mono text-2xl font-bold">
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href={`/exams?studyId=${studyId}`}
            className="card-premium hover:border-primary/30 flex items-center gap-3 p-5 transition-all"
          >
            <ClipboardList className="text-primary h-5 w-5" />
            <div>
              <div className="text-foreground text-sm font-semibold">
                {t('startExam')}
              </div>
              <div className="text-muted-foreground text-xs">
                {t('practiceWith')}
              </div>
            </div>
          </Link>
          <Link
            href={`/questions?studyId=${studyId}`}
            className="card-premium hover:border-primary/30 flex items-center gap-3 p-5 transition-all"
          >
            <Database className="text-primary h-5 w-5" />
            <div>
              <div className="text-foreground text-sm font-semibold">
                {t('questionBank')}
              </div>
              <div className="text-muted-foreground text-xs">
                {study.questionCount} {tc('questions')}
              </div>
            </div>
          </Link>
          <Link
            href={`/study?studyId=${studyId}`}
            className="card-premium hover:border-primary/30 flex items-center gap-3 p-5 transition-all"
          >
            <BookOpen className="text-primary h-5 w-5" />
            <div>
              <div className="text-foreground text-sm font-semibold">
                {t('flashcards')}
              </div>
              <div className="text-muted-foreground text-xs">
                {t('studyMode')}
              </div>
            </div>
          </Link>
        </div>

        {/* Domain mastery */}
        <div className="card-premium p-6">
          <h3 className="text-foreground mb-5 text-sm font-bold">
            {t('domainMastery')}
          </h3>
          <div className="space-y-4">
            {study.domains.map((d) => {
              const acc = domainAccuracy[d.id];
              const pct =
                acc && acc.total > 0
                  ? Math.round((acc.correct / acc.total) * 100)
                  : 0;
              const hasData = acc && acc.total > 0;
              return (
                <div key={d.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground max-w-[280px] truncate">
                      <span className="text-foreground mr-1.5 font-semibold">
                        {d.abbreviation}
                      </span>
                      {d.name}
                    </span>
                    {hasData ? (
                      <span
                        className={`font-mono font-semibold ${pct >= 70 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}
                      >
                        {acc.correct}/{acc.total} ({pct}%)
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50 text-xs">
                        {t('noData')}
                      </span>
                    )}
                  </div>
                  <div className="bg-muted/50 h-2 overflow-hidden rounded-full">
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

        {/* Export */}
        <div className="flex justify-end">
          <a
            href={`/api/export?format=csv&studyId=${studyId}`}
            download
            className="border-border text-muted-foreground hover:bg-accent hover:text-foreground inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors"
          >
            <Download className="h-4 w-4" />
            {t('exportCsv')}
          </a>
        </div>

        {/* Recent exams */}
        {!examsLoading && exams.length > 0 && (
          <div className="card-premium overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5">
              <h3 className="text-foreground text-sm font-bold">
                {t('recentExams')}
              </h3>
              <Link
                href={`/analytics?studyId=${studyId}`}
                className="text-primary text-xs hover:underline"
              >
                {t('viewAll')}
              </Link>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-border text-muted-foreground border-t text-left text-xs font-semibold tracking-wider uppercase">
                  <th className="px-6 py-3">{tc('date')}</th>
                  <th className="px-6 py-3">{tc('questions')}</th>
                  <th className="px-6 py-3 text-right">{tc('score')}</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {exams.map((exam) => (
                  <tr
                    key={exam.id}
                    className="hover:bg-accent/20 cursor-pointer transition-colors"
                    onClick={() => router.push(`/exams/${exam.id}/review`)}
                  >
                    <td className="text-muted-foreground px-6 py-3 text-sm">
                      {exam.completedAt
                        ? formatTimeAgo(exam.completedAt, locale)
                        : '—'}
                    </td>
                    <td className="text-muted-foreground px-6 py-3 text-sm">
                      {exam.questionIds?.length ?? 0}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span
                        className={`font-mono text-sm font-semibold ${(exam.score || 0) >= 70 ? 'text-emerald-400' : 'text-red-400'}`}
                      >
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

      {showEdit && (
        <StudyFormDialog
          study={study}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            refreshStudy();
          }}
        />
      )}

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDeleteWithUndo}
        title={t('deleteStudy')}
        confirmLabel={tc('delete')}
        variant="danger"
        loading={deleting}
      >
        <p>{t('deleteConfirm', { name: study.name })}</p>
      </ConfirmDialog>
    </Shell>
  );
}
