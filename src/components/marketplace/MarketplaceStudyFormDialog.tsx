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
  return {
    id: `d${order + 1}`,
    abbreviation: '',
    name: '',
    order,
    description: '',
  };
}

export function MarketplaceStudyFormDialog({
  study,
  onClose,
  onSaved,
}: MarketplaceStudyFormDialogProps) {
  const isEditing = !!study;
  const t = useTranslations('marketplace.admin.studyForm');
  const tc = useTranslations('common');
  const modalRef = useModalA11y(onClose);
  const { addToast } = useToast();

  const [abbreviation, setAbbreviation] = useState(study?.abbreviation ?? '');
  const [name, setName] = useState(study?.name ?? '');
  const [description, setDescription] = useState(study?.description ?? '');
  const [domains, setDomains] = useState(
    study?.domains.map((d) => ({
      id: d.id,
      abbreviation: d.abbreviation,
      name: d.name,
      order: d.order,
      description: d.description ?? '',
    })) ?? [makeEmptyDomain(0)]
  );
  const [accentColor, setAccentColor] = useState(
    study?.accentColor ?? '#10b981'
  );
  const [tags, setTags] = useState(study?.tags.join(', ') ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateDomain(index: number, field: string, value: string) {
    setDomains((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function addDomain() {
    setDomains((prev) => [...prev, makeEmptyDomain(prev.length)]);
  }

  function removeDomain(index: number) {
    if (domains.length <= 1) return;
    setDomains((prev) =>
      prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, order: i }))
    );
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

    const validDomains = domains.filter(
      (d) => d.abbreviation.trim() && d.name.trim()
    );
    if (validDomains.length === 0) {
      setError(t('domainRequired'));
      return;
    }

    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
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
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={modalRef}
        className="border-border bg-card relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="border-border flex shrink-0 items-center justify-between border-b px-6 py-4">
          <h2 className="text-foreground text-lg font-bold">
            {isEditing ? tc('update') : tc('create')}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg p-1.5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-5 overflow-y-auto px-6 py-5"
        >
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Code + Name */}
          <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
            <div>
              <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                {t('code')}
              </label>
              <input
                type="text"
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value)}
                placeholder="CISSP"
                className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                maxLength={20}
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                {t('fullName')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Certified Information Systems Security Professional"
                className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                maxLength={200}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
              {t('description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary min-h-[80px] w-full resize-y rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              maxLength={2000}
            />
          </div>

          {/* Accent Color + Tags */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                <Palette className="mr-1 inline h-3 w-3" />
                {t('accentColor')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="border-border h-9 w-12 cursor-pointer rounded border bg-transparent"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="border-border bg-background text-foreground focus:border-primary focus:ring-primary flex-1 rounded-lg border px-3 py-2 font-mono text-sm focus:ring-1 focus:outline-none"
                  pattern="^#[0-9a-fA-F]{6}$"
                />
              </div>
            </div>
            <div>
              <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                {t('tags')}
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t('tagsPlaceholder')}
                className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              />
            </div>
          </div>

          {/* Domains */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-muted-foreground text-xs font-medium">
                {t('domainsLabel', { count: domains.length })}
              </label>
              <button
                type="button"
                onClick={addDomain}
                className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors"
              >
                <Plus className="h-3 w-3" />
                {tc('create')}
              </button>
            </div>

            <div className="space-y-2">
              {domains.map((domain, idx) => (
                <div
                  key={idx}
                  className="border-border bg-background space-y-2 rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={domain.abbreviation}
                      onChange={(e) =>
                        updateDomain(idx, 'abbreviation', e.target.value)
                      }
                      placeholder="SAM"
                      className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary w-20 rounded border px-2 py-1.5 font-mono text-xs focus:outline-none"
                    />
                    <input
                      type="text"
                      value={domain.name}
                      onChange={(e) =>
                        updateDomain(idx, 'name', e.target.value)
                      }
                      placeholder="Security and Risk Management"
                      className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary flex-1 rounded border px-2 py-1.5 text-xs focus:outline-none"
                    />
                    {domains.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDomain(idx)}
                        className="text-muted-foreground rounded p-1 transition-colors hover:text-red-400"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={domain.description}
                    onChange={(e) =>
                      updateDomain(idx, 'description', e.target.value)
                    }
                    placeholder={t('domainDescPlaceholder')}
                    className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary w-full rounded border px-2 py-1.5 text-xs focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="border-border flex shrink-0 justify-end gap-3 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
            disabled={saving}
          >
            {tc('cancel')}
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="from-primary to-primary/80 text-primary-foreground shadow-primary/20 flex items-center gap-2 rounded-xl bg-gradient-to-r px-5 py-2 text-sm font-semibold shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Spinner size={16} />
                {tc('saving')}
              </>
            ) : isEditing ? (
              tc('update')
            ) : (
              tc('create')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
