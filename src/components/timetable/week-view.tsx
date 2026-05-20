'use client';

import { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import { useSessions } from '@/hooks/use-sessions';
import { generateTimeSlots, timeToMinutes, formatDate, cn, getSessionStatus } from '@/lib/utils';
import { SessionForm } from './session-form';
import type { ClassSessionWithRelations, FilterOptions } from '@/types';

const START_HOUR = 7;
const END_HOUR = 21;
const timeSlots = generateTimeSlots(START_HOUR, END_HOUR);

interface WeekViewProps { filters?: FilterOptions; }

export function WeekView({ filters }: WeekViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<ClassSessionWithRelations | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const startDate = formatDate(weekStart);
  const endDate = formatDate(addDays(weekStart, 6));

  const { data: sessions, isLoading } = useSessions({ ...filters, startDate, endDate });

  const handleAddSession = (date: Date) => {
    setSelectedSession(null);
    setDefaultDate(date);
    setIsFormOpen(true);
  };
  const handleEditSession = (session: ClassSessionWithRelations) => {
    setSelectedSession(session);
    setDefaultDate(undefined);
    setIsFormOpen(true);
  };
  const handleClose = () => { setIsFormOpen(false); setSelectedSession(null); setDefaultDate(undefined); };

  if (isLoading) return <WeekViewSkeleton />;

  return (
    <div className="card overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b"
           style={{ borderColor: 'var(--border-subtle)' }}>
        <button onClick={() => setCurrentWeek(d => addDays(d, -7))} className="btn-ghost px-2.5 py-2">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <CalendarCheck className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
          <h2 className="heading-md">
            {format(weekStart, 'MMM d')} — {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </h2>
          <button onClick={() => setCurrentWeek(new Date())} className="btn-ghost px-3 py-1.5 text-xs"
                  style={{ color: 'var(--brand-primary)', borderColor: 'rgba(99,102,241,0.3)' }}>
            Today
          </button>
        </div>
        <button onClick={() => setCurrentWeek(d => addDays(d, 7))} className="btn-ghost px-2.5 py-2">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: '780px' }}>
          {/* Day column headers */}
          <div className="grid grid-cols-8 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="px-3 py-3 text-xs font-medium border-r"
                 style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
              Time
            </div>
            {weekDays.map(day => {
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()}
                     className="px-2 py-3 text-center border-r"
                     style={{ borderColor: 'var(--border-subtle)', background: isToday ? 'rgba(99,102,241,0.08)' : 'var(--bg-elevated)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{format(day, 'EEE')}</div>
                  <div className={`text-sm font-bold w-7 h-7 rounded-full mx-auto flex items-center justify-center
                    ${isToday ? 'text-white' : ''}`}
                       style={isToday ? { background: 'var(--brand-primary)' } : { color: 'var(--text-primary)' }}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time slots grid */}
          <div className="relative">
            {timeSlots.map((slot, idx) => (
              <div key={slot.label}
                   className="grid grid-cols-8 border-b"
                   style={{ borderColor: idx % 2 === 0 ? 'var(--border-subtle)' : 'rgba(255,255,255,0.03)' }}>
                <div className="px-3 py-3 text-xs border-r flex-shrink-0"
                     style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)', minWidth: '60px' }}>
                  {slot.label}
                </div>
                {weekDays.map(day => {
                  const daySessions = sessions?.filter(s =>
                    isSameDay(new Date(s.date), day) &&
                    parseInt(s.startTime.split(':')[0]) === slot.hour
                  );
                  return (
                    <div key={`${day.toISOString()}-${slot.label}`}
                         className="relative border-r cursor-pointer group"
                         style={{ minHeight: '56px', borderColor: 'var(--border-subtle)' }}
                         onClick={() => handleAddSession(day)}>
                      {/* Hover tint */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                           style={{ background: 'rgba(99,102,241,0.04)' }} />
                      {daySessions?.map(session => (
                        <SessionBlock key={session.id} session={session} onClick={() => handleEditSession(session)} />
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {isFormOpen && (
        <SessionForm session={selectedSession} onClose={handleClose} defaultDate={defaultDate} />
      )}
    </div>
  );
}

function SessionBlock({ session, onClick }: { session: ClassSessionWithRelations; onClick: () => void }) {
  const startMinutes = timeToMinutes(session.startTime);
  const endMinutes = timeToMinutes(session.endTime);
  const duration = endMinutes - startMinutes;
  const topOffset = ((startMinutes % 60) / 60) * 56;
  const height = Math.max((duration / 60) * 56, 22);

  const status = getSessionStatus(session.date, session.startTime, session.endTime);

  const styles: Record<string, { bg: string; border: string; text: string; glow?: string }> = {
    PLANNING: { bg: 'var(--status-planning-bg)',  border: 'var(--status-planning-border)',  text: 'var(--status-planning-text)' },
    ON_GOING: { bg: 'var(--status-ongoing-bg)',   border: 'var(--status-ongoing-border)',   text: 'var(--status-ongoing-text)',  glow: 'var(--shadow-glow-green)' },
    FINISHED: { bg: 'var(--status-finished-bg)',  border: 'var(--status-finished-border)',  text: 'var(--status-finished-text)' },
  };
  const s = styles[status] ?? styles.PLANNING;

  return (
    <div
      className={cn(
        'absolute left-1 right-1 rounded-md px-2 py-1 text-xs cursor-pointer overflow-hidden border-l-2 transition-all duration-150 hover:brightness-125',
        status === 'ON_GOING' ? 'animate-pulse-glow' : ''
      )}
      style={{
        top: `${topOffset}px`,
        height: `${height}px`,
        background: s.bg,
        borderLeftColor: s.border,
        color: s.text,
        boxShadow: s.glow,
        zIndex: 1,
      }}
      onClick={e => { e.stopPropagation(); onClick(); }}
    >
      <div className="font-semibold truncate leading-tight">{session.className}</div>
      {height > 36 && (
        <div className="opacity-80 truncate" style={{ fontSize: '0.7rem' }}>
          {session.startTime}–{session.endTime}
        </div>
      )}
      {height > 50 && (
        <div className="opacity-70 truncate" style={{ fontSize: '0.7rem' }}>{session.room.name}</div>
      )}
    </div>
  );
}

function WeekViewSkeleton() {
  return (
    <div className="card overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="skeleton w-8 h-8 rounded-lg" />
        <div className="skeleton w-48 h-5 rounded" />
        <div className="skeleton w-8 h-8 rounded-lg" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-12 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
