/**
 * Month view component showing a standard calendar grid with truncated class lists.
 * @module components/timetable/month-view
 */

'use client';

import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
} from 'date-fns';
import { useSessions } from '@/hooks/use-sessions';
import { formatDate, cn, getSessionStatus } from '@/lib/utils';
import type { ClassSessionWithRelations, FilterOptions } from '@/types';

const MAX_VISIBLE_SESSIONS = 3;

interface MonthViewProps {
  filters?: FilterOptions;
}

export function MonthView({ filters }: MonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const startDate = formatDate(calendarStart);
  const endDate = formatDate(calendarEnd);

  const { data: sessions, isLoading } = useSessions({
    ...filters,
    startDate,
    endDate,
  });

  const goToPreviousMonth = () => setCurrentMonth((d) => addMonths(d, -1));
  const goToNextMonth = () => setCurrentMonth((d) => addMonths(d, 1));
  const goToCurrentMonth = () => setCurrentMonth(new Date());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <button
          onClick={goToPreviousMonth}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          ← Prev
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={goToCurrentMonth}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>
        <button
          onClick={goToNextMonth}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-xs font-medium text-gray-500 text-center border-b border-r border-gray-200 bg-gray-50"
          >
            {day}
          </div>
        ))}

        {days.map((day) => {
          const daySessions =
            sessions?.filter((s) => isSameDay(new Date(s.date), day)) ?? [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[100px] p-2 border-b border-r border-gray-200 ${
                !isCurrentMonth ? 'bg-gray-50' : ''
              } ${isToday ? 'bg-blue-50' : ''}`}
            >
              <div
                className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {daySessions.slice(0, MAX_VISIBLE_SESSIONS).map((session) => (
                  <SessionPill key={session.id} session={session} />
                ))}
                {daySessions.length > MAX_VISIBLE_SESSIONS && (
                  <div className="text-xs text-gray-500 pl-1">
                    +{daySessions.length - MAX_VISIBLE_SESSIONS} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SessionPillProps {
  session: ClassSessionWithRelations;
}

function SessionPill({ session }: SessionPillProps) {
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
        "rounded px-1.5 py-0.5 text-xs truncate cursor-pointer hover:opacity-80 transition-all border-l-2",
        textStyle
      )}
      style={{
        backgroundColor: bgStyle,
        borderLeftColor: borderStyle,
      }}
    >
      <div className="font-semibold truncate">{session.className}</div>
      <div className="opacity-80 truncate">
        {session.startTime} · {session.room.name}
      </div>
    </div>
  );
}
