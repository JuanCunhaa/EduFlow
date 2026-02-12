'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Plus, Minus } from 'lucide-react';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import type { MarketplaceQuestion, MarketplaceDomain, Difficulty } from '@/types';

interface MarketplaceQuestionFormDialogProps {
    question?: MarketplaceQuestion | null;
    studyId: string;
    domains: MarketplaceDomain[];
    onClose: () => void;
    onSaved: () => void;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const DEFAULT_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;

interface FormState {
    domainIds: string[];
    text: string;
    options: { label: string; text: string }[];
    correctOptionIndex: number;
    explanation: { short: string; whyOthersWrong: Record<string, string> };
    difficulty: Difficulty;
    tags: string;
}

function makeEmptyForm(): FormState {
    return {
        domainIds: [],
        text: '',
        options: DEFAULT_LABELS.slice(0, 4).map((label) => ({ label, text: '' })),
        correctOptionIndex: 0,
        explanation: { short: '', whyOthersWrong: {} },
        difficulty: 'medium',
        tags: '',
    };
}

function fromQuestion(q: MarketplaceQuestion): FormState {
    return {
        domainIds: [...q.domainIds],
        text: q.text,
        options: q.options.map(o => ({ label: o.label, text: o.text })),
        correctOptionIndex: q.correctOptionIndex,
        explanation: {
            short: q.explanation?.short || '',
            whyOthersWrong: { ...(q.explanation?.whyOthersWrong || {}) },
        },
        difficulty: q.difficulty,
        tags: q.tags.join(', '),
    };
}

export function MarketplaceQuestionFormDialog({
    question,
    studyId,
    domains,
    onClose,
    onSaved,
}: MarketplaceQuestionFormDialogProps) {
    const isEditing = !!question;
    const t = useTranslations('marketplace.admin.questionForm');
    const tc = useTranslations('common');
    const modalRef = useModalA11y(onClose);
    const { addToast } = useToast();

    const [form, setForm] = useState<FormState>(() =>
        question ? fromQuestion(question) : makeEmptyForm()
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
        setForm(prev => ({ ...prev, [field]: value }));
    }

    function toggleDomain(id: string) {
        setForm(prev => ({
            ...prev,
            domainIds: prev.domainIds.includes(id)
                ? prev.domainIds.filter(d => d !== id)
                : [...prev.domainIds, id],
        }));
    }

    function updateOption(index: number, text: string) {
        setForm(prev => {
            const opts = [...prev.options];
            opts[index] = { ...opts[index], text };
            return { ...prev, options: opts };
        });
    }

    function addOption() {
        if (form.options.length >= 5) return;
        const nextLabel = DEFAULT_LABELS[form.options.length] || String.fromCharCode(65 + form.options.length);
        setForm(prev => ({
            ...prev,
            options: [...prev.options, { label: nextLabel, text: '' }],
        }));
    }

    function removeOption(index: number) {
        if (form.options.length <= 2) return;
        setForm(prev => {
            const opts = prev.options.filter((_, i) => i !== index);
            let corrIdx = prev.correctOptionIndex;
            if (corrIdx >= opts.length) corrIdx = opts.length - 1;
            if (corrIdx === index) corrIdx = 0;
            return { ...prev, options: opts, correctOptionIndex: corrIdx };
        });
    }

    function updateWhyWrong(label: string, value: string) {
        setForm(prev => ({
            ...prev,
            explanation: {
                ...prev.explanation,
                whyOthersWrong: { ...prev.explanation.whyOthersWrong, [label]: value },
            },
        }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        // Validate
        if (!form.text.trim()) {
            setError('Question text is required');
            return;
        }
        if (form.domainIds.length === 0) {
            setError('Select at least one domain');
            return;
        }
        const filledOptions = form.options.filter(o => o.text.trim());
        if (filledOptions.length < 2) {
            setError('At least 2 options are required');
            return;
        }

        const parsedTags = form.tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);

        // Clean whyOthersWrong — only include non-empty entries
        const whyOthersWrong: Record<string, string> = {};
        for (const [k, v] of Object.entries(form.explanation.whyOthersWrong)) {
            if (v.trim()) whyOthersWrong[k] = v.trim();
        }

        const payload = {
            studyId,
            domainIds: form.domainIds,
            text: form.text.trim(),
            options: form.options.map(o => ({ label: o.label, text: o.text.trim() })),
            correctOptionIndex: form.correctOptionIndex,
            explanation: {
                short: form.explanation.short.trim(),
                ...(Object.keys(whyOthersWrong).length > 0 ? { whyOthersWrong } : {}),
            },
            difficulty: form.difficulty,
            tags: parsedTags,
        };

        setSaving(true);
        try {
            let url: string;
            let method: string;

            if (isEditing) {
                url = `/api/marketplace/questions/${question!.id}?studyId=${studyId}`;
                method = 'PUT';
            } else {
                url = `/api/marketplace/studies/${studyId}/questions`;
                method = 'POST';
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || t('saveFailed'));
            }

            addToast(t('saved'), 'success');
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('saveFailed'));
        } finally {
            setSaving(false);
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
                    <h2 className="text-lg font-bold text-foreground">
                        {isEditing ? tc('update') : tc('create')} — {tc('question')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {error && (
                        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Domain select */}
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2">{t('domains')}</label>
                        <div className="flex flex-wrap gap-2">
                            {domains.map(d => (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => toggleDomain(d.id)}
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                        form.domainIds.includes(d.id)
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                    }`}
                                >
                                    {d.abbreviation}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Difficulty */}
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2">{t('difficulty')}</label>
                        <div className="flex gap-2">
                            {DIFFICULTIES.map(d => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setField('difficulty', d)}
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                        form.difficulty === d
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                    }`}
                                >
                                    {tc(d)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Question text */}
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('question')}</label>
                        <textarea
                            value={form.text}
                            onChange={e => setField('text', e.target.value)}
                            placeholder={t('questionPlaceholder')}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px] resize-y"
                        />
                    </div>

                    {/* Options */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                {t('answerOptions', { count: form.options.length })}
                            </label>
                            <span className="text-xs text-muted-foreground/60">{t('correctHint')}</span>
                        </div>
                        <div className="space-y-2">
                            {form.options.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setField('correctOptionIndex', idx)}
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold shrink-0 transition-colors ${
                                            form.correctOptionIndex === idx
                                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                                : 'border-border text-muted-foreground hover:border-emerald-500/40'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                    <input
                                        type="text"
                                        value={opt.text}
                                        onChange={e => updateOption(idx, e.target.value)}
                                        placeholder={`Option ${opt.label}`}
                                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    {form.options.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => removeOption(idx)}
                                            className="rounded p-1 text-muted-foreground hover:text-red-400 transition-colors"
                                        >
                                            <Minus className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {form.options.length < 5 && (
                            <button
                                type="button"
                                onClick={addOption}
                                className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Plus className="h-3 w-3" />
                                Add option
                            </button>
                        )}
                    </div>

                    {/* Explanation */}
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('explanation')}</label>
                        <textarea
                            value={form.explanation.short}
                            onChange={e =>
                                setForm(prev => ({
                                    ...prev,
                                    explanation: { ...prev.explanation, short: e.target.value },
                                }))
                            }
                            placeholder={t('explanationPlaceholder')}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px] resize-y"
                        />
                    </div>

                    {/* Why others wrong */}
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                            {t('whyOthersWrong')} {t('perOptionOptional')}
                        </label>
                        <div className="space-y-1.5">
                            {form.options.map((opt, idx) => {
                                if (idx === form.correctOptionIndex) return null;
                                return (
                                    <div key={opt.label} className="flex items-center gap-2">
                                        <span className="w-6 text-center text-xs font-bold text-muted-foreground">
                                            {opt.label}
                                        </span>
                                        <input
                                            type="text"
                                            value={form.explanation.whyOthersWrong[opt.label] || ''}
                                            onChange={e => updateWhyWrong(opt.label, e.target.value)}
                                            placeholder={`Why ${opt.label} is wrong…`}
                                            className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('tags')}</label>
                        <input
                            type="text"
                            value={form.tags}
                            onChange={e => setField('tags', e.target.value)}
                            placeholder="CIA triad, access control"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t border-border px-6 py-4 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                        disabled={saving}
                    >
                        {tc('cancel')}
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <Spinner size={16} />
                                {tc('saving')}
                            </>
                        ) : (
                            isEditing ? tc('update') : tc('create')
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
