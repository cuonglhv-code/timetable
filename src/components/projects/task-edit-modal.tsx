'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Calendar, CheckCircle2, Circle } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import type { Task, Section } from '@/hooks/use-projects';
import { useUpdateTask } from '@/hooks/use-projects';
import { useToast } from '@/components/ui/toast';

interface UserSummary {
  id: string;
  name: string;
  email: string;
}

interface TaskEditModalProps {
  task: Task;
  projectId: string;
  sections: Section[];
  projectType: 'KANBAN' | 'REQUESTS';
  isWriteUser: boolean;
  onClose: () => void;
}

export function TaskEditModal({
  task,
  projectId,
  sections,
  projectType,
  isWriteUser,
  onClose,
}: TaskEditModalProps) {
  const { lang, tr } = useLanguage();
  const { success, error: toastError } = useToast();
  const updateTask = useUpdateTask(projectId);

  // Form states
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description ?? '');
  const [sectionId, setSectionId] = useState(task.sectionId);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? '');
  const [dueDateStart, setDueDateStart] = useState(
    task.dueDateStart ? new Date(task.dueDateStart).toISOString().split('T')[0] : ''
  );
  const [dueDateEnd, setDueDateEnd] = useState(
    task.dueDateEnd ? new Date(task.dueDateEnd).toISOString().split('T')[0] : ''
  );
  const [effort, setEffort] = useState<'LOW' | 'MEDIUM' | 'HIGH' | ''>(task.effort ?? '');
  const [category, setCategory] = useState(task.category ?? '');
  const [storyPoints, setStoryPoints] = useState<number | ''>(
    task.storyPoints !== null && task.storyPoints !== undefined ? task.storyPoints : ''
  );
  const [priority, setPriority] = useState<
    'BLOCKER' | 'HIGH' | 'MEDIUM' | 'LOW' | 'TRIVIAL'
  >(task.priority ?? 'MEDIUM');
  const [completed, setCompleted] = useState(task.completed);

  // Fetch users for assignee list
  const { data: users } = useQuery<UserSummary[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      await updateTask.mutateAsync({
        id: task.id,
        data: {
          name: name.trim(),
          description: description.trim() || null,
          sectionId,
          assigneeId: assigneeId || null,
          dueDateStart: dueDateStart || null,
          dueDateEnd: dueDateEnd || null,
          effort: effort || null,
          category: category.trim() || null,
          storyPoints: storyPoints !== '' ? Number(storyPoints) : null,
          priority: priority || null,
          completed,
        },
      });
      success(tr('common_success'), tr('common_updated'));
      onClose();
    } catch (err: unknown) {
      toastError(tr('common_failed'), err instanceof Error ? err.message : String(err));
    }
  };

  const isRequests = projectType === 'REQUESTS';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'var(--bg-overlay)' }}
      onClick={onClose}
    >
      {/* Slide-in right panel */}
      <div
        className="w-full sm:w-[480px] h-full flex flex-col shadow-2xl border-l animate-slide-in"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            {task.ticketId && (
              <span
                className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                style={{
                  color: 'var(--text-accent)',
                  background: 'rgba(232, 160, 32, 0.15)',
                }}
              >
                {task.ticketId}
              </span>
            )}
            <h3 className="heading-md m-0">
              {isRequests ? tr('project_type_requests') : tr('project_type_kanban')}
            </h3>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Completion toggle (D3) */}
          <div
            className="flex items-center gap-3 p-3 rounded-lg border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <button
              onClick={() => isWriteUser && setCompleted(!completed)}
              disabled={!isWriteUser}
              className={`flex-shrink-0 transition-colors ${!isWriteUser ? 'cursor-default' : 'hover:text-brand-primary'}`}
              style={{ color: completed ? '#22c55e' : 'var(--text-muted)' }}
            >
              {completed ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </button>
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              {completed
                ? (lang === 'vi' ? 'Đã hoàn thành' : 'Completed')
                : (lang === 'vi' ? 'Đánh dấu hoàn thành' : 'Mark completed')}
            </span>
          </div>

          {/* Task Title */}
          <div>
            <label className="label block mb-1.5 text-xs">
              {lang === 'vi' ? 'Tiêu đề' : 'Title'}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={!isWriteUser}
              className="field"
              placeholder={lang === 'vi' ? 'Tiêu đề...' : 'Task title...'}
              required
            />
          </div>

          {/* Task Description */}
          <div>
            <label className="label block mb-1.5 text-xs">
              {lang === 'vi' ? 'Mô tả' : 'Description'}
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={!isWriteUser}
              className="field resize-none text-xs"
              rows={4}
              placeholder={lang === 'vi' ? 'Chi tiết công việc...' : 'Provide details...'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Section/Column */}
            <div>
              <label className="label block mb-1.5 text-xs">
                {lang === 'vi' ? 'Cột trạng thái' : 'Status Section'}
              </label>
              <select
                value={sectionId}
                onChange={e => setSectionId(e.target.value)}
                disabled={!isWriteUser}
                className="field"
              >
                {sections.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="label block mb-1.5 text-xs">
                {tr('project_assignee')}
              </label>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                disabled={!isWriteUser}
                className="field"
              >
                <option value="">{lang === 'vi' ? 'Chưa phân công' : 'Unassigned'}</option>
                {users?.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due dates */}
          {isRequests ? (
            <div>
              <label className="label block mb-1.5 text-xs">
                {tr('project_due_date')}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDateEnd}
                  onChange={e => {
                    setDueDateEnd(e.target.value);
                    // For requests, set start date same as end date if unset
                    if (!dueDateStart) setDueDateStart(e.target.value);
                  }}
                  disabled={!isWriteUser}
                  className="field pl-8"
                />
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label block mb-1.5 text-xs">
                  {lang === 'vi' ? 'Ngày bắt đầu' : 'Start Date'}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dueDateStart}
                    onChange={e => setDueDateStart(e.target.value)}
                    disabled={!isWriteUser}
                    className="field pl-8"
                  />
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div>
                <label className="label block mb-1.5 text-xs">
                  {lang === 'vi' ? 'Hạn chót' : 'Due Date'}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dueDateEnd}
                    onChange={e => setDueDateEnd(e.target.value)}
                    disabled={!isWriteUser}
                    className="field pl-8"
                  />
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            </div>
          )}

          {/* Effort & Category */}
          <div className="grid grid-cols-2 gap-4">
            {!isRequests && (
              <div>
                <label className="label block mb-1.5 text-xs">
                  {tr('project_effort')}
                </label>
                <select
                  value={effort}
                  onChange={e => setEffort(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | '')}
                  disabled={!isWriteUser}
                  className="field"
                >
                  <option value="">--</option>
                  <option value="LOW">{tr('project_effort_low')}</option>
                  <option value="MEDIUM">{tr('project_effort_medium')}</option>
                  <option value="HIGH">{tr('project_effort_high')}</option>
                </select>
              </div>
            )}

            <div>
              <label className="label block mb-1.5 text-xs">
                {tr('project_category')}
              </label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={!isWriteUser}
                className="field"
                placeholder={isRequests ? 'e.g., Request approval' : 'e.g., Writing'}
              />
            </div>
          </div>

          {/* Story Points & Priority (Kanban only) */}
          {!isRequests && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label block mb-1.5 text-xs">
                  {tr('project_story_points')}
                </label>
                <input
                  type="number"
                  value={storyPoints}
                  onChange={e => {
                    const val = e.target.value;
                    setStoryPoints(val === '' ? '' : Math.max(0, parseInt(val)));
                  }}
                  disabled={!isWriteUser}
                  className="field"
                  placeholder="e.g. 5"
                  min="0"
                />
              </div>

              <div>
                <label className="label block mb-1.5 text-xs">
                  {tr('project_priority')}
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as 'BLOCKER' | 'HIGH' | 'MEDIUM' | 'LOW' | 'TRIVIAL')}
                  disabled={!isWriteUser}
                  className="field"
                >
                  <option value="BLOCKER">BLOCKER</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                  <option value="TRIVIAL">TRIVIAL</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer (hidden/disabled for teachers) */}
        {isWriteUser && (
          <div
            className="p-4 border-t flex gap-2 justify-end flex-shrink-0"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
          >
            <button onClick={onClose} className="btn-ghost text-xs py-1.5 px-3">
              {tr('mgmt_cancel')}
            </button>
            <button onClick={handleSave} className="btn-primary text-xs py-1.5 px-3">
              {tr('mgmt_save')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
