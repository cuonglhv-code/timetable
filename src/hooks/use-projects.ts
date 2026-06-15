import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface Task {
  id: string;
  sectionId: string;
  name: string;
  description: string | null;
  completed: boolean;
  order: number;
  assigneeId: string | null;
  assignee: UserSummary | null;
  dueDateStart: string | null;
  dueDateEnd: string | null;
  effort: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  category: string | null;
  ticketId: string | null;
  storyPoints: number | null;
  priority: 'BLOCKER' | 'HIGH' | 'MEDIUM' | 'LOW' | 'TRIVIAL' | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  projectId: string;
  name: string;
  order: number;
  tasks: Task[];
  statusColor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  defaultView: 'LIST' | 'BOARD' | 'CALENDAR' | 'TIMELINE';
  type: 'KANBAN' | 'REQUESTS';
  ticketPrefix: string | null;
  ticketCounter: number;
  status: string | null;
  isFavorited: boolean;
  centreId: string | null;
  creatorId: string;
  creator: UserSummary;
  sections: Section[];
  createdAt: string;
  updatedAt: string;
}

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    },
  });
}

export function useProject(id: string) {
  return useQuery<Project>({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('Failed to fetch project details');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string | null;
      defaultView: 'LIST' | 'BOARD' | 'CALENDAR' | 'TIMELINE';
      type?: 'KANBAN' | 'REQUESTS';
      centreId?: string | null;
    }) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create project');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        description?: string | null;
        defaultView?: 'LIST' | 'BOARD' | 'CALENDAR' | 'TIMELINE';
        centreId?: string | null;
        status?: string | null;
        isFavorited?: boolean;
      };
    }) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update project');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete project');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useCreateSection(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; order: number }) => {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, projectId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create section');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useUpdateSection(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; order?: number };
    }) => {
      const res = await fetch(`/api/sections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update section');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useDeleteSection(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sections/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete section');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      sectionId: string;
      name: string;
      description?: string | null;
      order: number;
      assigneeId?: string | null;
      dueDateStart?: string | null;
      dueDateEnd?: string | null;
      effort?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
      category?: string | null;
      storyPoints?: number | null;
      priority?: 'BLOCKER' | 'HIGH' | 'MEDIUM' | 'LOW' | 'TRIVIAL' | null;
    }) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create task');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        sectionId?: string;
        name?: string;
        description?: string | null;
        completed?: boolean;
        order?: number;
        assigneeId?: string | null;
        dueDateStart?: string | null;
        dueDateEnd?: string | null;
        effort?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
        category?: string | null;
        storyPoints?: number | null;
        priority?: 'BLOCKER' | 'HIGH' | 'MEDIUM' | 'LOW' | 'TRIVIAL' | null;
        completedAt?: string | null;
      };
    }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update task');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete task');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useReorderTasks(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tasks: { id: string; order: number; sectionId: string }[]) => {
      const res = await fetch('/api/tasks/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to reorder tasks');
      }
      return res.json();
    },
    onMutate: async (newOrder) => {
      // Optimistic update of local state before server responds
      await queryClient.cancelQueries({ queryKey: ['project', projectId] });
      const previousProject = queryClient.getQueryData<Project>(['project', projectId]);

      if (previousProject) {
        // Create an optimistic copy with updated section assignments and orders
        const taskMap = new Map(newOrder.map(t => [t.id, t]));
        
        const updatedSections = previousProject.sections.map(section => {
          // Remove tasks that moved to other sections
          const currentTasks = section.tasks.filter(task => {
            const update = taskMap.get(task.id);
            return !update || update.sectionId === section.id;
          });

          // Add tasks that moved into this section
          const incomingTasks = previousProject.sections
            .flatMap(s => s.tasks)
            .filter(task => {
              const update = taskMap.get(task.id);
              return update && update.sectionId === section.id && task.sectionId !== section.id;
            })
            .map(task => ({
              ...task,
              sectionId: section.id,
            }));

          const combined = [...currentTasks, ...incomingTasks];

          // Apply new orders
          combined.forEach(task => {
            const update = taskMap.get(task.id);
            if (update) {
              task.order = update.order;
            }
          });

          return {
            ...section,
            tasks: combined.sort((a, b) => a.order - b.order),
          };
        });

        queryClient.setQueryData<Project>(['project', projectId], {
          ...previousProject,
          sections: updatedSections,
        });
      }

      return { previousProject };
    },
    onError: (_err, _newOrder, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(['project', projectId], context.previousProject);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}
