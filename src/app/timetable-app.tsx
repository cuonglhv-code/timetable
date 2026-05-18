'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { CalendarDays, Table2, Settings2, Users, LogOut, User } from 'lucide-react';
import { WeekView } from '@/components/timetable/week-view';
import { MonthView } from '@/components/timetable/month-view';
import { ManagementPanel } from '@/components/timetable/management-panel';
import { FilterBar } from '@/components/timetable/filter-bar';
import { UserManagementPanel } from '@/components/timetable/user-management-panel';
import type { FilterOptions } from '@/types';

type ViewType = 'week' | 'month' | 'manage' | 'users';

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

const ROLE_LABELS: Record<string, string> = {
  CENTRAL_ADMIN: 'Admin',
  CENTRE_MANAGER: 'Manager',
  ACADEMIC_SUPERVISOR: 'Supervisor',
  TEACHER: 'Teacher',
};

export function TimetableApp({ user }: TimetableAppProps) {
  const [activeView, setActiveView] = useState<ViewType>(
    user.role === 'TEACHER' ? 'week' : 'manage'
  );
  const [filters, setFilters] = useState<FilterOptions>({});

  const canManage = user.role !== 'TEACHER';
  const canManageUsers = user.role === 'CENTRAL_ADMIN';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">Timetable Manager</h1>
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </div>

            <nav className="flex items-center gap-1">
              <ViewButton
                icon={<Table2 className="w-4 h-4" />}
                label="Week"
                active={activeView === 'week'}
                onClick={() => setActiveView('week')}
              />
              <ViewButton
                icon={<CalendarDays className="w-4 h-4" />}
                label="Month"
                active={activeView === 'month'}
                onClick={() => setActiveView('month')}
              />
              {canManage && (
                <ViewButton
                  icon={<Settings2 className="w-4 h-4" />}
                  label="Manage"
                  active={activeView === 'manage'}
                  onClick={() => setActiveView('manage')}
                />
              )}
              {canManageUsers && (
                <ViewButton
                  icon={<Users className="w-4 h-4" />}
                  label="Users"
                  active={activeView === 'users'}
                  onClick={() => setActiveView('users')}
                />
              )}

              <div className="ml-2 flex items-center gap-2 pl-2 border-l border-gray-200">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  {user.name}
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeView !== 'manage' && activeView !== 'users' && (
          <FilterBar filters={filters} onFilterChange={setFilters} />
        )}

        <div className="mt-4">
          {activeView === 'week' && <WeekView filters={filters} />}
          {activeView === 'month' && <MonthView filters={filters} />}
          {activeView === 'manage' && canManage && <ManagementPanel />}
          {activeView === 'users' && canManageUsers && <UserManagementPanel />}
        </div>
      </main>
    </div>
  );
}

interface ViewButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function ViewButton({ icon, label, active, onClick }: ViewButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
