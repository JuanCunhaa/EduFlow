'use client';

import { useState, useEffect } from 'react';
import type { Question, Difficulty, StudyDomain } from '@/types';
import type { CreateQuestionInput } from '@/lib/validators';
import { X, Plus, Minus } from 'lucide-react';

interface QuestionFormProps {
    question?: Question | null;
    studyId: string;
    /** Available domains from the current study — used to populate the domain picker */
    domains: StudyDomain[];
    onSubmit: (data: CreateQuestionInput) => Promise<void>;
    onClose: () => void;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const DEFAULT_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;

function makeEmptyForm(studyId: string): CreateQuestionInput {
    return {
        studyId,
        domainIds: [],
        text: '',
        options: DEFAULT_LABELS.slice(0, 4).map((label) => ({ label, text: '' })),
        correctOptionIndex: 0,
        explanation: { short: '', whyOthersWrong: {} },
        difficulty: 'medium',
        tags: [],
    };
}

export function QuestionForm({ question, studyId, domains, onSubmit, onClose }: QuestionFormProps) {
    const [form, setForm] = useState<CreateQuestionInput>(() => makeEmptyForm(studyId));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const isEditing = !!question;

    useEffect(() => {
        if (question) {
            setForm({
                studyId: question.studyId,
                domainIds: question.domainIds,
                text: question.text,
                options: question.options,
                correctOptionIndex: question.correctOptionIndex,
                explanation: typeof question.explanation === 'string'
                    ? { short: question.explanation, whyOthersWrong: {} }
                    : question.explanation,
                difficulty: question.difficulty,
                tags: question.tags,
            });
        } else {
            setForm(makeEmptyForm(studyId));
        }
    }, [question, studyId]);

    function updateField<K extends keyof CreateQuestionInput>(key: K, value: CreateQuestionInput[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function updateOption(index: number, text: string) {
        setForm((prev) => ({
            ...prev,
            options: prev.options.map((opt, i) => (i === index ? { ...opt, text } : opt)),
        }));
    }

    function addOption() {
        if (form.options.length >= 5) return;
        const nextLabel = DEFAULT_LABELS[form.options.length];
        setForm((prev) => ({
            ...prev,
            options: [...prev.options, { label: nextLabel, text: '' }],
        }));
    }

    function removeOption() {
        if (form.options.length <= 4) return;
        setForm((prev) => ({
            ...prev,
            options: prev.options.slice(0, -1),
            correctOptionIndex: Math.min(prev.correctOptionIndex, prev.options.length - 2),
        }));
    }

    function toggleDomain(domainId: string) {
        setForm((prev) => {
            const has = prev.domainIds.includes(domainId);
            return {
                ...prev,
                domainIds: has
                    ? prev.domainIds.filter((id) => id !== domainId)
                    : [...prev.domainIds, domainId],
            };
        });
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            await onSubmit(form);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-foreground">
                        {isEditing ? 'Edit Question' : 'New Question'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Row: Domain(s) + Difficulty */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Domains multi-select */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">Domains</label>
                            <div className="flex flex-wrap gap-1.5">
                                {domains.map((d) => (
                                    <button
                                        key={d.id}
                                        type="button"
                                        onClick={() => toggleDomain(d.id)}
                                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${form.domainIds.includes(d.id)
                                                ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                            }`}
                                    >
                                        {d.abbreviation}
                                    </button>
                                ))}
                            </div>
                            {form.domainIds.length === 0 && (
                                <p className="mt-1 text-xs text-amber-500">Select at least one domain</p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">Difficulty</label>
                            <select
                                value={form.difficulty}
                                onChange={(e) => updateField('difficulty', e.target.value as Difficulty)}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                            >
                                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Question Text */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Question</label>
                        <textarea
                            value={form.text}
                            onChange={(e) => updateField('text', e.target.value)}
                            rows={3}
                            placeholder="Enter the question stem..."
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
                        />
                    </div>

                    {/* Options (4-5) */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-medium text-muted-foreground">
                                Answer Options ({form.options.length})
                            </label>
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={removeOption}
                                    disabled={form.options.length <= 4}
                                    className="rounded-md p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    title="Remove option"
                                >
                                    <Minus className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={addOption}
                                    disabled={form.options.length >= 5}
                                    className="rounded-md p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    title="Add option"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                        {form.options.map((opt, i) => (
                            <div key={opt.label} className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => updateField('correctOptionIndex', i)}
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-medium transition-colors ${form.correctOptionIndex === i
                                        ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                                <input
                                    type="text"
                                    value={opt.text}
                                    onChange={(e) => updateOption(i, e.target.value)}
                                    placeholder={`Option ${opt.label}`}
                                    className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                        ))}
                        <p className="text-xs text-muted-foreground">Click a letter to mark the correct answer</p>
                    </div>

                    {/* Explanation */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Explanation</label>
                        <textarea
                            value={form.explanation.short}
                            onChange={(e) => updateField('explanation', { ...form.explanation, short: e.target.value })}
                            rows={3}
                            placeholder="Why is this the correct answer?"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
                        />
                    </div>

                    {/* Why Others Wrong — per-option */}
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-muted-foreground">
                            Why Others Wrong <span className="text-muted-foreground/50">(per option, optional)</span>
                        </label>
                        {form.options
                            .filter((_, i) => i !== form.correctOptionIndex)
                            .map((opt) => (
                                <div key={opt.label} className="flex items-center gap-2">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                                        {opt.label}
                                    </span>
                                    <input
                                        type="text"
                                        value={form.explanation.whyOthersWrong[opt.label] || ''}
                                        onChange={(e) => {
                                            const updated = { ...form.explanation.whyOthersWrong };
                                            if (e.target.value) {
                                                updated[opt.label] = e.target.value;
                                            } else {
                                                delete updated[opt.label];
                                            }
                                            updateField('explanation', { ...form.explanation, whyOthersWrong: updated });
                                        }}
                                        placeholder={`Why ${opt.label} is wrong...`}
                                        className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                                    />
                                </div>
                            ))}
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
                        <input
                            type="text"
                            value={form.tags.join(', ')}
                            onChange={(e) => updateField('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
                            placeholder="CIA triad, access control, encryption"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || form.domainIds.length === 0}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
