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
                        if (membersRes.ok) setMembers((await membersRes.json()).members || []);
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

    if (!user) return <Shell><p className="text-muted text-center py-20">Please log in</p></Shell>;
    if (loading) return <Shell><div className="flex justify-center py-20"><Spinner /></div></Shell>;
    if (!org) return <Shell><p className="text-muted text-center py-20">No organization found</p></Shell>;

    return (
        <Shell>
            <div className="max-w-3xl mx-auto py-8">
                <h1 className="text-2xl font-bold mb-6">Team Settings</h1>

                {/* General Settings */}
                <section className="mb-8">
                    <h2 className="text-lg font-semibold mb-4">General</h2>
                    <div className="space-y-4 p-5 rounded-lg bg-surface border border-border">
                        <div>
                            <label className="label">Organization Name</label>
                            <input type="text" className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                        </div>
                        <div>
                            <label className="label">Seats</label>
                            <p className="text-sm text-muted">{org.seatCount} / {org.seatLimit} used</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleSave} disabled={saving} className="btn btn-primary flex items-center gap-2">
                                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
                            </button>
                            {message && <span className="text-sm text-muted">{message}</span>}
                        </div>
                    </div>
                </section>

                {/* Member Management */}
                <section>
                    <h2 className="text-lg font-semibold mb-4">Members</h2>
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
                                    {m.role === 'admin' && <Shield className="w-3 h-3 inline mr-1" />}
                                    {m.role}
                                </span>
                                {m.uid !== org.ownerId && (
                                    <button
                                        onClick={() => handleRemoveMember(m.uid)}
                                        className="text-muted hover:text-red-500 transition-colors"
                                        title="Remove member"
                                    >
                                        <Trash2 className="w-4 h-4" />
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
