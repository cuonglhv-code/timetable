'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, isSameDay } from 'date-fns';
import { BookOpen, Globe, ChevronLeft, ChevronRight, Calendar, FileSpreadsheet, Eye, Info } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { DatePicker } from '@/components/ui/date-picker';
import { PublicSessionDetailDrawer } from './public-session-detail';
import { getUTCDateString, getSessionStatus, generateTimeSlots, timeToMinutes, cn } from '@/lib/utils';
import type { ClassSessionWithRelations } from '@/types';

const SLOT_HEIGHT = 56; // px per hour slot

interface PublicData {
  sessions: ClassSessionWithRelations[];
  centres: { id: string; name: string }[];
  weekStart: string;
  weekEnd: string;
}

export function PublicTimetable() {
  const [centreFilter, setCentreFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  
  // Grid Navigation & View Toggles
  const [viewDays, setViewDays] = useState<'work' | 'all'>('all');
  const [timeRangeLimit, setTimeRangeLimit] = useState<'standard' | 'all'>('all');
  const [isMobileDay, setIsMobileDay] = useState(false);
  const [mobileDayOffset, setMobileDayOffset] = useState(0);
  const [selectedSession, setSelectedSession] = useState<ClassSessionWithRelations | null>(null);

  const { data, isLoading } = useQuery<PublicData>({
    queryKey: ['public-timetable', centreFilter, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (centreFilter) params.set('centreId', centreFilter);
      params.set('date', format(selectedDate, 'yyyy-MM-dd'));
      const res = await fetch(`/api/public/timetable?${params}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    refetchInterval: 60_000,
  });

  // Timezone-safe local parsing of UTC Monday
  let weekStart = new Date();
  if (data?.weekStart) {
    const parts = data.weekStart.split('T')[0].split('-');
    weekStart = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    const day = selectedDate.getDay();
    const diff = selectedDate.getDate() - day + (day === 0 ? -6 : 1);
    const temp = new Date(selectedDate);
    temp.setDate(diff);
    weekStart = temp;
  }
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Filter columns based on Working Days vs Full Week
  const displayedDays = viewDays === 'work' ? weekDays.slice(0, 5) : weekDays;

  // Filter hours timeline
  const timeSlots = timeRangeLimit === 'standard'
    ? generateTimeSlots(9, 17)
    : generateTimeSlots(7, 21);

  const mobileDay = addDays(weekStart, mobileDayOffset);
  const displayDays = isMobileDay ? [mobileDay] : displayedDays;

  const handleSelectSession = (session: ClassSessionWithRelations) => {
    setSelectedSession(session);
  };

  const handleCloseDrawer = () => {
    setSelectedSession(null);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-app)' }}>
      {/* Public Header */}
      <header className="border-b px-4 py-4" style={{ background: 'var(--bg-header)', borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>Jaxtina English Centre</div>
              <div className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                <Globe className="w-3 h-3" /> Public Timetable
              </div>
            </div>
          </div>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Grid View */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col">
        {/* Unified Controls Toolbar Card */}
        <div className="card mb-5 p-4 flex flex-wrap items-center justify-between gap-4" style={{ background: 'var(--bg-surface)' }}>
          {/* Left: Date Navigation Group */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-[rgba(0,0,0,0.04)] dark:bg-[rgba(255,255,255,0.03)] p-1 rounded-xl border"
                 style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <button
                type="button"
                onClick={() => {
                  const nextDate = addDays(selectedDate, -7);
                  setSelectedDate(nextDate);
                  setMobileDayOffset(nextDate.getDay() === 0 ? 6 : nextDate.getDay() - 1);
                }}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-glass-hover)] transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <DatePicker selectedDate={selectedDate} onChange={(date) => {
                setSelectedDate(date);
                setMobileDayOffset(date.getDay() === 0 ? 6 : date.getDay() - 1);
              }} align="left" />
              <button
                type="button"
                onClick={() => {
                  const nextDate = addDays(selectedDate, 7);
                  setSelectedDate(nextDate);
                  setMobileDayOffset(nextDate.getDay() === 0 ? 6 : nextDate.getDay() - 1);
                }}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-glass-hover)] transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {format(weekStart, 'MMM d')} — {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </div>
          </div>

          {/* Right: Filters & Tabs Group */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Centre Filter */}
            {data && (
              <select
                value={centreFilter}
                onChange={e => setCentreFilter(e.target.value)}
                className="field text-xs py-1.5 px-2.5 w-[160px]"
                style={{ height: '36px' }}
              >
                <option value="">All Centres</option>
                {data.centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}

            {/* View Days */}
            <select
              value={viewDays}
              onChange={e => setViewDays(e.target.value as 'work' | 'all')}
              className="field text-xs py-1.5 px-2.5 w-auto"
              style={{ height: '36px' }}
            >
              <option value="all">Full Week (Mon-Sun)</option>
              <option value="work">Working Days (Mon-Fri)</option>
            </select>

            {/* Time limit filter */}
            <select
              value={timeRangeLimit}
              onChange={e => setTimeRangeLimit(e.target.value as 'standard' | 'all')}
              className="field text-xs py-1.5 px-2.5 w-auto"
              style={{ height: '36px' }}
            >
              <option value="all">All Hours (07:00-21:00)</option>
              <option value="standard">Standard (09:00-17:00)</option>
            </select>

            <div className="h-6 w-px bg-[var(--border-subtle)] hidden md:block" />

            {/* Day / Week Selector Tabs */}
            <div className="flex items-center rounded-lg border p-0.5" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-glass)' }}>
              <button
                type="button"
                onClick={() => setIsMobileDay(true)}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                  isMobileDay ? "text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
                style={isMobileDay ? { background: 'var(--brand-primary)' } : {}}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setIsMobileDay(false)}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                  !isMobileDay ? "text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
                style={!isMobileDay ? { background: 'var(--brand-primary)' } : {}}
              >
                Week
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid Box */}
        <div className="card flex-1 overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
          {isLoading ? (
            <div className="p-8 space-y-4">
              <div className="skeleton h-10 w-full rounded-lg" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Mobile day navigation bar */}
              {isMobileDay && (
                <div className="flex items-center justify-between px-4 py-2.5 border-b"
                     style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                  <button
                    type="button"
                    onClick={() => setMobileDayOffset(o => Math.max(0, o - 1))}
                    className="btn-ghost px-2 py-1 text-xs"
                    disabled={mobileDayOffset === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="text-center">
                    <div className="label text-[10px] tracking-wider">{format(mobileDay, 'EEEE').toUpperCase()}</div>
                    <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{format(mobileDay, 'd MMMM')}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileDayOffset(o => Math.min(viewDays === 'work' ? 4 : 6, o + 1))}
                    className="btn-ghost px-2 py-1 text-xs"
                    disabled={mobileDayOffset === (viewDays === 'work' ? 4 : 6)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Grid content */}
              <div className="overflow-x-auto">
                <div style={{ minWidth: isMobileDay ? '320px' : '720px' }}>
                  
                  {/* Two-Tier Grid Day Headers */}
                  {!isMobileDay && (
                    <div className="grid border-b" style={{ gridTemplateColumns: `60px repeat(${displayDays.length}, 1fr)`, borderColor: 'var(--border-subtle)' }}>
                      <div className="px-2 py-3 text-xs font-semibold border-r flex items-center justify-center"
                           style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                        TIME
                      </div>
                      {displayDays.map(day => {
                        const isTodayDay = isSameDay(day, new Date());
                        return (
                          <div key={day.toISOString()} className="px-2 py-2 text-center border-r flex flex-col justify-center"
                               style={{
                                 borderColor: 'var(--border-subtle)',
                                 background: isTodayDay ? 'var(--bg-glass-hover)' : 'var(--bg-elevated)'
                               }}>
                            <div className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                              {format(day, 'EEE').toUpperCase()}
                            </div>
                            <div className={`text-base font-extrabold mt-0.5 w-8 h-8 rounded-full mx-auto flex items-center justify-center ${isTodayDay ? 'text-white shadow-md' : ''}`}
                                 style={isTodayDay ? { background: 'var(--brand-primary)' } : { color: 'var(--text-primary)' }}>
                              {format(day, 'd')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Hourly Grid Rows */}
                  <div className="relative">
                    {timeSlots.map(slot => {
                      const cols = isMobileDay ? '60px 1fr' : `60px repeat(${displayDays.length}, 1fr)`;
                      return (
                        <div key={slot.label} className="grid border-b"
                             style={{ gridTemplateColumns: cols, borderColor: 'var(--border-subtle)' }}>
                          
                          {/* Y-Axis Hour Label */}
                          <div className="px-2 py-3 text-[10px] font-bold border-r flex-shrink-0 flex items-start justify-end pr-3"
                               style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)', minHeight: `${SLOT_HEIGHT}px` }}>
                            {slot.label}
                          </div>

                          {/* Columns Day Cells */}
                          {displayDays.map(day => {
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const daySessions = data?.sessions.filter(s =>
                              getUTCDateString(s.date) === dayStr &&
                              parseInt(s.startTime.split(':')[0], 10) === slot.hour
                            ) ?? [];

                            return (
                              <div key={day.toISOString()} className="relative border-r last:border-r-0" style={{ minHeight: `${SLOT_HEIGHT}px`, borderColor: 'var(--border-subtle)' }}>
                                {daySessions.map(session => (
                                  <SessionBlock
                                    key={session.id}
                                    session={session}
                                    onClick={() => handleSelectSession(session)}
                                  />
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Public Drawer for displaying details */}
      <PublicSessionDetailDrawer session={selectedSession} onClose={handleCloseDrawer} />

      <footer className="text-center py-6 border-t mt-8" style={{ borderColor: 'var(--border-subtle)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} Jaxtina English Centre · Auto-refreshes every minute
        </p>
      </footer>
    </div>
  );
}

/* Inline SessionBlock to render classes positioned correctly in the grid cell */
interface SessionBlockProps {
  session: ClassSessionWithRelations;
  onClick: () => void;
}

function SessionBlock({ session, onClick }: SessionBlockProps) {
  const startMinutes = timeToMinutes(session.startTime);
  const endMinutes = timeToMinutes(session.endTime);
  const duration = endMinutes - startMinutes;
  const topOffset = ((startMinutes % 60) / 60) * SLOT_HEIGHT;
  const height = Math.max((duration / 60) * SLOT_HEIGHT, 22);

  const status = getSessionStatus(session.date, session.startTime, session.endTime);
  const statusColors = {
    PLANNING: '#f59e0b',
    ON_GOING: '#10b981',
    FINISHED: '#9ca3af',
  };
  const dotColor = statusColors[status] ?? '#f59e0b';
  const courseColor = session.course.colorHex ?? '#6366f1';

  return (
    <div
      onClick={onClick}
      style={{
        top: `${topOffset}px`,
        height: `${height}px`,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderLeft: `4px solid ${courseColor}`,
        color: 'var(--text-primary)',
        cursor: 'pointer',
        zIndex: 2,
        boxShadow: 'var(--shadow-sm)',
      }}
      className={cn(
        'absolute left-1 right-1 rounded-md px-2.5 py-1.5 text-xs flex flex-col justify-between overflow-hidden transition-all hover:brightness-[1.03] hover:shadow-md group/card',
        status === 'ON_GOING' ? 'animate-pulse-glow' : ''
      )}
    >
      <div className="flex items-start justify-between gap-1 w-full">
        <div className="font-bold truncate leading-tight text-[11px] sm:text-xs"
             style={{ color: 'var(--text-primary)' }}>
          {session.className}
        </div>
        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
             style={{ background: dotColor, boxShadow: status === 'ON_GOING' ? `0 0 6px ${dotColor}` : 'none' }}
             title={`Status: ${status}`} />
      </div>

      {/* Test Day Badge */}
      {(session as any).testType && (
        <div className="mt-1 flex flex-wrap">
          {(() => {
            const TEST_BADGES = {
              MINI_TEST: { label: 'Mini Test', icon: '⏱️', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)', text: '#3b82f6' },
              MID_TEST: { label: 'Mid Test', icon: '📝', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: '#d97706' },
              FINAL_TEST: { label: 'Final Test', icon: '🎓', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', text: '#dc2626' },
            };
            const testInfo = TEST_BADGES[(session as any).testType as keyof typeof TEST_BADGES];
            if (!testInfo) return null;
            return (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border leading-none"
                    style={{ background: testInfo.bg, borderColor: testInfo.border, color: testInfo.text }}>
                {testInfo.icon} {testInfo.label}
              </span>
            );
          })()}
        </div>
      )}
      
      {height > 36 && (
        <div className="flex flex-col gap-0.5 mt-1 w-full text-[10px] leading-tight" style={{ color: 'var(--text-secondary)' }}>
          <div className="truncate font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: courseColor }} />
            {session.course.name} ({session.course.category})
          </div>
          {height > 50 && (
            <div className="truncate flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <span>📍 {session.room.name}</span>
              <span className="opacity-40">|</span>
              <span>👤 {session.teacher.name.split(' ').slice(-1)[0]}</span>
            </div>
          )}
        </div>
      )}
      
      {height > 25 && (
        <div className="text-[9px] font-mono mt-auto text-right w-full" style={{ color: 'var(--text-muted)' }}>
          {session.startTime}–{session.endTime}
        </div>
      )}
    </div>
  );
}
