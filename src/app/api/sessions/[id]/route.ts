import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessionSchema } from '@/lib/validators';
import { isTimeOverlap } from '@/lib/utils';
import { requireAuth, canAccessCentre, canDeleteSession } from '@/lib/auth/authorization';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const session = await prisma.classSession.findUnique({
      where: { id },
      include: { course: true, teacher: true, centre: true, room: true },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (user.role === 'TEACHER' && session.teacherId !== user.teacherId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (user.role === 'CENTRE_MANAGER' && user.centreId !== session.centreId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = sessionSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.classSession.findUnique({
      where: { id },
      include: { course: true, teacher: true, centre: true, room: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (user.role === 'CENTRE_MANAGER' && user.centreId !== existing.centreId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const roomId = validation.data.roomId ?? existing.roomId;
    const teacherId = validation.data.teacherId ?? existing.teacherId;
    const date = validation.data.date ? new Date(validation.data.date) : existing.date;
    const startTime = validation.data.startTime ?? existing.startTime;
    const endTime = validation.data.endTime ?? existing.endTime;

    const conflict = await checkConflicts(id, roomId, teacherId, date, startTime, endTime);
    if (conflict.hasConflict) {
      return NextResponse.json(
        {
          error: `Scheduling conflict detected: ${conflict.conflictType === 'room' ? 'Room' : 'Teacher'} is already booked`,
          conflict: conflict.conflictingSession,
          conflictType: conflict.conflictType,
        },
        { status: 409 }
      );
    }

    const session = await prisma.classSession.update({
      where: { id },
      data: {
        ...validation.data,
        date: validation.data.date ? new Date(validation.data.date) : undefined,
        notes: validation.data.notes ?? existing.notes,
      },
      include: { course: true, teacher: true, centre: true, room: true },
    });

    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!canDeleteSession(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.classSession.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (user.role === 'CENTRE_MANAGER' && user.centreId !== existing.centreId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.classSession.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}

async function checkConflicts(
  excludeId: string,
  roomId: string,
  teacherId: string,
  date: Date,
  startTime: string,
  endTime: string
) {
  const sessionsOnDate = await prisma.classSession.findMany({
    where: {
      id: { not: excludeId },
      date,
      OR: [{ roomId }, { teacherId }],
    },
    include: { course: true, teacher: true, centre: true, room: true },
  });

  for (const session of sessionsOnDate) {
    if (isTimeOverlap(startTime, endTime, session.startTime, session.endTime)) {
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
