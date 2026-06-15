import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/authorization';
import { parseDate } from '@/lib/utils';

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
      if (startDate) {
        (where.date as Record<string, unknown>).gte = parseDate(startDate);
      }
      if (endDate) {
        const end = parseDate(endDate);
        end.setUTCHours(23, 59, 59, 999);
        (where.date as Record<string, unknown>).lte = end;
      }
    }

    const sessions = await prisma.classSession.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: { course: true, teacher: true, centre: true, room: true },
    });

    if (format === 'csv') {
      const header = 'Date,Day,Start,End,Class Name,Course,Category,Teacher,Centre,Room,Notes,Status';
      const rows = sessions.map(s => {
        const dateStrDb = s.date instanceof Date ? s.date.toISOString().split('T')[0] : String(s.date).split('T')[0];
        const [y, m, dNum] = dateStrDb.split('-').map(Number);
        const utcDate = new Date(Date.UTC(y, m - 1, dNum));
        
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[utcDate.getUTCDay()];
        const dateFormatted = `${dNum.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
        
        const now = new Date();
        const nowHHmm = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const todayDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        
        let status = 'Planning';
        if (utcDate < todayDate) {
          status = 'Finished';
        } else if (utcDate.getTime() === todayDate.getTime()) {
          if (s.startTime <= nowHHmm && s.endTime > nowHHmm) {
            status = 'On Going';
          } else if (s.endTime <= nowHHmm) {
            status = 'Finished';
          }
        }
        const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
        return [dateFormatted, dayName, s.startTime, s.endTime, s.className, s.course.name, s.course.category,
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
