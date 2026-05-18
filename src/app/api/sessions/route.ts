import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessionSchema, filterSchema } from '@/lib/validators';
import { isTimeOverlap } from '@/lib/utils';
import { requireAuth, canAccessCentre, canDeleteSession, getTeacherSessions } from '@/lib/auth/authorization';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const centreId = searchParams.get('centreId');
    const teacherId = searchParams.get('teacherId');
    const courseId = searchParams.get('courseId');
    const searchQuery = searchParams.get('searchQuery');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = {};

    if (user.role === 'TEACHER') {
      where.teacherId = user.teacherId;
    } else {
      if (centreId) where.centreId = centreId;
      if (teacherId) where.teacherId = teacherId;
      if (user.role === 'CENTRE_MANAGER' && user.centreId) {
        where.centreId = user.centreId;
      }
    }

    if (courseId) where.courseId = courseId;
    if (searchQuery) {
      where.OR = [
        { className: { contains: searchQuery, mode: 'insensitive' } },
        { course: { name: { contains: searchQuery, mode: 'insensitive' } } },
        { teacher: { name: { contains: searchQuery, mode: 'insensitive' } } },
      ];
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }

    const sessions = await prisma.classSession.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        course: true,
        teacher: true,
        centre: true,
        room: true,
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = sessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { className, courseId, teacherId, centreId, roomId, date, startTime, endTime, notes } =
      validation.data;

    if (user.role === 'CENTRE_MANAGER' && user.centreId !== centreId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dateObj = new Date(date);

    const conflict = await checkConflicts(roomId, teacherId, dateObj, startTime, endTime);
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

    const session = await prisma.classSession.create({
      data: {
        className,
        courseId,
        teacherId,
        centreId,
        roomId,
        date: dateObj,
        startTime,
        endTime,
        notes: notes ?? null,
      },
      include: {
        course: true,
        teacher: true,
        centre: true,
        room: true,
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

async function checkConflicts(
  roomId: string,
  teacherId: string,
  date: Date,
  startTime: string,
  endTime: string
) {
  const sessionsOnDate = await prisma.classSession.findMany({
    where: {
      date,
      OR: [{ roomId }, { teacherId }],
    },
    include: {
      course: true,
      teacher: true,
      centre: true,
      room: true,
    },
  });

  for (const session of sessionsOnDate) {
    if (isTimeOverlap(startTime, endTime, session.startTime, session.endTime)) {
      if (session.roomId === roomId) {
        return {
          hasConflict: true,
          conflictingSession: session,
          conflictType: 'room' as const,
        };
      }
      if (session.teacherId === teacherId) {
        return {
          hasConflict: true,
          conflictingSession: session,
          conflictType: 'teacher' as const,
        };
      }
    }
  }

  return { hasConflict: false, conflictType: 'none' as const };
}
