'use client';

import { AllRequestsView } from './all-requests-view';
import type { Project } from '@/hooks/use-projects';

interface MyRequestsViewProps {
  project: Project;
  user: { id: string; role: string };
}

export function MyRequestsView({ project, user }: MyRequestsViewProps) {
  return <AllRequestsView project={project} user={user} filterByAssigneeId={user.id} />;
}
