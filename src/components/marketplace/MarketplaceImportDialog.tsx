'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useToast } from '@/components/ui/Toast';
import { importFromMarketplace } from '@/hooks/useMarketplace';
import { Spinner } from '@/components/ui/Spinner';
import type { MarketplaceStudy } from '@/types';
import {
    X,
    Check,
    CheckSquare,
    Square,
    Download,
    Sparkles,
    ArrowRight,
} from 'lucide-react';

interface MarketplaceImportDialogProps {
    study: MarketplaceStudy;
    onClose: () => void;
}

type Phase = 'select' | 'importing' | 'success';

export function MarketplaceImportDialog({ study, onClose }: MarketplaceImportDialogProps) {
    const t = useTranslations('marketplace.importDialog');
    const tc = useTranslations('common');
    const router = useRouter();
    const modalRef = useModalA11y(onClose);
    const { addToast } = useToast();

    const [selectedDomainIds, setSelectedDomainIds] = useState<Set<string>>(
        new Set(study.domains.map(d => d.id))
    );
    const [phase, setPhase] = useState<Phase>('select');
    const [result, setResult] = useState<{ studyId: string; importedQuestions: number } | null>(null);

    // Estimate question count based on selected domains
    const estimatedQuestions = useMemo(() => {
        let count = 0;
        for (const domainId of selectedDomainIds) {
            count += study.domainQuestionCounts[domainId] ?? 0;
        }
        return count;
    }, [selectedDomainIds, study.domainQuestionCounts]);

    function toggleDomain(domainId: string) {
        setSelectedDomainIds(prev => {
            const next = new Set(prev);
            if (next.has(domainId)) {
                next.delete(domainId);
            } else {
                next.add(domainId);
            }
            return next;
        });
    }

    function toggleAll() {
        if (selectedDomainIds.size === study.domains.length) {
            setSelectedDomainIds(new Set());
        } else {
            setSelectedDomainIds(new Set(study.domains.map(d => d.id)));
        }
    }

    async function handleImport() {
        if (selectedDomainIds.size === 0) {
            addToast(t('noDomains'), 'warning');
            return;
        }

        setPhase('importing');

        try {
            const res = await importFromMarketplace(study.id, Array.from(selectedDomainIds));
            setResult({ studyId: res.studyId, importedQuestions: res.importedQuestions });
            setPhase('success');
        } catch (error) {
            const message = error instanceof Error ? error.message : t('noDomains');
            addToast(message, 'error');
            setPhase('select');
        }
    }

    const allSelected = selectedDomainIds.size === study.domains.length;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Dialog */}
            <div
                ref={modalRef}
                className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl max-h-[85vh] flex flex-col"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">{t('title')}</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">{t('description')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {phase === 'success' && result ? (
                        /* Success state */
                        <div className="flex flex-col items-center gap-4 py-8 text-center animate-fade-in">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                                <Sparkles className="h-8 w-8 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-foreground">{t('success')}</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('successDescription', {
                                        name: study.name,
                                        questions: result.importedQuestions,
                                    })}
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={onClose}
                                    className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                                >
                                    {t('stayHere')}
                                </button>
                                <button
                                    onClick={() => router.push(`/dashboard/${result.studyId}`)}
                                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg"
                                >
                                    {t('goToStudy')}
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Domain selection */
                        <>
                            {/* Select all toggle */}
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={toggleAll}
                                    className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                                >
                                    {allSelected ? (
                                        <>
                                            <CheckSquare className="h-4 w-4" />
                                            {t('deselectAll')}
                                        </>
                                    ) : (
                                        <>
                                            <Square className="h-4 w-4" />
                                            {t('selectAll')}
                                        </>
                                    )}
                                </button>
                                <span className="text-xs text-muted-foreground">
                                    {t('selectedCount', { count: selectedDomainIds.size, total: study.domains.length })}
                                </span>
                            </div>

                            {/* Domain list */}
                            <div className="space-y-2">
                                {study.domains.map((domain) => {
                                    const isSelected = selectedDomainIds.has(domain.id);
                                    const qCount = study.domainQuestionCounts[domain.id] ?? 0;
                                    return (
                                        <button
                                            key={domain.id}
                                            onClick={() => toggleDomain(domain.id)}
                                            className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                                                isSelected
                                                    ? 'border-primary/30 bg-primary/5'
                                                    : 'border-border bg-card hover:border-border hover:bg-accent/30'
                                            }`}
                                            disabled={phase === 'importing'}
                                        >
                                            <div className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                                                isSelected
                                                    ? 'border-primary bg-primary'
                                                    : 'border-muted-foreground/30'
                                            }`}>
                                                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                                                        {domain.abbreviation}
                                                    </span>
                                                    <span className="text-sm font-medium text-foreground truncate">{domain.name}</span>
                                                </div>
                                                {domain.description && (
                                                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{domain.description}</p>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground shrink-0">{qCount}q</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Estimated questions */}
                            {selectedDomainIds.size > 0 && (
                                <p className="text-xs text-muted-foreground text-center">
                                    {t('questionsIncluded', { count: estimatedQuestions })}
                                </p>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {phase !== 'success' && (
                    <div className="flex justify-end gap-3 border-t border-border px-6 py-4 shrink-0">
                        <button
                            onClick={onClose}
                            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                            disabled={phase === 'importing'}
                        >
                            {tc('cancel')}
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={selectedDomainIds.size === 0 || phase === 'importing'}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {phase === 'importing' ? (
                                <>
                                    <Spinner size={16} />
                                    {t('importing')}
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4" />
                                    {t('import')}
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
