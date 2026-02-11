'use client';

import { useState } from 'react';
import type { Question, Difficulty } from '@/types';
import { Pencil, Trash2, ChevronDown } from 'lucide-react';

interface QuestionTableProps {
    questions: Question[];
    isLoading: boolean;
    onEdit: (question: Question) => void;
    onDelete: (questionId: string) => void;
    difficulty: Difficulty | 'all';
    onDifficultyChange: (diff: Difficulty | 'all') => void;
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
}: QuestionTableProps) {
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
                        <option key={d} value={d}>{d === 'all' ? 'All Difficulties' : d.charAt(0).toUpperCase() + d.slice(1)}</option>
                    ))}
                </select>

                <span className="flex items-center text-sm text-muted-foreground">
                    {questions.length} question{questions.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
                    </div>
                ) : questions.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                        No questions found
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                <th className="px-4 py-3">Question</th>
                                <th className="px-4 py-3 w-32">Domains</th>
                                <th className="px-4 py-3 w-24">Difficulty</th>
                                <th className="px-4 py-3 w-20 text-right">Actions</th>
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
                                                    {q.explanation}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {q.domainIds.map((did) => (
                                                <span key={did} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                                    {did}
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
                                        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                            <button
                                                onClick={() => onEdit(q)}
                                                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                                aria-label="Edit question"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(q.id)}
                                                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                aria-label="Delete question"
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
