'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Upload } from 'lucide-react';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';

interface MarketplaceBulkImportDialogProps {
    studyId: string;
    onClose: () => void;
    onImported: () => void;
}

export function MarketplaceBulkImportDialog({
    studyId,
    onClose,
    onImported,
}: MarketplaceBulkImportDialogProps) {
    const t = useTranslations('marketplace.admin.bulkImportDialog');
    const tc = useTranslations('common');
    const modalRef = useModalA11y(onClose);
    const { addToast } = useToast();

    const [json, setJson] = useState('');
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');

    async function handleImport(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        // Parse JSON
        let questions: unknown[];
        try {
            const parsed = JSON.parse(json);
            if (!Array.isArray(parsed)) throw new Error('Expected array');
            questions = parsed;
        } catch {
            setError(t('invalid'));
            return;
        }

        if (questions.length === 0) {
            setError(t('invalid'));
            return;
        }

        setImporting(true);
        try {
            const res = await fetch('/api/marketplace/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studyId, questions }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Import failed');
            }

            const data = await res.json();
            const count = data?.data?.created ?? questions.length;
            addToast(t('success', { count }), 'success');
            onImported();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setImporting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div
                ref={modalRef}
                className="relative z-10 w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] flex flex-col"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Upload className="h-5 w-5 text-primary" />
                        {t('title')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleImport} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <p className="text-sm text-muted-foreground">{t('description')}</p>

                    {error && (
                        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <textarea
                        value={json}
                        onChange={e => setJson(e.target.value)}
                        placeholder={t('pastePlaceholder')}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[300px] resize-y"
                        spellCheck={false}
                    />
                </form>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t border-border px-6 py-4 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                        disabled={importing}
                    >
                        {tc('cancel')}
                    </button>
                    <button
                        type="submit"
                        onClick={handleImport}
                        disabled={importing || !json.trim()}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {importing ? (
                            <>
                                <Spinner size={16} />
                                {t('importing')}
                            </>
                        ) : (
                            t('import')
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
