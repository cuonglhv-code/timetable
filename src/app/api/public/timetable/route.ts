import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const centreId = searchParams.get('centreId') ?? undefined;
  const dateParam = searchParams.get('date');

  let referenceDate = new Date();
  if (dateParam) {
    const parts = dateParam.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      // Create date strictly in UTC
      referenceDate = new Date(Date.UTC(year, month, day));
    }
  }

  // Calculate Monday of the week in UTC
  const dayOfWeek = referenceDate.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const utcWeekStart = new Date(Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate() + diff
  ));

  const utcWeekEnd = new Date(utcWeekStart);
  utcWeekEnd.setUTCDate(utcWeekStart.getUTCDate() + 6);
  utcWeekEnd.setUTCHours(23, 59, 59, 999);

  const sessions = await prisma.classSession.findMany({
    where: {
      ...(centreId ? { centreId } : {}),
      date: { gte: utcWeekStart, lte: utcWeekEnd },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    include: { course: true, teacher: true, centre: true, room: true },
  });

  const centres = await prisma.centre.findMany({ orderBy: { name: 'asc' } });

  return NextResponse.json({
    sessions,
    centres,
    weekStart: utcWeekStart.toISOString(),
    weekEnd: utcWeekEnd.toISOString(),
  });
}

