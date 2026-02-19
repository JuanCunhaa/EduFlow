'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Plus, Minus, Palette, BookOpen } from 'lucide-react';
import { createStudy, updateStudy } from '@/hooks/useStudies';
import { useModalA11y } from '@/hooks/useModalA11y';
import type { Study, StudyDomain } from '@/types';

interface StudyFormDialogProps {
  study?: Study | null;
  onClose: () => void;
  onSaved: () => void;
}

function makeEmptyDomain(order: number): {
  id: string;
  abbreviation: string;
  name: string;
  order: number;
} {
  return { id: `d${order + 1}`, abbreviation: '', name: '', order };
}

// ── Certification Templates ─────────────────────

interface StudyTemplate {
  abbreviation: string;
  name: string;
  accentColor: string;
  domains: Array<{ abbreviation: string; name: string }>;
}

const CERT_TEMPLATES: StudyTemplate[] = [
  {
    abbreviation: 'CISSP',
    name: 'Certified Information Systems Security Professional',
    accentColor: '#3b82f6',
    domains: [
      { abbreviation: 'SRM', name: 'Security and Risk Management' },
      { abbreviation: 'AS', name: 'Asset Security' },
      { abbreviation: 'SAE', name: 'Security Architecture and Engineering' },
      { abbreviation: 'CNS', name: 'Communication and Network Security' },
      { abbreviation: 'IAM', name: 'Identity and Access Management' },
      { abbreviation: 'SAT', name: 'Security Assessment and Testing' },
      { abbreviation: 'SO', name: 'Security Operations' },
      { abbreviation: 'SDS', name: 'Software Development Security' },
    ],
  },
  {
    abbreviation: 'CC',
    name: 'Certified in Cybersecurity',
    accentColor: '#10b981',
    domains: [
      { abbreviation: 'SP', name: 'Security Principles' },
      {
        abbreviation: 'BC',
        name: 'Business Continuity, Disaster Recovery & Incident Response',
      },
      { abbreviation: 'AC', name: 'Access Controls Concepts' },
      { abbreviation: 'NS', name: 'Network Security' },
      { abbreviation: 'SO', name: 'Security Operations' },
    ],
  },
  {
    abbreviation: 'SSCP',
    name: 'Systems Security Certified Practitioner',
    accentColor: '#8b5cf6',
    domains: [
      { abbreviation: 'SOA', name: 'Security Operations and Administration' },
      { abbreviation: 'AC', name: 'Access Controls' },
      {
        abbreviation: 'RIM',
        name: 'Risk Identification, Monitoring and Analysis',
      },
      { abbreviation: 'IRR', name: 'Incident Response and Recovery' },
      { abbreviation: 'CRY', name: 'Cryptography' },
      { abbreviation: 'NCS', name: 'Network and Communications Security' },
      { abbreviation: 'SAS', name: 'Systems and Application Security' },
    ],
  },
];

function applyTemplate(template: StudyTemplate) {
  return {
    abbreviation: template.abbreviation,
    name: template.name,
    accentColor: template.accentColor,
    domains: template.domains.map((d, i) => ({
      id: `d${i + 1}`,
      abbreviation: d.abbreviation,
      name: d.name,
      order: i,
    })),
  };
}

export function StudyFormDialog({
  study,
  onClose,
  onSaved,
}: StudyFormDialogProps) {
  const isEditing = !!study;
  const t = useTranslations('studyForm');
  const tc = useTranslations('common');
  const modalRef = useModalA11y(onClose);

  const [abbreviation, setAbbreviation] = useState(study?.abbreviation || '');
  const [name, setName] = useState(study?.name || '');
  const [domains, setDomains] = useState<
    Array<{ id: string; abbreviation: string; name: string; order: number }>
  >(
    study?.domains.map((d) => ({
      id: d.id,
      abbreviation: d.abbreviation,
      name: d.name,
      order: d.order,
    })) || [makeEmptyDomain(0)]
  );
  const [accentColor, setAccentColor] = useState(
    study?.accentColor || '#10b981'
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addDomain() {
    if (domains.length >= 30) return;
    setDomains((prev) => [...prev, makeEmptyDomain(prev.length)]);
  }

  function removeDomain(index: number) {
    if (domains.length <= 1) return;
    setDomains((prev) =>
      prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, order: i }))
    );
  }

  function updateDomain(
    index: number,
    field: 'abbreviation' | 'name',
    value: string
  ) {
    setDomains((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d;
        const updated = { ...d, [field]: value };
        // Auto-generate ID from abbreviation if creating
        if (field === 'abbreviation' && !isEditing) {
          updated.id = `d${i + 1}`;
        }
        return updated;
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!abbreviation.trim() || !name.trim()) {
      setError(t('codeRequired'));
      return;
    }

    const validDomains = domains.filter(
      (d) => d.abbreviation.trim() && d.name.trim()
    );
    if (validDomains.length === 0) {
      setError(t('domainRequired'));
      return;
    }

    setSaving(true);
    try {
      if (isEditing && study) {
        await updateStudy(study.id, {
          abbreviation: abbreviation.trim(),
          name: name.trim(),
          domains: validDomains,
          accentColor,
        });
      } else {
        await createStudy({
          abbreviation: abbreviation.trim(),
          name: name.trim(),
          domains: validDomains,
          accentColor,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="border-border bg-card animate-slide-up relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-foreground text-lg font-semibold">
            {isEditing ? t('editTitle') : t('newTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Template picker (create only) */}
          {!isEditing && (
            <div className="space-y-2">
              <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <BookOpen className="h-3 w-3" /> {t('startFromTemplate')}
              </label>
              <div className="flex flex-wrap gap-2">
                {CERT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.abbreviation}
                    type="button"
                    onClick={() => {
                      const applied = applyTemplate(tpl);
                      setAbbreviation(applied.abbreviation);
                      setName(applied.name);
                      setAccentColor(applied.accentColor);
                      setDomains(applied.domains);
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                      abbreviation === tpl.abbreviation
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    {tpl.abbreviation}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Abbreviation + Name */}
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <div>
              <label
                htmlFor="study-code"
                className="text-muted-foreground mb-1 block text-xs font-medium"
              >
                {t('code')}
              </label>
              <input
                id="study-code"
                type="text"
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value.toUpperCase())}
                placeholder={t('codePlaceholder')}
                maxLength={20}
                className="border-border bg-background text-foreground focus:ring-primary/30 focus:border-primary/30 w-full rounded-lg border px-3 py-2 text-sm font-semibold outline-none focus:ring-2"
              />
            </div>
            <div>
              <label
                htmlFor="study-name"
                className="text-muted-foreground mb-1 block text-xs font-medium"
              >
                {t('fullName')}
              </label>
              <input
                id="study-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
                className="border-border bg-background text-foreground focus:ring-primary/30 focus:border-primary/30 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <label className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium">
              <Palette className="h-3 w-3" /> {t('accentColor')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="border-border h-9 w-9 cursor-pointer rounded-lg border bg-transparent p-0.5"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setAccentColor(v);
                }}
                maxLength={7}
                className="border-border bg-background text-foreground focus:ring-primary/30 focus:border-primary/30 w-24 rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:ring-2"
              />
              <div
                className="border-border h-6 w-6 rounded-full border"
                style={{ backgroundColor: accentColor }}
              />
            </div>
          </div>

          {/* Domains */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-muted-foreground text-xs font-medium">
                {t('domainsLabel', { count: domains.length })}
              </label>
              <button
                type="button"
                onClick={addDomain}
                disabled={domains.length >= 30}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md px-2 py-1 text-xs disabled:opacity-30"
              >
                <Plus className="h-3 w-3" /> {t('add')}
              </button>
            </div>

            <div className="max-h-60 space-y-2 overflow-y-auto">
              {domains.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground bg-muted/50 flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold">
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={d.abbreviation}
                    onChange={(e) =>
                      updateDomain(i, 'abbreviation', e.target.value)
                    }
                    placeholder={t('domainCodePlaceholder')}
                    className="border-border bg-background text-foreground focus:ring-primary/30 w-20 rounded-lg border px-2 py-1.5 text-xs font-semibold outline-none focus:ring-1"
                  />
                  <input
                    type="text"
                    value={d.name}
                    onChange={(e) => updateDomain(i, 'name', e.target.value)}
                    placeholder={t('domainNamePlaceholder')}
                    className="border-border bg-background text-foreground focus:ring-primary/30 flex-1 rounded-lg border px-2 py-1.5 text-xs outline-none focus:ring-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeDomain(i)}
                    disabled={domains.length <= 1}
                    className="text-muted-foreground hover:text-destructive rounded-md p-1 disabled:opacity-30"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground rounded-lg px-4 py-2 text-sm"
            >
              {tc('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? tc('saving') : isEditing ? tc('update') : tc('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
