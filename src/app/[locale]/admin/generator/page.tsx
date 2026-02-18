'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Shell } from '@/components/layout/Shell';
import { usePlan } from '@/hooks/usePlan';
import { useToast } from '@/components/ui/Toast';
import { Link } from '@/i18n/navigation';
import {
    Shield,
    Sparkles,
    ChevronLeft,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Zap,
    BookOpen,
    PenTool,
    AlertTriangle,
    ChevronDown,
    Check,
    X,
    Import,
    Eye,
} from 'lucide-react';

interface MarketplaceStudy {
    id: string;
    name: string;
    abbreviation: string;
    domains: Array<{ id: string; name: string }>;
}

interface GeneratedQuestion {
    text: string;
    options: Array<{ label: string; text: string }>;
    correctOptionIndex: number;
    explanation: {
        short: string;
        whyOthersWrong: Record<string, string>;
        examTip?: string;
    };
    difficulty: string;
    domainIds: string[];
    tags: string[];
}

interface GenerateResult {
    questions: GeneratedQuestion[];
    generated: number;
    valid: number;
    invalid: number;
    model: string;
    studyId: string;
    studyName: string;
    isNewStudy: boolean;
    warnings: string[];
    errors: string[];
}

type Mode = 'existing' | 'freeform';

const MODELS = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'fast, good quality' },
    { value: 'gpt-4o', label: 'GPT-4o', desc: 'best quality, slower' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', desc: 'balanced' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', desc: 'fastest, cheapest' },
];

const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'pt-BR', label: 'Português (BR)' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
];

const DIFFICULTY_COLORS: Record<string, string> = {
    easy: 'text-emerald-400 bg-emerald-500/10',
    medium: 'text-amber-400 bg-amber-500/10',
    hard: 'text-red-400 bg-red-500/10',
};

export default function AdminGeneratorPage() {
    const t = useTranslations('admin');
    const { isAdmin, isLoading: authLoading } = usePlan();
    const { addToast } = useToast();

    const [studies, setStudies] = useState<MarketplaceStudy[]>([]);
    const [loadingStudies, setLoadingStudies] = useState(true);

    // Form state
    const [mode, setMode] = useState<Mode>('existing');
    const [studyId, setStudyId] = useState('');
    const [domainId, setDomainId] = useState('');
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState(5);
    const [model, setModel] = useState('gpt-4o-mini');
    const [lang, setLang] = useState('en');
    const [generating, setGenerating] = useState(false);
    const [importing, setImporting] = useState(false);

    // Preview state
    const [result, setResult] = useState<GenerateResult | null>(null);
    const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
    const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
    const [showWarnings, setShowWarnings] = useState(false);

    const selectedStudy = studies.find(s => s.id === studyId);

    useEffect(() => {
        async function loadStudies() {
            try {
                const res = await fetch('/api/marketplace/studies');
                if (!res.ok) throw new Error('Failed');
                const data = await res.json();
                setStudies(data.data || data.studies || []);
            } catch {
                // fail silently
            } finally {
                setLoadingStudies(false);
            }
        }
        if (isAdmin) loadStudies();
    }, [isAdmin]);

    const canSubmit = mode === 'existing' ? !!studyId : topic.trim().length >= 2;

    // Select all valid questions by default when result arrives
    useEffect(() => {
        if (result?.questions) {
            setSelectedQuestions(new Set(result.questions.map((_, i) => i)));
        }
    }, [result]);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        setGenerating(true);
        setResult(null);
        setExpandedQuestion(null);

        try {
            const payload: Record<string, unknown> = { count, model, lang };
            if (mode === 'existing') {
                payload.studyId = studyId;
                if (domainId) payload.domainId = domainId;
            } else {
                payload.topic = topic.trim();
            }

            const res = await fetch('/api/admin/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Generation failed (${res.status})`);
            }

            const data: GenerateResult = await res.json();
            setResult(data);

            if (data.questions.length === 0) {
                addToast('No valid questions generated. Try again.', 'error');
            } else {
                addToast(`${data.questions.length} questions ready for review!`, 'success');
            }
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Generation failed', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const handleImport = async () => {
        if (!result || selectedQuestions.size === 0) return;

        setImporting(true);
        try {
            const questionsToImport = result.questions.filter((_, i) => selectedQuestions.has(i));

            const res = await fetch('/api/admin/generate/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studyId: result.studyId,
                    questions: questionsToImport,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Import failed (${res.status})`);
            }

            const data = await res.json();
            addToast(`${data.imported} questions imported!`, 'success');
            setResult(null);
            setSelectedQuestions(new Set());
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Import failed', 'error');
        } finally {
            setImporting(false);
        }
    };

    const toggleQuestion = (index: number) => {
        setSelectedQuestions(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const toggleAll = () => {
        if (!result) return;
        if (selectedQuestions.size === result.questions.length) {
            setSelectedQuestions(new Set());
        } else {
            setSelectedQuestions(new Set(result.questions.map((_, i) => i)));
        }
    };

    if (authLoading) {
        return (
            <Shell>
                <div className="flex items-center justify-center py-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </Shell>
        );
    }

    if (!isAdmin) {
        return (
            <Shell>
                <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
                    <Shield className="h-12 w-12 text-muted-foreground/30" />
                    <h2 className="text-lg font-semibold text-foreground">{t('forbidden')}</h2>
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Sparkles className="h-6 w-6 text-primary" />
                            {t('questionGenerator')}
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">{t('questionGeneratorDesc')}</p>
                    </div>
                </div>

                {/* Generator Form */}
                {!result && (
                    <form onSubmit={handleGenerate} className="space-y-6 max-w-xl">

                        {/* Mode Toggle */}
                        <div className="flex rounded-lg border border-border bg-card/50 p-1">
                            <button
                                type="button"
                                onClick={() => setMode('existing')}
                                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-all ${mode === 'existing'
                                    ? 'bg-primary/10 text-primary shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <BookOpen className="h-4 w-4" />
                                {t('existingStudyMode')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('freeform')}
                                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-all ${mode === 'freeform'
                                    ? 'bg-primary/10 text-primary shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <PenTool className="h-4 w-4" />
                                {t('freeformMode')}
                            </button>
                        </div>

                        {/* Mode-specific inputs */}
                        {mode === 'existing' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1.5">
                                        {t('selectStudy')}
                                    </label>
                                    {loadingStudies ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {t('loadingStudies')}
                                        </div>
                                    ) : (
                                        <select
                                            value={studyId}
                                            onChange={(e) => { setStudyId(e.target.value); setDomainId(''); }}
                                            className="w-full rounded-lg border border-border bg-card py-2.5 px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                                            required
                                        >
                                            <option value="">{t('selectStudyPlaceholder')}</option>
                                            {studies.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.abbreviation} — {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {selectedStudy && selectedStudy.domains.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1.5">
                                            {t('selectDomain')}
                                        </label>
                                        <select
                                            value={domainId}
                                            onChange={(e) => setDomainId(e.target.value)}
                                            className="w-full rounded-lg border border-border bg-card py-2.5 px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                                        >
                                            <option value="">{t('allDomains')}</option>
                                            {selectedStudy.domains.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">
                                    {t('topicLabel')}
                                </label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder={t('topicPlaceholder')}
                                    className="w-full rounded-lg border border-border bg-card/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                                    required
                                    minLength={2}
                                    maxLength={200}
                                />
                                <p className="mt-1.5 text-xs text-muted-foreground">{t('topicHint')}</p>
                            </div>
                        )}

                        {/* Language */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                {t('language')}
                            </label>
                            <select
                                value={lang}
                                onChange={(e) => setLang(e.target.value)}
                                className="w-full rounded-lg border border-border bg-card py-2.5 px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                            >
                                {LANGUAGES.map(l => (
                                    <option key={l.value} value={l.value}>{l.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Count */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                {t('questionCount')}
                            </label>
                            <div className="flex gap-2">
                                {[5, 10, 15, 20].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setCount(n)}
                                        className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-all ${count === n
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border text-muted-foreground hover:border-border/80'
                                            }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Model */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                {t('aiModel')}
                            </label>
                            <select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="w-full rounded-lg border border-border bg-card py-2.5 px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                            >
                                {MODELS.map(m => (
                                    <option key={m.value} value={m.value}>
                                        {m.label} ({m.desc})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={generating || !canSubmit}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t('generating')}
                                </>
                            ) : (
                                <>
                                    <Zap className="h-4 w-4" />
                                    {t('generateQuestions')}
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Preview Results */}
                {result && (
                    <div className="space-y-6">

                        {/* Stats bar */}
                        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    {result.valid > 0 ? (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-amber-400" />
                                    )}
                                    <h3 className="text-sm font-semibold text-foreground">
                                        {t('generationComplete')}
                                    </h3>
                                </div>

                                {result.isNewStudy && (
                                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                                        {t('newStudyCreated')}: {result.studyName}
                                    </span>
                                )}

                                <span className="text-xs text-muted-foreground">{result.model}</span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span><strong className="text-foreground">{result.generated}</strong> {t('generated')}</span>
                                <span className="text-emerald-400"><strong>{result.valid}</strong> {t('valid')}</span>
                                {result.invalid > 0 && (
                                    <span className="text-red-400"><strong>{result.invalid}</strong> {t('invalid')}</span>
                                )}
                            </div>
                        </div>

                        {/* Warnings */}
                        {(result.warnings.length > 0 || result.errors.length > 0) && (
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setShowWarnings(!showWarnings)}
                                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                                >
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    {result.warnings.length} {t('warningsLabel')}, {result.errors.length} {t('errorsLabel')}
                                    <ChevronDown className={`h-3 w-3 transition-transform ${showWarnings ? 'rotate-180' : ''}`} />
                                </button>
                                {showWarnings && (
                                    <div className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-muted/20 p-3 text-xs space-y-1">
                                        {result.errors.map((err, i) => (
                                            <div key={`err-${i}`} className="text-red-400">✗ {err}</div>
                                        ))}
                                        {result.warnings.map((warn, i) => (
                                            <div key={`warn-${i}`} className="text-amber-400/80">⚠ {warn}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Select/Deselect all + Import controls */}
                        {result.questions.length > 0 && (
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={toggleAll}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {selectedQuestions.size === result.questions.length
                                        ? t('deselectAll')
                                        : t('selectAll')}
                                    {' '}({selectedQuestions.size}/{result.questions.length})
                                </button>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setResult(null); setSelectedQuestions(new Set()); }}
                                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                        {t('discardAll')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleImport}
                                        disabled={importing || selectedQuestions.size === 0}
                                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        {importing ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <Import className="h-3 w-3" />
                                        )}
                                        {t('importSelected')} ({selectedQuestions.size})
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Question list */}
                        <div className="space-y-3">
                            {result.questions.map((q, idx) => (
                                <div
                                    key={`q-${idx}`}
                                    className={`rounded-xl border transition-all ${selectedQuestions.has(idx)
                                        ? 'border-primary/30 bg-card'
                                        : 'border-border/50 bg-card/50 opacity-60'
                                        }`}
                                >
                                    {/* Question header */}
                                    <div className="flex items-start gap-3 p-4">
                                        <button
                                            type="button"
                                            onClick={() => toggleQuestion(idx)}
                                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${selectedQuestions.has(idx)
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-border text-transparent hover:border-muted-foreground'
                                                }`}
                                        >
                                            <Check className="h-3 w-3" />
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${DIFFICULTY_COLORS[q.difficulty] || ''}`}>
                                                    {q.difficulty}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {q.domainIds.join(', ')}
                                                </span>
                                            </div>
                                            <p className="text-sm text-foreground leading-relaxed">{q.text}</p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
                                            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {/* Expanded details */}
                                    {expandedQuestion === idx && (
                                        <div className="border-t border-border/50 px-4 py-3 space-y-3">
                                            {/* Options */}
                                            <div className="space-y-1.5">
                                                {q.options.map((opt, oi) => (
                                                    <div
                                                        key={opt.label}
                                                        className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${oi === q.correctOptionIndex
                                                            ? 'bg-emerald-500/10 text-emerald-400'
                                                            : 'bg-muted/20 text-muted-foreground'
                                                            }`}
                                                    >
                                                        <span className="font-bold shrink-0">{opt.label}.</span>
                                                        <span>{opt.text}</span>
                                                        {oi === q.correctOptionIndex && (
                                                            <CheckCircle2 className="h-4 w-4 shrink-0 ml-auto" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Explanation */}
                                            <div className="rounded-lg bg-muted/10 p-3 space-y-2">
                                                <p className="text-xs text-foreground">{q.explanation.short}</p>
                                                {q.explanation.examTip && (
                                                    <p className="text-xs text-primary/80">💡 {q.explanation.examTip}</p>
                                                )}
                                            </div>

                                            {/* Tags */}
                                            {q.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {q.tags.map(tag => (
                                                        <span key={tag} className="rounded-full bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Bottom import bar */}
                        {result.questions.length > 0 && selectedQuestions.size > 0 && (
                            <div className="sticky bottom-4 flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={handleImport}
                                    disabled={importing}
                                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50"
                                >
                                    {importing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Import className="h-4 w-4" />
                                    )}
                                    {t('importSelected')} ({selectedQuestions.size} {t('questionsLabel')})
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Shell>
    );
}
