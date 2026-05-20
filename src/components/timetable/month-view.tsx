'use client';

import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useSessions } from '@/hooks/use-sessions';
import { formatDate, cn, getSessionStatus } from '@/lib/utils';
import { SessionForm } from './session-form';
import type { ClassSessionWithRelations, FilterOptions } from '@/types';

const MAX_VISIBLE = 3;

interface MonthViewProps { filters?: FilterOptions; }

export function MonthView({ filters }: MonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<ClassSessionWithRelations | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const startDate = formatDate(calStart);
  const endDate = formatDate(calEnd);

  const { data: sessions, isLoading } = useSessions({ ...filters, startDate, endDate });

  if (isLoading) return <MonthViewSkeleton />;

  return (
    <div className="card overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b"
           style={{ borderColor: 'var(--border-subtle)' }}>
        <button onClick={() => setCurrentMonth(d => addMonths(d, -1))} className="btn-ghost px-2.5 py-2">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <CalendarDays className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
          <h2 className="heading-md">{format(currentMonth, 'MMMM yyyy')}</h2>
          <button onClick={() => setCurrentMonth(new Date())} className="btn-ghost px-3 py-1.5 text-xs"
                  style={{ color: 'var(--brand-primary)', borderColor: 'rgba(99,102,241,0.3)' }}>
            Today
          </button>
        </div>
        <button onClick={() => setCurrentMonth(d => addMonths(d, 1))} className="btn-ghost px-2.5 py-2">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="py-2.5 text-center label text-xs border-r last:border-r-0"
               style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map(day => {
          const daySessions = sessions?.filter(s => isSameDay(new Date(s.date), day)) ?? [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <div key={day.toISOString()}
                 className="min-h-[110px] p-2 border-b border-r last:border-r-0"
                 style={{
                   borderColor: 'var(--border-subtle)',
                   background: isToday
                     ? 'rgba(99,102,241,0.07)'
                     : !isCurrentMonth
                       ? 'rgba(0,0,0,0.15)'
                       : 'transparent',
                 }}>
              <div className={cn(
                'text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center mb-1.5',
                isToday ? 'text-white' : ''
              )}
                   style={isToday
                     ? { background: 'var(--brand-primary)' }
                     : { color: isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {daySessions.slice(0, MAX_VISIBLE).map(session => (
                  <SessionPill key={session.id} session={session}
                               onClick={() => { setSelectedSession(session); setIsFormOpen(true); }} />
                ))}
                {daySessions.length > MAX_VISIBLE && (
                  <div className="text-xs px-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                    +{daySessions.length - MAX_VISIBLE} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isFormOpen && (
        <SessionForm session={selectedSession} onClose={() => { setIsFormOpen(false); setSelectedSession(null); }} />
      )}
    </div>
  );
}

function SessionPill({ session, onClick }: { session: ClassSessionWithRelations; onClick: () => void }) {
  const status = getSessionStatus(session.date, session.startTime, session.endTime);
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    PLANNING: { bg: 'var(--status-planning-bg)',  border: 'var(--status-planning-border)',  text: 'var(--status-planning-text)' },
    ON_GOING: { bg: 'var(--status-ongoing-bg)',   border: 'var(--status-ongoing-border)',   text: 'var(--status-ongoing-text)' },
    FINISHED: { bg: 'var(--status-finished-bg)',  border: 'var(--status-finished-border)',  text: 'var(--status-finished-text)' },
  };
  const s = styles[status] ?? styles.PLANNING;

  return (
    <button onClick={onClick}
            className="w-full text-left rounded px-1.5 py-0.5 text-xs truncate border-l-2 transition-all duration-150 hover:brightness-125"
            style={{ background: s.bg, borderLeftColor: s.border, color: s.text }}>
      <div className="font-semibold truncate leading-tight">{session.className}</div>
      <div className="opacity-75 truncate" style={{ fontSize: '0.65rem' }}>
        {session.startTime} · {session.room.name}
      </div>
    </button>
  );
}

function MonthViewSkeleton() {
  return (
    <div className="card overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="skeleton w-8 h-8 rounded-lg" />
        <div className="skeleton w-36 h-5 rounded" />
        <div className="skeleton w-8 h-8 rounded-lg" />
      </div>
      <div className="grid grid-cols-7 p-4 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
