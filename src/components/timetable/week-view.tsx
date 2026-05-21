'use client';

import { useState } from 'react';
import { format, addDays, isSameDay, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarCheck, Plus } from 'lucide-react';
import { useSessions, useUpdateSession } from '@/hooks/use-sessions';
import { generateTimeSlots, timeToMinutes, formatDate, cn, getSessionStatus } from '@/lib/utils';
import { SessionForm } from './session-form';
import { SessionDetailDrawer } from './session-detail-drawer';
import { useToast } from '@/components/ui/toast';
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

const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_HEIGHT = 56; // px per hour slot
const timeSlots = generateTimeSlots(START_HOUR, END_HOUR);

interface WeekViewProps { filters?: FilterOptions; }

export function WeekView({ filters }: WeekViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<ClassSessionWithRelations | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();
  const [draggingSession, setDraggingSession] = useState<ClassSessionWithRelations | null>(null);
  const [isMobileDay, setIsMobileDay] = useState(false);
  const [mobileDayOffset, setMobileDayOffset] = useState(0);

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

  const handleAddSession = (date: Date) => {
    setSelectedSession(null);
    setDefaultDate(date);
    setIsFormOpen(true);
    setIsDrawerOpen(false);
  };

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
    const session = sessions?.find(s => s.id === event.active.id);
    setDraggingSession(session ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggingSession(null);
    const { active, over } = event;
    if (!over || !active) return;

    // over.id = "day-YYYY-MM-DD-HH" 
    const overId = String(over.id);
    const parts = overId.split('-');
    if (parts.length < 5) return;
    const newDate = `${parts[1]}-${parts[2]}-${parts[3]}`;
    const newHour = parseInt(parts[4], 10);
    const session = sessions?.find(s => s.id === active.id);
    if (!session) return;

    // Keep original minutes, change date and hour
    const originalMinutes = parseInt(session.startTime.split(':')[1], 10);
    const duration = timeToMinutes(session.endTime) - timeToMinutes(session.startTime);
    const newStartMins = newHour * 60 + originalMinutes;
    const newEndMins = newStartMins + duration;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const newStartTime = `${pad(Math.floor(newStartMins / 60))}:${pad(newStartMins % 60)}`;
    const newEndTime = `${pad(Math.floor(newEndMins / 60))}:${pad(newEndMins % 60)}`;

    const isSameSlot = newDate === formatDate(new Date(session.date)) && newStartTime === session.startTime;
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

  if (isLoading) return <WeekViewSkeleton />;

  const mobileDay = addDays(weekStart, mobileDayOffset);

  return (
    <div className="card overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2"
           style={{ borderColor: 'var(--border-subtle)' }}>
        <button onClick={() => setCurrentWeek(d => addDays(d, -7))} className="btn-ghost px-2.5 py-2">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <CalendarCheck className="w-4 h-4 hidden sm:block" style={{ color: 'var(--brand-primary)' }} />
          <h2 className="heading-md text-sm sm:text-base">
            {format(weekStart, 'MMM d')} — {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </h2>
          <button onClick={() => setCurrentWeek(new Date())} className="btn-ghost px-2 py-1 text-xs"
                  style={{ color: 'var(--brand-primary)', borderColor: 'rgba(99,102,241,0.3)' }}>
            Today
          </button>
          {/* Mobile/Desktop toggle */}
          <button onClick={() => setIsMobileDay(!isMobileDay)}
                  className="btn-ghost px-2 py-1 text-xs sm:hidden"
                  style={{ color: 'var(--text-secondary)' }}>
            {isMobileDay ? 'Week' : 'Day'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleAddSession(isMobileDay ? mobileDay : weekStart)} className="btn-primary gap-1.5 text-sm px-3 py-2">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
          <button onClick={() => setCurrentWeek(d => addDays(d, 7))} className="btn-ghost px-2.5 py-2">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Day Navigator */}
      {isMobileDay && (
        <div className="flex items-center justify-between px-4 py-2 border-b"
             style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <button onClick={() => setMobileDayOffset(o => Math.max(0, o - 1))} className="btn-ghost px-2 py-1 text-xs" disabled={mobileDayOffset === 0}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="text-center">
            <div className="label text-xs">{format(mobileDay, 'EEEE')}</div>
            <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{format(mobileDay, 'd MMMM')}</div>
          </div>
          <button onClick={() => setMobileDayOffset(o => Math.min(6, o + 1))} className="btn-ghost px-2 py-1 text-xs" disabled={mobileDayOffset === 6}>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <div style={{ minWidth: isMobileDay ? '320px' : '720px' }}>
            {/* Day column headers — hidden in mobile day mode */}
            {!isMobileDay && (
              <div className="grid border-b" style={{ gridTemplateColumns: '60px repeat(7, 1fr)', borderColor: 'var(--border-subtle)' }}>
                <div className="px-2 py-3 text-xs font-medium border-r"
                     style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>Time</div>
                {weekDays.map(day => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div key={day.toISOString()} className="px-2 py-3 text-center border-r"
                         style={{ borderColor: 'var(--border-subtle)', background: isToday ? 'rgba(99,102,241,0.08)' : 'var(--bg-elevated)' }}>
                      <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{format(day, 'EEE')}</div>
                      <div className={`text-sm font-bold w-7 h-7 rounded-full mx-auto flex items-center justify-center ${isToday ? 'text-white' : ''}`}
                           style={isToday ? { background: 'var(--brand-primary)' } : { color: 'var(--text-primary)' }}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Time grid */}
            <div className="relative">
              {timeSlots.map((slot, idx) => {
                const displayDays = isMobileDay ? [mobileDay] : weekDays;
                const cols = isMobileDay ? '60px 1fr' : '60px repeat(7, 1fr)';
                return (
                  <div key={slot.label} className="grid border-b"
                       style={{ gridTemplateColumns: cols, borderColor: idx % 2 === 0 ? 'var(--border-subtle)' : 'rgba(255,255,255,0.02)' }}>
                    <div className="px-2 py-3 text-xs border-r flex-shrink-0"
                         style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)', minHeight: `${SLOT_HEIGHT}px` }}>
                      {slot.label}
                    </div>
                    {displayDays.map(day => {
                      const daySessions = sessions?.filter(s =>
                        isSameDay(new Date(s.date), day) &&
                        parseInt(s.startTime.split(':')[0], 10) === slot.hour
                      );
                      const dropId = `day-${formatDate(day)}-${slot.hour}`;
                      return (
                        <DroppableCell key={dropId} id={dropId} onAdd={() => handleAddSession(day)}>
                          {daySessions?.map(session => (
                            <DraggableSessionBlock
                              key={session.id}
                              session={session}
                              onClick={() => handleViewSession(session)}
                              isDragging={draggingSession?.id === session.id}
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
            <div className="rounded-md px-2 py-1 text-xs font-semibold shadow-2xl opacity-90 border-l-2"
                 style={{
                   background: 'var(--status-planning-bg)',
                   borderLeftColor: 'var(--brand-primary)',
                   color: 'var(--text-primary)',
                   width: '120px',
                   height: `${SLOT_HEIGHT}px`,
                   boxShadow: 'var(--shadow-glow)',
                 }}>
              {draggingSession.className}
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
function DroppableCell({ id, children, onAdd }: { id: string; children: React.ReactNode; onAdd: () => void }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef}
         className="relative border-r cursor-pointer group"
         style={{ minHeight: `${SLOT_HEIGHT}px`, borderColor: 'var(--border-subtle)', background: isOver ? 'rgba(99,102,241,0.10)' : 'transparent', transition: 'background 0.15s' }}
         onClick={onAdd}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
           style={{ background: 'rgba(99,102,241,0.04)' }} />
      {children}
    </div>
  );
}

/* Draggable session block */
function DraggableSessionBlock({
  session, onClick, isDragging,
}: { session: ClassSessionWithRelations; onClick: () => void; isDragging: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: session.id });

  const startMinutes = timeToMinutes(session.startTime);
  const endMinutes = timeToMinutes(session.endTime);
  const duration = endMinutes - startMinutes;
  const topOffset = ((startMinutes % 60) / 60) * SLOT_HEIGHT;
  const height = Math.max((duration / 60) * SLOT_HEIGHT, 22);

  const status = getSessionStatus(session.date, session.startTime, session.endTime);
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    PLANNING: { bg: 'var(--status-planning-bg)', border: 'var(--status-planning-border)', text: 'var(--status-planning-text)' },
    ON_GOING: { bg: 'var(--status-ongoing-bg)',  border: 'var(--status-ongoing-border)',  text: 'var(--status-ongoing-text)' },
    FINISHED: { bg: 'var(--status-finished-bg)', border: 'var(--status-finished-border)', text: 'var(--status-finished-text)' },
  };
  const s = styles[status] ?? styles.PLANNING;

  const style = { transform: CSS.Translate.toString(transform) };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        top: `${topOffset}px`,
        height: `${height}px`,
        background: s.bg,
        borderLeftColor: s.border,
        color: s.text,
        opacity: isDragging ? 0.35 : 1,
        zIndex: isDragging ? 0 : 1,
      }}
      className={cn(
        'absolute left-1 right-1 rounded-md px-2 py-1 text-xs border-l-2 transition-opacity',
        status === 'ON_GOING' ? 'animate-pulse-glow' : ''
      )}
      {...listeners}
      {...attributes}
      onClick={e => { e.stopPropagation(); onClick(); }}
    >
      <div className="font-semibold truncate leading-tight cursor-grab active:cursor-grabbing">{session.className}</div>
      {height > 36 && <div className="opacity-80 truncate" style={{ fontSize: '0.68rem' }}>{session.startTime}–{session.endTime}</div>}
      {height > 50 && <div className="opacity-70 truncate" style={{ fontSize: '0.68rem' }}>{session.room.name}</div>}
    </div>
  );
}

function WeekViewSkeleton() {
  return (
    <div className="card overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
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
