'use client';

import { useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { usePlan } from '@/hooks/usePlan';
import { useToast } from '@/components/ui/Toast';
import { Link } from '@/i18n/navigation';
import {
    Shield,
    ChevronLeft,
    Loader2,
    Zap,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    Package,
} from 'lucide-react';

// ── Cert catalog list (slug → display name) for the dropdown ──

const CERT_OPTIONS = [
    // ISC2
    { slug: 'cissp', label: 'CISSP', group: 'ISC2' },
    { slug: 'cc', label: 'CC — Certified in Cybersecurity', group: 'ISC2' },
    { slug: 'sscp', label: 'SSCP', group: 'ISC2' },
    { slug: 'ccsp', label: 'CCSP', group: 'ISC2' },
    { slug: 'cgrc', label: 'CGRC', group: 'ISC2' },
    { slug: 'hcispp', label: 'HCISPP', group: 'ISC2' },
    // CompTIA
    { slug: 'security+', label: 'Security+ (SY0-701)', group: 'CompTIA' },
    { slug: 'network+', label: 'Network+ (N10-009)', group: 'CompTIA' },
    { slug: 'a+', label: 'A+', group: 'CompTIA' },
    { slug: 'linux+', label: 'Linux+', group: 'CompTIA' },
    { slug: 'cloud+', label: 'Cloud+', group: 'CompTIA' },
    { slug: 'cysa+', label: 'CySA+', group: 'CompTIA' },
    { slug: 'pentest+', label: 'PenTest+', group: 'CompTIA' },
    { slug: 'casp+', label: 'CASP+', group: 'CompTIA' },
    // ISACA
    { slug: 'cisa', label: 'CISA', group: 'ISACA' },
    { slug: 'cism', label: 'CISM', group: 'ISACA' },
    { slug: 'crisc', label: 'CRISC', group: 'ISACA' },
    { slug: 'cgeit', label: 'CGEIT', group: 'ISACA' },
    // EC-Council
    { slug: 'ceh', label: 'CEH v13', group: 'EC-Council' },
    { slug: 'chfi', label: 'CHFI v11', group: 'EC-Council' },
    // AWS
    { slug: 'aws-cloud-practitioner', label: 'AWS Cloud Practitioner', group: 'AWS' },
    { slug: 'aws-saa', label: 'AWS Solutions Architect Associate', group: 'AWS' },
    { slug: 'aws-dev', label: 'AWS Developer Associate', group: 'AWS' },
    { slug: 'aws-sysops', label: 'AWS SysOps Administrator', group: 'AWS' },
    { slug: 'aws-security', label: 'AWS Security Specialty', group: 'AWS' },
    // Azure
    { slug: 'az-900', label: 'AZ-900 Azure Fundamentals', group: 'Azure' },
    { slug: 'az-104', label: 'AZ-104 Azure Administrator', group: 'Azure' },
    { slug: 'az-204', label: 'AZ-204 Azure Developer', group: 'Azure' },
    { slug: 'az-305', label: 'AZ-305 Azure Architect', group: 'Azure' },
    { slug: 'sc-900', label: 'SC-900 Security Fundamentals', group: 'Azure' },
    { slug: 'ai-900', label: 'AI-900 AI Fundamentals', group: 'Azure' },
    // GCP
    { slug: 'gcp-pca', label: 'GCP Professional Cloud Architect', group: 'GCP' },
    { slug: 'gcp-ace', label: 'GCP Associate Cloud Engineer', group: 'GCP' },
    // PMI
    { slug: 'pmp', label: 'PMP', group: 'PMI' },
    { slug: 'capm', label: 'CAPM', group: 'PMI' },
    // DevOps
    { slug: 'cka', label: 'CKA (Kubernetes Administrator)', group: 'DevOps' },
    { slug: 'ckad', label: 'CKAD (Kubernetes Developer)', group: 'DevOps' },
    { slug: 'terraform', label: 'Terraform Associate', group: 'DevOps' },
    // Scrum
    { slug: 'psm', label: 'PSM I (Professional Scrum Master)', group: 'Scrum' },
    // Compliance
    { slug: 'iso-27001-la', label: 'ISO 27001 Lead Auditor', group: 'Compliance' },
    { slug: 'gdpr-practitioner', label: 'GDPR Practitioner', group: 'Compliance' },
    { slug: 'hipaa', label: 'HIPAA Compliance', group: 'Compliance' },
    // Brasil
    { slug: 'enem', label: 'ENEM', group: 'Brasil' },
    { slug: 'oab-primeira-fase', label: 'OAB Primeira Fase', group: 'Brasil' },
    { slug: 'residencia-medica', label: 'Residência Médica', group: 'Brasil' },
];

const MODELS = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'fast · cheap · great quality' },
    { value: 'gpt-4o', label: 'GPT-4o', desc: 'best quality · slower' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', desc: 'balanced' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', desc: 'fastest · cheapest' },
];

const LANGS = [
    { value: 'en', label: 'English' },
    { value: 'pt-BR', label: 'Português (BR)' },
    { value: 'es', label: 'Español' },
];

const PRESET_COUNTS = [100, 250, 500, 1000, 2000];

interface BulkResult {
    studyId: string;
    studyName: string;
    totalRequested: number;
    generated: number;
    imported: number;
    failedBatches: number;
    skipped: number;
    batches: number;
    durationMs: number;
}

// Estimated cost in USD (gpt-4o-mini: ~$0.30/1M output tokens; ~300 tokens/question)
function estimateCost(count: number, model: string): string {
    const tokensPerQ = 350;
    const pricePerMTok: Record<string, number> = {
        'gpt-4o-mini': 0.6,
        'gpt-4o': 15,
        'gpt-4.1-mini': 0.4,
        'gpt-4.1-nano': 0.1,
    };
    const price = pricePerMTok[model] ?? 0.6;
    const cost = (count * tokensPerQ * price) / 1_000_000;
    return cost < 0.01 ? '<$0.01' : `~$${cost.toFixed(2)}`;
}

function estimateTime(count: number, concurrency: number): string {
    // ~5s per batch of 25q, with concurrency
    const batches = Math.ceil(count / 25);
    const rounds = Math.ceil(batches / concurrency);
    const seconds = rounds * 7;
    if (seconds < 60) return `~${seconds}s`;
    return `~${Math.ceil(seconds / 60)}min`;
}

export default function BulkGeneratorPage() {
    const { isAdmin, isLoading: authLoading } = usePlan();
    const { addToast } = useToast();

    const [certSlug, setCertSlug] = useState('');
    const [totalCount, setTotalCount] = useState(100);
    const [model, setModel] = useState('gpt-4o-mini');
    const [lang, setLang] = useState('en');
    const [concurrency, setConcurrency] = useState(5);
    const [autoImport, setAutoImport] = useState(true);

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<BulkResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>('');

    const canSubmit = certSlug.length > 0 && !loading;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!canSubmit) return;

        setLoading(true);
        setResult(null);
        setError(null);
        setProgress('Starting bulk generation…');

        const pollInterval = setInterval(() => {
            setProgress((p) => {
                if (p.endsWith('…')) return p.slice(0, -1) + '.';
                if (p.endsWith('...')) return p.slice(0, -3) + '…';
                return p + '.';
            });
        }, 1200);

        try {
            const res = await fetch('/api/admin/generate/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ certSlug, totalCount, model, lang, concurrency, autoImport }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({})) as { error?: string };
                throw new Error(err.error ?? `HTTP ${res.status}`);
            }

            const data = await res.json() as { data: BulkResult };
            setResult(data.data);

            addToast(
                `✅ ${data.data.generated} generated · ${data.data.imported} imported in ${((data.data.durationMs ?? 0) / 1000).toFixed(1)}s`,
                'success'
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Bulk generation failed';
            setError(msg);
            addToast(msg, 'error');
        } finally {
            clearInterval(pollInterval);
            setLoading(false);
            setProgress('');
        }
    };

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

    const certLabel = CERT_OPTIONS.find((c) => c.slug === certSlug)?.label ?? '';

    return (
        <Shell>
            <div className="animate-fade-in space-y-8">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/generator"
                        className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-foreground flex items-center gap-2 text-2xl font-bold tracking-tight">
                            <Package className="text-primary h-6 w-6" />
                            Bulk Question Generator
                        </h1>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                            Generate hundreds of questions in minutes with parallel AI calls
                        </p>
                    </div>
                </div>

                {/* Form */}
                {!result && (
                    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">

                        {/* Cert picker */}
                        <div>
                            <label htmlFor="cert-select" className="text-foreground mb-1.5 block text-sm font-medium">
                                Certification / Exam
                            </label>
                            <select
                                id="cert-select"
                                value={certSlug}
                                onChange={(e) => setCertSlug(e.target.value)}
                                required
                                className="border-border bg-card text-foreground focus:border-primary/50 focus:ring-primary/30 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1"
                            >
                                <option value="">Select a certification…</option>
                                {Array.from(new Set(CERT_OPTIONS.map((c) => c.group))).map((group) => (
                                    <optgroup key={group} label={group}>
                                        {CERT_OPTIONS.filter((c) => c.group === group).map((c) => (
                                            <option key={c.slug} value={c.slug}>{c.label}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        {/* Count */}
                        <div>
                            <label htmlFor="count-input" className="text-foreground mb-1.5 block text-sm font-medium">
                                Total questions to generate
                            </label>
                            <div className="mb-3 flex flex-wrap gap-2">
                                {PRESET_COUNTS.map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setTotalCount(n)}
                                        className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${totalCount === n
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border text-muted-foreground hover:border-muted-foreground'
                                            }`}
                                    >
                                        {n.toLocaleString()}
                                    </button>
                                ))}
                            </div>
                            <input
                                id="count-input"
                                type="number"
                                min={1}
                                max={2000}
                                value={totalCount}
                                onChange={(e) => setTotalCount(Math.min(2000, Math.max(1, Number.parseInt(e.target.value) || 1)))}
                                className="border-border bg-card text-foreground focus:border-primary/50 focus:ring-primary/30 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1"
                            />
                        </div>

                        {/* Model */}
                        <div>
                            <label htmlFor="model-select" className="text-foreground mb-1.5 block text-sm font-medium">AI Model</label>
                            <select
                                id="model-select"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="border-border bg-card text-foreground focus:border-primary/50 focus:ring-primary/30 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1"
                            >
                                {MODELS.map((m) => (
                                    <option key={m.value} value={m.value}>{m.label} — {m.desc}</option>
                                ))}
                            </select>
                        </div>

                        {/* Language */}
                        <div>
                            <label htmlFor="lang-select" className="text-foreground mb-1.5 block text-sm font-medium">Language</label>
                            <select
                                id="lang-select"
                                value={lang}
                                onChange={(e) => setLang(e.target.value)}
                                className="border-border bg-card text-foreground focus:border-primary/50 focus:ring-primary/30 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1"
                            >
                                {LANGS.map((l) => (
                                    <option key={l.value} value={l.value}>{l.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Concurrency */}
                        <div>
                            <label htmlFor="concurrency-input" className="text-foreground mb-1.5 flex items-center justify-between text-sm font-medium">
                                <span>Parallel API calls</span>
                                <span className="text-primary font-bold">{concurrency}</span>
                            </label>
                            <input
                                id="concurrency-input"
                                type="range"
                                min={1}
                                max={8}
                                value={concurrency}
                                onChange={(e) => setConcurrency(Number.parseInt(e.target.value))}
                                className="accent-primary w-full"
                            />
                            <div className="text-muted-foreground mt-1 flex justify-between text-xs">
                                <span>1 (conservative)</span>
                                <span>8 (aggressive)</span>
                            </div>
                        </div>

                        {/* Auto-import toggle */}
                        <div className="border-border bg-card/50 flex items-center justify-between rounded-xl border p-4">
                            <div>
                                <p className="text-foreground text-sm font-medium">Auto-import to marketplace</p>
                                <p className="text-muted-foreground text-xs">
                                    {autoImport
                                        ? 'Questions saved directly — no review step'
                                        : 'Returns first 50 questions for preview only'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAutoImport(!autoImport)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoImport ? 'bg-primary' : 'bg-muted'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoImport ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        {/* Cost / time estimate */}
                        {certSlug && (
                            <div className="border-border bg-card/30 flex items-center justify-between rounded-xl border p-4 text-sm">
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Estimate</p>
                                    <div className="text-foreground flex gap-6">
                                        <span>
                                            ⏱ <strong>{estimateTime(totalCount, concurrency)}</strong>
                                        </span>
                                        <span>
                                            💸 <strong>{estimateCost(totalCount, model)}</strong>
                                        </span>
                                        <span>
                                            📦 <strong>{Math.ceil(totalCount / 25)}</strong> batches
                                        </span>
                                    </div>
                                </div>
                                <Sparkles className="text-primary/40 h-8 w-8 shrink-0" />
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            id="bulk-generate-submit"
                            type="submit"
                            disabled={!canSubmit}
                            className="from-primary to-primary/80 text-primary-foreground shadow-primary/20 hover:shadow-primary/30 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-6 py-3.5 text-sm font-bold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:pointer-events-none disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>{progress || 'Generating…'}</span>
                                </>
                            ) : (
                                <>
                                    <Zap className="h-4 w-4" />
                                    Generate {totalCount.toLocaleString()} questions
                                    {certLabel ? ` for ${certLabel}` : ''}
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Error state */}
                {error && !loading && (
                    <div className="border-destructive/30 bg-destructive/10 flex items-start gap-3 rounded-xl border p-4">
                        <AlertCircle className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
                        <div>
                            <p className="text-foreground text-sm font-medium">Generation failed</p>
                            <p className="text-muted-foreground text-xs">{error}</p>
                        </div>
                    </div>
                )}

                {/* Result */}
                {result && (
                    <div className="space-y-6">
                        <div className="border-border bg-card rounded-xl border p-6">
                            <div className="mb-6 flex items-center gap-3">
                                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                                <div>
                                    <h2 className="text-foreground text-base font-bold">Bulk generation complete!</h2>
                                    <p className="text-muted-foreground text-sm">{result.studyName}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                {[
                                    { label: 'Requested', value: result.totalRequested.toLocaleString(), color: 'text-foreground' },
                                    { label: 'Generated', value: result.generated.toLocaleString(), color: 'text-emerald-400' },
                                    { label: 'Imported', value: result.imported.toLocaleString(), color: 'text-primary' },
                                    { label: 'Duration', value: `${(result.durationMs / 1000).toFixed(1)}s`, color: 'text-amber-400' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="bg-muted/20 rounded-lg p-3 text-center">
                                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                                        <p className="text-muted-foreground mt-0.5 text-xs">{label}</p>
                                    </div>
                                ))}
                            </div>

                            {result.failedBatches > 0 && (
                                <div className="text-muted-foreground border-border mt-4 rounded-lg border p-3 text-xs">
                                    ⚠ {result.failedBatches} batch{result.failedBatches > 1 ? 'es' : ''} failed (API errors). Retry to fill gaps.
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => { setResult(null); setError(null); }}
                                className="border-border text-muted-foreground hover:text-foreground flex-1 rounded-lg border py-2.5 text-sm transition-colors"
                            >
                                Generate more
                            </button>
                            <Link
                                href={`/marketplace/${result.studyId}`}
                                className="border-primary/30 text-primary hover:bg-primary/10 flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors"
                            >
                                View in marketplace →
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </Shell>
    );
}
