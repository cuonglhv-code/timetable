import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CalendarShare, CalendarShareWithSession } from '@/types';

export function useCalendarShares(filters?: { classSessionId?: string; teacherEmail?: string }) {
  return useQuery<CalendarShareWithSession[]>({
    queryKey: ['calendar-shares', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.classSessionId) params.set('classSessionId', filters.classSessionId);
      if (filters?.teacherEmail) params.set('teacherEmail', filters.teacherEmail);

      const res = await fetch(`/api/calendar/shares?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch calendar shares');
      return res.json();
    },
  });
}

export function useCreateCalendarShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      classSessionId: string;
      teacherEmail: string;
      permission: 'READER' | 'WRITER' | 'OWNER';
      sendEmailNotification: boolean;
    }) => {
      const res = await fetch('/api/calendar/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create calendar share');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-shares'] });
    },
  });
}

export function useUpdateCalendarShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        permission?: 'READER' | 'WRITER' | 'OWNER';
        sendEmailNotification?: boolean;
      };
    }) => {
      const res = await fetch(`/api/calendar/shares/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update calendar share');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-shares'] });
    },
  });
}

export function useRevokeCalendarShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/calendar/shares/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to revoke calendar share');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-shares'] });
    },
  });
}

export function useSyncCalendarShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/calendar/shares/${id}`, { method: 'POST' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to sync calendar share');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-shares'] });
    },
  });
}
