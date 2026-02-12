'use client';

import { Link } from '@/i18n/navigation';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
    BookOpen,
    ClipboardList,
    BarChart3,
    Database,
    Store,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

const NAV_KEYS = [
    { href: '/dashboard', key: 'studies', icon: BookOpen },
    { href: '/exams', key: 'practiceExams', icon: ClipboardList },
    { href: '/questions', key: 'questionBank', icon: Database },
    { href: '/analytics', key: 'progress', icon: BarChart3 },
    { href: '/marketplace', key: 'marketplace', icon: Store },
] as const;

export function Sidebar() {
    const t = useTranslations('sidebar');
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    // Close mobile sidebar on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Lock body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = ''; };
        }
    }, [mobileOpen]);

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card/80 backdrop-blur-sm text-muted-foreground transition-colors hover:text-foreground md:hidden"
                aria-label={t('openMenu')}
            >
                <Menu className="h-5 w-5" />
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border bg-sidebar/80 backdrop-blur-xl transition-all duration-300',
                    collapsed ? 'w-16' : 'w-60',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full',
                    'md:translate-x-0'
                )}
            >
                {/* Logo + mobile close */}
                <div className="flex h-16 items-center justify-between border-b border-border px-4">
                    <div className="flex items-center gap-3">
                        <img src="/images/logo.png" alt="ExamFlow" width={36} height={36} className="h-9 w-9 rounded-xl" />
                        {!collapsed && (
                            <span className="text-sm font-bold tracking-tight text-foreground">
                                {t('brand')}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground md:hidden"
                        aria-label={t('closeMenu')}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 px-3 py-4">
                    {NAV_KEYS.map(({ href, key, icon: Icon }) => {
                        const label = t(key);
                        const isActive = pathname.replace(/^\/(en|pt-BR)/, '').startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground hover:translate-x-0.5'
                                )}
                                title={collapsed ? label : undefined}
                            >
                                {/* Active indicator bar */}
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_var(--glow)]" />
                                )}
                                <Icon className={cn(
                                    'h-4 w-4 shrink-0 transition-colors',
                                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                                )} />
                                {!collapsed && <span>{label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Collapse Toggle (desktop only) */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden h-12 items-center justify-center border-t border-border text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground md:flex"
                    aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            </aside>
        </>
    );
}
