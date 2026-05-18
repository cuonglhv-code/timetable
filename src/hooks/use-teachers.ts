/**
 * React Query hooks for Teacher data.
 * @module hooks/use-teachers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Teacher } from '@/types';

export function useTeachers() {
  return useQuery<Teacher[]>({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await fetch('/api/teachers');
      if (!res.ok) throw new Error('Failed to fetch teachers');
      return res.json();
    },
  });
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      email?: string | null;
      phone?: string | null;
      isActive?: boolean;
    }) => {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create teacher');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; email?: string | null; phone?: string | null; isActive?: boolean };
    }) => {
      const res = await fetch(`/api/teachers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update teacher');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/teachers/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete teacher');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });
}
