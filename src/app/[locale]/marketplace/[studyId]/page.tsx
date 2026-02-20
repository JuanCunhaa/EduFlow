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
  Star,
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

interface Review {
  id: string;
  rating: number;
  comment?: string;
  authorName: string;
  createdAt: string | null;
}

async function reviewsFetcher(
  url: string
): Promise<{ data: { reviews: Review[]; avgRating: number | null; totalReviews: number } }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch reviews');
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
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const { data: questionsData, isLoading: questionsLoading } = useSWR(
    studyId ? `/api/marketplace/studies/${studyId}/questions?limit=20` : null,
    questionsFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  const { data: reviewsData, mutate: mutateReviews } = useSWR(
    studyId ? `/api/marketplace/studies/${studyId}/reviews` : null,
    reviewsFetcher,
    { revalidateOnFocus: false }
  );

  const questions = questionsData?.data ?? [];
  const reviews = reviewsData?.data?.reviews ?? [];
  const avgRating = reviewsData?.data?.avgRating ?? null;
  const totalReviews = reviewsData?.data?.totalReviews ?? 0;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewRating === 0) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/marketplace/studies/${studyId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert((data as { error?: string }).error ?? 'Failed to submit review');
      } else {
        setReviewRating(0);
        setReviewComment('');
        await mutateReviews();
      }
    } finally {
      setSubmittingReview(false);
    }
  };

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

        {/* Reviews Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground flex items-center gap-2 text-lg font-bold">
              <Star className="text-amber-400 h-5 w-5" />
              Reviews
              {totalReviews > 0 && (
                <span className="text-muted-foreground text-sm font-normal">
                  · {avgRating}/5 ({totalReviews})
                </span>
              )}
            </h2>
          </div>

          {/* Submit review form */}
          <form
            onSubmit={handleSubmitReview}
            className="border-border bg-card space-y-3 rounded-xl border p-4"
          >
            <p className="text-foreground text-sm font-medium">Leave a review</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-6 w-6 ${star <= reviewRating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/30'
                      }`}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Optional comment…"
              maxLength={500}
              rows={2}
              className="border-border bg-input text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
            />
            <button
              type="submit"
              disabled={reviewRating === 0 || submittingReview}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {submittingReview ? 'Submitting…' : 'Submit'}
            </button>
          </form>

          {/* Reviews list */}
          {reviews.length === 0 ? (
            <p className="text-muted-foreground text-sm">No reviews yet. Be the first!</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="border-border bg-card rounded-xl border p-4"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < review.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted-foreground/20'
                            }`}
                        />
                      ))}
                    </div>
                    <span className="text-muted-foreground text-xs">{review.authorName}</span>
                  </div>
                  {review.comment && (
                    <p className="text-muted-foreground text-sm">{review.comment}</p>
                  )}
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
