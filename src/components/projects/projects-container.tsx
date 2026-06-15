'use client';

import { useState } from 'react';
import { Plus, Trash2, Kanban, X, Grid, Table } from 'lucide-react';
import {
  useProjects, useProject, useCreateProject, useDeleteProject,
} from '@/hooks/use-projects';
import { useCentres } from '@/hooks/use-centres';
import { useLanguage } from '@/providers/language-provider';
import { useToast } from '@/components/ui/toast';
import { ProjectNav } from './project-nav';
import { BoardView } from './board-view';
import { PlanningView } from './planning-view';
import { AllRequestsView } from './all-requests-view';
import { MyTasksView } from './my-tasks-view';
import { MyRequestsView } from './my-requests-view';
import { DashboardView } from './dashboard-view';

interface ProjectsContainerProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    centreId: string | null;
    teacherId: string | null;
  };
}

export function ProjectsContainer({ user }: ProjectsContainerProps) {
  const { tr, lang } = useLanguage();
  const { success, error: toastError } = useToast();

  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: centres } = useCentres();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showAddProject, setShowAddProject] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');

  // Project creation form state
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjCentre, setNewProjCentre] = useState('');
  const [newProjType, setNewProjType] = useState<'KANBAN' | 'REQUESTS'>('KANBAN');

  const effectiveProjectId = selectedProjectId || (projects?.[0]?.id ?? '');
  const activeProjectQuery = useProject(effectiveProjectId);
  const activeProject = activeProjectQuery.data;

  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const isWriteUser = user.role !== 'TEACHER';

  /* ── Handlers ─────────────────────────────────────────────── */
  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveTab('DASHBOARD'); // Reset to default view tab on switch
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    try {
      const result = await createProject.mutateAsync({
        name:        newProjName.trim(),
        description: newProjDesc.trim() || null,
        defaultView: 'BOARD',
        type:        newProjType,
        centreId:    newProjCentre || null,
      });
      success(tr('common_success'), tr('project_save_success'));
      handleSelectProject(result.id);
      setShowAddProject(false);
      setNewProjName('');
      setNewProjDesc('');
      setNewProjCentre('');
      setNewProjType('KANBAN');
    } catch (err: unknown) {
      toastError(tr('common_failed'), err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteProject = async () => {
    if (!activeProject) return;
    if (!window.confirm(tr('project_delete_confirm'))) return;
    try {
      await deleteProject.mutateAsync(activeProject.id);
      success(tr('common_success'), tr('common_deleted'));
      setSelectedProjectId('');
    } catch (err: unknown) {
      toastError(tr('common_failed'), err instanceof Error ? err.message : String(err));
    }
  };

  /* ── Render Active Tab Component ───────────────────────────── */
  const renderActiveView = () => {
    if (!activeProject) return null;

    switch (activeTab) {
      case 'BOARD':
        return <BoardView project={activeProject} user={user} />;
      case 'PLANNING':
        return <PlanningView project={activeProject} user={user} />;
      case 'ALL_REQUESTS':
        return <AllRequestsView project={activeProject} user={user} />;
      case 'MY_TASKS':
        return <MyTasksView project={activeProject} user={user} onClearAssigneeFilter={() => setActiveTab('BOARD')} />;
      case 'MY_REQUESTS':
        return <MyRequestsView project={activeProject} user={user} />;
      case 'DASHBOARD':
        return <DashboardView key={activeProject.id} project={activeProject} user={user} />;
      default:
        return <BoardView project={activeProject} user={user} />;
    }
  };

  /* ── Loading skeleton ─────────────────────────────────────── */
  if (projectsLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 w-full rounded-xl" />
        <div className="flex gap-4">
          <div className="skeleton h-60 w-72 rounded-xl flex-shrink-0" />
          <div className="skeleton h-60 w-72 rounded-xl flex-shrink-0" />
          <div className="skeleton h-60 w-72 rounded-xl flex-shrink-0" />
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-5 min-h-[75vh]">
      
      {/* ── Asana-Style Project Top Navigation Bar ──────────── */}
      {activeProject ? (
        <ProjectNav
          project={activeProject}
          projects={projects}
          selectedProjectId={effectiveProjectId}
          onSelectProject={handleSelectProject}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          user={user}
        />
      ) : (
        /* Empty State Top bar */
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <Kanban className="w-4 h-4 text-brand-primary" />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              {lang === 'vi' ? 'Không có dự án hoạt động' : 'No Active Projects'}
            </span>
          </div>
          {isWriteUser && (
            <button
              onClick={() => setShowAddProject(true)}
              className="btn-primary py-1.5 px-3 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {lang === 'vi' ? 'Dự án mới' : 'New Project'}
            </button>
          )}
        </div>
      )}

      {/* Delete project button for write users - placed separately since navbar has Share/Customize */}
      {isWriteUser && activeProject && (
        <div className="flex justify-end pr-1 -mt-1">
          <button
            onClick={handleDeleteProject}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-red-950/10"
            style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {lang === 'vi' ? 'Xóa dự án' : 'Delete Project'}
          </button>
        </div>
      )}

      {/* ── Active View / Empty state ───────────────────────── */}
      {activeProject ? (
        activeProjectQuery.isLoading ? (
          <div className="skeleton h-60 w-full rounded-xl" />
        ) : (
          renderActiveView()
        )
      ) : (
        <div
          className="flex-1 flex flex-col items-center justify-center border border-dashed rounded-2xl p-16 text-center"
          style={{ borderColor: 'var(--border-default)', background: 'rgba(255,255,255,0.01)' }}
        >
          <Kanban className="w-10 h-10 mb-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="heading-md" style={{ color: 'var(--text-primary)' }}>
            {lang === 'vi' ? 'Chưa có dự án nào' : 'No Projects Yet'}
          </h3>
          <p className="text-xs mt-1.5 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'vi'
              ? 'Tạo một bảng Kanban hoặc Bảng theo dõi yêu cầu mới để quản lý công việc.'
              : 'Create a new Kanban Board or Request Tracker to start managing work.'}
          </p>
          {isWriteUser && (
            <button onClick={() => setShowAddProject(true)} className="btn-primary mt-5">
              <Plus className="w-4 h-4" />
              {lang === 'vi' ? 'Tạo dự án mới' : 'Create Project'}
            </button>
          )}
        </div>
      )}

      {/* ── Create Board Modal (Includes Project Type Picker) ── */}
      {showAddProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'var(--bg-overlay)' }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
          >
            {/* Modal header */}
            <div className="flex justify-between items-center mb-4 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h3 className="heading-md">
                  {lang === 'vi' ? 'Tạo dự án mới' : 'Create Project'}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {lang === 'vi'
                    ? 'Chọn mẫu dự án phù hợp với công việc của bạn.'
                    : 'Select a project template best suited for your workflow.'}
                </p>
              </div>
              <button onClick={() => setShowAddProject(false)} className="btn-ghost p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              {/* Type Selector (D7: Saffron themes, interactive choice) */}
              <div>
                <label className="label block mb-2 text-xs">
                  {lang === 'vi' ? 'Chọn loại dự án (Mẫu)' : 'Project Type (Template)'}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Option 1: KANBAN */}
                  <div
                    onClick={() => setNewProjType('KANBAN')}
                    className="border rounded-xl p-4 cursor-pointer transition-all flex flex-col gap-2 shadow-sm"
                    style={{
                      background: newProjType === 'KANBAN' ? 'rgba(232, 160, 32, 0.05)' : 'var(--bg-surface)',
                      borderColor: newProjType === 'KANBAN' ? 'var(--brand-primary)' : 'var(--border-default)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Grid className="w-4 h-4 text-brand-primary" />
                      <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                        {lang === 'vi' ? 'Bảng Kanban' : 'Kanban Board'}
                      </span>
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {lang === 'vi'
                        ? '3 cột mặc định, gắn nhãn độ khó, điểm Story points, mức độ ưu tiên.'
                        : '3 default columns, effort levels, Story points estimate, and priority badges.'}
                    </p>
                  </div>

                  {/* Option 2: REQUESTS */}
                  <div
                    onClick={() => setNewProjType('REQUESTS')}
                    className="border rounded-xl p-4 cursor-pointer transition-all flex flex-col gap-2 shadow-sm"
                    style={{
                      background: newProjType === 'REQUESTS' ? 'rgba(232, 160, 32, 0.05)' : 'var(--bg-surface)',
                      borderColor: newProjType === 'REQUESTS' ? 'var(--brand-primary)' : 'var(--border-default)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Table className="w-4 h-4 text-brand-primary" />
                      <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                        {lang === 'vi' ? 'Theo dõi yêu cầu' : 'Request Tracker'}
                      </span>
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {lang === 'vi'
                        ? '4 cột trạng thái mã màu, mã yêu cầu REQU-###, chuyên biệt cho kiểm duyệt.'
                        : '4 color-coded status columns, prefix request IDs, optimized for tracking approvals.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Project name */}
              <div>
                <label className="label block mb-1.5 text-xs">
                  {lang === 'vi' ? 'Tên dự án' : 'Project Name'}
                </label>
                <input
                  type="text"
                  value={newProjName}
                  onChange={e => setNewProjName(e.target.value)}
                  className="field"
                  placeholder={lang === 'vi' ? 'vd: Biên soạn tài liệu giảng dạy' : 'e.g., Curriculum Design Plan'}
                  required
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="label block mb-1.5 text-xs">
                  {lang === 'vi' ? 'Mô tả (tuỳ chọn)' : 'Description (optional)'}
                </label>
                <textarea
                  value={newProjDesc}
                  onChange={e => setNewProjDesc(e.target.value)}
                  className="field resize-none text-xs"
                  rows={2}
                  placeholder={lang === 'vi' ? 'Mô tả ngắn...' : 'Brief description...'}
                />
              </div>

              {/* Centre scope */}
              {(user.role === 'CENTRAL_ADMIN' || user.role === 'ACADEMIC_SUPERVISOR') && (
                <div>
                  <label className="label block mb-1.5 text-xs">{tr('form_centre')}</label>
                  <select
                    value={newProjCentre}
                    onChange={e => setNewProjCentre(e.target.value)}
                    className="field"
                  >
                    <option value="">{lang === 'vi' ? 'Toàn cầu (Tất cả)' : 'Global (All Centres)'}</option>
                    {centres?.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button type="button" onClick={() => setShowAddProject(false)} className="btn-ghost text-xs">
                  {tr('mgmt_cancel')}
                </button>
                <button type="submit" disabled={createProject.isPending} className="btn-primary text-xs">
                  {createProject.isPending
                    ? tr('form_saving')
                    : (lang === 'vi' ? 'Tạo dự án' : 'Create Project')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
