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
    () => import('@/components/marketplace/MarketplaceStudyFormDialog').then(m => ({ default: m.MarketplaceStudyFormDialog })),
    { ssr: false }
);

export default function MarketplaceAdminPage() {
    const t = useTranslations('marketplace.admin');
    const tc = useTranslations('common');
    const { studies, isLoading, refresh } = useMarketplaceStudies();
    const { addToast } = useToast();

    const [showForm, setShowForm] = useState(false);
    const [editingStudy, setEditingStudy] = useState<MarketplaceStudy | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<MarketplaceStudy | null>(null);
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
            <div className="space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Shield className="h-6 w-6 text-primary" />
                            {t('title')}
                        </h1>
                        <p className="mt-1.5 text-sm text-muted-foreground">{t('subtitle')}</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5"
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
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/50">
                            <Settings className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-foreground">{t('noStudies')}</h3>
                            <p className="mt-1.5 text-sm text-muted-foreground">{t('createFirst')}</p>
                        </div>
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20"
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
                                className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div
                                        className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white shrink-0"
                                        style={{ backgroundColor: study.accentColor || 'var(--primary)' }}
                                    >
                                        {study.abbreviation.slice(0, 3)}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-semibold text-foreground truncate">{study.name}</h3>
                                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
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

                                <div className="flex items-center gap-2 shrink-0">
                                    <Link
                                        href={`/marketplace/admin/${study.id}/questions`}
                                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                                    >
                                        <Database className="h-3.5 w-3.5" />
                                        {t('manageQuestions')}
                                    </Link>
                                    <button
                                        onClick={() => handleEdit(study)}
                                        className="flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                                        title={t('editStudy')}
                                    >
                                        <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget(study)}
                                        className="flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground hover:text-red-400 hover:border-red-500/20 transition-colors"
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
                    onClose={() => { setShowForm(false); setEditingStudy(null); }}
                    onSaved={() => { setShowForm(false); setEditingStudy(null); refresh(); }}
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
