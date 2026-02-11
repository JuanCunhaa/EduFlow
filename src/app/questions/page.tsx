'use client';

import { useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { QuestionTable } from '@/components/questions/QuestionTable';
import { QuestionForm } from '@/components/questions/QuestionForm';
import { ImportDialog } from '@/components/questions/ImportDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
    useQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    importQuestions,
} from '@/hooks/useQuestions';
import { useStudies } from '@/hooks/useStudies';
import { useToast } from '@/components/ui/Toast';
import type { Question, Difficulty, Study } from '@/types';
import type { CreateQuestionInput } from '@/lib/validators';
import { Plus, Upload, Search } from 'lucide-react';

export default function QuestionsPage() {
    const { studies } = useStudies();
    const [activeStudy, setActiveStudy] = useState<Study | null>(null);
    const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
    const [search, setSearch] = useState('');
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { addToast } = useToast();

    // Auto-select first study if none selected
    const currentStudy = activeStudy || studies[0] || null;

    const { questions, isLoading, refresh } = useQuestions({
        studyId: currentStudy?.id,
        difficulty: difficulty === 'all' ? undefined : difficulty,
        search: search || undefined,
    });

    async function handleCreate(data: CreateQuestionInput) {
        await createQuestion(data);
        refresh();
    }

    async function handleUpdate(data: CreateQuestionInput) {
        if (!editingQuestion) return;
        await updateQuestion(editingQuestion.id, data);
        refresh();
    }

    async function handleDeleteConfirm() {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deleteQuestion(deleteTarget);
            refresh();
            addToast('Question deleted', 'success');
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to delete', 'error');
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    }

    async function handleImport(jsonText: string) {
        let parsed: unknown;
        try {
            parsed = JSON.parse(jsonText);
        } catch {
            throw new Error('Invalid JSON format. Please check your input and try again.');
        }
        const items = Array.isArray(parsed) ? parsed : (parsed as Record<string, unknown>).questions;
        await importQuestions(items as CreateQuestionInput[]);
        refresh();
    }

    return (
        <Shell>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Question Bank</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage your question library across all studies
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowImport(true)}
                            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                            <Upload className="h-4 w-4" />
                            Import
                        </button>
                        <button
                            onClick={() => { setEditingQuestion(null); setShowForm(true); }}
                            disabled={!currentStudy}
                            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                            <Plus className="h-4 w-4" />
                            New Question
                        </button>
                    </div>
                </div>

                {/* Study selector */}
                <div className="flex flex-wrap items-center gap-2">
                    {studies.map((study) => (
                        <button
                            key={study.id}
                            onClick={() => setActiveStudy(study)}
                            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${currentStudy?.id === study.id
                                    ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                }`}
                        >
                            {study.abbreviation}
                        </button>
                    ))}
                </div>

                {/* Search bar */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search questions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2.5 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary/30 placeholder:text-muted-foreground"
                    />
                </div>

                {/* Table */}
                <QuestionTable
                    questions={questions}
                    isLoading={isLoading}
                    onEdit={(q) => { setEditingQuestion(q); setShowForm(true); }}
                    onDelete={(id) => setDeleteTarget(id)}
                    difficulty={difficulty}
                    onDifficultyChange={setDifficulty}
                />
            </div>

            {/* Modals */}
            {showForm && currentStudy && (
                <QuestionForm
                    question={editingQuestion}
                    studyId={currentStudy.id}
                    domains={currentStudy.domains}
                    onSubmit={editingQuestion ? handleUpdate : handleCreate}
                    onClose={() => { setShowForm(false); setEditingQuestion(null); }}
                />
            )}

            {showImport && (
                <ImportDialog
                    onImport={handleImport}
                    onClose={() => setShowImport(false)}
                />
            )}

            <ConfirmDialog
                open={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
                title="Delete Question"
                confirmLabel="Delete"
                variant="danger"
                loading={isDeleting}
            >
                <p>Are you sure you want to delete this question? This action cannot be undone.</p>
            </ConfirmDialog>
        </Shell>
    );
}
