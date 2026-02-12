'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Plus, Minus, Palette } from 'lucide-react';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import type { MarketplaceStudy } from '@/types';

interface MarketplaceStudyFormDialogProps {
    study?: MarketplaceStudy | null;
    onClose: () => void;
    onSaved: () => void;
}

function makeEmptyDomain(order: number) {
    return { id: `d${order + 1}`, abbreviation: '', name: '', order, description: '' };
}

export function MarketplaceStudyFormDialog({ study, onClose, onSaved }: MarketplaceStudyFormDialogProps) {
    const isEditing = !!study;
    const t = useTranslations('marketplace.admin.studyForm');
    const tc = useTranslations('common');
    const modalRef = useModalA11y(onClose);
    const { addToast } = useToast();

    const [abbreviation, setAbbreviation] = useState(study?.abbreviation ?? '');
    const [name, setName] = useState(study?.name ?? '');
    const [description, setDescription] = useState(study?.description ?? '');
    const [domains, setDomains] = useState(
        study?.domains.map(d => ({
            id: d.id,
            abbreviation: d.abbreviation,
            name: d.name,
            order: d.order,
            description: d.description ?? '',
        })) ?? [makeEmptyDomain(0)]
    );
    const [accentColor, setAccentColor] = useState(study?.accentColor ?? '#10b981');
    const [tags, setTags] = useState(study?.tags.join(', ') ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function updateDomain(index: number, field: string, value: string) {
        setDomains(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    }

    function addDomain() {
        setDomains(prev => [...prev, makeEmptyDomain(prev.length)]);
    }

    function removeDomain(index: number) {
        if (domains.length <= 1) return;
        setDomains(prev => prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, order: i })));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        // Basic validation
        if (!abbreviation.trim() || !name.trim()) {
            setError(t('codeRequired'));
            return;
        }

        if (description.trim().length < 10) {
            setError(t('descRequired'));
            return;
        }

        const validDomains = domains.filter(d => d.abbreviation.trim() && d.name.trim());
        if (validDomains.length === 0) {
            setError(t('domainRequired'));
            return;
        }

        const parsedTags = tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);

        const payload = {
            abbreviation: abbreviation.trim(),
            name: name.trim(),
            description: description.trim(),
            domains: validDomains.map((d, i) => ({
                id: d.id || `d${i + 1}`,
                abbreviation: d.abbreviation.trim(),
                name: d.name.trim(),
                order: i,
                ...(d.description.trim() ? { description: d.description.trim() } : {}),
            })),
            accentColor,
            tags: parsedTags,
        };

        setSaving(true);
        try {
            const url = isEditing
                ? `/api/marketplace/studies/${study!.id}`
                : '/api/marketplace/studies';
            const method = isEditing ? 'PUT' : 'POST';

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
                        {isEditing ? tc('update') : tc('create')}
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

                    {/* Code + Name */}
                    <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('code')}</label>
                            <input
                                type="text"
                                value={abbreviation}
                                onChange={e => setAbbreviation(e.target.value)}
                                placeholder="CISSP"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                maxLength={20}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('fullName')}</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Certified Information Systems Security Professional"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                maxLength={200}
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('description')}</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder={t('descriptionPlaceholder')}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px] resize-y"
                            maxLength={2000}
                        />
                    </div>

                    {/* Accent Color + Tags */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                <Palette className="inline h-3 w-3 mr-1" />
                                {t('accentColor')}
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={accentColor}
                                    onChange={e => setAccentColor(e.target.value)}
                                    className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                                />
                                <input
                                    type="text"
                                    value={accentColor}
                                    onChange={e => setAccentColor(e.target.value)}
                                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    pattern="^#[0-9a-fA-F]{6}$"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('tags')}</label>
                            <input
                                type="text"
                                value={tags}
                                onChange={e => setTags(e.target.value)}
                                placeholder={t('tagsPlaceholder')}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>

                    {/* Domains */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-medium text-muted-foreground">
                                {t('domainsLabel', { count: domains.length })}
                            </label>
                            <button
                                type="button"
                                onClick={addDomain}
                                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                            >
                                <Plus className="h-3 w-3" />
                                {tc('create')}
                            </button>
                        </div>

                        <div className="space-y-2">
                            {domains.map((domain, idx) => (
                                <div key={idx} className="rounded-lg border border-border bg-background p-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={domain.abbreviation}
                                            onChange={e => updateDomain(idx, 'abbreviation', e.target.value)}
                                            placeholder="SAM"
                                            className="w-20 rounded border border-border bg-card px-2 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                                        />
                                        <input
                                            type="text"
                                            value={domain.name}
                                            onChange={e => updateDomain(idx, 'name', e.target.value)}
                                            placeholder="Security and Risk Management"
                                            className="flex-1 rounded border border-border bg-card px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                                        />
                                        {domains.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeDomain(idx)}
                                                className="rounded p-1 text-muted-foreground hover:text-red-400 transition-colors"
                                            >
                                                <Minus className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        value={domain.description}
                                        onChange={e => updateDomain(idx, 'description', e.target.value)}
                                        placeholder={t('domainDescPlaceholder')}
                                        className="w-full rounded border border-border bg-card px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                                    />
                                </div>
                            ))}
                        </div>
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
