import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessionSchema, filterSchema } from '@/lib/validators';
import { isTimeOverlap, parseDate } from '@/lib/utils';
import { requireAuth, canAccessCentre, canDeleteSession, getTeacherSessions } from '@/lib/auth/authorization';
import crypto from 'crypto';
import { logAudit } from '@/lib/audit';

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
      if (startDate) (where.date as Record<string, unknown>).gte = parseDate(startDate);
      if (endDate) (where.date as Record<string, unknown>).lte = parseDate(endDate);
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

    const { className, courseId, teacherId, centreId, roomId, date, startTime, endTime, notes, sessionNumber, testType, examDownloadUrl, lmsUrl } =
      validation.data;

    if (user.role === 'CENTRE_MANAGER' && user.centreId !== centreId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { isRecurring, recurringDays, repeatUntil } = body;

    // Execute everything in a SERIALIZABLE transaction to prevent race conditions
    const sessionResult = await prisma.$transaction(async (tx) => {
      if (isRecurring) {
        // Validate recurrence fields
        if (!Array.isArray(recurringDays) || recurringDays.length === 0) {
          throw new Error('Invalid input: recurringDays must be a non-empty array');
        }
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (typeof repeatUntil !== 'string' || !dateRegex.test(repeatUntil)) {
          throw new Error('Invalid input: repeatUntil must be in YYYY-MM-DD format');
        }
        if (repeatUntil < date) {
          throw new Error('Invalid input: repeatUntil must be on or after start date');
        }

        // Generate matching dates
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
          throw new Error('No matching dates found for the selected weekdays within the date range');
        }

        // Check conflicts for all dates inside the transaction
        const conflicts = [];
        for (const d of datesToCreate) {
          const conflict = await checkConflicts(tx, roomId, teacherId, d, startTime, endTime);
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
          const formattedDate = firstConflict.date.split('-').reverse().join('/');
          const conflictTypeLabel = firstConflict.type === 'room' ? 'Room' : 'Teacher';
          const conflictingClassName = firstConflict.session?.className || 'another class';

          return {
            isConflict: true,
            error: `Scheduling conflict detected on ${formattedDate}: ${conflictTypeLabel} is already booked for class "${conflictingClassName}"`,
            conflicts,
          };
        }

        const seriesId = crypto.randomUUID();

        // Create sessions in transaction
        const sessions = [];
        for (const d of datesToCreate) {
          const s = await tx.classSession.create({
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
              seriesId,
              sessionNumber: sessionNumber ?? null,
              testType: testType || null,
              examDownloadUrl: examDownloadUrl || null,
              lmsUrl: lmsUrl || null,
            },
            include: {
              course: true,
              teacher: true,
              centre: true,
              room: true,
            },
          });
          sessions.push(s);
        }

        const firstSession = sessions[0];
        await logAudit({
          userId: user.id,
          userName: user.name,
          action: 'CREATE',
          entityType: 'ClassSession',
          entityId: firstSession.id,
          entityName: className,
          details: `Created recurring session series of ${sessions.length} sessions starting from ${date} until ${repeatUntil} for course "${firstSession.course.name}" (Series ID: ${seriesId})`,
        });

        return { isConflict: false, data: sessions[0], status: 201 };
      } else {
        const dateObj = parseDate(date);
        const conflict = await checkConflicts(tx, roomId, teacherId, dateObj, startTime, endTime);
        
        if (conflict.hasConflict) {
          return {
            isConflict: true,
            error: `Scheduling conflict detected: ${conflict.conflictType === 'room' ? 'Room' : 'Teacher'} is already booked`,
            conflict: conflict.conflictingSession,
            conflictType: conflict.conflictType,
          };
        }

        const session = await tx.classSession.create({
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
            sessionNumber: sessionNumber ?? null,
            testType: testType || null,
            examDownloadUrl: examDownloadUrl || null,
            lmsUrl: lmsUrl || null,
          },
          include: {
            course: true,
            teacher: true,
            centre: true,
            room: true,
          },
        });

        await logAudit({
          userId: user.id,
          userName: user.name,
          action: 'CREATE',
          entityType: 'ClassSession',
          entityId: session.id,
          entityName: className,
          details: `Created single class session on ${date} ${startTime}-${endTime} for course "${session.course.name}"`,
        });

        return { isConflict: false, data: session, status: 201 };
      }
    }, {
      isolationLevel: 'Serializable'
    });

    if (sessionResult.isConflict) {
      return NextResponse.json(
        {
          error: sessionResult.error,
          conflicts: (sessionResult as any).conflicts,
          conflict: (sessionResult as any).conflict,
          conflictType: (sessionResult as any).conflictType
        },
        { status: 409 }
      );
    }

    return NextResponse.json(sessionResult.data, { status: sessionResult.status });

  } catch (error: any) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'Scheduling conflict: Concurrent scheduling action detected. Please try again.' }, { status: 409 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create session' }, { status: 500 });
  }
}

async function checkConflicts(
  tx: any,
  roomId: string,
  teacherId: string,
  date: Date,
  startTime: string,
  endTime: string
) {
  const sessionsOnDate = await tx.classSession.findMany({
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
