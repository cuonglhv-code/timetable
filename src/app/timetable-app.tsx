'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard, CalendarDays, Table2, Settings2,
  Users, LogOut, BookOpen, ChevronDown, Kanban, Star, Share2, SlidersHorizontal, Activity, BarChart3
} from 'lucide-react';
import { WeekView } from '@/components/timetable/week-view';
import { MonthView } from '@/components/timetable/month-view';
import { ManagementPanel } from '@/components/timetable/management-panel';
import { FilterBar } from '@/components/timetable/filter-bar';
import { UserManagementPanel } from '@/components/timetable/user-management-panel';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { TeacherWorkloadView } from '@/components/dashboard/teacher-workload-view';
import { AuditLogView } from '@/components/dashboard/audit-log-view';
import { AnalyticsView } from '@/components/dashboard/analytics-view';
import { ClassPlanningView } from '@/components/dashboard/class-planning-view';
import { GlobalSearch } from '@/components/ui/global-search';
import { NotificationsMenu } from '@/components/ui/notifications-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { useLanguage } from '@/providers/language-provider';
import type { FilterOptions } from '@/types';
import { ProjectsContainer } from '@/components/projects/projects-container';

type ViewType = 'dashboard' | 'timetable' | 'projects' | 'settings';

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

const ROLE_COLORS: Record<string, string> = {
  CENTRAL_ADMIN:       '#e8a020',
  CENTRE_MANAGER:      '#2dd4bf',
  ACADEMIC_SUPERVISOR: '#a78bfa',
  TEACHER:             '#86efac',
};

export function TimetableApp({ user }: TimetableAppProps) {
  const { tr, lang } = useLanguage();
  const [activeView, setActiveView] = useState<ViewType>(
    user.role === 'TEACHER' ? 'timetable' : 'dashboard'
  );
  
  // Secondary sub-tab states
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'workload' | 'analytics' | 'class-planning' | 'activity'>('overview');
  const [timetableTab, setTimetableTab] = useState<'week' | 'month'>('week');
  const [settingsTab, setSettingsTab] = useState<'centres' | 'rooms' | 'courses' | 'teachers' | 'users'>('centres');

  const [filters, setFilters] = useState<FilterOptions>({});
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Persistence of star/favorite status for pages (stored in localStorage)
  const [starredPages, setStarredPages] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('timetable_starred_pages');
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        console.error(e);
      }
    }
    return {};
  });

  const toggleStar = (pageKey: string) => {
    setStarredPages(prev => {
      const next = { ...prev, [pageKey]: !prev[pageKey] };
      try {
        localStorage.setItem('timetable_starred_pages', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const roleColor = ROLE_COLORS[user.role] ?? '#8b949e';

  // Nav mapping for search and KPI triggers
  const handleNavigate = (target: string) => {
    if (target === 'dashboard') {
      setActiveView('dashboard');
      setDashboardTab('overview');
    } else if (target === 'week') {
      setActiveView('timetable');
      setTimetableTab('week');
    } else if (target === 'month') {
      setActiveView('timetable');
      setTimetableTab('month');
    } else if (target === 'teachers' || target === 'workload') {
      setActiveView('dashboard');
      setDashboardTab('workload');
    } else if (target === 'manage' || target === 'centres') {
      setActiveView('settings');
      setSettingsTab('centres');
    } else if (target === 'users') {
      setActiveView('settings');
      setSettingsTab('users');
    }
  };

  // Primary navigation tabs
  const navItems = [
    { id: 'dashboard' as ViewType, label: tr('nav_dashboard'), icon: <LayoutDashboard className="w-4 h-4" />, roleRequired: ['CENTRAL_ADMIN', 'CENTRE_MANAGER', 'ACADEMIC_SUPERVISOR'] },
    { id: 'timetable' as ViewType, label: lang === 'vi' ? 'Thời khóa biểu' : 'Timetable', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'projects'  as ViewType, label: tr('nav_projects'),  icon: <Kanban className="w-4 h-4" /> },
    { id: 'settings'  as ViewType, label: lang === 'vi' ? 'Cài đặt' : 'Settings', icon: <Settings2 className="w-4 h-4" />, roleRequired: ['CENTRAL_ADMIN', 'CENTRE_MANAGER', 'ACADEMIC_SUPERVISOR'] },
  ];

  const visibleNav = navItems.filter(item =>
    !item.roleRequired || item.roleRequired.includes(user.role)
  );

  const showFilters = activeView === 'timetable';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-app)' }}>

      {/* ── Top Brand Header ───────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b"
              style={{ background: 'var(--bg-header)', backdropFilter: 'blur(20px)', borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">

            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-md flex-shrink-0"
                   style={{ background: 'var(--brand-primary)', boxShadow: 'var(--shadow-glow)' }}>
                <BookOpen className="w-4 h-4" style={{ color: '#0e0d0b' }} />
              </div>
              <div className="leading-none">
                <span className="font-bold" style={{ color: 'var(--text-primary)', fontSize: '1.05rem' }}>Jaxtina</span>
                <span className="ml-2 hidden sm:inline" style={{ color: 'var(--text-muted)', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Timetable</span>
              </div>
            </div>

            {/* Main Tabs Navigation */}
            <nav className="flex items-center gap-0.5">
              {visibleNav.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold tracking-wider uppercase transition-all duration-200 relative"
                  style={{
                    letterSpacing: '0.08em',
                    color: activeView === item.id ? 'var(--text-accent)' : 'var(--text-secondary)',
                    background: 'transparent',
                    border: 'none',
                  }}
                >
                  {item.icon}
                  <span className="hidden md:inline">{item.label}</span>
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[1.5px] transition-all duration-200"
                    style={{
                      background: 'var(--brand-primary)',
                      transform: activeView === item.id ? 'scaleX(1)' : 'scaleX(0)',
                      transformOrigin: 'left',
                    }}
                  />
                </button>
              ))}
            </nav>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              <GlobalSearch onNavigate={handleNavigate} />
              <NotificationsMenu />
              <LanguageToggle />
              <ThemeToggle />

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg glass-hover transition-all"
                  style={{ border: '1px solid var(--border-subtle)' }}
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                       style={{ background: `${roleColor}22`, color: roleColor, border: `1px solid ${roleColor}44` }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {user.name.split(' ').slice(-1)[0]}
                    </div>
                  </div>
                  <ChevronDown className={`w-3 h-3 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
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
                          onClick={() => signOut({ callbackUrl: '/' })}
                          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors"
                          style={{ color: '#f87171' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <LogOut className="w-4 h-4" />
                          {tr('nav_sign_out')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Asana-Style Page/Project Content Section ──────── */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4">
        
        {/* Render Common Page Header for Dashboard, Timetable, Settings */}
        {activeView !== 'projects' && (
          <div className="flex flex-col border rounded-xl overflow-hidden flex-shrink-0"
               style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            
            {/* Row 1: Section Title, Favorite, Status & Action controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border-b"
                 style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex flex-wrap items-center gap-3 min-w-0">
                <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {activeView === 'dashboard' && (lang === 'vi' ? 'Bảng điều khiển' : 'Dashboard')}
                  {activeView === 'timetable' && (lang === 'vi' ? 'Thời khóa biểu' : 'Timetable')}
                  {activeView === 'settings' && (lang === 'vi' ? 'Cài đặt tài nguyên' : 'Resource Settings')}
                </h1>

                {/* Star icon */}
                <button
                  onClick={() => toggleStar(activeView)}
                  className="btn-ghost p-1.5 rounded-lg transition-all"
                  style={{ color: starredPages[activeView] ? '#f59e0b' : 'var(--text-muted)' }}
                  title="Favorite"
                >
                  <Star className="w-4 h-4" fill={starredPages[activeView] ? '#f59e0b' : 'none'} />
                </button>

                {/* Status Pill */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                     style={{
                       background: 'rgba(52,211,153,0.08)',
                       borderColor: 'rgba(52,211,153,0.20)',
                       color: '#34d399'
                     }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#34d399' }} />
                  <span>{lang === 'vi' ? 'Hoạt động' : 'Active'}</span>
                </div>
              </div>

              {/* Right actions (Share / Customize style buttons) */}
              <div className="flex items-center gap-2 self-end md:self-auto">
                <button className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5 border"
                        style={{ borderColor: 'var(--border-default)' }}>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? 'Chia sẻ' : 'Share'}</span>
                </button>
                <button className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5 border"
                        style={{ borderColor: 'var(--border-default)' }}>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? 'Tùy chỉnh' : 'Customize'}</span>
                </button>
              </div>
            </div>

            {/* Row 2: Secondary tab rails switcher */}
            <div className="flex items-center px-4 overflow-x-auto select-none"
                 style={{ background: 'var(--bg-app)' }}>
              <div className="flex items-center gap-1">
                
                {/* Dashboard Sub-tabs */}
                {activeView === 'dashboard' && (
                  <>
                    <button onClick={() => setDashboardTab('overview')}
                            className={`text-xs font-semibold py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                              dashboardTab === 'overview' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-muted hover:text-primary'
                            }`}
                            style={{ color: dashboardTab === 'overview' ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'Tổng quan' : 'Overview'}</span>
                    </button>
                    <button onClick={() => setDashboardTab('workload')}
                            className={`text-xs font-semibold py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                              dashboardTab === 'workload' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-muted hover:text-primary'
                            }`}
                            style={{ color: dashboardTab === 'workload' ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                      <Users className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'Tải lượng' : 'Workload'}</span>
                    </button>
                    <button onClick={() => setDashboardTab('analytics')}
                            className={`text-xs font-semibold py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                              dashboardTab === 'analytics' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-muted hover:text-primary'
                            }`}
                            style={{ color: dashboardTab === 'analytics' ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>{tr('nav_analytics')}</span>
                    </button>
                    <button onClick={() => setDashboardTab('class-planning')}
                            className={`text-xs font-semibold py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                              dashboardTab === 'class-planning' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-muted hover:text-primary'
                            }`}
                            style={{ color: dashboardTab === 'class-planning' ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>{tr('nav_class_planning')}</span>
                    </button>
                    <button onClick={() => setDashboardTab('activity')}
                            className={`text-xs font-semibold py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                              dashboardTab === 'activity' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-muted hover:text-primary'
                            }`}
                            style={{ color: dashboardTab === 'activity' ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                      <Activity className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'Nhật ký' : 'Activity Logs'}</span>
                    </button>
                  </>
                )}

                {/* Timetable Sub-tabs */}
                {activeView === 'timetable' && (
                  <>
                    <button onClick={() => setTimetableTab('week')}
                            className={`text-xs font-semibold py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                              timetableTab === 'week' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-muted hover:text-primary'
                            }`}
                            style={{ color: timetableTab === 'week' ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                      <Table2 className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'Xem tuần' : 'Week View'}</span>
                    </button>
                    <button onClick={() => setTimetableTab('month')}
                            className={`text-xs font-semibold py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                              timetableTab === 'month' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-muted hover:text-primary'
                            }`}
                            style={{ color: timetableTab === 'month' ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'Xem tháng' : 'Month View'}</span>
                    </button>
                  </>
                )}

                {/* Settings Sub-tabs */}
                {activeView === 'settings' && (
                  <>
                    <button onClick={() => setSettingsTab('centres')}
                            className={`text-xs font-semibold py-3 px-3 border-b-2 transition-all ${
                              settingsTab === 'centres' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-muted hover:text-primary'
                            }`}
                            style={{ color: settingsTab === 'centres' ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                      <span>{tr('mgmt_centres')}</span>
                    </button>
                    <button onClick={() => setSettingsTab('rooms')}
                            className={`text-xs font-semibold py-3 px-3 border-b-2 transition-all ${
                              settingsTab === 'rooms' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-muted hover:text-primary'
                            }`}
                            style={{ color: settingsTab === 'rooms' ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                      <span>{tr('mgmt_rooms')}</span>
                    </button>
                    <button onClick={() => setSettingsTab('courses')}
                            className={`text-xs font-semibold py-3 px-3 border-b-2 transition-all ${
                              settingsTab === 'courses' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-muted hover:text-primary'
                            }`}
                            style={{ color: settingsTab === 'courses' ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                      <span>{tr('mgmt_courses')}</span>
                    </button>
                    <button onClick={() => setSettingsTab('teachers')}
                            className={`text-xs font-semibold py-3 px-3 border-b-2 transition-all ${
                              settingsTab === 'teachers' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-muted hover:text-primary'
                            }`}
                            style={{ color: settingsTab === 'teachers' ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                      <span>{tr('mgmt_teachers')}</span>
                    </button>
                    {user.role === 'CENTRAL_ADMIN' && (
                      <button onClick={() => setSettingsTab('users')}
                              className={`text-xs font-semibold py-3 px-3 border-b-2 transition-all ${
                                settingsTab === 'users' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-muted hover:text-primary'
                              }`}
                              style={{ color: settingsTab === 'users' ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                        <span>{tr('nav_users')}</span>
                      </button>
                    )}
                  </>
                )}

              </div>
            </div>
          </div>
        )}

        {/* ── Sub-view Render Container ───────────────────────── */}
        {showFilters && (
          <div className="flex-shrink-0">
            <FilterBar filters={filters} onFilterChange={setFilters} user={user} />
          </div>
        )}

        <div className="animate-fade-up flex-1 flex flex-col">
          {activeView === 'dashboard' && (
            <>
              {dashboardTab === 'overview' && <DashboardView user={user} onNavigate={handleNavigate} />}
              {dashboardTab === 'workload' && <TeacherWorkloadView />}
              {dashboardTab === 'analytics' && <AnalyticsView user={user} />}
              {dashboardTab === 'class-planning' && <ClassPlanningView user={user} />}
              {dashboardTab === 'activity' && <AuditLogView />}
            </>
          )}

          {activeView === 'timetable' && (
            <>
              {timetableTab === 'week'  && <WeekView filters={filters} user={user} />}
              {timetableTab === 'month' && <MonthView filters={filters} user={user} />}
            </>
          )}

          {activeView === 'projects' && <ProjectsContainer user={user} />}

          {activeView === 'settings' && (
            <>
              {settingsTab === 'users' ? (
                <UserManagementPanel />
              ) : (
                <ManagementPanel activeTab={settingsTab} showTabsNav={false} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
