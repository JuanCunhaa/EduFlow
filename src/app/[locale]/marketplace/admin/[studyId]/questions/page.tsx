'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { useMarketplaceStudy } from '@/hooks/useMarketplace';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import type { MarketplaceQuestion, MarketplaceStudy } from '@/types';
import {
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Upload,
  HelpCircle,
  Shield,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Link } from '@/i18n/navigation';

const MarketplaceQuestionFormDialog = dynamic(
  () =>
    import('@/components/marketplace/MarketplaceQuestionFormDialog').then(
      (m) => ({
        default: m.MarketplaceQuestionFormDialog,
      })
    ),
  { ssr: false }
);

const MarketplaceBulkImportDialog = dynamic(
  () =>
    import('@/components/marketplace/MarketplaceBulkImportDialog').then(
      (m) => ({
        default: m.MarketplaceBulkImportDialog,
      })
    ),
  { ssr: false }
);

export default function AdminQuestionsPage() {
  const params = useParams();
  const studyId = params.studyId as string;
  const t = useTranslations('marketplace.admin');
  const tc = useTranslations('common');
  const { study, isLoading: studyLoading } = useMarketplaceStudy(studyId);
  const { addToast } = useToast();

  const [questions, setQuestions] = useState<MarketplaceQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingQuestion, setEditingQuestion] =
    useState<MarketplaceQuestion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MarketplaceQuestion | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const fetchQuestions = useCallback(async () => {
    if (!studyId) return;
    setLoading(true);
    try {
      // Admin fetches full questions (incl. correctOptionIndex & explanation)
      // We need to use a route that returns full data for admin
      const res = await fetch(
        `/api/marketplace/studies/${studyId}/questions?limit=500`
      );
      if (!res.ok) throw new Error('Failed to load questions');
      const json = await res.json();
      setQuestions(json.data || []);
    } catch {
      addToast('Failed to load questions', 'error');
    } finally {
      setLoading(false);
    }
  }, [studyId, addToast]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  function handleEdit(q: MarketplaceQuestion) {
    setEditingQuestion(q);
    setShowForm(true);
  }

  function handleCreate() {
    setEditingQuestion(null);
    setShowForm(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/marketplace/questions/${deleteTarget.id}?studyId=${studyId}`,
        { method: 'DELETE', headers: { 'Content-Type': 'application/json' } }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Delete failed');
      }
      addToast(t('deleteQuestion') + ' ✓', 'success');
      fetchQuestions();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed', 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const DIFF_COLORS: Record<string, string> = {
    easy: 'text-emerald-400',
    medium: 'text-amber-400',
    hard: 'text-red-400',
  };

  if (studyLoading || loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-20">
          <Spinner size={28} />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="animate-fade-in space-y-8">
        {/* Header */}
        <div>
          <Link
            href="/marketplace/admin"
            className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {tc('back')}
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {study && (
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{
                    backgroundColor: study.accentColor || 'var(--primary)',
                  }}
                >
                  {study.abbreviation.slice(0, 3)}
                </div>
              )}
              <div>
                <h1 className="text-foreground flex items-center gap-2 text-xl font-bold tracking-tight">
                  <Shield className="text-primary h-5 w-5" />
                  {t('questionsFor', { name: study?.name || studyId })}
                </h1>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {questions.length} {tc('questions')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulk(true)}
                className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors"
              >
                <Upload className="h-4 w-4" />
                {t('bulkImport')}
              </button>
              <button
                onClick={handleCreate}
                className="from-primary to-primary/80 text-primary-foreground shadow-primary/20 hover:shadow-primary/30 flex items-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Plus className="h-4 w-4" />
                {t('newQuestion')}
              </button>
            </div>
          </div>
        </div>

        {/* Questions list */}
        {questions.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-20 text-center">
            <div className="bg-muted/50 flex h-20 w-20 items-center justify-center rounded-3xl">
              <HelpCircle className="text-muted-foreground/30 h-10 w-10" />
            </div>
            <div>
              <h3 className="text-foreground text-base font-semibold">
                {t('noStudies')}
              </h3>
              <p className="text-muted-foreground mt-1.5 text-sm">
                Add questions using the buttons above
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="border-border bg-card flex items-start gap-4 rounded-xl border p-4"
              >
                <div className="bg-muted/50 text-muted-foreground mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                  {idx + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-foreground line-clamp-2 text-sm">
                    {q.text}
                  </p>
                  <div className="text-muted-foreground mt-1.5 flex items-center gap-3 text-xs">
                    <span className={DIFF_COLORS[q.difficulty] || ''}>
                      {tc(q.difficulty)}
                    </span>
                    <span>{q.options.length} options</span>
                    {q.domainIds.length > 0 && study && (
                      <span>
                        {q.domainIds
                          .map(
                            (dId) =>
                              study.domains.find((d) => d.id === dId)
                                ?.abbreviation || dId
                          )
                          .join(', ')}
                      </span>
                    )}
                    {q.tags.length > 0 && (
                      <span className="max-w-[200px] truncate">
                        {q.tags.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => handleEdit(q)}
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg border p-1.5 transition-colors"
                    title={t('editQuestion')}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(q)}
                    className="border-border text-muted-foreground rounded-lg border p-1.5 transition-colors hover:border-red-500/20 hover:text-red-400"
                    title={t('deleteQuestion')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Question form dialog */}
      {showForm && study && (
        <MarketplaceQuestionFormDialog
          question={editingQuestion}
          studyId={studyId}
          domains={study.domains}
          onClose={() => {
            setShowForm(false);
            setEditingQuestion(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingQuestion(null);
            fetchQuestions();
          }}
        />
      )}

      {/* Bulk import dialog */}
      {showBulk && (
        <MarketplaceBulkImportDialog
          studyId={studyId}
          onClose={() => setShowBulk(false)}
          onImported={() => {
            setShowBulk(false);
            fetchQuestions();
          }}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteQuestion')}
        confirmLabel={tc('delete')}
        cancelLabel={tc('cancel')}
        variant="danger"
        loading={deleting}
      >
        <p>{t('deleteQuestionConfirm')}</p>
      </ConfirmDialog>
    </Shell>
  );
}
