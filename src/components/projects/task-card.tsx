'use client';

import { Calendar, Trash2, GripVertical, CheckCircle2, Circle } from 'lucide-react';
import type { Task } from '@/hooks/use-projects';
import { useLanguage } from '@/providers/language-provider';

interface TaskCardProps {
  task: Task;
  projectType: 'KANBAN' | 'REQUESTS';
  isWriteUser: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: (completed: boolean) => void;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
}

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PRIORITY_COLORS = {
  BLOCKER: '#ef4444', // Red
  HIGH: '#f97316',    // Orange
  MEDIUM: '#f59e0b',  // Amber
  LOW: '#2dd4bf',     // Teal/Cyan
  TRIVIAL: '#9ca3af', // Gray
};

const EFFORT_COLORS = {
  LOW: 'rgba(45, 212, 191, 0.15)', // Teal
  MEDIUM: 'rgba(245, 158, 11, 0.15)', // Amber
  HIGH: 'rgba(239, 68, 68, 0.15)', // Red
};

export function TaskCard({
  task,
  projectType,
  isWriteUser,
  onEdit,
  onDelete,
  onToggleComplete,
  dragProps,
}: TaskCardProps) {
  const { lang, tr } = useLanguage();

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isWriteUser) return;
    onToggleComplete(!task.completed);
  };

  const formatDateRange = (startStr: string | null, endStr: string | null) => {
    if (!endStr) return null;
    const start = startStr ? new Date(startStr) : null;
    const end = new Date(endStr);
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    
    if (start && start.getTime() !== end.getTime()) {
      return `${start.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', options)} – ${end.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', options)}`;
    }
    return end.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', options);
  };

  const formattedDate = formatDateRange(task.dueDateStart, task.dueDateEnd);

  // Priority color swatch style
  const priorityColor = task.priority ? PRIORITY_COLORS[task.priority] : PRIORITY_COLORS.MEDIUM;

  const isRequests = projectType === 'REQUESTS';

  return (
    <div
      className="group/card relative rounded-xl border p-3 cursor-pointer transition-all duration-150 flex flex-col gap-2 shadow-sm hover:shadow-md"
      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
      onClick={isWriteUser ? onEdit : undefined}
      onMouseEnter={e => {
        if (isWriteUser) e.currentTarget.style.borderColor = 'var(--brand-primary)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
      }}
    >
      {/* Top row: Checkbox, Swatch, Title, Delete */}
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        {dragProps && isWriteUser && (
          <div
            {...dragProps}
            onClick={e => e.stopPropagation()}
            className="cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
          >
            <GripVertical className="w-3 h-3" />
          </div>
        )}

        {/* Checkbox (D3) */}
        <button
          onClick={handleCheckboxClick}
          disabled={!isWriteUser}
          className={`mt-0.5 flex-shrink-0 transition-colors ${!isWriteUser ? 'cursor-default' : 'hover:text-brand-primary'}`}
          style={{ color: task.completed ? '#22c55e' : 'var(--text-muted)' }}
        >
          {task.completed ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </button>

        {/* Priority Color Swatch / Type Icon */}
        {!isRequests && (
          <div
            className="w-3.5 h-3.5 rounded mt-0.5 flex-shrink-0"
            style={{ backgroundColor: priorityColor }}
            title={`${tr('project_priority')}: ${task.priority || 'MEDIUM'}`}
          />
        )}

        {/* Title */}
        <span
          className={`flex-1 text-xs font-semibold leading-snug ${task.completed ? 'line-through opacity-50' : ''}`}
          style={{ color: 'var(--text-primary)' }}
        >
          {task.name}
        </span>

        {/* Delete action button (hidden for teachers) */}
        {isWriteUser && (
          <button
            onClick={e => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex-shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity p-0.5 rounded"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            title={tr('mgmt_delete')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Middle row: Category/Effort Tags */}
      {(task.effort || task.category) && (
        <div className="flex flex-wrap gap-1.5 pl-6">
          {/* Effort Pill (Kanban only, D1) */}
          {!isRequests && task.effort && (
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: EFFORT_COLORS[task.effort],
                color: task.effort === 'HIGH' ? '#f87171' : task.effort === 'MEDIUM' ? 'var(--brand-primary)' : '#2dd4bf',
              }}
            >
              {task.effort}
            </span>
          )}

          {/* Category Tag (coexists) */}
          {task.category && (
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
          )}
        </div>
      )}

      {/* Bottom row: Assignee Avatar, Date, Story Points, Ticket ID */}
      <div className="flex items-center justify-between mt-1 pl-6">
        <div className="flex items-center gap-2">
          {/* Assignee Avatar */}
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border flex-shrink-0"
            style={{
              background: 'var(--bg-app)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-secondary)',
              borderStyle: task.assignee ? 'solid' : 'dashed',
            }}
            title={task.assignee?.name || (lang === 'vi' ? 'Chưa phân công' : 'Unassigned')}
          >
            {task.assignee ? getInitials(task.assignee.name) : ''}
          </div>

          {/* Due date display */}
          {formattedDate && (
            <span
              className="text-[10px] flex items-center gap-1 font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Calendar className="w-3 h-3 text-brand-primary" />
              {formattedDate}
            </span>
          )}
        </div>

        {/* Right side: Ticket ID and SP badge (D1 coexists) */}
        <div className="flex items-center gap-1.5">
          {task.ticketId && (
            <span
              className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded"
              style={{
                color: 'var(--text-muted)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {task.ticketId}
            </span>
          )}

          {!isRequests && task.storyPoints !== null && task.storyPoints !== undefined && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex items-center justify-center min-w-[18px] h-[18px]"
              style={{
                background: 'var(--bg-app)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-accent)',
              }}
            >
              {task.storyPoints}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
