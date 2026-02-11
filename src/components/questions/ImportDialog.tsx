'use client';

import { useState } from 'react';
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
    const modalRef = useModalA11y(onClose);
    const [jsonText, setJsonText] = useState('');
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');
    const [dragOver, setDragOver] = useState(false);

    async function handleImport() {
        if (!jsonText.trim()) {
            setError('Paste or upload JSON data');
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
            setError(err instanceof Error ? err.message : 'Invalid JSON');
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
            <div ref={modalRef} className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">Import Questions</h2>
                    <button onClick={onClose} className="rounded-md p-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Drop zone */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`mb-4 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border'
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
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                        Drop a .json file here or click to upload
                    </p>
                </div>

                {/* JSON textarea */}
                <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    rows={10}
                    placeholder="Or paste JSON array here..."
                    className="mb-3 w-full rounded-lg border border-border bg-background p-3 font-mono text-xs text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
                />

                {/* Sample format */}
                <details className="mb-4">
                    <summary className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <FileJson className="h-3.5 w-3.5" />
                        View expected JSON format
                    </summary>
                    <pre className="mt-2 rounded-lg bg-muted/30 p-3 font-mono text-xs text-muted-foreground overflow-x-auto">
                        {SAMPLE_JSON}
                    </pre>
                </details>

                {error && (
                    <div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={importing || !jsonText.trim()}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                        {importing ? 'Importing...' : 'Import'}
                    </button>
                </div>
            </div>
        </div>
    );
}
