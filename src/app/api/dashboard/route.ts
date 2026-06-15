import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/authorization';

export async function GET() {
  try {
    const user = await requireAuth();

    const now = new Date();
    const nowHHmm = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // UTC midnight date representing today (local calendar day)
    const todayDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const todayStr = todayDate.toISOString().split('T')[0];

    // UTC midnight date representing tomorrow
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setUTCDate(todayDate.getUTCDate() + 1);

    // Monday of current week UTC midnight
    const weekStart = new Date(todayDate);
    weekStart.setUTCDate(todayDate.getUTCDate() - todayDate.getUTCDay() + (todayDate.getUTCDay() === 0 ? -6 : 1));

    // Sunday of current week UTC midnight
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

    const centreFilter = user.role === 'CENTRE_MANAGER' && user.centreId
      ? { centreId: user.centreId }
      : user.role === 'TEACHER'
        ? { teacherId: user.teacherId ?? undefined }
        : {};

    // Sessions this week
    const weekSessions = await prisma.classSession.count({
      where: { ...centreFilter, date: { gte: weekStart, lte: weekEnd } },
    });

    // Today's sessions (full detail for the strip)
    const todaySessions = await prisma.classSession.findMany({
      where: { ...centreFilter, date: todayDate },
      orderBy: [{ startTime: 'asc' }],
      include: { course: true, teacher: true, centre: true, room: true },
    });

    // Active (non-zero) teachers this week
    const activeTeacherIds = await prisma.classSession.findMany({
      where: { ...centreFilter, date: { gte: weekStart, lte: weekEnd } },
      select: { teacherId: true },
      distinct: ['teacherId'],
    });

    // Upcoming 24h sessions (computed timezone-safely by fetching today/tomorrow and filtering in memory)
    const upcomingSessions = await prisma.classSession.findMany({
      where: {
        ...centreFilter,
        date: { gte: todayDate, lte: tomorrowDate },
      },
      select: { date: true, startTime: true },
    });

    const upcoming24h = upcomingSessions.filter(s => {
      const sDateStr = s.date.toISOString().split('T')[0];
      if (sDateStr === todayStr) {
        return s.startTime > nowHHmm;
      } else {
        return s.startTime <= nowHHmm;
      }
    }).length;

    // Current "on going" — sessions where today is the date and startTime <= now <= endTime
    const onGoing = todaySessions.filter(s => s.startTime <= nowHHmm && s.endTime > nowHHmm).length;

    // Recent 10 sessions (for an activity-style feed)
    const recentSessions = await prisma.classSession.findMany({
      where: centreFilter,
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { course: true, teacher: true, centre: true, room: true },
    });

    return NextResponse.json({
      kpi: {
        weekSessions,
        activeTeachers: activeTeacherIds.length,
        onGoing,
        upcoming24h,
      },
      todaySessions,
      recentSessions,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
