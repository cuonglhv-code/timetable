'use client';

import { LayoutDashboard, Calendar, TrendingUp, Users, Zap, ArrowRight } from 'lucide-react';

interface DashboardViewProps {
  user: { id: string; name: string; email: string; role: string; centreId: string | null; teacherId: string | null };
  onNavigate: (view: 'dashboard' | 'week' | 'month' | 'manage' | 'users') => void;
}

export function DashboardView({ user, onNavigate }: DashboardViewProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user.name.split(' ')[0];

  return (
    <div className="space-y-8 stagger">
      {/* Welcome */}
      <div className="animate-fade-in">
        <h2 className="heading-xl mb-1">{greeting}, {firstName} 👋</h2>
        <p className="muted">Here's an overview of your timetable system.</p>
      </div>

      {/* KPI Cards — placeholders, wired in Sprint 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        {[
          { icon: <Calendar className="w-5 h-5" />, label: 'Sessions This Week', value: '—', color: '#6366f1' },
          { icon: <Users className="w-5 h-5" />,   label: 'Active Teachers',     value: '—', color: '#34d399' },
          { icon: <Zap className="w-5 h-5" />,      label: 'On Going Now',        value: '—', color: '#fbbf24' },
          { icon: <TrendingUp className="w-5 h-5" />,label: 'Upcoming (24h)',     value: '—', color: '#a78bfa' },
        ].map(kpi => (
          <div key={kpi.label} className="card p-5 flex items-start gap-4"
               style={{ background: 'var(--bg-surface)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: `${kpi.color}18`, color: kpi.color }}>
              {kpi.icon}
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{kpi.value}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="animate-fade-in">
        <h3 className="heading-md mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'View This Week',     desc: 'See all sessions on the weekly grid',   icon: <Calendar className="w-5 h-5" />,    view: 'week' as const,   color: '#6366f1' },
            { label: 'Monthly Overview',   desc: 'Browse sessions on the monthly calendar', icon: <LayoutDashboard className="w-5 h-5" />, view: 'month' as const, color: '#34d399' },
            { label: 'Manage Resources',   desc: 'Centres, rooms, courses, teachers',      icon: <Users className="w-5 h-5" />,       view: 'manage' as const, color: '#f59e0b' },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.view)}
              className="card p-5 text-left group transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = `${action.color}44`)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                   style={{ background: `${action.color}18`, color: action.color }}>
                {action.icon}
              </div>
              <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{action.label}</div>
              <div className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{action.desc}</div>
              <div className="flex items-center gap-1 text-xs font-medium group-hover:gap-2 transition-all"
                   style={{ color: action.color }}>
                Open <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Coming soon notice */}
      <div className="rounded-xl p-4 flex items-center gap-3 animate-fade-in"
           style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)' }}>
        <Zap className="w-4 h-4 flex-shrink-0" style={{ color: '#6366f1' }} />
        <p className="text-sm" style={{ color: '#a5b4fc' }}>
          <strong>Coming soon:</strong> Live KPI stats, today's session strip, conflict alerts, and activity feed — all powered by real-time data.
        </p>
      </div>
    </div>
  );
}
