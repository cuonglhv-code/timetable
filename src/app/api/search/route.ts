import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/authorization';

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim();
    if (!q || q.length < 2) return NextResponse.json([]);

    const search = { contains: q, mode: 'insensitive' as const };

    const [sessions, teachers, courses, centres] = await Promise.all([
      prisma.classSession.findMany({
        where: { OR: [{ className: search }] },
        take: 5,
        include: { course: true, centre: true },
        orderBy: { date: 'desc' },
      }),
      prisma.teacher.findMany({
        where: { OR: [{ name: search }, { email: search }] },
        take: 5,
      }),
      prisma.course.findMany({
        where: { OR: [{ name: search }, { category: search }] },
        take: 5,
      }),
      prisma.centre.findMany({
        where: { name: search },
        take: 3,
      }),
    ]);

    const results = [
      ...sessions.map(s => ({
        type: 'session',
        id: s.id,
        title: s.className,
        subtitle: `${new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${s.startTime} · ${s.centre.name}`,
        color: s.course.colorHex,
      })),
      ...teachers.map(t => ({
        type: 'teacher',
        id: t.id,
        title: t.name,
        subtitle: t.email ?? 'Teacher',
        color: '#34d399',
      })),
      ...courses.map(c => ({
        type: 'course',
        id: c.id,
        title: c.name,
        subtitle: c.category,
        color: c.colorHex ?? '#6366f1',
      })),
      ...centres.map(c => ({
        type: 'centre',
        id: c.id,
        title: c.name,
        subtitle: c.address ?? 'Centre',
        color: '#a78bfa',
      })),
    ];

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
