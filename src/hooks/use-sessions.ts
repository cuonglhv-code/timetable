/**
 * React Query hooks for ClassSession data.
 * @module hooks/use-sessions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ClassSessionWithRelations, FilterOptions } from '@/types';

export interface SessionInput {
  className: string;
  courseId: string;
  teacherId: string;
  centreId: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string | null;
}

export function useSessions(filters?: FilterOptions & { startDate?: string; endDate?: string }) {
  return useQuery<ClassSessionWithRelations[]>({
    queryKey: ['sessions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.centreId) params.set('centreId', filters.centreId);
      if (filters?.teacherId) params.set('teacherId', filters.teacherId);
      if (filters?.courseId) params.set('courseId', filters.courseId);
      if (filters?.searchQuery) params.set('searchQuery', filters.searchQuery);
      if (filters?.startDate) params.set('startDate', filters.startDate);
      if (filters?.endDate) params.set('endDate', filters.endDate);

      const res = await fetch(`/api/sessions?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch sessions');
      return res.json();
    },
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SessionInput) => {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create session');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<SessionInput>;
    }) => {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update session');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete session');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
