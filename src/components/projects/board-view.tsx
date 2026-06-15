'use client';

import { useState, useRef, useEffect } from 'react';
import {
  DndContext, DragEndEvent, useDroppable,
  PointerSensor, useSensor, useSensors,
  DragStartEvent, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Trash2, X, ChevronLeft, ChevronRight, Pencil, Check,
  Filter, ArrowUpDown, Layers, FileText, Zap, Search, ChevronDown,
  SlidersHorizontal
} from 'lucide-react';
import {
  useCreateTask, useUpdateTask, useDeleteTask,
  useReorderTasks, useCreateSection, useUpdateSection, useDeleteSection,
} from '@/hooks/use-projects';
import { useLanguage } from '@/providers/language-provider';
import { useToast } from '@/components/ui/toast';
import type { Project, Section, Task, UserSummary } from '@/hooks/use-projects';
import { TaskCard } from './task-card';
import { TaskEditModal } from './task-edit-modal';

interface BoardViewProps {
  project: Project;
  user: { id: string; role: string };
  filterByAssigneeId?: string;
  onClearAssigneeFilter?: () => void;
}

export function BoardView({ project, user, filterByAssigneeId, onClearAssigneeFilter }: BoardViewProps) {
  const { tr, lang } = useLanguage();
  const { success, error: toastError } = useToast();

  const isWriteUser = user.role !== 'TEACHER';

  const createTask    = useCreateTask(project.id);
  const updateTask    = useUpdateTask(project.id);
  const deleteTask    = useDeleteTask(project.id);
  const reorderTasks  = useReorderTasks(project.id);
  const createSection = useCreateSection(project.id);
  const updateSection = useUpdateSection(project.id);
  const deleteSection = useDeleteSection(project.id);

  // Group & Filter State
  const [groupByAssignee, setGroupByAssignee] = useState(true);
  const [sortOrder, setSortOrder] = useState<'default' | 'name' | 'dueDate'>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Drag state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Inline "add task" input per group/section
  const [inlineTaskName, setInlineTaskName] = useState<Record<string, string>>({});

  // Add Column
  const [addColName, setAddColName] = useState('');
  const [showAddCol, setShowAddCol] = useState(false);

  // Renaming Column
  const [renamingColId, setRenamingColId] = useState<string | null>(null);
  const [renameValue, setRenameValue]     = useState('');

  // Dropdowns
  const [showAddStoryMenu, setShowAddStoryMenu] = useState(false);

  // Edit card modal
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId   = over.id as string;

    // Find the active task
    let activeTask: Task | null = null;
    let activeSection: Section | null = null;
    for (const sec of project.sections) {
      const found = sec.tasks.find(t => t.id === activeId);
      if (found) { activeTask = found; activeSection = sec; break; }
    }
    if (!activeTask || !activeSection) return;

    // Determine target section and assignee from drop target ID
    let targetSection: Section | undefined = undefined;
    let targetAssigneeId: string | null = activeTask.assigneeId; // default to current

    if (overId.startsWith('assignee-drop::')) {
      // Format: assignee-drop::${sectionId}::${assigneeId}
      const parts = overId.split('::');
      const secId = parts[1];
      const assId = parts[2];
      targetSection = project.sections.find(s => s.id === secId);
      targetAssigneeId = assId === 'unassigned' ? null : assId;
    } else {
      // Check if overId is a section/column generally
      targetSection = project.sections.find(s => s.id === overId);
      
      if (!targetSection) {
        // Check if overId is a task ID
        let overTask: Task | null = null;
        for (const sec of project.sections) {
          const found = sec.tasks.find(t => t.id === overId);
          if (found) { overTask = found; targetSection = sec; break; }
        }
        if (overTask) {
          targetAssigneeId = overTask.assigneeId;
        }
      }
    }

    if (!targetSection) return;

    // Update assignee/section if changed
    const assigneeChanged = activeTask.assigneeId !== targetAssigneeId;
    const sectionChanged = activeSection.id !== targetSection.id;

    if (assigneeChanged || sectionChanged) {
      try {
        await updateTask.mutateAsync({
          id: activeId,
          data: {
            assigneeId: targetAssigneeId,
            sectionId: targetSection.id,
          },
        });
      } catch (err: unknown) {
        toastError(tr('common_failed'), err instanceof Error ? err.message : String(err));
        return;
      }
    }

    // Reordering within the target section
    const isDifferentSection = activeSection.id !== targetSection.id;
    const targetTasks = [...targetSection.tasks];
    const sourceTasks = isDifferentSection
      ? activeSection.tasks.filter(t => t.id !== activeId)
      : [...activeSection.tasks];

    // Find over task
    let overTask: Task | null = null;
    if (!overId.startsWith('assignee-drop::')) {
      for (const sec of project.sections) {
        const found = sec.tasks.find(t => t.id === overId);
        if (found) { overTask = found; break; }
      }
    }

    let newIndex = targetTasks.length;
    if (overTask) {
      newIndex = targetTasks.findIndex(t => t.id === overTask.id);
      if (!isDifferentSection) {
        const currentIndex = targetTasks.findIndex(t => t.id === activeId);
        if (currentIndex < newIndex) newIndex += 1;
      }
    }

    const updatedTargetTasks = [...targetTasks];
    if (isDifferentSection) {
      updatedTargetTasks.splice(newIndex, 0, { ...activeTask, sectionId: targetSection.id, assigneeId: targetAssigneeId });
    } else {
      const idx = updatedTargetTasks.findIndex(t => t.id === activeId);
      if (idx !== -1) {
        const [removed] = updatedTargetTasks.splice(idx, 1);
        updatedTargetTasks.splice(idx < newIndex ? newIndex - 1 : newIndex, 0, { ...removed, assigneeId: targetAssigneeId });
      }
    }

    const payload = updatedTargetTasks.map((t, i) => ({
      id: t.id, order: (i + 1) * 1000, sectionId: targetSection!.id,
    }));
    if (isDifferentSection) {
      payload.push(...sourceTasks.map((t, i) => ({
        id: t.id, order: (i + 1) * 1000, sectionId: activeSection!.id,
      })));
    }

    try {
      await reorderTasks.mutateAsync(payload);
    } catch (err: unknown) {
      toastError(tr('common_failed'), err instanceof Error ? err.message : String(err));
    }
  };

  const handleAddColumn = async (e: React.FormEvent) => {
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

  const startRenameCol = (col: Section) => {
    setRenamingColId(col.id);
    setRenameValue(col.name);
  };

  const handleRenameCol = async (colId: string) => {
    const name = renameValue.trim();
    if (!name) { setRenamingColId(null); return; }
    try {
      await updateSection.mutateAsync({ id: colId, data: { name } });
      setRenamingColId(null);
      success(tr('common_success'), tr('common_updated'));
    } catch (err: unknown) {
      toastError(tr('common_failed'), err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteColumn = async (col: Section) => {
    const taskCount = col.tasks.length;
    const msg = taskCount > 0
      ? (lang === 'vi'
        ? `Cột "${col.name}" có ${taskCount} thẻ. Bạn có chắc muốn xoá không?`
        : `Column "${col.name}" has ${taskCount} card(s). Delete anyway?`)
      : (lang === 'vi'
        ? `Bạn có chắc muốn xoá cột "${col.name}" không?`
        : `Delete column "${col.name}"?`);
    if (!window.confirm(msg)) return;
    try {
      await deleteSection.mutateAsync(col.id);
      success(tr('common_success'), tr('common_deleted'));
    } catch (err: unknown) {
      toastError(tr('common_failed'), err instanceof Error ? err.message : String(err));
    }
  };

  const handleMoveColumn = async (col: Section, direction: 'left' | 'right') => {
    const sorted = [...project.sections].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(s => s.id === col.id);
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const neighbour = sorted[targetIdx];
    try {
      await Promise.all([
        updateSection.mutateAsync({ id: col.id, data: { order: neighbour.order } }),
        updateSection.mutateAsync({ id: neighbour.id, data: { order: col.order } }),
      ]);
    } catch (err: unknown) {
      toastError(tr('common_failed'), err instanceof Error ? err.message : String(err));
    }
  };

  const handleAddGroupTask = async (sectionId: string, assigneeId: string | null, name: string) => {
    if (!name.trim()) return;
    const section = project.sections.find(s => s.id === sectionId);
    const lastOrder = section?.tasks.reduce((m, t) => Math.max(m, t.order), 0) ?? 0;
    try {
      await createTask.mutateAsync({
        sectionId,
        name: name.trim(),
        order: lastOrder + 1000,
        assigneeId: assigneeId || null,
      });
    } catch (err: unknown) {
      toastError(tr('common_failed'), err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm(tr('common_confirm_delete'))) return;
    try {
      await deleteTask.mutateAsync(taskId);
      success(tr('common_success'), tr('common_deleted'));
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

  const openEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const getActiveTaskObj = () =>
    project.sections.flatMap(s => s.tasks).find(t => t.id === activeDragId) ?? null;

  const sortedSections = [...project.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* ── Asana-Style Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1">
        <div className="flex items-center gap-3">
          {/* Add User Story Button with Dropdown (D7: Hidden for TEACHER) */}
          {isWriteUser && (
            <div className="relative">
              <button
                onClick={() => setShowAddStoryMenu(!showAddStoryMenu)}
                className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                {lang === 'vi' ? 'Thêm công việc' : 'Add User story'}
                <ChevronDown className="w-3 h-3 opacity-80" />
              </button>

              {showAddStoryMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowAddStoryMenu(false)} />
                  <div
                    className="absolute left-0 mt-1.5 w-52 rounded-xl border shadow-xl z-20 py-2 text-xs"
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
                  >
                    <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground" style={{ color: 'var(--text-muted)' }}>
                      {lang === 'vi' ? 'Chọn cột để thêm' : 'Add to Section'}
                    </div>
                    {sortedSections.map(sec => (
                      <button
                        key={sec.id}
                        onClick={() => {
                          setShowAddStoryMenu(false);
                          handleAddGroupTask(sec.id, null, lang === 'vi' ? 'Công việc mới' : 'New User story');
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-white/5 truncate flex items-center gap-1.5"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <Plus className="w-3 h-3 text-brand-primary" />
                        {sec.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="flex items-center gap-1.5 relative">
            {showSearchInput ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={lang === 'vi' ? 'Tìm kiếm...' : 'Search...'}
                  className="field text-xs py-1 px-2.5 w-36"
                  style={{ border: '1px solid var(--border-default)', background: 'var(--bg-app)' }}
                  autoFocus
                />
                <button
                  onClick={() => { setSearchQuery(''); setShowSearchInput(false); }}
                  className="p-1 hover:bg-white/5 rounded text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearchInput(true)}
                className="btn-ghost p-1.5 rounded-lg border text-muted-foreground hover:text-primary flex items-center gap-1"
                style={{ borderColor: 'var(--border-default)' }}
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Active Filter Indicator */}
          {filterByAssigneeId && (
            <div
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold animate-fade-in"
              style={{
                background: 'rgba(232, 160, 32, 0.1)',
                borderColor: 'rgba(232, 160, 32, 0.25)',
                color: 'var(--brand-primary)',
              }}
            >
              <Filter className="w-3.5 h-3.5" />
              {lang === 'vi' ? 'Lọc: 1' : 'Filters: 1'}
              {onClearAssigneeFilter && (
                <button onClick={onClearAssigneeFilter} className="ml-1 hover:text-white transition-colors" title="Clear filter">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Sort Button */}
          <button
            onClick={() => {
              setSortOrder(prev => (prev === 'default' ? 'name' : prev === 'name' ? 'dueDate' : 'default'));
            }}
            className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5 border"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>
              {lang === 'vi' ? 'Sắp xếp: ' : 'Sort: '}
              {sortOrder === 'default'
                ? (lang === 'vi' ? 'Mặc định' : 'Default')
                : sortOrder === 'name'
                ? (lang === 'vi' ? 'Tên' : 'Alphabetical')
                : (lang === 'vi' ? 'Hạn chót' : 'Due Date')}
            </span>
          </button>

          {/* Group Toggle Badge */}
          {groupByAssignee ? (
            <div
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold bg-brand-primary/10 text-brand-primary"
              style={{ borderColor: 'var(--brand-primary)' }}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Nhóm: Người làm' : 'Groups: 2'}</span>
              <button onClick={() => setGroupByAssignee(false)} className="ml-1 hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setGroupByAssignee(true)}
              className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5 border text-muted-foreground"
              style={{ borderColor: 'var(--border-default)' }}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Nhóm' : 'Group'}</span>
            </button>
          )}

          {/* Options button */}
          <button
            className="btn-ghost py-1.5 px-2 rounded-lg border text-muted-foreground"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── DnD Canvas ── */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 items-start overflow-x-auto pb-6 min-h-[60vh] select-none">
          {sortedSections.map((section, colIdx) => (
            <BoardColumn
              key={section.id}
              project={project}
              section={section}
              colIdx={colIdx}
              totalCols={sortedSections.length}
              isWriteUser={isWriteUser}
              isRenaming={renamingColId === section.id}
              renameValue={renameValue}
              inlineTaskName={inlineTaskName}
              filterByAssigneeId={filterByAssigneeId}
              groupByAssignee={groupByAssignee}
              sortOrder={sortOrder}
              searchQuery={searchQuery}
              onRenameStart={() => startRenameCol(section)}
              onRenameChange={setRenameValue}
              onRenameSubmit={() => handleRenameCol(section.id)}
              onRenameCancel={() => setRenamingColId(null)}
              onDeleteColumn={() => handleDeleteColumn(section)}
              onMoveLeft={() => handleMoveColumn(section, 'left')}
              onMoveRight={() => handleMoveColumn(section, 'right')}
              onInlineChange={(key, val) => setInlineTaskName(prev => ({ ...prev, [key]: val }))}
              onInlineSubmit={(secId, assId, val) => handleAddGroupTask(secId, assId, val)}
              onSelectTask={openEditTask}
              onDeleteTask={handleDeleteTask}
              onToggleComplete={handleToggleComplete}
              lang={lang}
              tr={tr}
            />
          ))}

          {/* Add Section Column */}
          {isWriteUser && (
            <div className="flex-shrink-0 w-72">
              {showAddCol ? (
                <form
                  onSubmit={handleAddColumn}
                  className="rounded-2xl border p-4 flex flex-col gap-3"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
                >
                  <input
                    autoFocus
                    type="text"
                    value={addColName}
                    onChange={e => setAddColName(e.target.value)}
                    className="field text-xs"
                    placeholder={lang === 'vi' ? 'Tên cột...' : 'Column name...'}
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary flex-1 text-xs py-1.5 font-semibold">
                      {lang === 'vi' ? 'Thêm cột' : 'Add Column'}
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
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed text-xs font-semibold transition-all duration-200"
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
                  {lang === 'vi' ? 'Thêm cột mới' : 'Add Section'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeDragId ? (
            <div className="rotate-2 opacity-90 shadow-2xl">
              <TaskCard
                task={getActiveTaskObj()!}
                projectType={project.type}
                isWriteUser={false}
                onEdit={() => {}}
                onDelete={() => {}}
                onToggleComplete={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Edit Card Drawer */}
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

/* ── Column Component ── */
interface BoardColumnProps {
  project: Project;
  section: Section;
  colIdx: number;
  totalCols: number;
  isWriteUser: boolean;
  isRenaming: boolean;
  renameValue: string;
  inlineTaskName: Record<string, string>;
  filterByAssigneeId?: string;
  groupByAssignee: boolean;
  sortOrder: 'default' | 'name' | 'dueDate';
  searchQuery: string;
  onRenameStart: () => void;
  onRenameChange: (v: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onDeleteColumn: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onInlineChange: (key: string, val: string) => void;
  onInlineSubmit: (secId: string, assId: string | null, val: string) => void;
  onSelectTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  lang: string;
  tr: (key: import('@/lib/i18n').TranslationKey) => string;
}

function BoardColumn({
  project, section, colIdx, totalCols, isWriteUser,
  isRenaming, renameValue, inlineTaskName,
  filterByAssigneeId, groupByAssignee, sortOrder, searchQuery,
  onRenameStart, onRenameChange, onRenameSubmit, onRenameCancel,
  onDeleteColumn, onMoveLeft, onMoveRight,
  onInlineChange, onInlineSubmit,
  onSelectTask, onDeleteTask, onToggleComplete,
  lang, tr,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: section.id });
  const renameRef = useRef<HTMLInputElement>(null);

  // Group collapse state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isRenaming) renameRef.current?.focus();
  }, [isRenaming]);

  // Filter, Search & Sort Tasks
  let tasks = [...(section.tasks ?? [])];

  if (filterByAssigneeId) {
    tasks = tasks.filter(t => t.assigneeId === filterByAssigneeId);
  }

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    tasks = tasks.filter(t => t.name.toLowerCase().includes(query) || (t.ticketId && t.ticketId.toLowerCase().includes(query)));
  }

  if (sortOrder === 'name') {
    tasks.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortOrder === 'dueDate') {
    tasks.sort((a, b) => {
      if (!a.dueDateEnd) return 1;
      if (!b.dueDateEnd) return -1;
      return new Date(a.dueDateEnd).getTime() - new Date(b.dueDateEnd).getTime();
    });
  }

  // Partition tasks by assignee if Grouping is ON
  const groupedTasks: Record<string, Task[]> = {};
  const assignees: Record<string, UserSummary> = {};

  if (groupByAssignee) {
    tasks.forEach(t => {
      const key = t.assigneeId || 'unassigned';
      if (!groupedTasks[key]) {
        groupedTasks[key] = [];
      }
      groupedTasks[key].push(t);
      if (t.assignee) {
        assignees[key] = t.assignee;
      }
    });
  }

  // Sort groups: unassigned always last, otherwise alphabetically
  const groupKeys = Object.keys(groupedTasks).sort((a, b) => {
    if (a === 'unassigned') return 1;
    if (b === 'unassigned') return -1;
    const nameA = assignees[a]?.name || '';
    const nameB = assignees[b]?.name || '';
    return nameA.localeCompare(nameB);
  });

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isRequests = project.type === 'REQUESTS';
  const inlinePlaceholder = isRequests
    ? (lang === 'vi' ? 'Thêm yêu cầu...' : 'Add request...')
    : tr('project_add_task');

  const isBacklog = section.name.toLowerCase() === 'backlog';
  const showDocumentIcon = isBacklog;
  const showLightning = section.name.toLowerCase() !== 'untitled section';

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col rounded-2xl border w-72 flex-shrink-0 max-h-[80vh] transition-all duration-200"
      style={{
        background: 'var(--bg-surface)',
        borderColor: isOver ? 'var(--brand-primary)' : 'var(--border-subtle)',
        boxShadow: isOver ? '0 0 0 1px rgba(232,160,32,0.20)' : 'none',
      }}
    >
      {/* ── Column Header ── */}
      <div
        className="flex items-center gap-1.5 px-3 py-2.5 border-b flex-shrink-0 select-none"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {section.statusColor && (
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: section.statusColor }}
          />
        )}

        {isRenaming ? (
          <form
            onSubmit={e => { e.preventDefault(); onRenameSubmit(); }}
            className="flex-1 flex items-center gap-1"
          >
            <input
              ref={renameRef}
              value={renameValue}
              onChange={e => onRenameChange(e.target.value)}
              className="flex-1 text-xs font-semibold bg-transparent border-0 border-b focus:ring-0 focus:outline-none p-0"
              style={{ color: 'var(--text-primary)', borderColor: 'var(--border-accent)' }}
              onKeyDown={e => { if (e.key === 'Escape') onRenameCancel(); }}
            />
            <button type="submit" className="p-0.5 rounded" style={{ color: 'var(--brand-primary)' }}>
              <Check className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={onRenameCancel} className="p-0.5 rounded" style={{ color: 'var(--text-muted)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <div className="flex-1 flex items-center gap-1 min-w-0">
            <h4
              className="font-bold text-xs truncate cursor-default"
              style={{ color: 'var(--text-primary)' }}
              onDoubleClick={isWriteUser ? onRenameStart : undefined}
              title={isWriteUser ? (lang === 'vi' ? 'Nhấp đúp để đổi tên' : 'Double-click to rename') : section.name}
            >
              {section.name}
            </h4>

            <span className="text-[10px] text-muted-foreground ml-1.5 font-medium">
              {tasks.length}
            </span>

            {showDocumentIcon && <FileText className="w-3 h-3 text-blue-400/80 ml-1.5 flex-shrink-0" />}
            {showLightning && <Zap className="w-3 h-3 text-amber-500/80 ml-1 flex-shrink-0" />}
          </div>
        )}

        {isWriteUser && !isRenaming && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={onMoveLeft}
              disabled={colIdx === 0}
              className="p-1 rounded transition-colors disabled:opacity-20 hover:bg-white/5"
              style={{ color: 'var(--text-muted)' }}
              title={lang === 'vi' ? 'Di chuyển trái' : 'Move left'}
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              onClick={onMoveRight}
              disabled={colIdx === totalCols - 1}
              className="p-1 rounded transition-colors disabled:opacity-20 hover:bg-white/5"
              style={{ color: 'var(--text-muted)' }}
              title={lang === 'vi' ? 'Di chuyển phải' : 'Move right'}
            >
              <ChevronRight className="w-3 h-3" />
            </button>
            <button
              onClick={onRenameStart}
              className="p-1 rounded transition-colors hover:bg-white/5"
              style={{ color: 'var(--text-muted)' }}
              title={lang === 'vi' ? 'Đổi tên' : 'Rename'}
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={onDeleteColumn}
              className="p-1 rounded transition-colors hover:bg-white/5"
              style={{ color: 'var(--text-muted)' }}
              title={lang === 'vi' ? 'Xoá cột' : 'Delete column'}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* ── Cards List ── */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {groupByAssignee ? (
            groupKeys.map(key => (
              <AssigneeGroup
                key={key}
                groupKey={key}
                sectionId={section.id}
                assignee={assignees[key]}
                groupTasks={groupedTasks[key]}
                isCollapsed={!!collapsedGroups[key]}
                onToggleCollapse={() => toggleGroupCollapse(key)}
                projectType={project.type}
                isWriteUser={isWriteUser}
                onSelectTask={onSelectTask}
                onDeleteTask={onDeleteTask}
                onToggleComplete={onToggleComplete}
                inlineValue={inlineTaskName[section.id + '-' + key] ?? ''}
                onInlineChange={(val) => onInlineChange(section.id + '-' + key, val)}
                onInlineSubmit={(e) => {
                  e.preventDefault();
                  onInlineSubmit(section.id, key === 'unassigned' ? null : key, inlineTaskName[section.id + '-' + key] ?? '');
                  onInlineChange(section.id + '-' + key, '');
                }}
                lang={lang}
              />
            ))
          ) : (
            tasks.map(task => (
              <SortableCard
                key={task.id}
                task={task}
                projectType={project.type}
                isWriteUser={isWriteUser}
                onEdit={() => onSelectTask(task)}
                onDelete={() => onDeleteTask(task.id)}
                onToggleComplete={(val) => onToggleComplete(task.id, val)}
              />
            ))
          )}
        </SortableContext>

        {tasks.length === 0 && !isWriteUser && (
          <div
            className="text-[10px] text-center py-10 rounded-xl border border-dashed"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}
          >
            {lang === 'vi' ? 'Chưa có thẻ nào' : 'No cards yet'}
          </div>
        )}

        {tasks.length === 0 && isWriteUser && (
          <div className="py-8 flex flex-col justify-start">
            <button
              onClick={() => {
                const promptName = lang === 'vi' ? 'Công việc mới' : 'New User story';
                onInlineSubmit(section.id, null, promptName);
              }}
              className="w-full py-4 rounded-xl border border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors hover:border-brand-primary hover:text-brand-primary"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              {lang === 'vi' ? 'Thêm công việc' : 'Add User story'}
            </button>
          </div>
        )}
      </div>

      {!groupByAssignee && isWriteUser && (
        <div className="p-2.5 border-t flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onInlineSubmit(section.id, null, inlineTaskName[section.id] ?? '');
              onInlineChange(section.id, '');
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={inlineTaskName[section.id] ?? ''}
              onChange={e => onInlineChange(section.id, e.target.value)}
              className="flex-1 text-xs bg-transparent border-0 focus:ring-0 focus:outline-none p-0"
              placeholder={inlinePlaceholder}
              style={{ color: 'var(--text-primary)' }}
            />
          </form>
        </div>
      )}
    </div>
  );
}

/* ── AssigneeGroup Sub-Component ── */
interface AssigneeGroupProps {
  groupKey: string;
  sectionId: string;
  assignee?: UserSummary;
  groupTasks: Task[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  projectType: 'KANBAN' | 'REQUESTS';
  isWriteUser: boolean;
  onSelectTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  inlineValue: string;
  onInlineChange: (val: string) => void;
  onInlineSubmit: (e: React.FormEvent) => void;
  lang: string;
}

function AssigneeGroup({
  groupKey, sectionId, assignee, groupTasks, isCollapsed, onToggleCollapse,
  projectType, isWriteUser, onSelectTask, onDeleteTask, onToggleComplete,
  inlineValue, onInlineChange, onInlineSubmit, lang
}: AssigneeGroupProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `assignee-drop::${sectionId}::${groupKey}`,
  });

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = assignee ? getInitials(assignee.name) : '?';
  const name = assignee ? assignee.name : (lang === 'vi' ? 'Chưa phân công' : 'Unassigned');

  return (
    <div
      ref={setNodeRef}
      className={`space-y-1.5 p-1 rounded-xl border border-transparent transition-all duration-150 ${
        isOver ? 'border-dashed border-brand-primary bg-brand-primary/5' : ''
      }`}
    >
      <div
        onClick={onToggleCollapse}
        className="flex items-center gap-1.5 py-1 px-1 rounded cursor-pointer hover:bg-white/5 select-none text-[10px] font-bold"
        style={{ color: 'var(--text-muted)' }}
      >
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold border"
          style={{
            background: 'var(--bg-app)',
            borderColor: 'var(--border-default)',
            borderStyle: assignee ? 'solid' : 'dashed',
          }}
        >
          {assignee ? initials : ''}
        </div>
        <span className="flex-1 truncate">{name}</span>
        <span className="font-mono opacity-60 tabular-nums">({groupTasks.length})</span>
      </div>

      {!isCollapsed && (
        <div className="space-y-2 pl-3">
          {groupTasks.map(task => (
            <SortableCard
              key={task.id}
              task={task}
              projectType={projectType}
              isWriteUser={isWriteUser}
              onEdit={() => onSelectTask(task)}
              onDelete={() => onDeleteTask(task.id)}
              onToggleComplete={(val) => onToggleComplete(task.id, val)}
            />
          ))}

          {isWriteUser && (
            <form
              onSubmit={onInlineSubmit}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-dashed hover:border-brand-primary/40 transition-colors"
              style={{ borderColor: 'var(--border-default)', background: 'rgba(255,255,255,0.01)' }}
            >
              <Plus className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={inlineValue}
                onChange={e => onInlineChange(e.target.value)}
                className="flex-1 text-xs bg-transparent border-0 focus:ring-0 focus:outline-none p-0"
                placeholder={lang === 'vi' ? 'Thêm công việc...' : 'Add User story...'}
                style={{ color: 'var(--text-primary)' }}
              />
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function SortableCard({
  task, projectType, isWriteUser, onEdit, onDelete, onToggleComplete,
}: {
  task: Task;
  projectType: 'KANBAN' | 'REQUESTS';
  isWriteUser: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: (completed: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !isWriteUser,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={{ ...style, height: '64px', borderColor: 'var(--border-default)', background: 'rgba(255,255,255,0.02)' }}
        className="rounded-xl border border-dashed"
      />
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        projectType={projectType}
        isWriteUser={isWriteUser}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleComplete={onToggleComplete}
        dragProps={isWriteUser ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
}
