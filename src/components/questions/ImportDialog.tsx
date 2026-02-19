'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Upload, FileJson } from 'lucide-react';
import { useModalA11y } from '@/hooks/useModalA11y';

interface ImportDialogProps {
  onImport: (jsonText: string) => Promise<void>;
  onClose: () => void;
}

const SAMPLE_JSON = `[
  {
    "studyId": "your-study-id",
    "domainIds": ["d1"],
    "text": "Which of the following best describes...",
    "options": [
      { "label": "A", "text": "Option A text" },
      { "label": "B", "text": "Option B text" },
      { "label": "C", "text": "Option C text" },
      { "label": "D", "text": "Option D text" }
    ],
    "correctOptionIndex": 0,
    "explanation": {
      "short": "A is correct because...",
      "whyOthersWrong": {
        "B": "B is wrong because...",
        "C": "C is wrong because...",
        "D": "D is wrong because..."
      }
    },
    "difficulty": "medium",
    "tags": ["risk", "governance"]
  }
]`;

export function ImportDialog({ onImport, onClose }: ImportDialogProps) {
  const t = useTranslations('importDialog');
  const tc = useTranslations('common');
  const modalRef = useModalA11y(onClose);
  const [jsonText, setJsonText] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  async function handleImport() {
    if (!jsonText.trim()) {
      setError(t('pasteLabel'));
      return;
    }

    setError('');
    setImporting(true);

    try {
      // Validate JSON syntax before sending
      JSON.parse(jsonText);
      await onImport(jsonText);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invalid'));
    } finally {
      setImporting(false);
    }
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') setJsonText(text);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="border-border bg-card relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-foreground text-lg font-semibold">
            {t('title')}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`mb-4 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFile(file);
            };
            input.click();
          }}
        >
          <Upload className="text-muted-foreground h-6 w-6" />
          <p className="text-muted-foreground text-sm">{t('dropzone')}</p>
        </div>

        {/* JSON textarea */}
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={10}
          placeholder={t('pastePlaceholder')}
          className="border-border bg-background text-foreground focus:ring-ring mb-3 w-full resize-none rounded-lg border p-3 font-mono text-xs outline-none focus:ring-1"
        />

        {/* Sample format */}
        <details className="mb-4">
          <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-xs">
            <FileJson className="h-3.5 w-3.5" />
            {t('viewFormat')}
          </summary>
          <pre className="bg-muted/30 text-muted-foreground mt-2 overflow-x-auto rounded-lg p-3 font-mono text-xs">
            {SAMPLE_JSON}
          </pre>
        </details>

        {error && (
          <div className="bg-destructive/10 text-destructive mb-3 rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-lg px-4 py-2 text-sm"
          >
            {tc('cancel')}
          </button>
          <button
            onClick={handleImport}
            disabled={importing || !jsonText.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {importing ? t('importing') : t('import')}
          </button>
        </div>
      </div>
    </div>
  );
}
