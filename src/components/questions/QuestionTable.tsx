'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Question, Difficulty } from '@/types';
import { Pencil, Trash2, ChevronDown, Upload, Plus } from 'lucide-react';
import { SkeletonTable } from '@/components/ui/Skeleton';

interface QuestionTableProps {
    questions: Question[];
    isLoading: boolean;
    onEdit: (question: Question) => void;
    onDelete: (questionId: string) => void;
    difficulty: Difficulty | 'all';
    onDifficultyChange: (diff: Difficulty | 'all') => void;
    /** Map of domainId → domain name for human-readable display */
    domainMap?: Record<string, string>;
    /** Called when user clicks "New Question" from empty state */
    onAdd?: () => void;
    /** Called when user clicks "Import" from empty state */
    onImport?: () => void;
}

const DIFFICULTIES: (Difficulty | 'all')[] = ['all', 'easy', 'medium', 'hard'];

const DIFFICULTY_COLORS: Record<string, string> = {
    easy: 'text-green-400 bg-green-400/10',
    medium: 'text-yellow-400 bg-yellow-400/10',
    hard: 'text-red-400 bg-red-400/10',
};

export function QuestionTable({
    questions,
    isLoading,
    onEdit,
    onDelete,
    difficulty,
    onDifficultyChange,
    domainMap = {},
    onAdd,
    onImport,
}: QuestionTableProps) {
    const t = useTranslations('questionTable');
    const tc = useTranslations('common');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <select
                    value={difficulty}
                    onChange={(e) => onDifficultyChange(e.target.value as Difficulty | 'all')}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                >
                    {DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>{d === 'all' ? t('allDifficulties') : tc(d)}</option>
                    ))}
                </select>

                <span className="flex items-center text-sm text-muted-foreground">
                    {t('questionCount', { count: questions.length })}
                </span>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {isLoading ? (
                    <SkeletonTable />
                ) : questions.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-16">
                        <p className="text-sm text-muted-foreground">{t('noQuestions')}</p>
                        <div className="flex gap-2">
                            {onImport && (
                                <button
                                    onClick={onImport}
                                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                >
                                    <Upload className="h-3.5 w-3.5" /> {t('importQuestions')}
                                </button>
                            )}
                            {onAdd && (
                                <button
                                    onClick={onAdd}
                                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                                >
                                    <Plus className="h-3.5 w-3.5" /> {t('newQuestion')}
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                <th className="px-4 py-3">{t('questionHeader')}</th>
                                <th className="px-4 py-3 w-32">{t('domainsHeader')}</th>
                                <th className="px-4 py-3 w-24">{t('difficultyHeader')}</th>
                                <th className="px-4 py-3 w-20 text-right">{t('actionsHeader')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {questions.map((q) => (
                                <tr key={q.id} className="group transition-colors hover:bg-muted/30">
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                                            className="flex items-start gap-2 text-left text-sm text-foreground"
                                        >
                                            <ChevronDown
                                                className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expandedId === q.id ? 'rotate-180' : ''
                                                    }`}
                                            />
                                            <span className="line-clamp-2">{q.text}</span>
                                        </button>
                                        {expandedId === q.id && (
                                            <div className="mt-3 ml-6 space-y-2 rounded-lg bg-muted/30 p-3">
                                                {q.options.map((opt, i) => (
                                                    <div
                                                        key={opt.label}
                                                        className={`text-sm ${i === q.correctOptionIndex
                                                            ? 'font-medium text-green-400'
                                                            : 'text-muted-foreground'
                                                            }`}
                                                    >
                                                        {opt.label}. {opt.text}
                                                        {i === q.correctOptionIndex && ' ✓'}
                                                    </div>
                                                ))}
                                                <div className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                                                    {typeof q.explanation === 'string' ? q.explanation : q.explanation.short}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {q.domainIds.map((did) => (
                                                <span key={did} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary" title={domainMap[did] || did}>
                                                    {domainMap[did] || did}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[q.difficulty]}`}>
                                            {q.difficulty}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-1 opacity-100 md:opacity-0 transition-opacity md:group-hover:opacity-100">
                                            <button
                                                onClick={() => onEdit(q)}
                                                className="rounded-md p-1.5 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                                aria-label={t('editQuestion')}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(q.id)}
                                                className="rounded-md p-1.5 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                aria-label={t('deleteQuestion')}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
