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
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={modalRef}
        className="border-border bg-card relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="border-border flex shrink-0 items-center justify-between border-b px-6 py-4">
          <h2 className="text-foreground flex items-center gap-2 text-lg font-bold">
            <Upload className="text-primary h-5 w-5" />
            {t('title')}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg p-1.5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleImport}
          className="flex-1 space-y-4 overflow-y-auto px-6 py-5"
        >
          <p className="text-muted-foreground text-sm">{t('description')}</p>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder={t('pastePlaceholder')}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary min-h-[300px] w-full resize-y rounded-lg border px-3 py-2 font-mono text-xs focus:ring-1 focus:outline-none"
            spellCheck={false}
          />
        </form>

        {/* Footer */}
        <div className="border-border flex shrink-0 justify-end gap-3 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
            disabled={importing}
          >
            {tc('cancel')}
          </button>
          <button
            type="submit"
            onClick={handleImport}
            disabled={importing || !json.trim()}
            className="from-primary to-primary/80 text-primary-foreground shadow-primary/20 flex items-center gap-2 rounded-xl bg-gradient-to-r px-5 py-2 text-sm font-semibold shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
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
