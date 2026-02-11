'use client';

import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { createStudy, updateStudy } from '@/hooks/useStudies';
import { useModalA11y } from '@/hooks/useModalA11y';
import type { Study, StudyDomain } from '@/types';

interface StudyFormDialogProps {
    study?: Study | null;
    onClose: () => void;
    onSaved: () => void;
}

function makeEmptyDomain(order: number): { id: string; abbreviation: string; name: string; order: number } {
    return { id: `d${order + 1}`, abbreviation: '', name: '', order };
}

export function StudyFormDialog({ study, onClose, onSaved }: StudyFormDialogProps) {
    const isEditing = !!study;
    const modalRef = useModalA11y(onClose);

    const [abbreviation, setAbbreviation] = useState(study?.abbreviation || '');
    const [name, setName] = useState(study?.name || '');
    const [domains, setDomains] = useState<Array<{ id: string; abbreviation: string; name: string; order: number }>>(
        study?.domains.map(d => ({ id: d.id, abbreviation: d.abbreviation, name: d.name, order: d.order }))
        || [makeEmptyDomain(0)]
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function addDomain() {
        if (domains.length >= 30) return;
        setDomains(prev => [...prev, makeEmptyDomain(prev.length)]);
    }

    function removeDomain(index: number) {
        if (domains.length <= 1) return;
        setDomains(prev => prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, order: i })));
    }

    function updateDomain(index: number, field: 'abbreviation' | 'name', value: string) {
        setDomains(prev => prev.map((d, i) => {
            if (i !== index) return d;
            const updated = { ...d, [field]: value };
            // Auto-generate ID from abbreviation if creating
            if (field === 'abbreviation' && !isEditing) {
                updated.id = `d${i + 1}`;
            }
            return updated;
        }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        if (!abbreviation.trim() || !name.trim()) {
            setError('Abbreviation and name are required');
            return;
        }

        const validDomains = domains.filter(d => d.abbreviation.trim() && d.name.trim());
        if (validDomains.length === 0) {
            setError('At least one domain with abbreviation and name is required');
            return;
        }

        setSaving(true);
        try {
            if (isEditing && study) {
                await updateStudy(study.id, {
                    abbreviation: abbreviation.trim(),
                    name: name.trim(),
                    domains: validDomains,
                });
            } else {
                await createStudy({
                    abbreviation: abbreviation.trim(),
                    name: name.trim(),
                    domains: validDomains,
                });
            }
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save study');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
            <div ref={modalRef} className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl animate-slide-up">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-foreground">
                        {isEditing ? 'Edit Study' : 'New Study'}
                    </h2>
                    <button onClick={onClose} className="rounded-md p-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Abbreviation + Name */}
                    <div className="grid grid-cols-[100px_1fr] gap-3">
                        <div>
                            <label htmlFor="study-code" className="mb-1 block text-xs font-medium text-muted-foreground">Code</label>
                            <input
                                id="study-code"
                                type="text"
                                value={abbreviation}
                                onChange={(e) => setAbbreviation(e.target.value.toUpperCase())}
                                placeholder="CISSP"
                                maxLength={20}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30"
                            />
                        </div>
                        <div>
                            <label htmlFor="study-name" className="mb-1 block text-xs font-medium text-muted-foreground">Full Name</label>
                            <input
                                id="study-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Certified Information Systems Security Professional"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30"
                            />
                        </div>
                    </div>

                    {/* Domains */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-muted-foreground">
                                Domains ({domains.length})
                            </label>
                            <button
                                type="button"
                                onClick={addDomain}
                                disabled={domains.length >= 30}
                                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                            >
                                <Plus className="h-3 w-3" /> Add
                            </button>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {domains.map((d, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold text-muted-foreground bg-muted/50">
                                        {i + 1}
                                    </span>
                                    <input
                                        type="text"
                                        value={d.abbreviation}
                                        onChange={(e) => updateDomain(i, 'abbreviation', e.target.value)}
                                        placeholder="SAM"
                                        className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-primary/30"
                                    />
                                    <input
                                        type="text"
                                        value={d.name}
                                        onChange={(e) => updateDomain(i, 'name', e.target.value)}
                                        placeholder="Security and Risk Management"
                                        className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/30"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeDomain(i)}
                                        disabled={domains.length <= 1}
                                        className="rounded-md p-1 text-muted-foreground hover:text-destructive disabled:opacity-30"
                                    >
                                        <Minus className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
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
