import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/authorization';

export async function GET() {
  try {
    const user = await requireAuth();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const weekStart  = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

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
      where: { ...centreFilter, date: { gte: todayStart, lte: todayEnd } },
      orderBy: [{ startTime: 'asc' }],
      include: { course: true, teacher: true, centre: true, room: true },
    });

    // Active (non-zero) teachers this week
    const activeTeacherIds = await prisma.classSession.findMany({
      where: { ...centreFilter, date: { gte: weekStart, lte: weekEnd } },
      select: { teacherId: true },
      distinct: ['teacherId'],
    });

    // Upcoming 24h sessions
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcoming24h = await prisma.classSession.count({
      where: { ...centreFilter, date: { gte: now, lte: next24h } },
    });

    // Current "on going" — sessions where today is the date and startTime <= now <= endTime
    const nowHHmm = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
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
