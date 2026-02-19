'use client';

import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Spinner } from '@/components/ui/Spinner';
import { Star, ShieldCheck, Download, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from '@/i18n/navigation';
import type { QuestionPack, PackReview } from '@/types';

export default function PackDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const { user } = useAuth();
    const [pack, setPack] = useState<QuestionPack | null>(null);
    const [reviews, setReviews] = useState<PackReview[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const { slug } = await params;
            try {
                const [packRes, reviewsRes] = await Promise.all([
                    fetch(`/api/packs/${slug}`),
                    fetch(`/api/packs/${slug}/reviews`),
                ]);

                if (packRes.ok) {
                    const data = await packRes.json();
                    setPack(data.pack);
                }
                if (reviewsRes.ok) {
                    const data = await reviewsRes.json();
                    setReviews(data.reviews || []);
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

    if (!pack) {
        return (
            <Shell>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <h1 className="text-xl font-bold">Pack not found</h1>
                    <Link href="/marketplace" className="btn btn-ghost mt-4">Browse Marketplace</Link>
                </div>
            </Shell>
        );
    }

    const priceDisplay = pack.pricing === 'free' ? 'Free' : `$${(pack.priceUsd / 100).toFixed(2)}`;

    return (
        <Shell>
            <div className="max-w-3xl mx-auto py-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold mb-2">{pack.title}</h1>
                    <div className="flex items-center gap-3 text-sm text-muted">
                        <Link href={`/marketplace/creators/${pack.creatorSlug}`} className="flex items-center gap-1 hover:text-foreground">
                            {pack.creatorName}
                            {pack.creatorBadges.includes('verified') && <ShieldCheck className="w-4 h-4 text-green-500" />}
                        </Link>
                        {pack.averageRating !== null && (
                            <span className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500" />
                                {pack.averageRating.toFixed(1)} ({pack.reviewCount})
                            </span>
                        )}
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="md:col-span-2 space-y-4">
                        <p className="text-muted">{pack.description}</p>

                        {/* Difficulty distribution */}
                        <div>
                            <h3 className="text-sm font-semibold mb-2">Difficulty Distribution</h3>
                            <div className="flex gap-4 text-sm">
                                <span className="text-green-400">Easy: {pack.difficultyDistribution.easy}%</span>
                                <span className="text-yellow-400">Medium: {pack.difficultyDistribution.medium}%</span>
                                <span className="text-red-400">Hard: {pack.difficultyDistribution.hard}%</span>
                            </div>
                        </div>

                        {/* Tags */}
                        {pack.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {pack.tags.map((tag) => (
                                    <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Purchase Card */}
                    <div className="p-5 rounded-lg bg-surface border border-border">
                        <div className="text-3xl font-bold mb-3">{priceDisplay}</div>
                        <div className="text-sm text-muted mb-4">
                            {pack.questionCount} questions · {pack.certId.toUpperCase()}
                        </div>
                        <button className="btn btn-primary w-full flex items-center justify-center gap-2">
                            {pack.pricing === 'free' ? (
                                <><Download className="w-4 h-4" /> Import Free</>
                            ) : (
                                <>Buy Now <ChevronRight className="w-4 h-4" /></>
                            )}
                        </button>
                        <ul className="mt-4 space-y-2 text-sm text-muted">
                            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Detailed explanations</li>
                            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Dashboard integration</li>
                            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Lifetime access</li>
                        </ul>
                    </div>
                </div>

                {/* Reviews */}
                <h2 className="text-lg font-semibold mb-4">
                    Reviews ({reviews.length})
                </h2>
                {reviews.length === 0 ? (
                    <p className="text-muted">No reviews yet.</p>
                ) : (
                    <div className="space-y-4">
                        {reviews.map((review) => (
                            <div key={review.id} className="p-4 rounded-lg bg-surface border border-border">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex items-center gap-0.5">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted'}`} />
                                        ))}
                                    </div>
                                    <span className="text-sm font-medium">{review.reviewerName}</span>
                                    {review.isVerifiedPurchase && (
                                        <span className="text-xs text-green-500">Verified Purchase</span>
                                    )}
                                </div>
                                {review.text && <p className="text-sm text-muted">{review.text}</p>}
                                {review.creatorResponse && (
                                    <div className="mt-2 pl-4 border-l-2 border-primary">
                                        <p className="text-xs text-muted">Creator response:</p>
                                        <p className="text-sm">{review.creatorResponse}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Shell>
    );
}
