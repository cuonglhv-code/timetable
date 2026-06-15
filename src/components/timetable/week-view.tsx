'use client';

import { useState, useEffect } from 'react';
import { format, addDays, isSameDay, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { useSessions, useUpdateSession } from '@/hooks/use-sessions';
import { generateTimeSlots, timeToMinutes, formatDate, cn, getSessionStatus, getUTCDateString } from '@/lib/utils';
import { SessionForm } from './session-form';
import { SessionDetailDrawer } from './session-detail-drawer';
import { useToast } from '@/components/ui/toast';
import { DatePicker } from '@/components/ui/date-picker';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { ClassSessionWithRelations, FilterOptions } from '@/types';

const SLOT_HEIGHT = 56; // px per hour slot

interface WeekViewProps {
  filters?: FilterOptions;
  user: {
    id: string;
    role: string;
  };
}

export function WeekView({ filters, user }: WeekViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<ClassSessionWithRelations | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();
  const [draggingSession, setDraggingSession] = useState<ClassSessionWithRelations | null>(null);
  
  // Custom Controls State
  const [isMobileDay, setIsMobileDay] = useState(false);
  const [mobileDayOffset, setMobileDayOffset] = useState(0);
  const [viewDays, setViewDays] = useState<'work' | 'all'>('all');
  const [timeRangeLimit, setTimeRangeLimit] = useState<'standard' | 'all'>('all');

  const updateSession = useUpdateSession();
  const { warning } = useToast();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const startDate = formatDate(weekStart);
  const endDate = formatDate(addDays(weekStart, 6));

  const { data: sessions, isLoading } = useSessions({ ...filters, startDate, endDate });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Filter columns (Working Days vs Full Week)
  const displayedDays = viewDays === 'work' ? weekDays.slice(0, 5) : weekDays;

  // Filter hours slots (Standard 9-17 vs All 7-21)
  const timeSlots = timeRangeLimit === 'standard'
    ? generateTimeSlots(9, 17)
    : generateTimeSlots(7, 21);

  const isWriteUser = user.role !== 'TEACHER';

  const handleAddSession = (date: Date) => {
    setSelectedSession(null);
    setDefaultDate(date);
    setIsFormOpen(true);
    setIsDrawerOpen(false);
  };

  // Listen for the global + Add Session click from the toolbar (placed below handleAddSession to avoid TDZ access)
  useEffect(() => {
    const handleGlobalAdd = () => {
      if (isWriteUser) {
        handleAddSession(new Date());
      }
    };
    window.addEventListener('open-session-form', handleGlobalAdd);
    return () => window.removeEventListener('open-session-form', handleGlobalAdd);
  }, [isWriteUser]);

  const handleViewSession = (session: ClassSessionWithRelations) => {
    setSelectedSession(session);
    setIsDrawerOpen(true);
    setIsFormOpen(false);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setIsDrawerOpen(false);
    setSelectedSession(null);
    setDefaultDate(undefined);
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (!isWriteUser) return;
    const session = sessions?.find(s => s.id === event.active.id);
    setDraggingSession(session ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!isWriteUser) return;
    setDraggingSession(null);
    const { active, over } = event;
    if (!over || !active) return;

    const overId = String(over.id);
    const parts = overId.split('-');
    if (parts.length < 5) return;
    const newDate = `${parts[1]}-${parts[2]}-${parts[3]}`;
    const newHour = parseInt(parts[4], 10);
    const session = sessions?.find(s => s.id === active.id);
    if (!session) return;

    const originalMinutes = parseInt(session.startTime.split(':')[1], 10);
    const duration = timeToMinutes(session.endTime) - timeToMinutes(session.startTime);
    const newStartMins = newHour * 60 + originalMinutes;
    const newEndMins = newStartMins + duration;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const newStartTime = `${pad(Math.floor(newStartMins / 60))}:${pad(newStartMins % 60)}`;
    const newEndTime = `${pad(Math.floor(newEndMins / 60))}:${pad(newEndMins % 60)}`;

    const isSameSlot = newDate === getUTCDateString(session.date) && newStartTime === session.startTime;
    if (isSameSlot) return;

    try {
      await updateSession.mutateAsync({
        id: session.id,
        data: { date: newDate, startTime: newStartTime, endTime: newEndTime },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Move failed';
      warning('Could not move session', msg);
    }
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    params.set('format', 'csv');
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    if (filters?.centreId) params.set('centreId', filters.centreId);
    if (filters?.teacherId) params.set('teacherId', filters.teacherId);
    if (filters?.courseId) params.set('courseId', filters.courseId);
    window.open(`/api/sessions/export?${params.toString()}`, '_blank');
  };

  const getAcademicWeekString = (date: Date) => {
    const startOfYearDate = new Date(date.getFullYear(), 0, 1);
    const pastDays = (date.getTime() - startOfYearDate.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDays + startOfYearDate.getDay() + 1) / 7);
    const academicYear = date.getMonth() >= 8
      ? `${date.getFullYear()}/${(date.getFullYear() + 1).toString().slice(-2)}`
      : `${date.getFullYear() - 1}/${date.getFullYear().toString().slice(-2)}`;
    return `Acad. Year ${academicYear} · Week ${weekNum}`;
  };

  if (isLoading) return <WeekViewSkeleton />;

  const mobileDay = addDays(weekStart, mobileDayOffset);
  const displayDays = isMobileDay ? [mobileDay] : displayedDays;

  return (
    <div className="card overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
      
      {/* Redesigned Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border-b gap-4 flex-wrap"
           style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        
        {/* Left Section: Title & Academic Term */}
        <div className="flex flex-col gap-1 min-w-[200px]">
          <h2 className="heading-lg tracking-tight flex items-center gap-2 text-lg lg:text-xl" style={{ color: 'var(--text-primary)' }}>
            Class Timetable
          </h2>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {getAcademicWeekString(currentWeek)}
          </span>
        </div>

        {/* Middle Section: Navigation controls */}
        <div className="flex items-center gap-2 flex-wrap bg-[rgba(0,0,0,0.08)] dark:bg-[rgba(255,255,255,0.03)] p-1 rounded-xl border"
             style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => setCurrentWeek(d => addDays(d, -7))}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--bg-glass-hover)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Previous Week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => {
              const today = new Date();
              setCurrentWeek(today);
              setMobileDayOffset(today.getDay() === 0 ? 6 : today.getDay() - 1);
            }}
            className="px-3 py-1 text-xs font-bold rounded-lg transition-all"
            style={{ color: 'var(--brand-primary)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}
          >
            Today
          </button>

          <button
            onClick={() => setCurrentWeek(d => addDays(d, 7))}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--bg-glass-hover)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Next Week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <DatePicker
            selectedDate={currentWeek}
            onChange={(date) => {
              setCurrentWeek(date);
              setMobileDayOffset(date.getDay() === 0 ? 6 : date.getDay() - 1);
            }}
          />

          <div className="h-4 w-px mx-1 bg-[var(--border-subtle)]" />

          <span className="text-xs font-semibold px-2 hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
            {format(weekStart, 'MMM dd')} – {format(addDays(weekStart, viewDays === 'work' ? 4 : 6), 'dd, yyyy')}
          </span>
        </div>

        {/* Right Section: Filters, Tabs, and Actions */}
        <div className="flex items-center gap-2.5 flex-wrap ml-auto">
          {/* Day Range Filter */}
          <select
            value={viewDays}
            onChange={e => setViewDays(e.target.value as 'work' | 'all')}
            className="field text-xs py-1.5 px-2.5 w-auto"
            style={{ height: '36px' }}
          >
            <option value="all">Full Week (Mon-Sun)</option>
            <option value="work">Working Days (Mon-Fri)</option>
          </select>

          {/* Time Limit Filter */}
          <select
            value={timeRangeLimit}
            onChange={e => setTimeRangeLimit(e.target.value as 'standard' | 'all')}
            className="field text-xs py-1.5 px-2.5 w-auto"
            style={{ height: '36px' }}
          >
            <option value="all">All Hours (07:00-21:00)</option>
            <option value="standard">Standard (09:00-17:00)</option>
          </select>

          {/* Excel Export Button */}
          <button
            onClick={handleExportCSV}
            className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5"
            style={{ height: '36px' }}
            title="Export Timetable to CSV (Excel)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          <div className="h-6 w-px bg-[var(--border-subtle)] hidden sm:block" />

          {/* Day / Week View Tabs */}
          <div className="flex items-center rounded-lg border p-0.5" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-glass)' }}>
            <button
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

      {/* Mobile Day Navigator (Active when isMobileDay is true) */}
      {isMobileDay && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b"
             style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <button onClick={() => setMobileDayOffset(o => Math.max(0, o - 1))} className="btn-ghost px-2 py-1 text-xs" disabled={mobileDayOffset === 0}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="text-center">
            <div className="label text-[10px] tracking-wider">{format(mobileDay, 'EEEE').toUpperCase()}</div>
            <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{format(mobileDay, 'd MMMM')}</div>
          </div>
          <button
            onClick={() => setMobileDayOffset(o => Math.min(viewDays === 'work' ? 4 : 6, o + 1))}
            className="btn-ghost px-2 py-1 text-xs"
            disabled={mobileDayOffset === (viewDays === 'work' ? 4 : 6)}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <div style={{ minWidth: isMobileDay ? '320px' : '720px' }}>
            
            {/* Redesigned Two-Tier Header Row */}
            {!isMobileDay && (
              <div className="grid border-b" style={{ gridTemplateColumns: `60px repeat(${displayDays.length}, 1fr)`, borderColor: 'var(--border-subtle)' }}>
                <div className="px-2 py-3 text-xs font-semibold border-r flex items-center justify-center"
                     style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                  TIME
                </div>
                {displayDays.map(day => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div key={day.toISOString()} className="px-2 py-2 text-center border-r flex flex-col justify-center"
                          style={{
                            borderColor: 'var(--border-subtle)',
                            background: isToday ? 'var(--bg-glass-hover)' : 'var(--bg-elevated)'
                          }}>
                      <div className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        {format(day, 'EEE').toUpperCase()}
                      </div>
                      <div className={`text-base font-extrabold mt-0.5 w-8 h-8 rounded-full mx-auto flex items-center justify-center ${isToday ? 'text-white shadow-md' : ''}`}
                           style={isToday ? { background: 'var(--brand-primary)' } : { color: 'var(--text-primary)' }}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Time Grid Layout */}
            <div className="relative">
              {timeSlots.map((slot) => {
                const cols = isMobileDay ? '60px 1fr' : `60px repeat(${displayDays.length}, 1fr)`;
                return (
                  <div key={slot.label} className="grid border-b relative"
                       style={{ gridTemplateColumns: cols, height: `${SLOT_HEIGHT}px`, borderColor: 'var(--border-subtle)' }}>
                    
                    {/* Time Label column */}
                    <div className="text-[10px] font-bold text-center py-1.5 border-r select-none"
                         style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                      {slot.label}
                    </div>

                    {/* Droppable day cells for this time slot */}
                    {displayDays.map(day => {
                      const dayStr = formatDate(day);
                      const slotHour = slot.hour;
                      const cellId = `cell-${dayStr}-${slotHour}`;
                      
                      // Find sessions starting in this hour on this day
                      const cellSessions = sessions?.filter(s => {
                        const sDate = getUTCDateString(s.date);
                        const sHour = parseInt(s.startTime.split(':')[0], 10);
                        return sDate === dayStr && sHour === slotHour;
                      }) ?? [];

                      return (
                        <DroppableCell
                          key={cellId}
                          id={cellId}
                          isWriteUser={isWriteUser}
                          onAdd={() => {
                            const combined = new Date(day);
                            combined.setHours(slotHour, 0, 0, 0);
                            handleAddSession(combined);
                          }}
                        >
                          {cellSessions.map(session => (
                            <DraggableSessionBlock
                              key={session.id}
                              session={session}
                              isWriteUser={isWriteUser}
                              isDragging={draggingSession?.id === session.id}
                              onClick={() => handleViewSession(session)}
                            />
                          ))}
                        </DroppableCell>
                      );
                    })}
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggingSession && (
            <div className="rounded-md px-2 py-1.5 text-xs font-semibold opacity-95 border-l-4"
                 style={{
                   background: 'var(--bg-elevated)',
                   borderLeftColor: draggingSession.course.colorHex ?? 'var(--brand-primary)',
                   color: 'var(--text-primary)',
                   width: '180px',
                   height: `${SLOT_HEIGHT}px`,
                   boxShadow: 'none',
                   border: '1px solid var(--border-default)',
                 }}>
              <div className="font-bold truncate">{draggingSession.className}</div>
              <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>📍 {draggingSession.room.name}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {isFormOpen && (
        <SessionForm session={selectedSession} onClose={handleClose} defaultDate={defaultDate} />
      )}
      {isDrawerOpen && selectedSession && (
        <SessionDetailDrawer session={selectedSession} onClose={handleClose} />
      )}
    </div>
  );
}

/* Droppable cell */
function DroppableCell({ id, children, onAdd, isWriteUser }: { id: string; children: React.ReactNode; onAdd: () => void; isWriteUser: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id, disabled: !isWriteUser });
  return (
    <div ref={setNodeRef}
         className={cn(
           "relative border-r last:border-r-0 transition-colors duration-150",
           isWriteUser ? "cursor-pointer group hover:bg-glass-hover" : ""
         )}
         style={{ minHeight: `${SLOT_HEIGHT}px`, borderColor: 'var(--border-subtle)', background: isOver ? 'var(--bg-glass-hover)' : 'transparent' }}
         onClick={isWriteUser ? onAdd : undefined}>
      {isWriteUser && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
             style={{ background: 'var(--bg-glass-hover)' }} />
      )}
      {children}
    </div>
  );
}

/* Draggable session block styled to Asana compact card guidelines */
function DraggableSessionBlock({
  session, onClick, isDragging, isWriteUser
}: { session: ClassSessionWithRelations; onClick: () => void; isDragging: boolean; isWriteUser: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: session.id,
    disabled: !isWriteUser
  });

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

  const style = { transform: CSS.Translate.toString(transform) };

  const testType = (session as unknown as { testType?: string }).testType;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        top: `${topOffset}px`,
        height: `${height}px`,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderLeft: `4px solid ${courseColor}`,
        color: 'var(--text-primary)',
        opacity: isDragging ? 0.35 : 1,
        zIndex: isDragging ? 0 : 2,
        boxShadow: 'none',
        borderRadius: 'var(--radius-md)',
      }}
      className={cn(
        'absolute left-1 right-1 px-2 py-1.5 flex flex-col justify-between overflow-hidden transition-all hover:border-strong group/card',
        status === 'ON_GOING' ? 'border-accent' : ''
      )}
      {...(isWriteUser ? listeners : {})}
      {...(isWriteUser ? attributes : {})}
      onClick={e => { e.stopPropagation(); onClick(); }}
    >
      <div className="flex items-start justify-between gap-1 w-full min-w-0">
        <div className={cn(
          "font-bold truncate leading-tight text-[11px] sm:text-xs",
          isWriteUser ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
        )}
             style={{ color: 'var(--text-primary)' }}>
          {session.className}
        </div>
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
             style={{ background: dotColor }}
             title={`Status: ${status}`} />
      </div>
        
      {/* Test Day Badge */}
      {testType && (
        <div className="mt-1 flex flex-wrap">
          {(() => {
            const TEST_BADGES = {
              MINI_TEST: { label: 'Mini Test', icon: '⏱️', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.20)', text: '#3b82f6' },
              MID_TEST: { label: 'Mid Test', icon: '📝', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.20)', text: '#d97706' },
              FINAL_TEST: { label: 'Final Test', icon: '🎓', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.20)', text: '#dc2626' },
            };
            const testInfo = TEST_BADGES[testType as keyof typeof TEST_BADGES];
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
        <div className="truncate text-[10px] font-medium flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          <span className="w-1 h-1 rounded-full inline-block flex-shrink-0" style={{ background: courseColor }} />
          <span className="truncate">{session.course.name}</span>
        </div>
      )}
      
      {height > 50 && (
        <div className="flex items-center justify-between gap-1.5 mt-auto pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Circular Assignee Avatar */}
            <div className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                 style={{ background: `${courseColor}18`, color: 'var(--text-primary)', border: `1px solid ${courseColor}33` }}
                 title={session.teacher.name}>
              {session.teacher.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(-2)}
            </div>
            <span className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>
              {session.room.name}
            </span>
          </div>
          <span className="text-[9px] font-mono whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
            {session.startTime}–{session.endTime}
          </span>
        </div>
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
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
      </div>
    </div>
  );
}
