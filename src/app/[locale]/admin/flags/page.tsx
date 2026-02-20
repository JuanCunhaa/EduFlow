'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Shell } from '@/components/layout/Shell';
import { usePlan } from '@/hooks/usePlan';
import { useToast } from '@/components/ui/Toast';
import { Link } from '@/i18n/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import {
    Shield,
    ChevronLeft,
    Loader2,
    Zap,
    Users,
    ToggleLeft,
    ToggleRight,
} from 'lucide-react';

interface FlagItem {
    id: string;
    description: string;
    defaultEnabled: boolean;
    enrolledUsers: number;
}

export default function AdminFlagsPage() {
    const t = useTranslations('admin');
    const { isAdmin, isLoading: authLoading } = usePlan();
    const { addToast } = useToast();
    const [toggling, setToggling] = useState<string | null>(null);

    const { data, isLoading, mutate } = useSWR<{ data: { flags: FlagItem[] } }>(
        '/api/admin/flags',
        fetcher,
        { revalidateOnFocus: false }
    );

    const flags = data?.data?.flags ?? [];

    const handleToggle = async (flag: FlagItem) => {
        setToggling(flag.id);
        const newEnabled = !flag.defaultEnabled;
        try {
            const res = await fetch(`/api/admin/flags/${flag.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: newEnabled }),
            });
            if (!res.ok) throw new Error('Failed to update flag');
            addToast(
                `Flag "${flag.id}" ${newEnabled ? 'enabled' : 'disabled'}`,
                'success'
            );
            await mutate();
        } catch {
            addToast('Failed to update flag', 'error');
        } finally {
            setToggling(null);
        }
    };

    if (authLoading) {
        return (
            <Shell>
                <div className="flex items-center justify-center py-32">
                    <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                </div>
            </Shell>
        );
    }

    if (!isAdmin) {
        return (
            <Shell>
                <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
                    <Shield className="text-muted-foreground/30 h-12 w-12" />
                    <h2 className="text-foreground text-lg font-semibold">
                        {t('forbidden')}
                    </h2>
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="animate-fade-in space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin"
                        className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-foreground flex items-center gap-2 text-2xl font-bold tracking-tight">
                            <Zap className="text-primary h-6 w-6" />
                            Feature Flags
                        </h1>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                            Control which experimental features are enabled globally.
                        </p>
                    </div>
                </div>

                {/* Flags List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                    </div>
                ) : flags.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-20 text-center">
                        <Zap className="text-muted-foreground/20 h-10 w-10" />
                        <p className="text-muted-foreground text-sm">No flags registered</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {flags.map((flag) => {
                            const isEnabled = flag.defaultEnabled;
                            const isToggling = toggling === flag.id;

                            return (
                                <div
                                    key={flag.id}
                                    className="border-border bg-card flex items-center justify-between rounded-xl border p-5 transition-colors"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <code className="text-primary bg-primary/10 rounded px-1.5 py-0.5 font-mono text-xs font-bold">
                                                {flag.id}
                                            </code>
                                            {isEnabled && (
                                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-500 uppercase">
                                                    Enabled
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground mt-1.5 text-sm">
                                            {flag.description}
                                        </p>
                                        <div className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
                                            <Users className="h-3 w-3" />
                                            {flag.enrolledUsers} enrolled user
                                            {flag.enrolledUsers !== 1 ? 's' : ''}
                                        </div>
                                    </div>

                                    <div className="ml-4 shrink-0">
                                        <button
                                            onClick={() => handleToggle(flag)}
                                            disabled={isToggling}
                                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 ${isEnabled
                                                    ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 border'
                                                }`}
                                            title={isEnabled ? 'Disable globally' : 'Enable globally'}
                                        >
                                            {isToggling ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : isEnabled ? (
                                                <ToggleRight className="h-4 w-4" />
                                            ) : (
                                                <ToggleLeft className="h-4 w-4" />
                                            )}
                                            {isEnabled ? 'On' : 'Off'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <p className="text-muted-foreground text-xs">
                    Toggles change the <em>global default</em>. Individual users can still
                    be enrolled or unenrolled via their profile.
                </p>
            </div>
        </Shell>
    );
}
