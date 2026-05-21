import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/authorization';

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const centreId  = searchParams.get('centreId')  ?? undefined;
    const teacherId = searchParams.get('teacherId') ?? undefined;
    const roomId    = searchParams.get('roomId')    ?? undefined;
    const date      = searchParams.get('date');      // YYYY-MM-DD
    const startTime = searchParams.get('startTime'); // HH:mm
    const endTime   = searchParams.get('endTime');   // HH:mm
    const excludeId = searchParams.get('excludeId') ?? undefined;

    if (!date || !startTime || !endTime) {
      return NextResponse.json({ hasConflict: false, conflicts: [] });
    }

    const [y, m, d] = date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    // Find sessions that overlap: they share the same date and time ranges overlap
    const conflicts = await prisma.classSession.findMany({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        date: dateObj,
        OR: [
          // Incoming session start time falls within an existing session
          { startTime: { lt: endTime }, endTime: { gt: startTime } },
        ],
        ...(centreId || teacherId || roomId ? {
          OR: [
            centreId  ? { centreId }  : {},
            teacherId ? { teacherId } : {},
            roomId    ? { roomId }    : {},
          ],
        } : {}),
      },
      include: { course: true, teacher: true, centre: true, room: true },
    });

    const roomConflicts    = conflicts.filter(s => roomId    && s.roomId    === roomId);
    const teacherConflicts = conflicts.filter(s => teacherId && s.teacherId === teacherId);

    return NextResponse.json({
      hasConflict: conflicts.length > 0,
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
