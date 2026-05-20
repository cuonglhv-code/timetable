import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessionSchema, filterSchema } from '@/lib/validators';
import { isTimeOverlap, parseDate } from '@/lib/utils';
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

    const { isRecurring, recurringDays, repeatUntil } = body;

    if (isRecurring) {
      // Validate recurrence fields
      if (!Array.isArray(recurringDays) || recurringDays.length === 0) {
        return NextResponse.json(
          { error: 'Invalid input: recurringDays must be a non-empty array' },
          { status: 400 }
        );
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (typeof repeatUntil !== 'string' || !dateRegex.test(repeatUntil)) {
        return NextResponse.json(
          { error: 'Invalid input: repeatUntil must be in YYYY-MM-DD format' },
          { status: 400 }
        );
      }
      if (repeatUntil < date) {
        return NextResponse.json(
          { error: 'Invalid input: repeatUntil must be on or after start date' },
          { status: 400 }
        );
      }

      // Generate matching dates in timezone-safe literal local format
      const start = parseDate(date);
      const end = parseDate(repeatUntil);
      const datesToCreate: Date[] = [];

      const DAY_MAP: Record<string, number> = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6,
        'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6,
      };

      const targetDays = recurringDays.map((d: string) => {
        const val = DAY_MAP[d.toLowerCase()];
        return val !== undefined ? val : parseInt(d);
      });

      const current = new Date(start);
      while (current <= end) {
        if (targetDays.includes(current.getDay())) {
          datesToCreate.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }

      if (datesToCreate.length === 0) {
        return NextResponse.json(
          { error: 'No matching dates found for the selected weekdays within the date range' },
          { status: 400 }
        );
      }

      // Check conflicts for all dates
      const conflicts = [];
      for (const d of datesToCreate) {
        const conflict = await checkConflicts(roomId, teacherId, d, startTime, endTime);
        if (conflict.hasConflict) {
          conflicts.push({
            date: d.toISOString().split('T')[0],
            type: conflict.conflictType,
            session: conflict.conflictingSession,
          });
        }
      }

      if (conflicts.length > 0) {
        const firstConflict = conflicts[0];
        const formattedDate = firstConflict.date.split('-').reverse().join('/'); // e.g. 21/05/2026
        const conflictTypeLabel = firstConflict.type === 'room' ? 'Room' : 'Teacher';
        const conflictingClassName = firstConflict.session?.className || 'another class';

        return NextResponse.json(
          {
            error: `Scheduling conflict detected on ${formattedDate}: ${conflictTypeLabel} is already booked for class "${conflictingClassName}"`,
            conflicts,
          },
          { status: 409 }
        );
      }

      // Create all sessions in a transaction
      const sessions = await prisma.$transaction(
        datesToCreate.map((d) =>
          prisma.classSession.create({
            data: {
              className,
              courseId,
              teacherId,
              centreId,
              roomId,
              date: d,
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
          })
        )
      );

      // Return the first created session as the main reference response
      return NextResponse.json(sessions[0], { status: 201 });
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
