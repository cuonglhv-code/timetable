'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard, CalendarDays, Table2, Settings2,
  Users, LogOut, User, BookOpen, ChevronDown,
} from 'lucide-react';
import { WeekView } from '@/components/timetable/week-view';
import { MonthView } from '@/components/timetable/month-view';
import { ManagementPanel } from '@/components/timetable/management-panel';
import { FilterBar } from '@/components/timetable/filter-bar';
import { UserManagementPanel } from '@/components/timetable/user-management-panel';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { TeacherWorkloadView } from '@/components/dashboard/teacher-workload-view';
import { GlobalSearch } from '@/components/ui/global-search';
import { NotificationsMenu } from '@/components/ui/notifications-menu';
import type { FilterOptions } from '@/types';

type ViewType = 'dashboard' | 'week' | 'month' | 'teachers' | 'manage' | 'users';

interface TimetableAppProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    centreId: string | null;
    teacherId: string | null;
  };
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  CENTRAL_ADMIN:      { label: 'Admin',      color: '#f59e0b' },
  CENTRE_MANAGER:     { label: 'Manager',    color: '#6366f1' },
  ACADEMIC_SUPERVISOR:{ label: 'Supervisor', color: '#22d3ee' },
  TEACHER:            { label: 'Teacher',    color: '#34d399' },
};

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
  roleRequired?: string[];
}

export function TimetableApp({ user }: TimetableAppProps) {
  const [activeView, setActiveView] = useState<ViewType>(
    user.role === 'TEACHER' ? 'week' : 'dashboard'
  );
  const [filters, setFilters] = useState<FilterOptions>({});
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const roleInfo = ROLE_LABELS[user.role] ?? { label: user.role, color: '#8b949e' };

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, roleRequired: ['CENTRAL_ADMIN', 'CENTRE_MANAGER', 'ACADEMIC_SUPERVISOR'] },
    { id: 'week',      label: 'Week',      icon: <Table2 className="w-4 h-4" /> },
    { id: 'month',     label: 'Month',     icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'teachers',  label: 'Teachers',  icon: <Users className="w-4 h-4" />, roleRequired: ['CENTRAL_ADMIN', 'CENTRE_MANAGER', 'ACADEMIC_SUPERVISOR'] },
    { id: 'manage',    label: 'Manage',    icon: <Settings2 className="w-4 h-4" />, roleRequired: ['CENTRAL_ADMIN', 'CENTRE_MANAGER', 'ACADEMIC_SUPERVISOR'] },
    { id: 'users',     label: 'Users',     icon: <Users className="w-4 h-4" />, roleRequired: ['CENTRAL_ADMIN'] },
  ];

  const visibleNav = navItems.filter(item =>
    !item.roleRequired || item.roleRequired.includes(user.role)
  );

  const showFilters = activeView === 'week' || activeView === 'month';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-app)' }}>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b"
              style={{ background: 'rgba(13,17,23,0.85)', backdropFilter: 'blur(20px)', borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                   style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Jaxtina</span>
                <span className="text-sm ml-1.5 hidden sm:inline" style={{ color: 'var(--text-muted)' }}>Timetable</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {visibleNav.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeView === item.id
                      ? 'text-white'
                      : 'hover:bg-white/5'
                  }`}
                  style={activeView === item.id
                    ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(79,70,229,0.15))', color: '#a5b4fc', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }
                    : { color: 'var(--text-secondary)' }
                  }
                >
                  {item.icon}
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Global Search */}
            <GlobalSearch onNavigate={setActiveView} />

            {/* In-app Notifications */}
            <NotificationsMenu />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg glass-hover transition-all"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                     style={{ background: `${roleInfo.color}22`, color: roleInfo.color, border: `1px solid ${roleInfo.color}44` }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {user.name.split(' ').slice(-1)[0]}
                  </div>
                  <div className="text-xs leading-tight" style={{ color: roleInfo.color }}>
                    {roleInfo.label}
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                             style={{ color: 'var(--text-muted)' }} />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 z-50 py-1 rounded-xl shadow-2xl"
                       style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                    <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{user.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{user.email}</div>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors"
                        style={{ color: '#f87171' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6">
        {showFilters && (
          <div className="mb-5">
            <FilterBar filters={filters} onFilterChange={setFilters} />
          </div>
        )}

        <div className="animate-fade-up">
          {activeView === 'dashboard' && <DashboardView user={user} onNavigate={setActiveView} />}
          {activeView === 'week'      && <WeekView filters={filters} />}
          {activeView === 'month'     && <MonthView filters={filters} />}
          {activeView === 'teachers'  && <TeacherWorkloadView />}
          {activeView === 'manage'    && <ManagementPanel />}
          {activeView === 'users'     && <UserManagementPanel />}
        </div>
      </main>
    </div>
  );
}
