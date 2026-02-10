'use client';

import { useState, useEffect } from 'react';
import type { Question, Certification, Difficulty } from '@/types';
import type { CreateQuestionInput } from '@/lib/validators';
import { X } from 'lucide-react';

interface QuestionFormProps {
    question?: Question | null;
    onSubmit: (data: CreateQuestionInput) => Promise<void>;
    onClose: () => void;
}

const CERTIFICATIONS: Certification[] = ['CISSP', 'CC', 'SSCP', 'CCSP', 'CGRC'];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

const EMPTY_FORM: CreateQuestionInput = {
    certification: 'CISSP',
    domain: '',
    domainNumber: 1,
    text: '',
    options: OPTION_LABELS.map((label) => ({ label, text: '' })),
    correctOptionIndex: 0,
    explanation: '',
    difficulty: 'medium',
    tags: [],
};

export function QuestionForm({ question, onSubmit, onClose }: QuestionFormProps) {
    const [form, setForm] = useState<CreateQuestionInput>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const isEditing = !!question;

    useEffect(() => {
        if (question) {
            setForm({
                certification: question.certification,
                domain: question.domain,
                domainNumber: question.domainNumber,
                text: question.text,
                options: question.options,
                correctOptionIndex: question.correctOptionIndex,
                explanation: question.explanation,
                difficulty: question.difficulty,
                tags: question.tags,
            });
        }
    }, [question]);

    function updateField<K extends keyof CreateQuestionInput>(key: K, value: CreateQuestionInput[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function updateOption(index: number, text: string) {
        setForm((prev) => ({
            ...prev,
            options: prev.options.map((opt, i) => (i === index ? { ...opt, text } : opt)),
        }));
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
                    {/* Row: Certification + Domain + Difficulty */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">Certification</label>
                            <select
                                value={form.certification}
                                onChange={(e) => updateField('certification', e.target.value as Certification)}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                            >
                                {CERTIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">Domain #</label>
                            <input
                                type="number"
                                min={1}
                                max={8}
                                value={form.domainNumber}
                                onChange={(e) => updateField('domainNumber', parseInt(e.target.value, 10))}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                            />
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

                    {/* Domain Name */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Domain Name</label>
                        <input
                            type="text"
                            value={form.domain}
                            onChange={(e) => updateField('domain', e.target.value)}
                            placeholder="e.g. Security and Risk Management"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                        />
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

                    {/* Options */}
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-muted-foreground">Answer Options</label>
                        {OPTION_LABELS.map((label, i) => (
                            <div key={label} className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => updateField('correctOptionIndex', i)}
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-medium transition-colors ${form.correctOptionIndex === i
                                            ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                        }`}
                                >
                                    {label}
                                </button>
                                <input
                                    type="text"
                                    value={form.options[i].text}
                                    onChange={(e) => updateOption(i, e.target.value)}
                                    placeholder={`Option ${label}`}
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
                            value={form.explanation}
                            onChange={(e) => updateField('explanation', e.target.value)}
                            rows={3}
                            placeholder="Why is this the correct answer?"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
                        />
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
                            disabled={saving}
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
