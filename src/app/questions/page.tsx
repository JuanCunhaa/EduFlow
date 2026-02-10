'use client';

import { useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { QuestionTable } from '@/components/questions/QuestionTable';
import { QuestionForm } from '@/components/questions/QuestionForm';
import { ImportDialog } from '@/components/questions/ImportDialog';
import {
    useQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    importQuestions,
} from '@/hooks/useQuestions';
import type { Question, Certification, Difficulty } from '@/types';
import type { CreateQuestionInput } from '@/lib/validators';
import { Plus, Upload } from 'lucide-react';

export default function QuestionsPage() {
    const [certification, setCertification] = useState<Certification | ''>('');
    const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [showImport, setShowImport] = useState(false);

    const { questions, isLoading, refresh } = useQuestions({
        certification: certification || undefined,
        difficulty: difficulty === 'all' ? undefined : difficulty,
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

    async function handleDelete(questionId: string) {
        if (!confirm('Delete this question?')) return;
        await deleteQuestion(questionId);
        refresh();
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
                            Manage your question library across all certifications
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
                            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                            <Plus className="h-4 w-4" />
                            New Question
                        </button>
                    </div>
                </div>

                {/* Table */}
                <QuestionTable
                    questions={questions}
                    isLoading={isLoading}
                    onEdit={(q) => { setEditingQuestion(q); setShowForm(true); }}
                    onDelete={handleDelete}
                    certification={certification}
                    onCertificationChange={setCertification}
                    difficulty={difficulty}
                    onDifficultyChange={setDifficulty}
                />
            </div>

            {/* Modals */}
            {showForm && (
                <QuestionForm
                    question={editingQuestion}
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
        </Shell>
    );
}
