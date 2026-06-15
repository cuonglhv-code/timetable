'use client';

import { useState } from 'react';
import {
  Plus, X, CheckCircle2, Circle, ChevronDown, ChevronRight, FileText, Zap
} from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import { useToast } from '@/components/ui/toast';
import {
  useCreateTask, useUpdateTask, useCreateSection,
} from '@/hooks/use-projects';
import type { Project, Task } from '@/hooks/use-projects';
import { TaskEditModal } from './task-edit-modal';

interface PlanningViewProps {
  project: Project;
  user: { id: string; role: string };
}

export function PlanningView({ project, user }: PlanningViewProps) {
  const { tr, lang } = useLanguage();
  const { success, error: toastError } = useToast();
  const isWriteUser = user.role !== 'TEACHER';

  const createTask = useCreateTask(project.id);
  const updateTask = useUpdateTask(project.id);
  const createSection = useCreateSection(project.id);

  // Modal State
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Section collapse states
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Inline inputs
  const [inlineTaskName, setInlineTaskName] = useState<Record<string, string>>({});
  const [showAddCol, setShowAddCol] = useState(false);
  const [addColName, setAddColName] = useState('');

  const handleAddTask = async (sectionId: string, e: React.FormEvent) => {
    e.preventDefault();
    const name = inlineTaskName[sectionId]?.trim();
    if (!name) return;
    const section = project.sections.find(s => s.id === sectionId);
    const lastOrder = section?.tasks.reduce((m, t) => Math.max(m, t.order), 0) ?? 0;
    try {
      await createTask.mutateAsync({ sectionId, name, order: lastOrder + 1000 });
      setInlineTaskName(prev => ({ ...prev, [sectionId]: '' }));
    } catch (err: unknown) {
      toastError(tr('common_failed'), err instanceof Error ? err.message : String(err));
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = addColName.trim();
    if (!name) return;
    const lastOrder = project.sections.reduce((m, s) => Math.max(m, s.order), 0);
    try {
      await createSection.mutateAsync({ name, order: lastOrder + 1000 });
      setAddColName('');
      setShowAddCol(false);
      success(tr('common_success'), tr('common_added'));
    } catch (err: unknown) {
      toastError(tr('common_failed'), err instanceof Error ? err.message : String(err));
    }
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        data: { completed },
      });
      success(tr('common_success'), tr('common_updated'));
    } catch (err: unknown) {
      toastError(tr('common_failed'), err instanceof Error ? err.message : String(err));
    }
  };

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sortedSections = [...project.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-6 flex-1 pb-10 select-none">
      <div className="overflow-x-auto rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <table className="w-full text-left border-collapse text-xs table-fixed min-w-[900px]">
          {/* Table Header */}
          <thead>
            <tr
              className="border-b font-semibold"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)', background: 'var(--bg-app)' }}
            >
              <th className="p-3 w-10 text-center"></th>
              <th className="p-3 w-1/3">{lang === 'vi' ? 'Tên công việc' : 'Name'}</th>
              <th className="p-3 w-28">{lang === 'vi' ? 'Mã KANB' : 'KANB'}</th>
              <th className="p-3 w-40">{lang === 'vi' ? 'Người đảm nhận' : 'Assignee'}</th>
              <th className="p-3 w-28">{lang === 'vi' ? 'Điểm SP' : 'Story points'}</th>
              <th className="p-3 w-28">{lang === 'vi' ? 'Bị chặn bởi' : 'Blocked by'}</th>
              <th className="p-3 w-28">{lang === 'vi' ? 'Chặn công việc' : 'Blocking'}</th>
              <th className="p-3 w-10 text-center">
                <button className="hover:text-primary transition-colors">+</button>
              </th>
            </tr>
          </thead>

          {/* Table Body (Map sections) */}
          {sortedSections.map(section => {
            const tasks = section.tasks ?? [];
            const isCollapsed = !!collapsedSections[section.id];
            const totalSP = tasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

            const isBacklog = section.name.toLowerCase() === 'backlog';
            const showDocumentIcon = isBacklog;
            const showLightning = section.name.toLowerCase() !== 'untitled section';

            return (
              <tbody key={section.id} className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                {/* Section Group Header Row */}
                <tr
                  className="hover:bg-white/5 cursor-pointer"
                  style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                  onClick={() => toggleSectionCollapse(section.id)}
                >
                  <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleSectionCollapse(section.id)} className="text-muted-foreground hover:text-primary">
                      {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                  <td colSpan={7} className="p-2 font-bold text-xs select-none">
                    <div className="flex items-center gap-2">
                      <span>{section.name}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {tasks.length}
                      </span>
                      {showDocumentIcon && <FileText className="w-3.5 h-3.5 text-blue-400/80" />}
                      {showLightning && <Zap className="w-3.5 h-3.5 text-amber-500/80" />}
                    </div>
                  </td>
                </tr>

                {/* Tasks Rows */}
                {!isCollapsed &&
                  tasks.map(task => {
                    const initials = task.assignee ? getInitials(task.assignee.name) : '';
                    return (
                      <tr
                        key={task.id}
                        className="border-b transition-colors hover:bg-white/5 cursor-pointer"
                        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                        onClick={() => isWriteUser && setEditingTask(task)}
                      >
                        {/* Checkbox */}
                        <td className="p-2.5 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleComplete(task.id, !task.completed)}
                            disabled={!isWriteUser}
                            className="transition-colors hover:text-brand-primary"
                            style={{ color: task.completed ? '#22c55e' : 'var(--text-muted)' }}
                          >
                            {task.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                          </button>
                        </td>

                        {/* Task Title */}
                        <td className="p-2.5 font-medium truncate">
                          <span className={task.completed ? 'line-through opacity-50' : ''}>
                            {task.name}
                          </span>
                        </td>

                        {/* Ticket ID */}
                        <td className="p-2.5 font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                          {task.ticketId || '--'}
                        </td>

                        {/* Assignee Avatar + Name */}
                        <td className="p-2.5">
                          <div className="flex items-center gap-2 truncate">
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border flex-shrink-0"
                              style={{
                                background: 'var(--bg-app)',
                                borderColor: 'var(--border-default)',
                                color: 'var(--text-secondary)',
                                borderStyle: task.assignee ? 'solid' : 'dashed',
                              }}
                            >
                              {task.assignee ? initials : ''}
                            </div>
                            <span className="truncate" style={{ color: 'var(--text-secondary)' }}>
                              {task.assignee ? task.assignee.name : ''}
                            </span>
                          </div>
                        </td>

                        {/* Story Points */}
                        <td className="p-2.5 font-semibold font-mono" style={{ color: 'var(--text-accent)' }}>
                          {task.storyPoints !== null && task.storyPoints !== undefined ? task.storyPoints : '--'}
                        </td>

                        {/* Blocked by */}
                        <td className="p-2.5 text-muted-foreground text-[10px]">--</td>

                        {/* Blocking */}
                        <td className="p-2.5 text-muted-foreground text-[10px]">--</td>

                        {/* Actions column */}
                        <td className="p-2.5"></td>
                      </tr>
                    );
                  })}

                {/* Inline Add Task Row (D7: Hidden for TEACHER) */}
                {!isCollapsed && isWriteUser && (
                  <tr className="border-b" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <td className="p-2 text-center">
                      <Plus className="w-4 h-4 opacity-50" />
                    </td>
                    <td colSpan={7} className="p-1">
                      <form onSubmit={(e) => handleAddTask(section.id, e)}>
                        <input
                          type="text"
                          value={inlineTaskName[section.id] ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            setInlineTaskName(prev => ({ ...prev, [section.id]: val }));
                          }}
                          className="w-full text-xs bg-transparent border-0 focus:ring-0 focus:outline-none p-1.5"
                          placeholder={lang === 'vi' ? 'Thêm công việc/User story...' : 'Add User story...'}
                        />
                      </form>
                    </td>
                  </tr>
                )}

                {/* SUM Footer Row */}
                {!isCollapsed && (
                  <tr style={{ background: 'rgba(255,255,255,0.01)', color: 'var(--text-secondary)' }}>
                    <td className="p-2"></td>
                    <td colSpan={3} className="p-2 font-bold text-right pr-6 uppercase tracking-wider text-[10px] text-muted-foreground">
                      SUM
                    </td>
                    <td className="p-2 font-bold font-mono text-xs" style={{ color: 'var(--text-accent)' }}>
                      {totalSP}
                    </td>
                    <td colSpan={3} className="p-2"></td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>
      </div>

      {/* add section trigger */}
      {isWriteUser && (
        <div className="w-72 mt-2">
          {showAddCol ? (
            <form
              onSubmit={handleAddSection}
              className="rounded-2xl border p-4 flex flex-col gap-3"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
            >
              <input
                autoFocus
                type="text"
                value={addColName}
                onChange={e => setAddColName(e.target.value)}
                className="field text-xs"
                placeholder={lang === 'vi' ? 'Tên phần mới...' : 'Section name...'}
              />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 text-xs py-1.5 font-semibold">
                  {lang === 'vi' ? 'Thêm phần' : 'Add Section'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddCol(false); setAddColName(''); }}
                  className="btn-ghost p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddCol(true)}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed text-xs font-semibold transition-all duration-200"
              style={{
                borderColor: 'var(--border-default)',
                color: 'var(--text-muted)',
                background: 'rgba(255,255,255,0.01)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--border-accent)';
                e.currentTarget.style.color = 'var(--text-accent)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <Plus className="w-4 h-4" />
              {lang === 'vi' ? 'Thêm phần kế hoạch mới' : 'Add Section'}
            </button>
          )}
        </div>
      )}

      {/* Edit modal drawer */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          projectId={project.id}
          sections={project.sections}
          projectType={project.type}
          isWriteUser={isWriteUser}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
