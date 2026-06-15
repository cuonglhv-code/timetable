'use client';

import { useState } from 'react';
import { Plus, CheckCircle2, Circle } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import { useToast } from '@/components/ui/toast';
import {
  useCreateTask, useUpdateTask,
} from '@/hooks/use-projects';
import type { Project, Task } from '@/hooks/use-projects';
import { TaskEditModal } from './task-edit-modal';

interface AllRequestsViewProps {
  project: Project;
  user: { id: string; role: string };
  filterByAssigneeId?: string; // Phase 2 My Requests
}

export function AllRequestsView({ project, user, filterByAssigneeId }: AllRequestsViewProps) {
  const { tr, lang } = useLanguage();
  const { success, error: toastError } = useToast();
  const isWriteUser = user.role !== 'TEACHER';

  const createTask = useCreateTask(project.id);
  const updateTask = useUpdateTask(project.id);

  // Modal State
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Collapse states for status groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Inline inputs
  const [inlineTaskName, setInlineTaskName] = useState<Record<string, string>>({});

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

  const toggleGroupCollapse = (sectionId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const sortedSections = [...project.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-6 flex-1 pb-10">
      {sortedSections.map(section => {
        // Filter tasks if filterByAssigneeId is set
        let tasks = section.tasks ?? [];
        if (filterByAssigneeId) {
          tasks = tasks.filter(t => t.assigneeId === filterByAssigneeId);
        }

        const isCollapsed = collapsedGroups[section.id];
        const statusBg = section.statusColor || '#9ca3af';

        return (
          <div
            key={section.id}
            className="border rounded-2xl overflow-hidden shadow-sm"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            {/* Section Header (collapsible, colored background label) */}
            <div
              onClick={() => toggleGroupCollapse(section.id)}
              className="flex justify-between items-center px-4 py-3 border-b cursor-pointer select-none transition-colors hover:bg-white/5"
              style={{ background: 'var(--bg-app)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: statusBg }}
                />
                <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  {section.name}
                </h3>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white/90"
                  style={{ backgroundColor: statusBg + '33', border: `1px solid ${statusBg}55`, color: statusBg }}
                >
                  {tasks.length}
                </span>
              </div>
            </div>

            {/* Table */}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr
                      className="border-b font-semibold"
                      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                    >
                      <th className="p-3 w-10"></th>
                      <th className="p-3">{lang === 'vi' ? 'Tiêu đề' : 'Request Title'}</th>
                      <th className="p-3 w-28">{lang === 'vi' ? 'Mã yêu cầu' : 'Request ID'}</th>
                      <th className="p-3 w-40">{tr('project_assignee')}</th>
                      <th className="p-3 w-36">{tr('project_due_date')}</th>
                      <th className="p-3 w-44">{tr('project_category')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(task => (
                      <tr
                        key={task.id}
                        className="border-b transition-colors hover:bg-white/5 cursor-pointer"
                        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                        onClick={() => isWriteUser && setEditingTask(task)}
                      >
                        {/* Checkbox */}
                        <td className="p-3" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleComplete(task.id, !task.completed)}
                            disabled={!isWriteUser}
                            style={{ color: task.completed ? '#22c55e' : 'var(--text-muted)' }}
                          >
                            {task.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                          </button>
                        </td>

                        {/* Name */}
                        <td className="p-3 font-semibold leading-normal">
                          <span className={task.completed ? 'line-through opacity-50' : ''}>
                            {task.name}
                          </span>
                        </td>

                        {/* Ticket ID */}
                        <td className="p-3 font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                          {task.ticketId || '--'}
                        </td>

                        {/* Assignee */}
                        <td className="p-3 truncate" style={{ color: 'var(--text-secondary)' }}>
                          {task.assignee ? task.assignee.name : (lang === 'vi' ? 'Chưa phân công' : 'Unassigned')}
                        </td>

                        {/* Due Date */}
                        <td className="p-3 font-medium" style={{ color: 'var(--text-secondary)' }}>
                          {task.dueDateEnd ? new Date(task.dueDateEnd).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric' }) : '--'}
                        </td>

                        {/* Category Tag */}
                        <td className="p-3">
                          {task.category ? (
                            <span
                              className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-default)',
                              }}
                            >
                              {task.category}
                            </span>
                          ) : (
                            '--'
                          )}
                        </td>
                      </tr>
                    ))}

                    {/* Add Request Row (D7: Hidden for TEACHER) */}
                    {isWriteUser && (
                      <tr style={{ color: 'var(--text-muted)' }}>
                        <td className="p-3">
                          <Plus className="w-4 h-4 opacity-50" />
                        </td>
                        <td colSpan={5} className="p-2">
                          <form onSubmit={(e) => handleAddTask(section.id, e)}>
                            <input
                              type="text"
                              value={inlineTaskName[section.id] ?? ''}
                              onChange={e => {
                                const val = e.target.value;
                                setInlineTaskName(prev => ({ ...prev, [section.id]: val }));
                              }}
                              className="w-full text-xs bg-transparent border-0 focus:ring-0 focus:outline-none p-1"
                              placeholder={lang === 'vi' ? 'Thêm yêu cầu mới...' : 'Add new request...'}
                            />
                          </form>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Edit drawer */}
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
