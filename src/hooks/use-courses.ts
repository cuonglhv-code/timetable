/**
 * React Query hooks for Course data.
 * @module hooks/use-courses
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Course } from '@/types';

export function useCourses() {
  return useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: async () => {
      const res = await fetch('/api/courses');
      if (!res.ok) throw new Error('Failed to fetch courses');
      return res.json();
    },
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      category: string;
      colorHex?: string | null;
    }) => {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create course');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; category?: string; colorHex?: string | null };
    }) => {
      const res = await fetch(`/api/courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update course');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete course');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}
