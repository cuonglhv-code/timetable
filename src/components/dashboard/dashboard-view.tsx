'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Calendar, Users, Zap, TrendingUp, ArrowRight, Clock,
  AlertTriangle, Activity, Building2, BookOpen, CheckCircle,
} from 'lucide-react';
import { getSessionStatus, formatUTCShort } from '@/lib/utils';
import { useLanguage } from '@/providers/language-provider';
import type { ClassSessionWithRelations } from '@/types';

interface DashboardData {
  kpi: { weekSessions: number; activeTeachers: number; onGoing: number; upcoming24h: number };
  todaySessions: ClassSessionWithRelations[];
  recentSessions: ClassSessionWithRelations[];
}

interface DashboardViewProps {
  user: { id: string; name: string; email: string; role: string; centreId: string | null; teacherId: string | null };
  onNavigate: (view: 'dashboard' | 'week' | 'month' | 'manage' | 'users') => void;
}

export function DashboardView({ user, onNavigate }: DashboardViewProps) {
  const { tr, lang } = useLanguage();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? tr('dash_greeting_morning') : hour < 17 ? tr('dash_greeting_afternoon') : tr('dash_greeting_evening');
  const firstName = user.name.split(' ')[0];

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to load dashboard');
      return res.json();
    },
    refetchInterval: 60_000, // auto-refresh every 60s
  });

  const onGoingSessions = data?.todaySessions.filter(s =>
    getSessionStatus(s.date, s.startTime, s.endTime) === 'ON_GOING'
  ) ?? [];

  const kpis = [
    {
      icon: <Calendar className="w-5 h-5" />,
      label: tr('dash_kpi_week'),
      value: data?.kpi.weekSessions ?? '—',
      color: '#e8a020',
      onClick: () => onNavigate('week'),
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: tr('dash_kpi_teachers'),
      value: data?.kpi.activeTeachers ?? '—',
      color: '#2dd4bf',
      onClick: () => onNavigate('manage'),
    },
    {
      icon: <Zap className="w-5 h-5" />,
      label: tr('dash_kpi_ongoing'),
      value: data?.kpi.onGoing ?? '—',
      color: '#f5c842',
      pulse: (data?.kpi.onGoing ?? 0) > 0,
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: tr('dash_kpi_upcoming'),
      value: data?.kpi.upcoming24h ?? '—',
      color: '#86efac',
      onClick: () => onNavigate('week'),
    },
  ];

  return (
    <div className="space-y-8">

      {/* Welcome */}
      <div className="animate-fade-in">
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
          {greeting}, <span style={{ color: 'var(--text-accent)' }}>{firstName}</span> 👋
        </h2>
        <p className="muted" style={{ fontSize: '0.72rem', letterSpacing: '0.04em', marginTop: '0.4rem' }}>
          {new Date().toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* On going alert banner */}
      {onGoingSessions.length > 0 && (
        <div className="rounded-xl p-4 flex items-center gap-3 animate-fade-in animate-pulse-glow"
             style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.30)' }}>
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
          <div className="flex-1">
            <span className="text-sm font-semibold" style={{ color: '#34d399' }}>
              {onGoingSessions.length} {lang === 'vi' ? 'buổi học đang diễn ra' : `session${onGoingSessions.length > 1 ? 's' : ''} on going right now`}
            </span>
            <span className="text-sm ml-2" style={{ color: 'var(--text-secondary)' }}>
              {onGoingSessions.map(s => s.className).join(' · ')}
            </span>
          </div>
          <button onClick={() => onNavigate('week')} className="btn-ghost py-1.5 px-3 text-xs"
                  style={{ color: '#34d399', borderColor: 'rgba(52,211,153,0.3)' }}>
            {tr('dash_view_week')} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        {kpis.map(kpi => (
          <div key={kpi.label}
               onClick={kpi.onClick}
               className={`card p-5 flex items-start gap-4 animate-fade-in ${kpi.onClick ? 'cursor-pointer' : ''}`}
               style={{ background: 'var(--bg-surface)', transition: 'border-color 0.2s' }}
               onMouseEnter={e => kpi.onClick && (e.currentTarget.style.borderColor = `${kpi.color}44`)}
               onMouseLeave={e => kpi.onClick && (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.pulse ? 'animate-pulse-glow' : ''}`}
                 style={{ background: `${kpi.color}18`, color: kpi.color }}>
              {kpi.icon}
            </div>
            <div>
              {isLoading
                ? <div className="skeleton w-12 h-7 rounded mb-1" />
                : <div className="text-2xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{kpi.value}</div>
              }
              <div className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Today's Session Strip */}
        <div className="lg:col-span-3 card overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b"
               style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
              <h3 className="heading-md">{tr('dash_today')}</h3>
            </div>
            <button onClick={() => onNavigate('week')} className="btn-ghost py-1.5 px-3 text-xs">
              {tr('week_next')} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)
              : data?.todaySessions.length === 0
                ? (
                  <div className="text-center py-10">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                    <p className="muted text-sm">{tr('dash_no_sessions')}</p>
                  </div>
                )
                : data?.todaySessions.map(session => {
                    const status = getSessionStatus(session.date, session.startTime, session.endTime);
                    const dot: Record<string, string> = {
                      PLANNING: '#fbbf24', ON_GOING: '#34d399', FINISHED: '#6b7280',
                    };
                    const bg: Record<string, string> = {
                      PLANNING: 'rgba(251,191,36,0.07)', ON_GOING: 'rgba(52,211,153,0.07)', FINISHED: 'transparent',
                    };
                    return (
                      <div key={session.id} className="flex items-center gap-3 px-3 py-3 rounded-xl"
                           style={{ background: bg[status], border: '1px solid var(--border-subtle)' }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot[status] }} />
                        <div className="w-20 text-xs font-mono flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                          {session.startTime}–{session.endTime}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{session.className}</div>
                          <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                            {session.teacher.name} · {session.room.name}
                          </div>
                        </div>
                        <div className="text-xs flex-shrink-0 hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                          {session.centre.name.replace('Jaxtina-', '')}
                        </div>
                      </div>
                    );
                  })
            }
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 card overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
          <div className="flex items-center gap-2 px-5 py-4 border-b"
               style={{ borderColor: 'var(--border-subtle)' }}>
            <Activity className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
            <h3 className="heading-md">{tr('dash_recent')}</h3>
          </div>
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)
              : data?.recentSessions.length === 0
                ? <p className="muted text-sm text-center py-10">No sessions yet</p>
                : data?.recentSessions.map(session => (
                  <div key={session.id} className="flex items-start gap-3 p-3 rounded-xl transition-colors"
                       style={{ border: '1px solid transparent' }}
                       onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                       onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                         style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--brand-primary)' }}>
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{session.className}</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {formatUTCShort(session.date)}
                        {' · '}{session.startTime} · {session.centre.name.replace('Jaxtina-', '')}
                      </div>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="heading-md mb-4">{tr('dash_quick_actions')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 stagger">
          {[
            { labelKey: 'nav_week'   as const, desc: lang === 'vi' ? 'Xem và quản lý lịch học trong tuần' : 'View and manage the weekly grid',       icon: <Calendar className="w-5 h-5" />,   view: 'week'   as const, color: '#e8a020' },
            { labelKey: 'nav_month'  as const, desc: lang === 'vi' ? 'Xem lịch tổng quan theo tháng'        : 'Monthly calendar view of all sessions',  icon: <TrendingUp className="w-5 h-5" />, view: 'month'  as const, color: '#2dd4bf' },
            { labelKey: 'nav_manage' as const, desc: lang === 'vi' ? 'Cơ sở, phòng học, khoá học & giáo viên' : 'Centres, rooms, courses & teachers',    icon: <Building2 className="w-5 h-5" />,  view: 'manage' as const, color: '#f5c842' },
          ].map(a => (
            <button key={a.labelKey} onClick={() => onNavigate(a.view)}
                    className="card p-5 text-left group transition-all duration-200 hover:-translate-y-0.5 animate-fade-in"
                    style={{ background: 'var(--bg-surface)' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = `${a.color}44`)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                   style={{ background: `${a.color}18`, color: a.color }}>
                {a.icon}
              </div>
              <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{tr(a.labelKey)}</div>
              <div className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{a.desc}</div>
              <div className="flex items-center gap-1 text-xs font-medium group-hover:gap-2 transition-all"
                   style={{ color: a.color }}>
                {lang === 'vi' ? 'Mở' : 'Open'} <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
