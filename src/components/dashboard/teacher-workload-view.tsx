'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Clock, BookOpen, ChevronDown, ChevronRight, AlertTriangle, BarChart3, Download, Filter } from 'lucide-react';
import { getSessionStatus } from '@/lib/utils';
import { useCentres } from '@/hooks/use-centres';
import { useCourses } from '@/hooks/use-courses';
import type { ClassSessionWithRelations } from '@/types';

interface TeacherWorkload {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  weeklyMinutes: number;
  weeklyHours: number;
  sessionCount: number;
  sessions: ClassSessionWithRelations[];
}

const MAX_HOURS_WARNING = 25;

export function TeacherWorkloadView() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'hours' | 'sessions'>('hours');
  const [selectedCentreId, setSelectedCentreId] = useState<string>('ALL');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('ALL');

  const { data: centres } = useCentres();
  const { data: courses } = useCourses();

  const { data, isLoading } = useQuery<{ teachers: TeacherWorkload[]; weekStart: string }>({
    queryKey: ['teacher-workload'],
    queryFn: async () => {
      const res = await fetch('/api/teachers/workload');
      if (!res.ok) throw new Error('Failed to load workload');
      return res.json();
    },
    refetchInterval: 60_000,
  });

  // Client-side filtering logic
  const filteredTeachers = (data?.teachers ?? []).map(teacher => {
    const sessions = teacher.sessions.filter(s => {
      const matchCentre = selectedCentreId === 'ALL' || s.centreId === selectedCentreId;
      const matchCourse = selectedCourseId === 'ALL' || s.courseId === selectedCourseId;
      return matchCentre && matchCourse;
    });

    let totalMins = 0;
    for (const s of sessions) {
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      totalMins += (eh * 60 + em) - (sh * 60 + sm);
    }

    return {
      ...teacher,
      sessions,
      weeklyHours: Math.round((totalMins / 60) * 10) / 10,
      sessionCount: sessions.length,
      globalHours: teacher.weeklyHours, // preserve global workload for warning flags
    };
  }).filter(teacher => {
    // If filters are active, only show teachers with active filtered classes
    if (selectedCentreId === 'ALL' && selectedCourseId === 'ALL') {
      return true;
    }
    return teacher.sessionCount > 0;
  });

  // Sorting
  const sorted = [...filteredTeachers].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'hours') return b.weeklyHours - a.weeklyHours;
    return b.sessionCount - a.sessionCount;
  });

  // KPI Calculations
  const totalHours = filteredTeachers.reduce((sum, t) => sum + t.weeklyHours, 0);
  const totalSessions = filteredTeachers.reduce((sum, t) => sum + t.sessionCount, 0);
  const averageHours = filteredTeachers.length > 0 ? Math.round((totalHours / filteredTeachers.length) * 10) / 10 : 0;
  
  // Teachers overloaded GLOBALLY
  const overloadedGlobally = data?.teachers.filter(t => t.weeklyHours > MAX_HOURS_WARNING) ?? [];
  // Teachers overloaded among the currently visible subset (using their global workload check)
  const overloadedVisible = filteredTeachers.filter(t => t.globalHours > MAX_HOURS_WARNING);

  const weekLabel = data?.weekStart
    ? new Date(data.weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : '—';

  const handleExportReport = () => {
    let url = '/api/reports?format=csv';
    if (selectedCentreId !== 'ALL') url += `&centreId=${selectedCentreId}`;
    if (selectedCourseId !== 'ALL') url += `&courseId=${selectedCourseId}`;
    if (data?.weekStart) url += `&startDate=${data.weekStart}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Quick Filters Card */}
      <div className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in"
           style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Workforce Filters</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Centre Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Centre:</span>
            <select
              value={selectedCentreId}
              onChange={e => setSelectedCentreId(e.target.value)}
              className="field py-1 px-3 text-xs w-44"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
            >
              <option value="ALL">All Centres</option>
              {centres?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Course Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Course:</span>
            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="field py-1 px-3 text-xs w-44"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
            >
              <option value="ALL">All Courses</option>
              {courses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Reset Filters */}
          {(selectedCentreId !== 'ALL' || selectedCourseId !== 'ALL') && (
            <button
              onClick={() => { setSelectedCentreId('ALL'); setSelectedCourseId('ALL'); }}
              className="btn-ghost py-1 px-3 text-xs flex items-center gap-1"
            >
              Reset
            </button>
          )}
          
          <div className="h-6 w-px bg-gray-800 hidden md:block" />

          {/* Export Report Button */}
          <button
            onClick={handleExportReport}
            className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 font-semibold"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary) 0%, #4f46e5 100%)', border: 'none' }}
          >
            <Download className="w-3.5 h-3.5" />
            Export Workforce Report
          </button>
        </div>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Users className="w-5 h-5" />, label: 'Active Teachers', value: isLoading ? '—' : filteredTeachers.length, color: '#6366f1' },
          { icon: <Clock className="w-5 h-5" />, label: 'Filtered Workload', value: isLoading ? '—' : `${Math.round(totalHours)}h`, color: '#34d399' },
          { icon: <BookOpen className="w-5 h-5" />, label: 'Sessions Count', value: isLoading ? '—' : totalSessions, color: '#a78bfa' },
          { icon: <AlertTriangle className="w-5 h-5" />, label: 'Overloaded (Global)', value: isLoading ? '—' : overloadedVisible.length, color: overloadedVisible.length > 0 ? '#f87171' : '#6b7280' },
        ].map(kpi => (
          <div key={kpi.label} className="card p-4 flex items-start gap-3" style={{ background: 'var(--bg-surface)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: `${kpi.color}18`, color: kpi.color }}>
              {kpi.icon}
            </div>
            <div>
              {isLoading ? <div className="skeleton w-10 h-6 rounded mb-1" /> : (
                <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{kpi.value}</div>
              )}
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Workload / Allocation Summary Text */}
      {!isLoading && (
        <div className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
          Showing workforce allocation. Average workload: <strong>{averageHours}h/week</strong> per active teacher in the selected view.
        </div>
      )}

      {/* Overload warning */}
      {overloadedVisible.length > 0 && (
        <div className="rounded-xl p-3 flex items-center gap-2 animate-fade-in"
             style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#f87171' }} />
          <p className="text-sm" style={{ color: '#fca5a5' }}>
            <strong>{overloadedVisible.map(t => t.name.split(' ')[0]).join(', ')}</strong>
            {overloadedVisible.length === 1 ? ' is' : ' are'} exceeding the {MAX_HOURS_WARNING}h global weekly limit. Ensure workforce balances are maintained.
          </p>
        </div>
      )}

      {/* Sort controls & Teacher rows */}
      <div className="card overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b"
             style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
            <h3 className="heading-md">Teacher Workload List</h3>
            <span className="label text-xs ml-1">week of {weekLabel}</span>
          </div>
          <div className="flex gap-1">
            {(['hours', 'sessions', 'name'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                      style={sortBy === s
                        ? { background: 'var(--brand-primary)', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Teacher rows */}
        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton mx-4 my-3 h-14 rounded-xl" />)
            : sorted.map(teacher => {
                const pct = Math.min((teacher.weeklyHours / MAX_HOURS_WARNING) * 100, 100);
                const isOverGlobal = teacher.globalHours > MAX_HOURS_WARNING;
                const isOverFiltered = teacher.weeklyHours > MAX_HOURS_WARNING;
                const barColor = isOverFiltered ? '#f87171' : teacher.weeklyHours > 15 ? '#fbbf24' : '#34d399';
                const isExpanded = expandedId === teacher.id;

                const hasFilters = selectedCentreId !== 'ALL' || selectedCourseId !== 'ALL';

                return (
                  <div key={teacher.id}>
                    <button
                      className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => setExpandedId(isExpanded ? null : teacher.id)}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                           style={{ background: isOverGlobal ? 'rgba(248,113,113,0.15)' : 'rgba(99,102,241,0.15)', color: isOverGlobal ? '#f87171' : 'var(--brand-primary)' }}>
                        {teacher.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Name + contact */}
                      <div className="flex-shrink-0 w-36">
                        <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{teacher.name}</div>
                        {teacher.email && <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{teacher.email}</div>}
                      </div>

                      {/* Hours bar */}
                      <div className="flex-1 hidden sm:block">
                        <div className="flex items-center gap-2 mb-1 justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold" style={{ color: isOverFiltered ? '#f87171' : 'var(--text-primary)' }}>
                              {teacher.weeklyHours}h
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              / {teacher.sessionCount} session{teacher.sessionCount !== 1 ? 's' : ''}
                            </span>
                            {isOverFiltered && <span className="text-xs font-semibold" style={{ color: '#f87171' }}>⚠ Over view-limit</span>}
                          </div>
                          {hasFilters && (
                            <span className="text-xs px-2 py-0.5 rounded-full" 
                                  style={{ 
                                    background: isOverGlobal ? 'rgba(248,113,113,0.10)' : 'rgba(255,255,255,0.05)', 
                                    color: isOverGlobal ? '#fca5a5' : 'var(--text-secondary)',
                                    border: isOverGlobal ? '1px solid rgba(248,113,113,0.20)' : '1px solid var(--border-subtle)'
                                  }}>
                              Global workload: <strong>{teacher.globalHours}h</strong>
                            </span>
                          )}
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-full rounded-full transition-all duration-500"
                               style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                      </div>

                      {/* Session count (mobile) */}
                      <div className="sm:hidden text-right">
                        <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{teacher.weeklyHours}h</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{teacher.sessionCount} sess.</div>
                      </div>

                      <div className="ml-2 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </button>

                    {/* Expanded sessions */}
                    {isExpanded && (
                      <div className="px-5 pb-4 border-t animate-fade-in" style={{ borderColor: 'var(--border-subtle)', background: 'rgba(255,255,255,0.01)' }}>
                        {teacher.sessions.length === 0 ? (
                          <p className="muted text-sm py-4 text-center">No matching sessions this week</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {teacher.sessions.map(session => {
                              const status = getSessionStatus(session.date, session.startTime, session.endTime);
                              const dot: Record<string, string> = { PLANNING: '#fbbf24', ON_GOING: '#34d399', FINISHED: '#6b7280' };
                              return (
                                <div key={session.id} className="flex items-center gap-3 p-3 rounded-xl"
                                     style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot[status] }} />
                                  <div className="w-24 text-xs font-mono flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                                    {new Date(session.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
                                  </div>
                                  <div className="w-20 text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                                    {session.startTime}–{session.endTime}
                                  </div>
                                  <div className="flex-1 text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{session.className}</div>
                                  <div className="text-xs hidden md:block" style={{ color: 'var(--text-muted)' }}>{session.room.name}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
          }
          {!isLoading && sorted.length === 0 && (
            <div className="text-center py-12 muted" style={{ color: 'var(--text-muted)' }}>No teachers match the current filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
