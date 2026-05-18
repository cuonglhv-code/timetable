/**
 * React Query hooks for Room data.
 * @module hooks/use-rooms
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Room, Centre } from '@/types';

interface RoomWithCentre extends Room {
  centre: Centre;
}

export function useRooms(centreId?: string) {
  return useQuery<RoomWithCentre[]>({
    queryKey: ['rooms', centreId],
    queryFn: async () => {
      const url = centreId ? `/api/rooms?centreId=${centreId}` : '/api/rooms';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json();
    },
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      centreId: string;
      name: string;
      capacity?: number | null;
      isActive?: boolean;
    }) => {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create room');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      if (variables.centreId) {
        queryClient.invalidateQueries({ queryKey: ['rooms', variables.centreId] });
      }
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; capacity?: number | null; isActive?: boolean };
    }) => {
      const res = await fetch(`/api/rooms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update room');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete room');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}
