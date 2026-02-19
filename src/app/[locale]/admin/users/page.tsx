'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Shell } from '@/components/layout/Shell';
import { usePlan } from '@/hooks/usePlan';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Link } from '@/i18n/navigation';
import {
  Shield,
  Users,
  Search,
  ChevronLeft,
  Crown,
  ShieldCheck,
  ShieldOff,
  Loader2,
  Mail,
} from 'lucide-react';

interface UserItem {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  plan: string;
  isAdmin: boolean;
  examsTaken: number;
  createdAt: string | null;
  lastActiveAt: { _seconds: number } | null;
}

function getPlanBadgeClass(plan: string) {
  if (plan === 'pro')
    return 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400';
  if (plan === 'team') return 'bg-blue-500/10 text-blue-400';
  return 'bg-muted text-muted-foreground';
}

export default function AdminUsersPage() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const { isAdmin, isLoading: authLoading } = usePlan();
  const { addToast } = useToast();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Plan assignment
  const [planTarget, setPlanTarget] = useState<{
    uid: string;
    email: string;
  } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('free');
  const [savingPlan, setSavingPlan] = useState(false);

  // Role assignment
  const [roleTarget, setRoleTarget] = useState<{
    uid: string;
    email: string;
    isAdmin: boolean;
  } | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  const fetchUsers = useCallback(
    async (searchQuery?: string, pageToken?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (pageToken) params.set('pageToken', pageToken);
        params.set('limit', '20');

        const res = await fetch(`/api/admin/users?${params}`);
        if (!res.ok) throw new Error('Failed to load users');
        const data = await res.json();

        if (pageToken) {
          setUsers((prev) => [...prev, ...(data.users || [])]);
        } else {
          setUsers(data.users || []);
        }
        setNextPageToken(data.nextPageToken || null);
        setHasSearched(true);
      } catch {
        addToast('Failed to load users', 'error');
      } finally {
        setLoading(false);
      }
    },
    [addToast]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(search);
  };

  const handleLoadAll = () => {
    setSearch('');
    fetchUsers();
  };

  const handleLoadMore = () => {
    if (nextPageToken) fetchUsers(search || undefined, nextPageToken);
  };

  const handleSetPlan = async () => {
    if (!planTarget) return;
    setSavingPlan(true);
    try {
      const res = await fetch(`/api/admin/users/${planTarget.uid}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed');
      }
      addToast(
        `Plan set to ${selectedPlan} for ${planTarget.email}`,
        'success'
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === planTarget.uid ? { ...u, plan: selectedPlan } : u
        )
      );
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed', 'error');
    } finally {
      setSavingPlan(false);
      setPlanTarget(null);
    }
  };

  const handleSetRole = async () => {
    if (!roleTarget) return;
    setSavingRole(true);
    const newRole = roleTarget.isAdmin ? 'user' : 'admin';
    try {
      const res = await fetch(`/api/admin/users/${roleTarget.uid}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed');
      }
      addToast(
        newRole === 'admin'
          ? `${roleTarget.email} is now an admin`
          : `Admin removed from ${roleTarget.email}`,
        'success'
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === roleTarget.uid ? { ...u, isAdmin: newRole === 'admin' } : u
        )
      );
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed', 'error');
    } finally {
      setSavingRole(false);
      setRoleTarget(null);
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-foreground flex items-center gap-2 text-2xl font-bold tracking-tight">
                <Users className="text-primary h-6 w-6" />
                {t('userManagement')}
              </h1>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {t('userManagementDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchByEmail')}
              className="border-border bg-card/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/30 w-full rounded-lg border py-2.5 pr-4 pl-10 text-sm focus:ring-1 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !search}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {t('search')}
          </button>
          <button
            type="button"
            onClick={handleLoadAll}
            disabled={loading}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
          >
            {t('loadAll')}
          </button>
        </form>

        {/* Users Table */}
        <UsersList
          loading={loading}
          hasSearched={hasSearched}
          users={users}
          nextPageToken={nextPageToken}
          onLoadMore={handleLoadMore}
          onSetPlan={(user) => {
            setPlanTarget({ uid: user.uid, email: user.email });
            setSelectedPlan(user.plan);
          }}
          onToggleRole={(user) =>
            setRoleTarget({
              uid: user.uid,
              email: user.email,
              isAdmin: user.isAdmin,
            })
          }
          t={t}
          tc={tc}
        />
      </div>

      {/* Set Plan Dialog */}
      <ConfirmDialog
        open={!!planTarget}
        onClose={() => setPlanTarget(null)}
        onConfirm={handleSetPlan}
        title={t('setPlan')}
        confirmLabel={tc('confirm')}
        cancelLabel={tc('cancel')}
        variant="info"
        loading={savingPlan}
      >
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {t('setPlanFor')} <strong>{planTarget?.email}</strong>
          </p>
          <div className="flex gap-2">
            {['free', 'pro', 'team'].map((plan) => (
              <button
                key={plan}
                onClick={() => setSelectedPlan(plan)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold uppercase transition-all ${
                  selectedPlan === plan
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-border/80'
                }`}
              >
                {plan}
              </button>
            ))}
          </div>
        </div>
      </ConfirmDialog>

      {/* Toggle Admin Dialog */}
      <ConfirmDialog
        open={!!roleTarget}
        onClose={() => setRoleTarget(null)}
        onConfirm={handleSetRole}
        title={roleTarget?.isAdmin ? t('removeAdmin') : t('makeAdmin')}
        confirmLabel={tc('confirm')}
        cancelLabel={tc('cancel')}
        variant={roleTarget?.isAdmin ? 'danger' : 'info'}
        loading={savingRole}
      >
        <p className="text-muted-foreground text-sm">
          {roleTarget?.isAdmin
            ? t('removeAdminConfirm', { email: roleTarget?.email || '' })
            : t('makeAdminConfirm', { email: roleTarget?.email || '' })}
        </p>
        {!roleTarget?.isAdmin && (
          <p className="mt-2 text-xs text-amber-400">{t('roleNote')}</p>
        )}
      </ConfirmDialog>
    </Shell>
  );
}

/* ── Extracted component to reduce cognitive complexity ── */
function UsersList({
  loading,
  hasSearched,
  users,
  nextPageToken,
  onLoadMore,
  onSetPlan,
  onToggleRole,
  t,
  tc,
}: {
  loading: boolean;
  hasSearched: boolean;
  users: UserItem[];
  nextPageToken: string | null;
  onLoadMore: () => void;
  onSetPlan: (user: UserItem) => void;
  onToggleRole: (user: UserItem) => void;
  t: (key: string) => string;
  tc: (key: string) => string;
}) {
  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Mail className="text-muted-foreground/20 h-12 w-12" />
        <p className="text-muted-foreground text-sm">{t('searchPrompt')}</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <Users className="text-muted-foreground/20 h-10 w-10" />
        <p className="text-muted-foreground text-sm">{t('noUsers')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <div
          key={user.uid}
          className="border-border bg-card hover:border-border/80 flex items-center justify-between rounded-xl border p-4 transition-colors"
        >
          <div className="flex min-w-0 items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full"
              />
            ) : (
              <div className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                {(user.displayName || user.email || '?')
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-foreground truncate text-sm font-medium">
                  {user.displayName || user.email}
                </span>
                {user.isAdmin && (
                  <span className="bg-primary/10 text-primary flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                    <ShieldCheck className="h-3 w-3" />
                    Admin
                  </span>
                )}
              </div>
              <span className="text-muted-foreground text-xs">
                {user.email}
              </span>
            </div>
          </div>

          <div className="ml-4 flex shrink-0 items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase ${getPlanBadgeClass(user.plan)}`}
            >
              {user.plan}
            </span>

            <button
              onClick={() => onSetPlan(user)}
              className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg border p-2 transition-colors"
              title={t('setPlan')}
            >
              <Crown className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => onToggleRole(user)}
              className={`rounded-lg border p-2 transition-colors ${
                user.isAdmin
                  ? 'border-primary/30 text-primary hover:bg-primary/10'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
              title={user.isAdmin ? t('removeAdmin') : t('makeAdmin')}
            >
              {user.isAdmin ? (
                <ShieldOff className="h-3.5 w-3.5" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      ))}

      {nextPageToken && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/30 w-full rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? tc('loading') : t('loadMore')}
        </button>
      )}
    </div>
  );
}
