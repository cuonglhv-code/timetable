/**
 * Session form for creating and editing class sessions.
 * @module components/timetable/session-form
 */

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useCentres } from '@/hooks/use-centres';
import { useRooms } from '@/hooks/use-rooms';
import { useCourses } from '@/hooks/use-courses';
import { useTeachers } from '@/hooks/use-teachers';
import { useCreateSession, useUpdateSession, type SessionInput } from '@/hooks/use-sessions';
import { sessionSchema } from '@/lib/validators';
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
};

export function SessionForm({ session, onClose, defaultDate }: SessionFormProps) {
  const { data: centres } = useCentres();
  const { data: rooms } = useRooms();
  const { data: courses } = useCourses();
  const { data: teachers } = useTeachers();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SessionFormData>({
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
        }
      : {
          className: '',
          courseId: '',
          teacherId: '',
          centreId: '',
          roomId: '',
          date: defaultDate ? defaultDate.toISOString().split('T')[0] : '',
          startTime: '08:00',
          endTime: '09:00',
          notes: '',
        },
  });

  const selectedCentreId = watch('centreId');

  const onSubmit = async (data: SessionFormData) => {
    try {
      if (session) {
        await updateSession.mutateAsync({ id: session.id, data: data as Partial<SessionInput> });
      } else {
        await createSession.mutateAsync(data as SessionInput);
      }
      onClose();
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {session ? 'Edit Session' : 'Add Session'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class Name
            </label>
            <input
              {...register('className')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., IELTS Advanced A"
            />
            {errors.className && (
              <p className="mt-1 text-xs text-red-600">{errors.className.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course
              </label>
              <select
                {...register('courseId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select course</option>
                {courses?.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
              {errors.courseId && (
                <p className="mt-1 text-xs text-red-600">{errors.courseId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teacher
              </label>
              <select
                {...register('teacherId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select teacher</option>
                {teachers?.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
              {errors.teacherId && (
                <p className="mt-1 text-xs text-red-600">{errors.teacherId.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Centre
              </label>
              <select
                {...register('centreId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select centre</option>
                {centres?.map((centre) => (
                  <option key={centre.id} value={centre.id}>
                    {centre.name}
                  </option>
                ))}
              </select>
              {errors.centreId && (
                <p className="mt-1 text-xs text-red-600">{errors.centreId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room
              </label>
              <select
                {...register('roomId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedCentreId}
              >
                <option value="">Select room</option>
                {rooms
                  ?.filter((r) => r.centreId === selectedCentreId && r.isActive)
                  .map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
              </select>
              {errors.roomId && (
                <p className="mt-1 text-xs text-red-600">{errors.roomId.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                {...register('date')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.date && (
                <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                {...register('startTime')}
                type="time"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.startTime && (
                <p className="mt-1 text-xs text-red-600">{errors.startTime.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                {...register('endTime')}
                type="time"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.endTime && (
                <p className="mt-1 text-xs text-red-600">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional notes..."
            />
            {errors.notes && (
              <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : session ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
