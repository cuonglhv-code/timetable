'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { BookOpen, Calendar, Clock, User, Building2, DoorOpen, Globe } from 'lucide-react';
import type { ClassSessionWithRelations } from '@/types';

interface PublicData {
  sessions: ClassSessionWithRelations[];
  centres: { id: string; name: string }[];
  weekStart: string;
  weekEnd: string;
}

const STATUS_COLORS = {
  PLANNING: { dot: '#fbbf24', text: 'Planning' },
  ON_GOING: { dot: '#34d399', text: 'On Going' },
  FINISHED: { dot: '#6b7280', text: 'Finished' },
};

function getStatus(session: ClassSessionWithRelations) {
  const now = new Date();
  const d = new Date(session.date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessionDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (sessionDay > today) return 'PLANNING';
  if (sessionDay < today) return 'FINISHED';
  const nowHHmm = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  if (session.startTime <= nowHHmm && session.endTime > nowHHmm) return 'ON_GOING';
  if (session.endTime <= nowHHmm) return 'FINISHED';
  return 'PLANNING';
}

export function PublicTimetable() {
  const [centreFilter, setCentreFilter] = useState('');

  const { data, isLoading } = useQuery<PublicData>({
    queryKey: ['public-timetable', centreFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (centreFilter) params.set('centreId', centreFilter);
      const res = await fetch(`/api/public/timetable?${params}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const weekStart = data ? new Date(data.weekStart) : new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      {/* Public Header */}
      <header className="border-b px-4 py-5" style={{ background: 'rgba(13,17,23,0.95)', borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold" style={{ color: 'var(--text-primary)' }}>Jaxtina English Centre</div>
              <div className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <Globe className="w-3 h-3" /> Public Timetable
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                {format(weekStart, 'MMM d')} — {format(addDays(weekStart, 6), 'MMM d, yyyy')}
              </span>
            </div>
            {data && (
              <select value={centreFilter} onChange={e => setCentreFilter(e.target.value)} className="field text-sm py-1.5">
                <option value="">All Centres</option>
                {data.centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
        </div>
      </header>

      {/* Timetable */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-8">
            {weekDays.map(day => {
              const daySessions = data?.sessions.filter(s => {
                const d = new Date(s.date);
                return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
              }) ?? [];
              if (daySessions.length === 0) return null;
              return (
                <div key={day.toISOString()}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                      {format(day, 'EEEE, d MMMM')}
                    </div>
                    <div className="h-px flex-1" style={{ background: 'var(--border-subtle)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{daySessions.length} session{daySessions.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-2">
                    {daySessions.map(session => {
                      const status = getStatus(session);
                      const sc = STATUS_COLORS[status];
                      return (
                        <div key={session.id} className="card p-4 flex flex-wrap items-start gap-4"
                             style={{ background: 'var(--bg-surface)', borderLeft: `3px solid ${session.course.colorHex ?? '#6366f1'}` }}>
                          {/* Time */}
                          <div className="flex-shrink-0 text-center w-20">
                            <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{session.startTime}</div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>–{session.endTime}</div>
                          </div>
                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{session.className}</h3>
                              <span className="flex items-center gap-1 text-xs" style={{ color: sc.dot }}>
                                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: sc.dot }} />
                                {sc.text}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              <span className="flex items-center gap-1"><User className="w-3 h-3" />{session.teacher.name}</span>
                              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{session.centre.name}</span>
                              <span className="flex items-center gap-1"><DoorOpen className="w-3 h-3" />{session.room.name}</span>
                              <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ background: session.course.colorHex ?? '#6366f1' }} />
                                {session.course.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {data?.sessions.length === 0 && (
              <div className="text-center py-16">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                <p className="muted">No sessions scheduled this week.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="text-center py-6 border-t mt-8" style={{ borderColor: 'var(--border-subtle)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} Jaxtina English Centre · Auto-refreshes every minute
        </p>
      </footer>
    </div>
  );
}
