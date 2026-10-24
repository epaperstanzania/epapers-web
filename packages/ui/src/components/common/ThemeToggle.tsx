'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';
const preferenceKey = 'epapers-theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => {
    const saved = window.localStorage.getItem(preferenceKey);
    const initial: Theme = saved === 'dark' || saved === 'light' ? saved : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = initial;
    setTheme(initial);
  }, []);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(preferenceKey, next);
    setTheme(next);
  };
  return <button type="button" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title={theme === 'dark' ? 'Light theme' : 'Dark theme'} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-sidebar)] transition-colors">
    {theme === 'dark' ? <Sun aria-hidden="true" className="h-4 w-4" /> : <Moon aria-hidden="true" className="h-4 w-4" />}
  </button>;
}
