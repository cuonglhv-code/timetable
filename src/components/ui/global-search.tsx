'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, BookOpen, CalendarDays, Building2, Users, ArrowRight } from 'lucide-react';

interface SearchResult {
  type: 'session' | 'teacher' | 'course' | 'centre';
  id: string;
  title: string;
  subtitle: string;
  color?: string;
}

interface GlobalSearchProps {
  onNavigate: (view: 'dashboard' | 'week' | 'month' | 'teachers' | 'manage' | 'users') => void;
}

export function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(''); setActiveIdx(0); }
  }, [open]);

  const { data: results, isFetching } = useQuery<SearchResult[]>({
    queryKey: ['global-search', query],
    queryFn: async () => {
      if (!query.trim() || query.length < 2) return [];
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && query.length >= 2,
  });

  const displayResults = results ?? [];

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'session') onNavigate('week');
    else if (result.type === 'teacher') onNavigate('teachers');
    else if (result.type === 'course' || result.type === 'centre') onNavigate('manage');
    setOpen(false);
    setQuery('');
  };

  const ICONS: Record<string, React.ReactNode> = {
    session: <BookOpen className="w-4 h-4" />,
    teacher: <Users className="w-4 h-4" />,
    course:  <CalendarDays className="w-4 h-4" />,
    centre:  <Building2 className="w-4 h-4" />,
  };

  if (!open) return (
    <button onClick={() => setOpen(true)}
            className="btn-ghost px-3 py-2 gap-2 text-sm"
            title="Search (Ctrl+K)">
      <Search className="w-4 h-4" />
      <span className="hidden md:inline" style={{ color: 'var(--text-muted)' }}>Search…</span>
      <kbd className="hidden md:inline text-xs px-1.5 py-0.5 rounded"
           style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
        Ctrl K
      </kbd>
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50" style={{ background: 'var(--bg-overlay)' }} onClick={() => setOpen(false)} />

      {/* Search box */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-fade-up">
        <div className="rounded-2xl shadow-2xl overflow-hidden"
             style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <Search className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, displayResults.length - 1)); }
                if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
                if (e.key === 'Enter' && displayResults[activeIdx]) handleSelect(displayResults[activeIdx]);
              }}
              placeholder="Search classes, teachers, courses, centres…"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
            {query && <button onClick={() => setQuery('')}><X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /></button>}
          </div>

          {/* Results */}
          {query.length >= 2 && (
            <div className="max-h-80 overflow-y-auto">
              {isFetching ? (
                <div className="p-4 space-y-2">
                  {[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
                </div>
              ) : displayResults.length === 0 ? (
                <div className="p-6 text-center muted text-sm">No results for "{query}"</div>
              ) : (
                <div className="p-2">
                  {displayResults.map((result, idx) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
                      style={{ background: idx === activeIdx ? 'rgba(99,102,241,0.12)' : 'transparent' }}
                      onMouseEnter={() => setActiveIdx(idx)}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                           style={{ background: result.color ? `${result.color}22` : 'rgba(99,102,241,0.15)', color: result.color ?? 'var(--brand-primary)' }}>
                        {ICONS[result.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{result.title}</div>
                        <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{result.subtitle}</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {query.length === 0 && (
            <div className="px-4 py-3 flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>↑↓</kbd> navigate</span>
              <span><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>↵</kbd> select</span>
              <span><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>Esc</kbd> close</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
