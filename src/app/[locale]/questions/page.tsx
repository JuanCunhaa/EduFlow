'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Shell } from '@/components/layout/Shell';
import { Spinner } from '@/components/ui/Spinner';
import { QuestionTable } from '@/components/questions/QuestionTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import dynamic from 'next/dynamic';

const QuestionForm = dynamic(
  () =>
    import('@/components/questions/QuestionForm').then((m) => ({
      default: m.QuestionForm,
    })),
  { ssr: false }
);
const ImportDialog = dynamic(
  () =>
    import('@/components/questions/ImportDialog').then((m) => ({
      default: m.ImportDialog,
    })),
  { ssr: false }
);
import {
  useQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  importQuestions,
} from '@/hooks/useQuestions';
import { useStudies } from '@/hooks/useStudies';
import { useToast } from '@/components/ui/Toast';
import type { Question, Difficulty, Study } from '@/types';
import type { CreateQuestionInput } from '@/lib/validators';
import { Plus, Upload, Search } from 'lucide-react';

export default function QuestionsPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="flex items-center justify-center py-20">
            <Spinner size={24} />
          </div>
        </Shell>
      }
    >
      <QuestionsContent />
    </Suspense>
  );
}

function QuestionsContent() {
  const t = useTranslations('questionsPage');
  const tc = useTranslations('common');
  const { studies } = useStudies();
  const searchParams = useSearchParams();
  const studyIdParam = searchParams.get('studyId');
  const [activeStudy, setActiveStudy] = useState<Study | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [search, setSearch] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (studyIdParam && studies.length > 0 && !activeStudy) {
      const match = studies.find((s) => s.id === studyIdParam);
      if (match) setActiveStudy(match);
    }
  }, [studyIdParam, studies, activeStudy]);

  const currentStudy = activeStudy || studies[0] || null;

  const { questions, isLoading, refresh } = useQuestions({
    studyId: currentStudy?.id,
    difficulty: difficulty === 'all' ? undefined : difficulty,
    search: search || undefined,
  });

  const domainMap: Record<string, string> = {};
  if (currentStudy) {
    for (const d of currentStudy.domains) {
      domainMap[d.id] = d.abbreviation;
    }
  }

  async function handleCreate(data: CreateQuestionInput) {
    await createQuestion(data);
    refresh();
  }

  async function handleUpdate(data: CreateQuestionInput) {
    if (!editingQuestion) return;
    await updateQuestion(editingQuestion.id, data);
    refresh();
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteQuestion(deleteTarget);
      refresh();
      addToast(t('deleteSuccess'), 'success');
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : t('deleteFailed'),
        'error'
      );
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleImport(jsonText: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error(t('invalidJson'));
    }
    const items = Array.isArray(parsed)
      ? parsed
      : (parsed as Record<string, unknown>).questions;
    await importQuestions(items as CreateQuestionInput[]);
    refresh();
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-semibold tracking-tight">
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
            >
              <Upload className="h-4 w-4" />
              {t('import')}
            </button>
            <button
              onClick={() => {
                setEditingQuestion(null);
                setShowForm(true);
              }}
              disabled={!currentStudy}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {t('newQuestion')}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {studies.map((study) => (
            <button
              key={study.id}
              onClick={() => setActiveStudy(study)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                currentStudy?.id === study.id
                  ? 'bg-primary/20 text-primary ring-primary/30 ring-1'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {study.abbreviation}
            </button>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border bg-card text-foreground focus:ring-primary/30 focus:border-primary/30 placeholder:text-muted-foreground w-full rounded-lg border py-2.5 pr-3 pl-9 text-sm transition-all outline-none focus:ring-2"
          />
        </div>

        <QuestionTable
          questions={questions}
          isLoading={isLoading}
          onEdit={(q) => {
            setEditingQuestion(q);
            setShowForm(true);
          }}
          onDelete={(id) => setDeleteTarget(id)}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          domainMap={domainMap}
          onAdd={() => {
            setEditingQuestion(null);
            setShowForm(true);
          }}
          onImport={() => setShowImport(true)}
        />
      </div>

      {showForm && currentStudy && (
        <QuestionForm
          question={editingQuestion}
          studyId={currentStudy.id}
          domains={currentStudy.domains}
          onSubmit={editingQuestion ? handleUpdate : handleCreate}
          onClose={() => {
            setShowForm(false);
            setEditingQuestion(null);
          }}
        />
      )}

      {showImport && (
        <ImportDialog
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('deleteTitle')}
        confirmLabel={tc('delete')}
        variant="danger"
        loading={isDeleting}
      >
        <p>{t('deleteConfirm')}</p>
      </ConfirmDialog>
    </Shell>
  );
}
