'use client';

import { useState, useRef, useCallback, type FormEvent } from 'react';
import { Shell } from '@/components/layout/Shell';
import { usePlan } from '@/hooks/usePlan';
import { useToast } from '@/components/ui/Toast';
import { Link } from '@/i18n/navigation';
import {
    Shield,
    ChevronLeft,
    Loader2,
    Upload,
    FileJson,
    FileText,
    CheckCircle2,
    AlertCircle,
    X,
    ExternalLink,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportResult {
    imported: number;
    skipped: number;
    errors: string[];
}

interface Study {
    id: string;
    name: string;
}

type FileType = 'csv' | 'json';

// ─── Constants ────────────────────────────────────────────────────────────────

const FILE_CONFIG: Record<FileType, { accept: string; label: string; ext: string; Icon: typeof FileText }> = {
    csv: { accept: '.csv', label: 'CSV', ext: '.csv', Icon: FileText },
    json: { accept: '.json', label: 'JSON', ext: '.json', Icon: FileJson },
};

const CSV_COLS = [
    ['text', '✅'],
    ['optionA / B / C / D', '✅'],
    ['correctOption (A–D)', '✅'],
    ['explanation', '—'],
    ['difficulty (easy/medium/hard)', '—'],
    ['domain', '—'],
    ['tags (comma-sep)', '—'],
];

const JSON_FIELDS = [
    ['text', '✅'],
    ['options[4] {label,text}', '✅'],
    ['correctOptionIndex (0–3)', '✅'],
    ['explanation {short}', '✅'],
    ['difficulty', '—'],
    ['domainIds[]', '—'],
    ['tags[]', '—'],
];

const CSV_TEMPLATE = [
    'text,optionA,optionB,optionC,optionD,correctOption,explanation,difficulty,domain,tags',
    '"Which port does HTTPS use by default?","80","443","8080","8443","B","HTTPS uses port 443.","easy","network","ports,http"',
].join('\n');

const JSON_TEMPLATE = JSON.stringify(
    {
        questions: [
            {
                text: 'Which port does HTTPS use by default?',
                options: [
                    { label: 'A', text: '80' },
                    { label: 'B', text: '443' },
                    { label: 'C', text: '8080' },
                    { label: 'D', text: '8443' },
                ],
                correctOptionIndex: 1,
                explanation: { short: 'HTTPS uses port 443 by default.', whyOthersWrong: {}, examTip: '' },
                difficulty: 'easy',
                domainIds: ['network'],
                tags: ['ports', 'http'],
            },
        ],
    },
    null,
    2
);

// ─── Drop-zone border class helper (avoids nested ternary) ───────────────────

function dropZoneBorder(isDragOver: boolean, hasFile: boolean): string {
    if (isDragOver) return 'border-primary bg-primary/5';
    if (hasFile) return 'border-emerald-500/50 bg-emerald-500/5';
    return 'border-border hover:border-muted-foreground/50 hover:bg-accent/20';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportPage() {
    const { isAdmin, isLoading: authLoading } = usePlan();
    const { addToast } = useToast();

    const [fileType, setFileType] = useState<FileType>('csv');
    const [file, setFile] = useState<File | null>(null);
    const [studyId, setStudyId] = useState('');
    const [studies, setStudies] = useState<Study[]>([]);
    const [loadingStudies, setLoadingStudies] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadStudies = useCallback(async () => {
        if (studies.length > 0) return;
        setLoadingStudies(true);
        try {
            const res = await fetch('/api/marketplace/studies?limit=100');
            if (!res.ok) throw new Error('Failed to load studies');
            const json = await res.json() as { data?: { studies?: Study[] } };
            setStudies(json.data?.studies ?? []);
        } catch {
            addToast('Failed to load studies', 'error');
        } finally {
            setLoadingStudies(false);
        }
    }, [studies.length, addToast]);

    const resetFile = () => {
        setFile(null);
        setResult(null);
        setError(null);
    };

    const onDrop = useCallback(
        (e: React.DragEvent<HTMLLabelElement>) => {
            e.preventDefault();
            setIsDragOver(false);
            const dropped = e.dataTransfer.files[0];
            if (!dropped) return;
            if (!dropped.name.endsWith(FILE_CONFIG[fileType].ext)) {
                addToast(`Please drop a ${FILE_CONFIG[fileType].ext} file`, 'error');
                return;
            }
            setFile(dropped);
            setResult(null);
            setError(null);
        },
        [fileType, addToast]
    );

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0] ?? null;
        setFile(selected);
        setResult(null);
        setError(null);
        e.target.value = '';
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!file || !studyId || loading) return;

        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const form = new FormData();
            form.append('file', file);
            form.append('studyId', studyId);

            const res = await fetch(`/api/admin/import/${fileType}`, { method: 'POST', body: form });
            const json = await res.json() as { imported?: number; skipped?: number; errors?: string[]; error?: string };

            if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);

            setResult({ imported: json.imported ?? 0, skipped: json.skipped ?? 0, errors: json.errors ?? [] });
            addToast(`✅ ${json.imported ?? 0} questions imported!`, 'success');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Import failed';
            setError(msg);
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        const content = fileType === 'csv' ? CSV_TEMPLATE : JSON_TEMPLATE;
        const mime = fileType === 'csv' ? 'text/csv' : 'application/json';
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import-template${FILE_CONFIG[fileType].ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const switchType = (t: FileType) => {
        setFileType(t);
        setFile(null);
        setResult(null);
        setError(null);
    };

    // ─── Guards ────────────────────────────────────────────────────────────────

    if (authLoading) {
        return (
            <Shell>
                <div className="flex items-center justify-center py-32">
                    <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                </div>
            </Shell>
        );
    }

    if (!isAdmin) {
        return (
            <Shell>
                <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
                    <Shield className="text-muted-foreground/30 h-12 w-12" />
                    <h2 className="text-foreground text-lg font-semibold">Admin access required</h2>
                </div>
            </Shell>
        );
    }

    const { Icon: TypeIcon } = FILE_CONFIG[fileType];
    const canSubmit = !!file && !!studyId && !loading;

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <Shell>
            <div className="animate-fade-in space-y-8">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin"
                        className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-foreground flex items-center gap-2 text-2xl font-bold tracking-tight">
                            <Upload className="text-primary h-6 w-6" />
                            Import Questions
                        </h1>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                            Bulk-import questions from a CSV or JSON file into any study
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">

                    {/* ── Form (left 3/5) ── */}
                    <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-3">

                        {/* File-type tabs */}
                        <div>
                            <p className="text-foreground mb-2 text-sm font-medium">File format</p>
                            <div className="border-border bg-card flex w-fit gap-1 rounded-xl border p-1">
                                {(['csv', 'json'] as FileType[]).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        id={`tab-${t}`}
                                        onClick={() => switchType(t)}
                                        className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all ${fileType === t
                                                ? 'bg-primary text-primary-foreground shadow'
                                                : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {FILE_CONFIG[t].label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Study selector */}
                        <div>
                            <label htmlFor="study-select" className="text-foreground mb-1.5 block text-sm font-medium">
                                Target Study
                            </label>
                            <select
                                id="study-select"
                                value={studyId}
                                onChange={(e) => setStudyId(e.target.value)}
                                onFocus={loadStudies}
                                required
                                className="border-border bg-card text-foreground focus:border-primary/50 focus:ring-primary/30 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1"
                            >
                                <option value="">
                                    {loadingStudies ? 'Loading studies…' : 'Select a study…'}
                                </option>
                                {studies.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <p className="text-muted-foreground mt-1 text-xs">
                                Questions will be added to this marketplace study.{' '}
                                <Link href="/marketplace/admin" className="text-primary hover:underline inline-flex items-center gap-0.5">
                                    Manage studies <ExternalLink className="h-3 w-3" />
                                </Link>
                            </p>
                        </div>

                        {/* Drop zone */}
                        <div>
                            <p className="text-foreground mb-1.5 text-sm font-medium">
                                File ({FILE_CONFIG[fileType].ext})
                            </p>
                            {/* Using <label> wrapping the hidden input — accessible, no role needed */}
                            <label
                                htmlFor="file-input"
                                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={onDrop}
                                className={`block cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${dropZoneBorder(isDragOver, !!file)}`}
                            >
                                <input
                                    ref={fileInputRef}
                                    id="file-input"
                                    type="file"
                                    accept={FILE_CONFIG[fileType].accept}
                                    onChange={onFileChange}
                                    className="hidden"
                                />
                                {file ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <TypeIcon className="h-8 w-8 text-emerald-400" />
                                        <p className="text-foreground text-sm font-medium">{file.name}</p>
                                        <p className="text-muted-foreground text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); resetFile(); }}
                                            className="text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1 text-xs transition-colors"
                                        >
                                            <X className="h-3 w-3" /> Remove file
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload className="text-muted-foreground/50 h-8 w-8" />
                                        <p className="text-foreground text-sm font-medium">
                                            Drop your {FILE_CONFIG[fileType].ext} here or click to browse
                                        </p>
                                        <p className="text-muted-foreground text-xs">Max 500 questions per upload</p>
                                    </div>
                                )}
                            </label>
                        </div>

                        {/* Error banner */}
                        {error && !loading && (
                            <div className="border-destructive/30 bg-destructive/10 flex items-start gap-3 rounded-xl border p-4">
                                <AlertCircle className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
                                <div>
                                    <p className="text-foreground text-sm font-medium">Import failed</p>
                                    <p className="text-muted-foreground text-xs">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            id="import-submit"
                            type="submit"
                            disabled={!canSubmit}
                            className="from-primary to-primary/80 text-primary-foreground shadow-primary/20 hover:shadow-primary/30 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-6 py-3.5 text-sm font-bold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:pointer-events-none disabled:opacity-50"
                        >
                            {loading ? (
                                <><Loader2 className="h-4 w-4 animate-spin" />Importing…</>
                            ) : (
                                <><Upload className="h-4 w-4" />Import {FILE_CONFIG[fileType].label}</>
                            )}
                        </button>
                    </form>

                    {/* ── Sidebar (right 2/5) ── */}
                    <div className="space-y-5 lg:col-span-2">

                        {/* Result card */}
                        {result && (
                            <div className="border-emerald-500/30 bg-emerald-500/5 rounded-xl border p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                    <h2 className="text-foreground text-sm font-bold">Import complete!</h2>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Imported', value: result.imported, color: 'text-emerald-400' },
                                        { label: 'Skipped', value: result.skipped, color: 'text-amber-400' },
                                        { label: 'Errors', value: result.errors.length, color: 'text-red-400' },
                                    ].map(({ label, value, color }) => (
                                        <div key={label} className="bg-muted/20 rounded-lg p-3 text-center">
                                            <p className={`text-xl font-bold ${color}`}>{value}</p>
                                            <p className="text-muted-foreground mt-0.5 text-xs">{label}</p>
                                        </div>
                                    ))}
                                </div>
                                {result.errors.length > 0 && (
                                    <div className="border-border mt-4 rounded-lg border p-3">
                                        <p className="text-foreground mb-2 text-xs font-semibold">Row errors (first 20):</p>
                                        <ul className="text-muted-foreground space-y-1 text-xs">
                                            {result.errors.map((msg) => (
                                                <li key={msg}>• {msg}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Template download */}
                        <div className="border-border bg-card rounded-xl border p-5">
                            <h3 className="text-foreground mb-1 text-sm font-semibold">Template</h3>
                            <p className="text-muted-foreground mb-4 text-xs">
                                Download a sample {FILE_CONFIG[fileType].label} file with the correct structure.
                            </p>
                            <button
                                type="button"
                                onClick={downloadTemplate}
                                className="border-border text-foreground hover:bg-accent flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors"
                            >
                                <TypeIcon className="h-4 w-4" />
                                Download {FILE_CONFIG[fileType].label} Template
                            </button>
                        </div>

                        {/* Column / field reference */}
                        <div className="border-border bg-card rounded-xl border p-5">
                            <h3 className="text-foreground mb-3 text-sm font-semibold">
                                {fileType === 'csv' ? 'CSV Column Reference' : 'JSON Field Reference'}
                            </h3>
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-muted-foreground">
                                        <th className="pb-2 text-left font-medium">{fileType === 'csv' ? 'Column' : 'Field'}</th>
                                        <th className="pb-2 text-left font-medium">Required</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(fileType === 'csv' ? CSV_COLS : JSON_FIELDS).map(([col, req]) => (
                                        <tr key={col} className="text-muted-foreground">
                                            <td className="py-0.5 font-mono">{col}</td>
                                            <td>{req}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {fileType === 'json' && (
                                <p className="text-muted-foreground mt-3 text-xs">
                                    Root can be an array <code className="bg-muted rounded px-1">[]</code> or{' '}
                                    <code className="bg-muted rounded px-1">{'{"questions":[]}'}</code>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Shell>
    );
}
