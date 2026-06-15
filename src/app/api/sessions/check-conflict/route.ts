import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/authorization';
import { parseDate } from '@/lib/utils';

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId') ?? undefined;
    const roomId    = searchParams.get('roomId')    ?? undefined;
    const date      = searchParams.get('date');      // YYYY-MM-DD
    const startTime = searchParams.get('startTime'); // HH:mm
    const endTime   = searchParams.get('endTime');   // HH:mm
    const excludeId = searchParams.get('excludeId') ?? undefined;

    if (!date || !startTime || !endTime) {
      return NextResponse.json({
        hasConflict: false,
        conflicts: [],
        roomConflicts: [],
        teacherConflicts: [],
        totalConflicts: 0,
      });
    }

    const dateObj = parseDate(date);

    // Build filters specifically for room or teacher to avoid empty object matches in OR
    const orConditions: Record<string, string>[] = [];
    if (roomId) orConditions.push({ roomId });
    if (teacherId) orConditions.push({ teacherId });

    if (orConditions.length === 0) {
      return NextResponse.json({
        hasConflict: false,
        conflicts: [],
        roomConflicts: [],
        teacherConflicts: [],
        totalConflicts: 0,
      });
    }

    // Find sessions that overlap: they share the same date and time ranges overlap
    const conflicts = await prisma.classSession.findMany({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        date: dateObj,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        OR: orConditions,
      },
      include: { course: true, teacher: true, centre: true, room: true },
    });

    const roomConflicts    = conflicts.filter(s => roomId    && s.roomId    === roomId);
    const teacherConflicts = conflicts.filter(s => teacherId && s.teacherId === teacherId);

    return NextResponse.json({
      hasConflict: roomConflicts.length > 0 || teacherConflicts.length > 0,
      roomConflicts,
      teacherConflicts,
      totalConflicts: conflicts.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to check conflicts' }, { status: 500 });
  }
}

