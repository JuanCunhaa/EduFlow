'use client';

import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Spinner } from '@/components/ui/Spinner';
import { Star, Shield, Package, TrendingUp } from 'lucide-react';
import type { CreatorProfile, QuestionPack } from '@/types';

export default function CreatorProfilePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [packs, setPacks] = useState<QuestionPack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { slug } = await params;
      try {
        const res = await fetch(`/api/creators/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setCreator(data.creator);
          setPacks(data.packs || []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params]);

  if (loading) {
    return (
      <Shell>
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      </Shell>
    );
  }

  if (!creator) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <h1 className="text-xl font-bold">Creator not found</h1>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-4xl py-8">
        {/* Profile Header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="bg-primary/20 text-primary flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold">
            {creator.displayName.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{creator.displayName}</h1>
              {creator.badges.includes('verified') && (
                <Shield className="h-5 w-5 text-green-500" />
              )}
            </div>
            <p className="text-muted">{creator.bio}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {creator.certificationsHeld.map((cert) => (
                <span
                  key={cert}
                  className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs"
                >
                  {cert}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="bg-surface border-border rounded-lg border p-4 text-center">
            <Package className="text-muted mx-auto mb-1 h-5 w-5" />
            <div className="text-2xl font-bold">{creator.packCount}</div>
            <div className="text-muted text-xs">Packs</div>
          </div>
          <div className="bg-surface border-border rounded-lg border p-4 text-center">
            <TrendingUp className="text-muted mx-auto mb-1 h-5 w-5" />
            <div className="text-2xl font-bold">{creator.totalSales}</div>
            <div className="text-muted text-xs">Sales</div>
          </div>
          <div className="bg-surface border-border rounded-lg border p-4 text-center">
            <Star className="mx-auto mb-1 h-5 w-5 text-yellow-500" />
            <div className="text-2xl font-bold">
              {creator.averageRating.toFixed(1)}
            </div>
            <div className="text-muted text-xs">Rating</div>
          </div>
          <div className="bg-surface border-border rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{creator.yearsExperience}</div>
            <div className="text-muted text-xs">Years Exp.</div>
          </div>
        </div>

        {/* Published Packs */}
        <h2 className="mb-4 text-lg font-semibold">Published Packs</h2>
        {packs.length === 0 ? (
          <p className="text-muted">No published packs yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {packs.map((pack) => (
              <div
                key={pack.id}
                className="bg-surface border-border hover:border-primary rounded-lg border p-4 transition-colors"
              >
                <h3 className="font-semibold">{pack.title}</h3>
                <p className="text-muted mt-1 line-clamp-2 text-sm">
                  {pack.description}
                </p>
                <div className="text-muted mt-3 flex items-center gap-3 text-sm">
                  <span>{pack.questionCount} questions</span>
                  {pack.averageRating !== null && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-yellow-500" />
                      {pack.averageRating.toFixed(1)}
                    </span>
                  )}
                  <span className="text-foreground ml-auto font-semibold">
                    {pack.pricing === 'free'
                      ? 'Free'
                      : `$${(pack.priceUsd / 100).toFixed(2)}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
