import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/authorization';

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const format    = searchParams.get('format') ?? 'csv';   // 'csv'
    const startDate = searchParams.get('startDate');
    const endDate   = searchParams.get('endDate');
    const centreId  = searchParams.get('centreId') ?? undefined;
    const teacherId = searchParams.get('teacherId') ?? undefined;

    const where: Record<string, unknown> = {};
    if (centreId)  where.centreId  = centreId;
    if (teacherId) where.teacherId = teacherId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) { const [y,m,d] = startDate.split('-').map(Number); (where.date as Record<string,unknown>).gte = new Date(y, m-1, d); }
      if (endDate)   { const [y,m,d] = endDate.split('-').map(Number);   (where.date as Record<string,unknown>).lte = new Date(y, m-1, d, 23, 59, 59); }
    }

    const sessions = await prisma.classSession.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: { course: true, teacher: true, centre: true, room: true },
    });

    if (format === 'csv') {
      const header = 'Date,Day,Start,End,Class Name,Course,Category,Teacher,Centre,Room,Notes,Status';
      const rows = sessions.map(s => {
        const d = new Date(s.date);
        const day = d.toLocaleDateString('en-GB', { weekday: 'long' });
        const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const now = new Date();
        const nowHHmm = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
        let status = 'Planning';
        if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) status = 'Finished';
        else if (d.toDateString() === now.toDateString() && s.startTime <= nowHHmm && s.endTime > nowHHmm) status = 'On Going';
        const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
        return [dateStr, day, s.startTime, s.endTime, s.className, s.course.name, s.course.category,
                s.teacher.name, s.centre.name, s.room.name, s.notes ?? '', status].map(escape).join(',');
      });
      const csv = [header, ...rows].join('\n');
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="timetable-${startDate ?? 'all'}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
