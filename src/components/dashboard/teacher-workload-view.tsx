'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Clock, BookOpen, ChevronDown, ChevronRight, Mail, Phone, AlertTriangle, BarChart3 } from 'lucide-react';
import { getSessionStatus } from '@/lib/utils';
import type { ClassSessionWithRelations } from '@/types';

interface TeacherWorkload {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  weeklyMinutes: number;
  weeklyHours: number;
  sessionCount: number;
  sessions: ClassSessionWithRelations[];
}

const MAX_HOURS_WARNING = 25;

export function TeacherWorkloadView() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'hours' | 'sessions'>('hours');

  const { data, isLoading } = useQuery<{ teachers: TeacherWorkload[]; weekStart: string }>({
    queryKey: ['teacher-workload'],
    queryFn: async () => {
      const res = await fetch('/api/teachers/workload');
      if (!res.ok) throw new Error('Failed to load workload');
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const sorted = [...(data?.teachers ?? [])].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'hours') return b.weeklyHours - a.weeklyHours;
    return b.sessionCount - a.sessionCount;
  });

  const totalHours = data?.teachers.reduce((sum, t) => sum + t.weeklyHours, 0) ?? 0;
  const overloaded = data?.teachers.filter(t => t.weeklyHours > MAX_HOURS_WARNING) ?? [];
  const weekLabel = data?.weekStart
    ? new Date(data.weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : '—';

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Users className="w-5 h-5" />,      label: 'Active Teachers',   value: data?.teachers.length ?? '—', color: '#6366f1' },
          { icon: <Clock className="w-5 h-5" />,       label: 'Total Hours / Week', value: isLoading ? '—' : `${Math.round(totalHours)}h`, color: '#34d399' },
          { icon: <BookOpen className="w-5 h-5" />,    label: 'Total Sessions',    value: data?.teachers.reduce((s, t) => s + t.sessionCount, 0) ?? '—', color: '#a78bfa' },
          { icon: <AlertTriangle className="w-5 h-5" />, label: `Overloaded (>${MAX_HOURS_WARNING}h)`, value: overloaded.length, color: overloaded.length > 0 ? '#f87171' : '#6b7280' },
        ].map(kpi => (
          <div key={kpi.label} className="card p-4 flex items-start gap-3" style={{ background: 'var(--bg-surface)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: `${kpi.color}18`, color: kpi.color }}>
              {kpi.icon}
            </div>
            <div>
              {isLoading ? <div className="skeleton w-10 h-6 rounded mb-1" /> : (
                <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{kpi.value}</div>
              )}
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Overload warning */}
      {overloaded.length > 0 && (
        <div className="rounded-xl p-3 flex items-center gap-2"
             style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#f87171' }} />
          <p className="text-sm" style={{ color: '#fca5a5' }}>
            <strong>{overloaded.map(t => t.name.split(' ')[0]).join(', ')}</strong>
            {overloaded.length === 1 ? ' is' : ' are'} exceeding the {MAX_HOURS_WARNING}h weekly limit.
          </p>
        </div>
      )}

      {/* Sort controls */}
      <div className="card overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b"
             style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
            <h3 className="heading-md">Teacher Workload</h3>
            <span className="label text-xs ml-1">week of {weekLabel}</span>
          </div>
          <div className="flex gap-1">
            {(['hours', 'sessions', 'name'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                      style={sortBy === s
                        ? { background: 'var(--brand-primary)', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Teacher rows */}
        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton mx-4 my-3 h-14 rounded-xl" />)
            : sorted.map(teacher => {
                const pct = Math.min((teacher.weeklyHours / MAX_HOURS_WARNING) * 100, 100);
                const isOver = teacher.weeklyHours > MAX_HOURS_WARNING;
                const barColor = isOver ? '#f87171' : teacher.weeklyHours > 15 ? '#fbbf24' : '#34d399';
                const isExpanded = expandedId === teacher.id;

                return (
                  <div key={teacher.id}>
                    <button
                      className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => setExpandedId(isExpanded ? null : teacher.id)}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                           style={{ background: isOver ? 'rgba(248,113,113,0.15)' : 'rgba(99,102,241,0.15)', color: isOver ? '#f87171' : 'var(--brand-primary)' }}>
                        {teacher.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Name + contact */}
                      <div className="flex-shrink-0 w-36">
                        <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{teacher.name}</div>
                        {teacher.email && <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{teacher.email}</div>}
                      </div>

                      {/* Hours bar */}
                      <div className="flex-1 hidden sm:block">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold" style={{ color: isOver ? '#f87171' : 'var(--text-primary)' }}>
                            {teacher.weeklyHours}h
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            / {teacher.sessionCount} session{teacher.sessionCount !== 1 ? 's' : ''}
                          </span>
                          {isOver && <span className="text-xs font-semibold" style={{ color: '#f87171' }}>⚠ Over limit</span>}
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-full rounded-full transition-all duration-500"
                               style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                      </div>

                      {/* Session count (mobile) */}
                      <div className="sm:hidden text-right">
                        <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{teacher.weeklyHours}h</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{teacher.sessionCount} sess.</div>
                      </div>

                      <div className="ml-2 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </button>

                    {/* Expanded sessions */}
                    {isExpanded && (
                      <div className="px-5 pb-4 border-t animate-fade-in" style={{ borderColor: 'var(--border-subtle)', background: 'rgba(255,255,255,0.01)' }}>
                        {teacher.sessions.length === 0 ? (
                          <p className="muted text-sm py-4 text-center">No sessions this week</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {teacher.sessions.map(session => {
                              const status = getSessionStatus(session.date, session.startTime, session.endTime);
                              const dot: Record<string, string> = { PLANNING: '#fbbf24', ON_GOING: '#34d399', FINISHED: '#6b7280' };
                              return (
                                <div key={session.id} className="flex items-center gap-3 p-3 rounded-xl"
                                     style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot[status] }} />
                                  <div className="w-24 text-xs font-mono flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                                    {new Date(session.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
                                  </div>
                                  <div className="w-20 text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                                    {session.startTime}–{session.endTime}
                                  </div>
                                  <div className="flex-1 text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{session.className}</div>
                                  <div className="text-xs hidden md:block" style={{ color: 'var(--text-muted)' }}>{session.room.name}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
          }
          {!isLoading && sorted.length === 0 && (
            <div className="text-center py-12 muted">No teachers found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
