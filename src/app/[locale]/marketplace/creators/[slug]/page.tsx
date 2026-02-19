'use client';

import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Spinner } from '@/components/ui/Spinner';
import { Star, Shield, Package, TrendingUp } from 'lucide-react';
import type { CreatorProfile, QuestionPack } from '@/types';

export default function CreatorProfilePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
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
        return <Shell><div className="flex justify-center py-20"><Spinner /></div></Shell>;
    }

    if (!creator) {
        return (
            <Shell>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <h1 className="text-xl font-bold">Creator not found</h1>
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="max-w-4xl mx-auto py-8">
                {/* Profile Header */}
                <div className="flex items-start gap-4 mb-8">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                        {creator.displayName.charAt(0)}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold">{creator.displayName}</h1>
                            {creator.badges.includes('verified') && (
                                <Shield className="w-5 h-5 text-green-500" />
                            )}
                        </div>
                        <p className="text-muted">{creator.bio}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {creator.certificationsHeld.map((cert) => (
                                <span key={cert} className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                                    {cert}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-4 rounded-lg bg-surface border border-border text-center">
                        <Package className="w-5 h-5 mx-auto mb-1 text-muted" />
                        <div className="text-2xl font-bold">{creator.packCount}</div>
                        <div className="text-xs text-muted">Packs</div>
                    </div>
                    <div className="p-4 rounded-lg bg-surface border border-border text-center">
                        <TrendingUp className="w-5 h-5 mx-auto mb-1 text-muted" />
                        <div className="text-2xl font-bold">{creator.totalSales}</div>
                        <div className="text-xs text-muted">Sales</div>
                    </div>
                    <div className="p-4 rounded-lg bg-surface border border-border text-center">
                        <Star className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                        <div className="text-2xl font-bold">{creator.averageRating.toFixed(1)}</div>
                        <div className="text-xs text-muted">Rating</div>
                    </div>
                    <div className="p-4 rounded-lg bg-surface border border-border text-center">
                        <div className="text-2xl font-bold">{creator.yearsExperience}</div>
                        <div className="text-xs text-muted">Years Exp.</div>
                    </div>
                </div>

                {/* Published Packs */}
                <h2 className="text-lg font-semibold mb-4">Published Packs</h2>
                {packs.length === 0 ? (
                    <p className="text-muted">No published packs yet.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {packs.map((pack) => (
                            <div key={pack.id} className="p-4 rounded-lg bg-surface border border-border hover:border-primary transition-colors">
                                <h3 className="font-semibold">{pack.title}</h3>
                                <p className="text-sm text-muted mt-1 line-clamp-2">{pack.description}</p>
                                <div className="flex items-center gap-3 mt-3 text-sm text-muted">
                                    <span>{pack.questionCount} questions</span>
                                    {pack.averageRating !== null && (
                                        <span className="flex items-center gap-1">
                                            <Star className="w-3.5 h-3.5 text-yellow-500" />
                                            {pack.averageRating.toFixed(1)}
                                        </span>
                                    )}
                                    <span className="ml-auto font-semibold text-foreground">
                                        {pack.pricing === 'free' ? 'Free' : `$${(pack.priceUsd / 100).toFixed(2)}`}
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
