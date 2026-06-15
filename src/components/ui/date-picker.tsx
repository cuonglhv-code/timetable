'use client';

import { useState, useRef, useEffect } from 'react';
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
  subMonths,
  isToday,
} from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
  align?: 'left' | 'right';
}

export function DatePicker({ selectedDate, onChange, align = 'left' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close calendar popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync internal month view when selectedDate changes from parent
  useEffect(() => {
    setCurrentMonth(selectedDate);
  }, [selectedDate]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const weekDayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all duration-200 hover:bg-[var(--bg-glass-hover)] active:scale-[0.98]"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-default)',
          color: 'var(--text-primary)',
          height: '36px',
        }}
      >
        <CalendarIcon className="w-4 h-4 text-indigo-500" />
        <span>{format(selectedDate, 'MMM d, yyyy')}</span>
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 w-72 p-4 rounded-2xl shadow-2xl z-50 border`}
          style={{
            background: 'var(--bg-elevated)',
            borderColor: 'var(--border-default)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-glass-hover)] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-glass-hover)] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {weekDayLabels.map((lbl, idx) => (
              <span key={idx} className="text-[10px] font-extrabold" style={{ color: 'var(--text-muted)' }}>
                {lbl}
              </span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 text-center justify-items-center">
            {days.map((day, dayIdx) => {
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDay = isToday(day);

              return (
                <button
                  key={dayIdx}
                  type="button"
                  onClick={() => {
                    onChange(day);
                    setIsOpen(false);
                  }}
                  className="w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-all"
                  style={{
                    color: isSelected
                      ? '#ffffff'
                      : !isCurrentMonth
                      ? 'var(--text-muted)'
                      : isTodayDay
                      ? 'var(--brand-primary)'
                      : 'var(--text-primary)',
                    background: isSelected
                      ? 'var(--brand-primary)'
                      : isTodayDay
                      ? 'rgba(99, 102, 241, 0.15)'
                      : 'transparent',
                    opacity: !isCurrentMonth ? 0.35 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--bg-glass-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = isTodayDay ? 'rgba(99, 102, 241, 0.15)' : 'transparent';
                    }
                  }}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => {
                onChange(new Date());
                setIsOpen(false);
              }}
              className="text-xs font-bold transition-colors"
              style={{ color: 'var(--brand-primary)' }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
