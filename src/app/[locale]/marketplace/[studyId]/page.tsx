'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Shell } from '@/components/layout/Shell';
import { Spinner } from '@/components/ui/Spinner';
import { useMarketplaceStudy } from '@/hooks/useMarketplace';
import { Link } from '@/i18n/navigation';
import useSWR from 'swr';
import type { MarketplaceQuestion } from '@/types';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Database,
  Download,
  GraduationCap,
  Lock,
  Tag,
} from 'lucide-react';

const MarketplaceImportDialog = dynamic(
  () =>
    import('@/components/marketplace/MarketplaceImportDialog').then((m) => ({
      default: m.MarketplaceImportDialog,
    })),
  { ssr: false }
);

// Fetcher for marketplace questions (correctOptionIndex + explanation stripped by API)
async function questionsFetcher(
  url: string
): Promise<{ data: MarketplaceQuestion[]; nextCursor: string | null }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch questions');
  return res.json();
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-emerald-400 bg-emerald-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  hard: 'text-red-400 bg-red-500/10',
};

export default function MarketplaceStudyDetailPage() {
  const t = useTranslations('marketplace');
  const td = useTranslations('marketplace.studyDetail');
  const tc = useTranslations('common');
  const { studyId } = useParams<{ studyId: string }>();
  const { study, isLoading: studyLoading } = useMarketplaceStudy(studyId);
  const [showImport, setShowImport] = useState(false);

  const { data: questionsData, isLoading: questionsLoading } = useSWR(
    studyId ? `/api/marketplace/studies/${studyId}/questions?limit=20` : null,
    questionsFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  const questions = questionsData?.data ?? [];

  if (studyLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-20">
          <Spinner size={28} />
        </div>
      </Shell>
    );
  }

  if (!study) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-muted-foreground">Study not found</p>
          <Link
            href="/marketplace"
            className="text-primary text-sm hover:underline"
          >
            {t('backToMarketplace')}
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="animate-fade-in space-y-8">
        {/* Breadcrumb + Back */}
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Link
            href="/marketplace"
            className="hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToMarketplace')}
          </Link>
        </div>

        {/* Study header */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
              style={{ backgroundColor: study.accentColor || 'var(--primary)' }}
            >
              {study.abbreviation.slice(0, 4)}
            </div>
            <div>
              <h1 className="text-foreground text-2xl font-bold tracking-tight">
                {study.name}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {study.abbreviation}
              </p>
              {study.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {study.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-muted/50 text-muted-foreground inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[10px] font-medium"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowImport(true)}
            className="from-primary to-primary/80 text-primary-foreground shadow-primary/20 hover:shadow-primary/30 flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-semibold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <Download className="h-4 w-4" />
            {td('importButton')}
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border-border bg-card space-y-1 rounded-xl border p-5">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Database className="h-3.5 w-3.5" />
              {td('questionCount')}
            </div>
            <p className="text-foreground text-2xl font-bold">
              {study.questionCount}
            </p>
          </div>
          <div className="border-border bg-card space-y-1 rounded-xl border p-5">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <GraduationCap className="h-3.5 w-3.5" />
              {td('domainCount')}
            </div>
            <p className="text-foreground text-2xl font-bold">
              {study.domains.length}
            </p>
          </div>
          <div className="border-border bg-card space-y-1 rounded-xl border p-5">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Download className="h-3.5 w-3.5" />
              {td('importCount')}
            </div>
            <p className="text-foreground text-2xl font-bold">
              {study.importCount}
            </p>
          </div>
        </div>

        {/* About */}
        <div className="border-border bg-card space-y-3 rounded-xl border p-6">
          <h2 className="text-foreground text-sm font-semibold tracking-wider uppercase">
            {td('about')}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {study.description}
          </p>
        </div>

        {/* Domains */}
        <div className="space-y-4">
          <h2 className="text-foreground text-sm font-semibold tracking-wider uppercase">
            {td('domainsSection')} ({study.domains.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {study.domains.map((domain) => (
              <div
                key={domain.id}
                className="border-border bg-card space-y-1 rounded-xl border p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-bold">
                      {domain.abbreviation}
                    </span>
                    <span className="text-foreground text-sm font-medium">
                      {domain.name}
                    </span>
                  </div>
                  {study.domainQuestionCounts[domain.id] !== undefined && (
                    <span className="text-muted-foreground text-xs">
                      {study.domainQuestionCounts[domain.id]} {tc('questions')}
                    </span>
                  )}
                </div>
                {domain.description && (
                  <p className="text-muted-foreground pl-1 text-xs leading-relaxed">
                    {domain.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Questions preview */}
        <div className="space-y-4">
          <h2 className="text-foreground text-sm font-semibold tracking-wider uppercase">
            {td('questionsSection')} ({td('preview')})
          </h2>

          {questionsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size={24} />
            </div>
          ) : questions.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {td('noQuestions')}
            </p>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="border-border bg-card space-y-3 rounded-xl border p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-foreground text-sm leading-relaxed">
                      <span className="text-muted-foreground mr-2 font-mono text-xs">
                        {idx + 1}.
                      </span>
                      {q.text}
                    </p>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${DIFFICULTY_COLORS[q.difficulty] || ''}`}
                    >
                      {tc(q.difficulty)}
                    </span>
                  </div>

                  {/* Options */}
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {q.options.map((opt) => (
                      <div
                        key={opt.label}
                        className="bg-muted/30 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                      >
                        <span className="text-muted-foreground font-mono text-xs font-bold">
                          {opt.label}.
                        </span>
                        <span className="text-foreground">{opt.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Hidden answer notice */}
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <Lock className="h-3 w-3" />
                    {td('questionHidden')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Import dialog */}
      {showImport && study && (
        <MarketplaceImportDialog
          study={study}
          onClose={() => setShowImport(false)}
        />
      )}
    </Shell>
  );
}
