'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
    theme: Theme;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'dark',
    resolvedTheme: 'dark',
    setTheme: () => { },
});

export function useTheme() {
    return useContext(ThemeContext);
}

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * P3 #16: Theme provider — supports dark, light, and system modes.
 * Stores preference in localStorage and applies CSS class on <html>.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('dark');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

    // Read saved preference on mount
    useEffect(() => {
        const saved = localStorage.getItem('theme') as Theme | null;
        if (saved && ['light', 'dark', 'system'].includes(saved)) {
            setThemeState(saved);
        }
    }, []);

    // Apply theme class to <html>
    useEffect(() => {
        const resolved = theme === 'system' ? getSystemTheme() : theme;
        setResolvedTheme(resolved);

        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(resolved);
    }, [theme]);

    // Listen for system theme changes when using 'system' mode
    useEffect(() => {
        if (theme !== 'system') return;

        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            const resolved = getSystemTheme();
            setResolvedTheme(resolved);
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(resolved);
        };

        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme]);

    const setTheme = useCallback((t: Theme) => {
        setThemeState(t);
        localStorage.setItem('theme', t);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
