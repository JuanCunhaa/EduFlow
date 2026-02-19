'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Shell } from '@/components/layout/Shell';
import { useMarketplaceStudies } from '@/hooks/useMarketplace';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import type { MarketplaceStudy } from '@/types';
import {
  Plus,
  Edit2,
  Trash2,
  Database,
  GraduationCap,
  Download,
  Settings,
  Shield,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Link } from '@/i18n/navigation';

const MarketplaceStudyFormDialog = dynamic(
  () =>
    import('@/components/marketplace/MarketplaceStudyFormDialog').then((m) => ({
      default: m.MarketplaceStudyFormDialog,
    })),
  { ssr: false }
);

export default function MarketplaceAdminPage() {
  const t = useTranslations('marketplace.admin');
  const tc = useTranslations('common');
  const { studies, isLoading, refresh } = useMarketplaceStudies();
  const { addToast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingStudy, setEditingStudy] = useState<MarketplaceStudy | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<MarketplaceStudy | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  function handleEdit(study: MarketplaceStudy) {
    setEditingStudy(study);
    setShowForm(true);
  }

  function handleCreate() {
    setEditingStudy(null);
    setShowForm(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/marketplace/studies/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Delete failed');
      }
      addToast(t('deleteStudy') + ' ✓', 'success');
      refresh();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed', 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <Shell>
      <div className="animate-fade-in space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Shield className="text-primary h-6 w-6" />
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {t('subtitle')}
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="from-primary to-primary/80 text-primary-foreground shadow-primary/20 hover:shadow-primary/30 flex items-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <Plus className="h-4 w-4" />
            {t('newStudy')}
          </button>
        </div>

        {/* Studies list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size={28} />
          </div>
        ) : studies.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-20 text-center">
            <div className="bg-muted/50 flex h-20 w-20 items-center justify-center rounded-3xl">
              <Settings className="text-muted-foreground/30 h-10 w-10" />
            </div>
            <div>
              <h3 className="text-foreground text-base font-semibold">
                {t('noStudies')}
              </h3>
              <p className="text-muted-foreground mt-1.5 text-sm">
                {t('createFirst')}
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="from-primary to-primary/80 text-primary-foreground shadow-primary/20 flex items-center gap-2 rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-bold shadow-lg"
            >
              <Plus className="h-4 w-4" />
              {t('newStudy')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {studies.map((study) => (
              <div
                key={study.id}
                className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                    style={{
                      backgroundColor: study.accentColor || 'var(--primary)',
                    }}
                  >
                    {study.abbreviation.slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-foreground truncate text-sm font-semibold">
                      {study.name}
                    </h3>
                    <div className="text-muted-foreground mt-0.5 flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        {study.questionCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {study.domains.length}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {study.importCount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/marketplace/admin/${study.id}/questions`}
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                  >
                    <Database className="h-3.5 w-3.5" />
                    {t('manageQuestions')}
                  </Link>
                  <button
                    onClick={() => handleEdit(study)}
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 flex items-center justify-center rounded-lg border p-2 transition-colors"
                    title={t('editStudy')}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(study)}
                    className="border-border text-muted-foreground flex items-center justify-center rounded-lg border p-2 transition-colors hover:border-red-500/20 hover:text-red-400"
                    title={t('deleteStudy')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Study form dialog */}
      {showForm && (
        <MarketplaceStudyFormDialog
          study={editingStudy}
          onClose={() => {
            setShowForm(false);
            setEditingStudy(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingStudy(null);
            refresh();
          }}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteStudy')}
        confirmLabel={tc('delete')}
        cancelLabel={tc('cancel')}
        variant="danger"
        loading={deleting}
      >
        <p>{t('deleteStudyConfirm')}</p>
      </ConfirmDialog>
    </Shell>
  );
}
