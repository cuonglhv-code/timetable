'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, BookOpen, X, Edit2, Trash2, Loader2, Sparkles
} from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import { useCentres } from '@/hooks/use-centres';
import { useCourses } from '@/hooks/use-courses';
import { useRooms } from '@/hooks/use-rooms';
import { useTeachers } from '@/hooks/use-teachers';
import type { TranslationKey } from '@/lib/i18n';

interface ClassOpeningPlan {
  id: string;
  className: string;
  courseId: string;
  centreId: string;
  teacherId: string | null;
  roomId: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  minStudents: number;
  currentStudents: number;
  status: 'PLANNING' | 'SUBMITTED';
  createdAt: string;
  updatedAt: string;
  course: { id: string; name: string };
  centre: { id: string; name: string };
  teacher: { id: string; name: string } | null;
  room: { id: string; name: string } | null;
}

interface ClassPlanningViewProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    centreId: string | null;
    teacherId: string | null;
  };
}

export function ClassPlanningView({ user }: ClassPlanningViewProps) {
  const { tr, lang } = useLanguage();
  const queryClient = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<'PLANNING' | 'SUBMITTED'>('PLANNING');
  const isCentreManager = user.role === 'CENTRE_MANAGER';
  const [selectedCentreId, setSelectedCentreId] = useState(
    isCentreManager && user.centreId ? user.centreId : 'ALL'
  );

  // Form Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ClassOpeningPlan | null>(null);

  // Form Fields
  const [formClassName, setFormClassName] = useState('');
  const [formCourseId, setFormCourseId] = useState('');
  const [formCentreId, setFormCentreId] = useState(
    isCentreManager && user.centreId ? user.centreId : ''
  );
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formRoomId, setFormRoomId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formMinStudents, setFormMinStudents] = useState(15);
  const [formCurrentStudents, setFormCurrentStudents] = useState(0);

  const { data: centres } = useCentres();
  const { data: courses } = useCourses();
  const { data: rooms } = useRooms();
  const { data: teachers } = useTeachers();

  // Load plans
  const queryParams = new URLSearchParams();
  queryParams.append('status', filterStatus);
  if (selectedCentreId !== 'ALL') {
    queryParams.append('centreId', selectedCentreId);
  }

  const { data: plans, isLoading } = useQuery<ClassOpeningPlan[]>({
    queryKey: ['class-planning', filterStatus, selectedCentreId],
    queryFn: async () => {
      const res = await fetch(`/api/class-planning?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to load planned classes');
      return res.json();
    },
    refetchInterval: 15_000, // refresh list frequently
  });

  // Filter Rooms based on selected Centre in form
  const filteredRooms = useMemo(() => {
    if (!formCentreId || !rooms) return [];
    return rooms.filter(r => r.centreId === formCentreId && r.isActive);
  }, [formCentreId, rooms]);

  // Active Teachers
  const activeTeachers = useMemo(() => {
    if (!teachers) return [];
    return teachers.filter(t => t.isActive);
  }, [teachers]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/class-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create plan');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-planning'] });
      setIsDrawerOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      alert(err.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/class-planning/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update plan');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-planning'] });
      setIsDrawerOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      alert(err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/class-planning/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete plan');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-planning'] });
    },
    onError: (err: Error) => {
      alert(err.message);
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/class-planning/${id}/submit`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to open class');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-planning'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      alert(tr('plan_submit_success'));
    },
    onError: (err: Error) => {
      alert(`Error opening class: ${err.message}`);
    }
  });

  const resetForm = () => {
    setEditingPlan(null);
    setFormClassName('');
    setFormCourseId('');
    setFormCentreId(isCentreManager && user.centreId ? user.centreId : '');
    setFormTeacherId('');
    setFormRoomId('');
    setFormDate('');
    setFormStartTime('');
    setFormEndTime('');
    setFormMinStudents(15);
    setFormCurrentStudents(0);
  };

  const handleOpenCreateDrawer = () => {
    resetForm();
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (plan: ClassOpeningPlan) => {
    setEditingPlan(plan);
    setFormClassName(plan.className);
    setFormCourseId(plan.courseId);
    setFormCentreId(plan.centreId);
    setFormTeacherId(plan.teacherId || '');
    setFormRoomId(plan.roomId || '');
    setFormDate(plan.date ? new Date(plan.date).toISOString().split('T')[0] : '');
    setFormStartTime(plan.startTime || '');
    setFormEndTime(plan.endTime || '');
    setFormMinStudents(plan.minStudents);
    setFormCurrentStudents(plan.currentStudents);
    setIsDrawerOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      className: formClassName,
      courseId: formCourseId,
      centreId: formCentreId,
      teacherId: formTeacherId || null,
      roomId: formRoomId || null,
      date: formDate || null,
      startTime: formStartTime || null,
      endTime: formEndTime || null,
      minStudents: Number(formMinStudents),
      currentStudents: Number(formCurrentStudents),
    };

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm(tr('plan_delete_confirm'))) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmitClass = (plan: ClassOpeningPlan, hasConflict: boolean) => {
    if (hasConflict) {
      alert(lang === 'vi' ? 'Lớp học bị trùng lịch. Không thể mở lớp.' : 'Class has scheduling conflicts. Cannot submit.');
      return;
    }

    if (plan.currentStudents < plan.minStudents) {
      const confirmBypass = confirm(
        lang === 'vi'
          ? `Sĩ số hiện tại (${plan.currentStudents}) thấp hơn sĩ số tối thiểu (${plan.minStudents}). Bạn có chắc muốn tiếp tục mở lớp không?`
          : `Current student count (${plan.currentStudents}) is below the minimum required (${plan.minStudents}). Do you want to submit and open this class anyway?`
      );
      if (!confirmBypass) return;
    }

    submitMutation.mutate(plan.id);
  };

  return (
    <div className="space-y-6 relative">
      
      {/* ── Filter Bar ────────────────────────────────────────── */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in"
           style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Switches */}
          <div className="flex bg-gray-900 p-0.5 rounded-lg border border-gray-800">
            <button
              onClick={() => setFilterStatus('PLANNING')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filterStatus === 'PLANNING'
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tr('plan_status_planning')}
            </button>
            <button
              onClick={() => setFilterStatus('SUBMITTED')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filterStatus === 'SUBMITTED'
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tr('plan_status_submitted')}
            </button>
          </div>

          {/* Centre tenancy selector */}
          {!isCentreManager && (
            <select
              value={selectedCentreId}
              onChange={e => setSelectedCentreId(e.target.value)}
              className="field py-1.5 px-3 text-xs w-44"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
            >
              <option value="ALL">{lang === 'vi' ? 'Tất cả cơ sở' : 'All Centres'}</option>
              {centres?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {/* Create Plan Button */}
        {filterStatus === 'PLANNING' && (
          <button
            onClick={handleOpenCreateDrawer}
            className="btn-primary py-2 px-4 text-xs flex items-center justify-center gap-1.5 font-bold transition-transform active:scale-95"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary) 0%, #4f46e5 100%)', border: 'none' }}
          >
            <Plus className="w-4 h-4" />
            <span>{tr('plan_create_btn')}</span>
          </button>
        )}
      </div>

      {/* ── Plans Grid ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-80 rounded-xl" />
          ))}
        </div>
      ) : !plans || plans.length === 0 ? (
        <div className="card p-12 text-center border border-dashed flex flex-col items-center justify-center gap-3"
             style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <Sparkles className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
          <p className="muted text-sm">{tr('mgmt_no_data')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <PlannerCard
              key={plan.id}
              plan={plan}
              tr={tr}
              lang={lang}
              onEdit={handleOpenEditDrawer}
              onDelete={handleDelete}
              onSubmit={handleSubmitClass}
              isSubmitting={submitMutation.isPending && submitMutation.variables === plan.id}
            />
          ))}
        </div>
      )}

      {/* ── Form Drawer ───────────────────────────────────────── */}
      {isDrawerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[450px] p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-fade-in"
               style={{ background: 'var(--bg-elevated)', borderLeft: '1px solid var(--border-default)' }}>
            
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
                <div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    {editingPlan ? (lang === 'vi' ? 'Sửa kế hoạch mở lớp' : 'Edit Class Plan') : tr('plan_create_btn')}
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {editingPlan ? (lang === 'vi' ? 'Cập nhật các tiêu chí mở lớp' : 'Update the class opening specifications') : (lang === 'vi' ? 'Lên cấu hình lớp học dự định' : 'Set specifications for the draft class')}
                  </p>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="btn-ghost p-1.5 rounded-lg text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                
                {/* Class Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {tr('form_class_name')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formClassName}
                    onChange={e => setFormClassName(e.target.value)}
                    placeholder="e.g. IELTS 6.5 Morning A"
                    className="field p-2.5 text-xs rounded-lg"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                  />
                </div>

                {/* Course Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {tr('form_course')} *
                  </label>
                  <select
                    required
                    value={formCourseId}
                    onChange={e => setFormCourseId(e.target.value)}
                    className="field p-2.5 text-xs rounded-lg"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                  >
                    <option value="">{tr('form_select_course')}</option>
                    {courses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Centre Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {tr('form_centre')} *
                  </label>
                  {isCentreManager ? (
                    <div className="field p-2.5 text-xs font-semibold cursor-not-allowed rounded-lg opacity-60 flex items-center gap-1.5"
                         style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <span>{centres?.find(c => c.id === formCentreId)?.name || formCentreId}</span>
                    </div>
                  ) : (
                    <select
                      required
                      value={formCentreId}
                      onChange={e => {
                        setFormCentreId(e.target.value);
                        setFormRoomId(''); // reset room when center changes
                      }}
                      className="field p-2.5 text-xs rounded-lg"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                    >
                      <option value="">{tr('form_select_centre')}</option>
                      {centres?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>

                {/* Registration numbers */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {tr('plan_min_students')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formMinStudents}
                      onChange={e => setFormMinStudents(Number(e.target.value))}
                      className="field p-2.5 text-xs rounded-lg"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {tr('plan_current_students')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formCurrentStudents}
                      onChange={e => setFormCurrentStudents(Number(e.target.value))}
                      className="field p-2.5 text-xs rounded-lg"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div className="h-px bg-gray-800 my-2" />
                <p className="text-[10px] font-bold tracking-wider uppercase text-amber-500">
                  {lang === 'vi' ? 'Xếp lịch & Tài nguyên (Có thể bổ sung sau)' : 'Schedule & Resource Details (Can be added later)'}
                </p>

                {/* Teacher Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {tr('form_teacher')}
                  </label>
                  <select
                    value={formTeacherId}
                    onChange={e => setFormTeacherId(e.target.value)}
                    className="field p-2.5 text-xs rounded-lg"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                  >
                    <option value="">{tr('form_select_teacher')} (Chưa chọn)</option>
                    {activeTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                {/* Room Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {tr('form_room')}
                  </label>
                  <select
                    value={formRoomId}
                    disabled={!formCentreId}
                    onChange={e => setFormRoomId(e.target.value)}
                    className="field p-2.5 text-xs rounded-lg"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                  >
                    <option value="">{tr('form_select_room')} (Chưa chọn)</option>
                    {filteredRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>

                {/* Schedule parameters */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {tr('form_date')}
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="field p-2.5 text-xs rounded-lg"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {tr('form_start_time')}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 09:00"
                      value={formStartTime}
                      onChange={e => setFormStartTime(e.target.value)}
                      className="field p-2.5 text-xs rounded-lg"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {tr('form_end_time')}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 10:30"
                      value={formEndTime}
                      onChange={e => setFormEndTime(e.target.value)}
                      className="field p-2.5 text-xs rounded-lg"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center gap-3 pt-6 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    type="submit"
                    className="btn-primary py-2 px-4 text-xs font-bold flex-1"
                    style={{ background: 'var(--brand-primary)', border: 'none', color: '#0e0d0b' }}
                  >
                    {editingPlan ? tr('mgmt_save') : tr('mgmt_create')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="btn-ghost py-2 px-4 text-xs font-bold border border-gray-700"
                  >
                    {tr('form_cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

// ── Planner Card Sub-component ────────────────────────────
interface PlannerCardProps {
  plan: ClassOpeningPlan;
  tr: (key: TranslationKey) => string;
  lang: string;
  onEdit: (plan: ClassOpeningPlan) => void;
  onDelete: (id: string) => void;
  onSubmit: (plan: ClassOpeningPlan, hasConflict: boolean) => void;
  isSubmitting: boolean;
}

function PlannerCard({ plan, tr, lang, onEdit, onDelete, onSubmit, isSubmitting }: PlannerCardProps) {
  
  // Registration progress bar details
  const fillPct = Math.min((plan.currentStudents / plan.minStudents) * 100, 100);
  const isThresholdMet = plan.currentStudents >= plan.minStudents;
  const barColor = isThresholdMet ? '#34d399' : 'var(--brand-primary)';

  // Core specs validation
  const hasTeacher = !!plan.teacherId;
  const hasRoom = !!plan.roomId;
  const hasSchedule = !!plan.date && !!plan.startTime && !!plan.endTime;
  const hasAllCoreResources = hasTeacher && hasRoom && hasSchedule;

  // React query conflict checker
  const dateString = plan.date ? new Date(plan.date).toISOString().split('T')[0] : '';
  
  const { data: conflictData, isLoading: isConflictLoading } = useQuery({
    queryKey: ['check-conflict', plan.id, dateString, plan.startTime, plan.endTime, plan.roomId, plan.teacherId],
    queryFn: async () => {
      const query = new URLSearchParams();
      query.append('date', dateString);
      if (plan.startTime) query.append('startTime', plan.startTime);
      if (plan.endTime) query.append('endTime', plan.endTime);
      if (plan.roomId) query.append('roomId', plan.roomId);
      if (plan.teacherId) query.append('teacherId', plan.teacherId);
      
      const res = await fetch(`/api/sessions/check-conflict?${query.toString()}`);
      if (!res.ok) return { hasConflict: false };
      return res.json();
    },
    enabled: plan.status === 'PLANNING' && hasAllCoreResources,
  });

  const hasConflict = conflictData?.hasConflict ?? false;

  // Final check for ready-to-open status
  const isReadyToOpen = plan.status === 'PLANNING' && hasAllCoreResources && !hasConflict;

  const displayDate = plan.date
    ? new Date(plan.date).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : null;

  return (
    <div className="card p-5 flex flex-col justify-between gap-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-accent"
         style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      
      {/* status badge */}
      {plan.status === 'SUBMITTED' && (
        <div className="absolute top-0 right-0 px-3 py-1 bg-green-500 text-black text-[10px] font-bold rounded-bl-lg">
          {tr('plan_status_submitted')}
        </div>
      )}

      <div className="space-y-4">
        {/* Card Header */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-amber-500 mb-1">
            <BookOpen className="w-3 h-3" />
            <span>{plan.course.name}</span>
          </div>
          <h4 className="text-base font-bold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
            {plan.className}
          </h4>
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {plan.centre.name}
          </span>
        </div>

        {/* Student registrations progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span style={{ color: 'var(--text-secondary)' }}>{tr('plan_current_students')}</span>
            <span style={{ color: isThresholdMet ? '#34d399' : 'var(--text-primary)' }}>
              {plan.currentStudents} / {plan.minStudents} {lang === 'vi' ? 'học viên' : 'students'}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
            <div className="h-full rounded-full transition-all duration-500"
                 style={{ width: `${fillPct}%`, background: barColor }} />
          </div>
        </div>

        {/* Checklist details */}
        <div className="space-y-2.5 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          
          {/* Teacher check */}
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>{tr('form_teacher')}</span>
            {hasTeacher ? (
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{plan.teacher?.name}</span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-medium">Chưa chọn</span>
            )}
          </div>

          {/* Room check */}
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>{tr('form_room')}</span>
            {hasRoom ? (
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{plan.room?.name}</span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-medium">Chưa chọn</span>
            )}
          </div>

          {/* Schedule check */}
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>Lịch học</span>
            {hasSchedule ? (
              <div className="text-right">
                <span className="font-semibold block" style={{ color: 'var(--text-primary)' }}>{displayDate}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{plan.startTime}–{plan.endTime}</span>
              </div>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-medium">Chưa xếp</span>
            )}
          </div>

          {/* Dynamic Conflict status */}
          {plan.status === 'PLANNING' && hasAllCoreResources && (
            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-dashed" style={{ borderColor: 'var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{tr('plan_criteria_conflicts')}</span>
              {isConflictLoading ? (
                <span className="text-[10px] animate-pulse text-gray-500">Checking...</span>
              ) : hasConflict ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/25 text-red-400 font-bold animate-pulse">
                  ⚠ Bị trùng lịch!
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400 font-semibold">
                  ✓ Không trùng
                </span>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Action controls */}
      <div className="flex items-center justify-between pt-4 border-t gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-1.5">
          {plan.status === 'PLANNING' && (
            <>
              <button
                onClick={() => onEdit(plan)}
                className="btn-ghost p-2 rounded-lg border border-gray-800 transition-colors hover:text-white"
                title="Edit Plan"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(plan.id)}
                className="btn-ghost p-2 rounded-lg border border-gray-800 transition-colors text-red-500 hover:bg-red-500/10"
                title="Delete Plan"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {plan.status === 'PLANNING' && (
          <button
            onClick={() => onSubmit(plan, hasConflict)}
            disabled={!isReadyToOpen || isSubmitting}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
              isReadyToOpen
                ? 'bg-green-500 text-black cursor-pointer hover:bg-green-400 font-extrabold shadow-lg shadow-green-500/10'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700 font-semibold'
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{tr('plan_submit_btn')}</span>
          </button>
        )}
      </div>

    </div>
  );
}
