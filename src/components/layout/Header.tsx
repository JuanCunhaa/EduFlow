'use client';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ui/ThemeProvider';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { LogOut, User, Sun, Moon, Monitor } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { LanguageSelector } from '@/components/ui/LanguageSelector';

type ThemeOption = 'light' | 'dark' | 'system';

const THEME_ICONS: Record<ThemeOption, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const THEME_KEYS: ThemeOption[] = ['light', 'dark', 'system'];

export function Header() {
  const t = useTranslations('header');
  const { user, logOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const router = useRouter();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click + keyboard navigation
  useEffect(() => {
    if (!showThemeMenu) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            Math.min(prev + 1, THEME_KEYS.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0) {
            setTheme(THEME_KEYS[highlightedIndex]);
            setShowThemeMenu(false);
          }
          break;
        case 'Escape':
          setShowThemeMenu(false);
          break;
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showThemeMenu, highlightedIndex, setTheme]);

  async function handleLogOut() {
    try {
      await logOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  const ActiveIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <header className="border-border glass-panel sticky top-0 z-30 flex h-16 items-center justify-end border-b px-6">
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => {
              setShowThemeMenu(!showThemeMenu);
              setHighlightedIndex(-1);
            }}
            className="text-muted-foreground hover:bg-accent/30 hover:text-foreground flex h-11 w-11 items-center justify-center rounded-lg transition-all duration-200"
            aria-label={t('toggleTheme')}
            aria-expanded={showThemeMenu}
            aria-haspopup="listbox"
          >
            <ActiveIcon className="h-4 w-4" />
          </button>

          {showThemeMenu && (
            <div
              className="border-border glass-panel animate-slide-up absolute top-full right-0 mt-2 w-36 rounded-xl border p-1.5 shadow-xl"
              role="listbox"
              aria-label={t('theme')}
            >
              {THEME_KEYS.map((value, index) => {
                const Icon = THEME_ICONS[value];
                return (
                  <button
                    key={value}
                    onClick={() => {
                      setTheme(value);
                      setShowThemeMenu(false);
                    }}
                    role="option"
                    aria-selected={theme === value}
                    className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                      index === highlightedIndex
                        ? 'bg-accent/50 text-foreground'
                        : theme === value
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t(value)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-border h-5 w-px" />

        {/* User info */}
        {user && (
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || t('userAlt')}
                className="ring-primary/20 h-7 w-7 rounded-full ring-2"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="bg-primary/10 ring-primary/20 flex h-7 w-7 items-center justify-center rounded-full ring-2">
                <User className="text-primary h-3.5 w-3.5" />
              </div>
            )}
            <span className="text-muted-foreground hidden text-sm font-medium sm:inline">
              {user.displayName || user.email}
            </span>
          </div>
        )}

        <LanguageSelector variant="minimal" />

        <div className="bg-border h-5 w-px" />

        {/* Logout */}
        <button
          onClick={handleLogOut}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex h-11 w-11 items-center justify-center rounded-lg transition-all duration-200"
          aria-label={t('signOut')}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
