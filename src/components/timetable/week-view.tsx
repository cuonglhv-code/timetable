/**
 * Week view component showing a 7-day time grid with session blocks.
 * @module components/timetable/week-view
 */

'use client';

import { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { useSessions } from '@/hooks/use-sessions';
import { generateTimeSlots, timeToMinutes, formatDate, cn, getSessionStatus } from '@/lib/utils';
import { SessionForm } from './session-form';
import type { ClassSessionWithRelations, FilterOptions } from '@/types';

const START_HOUR = 8;
const END_HOUR = 21;
const timeSlots = generateTimeSlots(START_HOUR, END_HOUR);

interface WeekViewProps {
  filters?: FilterOptions;
}

export function WeekView({ filters }: WeekViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<ClassSessionWithRelations | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const startDate = formatDate(weekStart);
  const endDate = formatDate(addDays(weekStart, 6));

  const { data: sessions, isLoading } = useSessions({
    ...filters,
    startDate,
    endDate,
  });

  const goToPreviousWeek = () => setCurrentWeek((d) => addDays(d, -7));
  const goToNextWeek = () => setCurrentWeek((d) => addDays(d, 7));
  const goToCurrentWeek = () => setCurrentWeek(new Date());

  const handleAddSession = (date: Date) => {
    setSelectedSession(null);
    setIsFormOpen(true);
  };

  const handleEditSession = (session: ClassSessionWithRelations) => {
    setSelectedSession(session);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedSession(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading timetable...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <button
          onClick={goToPreviousWeek}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          ← Prev
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </h2>
          <button
            onClick={goToCurrentWeek}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>
        <button
          onClick={goToNextWeek}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Next →
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="px-2 py-2 text-xs font-medium text-gray-500 border-r border-gray-200 bg-gray-50">
              Time
            </div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`px-2 py-2 text-center border-r border-gray-200 ${
                  isSameDay(day, new Date()) ? 'bg-blue-50' : 'bg-gray-50'
                }`}
              >
                <div className="text-xs font-medium text-gray-500">
                  {format(day, 'EEE')}
                </div>
                <div
                  className={`text-sm font-semibold ${
                    isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-900'
                  }`}
                >
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          <div className="relative">
            {timeSlots.map((slot) => (
              <div key={slot.label} className="grid grid-cols-8 border-b border-gray-100">
                <div className="px-2 py-3 text-xs text-gray-500 border-r border-gray-200 bg-gray-50">
                  {slot.label}
                </div>
                {weekDays.map((day) => {
                  const daySessions = sessions?.filter(
                    (s) =>
                      isSameDay(new Date(s.date), day) &&
                      parseInt(s.startTime.split(':')[0]) === slot.hour
                  );

                  return (
                    <div
                      key={`${day.toISOString()}-${slot.label}`}
                      className="min-h-[60px] border-r border-gray-200 relative"
                      onClick={() => handleAddSession(day)}
                    >
                      {daySessions?.map((session) => (
                        <SessionBlock
                          key={session.id}
                          session={session}
                          onClick={() => handleEditSession(session)}
                        />
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
        <SessionForm
          session={selectedSession}
          onClose={handleCloseForm}
          defaultDate={selectedSession ? undefined : new Date()}
        />
      )}
    </div>
  );
}

interface SessionBlockProps {
  session: ClassSessionWithRelations;
  onClick: () => void;
}

function SessionBlock({ session, onClick }: SessionBlockProps) {
  const startMinutes = timeToMinutes(session.startTime);
  const endMinutes = timeToMinutes(session.endTime);
  const duration = endMinutes - startMinutes;
  const topOffset = ((startMinutes % 60) / 60) * 60;
  const height = (duration / 60) * 60;

  const status = getSessionStatus(session.date, session.startTime, session.endTime);

  let borderStyle = '';
  let bgStyle = '';
  let textStyle = '';

  if (status === 'PLANNING') {
    // Yellow
    bgStyle = '#fef3c7'; // amber-100
    borderStyle = '#fbbf24'; // amber-400
    textStyle = 'text-amber-900 border-amber-400';
  } else if (status === 'ON_GOING') {
    // Green
    bgStyle = '#dcfce7'; // emerald-100
    borderStyle = '#34d399'; // emerald-400
    textStyle = 'text-emerald-900 border-emerald-400 font-semibold shadow-sm ring-1 ring-emerald-400/20';
  } else {
    // Finished (Red)
    bgStyle = '#fee2e2'; // rose-100
    borderStyle = '#f87171'; // rose-400
    textStyle = 'text-rose-900 border-rose-400 opacity-80';
  }

  return (
    <div
      className={cn(
        "absolute left-1 right-1 rounded-md px-2 py-1 text-xs cursor-pointer hover:opacity-90 transition-all overflow-hidden border-l-[3px]",
        textStyle
      )}
      style={{
        top: `${topOffset}px`,
        height: `${Math.max(height, 24)}px`,
        backgroundColor: bgStyle,
        borderLeftColor: borderStyle,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div className="font-semibold truncate">{session.className}</div>
      <div className="opacity-90 truncate">
        {session.startTime} - {session.endTime}
      </div>
      <div className="opacity-80 truncate">{session.room.name}</div>
    </div>
  );
}
