'use client';

import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { Save, Trash2, Shield } from 'lucide-react';
import type { Organization, OrgMember } from '@/types';

export default function TeamSettingsPage() {
  const { user } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [certFocus, setCertFocus] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const orgsRes = await fetch('/api/orgs');
        if (orgsRes.ok) {
          const data = await orgsRes.json();
          if (data.orgs?.length > 0) {
            const firstOrg = data.orgs[0];
            setOrg(firstOrg);
            setOrgName(firstOrg.name);
            setCertFocus(firstOrg.certFocus || []);

            const membersRes = await fetch(`/api/orgs/${firstOrg.id}/members`);
            if (membersRes.ok)
              setMembers((await membersRes.json()).members || []);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!org) return;
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch(`/api/orgs/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName, certFocus }),
      });
      setMessage(res.ok ? 'Settings saved!' : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (uid: string) => {
    if (!org || !confirm('Remove this member?')) return;
    const res = await fetch(`/api/orgs/${org.id}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.uid !== uid));
    }
  };

  if (!user)
    return (
      <Shell>
        <p className="text-muted py-20 text-center">Please log in</p>
      </Shell>
    );
  if (loading)
    return (
      <Shell>
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      </Shell>
    );
  if (!org)
    return (
      <Shell>
        <p className="text-muted py-20 text-center">No organization found</p>
      </Shell>
    );

  return (
    <Shell>
      <div className="mx-auto max-w-3xl py-8">
        <h1 className="mb-6 text-2xl font-bold">Team Settings</h1>

        {/* General Settings */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">General</h2>
          <div className="bg-surface border-border space-y-4 rounded-lg border p-5">
            <div>
              <label className="label">Organization Name</label>
              <input
                type="text"
                className="input"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Seats</label>
              <p className="text-muted text-sm">
                {org.seatCount} / {org.seatLimit} used
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary flex items-center gap-2"
              >
                <Save className="h-4 w-4" />{' '}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {message && <span className="text-muted text-sm">{message}</span>}
            </div>
          </div>
        </section>

        {/* Member Management */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Members</h2>
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
                  {m.role === 'admin' && (
                    <Shield className="mr-1 inline h-3 w-3" />
                  )}
                  {m.role}
                </span>
                {m.uid !== org.ownerId && (
                  <button
                    onClick={() => handleRemoveMember(m.uid)}
                    className="text-muted transition-colors hover:text-red-500"
                    title="Remove member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}
