'use client';

import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { Link } from '@/i18n/navigation';
import {
  Plus,
  Users,
  BarChart3,
  Settings,
  AlertCircle,
  TrendingDown,
} from 'lucide-react';
import type { Organization, OrgMember } from '@/types';

interface TeamAnalytics {
  memberCount: number;
  activeMemberCount: number;
  totalExams: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  domainWeaknesses: Array<{
    domain: string;
    accuracy: number;
    attempts: number;
  }>;
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
      if (analyticsRes.ok)
        setAnalytics((await analyticsRes.json()).analytics || null);
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
        setOrgs((prev) => [
          ...prev,
          { id: data.id, name: newOrgName, slug: data.slug } as Organization,
        ]);
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
    return (
      <Shell>
        <p className="text-muted py-20 text-center">Please log in</p>
      </Shell>
    );
  }
  if (loading) {
    return (
      <Shell>
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      </Shell>
    );
  }

  // No orgs — create one
  if (orgs.length === 0) {
    return (
      <Shell>
        <div className="mx-auto max-w-md py-16 text-center">
          <Users className="text-muted mx-auto mb-4 h-16 w-16" />
          <h1 className="mb-2 text-2xl font-bold">Create Your Team</h1>
          <p className="text-muted mb-6">
            Organize your team, track progress, and identify knowledge gaps.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="Team name..."
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
            />
            <button
              onClick={handleCreateOrg}
              disabled={creating || !newOrgName.trim()}
              className="btn btn-primary"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-5xl py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Team Dashboard</h1>
            {orgs.length > 1 && (
              <select
                className="input text-sm"
                value={selectedOrg || ''}
                onChange={(e) => setSelectedOrg(e.target.value)}
              >
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <Link
            href="/team/settings"
            className="btn btn-ghost flex items-center gap-2"
          >
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </div>

        {/* Analytics Overview */}
        {analytics && (
          <>
            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="bg-surface border-border rounded-lg border p-4 text-center">
                <Users className="text-muted mx-auto mb-1 h-5 w-5" />
                <div className="text-2xl font-bold">
                  {analytics.memberCount}
                </div>
                <div className="text-muted text-xs">
                  Members ({analytics.activeMemberCount} active)
                </div>
              </div>
              <div className="bg-surface border-border rounded-lg border p-4 text-center">
                <BarChart3 className="text-muted mx-auto mb-1 h-5 w-5" />
                <div className="text-2xl font-bold">
                  {analytics.averageScore}%
                </div>
                <div className="text-muted text-xs">Avg Score</div>
              </div>
              <div className="bg-surface border-border rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold">{analytics.totalExams}</div>
                <div className="text-muted text-xs">Exams (30d)</div>
              </div>
              <div className="bg-surface border-border rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold">
                  {analytics.highestScore}%
                </div>
                <div className="text-muted text-xs">Highest</div>
              </div>
            </div>

            {/* Domain Weaknesses */}
            {analytics.domainWeaknesses.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <TrendingDown className="h-5 w-5 text-red-400" /> Areas for
                  Improvement
                </h2>
                <div className="space-y-2">
                  {analytics.domainWeaknesses.map((dw) => (
                    <div
                      key={dw.domain}
                      className="bg-surface border-border flex items-center gap-3 rounded-lg border p-3"
                    >
                      <AlertCircle
                        className={`h-4 w-4 ${dw.accuracy < 50 ? 'text-red-400' : 'text-yellow-400'}`}
                      />
                      <span className="flex-1 text-sm">{dw.domain}</span>
                      <span className="font-mono text-sm">{dw.accuracy}%</span>
                      <span className="text-muted text-xs">
                        {dw.attempts} attempts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Members + Invite */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <h2 className="mb-3 text-lg font-semibold">Members</h2>
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.uid}
                  className="bg-surface border-border flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">
                    {m.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {m.displayName}
                    </div>
                    <div className="text-muted text-xs">{m.email}</div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${m.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-surface'}`}
                  >
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Invite Member</h2>
            <div className="bg-surface border-border space-y-3 rounded-lg border p-4">
              <input
                type="email"
                className="input w-full"
                placeholder="email@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <button
                onClick={handleInvite}
                className="btn btn-primary flex w-full items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" /> Send Invite
              </button>
              {inviteMsg && <p className="text-muted text-sm">{inviteMsg}</p>}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
