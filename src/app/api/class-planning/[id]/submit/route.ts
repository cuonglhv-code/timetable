import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/authorization';
import { logAudit } from '@/lib/audit';
import { Prisma } from '@/generated/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function checkConflicts(
  tx: Prisma.TransactionClient,
  roomId: string,
  teacherId: string,
  date: Date,
  startTime: string,
  endTime: string
) {
  const conflicts = await tx.classSession.findMany({
    where: {
      date,
      OR: [
        { roomId },
        { teacherId },
      ],
    },
  });

  for (const session of conflicts) {
    const isOverlap = !(
      endTime <= session.startTime ||
      startTime >= session.endTime
    );
    if (isOverlap) {
      if (session.roomId === roomId) {
        return { hasConflict: true, conflictingSession: session, conflictType: 'room' as const };
      }
      if (session.teacherId === teacherId) {
        return { hasConflict: true, conflictingSession: session, conflictType: 'teacher' as const };
      }
    }
  }
  return { hasConflict: false, conflictType: 'none' as const };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireRole(['CENTRAL_ADMIN', 'CENTRE_MANAGER']);
    const { id } = await params;

    // Execute inside a SERIALIZABLE transaction
    const submissionResult = await prisma.$transaction(async (tx) => {
      // 1. Fetch opening plan
      const plan = await tx.classOpeningPlan.findUnique({
        where: { id },
        include: {
          course: true,
        }
      });

      if (!plan) {
        return { isError: true, error: 'Opening plan not found', status: 404 };
      }

      if (plan.status === 'SUBMITTED') {
        return { isError: true, error: 'Class has already been opened', status: 400 };
      }

      // Tenancy check
      if (user.role === 'CENTRE_MANAGER' && plan.centreId !== user.centreId) {
        return { isError: true, error: 'Forbidden: Tenancy restriction', status: 403 };
      }

      // 2. Validate all criteria are met
      if (!plan.teacherId || !plan.roomId || !plan.date || !plan.startTime || !plan.endTime) {
        return { 
          isError: true, 
          error: 'Criteria incomplete: Teacher, Room, and Date/Time must be specified before opening the class', 
          status: 400 
        };
      }

      // 3. Check for conflicts
      const conflict = await checkConflicts(
        tx,
        plan.roomId,
        plan.teacherId,
        plan.date,
        plan.startTime,
        plan.endTime
      );

      if (conflict.hasConflict) {
        const type = conflict.conflictType === 'room' ? 'Room' : 'Teacher';
        return {
          isConflict: true,
          error: `Scheduling conflict: ${type} is already booked at this date and time`,
          conflict: conflict.conflictingSession,
          conflictType: conflict.conflictType,
          status: 409
        };
      }

      // 4. Create ClassSession
      const session = await tx.classSession.create({
        data: {
          className: plan.className,
          courseId: plan.courseId,
          teacherId: plan.teacherId,
          centreId: plan.centreId,
          roomId: plan.roomId,
          date: plan.date,
          startTime: plan.startTime,
          endTime: plan.endTime,
        },
        include: {
          course: true,
          centre: true,
          teacher: true,
          room: true,
        }
      });

      // 5. Update ClassOpeningPlan status
      const updatedPlan = await tx.classOpeningPlan.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
        },
      });

      // 6. Log Audit Trail
      await logAudit({
        userId: user.id,
        userName: user.name,
        action: 'CREATE',
        entityType: 'ClassSession',
        entityId: session.id,
        entityName: session.className,
        details: `Promoted planned opening class to schedule: ${session.className}`,
      });

      return { isError: false, data: { session, plan: updatedPlan }, status: 200 };
    }, {
      isolationLevel: 'Serializable'
    });

    if (submissionResult.isError) {
      return NextResponse.json({ error: submissionResult.error }, { status: submissionResult.status });
    }

    if (submissionResult.isConflict) {
      return NextResponse.json({
        error: submissionResult.error,
        conflict: submissionResult.conflict,
        conflictType: submissionResult.conflictType
      }, { status: 409 });
    }

    return NextResponse.json(submissionResult.data);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to submit opening plan:', error);
    // Catch serialization conflicts specifically
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'Scheduling conflict: Concurrent database operation. Please try again.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
