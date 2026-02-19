'use client';

import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { Link } from '@/i18n/navigation';
import { Plus, Users, BarChart3, Settings, AlertCircle, TrendingDown } from 'lucide-react';
import type { Organization, OrgMember } from '@/types';

interface TeamAnalytics {
    memberCount: number;
    activeMemberCount: number;
    totalExams: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    domainWeaknesses: Array<{ domain: string; accuracy: number; attempts: number }>;
}

export default function TeamDashboardPage() {
    const { user } = useAuth();
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
    const [members, setMembers] = useState<OrgMember[]>([]);
    const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteMsg, setInviteMsg] = useState('');

    // Load user's orgs
    useEffect(() => {
        if (!user) return;
        const load = async () => {
            try {
                const res = await fetch('/api/orgs');
                if (res.ok) {
                    const data = await res.json();
                    setOrgs(data.orgs || []);
                    if (data.orgs?.length > 0) setSelectedOrg(data.orgs[0].id);
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    // Load selected org data
    useEffect(() => {
        if (!selectedOrg) return;
        const load = async () => {
            const [membersRes, analyticsRes] = await Promise.all([
                fetch(`/api/orgs/${selectedOrg}/members`),
                fetch(`/api/orgs/${selectedOrg}/analytics`),
            ]);
            if (membersRes.ok) setMembers((await membersRes.json()).members || []);
            if (analyticsRes.ok) setAnalytics((await analyticsRes.json()).analytics || null);
        };
        load();
    }, [selectedOrg]);

    const handleCreateOrg = async () => {
        if (!newOrgName.trim()) return;
        setCreating(true);
        try {
            const res = await fetch('/api/orgs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newOrgName }),
            });
            if (res.ok) {
                const data = await res.json();
                setOrgs((prev) => [...prev, { id: data.id, name: newOrgName, slug: data.slug } as Organization]);
                setSelectedOrg(data.id);
                setNewOrgName('');
            }
        } finally {
            setCreating(false);
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail || !selectedOrg) return;
        setInviteMsg('');
        const res = await fetch(`/api/orgs/${selectedOrg}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: inviteEmail }),
        });
        if (res.ok) {
            setInviteMsg('Invite sent!');
            setInviteEmail('');
        } else {
            const data = await res.json();
            setInviteMsg(data.error || 'Failed to send invite');
        }
    };

    if (!user) {
        return <Shell><p className="text-muted text-center py-20">Please log in</p></Shell>;
    }
    if (loading) {
        return <Shell><div className="flex justify-center py-20"><Spinner /></div></Shell>;
    }

    // No orgs — create one
    if (orgs.length === 0) {
        return (
            <Shell>
                <div className="max-w-md mx-auto py-16 text-center">
                    <Users className="w-16 h-16 mx-auto text-muted mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Create Your Team</h1>
                    <p className="text-muted mb-6">Organize your team, track progress, and identify knowledge gaps.</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="input flex-1"
                            placeholder="Team name..."
                            value={newOrgName}
                            onChange={(e) => setNewOrgName(e.target.value)}
                        />
                        <button onClick={handleCreateOrg} disabled={creating || !newOrgName.trim()} className="btn btn-primary">
                            {creating ? 'Creating…' : 'Create'}
                        </button>
                    </div>
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="max-w-5xl mx-auto py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold">Team Dashboard</h1>
                        {orgs.length > 1 && (
                            <select
                                className="input text-sm"
                                value={selectedOrg || ''}
                                onChange={(e) => setSelectedOrg(e.target.value)}
                            >
                                {orgs.map((org) => (
                                    <option key={org.id} value={org.id}>{org.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    <Link href="/team/settings" className="btn btn-ghost flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Settings
                    </Link>
                </div>

                {/* Analytics Overview */}
                {analytics && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <div className="p-4 rounded-lg bg-surface border border-border text-center">
                                <Users className="w-5 h-5 mx-auto mb-1 text-muted" />
                                <div className="text-2xl font-bold">{analytics.memberCount}</div>
                                <div className="text-xs text-muted">Members ({analytics.activeMemberCount} active)</div>
                            </div>
                            <div className="p-4 rounded-lg bg-surface border border-border text-center">
                                <BarChart3 className="w-5 h-5 mx-auto mb-1 text-muted" />
                                <div className="text-2xl font-bold">{analytics.averageScore}%</div>
                                <div className="text-xs text-muted">Avg Score</div>
                            </div>
                            <div className="p-4 rounded-lg bg-surface border border-border text-center">
                                <div className="text-2xl font-bold">{analytics.totalExams}</div>
                                <div className="text-xs text-muted">Exams (30d)</div>
                            </div>
                            <div className="p-4 rounded-lg bg-surface border border-border text-center">
                                <div className="text-2xl font-bold">{analytics.highestScore}%</div>
                                <div className="text-xs text-muted">Highest</div>
                            </div>
                        </div>

                        {/* Domain Weaknesses */}
                        {analytics.domainWeaknesses.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    <TrendingDown className="w-5 h-5 text-red-400" /> Areas for Improvement
                                </h2>
                                <div className="space-y-2">
                                    {analytics.domainWeaknesses.map((dw) => (
                                        <div key={dw.domain} className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-border">
                                            <AlertCircle className={`w-4 h-4 ${dw.accuracy < 50 ? 'text-red-400' : 'text-yellow-400'}`} />
                                            <span className="flex-1 text-sm">{dw.domain}</span>
                                            <span className="text-sm font-mono">{dw.accuracy}%</span>
                                            <span className="text-xs text-muted">{dw.attempts} attempts</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Members + Invite */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <h2 className="text-lg font-semibold mb-3">Members</h2>
                        <div className="space-y-2">
                            {members.map((m) => (
                                <div key={m.uid} className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-border">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                                        {m.displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{m.displayName}</div>
                                        <div className="text-xs text-muted">{m.email}</div>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-surface'}`}>
                                        {m.role}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold mb-3">Invite Member</h2>
                        <div className="p-4 rounded-lg bg-surface border border-border space-y-3">
                            <input
                                type="email"
                                className="input w-full"
                                placeholder="email@company.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                            />
                            <button onClick={handleInvite} className="btn btn-primary w-full flex items-center justify-center gap-2">
                                <Plus className="w-4 h-4" /> Send Invite
                            </button>
                            {inviteMsg && <p className="text-sm text-muted">{inviteMsg}</p>}
                        </div>
                    </div>
                </div>
            </div>
        </Shell>
    );
}
