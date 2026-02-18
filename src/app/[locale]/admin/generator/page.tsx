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
} from 'lucide-react';

interface MarketplaceStudy {
    id: string;
    name: string;
    abbreviation: string;
    domains: Array<{ id: string; name: string }>;
}

interface GenerateResult {
    generated: number;
    valid: number;
    invalid: number;
    imported: number;
    model: string;
}

export default function AdminGeneratorPage() {
    const t = useTranslations('admin');
    const { isAdmin, isLoading: authLoading } = usePlan();
    const { addToast } = useToast();

    const [studies, setStudies] = useState<MarketplaceStudy[]>([]);
    const [loadingStudies, setLoadingStudies] = useState(true);

    // Form state
    const [studyId, setStudyId] = useState('');
    const [domainId, setDomainId] = useState('');
    const [count, setCount] = useState(5);
    const [model, setModel] = useState('gpt-4o-mini');
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState<GenerateResult | null>(null);

    // Selected study domains
    const selectedStudy = studies.find(s => s.id === studyId);

    useEffect(() => {
        async function loadStudies() {
            try {
                const res = await fetch('/api/marketplace/studies');
                if (!res.ok) throw new Error('Failed');
                const data = await res.json();
                setStudies(data.studies || data || []);
            } catch {
                // fail silently
            } finally {
                setLoadingStudies(false);
            }
        }
        if (isAdmin) loadStudies();
    }, [isAdmin]);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studyId) return;

        setGenerating(true);
        setResult(null);

        try {
            const res = await fetch('/api/admin/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studyId,
                    domainId: domainId || undefined,
                    count,
                    model,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Generation failed (${res.status})`);
            }

            const data = await res.json();
            setResult(data);
            addToast(`Generated ${data.imported} questions!`, 'success');
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Generation failed', 'error');
        } finally {
            setGenerating(false);
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
                <form onSubmit={handleGenerate} className="space-y-6 max-w-xl">
                    {/* Study Select */}
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
                                onChange={(e) => {
                                    setStudyId(e.target.value);
                                    setDomainId('');
                                }}
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

                    {/* Domain Select (optional) */}
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
                            <option value="gpt-4o-mini">GPT-4o Mini (fast, good quality)</option>
                            <option value="gpt-4o">GPT-4o (best quality, slower)</option>
                            <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                            <option value="gpt-4.1-nano">GPT-4.1 Nano (fastest)</option>
                        </select>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={generating || !studyId}
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

                {/* Result */}
                {result && (
                    <div className="max-w-xl rounded-xl border border-border bg-card p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            {result.imported > 0 ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            ) : (
                                <AlertCircle className="h-5 w-5 text-amber-400" />
                            )}
                            <h3 className="text-sm font-semibold text-foreground">
                                {t('generationComplete')}
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-muted/30 p-3 text-center">
                                <div className="text-xl font-bold text-foreground">{result.generated}</div>
                                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">{t('generated')}</div>
                            </div>
                            <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                                <div className="text-xl font-bold text-emerald-400">{result.valid}</div>
                                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">{t('valid')}</div>
                            </div>
                            <div className="rounded-lg bg-red-500/10 p-3 text-center">
                                <div className="text-xl font-bold text-red-400">{result.invalid}</div>
                                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">{t('invalid')}</div>
                            </div>
                            <div className="rounded-lg bg-primary/10 p-3 text-center">
                                <div className="text-xl font-bold text-primary">{result.imported}</div>
                                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">{t('imported')}</div>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            {t('generatedWith')} {result.model}
                        </p>
                    </div>
                )}
            </div>
        </Shell>
    );
}
