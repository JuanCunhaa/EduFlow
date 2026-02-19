'use client';

import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Spinner } from '@/components/ui/Spinner';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Eye, Clock, CheckCircle, XCircle, AlertCircle, Package } from 'lucide-react';
import type { QuestionPack, PackStatus } from '@/types';

const STATUS_CONFIG: Record<PackStatus, { label: string; color: string; icon: typeof Eye }> = {
    draft: { label: 'Draft', color: 'text-muted', icon: Clock },
    submitted: { label: 'In Review', color: 'text-yellow-500', icon: Clock },
    in_review: { label: 'In Review', color: 'text-yellow-500', icon: Eye },
    revision_needed: { label: 'Needs Revision', color: 'text-orange-500', icon: AlertCircle },
    approved: { label: 'Approved', color: 'text-green-500', icon: CheckCircle },
    published: { label: 'Published', color: 'text-green-500', icon: CheckCircle },
    suspended: { label: 'Suspended', color: 'text-red-500', icon: XCircle },
    archived: { label: 'Archived', color: 'text-muted', icon: XCircle },
};

export default function CreatorDashboardPage() {
    const { user } = useAuth();
    const [packs, setPacks] = useState<QuestionPack[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalPacks: 0, published: 0, totalSales: 0, avgRating: 0 });

    useEffect(() => {
        if (!user) return;

        const load = async () => {
            try {
                const res = await fetch(`/api/creators/${user.uid}`);
                if (res.ok) {
                    const data = await res.json();
                    setPacks(data.packs || []);

                    const published = (data.packs || []).filter((p: QuestionPack) => p.status === 'published');
                    setStats({
                        totalPacks: data.packs?.length || 0,
                        published: published.length,
                        totalSales: published.reduce((sum: number, p: QuestionPack) => sum + p.salesCount, 0),
                        avgRating: data.creator?.averageRating || 0,
                    });
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    if (!user) {
        return <Shell><p className="text-muted text-center py-20">Please log in</p></Shell>;
    }

    if (loading) {
        return <Shell><div className="flex justify-center py-20"><Spinner /></div></Shell>;
    }

    return (
        <Shell>
            <div className="max-w-4xl mx-auto py-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Creator Dashboard</h1>
                    <Link href="/marketplace/creators/apply" className="btn btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" /> New Pack
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Packs', value: stats.totalPacks },
                        { label: 'Published', value: stats.published },
                        { label: 'Total Sales', value: stats.totalSales },
                        { label: 'Avg Rating', value: stats.avgRating.toFixed(1) },
                    ].map(({ label, value }) => (
                        <div key={label} className="p-4 rounded-lg bg-surface border border-border text-center">
                            <div className="text-2xl font-bold">{value}</div>
                            <div className="text-xs text-muted">{label}</div>
                        </div>
                    ))}
                </div>

                {/* Packs List */}
                <h2 className="text-lg font-semibold mb-4">Your Packs</h2>
                {packs.length === 0 ? (
                    <div className="text-center py-12 bg-surface rounded-lg border border-border">
                        <Package className="w-12 h-12 mx-auto text-muted mb-3" />
                        <p className="text-muted">No packs yet. Create your first pack!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {packs.map((pack) => {
                            const cfg = STATUS_CONFIG[pack.status];
                            const Icon = cfg.icon;
                            return (
                                <div key={pack.id} className="flex items-center gap-4 p-4 rounded-lg bg-surface border border-border hover:border-primary transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold truncate">{pack.title}</h3>
                                        <div className="flex items-center gap-3 text-sm text-muted mt-1">
                                            <span>{pack.certId.toUpperCase()}</span>
                                            <span>{pack.questionCount} questions</span>
                                            <span>{pack.salesCount} sales</span>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1.5 text-sm ${cfg.color}`}>
                                        <Icon className="w-4 h-4" />
                                        {cfg.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Shell>
    );
}
