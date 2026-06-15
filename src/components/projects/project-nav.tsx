'use client';

import { useState } from 'react';
import { Star, ChevronDown, Share2, SlidersHorizontal, Plus, Grid, List, Table, User, BarChart2 } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import type { Project } from '@/hooks/use-projects';
import { useUpdateProject } from '@/hooks/use-projects';
import { useToast } from '@/components/ui/toast';

interface ProjectNavProps {
  project: Project;
  projects: Project[] | undefined;
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: { id: string; role: string };
}

const STATUS_OPTIONS = [
  { value: 'On track', label: 'On track', viLabel: 'Đúng tiến độ', color: '#22c55e' },
  { value: 'At risk', label: 'At risk', viLabel: 'Có rủi ro', color: '#f59e0b' },
  { value: 'Off track', label: 'Off track', viLabel: 'Trễ tiến độ', color: '#ef4444' },
];

export function ProjectNav({
  project,
  projects,
  selectedProjectId,
  onSelectProject,
  activeTab,
  onTabChange,
  user,
}: ProjectNavProps) {
  const { lang, tr } = useLanguage();
  const { success, error: toastError } = useToast();
  const updateProject = useUpdateProject();

  const isWriteUser = user.role !== 'TEACHER';
  const isRequests = project.type === 'REQUESTS';

  const [showAddViewMenu, setShowAddViewMenu] = useState(false);

  const handleToggleFavorite = async () => {
    if (!isWriteUser) return;
    try {
      await updateProject.mutateAsync({
        id: project.id,
        data: { isFavorited: !project.isFavorited },
      });
      success(tr('common_success'), tr('common_updated'));
    } catch (err: unknown) {
      toastError(tr('common_failed'), err instanceof Error ? err.message : String(err));
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!isWriteUser) return;
    try {
      await updateProject.mutateAsync({
        id: project.id,
        data: { status: status || null },
      });
      success(tr('common_success'), tr('common_updated'));
    } catch (err: unknown) {
      toastError(tr('common_failed'), err instanceof Error ? err.message : String(err));
    }
  };

  // Find status color
  const activeStatus = STATUS_OPTIONS.find(o => o.value === project.status);
  const statusColor = activeStatus ? activeStatus.color : 'var(--text-muted)';

  // View Options for [+] menu
  const VIEW_OPTIONS = [
    'List', 'Board', 'Gantt', 'Calendar', 'Timeline', 'Note', 
    'Overview', 'Dashboard', 'Workload', 'Files', 'Messages', 'Workflow'
  ];

  return (
    <div
      className="flex flex-col border rounded-xl flex-shrink-0"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      {/* ── Row 1: Project Metadata & Actions ──────────────── */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          {/* Project Type Icon Badge */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{
              background: 'rgba(232, 160, 32, 0.1)',
              borderColor: 'rgba(232, 160, 32, 0.25)',
              color: 'var(--brand-primary)',
            }}
          >
            {isRequests ? (
              <Table className="w-4 h-4" />
            ) : (
              <Grid className="w-4 h-4" />
            )}
          </div>

          {/* Project Name dropdown */}
          <div className="relative min-w-0">
            <select
              value={selectedProjectId}
              onChange={e => onSelectProject(e.target.value)}
              className="field pr-8 font-semibold text-sm max-w-[240px] appearance-none"
              style={{ minWidth: '180px', border: '1px solid var(--border-default)', background: 'var(--bg-app)' }}
            >
              {projects?.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          </div>

          {/* Star favorite toggle (D7: hidden for TEACHER) */}
          {isWriteUser && (
            <button
              onClick={handleToggleFavorite}
              className="btn-ghost p-2 rounded-lg transition-all"
              style={{ color: project.isFavorited ? '#f59e0b' : 'var(--text-muted)' }}
              title={lang === 'vi' ? 'Yêu thích' : 'Favorite'}
            >
              <Star className="w-4 h-4" fill={project.isFavorited ? '#f59e0b' : 'none'} />
            </button>
          )}

          {/* Status pill (D7: hidden for TEACHER) */}
          {isWriteUser && (
            <div className="relative flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: statusColor }}
              />
              <select
                value={project.status ?? ''}
                onChange={e => handleStatusChange(e.target.value)}
                className="field text-xs py-1 px-3 pr-8 appearance-none"
                style={{ border: '1px solid var(--border-default)', background: 'var(--bg-app)' }}
              >
                <option value="">{tr('project_set_status')}</option>
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {lang === 'vi' ? o.viLabel : o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            </div>
          )}
        </div>

        {/* Share & Customize Controls (D7: hidden for TEACHER) */}
        {isWriteUser && (
          <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-auto">
            <button
              className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5 border"
              style={{ borderColor: 'var(--border-default)' }}
            >
              <Share2 className="w-3.5 h-3.5" />
              {lang === 'vi' ? 'Chia sẻ' : 'Share'}
            </button>
            <button
              className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5 border"
              style={{ borderColor: 'var(--border-default)' }}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {lang === 'vi' ? 'Tùy chỉnh' : 'Customize'}
            </button>
          </div>
        )}
      </div>

      {/* ── Row 2: View Switching Tabs ────────────────────── */}
      <div
        className="flex items-center justify-between px-4 overflow-x-auto select-none"
        style={{ background: 'var(--bg-app)' }}
      >
        <div className="flex items-center gap-1">
          {/* TAB 1: Dashboard */}
          <button
            onClick={() => onTabChange('DASHBOARD')}
            className={`nav-link text-xs font-semibold py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'DASHBOARD'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-muted hover:text-primary'
            }`}
            style={{ color: activeTab === 'DASHBOARD' ? 'var(--brand-primary)' : 'var(--text-muted)' }}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            {tr('project_dashboard')}
          </button>

          {/* TAB 2: Board */}
          <button
            onClick={() => onTabChange('BOARD')}
            className={`nav-link text-xs font-semibold py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'BOARD'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-muted hover:text-primary'
            }`}
            style={{ color: activeTab === 'BOARD' ? 'var(--brand-primary)' : 'var(--text-muted)' }}
          >
            <Grid className="w-3.5 h-3.5" />
            {lang === 'vi' ? 'Bảng' : 'Board'}
          </button>

          {/* TAB 3: Planning / All Requests */}
          <button
            onClick={() => onTabChange(isRequests ? 'ALL_REQUESTS' : 'PLANNING')}
            className={`nav-link text-xs font-semibold py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'PLANNING' || activeTab === 'ALL_REQUESTS'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-muted hover:text-primary'
            }`}
            style={{
              color:
                activeTab === 'PLANNING' || activeTab === 'ALL_REQUESTS'
                  ? 'var(--brand-primary)'
                  : 'var(--text-muted)',
            }}
          >
            {isRequests ? (
              <>
                <List className="w-3.5 h-3.5" />
                {tr('project_all_requests')}
              </>
            ) : (
              <>
                <Table className="w-3.5 h-3.5" />
                {tr('project_planning')}
              </>
            )}
          </button>

          {/* TAB 4: My Tasks / My Requests */}
          <button
            onClick={() => onTabChange(isRequests ? 'MY_REQUESTS' : 'MY_TASKS')}
            className={`nav-link text-xs font-semibold py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'MY_TASKS' || activeTab === 'MY_REQUESTS'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-muted hover:text-primary'
            }`}
            style={{
              color:
                activeTab === 'MY_TASKS' || activeTab === 'MY_REQUESTS'
                  ? 'var(--brand-primary)'
                  : 'var(--text-muted)',
            }}
          >
            <User className="w-3.5 h-3.5" />
            {isRequests ? tr('project_my_requests') : tr('project_my_tasks')}
          </button>
        </div>

        {/* View picker [+] button (D7: hidden for TEACHER) */}
        {isWriteUser && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowAddViewMenu(!showAddViewMenu)}
              className="btn-ghost p-1.5 rounded-full hover:bg-white/5"
              title={lang === 'vi' ? 'Thêm dạng xem' : 'Add view'}
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Stub picker dropdown */}
            {showAddViewMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAddViewMenu(false)} />
                <div
                  className="absolute right-0 mt-1.5 w-48 rounded-xl border shadow-xl z-20 py-2"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {lang === 'vi' ? 'Chọn dạng xem' : 'Choose a view'}
                  </div>
                  {VIEW_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setShowAddViewMenu(false)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
