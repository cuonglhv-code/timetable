import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { startOfWeek, addDays } from 'date-fns';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const centreId = searchParams.get('centreId') ?? undefined;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  weekEnd.setHours(23, 59, 59, 999);

  const sessions = await prisma.classSession.findMany({
    where: {
      ...(centreId ? { centreId } : {}),
      date: { gte: weekStart, lte: weekEnd },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    include: { course: true, teacher: true, centre: true, room: true },
  });

  const centres = await prisma.centre.findMany({ orderBy: { name: 'asc' } });

  return NextResponse.json({ sessions, centres, weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString() });
}
