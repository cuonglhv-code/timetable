'use client';

import { useState, useEffect } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useSessions } from '@/hooks/use-sessions';
import { formatDate, cn, getSessionStatus, getUTCDateString } from '@/lib/utils';
import { SessionForm } from './session-form';
import { SessionDetailDrawer } from './session-detail-drawer';
import type { ClassSessionWithRelations, FilterOptions } from '@/types';

const MAX_VISIBLE = 3;

interface MonthViewProps {
  filters?: FilterOptions;
  user: {
    role: string;
  };
}

export function MonthView({ filters, user }: MonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<ClassSessionWithRelations | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isWriteUser = user.role !== 'TEACHER';

  // Listen for the global + Add Session click from the toolbar
  useEffect(() => {
    const handleGlobalAdd = () => {
      if (isWriteUser) {
        setSelectedSession(null);
        setIsFormOpen(true);
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('open-session-form', handleGlobalAdd);
    return () => window.removeEventListener('open-session-form', handleGlobalAdd);
  }, [isWriteUser]);

  const handleSessionClick = (session: ClassSessionWithRelations) => {
    setSelectedSession(session);
    setIsDrawerOpen(true);
    setIsFormOpen(false);
  };

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
          const dayStr = format(day, 'yyyy-MM-dd');
          const daySessions = sessions?.filter(s => getUTCDateString(s.date) === dayStr) ?? [];
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
                       ? 'var(--bg-non-current-month)'
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
                               onClick={() => handleSessionClick(session)} />
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
      {isDrawerOpen && selectedSession && (
        <SessionDetailDrawer session={selectedSession} onClose={() => { setIsDrawerOpen(false); setSelectedSession(null); }} />
      )}
    </div>
  );
}

/* Redesigned Session Pill adopting compact card anatomy */
function SessionPill({ session, onClick }: { session: ClassSessionWithRelations; onClick: () => void }) {
  const courseColor = session.course.colorHex ?? '#6366f1';
  return (
    <button onClick={onClick}
            className="w-full text-left rounded-md px-1.5 py-1 text-xs truncate border transition-all duration-150 hover:brightness-105"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
              borderLeft: `3px solid ${courseColor}`,
              color: 'var(--text-primary)',
              boxShadow: 'none',
            }}>
      <div className="font-semibold truncate leading-tight">{session.className}</div>
      <div className="flex items-center justify-between text-[9px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
        <span className="truncate">{session.room.name}</span>
        <span className="font-mono flex-shrink-0">{session.startTime}</span>
      </div>
    </button>
  );
}

function MonthViewSkeleton() {
  return (
    <div className="card overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="skeleton w-8 h-8 rounded-lg" />
        <div className="skeleton w-48 h-5 rounded" />
        <div className="skeleton w-8 h-8 rounded-lg" />
      </div>
      <div className="p-4 grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-lg" />)}
      </div>
    </div>
  );
}
