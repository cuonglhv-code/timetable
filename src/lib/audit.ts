import { prisma } from './prisma';

interface AuditLogInput {
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'ClassSession' | 'Centre' | 'Teacher' | 'Course' | 'Room' | 'User' | 'ClassOpeningPlan';
  entityId: string;
  entityName: string;
  details?: string | null;
}

/**
 * Creates a new audit log entry.
 * Runs asynchronously without blocking the main request cycle.
 */
export async function logAudit(input: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        userName: input.userName,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: input.entityName,
        details: input.details ?? null,
      },
    });
  } catch (error) {
    console.error('[Audit Logger] Failed to write audit log:', error);
  }
}
