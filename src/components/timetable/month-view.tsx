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
import { formatDate } from '@/lib/utils';
import { ShareCalendarModal } from './share-calendar-modal';
import type { ClassSessionWithRelations, FilterOptions } from '@/types';

const MAX_VISIBLE_SESSIONS = 3;

interface MonthViewProps {
  filters?: FilterOptions;
}

export function MonthView({ filters }: MonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [shareSessions, setShareSessions] = useState<ClassSessionWithRelations[]>([]);
  const [isShareOpen, setIsShareOpen] = useState(false);

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

  const handleShareSession = (session: ClassSessionWithRelations) => {
    setShareSessions([session]);
    setIsShareOpen(true);
  };

  const handleCloseShare = () => {
    setIsShareOpen(false);
    setShareSessions([]);
  };

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
                  <SessionPill
                    key={session.id}
                    session={session}
                    onShare={() => handleShareSession(session)}
                  />
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

      {isShareOpen && shareSessions.length > 0 && (
        <ShareCalendarModal
          sessions={shareSessions}
          centreId={shareSessions[0].centreId}
          onClose={handleCloseShare}
        />
      )}
    </div>
  );
}

interface SessionPillProps {
  session: ClassSessionWithRelations;
  onShare: () => void;
}

function SessionPill({ session, onShare }: SessionPillProps) {
  const bgColor = session.course.colorHex ?? '#3b82f6';

  return (
    <div
      className="rounded px-1.5 py-0.5 text-xs truncate cursor-pointer hover:opacity-80 transition-opacity group relative"
      style={{
        backgroundColor: `${bgColor}20`,
        borderLeft: `2px solid ${bgColor}`,
      }}
      onClick={onShare}
    >
      <div className="font-medium text-gray-900 truncate">{session.className}</div>
      <div className="text-gray-500 truncate">
        {session.startTime} · {session.room.name}
      </div>
    </div>
  );
}
