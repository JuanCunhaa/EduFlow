'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { Question, Difficulty, StudyDomain } from '@/types';
import type { CreateQuestionInput } from '@/lib/validators';
import { FieldValidationError } from '@/lib/errors';
import { X, Plus, Minus } from 'lucide-react';
import { useModalA11y } from '@/hooks/useModalA11y';

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

export function QuestionForm({
  question,
  studyId,
  domains,
  onSubmit,
  onClose,
}: QuestionFormProps) {
  const t = useTranslations('questionForm');
  const tc = useTranslations('common');
  const modalRef = useModalA11y(onClose);
  const [form, setForm] = useState<CreateQuestionInput>(() =>
    makeEmptyForm(studyId)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isEditing = !!question;

  useEffect(() => {
    if (question) {
      setForm({
        studyId: question.studyId,
        domainIds: question.domainIds,
        text: question.text,
        options: question.options,
        correctOptionIndex: question.correctOptionIndex,
        explanation: !question.explanation
          ? { short: '', whyOthersWrong: {} }
          : typeof question.explanation === 'string'
            ? { short: question.explanation, whyOthersWrong: {} }
            : {
                short: question.explanation.short || '',
                whyOthersWrong: question.explanation.whyOthersWrong || {},
              },
        difficulty: question.difficulty,
        tags: question.tags,
      });
    } else {
      setForm(makeEmptyForm(studyId));
    }
  }, [question, studyId]);

  function updateField<K extends keyof CreateQuestionInput>(
    key: K,
    value: CreateQuestionInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateOption(index: number, text: string) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === index ? { ...opt, text } : opt
      ),
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
      correctOptionIndex: Math.min(
        prev.correctOptionIndex,
        prev.options.length - 2
      ),
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
    setFieldErrors({});
    setSaving(true);

    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      if (err instanceof FieldValidationError) {
        const mapped: Record<string, string> = {};
        for (const [field, messages] of Object.entries(err.fieldErrors)) {
          const key = `fieldError_${field}` as Parameters<typeof t>[0];
          // Use i18n key if available, otherwise show raw field+message
          mapped[field] = t.has(key)
            ? t(key)
            : t('fieldError_unknown', { field, message: messages[0] });
        }
        setFieldErrors(mapped);
      } else {
        setError(err instanceof Error ? err.message : t('saveFailed'));
      }
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
        className="border-border bg-card relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border p-6 shadow-2xl"
      >
        {/* Header */}
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
          {/* Row: Domain(s) + Difficulty */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Domains multi-select */}
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-medium">
                {t('domains')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {domains.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDomain(d.id)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      form.domainIds.includes(d.id)
                        ? 'bg-primary/20 text-primary ring-primary/30 ring-1'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                  >
                    {d.abbreviation}
                  </button>
                ))}
              </div>
              {form.domainIds.length === 0 && (
                <p className="mt-1 text-xs text-amber-500">
                  {t('domainError')}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="q-difficulty"
                className="text-muted-foreground mb-1 block text-xs font-medium"
              >
                {t('difficulty')}
              </label>
              <select
                id="q-difficulty"
                value={form.difficulty}
                onChange={(e) =>
                  updateField('difficulty', e.target.value as Difficulty)
                }
                className="border-border bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {tc(d)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label
              htmlFor="q-text"
              className="text-muted-foreground mb-1 block text-xs font-medium"
            >
              {t('question')}
            </label>
            <textarea
              id="q-text"
              value={form.text}
              onChange={(e) => updateField('text', e.target.value)}
              rows={3}
              placeholder={t('questionPlaceholder')}
              className={`bg-background text-foreground focus:ring-ring w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 ${fieldErrors.text ? 'border-destructive' : 'border-border'}`}
            />
            {fieldErrors.text && (
              <p className="text-destructive mt-1 text-xs">
                {fieldErrors.text}
              </p>
            )}
          </div>

          {/* Options (4-5) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-muted-foreground block text-xs font-medium">
                {t('answerOptions', { count: form.options.length })}
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={removeOption}
                  disabled={form.options.length <= 4}
                  className="text-muted-foreground hover:text-foreground rounded-md p-1 disabled:opacity-30"
                  title={t('removeOption')}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={addOption}
                  disabled={form.options.length >= 5}
                  className="text-muted-foreground hover:text-foreground rounded-md p-1 disabled:opacity-30"
                  title={t('addOption')}
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
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                    form.correctOptionIndex === i
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
                  placeholder={t('optionPlaceholder', { label: opt.label })}
                  className="border-border bg-background text-foreground focus:ring-ring flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-1"
                />
              </div>
            ))}
            <p className="text-muted-foreground text-xs">{t('correctHint')}</p>
          </div>

          {/* Explanation */}
          <div>
            <label
              htmlFor="q-explanation"
              className="text-muted-foreground mb-1 block text-xs font-medium"
            >
              {t('explanation')}
            </label>
            <textarea
              id="q-explanation"
              value={form.explanation.short}
              onChange={(e) =>
                updateField('explanation', {
                  ...form.explanation,
                  short: e.target.value,
                })
              }
              rows={3}
              placeholder={t('explanationPlaceholder')}
              className={`bg-background text-foreground focus:ring-ring w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 ${fieldErrors.explanation ? 'border-destructive' : 'border-border'}`}
            />
            {fieldErrors.explanation && (
              <p className="text-destructive mt-1 text-xs">
                {fieldErrors.explanation}
              </p>
            )}
          </div>

          {/* Why Others Wrong — per-option */}
          <div className="space-y-2">
            <label className="text-muted-foreground block text-xs font-medium">
              {t('whyOthersWrong')}{' '}
              <span className="text-muted-foreground/50">
                {t('perOptionOptional')}
              </span>
            </label>
            {form.options
              .filter((_, i) => i !== form.correctOptionIndex)
              .map((opt) => (
                <div key={opt.label} className="flex items-center gap-2">
                  <span className="bg-muted text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-medium">
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
                      updateField('explanation', {
                        ...form.explanation,
                        whyOthersWrong: updated,
                      });
                    }}
                    placeholder={t('whyWrongPlaceholder', { label: opt.label })}
                    className="border-border bg-background text-foreground focus:ring-ring flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-1"
                  />
                </div>
              ))}
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="q-tags"
              className="text-muted-foreground mb-1 block text-xs font-medium"
            >
              {t('tags')}
            </label>
            <input
              id="q-tags"
              type="text"
              value={form.tags.join(', ')}
              onChange={(e) =>
                updateField(
                  'tags',
                  e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                )
              }
              placeholder={t('tagsPlaceholder')}
              className="border-border bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
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
              disabled={saving || form.domainIds.length === 0}
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
