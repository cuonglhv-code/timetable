/**
 * React Query hooks for Centre data.
 * @module hooks/use-centres
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Centre } from '@/types';

export function useCentres() {
  return useQuery<Centre[]>({
    queryKey: ['centres'],
    queryFn: async () => {
      const res = await fetch('/api/centres');
      if (!res.ok) throw new Error('Failed to fetch centres');
      return res.json();
    },
  });
}

export function useCreateCentre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; address?: string | null }) => {
      const res = await fetch('/api/centres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create centre');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centres'] });
    },
  });
}

export function useUpdateCentre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; address?: string | null };
    }) => {
      const res = await fetch(`/api/centres/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update centre');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centres'] });
    },
  });
}

export function useDeleteCentre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/centres/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete centre');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centres'] });
    },
  });
}
