'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Shell } from '@/components/layout/Shell';
import { useMarketplaceStudies } from '@/hooks/useMarketplace';
import { Spinner } from '@/components/ui/Spinner';
import { Link } from '@/i18n/navigation';
import type { MarketplaceStudy } from '@/types';
import {
  Search,
  Store,
  Database,
  GraduationCap,
  Download,
  ChevronRight,
  X,
  Tag,
} from 'lucide-react';

function StudyCard({ study }: { study: MarketplaceStudy }) {
  const t = useTranslations('marketplace');

  return (
    <Link
      href={`/marketplace/${study.id}`}
      className="card-premium group flex flex-col gap-4 p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white transition-transform group-hover:scale-105"
            style={{ backgroundColor: study.accentColor || 'var(--primary)' }}
          >
            {study.abbreviation.slice(0, 3)}
          </div>
          <div className="min-w-0">
            <h3 className="text-foreground truncate text-sm leading-tight font-semibold">
              {study.name}
            </h3>
            <span className="text-muted-foreground text-xs">
              {study.abbreviation}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-emerald-500 uppercase">
            {t('free')}
          </span>
          <ChevronRight className="text-muted-foreground h-4 w-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
      </div>

      {/* Description */}
      <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
        {study.description}
      </p>

      {/* Stats */}
      <div className="text-muted-foreground flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <GraduationCap className="h-3.5 w-3.5" />
          {t('domains', { count: study.domains.length })}
        </span>
        <span className="flex items-center gap-1">
          <Database className="h-3.5 w-3.5" />
          {t('questions', { count: study.questionCount })}
        </span>
        <span className="flex items-center gap-1">
          <Download className="h-3.5 w-3.5" />
          {t('imports', { count: study.importCount })}
        </span>
      </div>

      {/* Tags */}
      {study.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {study.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="bg-muted/50 text-muted-foreground inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[10px] font-medium"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
          {study.tags.length > 5 && (
            <span className="bg-muted/50 text-muted-foreground rounded-md px-2 py-0.5 text-[10px] font-medium">
              +{study.tags.length - 5}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

export default function MarketplacePage() {
  const t = useTranslations('marketplace');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => setDebouncedSearch(value), 300);
    setDebounceTimer(timer);
  }

  const { studies, isLoading } = useMarketplaceStudies({
    search: debouncedSearch || undefined,
  });

  return (
    <Shell>
      <div className="animate-fade-in space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Store className="text-primary h-6 w-6" />
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {t('subtitle')}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary w-full rounded-xl border py-2.5 pr-10 pl-10 text-sm transition-colors focus:ring-1 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setDebouncedSearch('');
              }}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
              aria-label={t('clearSearch')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size={28} />
          </div>
        ) : studies.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-20 text-center">
            <div className="bg-muted/50 flex h-20 w-20 items-center justify-center rounded-3xl">
              <Store className="text-muted-foreground/30 h-10 w-10" />
            </div>
            <div>
              <h3 className="text-foreground text-base font-semibold">
                {t('noResults')}
              </h3>
              <p className="text-muted-foreground mt-1.5 text-sm">
                {t('noResultsDescription')}
              </p>
            </div>
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                }}
                className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
              >
                <X className="h-4 w-4" />
                {t('clearSearch')}
              </button>
            )}
          </div>
        ) : (
          <div className="animate-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {studies.map((study) => (
              <StudyCard key={study.id} study={study} />
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
