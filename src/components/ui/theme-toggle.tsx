'use client';

import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-9 h-9 rounded-lg border transition-all duration-200"
        style={{
          borderColor: 'var(--border-default)',
          background: 'var(--bg-glass)',
          color: 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-glass-hover)';
          e.currentTarget.style.borderColor = 'var(--border-strong)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bg-glass)';
          e.currentTarget.style.borderColor = 'var(--border-default)';
        }}
        title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
      >
        <Icon className="w-4 h-4 transition-transform duration-300 hover:rotate-12" style={{ color: 'var(--text-primary)' }} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-36 rounded-xl shadow-lg z-50 py-1"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
          }}
        >
          {(['light', 'dark', 'system'] as const).map((t) => {
            const ActiveIcon = t === 'light' ? Sun : t === 'dark' ? Moon : Monitor;
            const isActive = theme === t;
            return (
              <button
                key={t}
                onClick={() => {
                  setTheme(t);
                  setOpen(false);
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition-colors font-medium"
                style={{
                  color: isActive ? 'var(--brand-primary)' : 'var(--text-primary)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-glass-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <ActiveIcon className="w-4 h-4" />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
