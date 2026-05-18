import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export type Role = 'CENTRAL_ADMIN' | 'CENTRE_MANAGER' | 'ACADEMIC_SUPERVISOR' | 'TEACHER';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  centreId: string | null;
  teacherId: string | null;
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session.user as SessionUser;
}

export async function requireRole(allowedRoles: Role[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden');
  }
  return user;
}

export function canAccessCentre(user: SessionUser, centreId: string): boolean {
  if (user.role === 'CENTRAL_ADMIN' || user.role === 'ACADEMIC_SUPERVISOR') {
    return true;
  }
  if (user.role === 'CENTRE_MANAGER') {
    return user.centreId === centreId;
  }
  return false;
}

export function canDelete(user: SessionUser): boolean {
  return user.role === 'CENTRAL_ADMIN' || user.role === 'CENTRE_MANAGER';
}

export function canDeleteCentre(user: SessionUser): boolean {
  return user.role === 'CENTRAL_ADMIN';
}

export function canDeleteSession(user: SessionUser): boolean {
  return user.role === 'CENTRAL_ADMIN' || user.role === 'CENTRE_MANAGER';
}

export async function getTeacherSessions(user: SessionUser) {
  if (!user.teacherId) {
    return [];
  }
  return prisma.classSession.findMany({
    where: { teacherId: user.teacherId },
    include: {
      course: true,
      teacher: true,
      centre: true,
      room: true,
    },
  });
}
