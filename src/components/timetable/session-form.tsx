'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, User, Building, DoorOpen, BookOpen, Clock, CalendarDays, Repeat, AlertTriangle } from 'lucide-react';
import { useCentres } from '@/hooks/use-centres';
import { useRooms } from '@/hooks/use-rooms';
import { useCourses } from '@/hooks/use-courses';
import { useTeachers } from '@/hooks/use-teachers';
import { useCreateSession, useUpdateSession, type SessionInput } from '@/hooks/use-sessions';
import { sessionSchema } from '@/lib/validators';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/providers/language-provider';
import type { ClassSessionWithRelations } from '@/types';

interface SessionFormProps {
  session: ClassSessionWithRelations | null;
  onClose: () => void;
  defaultDate?: Date;
}

type SessionFormData = {
  className: string;
  courseId: string;
  teacherId: string;
  centreId: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string | null;
  sessionNumber?: number | null;
  testType?: 'MINI_TEST' | 'MID_TEST' | 'FINAL_TEST' | '' | null;
  examDownloadUrl?: string | null;
  lmsUrl?: string | null;
};

const WEEKDAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAYS_VI = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
const WEEKDAY_VALUES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function FieldLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 label mb-1.5">
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      {children}
    </label>
  );
}

export function SessionForm({ session, onClose, defaultDate }: SessionFormProps) {
  const { data: centres }  = useCentres();
  const { data: rooms }    = useRooms();
  const { data: courses }  = useCourses();
  const { data: teachers } = useTeachers();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const { success, error: toastError } = useToast();
  const { tr, lang } = useLanguage();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [repeatUntil, setRepeatUntil] = useState('');
  const [recurringError, setRecurringError] = useState<string | null>(null);
  const [isPendingInsert, setIsPendingInsert] = useState(false);
  const prevCourseIdRef = useRef('');

  const handleDayToggle = (day: string) => {
    setRecurringDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    setRecurringError(null);
  };

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: session
      ? {
          className: session.className,
          courseId: session.courseId,
          teacherId: session.teacherId,
          centreId: session.centreId,
          roomId: session.roomId,
          date: new Date(session.date).toISOString().split('T')[0],
          startTime: session.startTime,
          endTime: session.endTime,
          notes: session.notes ?? '',
          sessionNumber: (session as any).sessionNumber ?? null,
          testType: (session as any).testType ?? '',
          examDownloadUrl: (session as any).examDownloadUrl ?? '',
          lmsUrl: (session as any).lmsUrl ?? '',
        }
      : {
          className: '',
          courseId: '',
          teacherId: '',
          centreId: '',
          roomId: '',
          date: defaultDate ? defaultDate.toISOString().split('T')[0] : '',
          startTime: '08:00',
          endTime: '09:30',
          notes: '',
          sessionNumber: null,
          testType: '',
          examDownloadUrl: '',
          lmsUrl: '',
        },
  });

  const selectedCentreId = watch('centreId');
  const selectedCourseId = watch('courseId');
  const selectedTestType = watch('testType');
  const currentClassName = watch('className');

  // Auto-fill className when course changes
  useEffect(() => {
    const courseId = selectedCourseId || '';
    if (courseId !== prevCourseIdRef.current) {
      prevCourseIdRef.current = courseId;
      if (courseId && !currentClassName) {
        const course = courses?.find(c => c.id === courseId);
        if (course) {
          setValue('className', course.name, { shouldValidate: true });
        }
      }
    }
  }, [selectedCourseId, courses, setValue, currentClassName]);

  // Find selected course to display total sessions
  const selectedCourse = courses?.find(c => c.id === selectedCourseId);

  const onSubmit = async (data: SessionFormData) => {
    if (isPendingInsert) return;
    setIsPendingInsert(true);
    setSubmitError(null);

    const formattedData = {
      ...data,
      sessionNumber: data.sessionNumber ?? null,
      testType: data.testType || null,
      examDownloadUrl: data.examDownloadUrl ? data.examDownloadUrl.trim() : null,
      lmsUrl: data.lmsUrl ? data.lmsUrl.trim() : null,
    };

    try {
      if (session) {
        await updateSession.mutateAsync({ id: session.id, data: formattedData as Partial<SessionInput> });
        success('Session Updated', `"${data.className}" has been updated.`);
      } else {
        if (isRecurring) {
          if (recurringDays.length === 0) {
            setRecurringError('Please select at least one day');
            setIsPendingInsert(false);
            return;
          }
          if (!repeatUntil) {
            setRecurringError('Please select a repeat end date');
            setIsPendingInsert(false);
            return;
          }
          if (repeatUntil < data.date) {
            setRecurringError('End date must be on or after start date');
            setIsPendingInsert(false);
            return;
          }
          await createSession.mutateAsync({ ...(formattedData as SessionInput), isRecurring: true, recurringDays, repeatUntil } as any);
          success('Recurring Sessions Created', `Sessions for "${data.className}" scheduled successfully.`);
        } else {
          await createSession.mutateAsync(formattedData as SessionInput);
          success('Session Created', `"${data.className}" has been added to the timetable.`);
        }
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save session';
      setSubmitError(msg);
      toastError('Failed to Save', msg);
      setIsPendingInsert(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'var(--bg-overlay)' }}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl animate-fade-up"
           style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b"
             style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <h2 className="heading-md">{session ? tr('form_edit_session') : tr('form_add_session')}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {session ? tr('form_edit_subtitle') : tr('form_add_subtitle')}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error banner */}
        {submitError && (
          <div className="mx-6 mt-5 p-3 rounded-lg flex items-start gap-2 text-sm animate-fade-in"
               style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{submitError}</span>
            <button onClick={() => setSubmitError(null)} style={{ color: '#f87171' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">

          {/* Class Name */}
          <div>
            <FieldLabel icon={<BookOpen className="w-3.5 h-3.5" />}>{tr('form_class_name')}</FieldLabel>
            <input {...register('className')} className="field"
                   placeholder={lang === 'vi' ? 'vd: IELTS Đạt Điểm 1 — Nhóm A' : 'e.g., IELTS Achiever 1 — Group A'}
                   disabled={isSubmitting || isPendingInsert} />
            {errors.className && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.className.message}</p>}
          </div>

          {/* Course + Teacher */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel icon={<BookOpen className="w-3.5 h-3.5" />}>{tr('form_course')}</FieldLabel>
              <select {...register('courseId')} className="field" disabled={isSubmitting || isPendingInsert}>
                <option value="">{tr('form_select_course')}</option>
                {courses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.courseId && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.courseId.message}</p>}
            </div>
            <div>
              <FieldLabel icon={<User className="w-3.5 h-3.5" />}>{tr('form_teacher')}</FieldLabel>
              <select {...register('teacherId')} className="field" disabled={isSubmitting || isPendingInsert}>
                <option value="">{tr('form_select_teacher')}</option>
                {teachers?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {errors.teacherId && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.teacherId.message}</p>}
            </div>
          </div>

          {/* Session Number */}
          <div>
            <FieldLabel icon={<BookOpen className="w-3.5 h-3.5" />}>{tr('form_session_number')}</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                {...register('sessionNumber', { valueAsNumber: true })}
                type="number"
                min={1}
                max={selectedCourse?.totalSessions ?? undefined}
                className="field"
                placeholder={lang === 'vi' ? 'vd: 1' : 'e.g., 1'}
                disabled={isSubmitting || isPendingInsert}
                style={{ width: '6rem' }}
              />
              {selectedCourse?.totalSessions && (
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {tr('form_session_of')} <strong style={{ color: 'var(--text-primary)' }}>{selectedCourse.totalSessions}</strong> {tr('form_sessions_label')}
                </span>
              )}
              {!selectedCourse?.totalSessions && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{tr('form_session_hint')}</span>
              )}
            </div>
            {errors.sessionNumber && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.sessionNumber.message}</p>}
          </div>

          {/* Centre + Room */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel icon={<Building className="w-3.5 h-3.5" />}>{tr('form_centre')}</FieldLabel>
              <select {...register('centreId')} className="field" disabled={isSubmitting || isPendingInsert}>
                <option value="">{tr('form_select_centre')}</option>
                {centres?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.centreId && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.centreId.message}</p>}
            </div>
            <div>
              <FieldLabel icon={<DoorOpen className="w-3.5 h-3.5" />}>{tr('form_room')}</FieldLabel>
              <select {...register('roomId')} className="field" disabled={!selectedCentreId || isSubmitting || isPendingInsert}>
                <option value="">{tr('form_select_room')}</option>
                {rooms?.filter(r => r.centreId === selectedCentreId && r.isActive)
                       .map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {errors.roomId && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.roomId.message}</p>}
            </div>
          </div>

          {/* Date + Start + End */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <FieldLabel icon={<CalendarDays className="w-3.5 h-3.5" />}>{tr('form_date')}</FieldLabel>
              <input {...register('date')} type="date" className="field" disabled={isSubmitting || isPendingInsert} />
              {errors.date && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.date.message}</p>}
            </div>
            <div>
              <FieldLabel icon={<Clock className="w-3.5 h-3.5" />}>{tr('form_start_time')}</FieldLabel>
              <input {...register('startTime')} type="time" className="field" disabled={isSubmitting || isPendingInsert} />
              {errors.startTime && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.startTime.message}</p>}
            </div>
            <div>
              <FieldLabel icon={<Clock className="w-3.5 h-3.5" />}>{tr('form_end_time')}</FieldLabel>
              <input {...register('endTime')} type="time" className="field" disabled={isSubmitting || isPendingInsert} />
              {errors.endTime && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.endTime.message}</p>}
            </div>
          </div>

          {/* Recurring toggle — new sessions only */}
          {!session && (
            <div className="space-y-3 pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between pt-3">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tr('form_repeat_weekly')}</span>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting || isPendingInsert}
                  onClick={() => { setIsRecurring(!isRecurring); setRecurringError(null); }}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none`}
                  style={{ background: isRecurring ? 'var(--brand-primary)' : 'rgba(255,255,255,0.15)' }}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${isRecurring ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {isRecurring && (
                <div className="space-y-4 p-4 rounded-xl animate-fade-in"
                     style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.20)' }}>
                  <div>
                    <p className="label mb-2.5">{tr('form_days_of_week')}</p>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAY_VALUES.map((day, i) => {
                        const label = lang === 'vi' ? WEEKDAYS_VI[i] : WEEKDAYS_EN[i];
                        const selected = recurringDays.includes(day);
                        return (
                          <button key={day} type="button" onClick={() => handleDayToggle(day)}
                                  disabled={isSubmitting || isPendingInsert}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                  style={selected
                                    ? { background: 'var(--brand-primary)', color: '#0e0d0b', boxShadow: 'var(--shadow-glow)' }
                                    : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }
                                  }>
                            {label.slice(0, lang === 'vi' ? 6 : 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="label block mb-1.5">{tr('form_repeat_until')}</label>
                    <input type="date" value={repeatUntil}
                           disabled={isSubmitting || isPendingInsert}
                           onChange={e => { setRepeatUntil(e.target.value); setRecurringError(null); }}
                           className="field" />
                  </div>
                  {recurringError && (
                    <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: '#f87171' }}>
                      <AlertTriangle className="w-3.5 h-3.5" />{recurringError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Test Day Settings */}
          <div className="pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <FieldLabel icon={<AlertTriangle className="w-3.5 h-3.5" />}>{tr('form_test_settings')}</FieldLabel>
            <div className="space-y-3">
              <div>
                <select {...register('testType')} className="field" disabled={isSubmitting || isPendingInsert}>
                  <option value="">{tr('form_standard_class')}</option>
                  <option value="MINI_TEST">{tr('form_mini_test')}</option>
                  <option value="MID_TEST">{tr('form_mid_test')}</option>
                  <option value="FINAL_TEST">{tr('form_final_test')}</option>
                </select>
                {errors.testType && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.testType.message}</p>}
              </div>

              {selectedTestType && (selectedTestType as string) !== '' && (
                <div className="grid grid-cols-1 gap-3 p-3.5 rounded-xl animate-fade-in bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.02)] border"
                     style={{ borderColor: 'var(--border-subtle)' }}>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-secondary)' }}>
                      {tr('form_exam_pdf')}
                    </label>
                    <input
                      {...register('examDownloadUrl')}
                      type="text"
                      className="field"
                      placeholder="e.g. https://jaxtina.edu/exams/final-exam.pdf"
                      disabled={isSubmitting || isPendingInsert}
                    />
                    {errors.examDownloadUrl && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.examDownloadUrl.message}</p>}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-secondary)' }}>
                      {tr('form_lms_link')}
                    </label>
                    <input
                      {...register('lmsUrl')}
                      type="text"
                      className="field"
                      placeholder="e.g. https://lms.jaxtina.com/tests/final"
                      disabled={isSubmitting || isPendingInsert}
                    />
                    {errors.lmsUrl && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.lmsUrl.message}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label block mb-1.5">{tr('form_notes')}</label>
            <textarea {...register('notes')} rows={2} className="field resize-none"
                      disabled={isSubmitting || isPendingInsert}
                      placeholder={tr('form_notes_placeholder')} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isSubmitting || isPendingInsert} className="btn-ghost">{tr('form_cancel')}</button>
            <button type="submit" disabled={isSubmitting || isPendingInsert} className="btn-primary">
              {isSubmitting || isPendingInsert ? tr('form_saving') : session ? tr('form_update_session') : (isRecurring ? tr('form_create_sessions') : tr('form_create_session'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
