import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/authorization';

export async function GET() {
  try {
    await requireAuth();

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(weekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekEnd);
    prevWeekEnd.setDate(weekEnd.getDate() - 7);

    const teachers = await prisma.teacher.findMany({
      where: { isActive: true },
      include: {
        sessions: {
          where: { date: { gte: weekStart, lte: weekEnd } },
          include: { course: true, centre: true, room: true },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });

    // Compute weekly hours per teacher
    const result = teachers.map(teacher => {
      let totalMins = 0;
      for (const s of teacher.sessions) {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        totalMins += (eh * 60 + em) - (sh * 60 + sm);
      }
      return {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        weeklyMinutes: totalMins,
        weeklyHours: Math.round((totalMins / 60) * 10) / 10,
        sessionCount: teacher.sessions.length,
        sessions: teacher.sessions,
      };
    });

    return NextResponse.json({ teachers: result, weekStart: weekStart.toISOString() });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
