'use client';

import { BoardView } from './board-view';
import type { Project } from '@/hooks/use-projects';

interface MyTasksViewProps {
  project: Project;
  user: { id: string; role: string };
  onClearAssigneeFilter?: () => void;
}

export function MyTasksView({ project, user, onClearAssigneeFilter }: MyTasksViewProps) {
  return <BoardView project={project} user={user} filterByAssigneeId={user.id} onClearAssigneeFilter={onClearAssigneeFilter} />;
}
