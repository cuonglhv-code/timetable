import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth/authorization';

const MAX_HOURS_WARNING = 25;
const DAILY_OPERATING_HOURS = 12; // 8:00 to 20:00

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user and verify permission (must be CENTRAL_ADMIN, ACADEMIC_SUPERVISOR, or CENTRE_MANAGER)
    const user = await requireRole(['CENTRAL_ADMIN', 'ACADEMIC_SUPERVISOR', 'CENTRE_MANAGER']);

    const { searchParams } = new URL(request.url);
    let centreId = searchParams.get('centreId');
    const courseId = searchParams.get('courseId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const format = searchParams.get('format');

    // 2. Strict tenancy filter check for CENTRE_MANAGER
    if (user.role === 'CENTRE_MANAGER') {
      if (centreId && centreId !== user.centreId) {
        return NextResponse.json({ error: 'Forbidden: Cannot access other centres' }, { status: 403 });
      }
      centreId = user.centreId; // Force filter to manager's centre
    }

    // 3. Resolve date range. Default to current week (Mon-Sun)
    const now = new Date();
    let start = new Date(now);
    if (startDateParam) {
      start = new Date(startDateParam);
    } else {
      // Monday of current week
      start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
      start.setHours(0, 0, 0, 0);
    }

    let end = new Date(start);
    if (endDateParam) {
      end = new Date(endDateParam);
    } else {
      // Sunday of current week
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    }

    // Days count for capacity calculations
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const daysCount = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 1);

    // 4. Query Teacher Workloads
    const teachers = await prisma.teacher.findMany({
      where: { isActive: true },
      include: {
        sessions: {
          where: {
            date: { gte: start, lte: end },
            AND: [
              centreId ? { centreId } : {},
              courseId ? { courseId } : {},
            ],
          },
          include: { course: true, centre: true, room: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const teacherMetrics = teachers.map(teacher => {
      let totalMins = 0;
      const centreHours: Record<string, number> = {};
      const courseNames = new Set<string>();

      for (const s of teacher.sessions) {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        const duration = (eh * 60 + em) - (sh * 60 + sm);
        totalMins += duration;

        // Track primary centre
        const cName = s.centre.name;
        centreHours[cName] = (centreHours[cName] || 0) + duration;
        
        // Track courses
        courseNames.add(s.course.name);
      }

      const weeklyHours = Math.round((totalMins / 60) * 10) / 10;
      let status = 'NORMAL';
      if (weeklyHours === 0) {
        status = 'VOID';
      } else if (weeklyHours > MAX_HOURS_WARNING) {
        status = 'OVERLOADED';
      }

      // Find primary center (highest hours)
      let primaryCentre = 'None';
      let maxCentreHours = -1;
      for (const [cName, hours] of Object.entries(centreHours)) {
        if (hours > maxCentreHours) {
          maxCentreHours = hours;
          primaryCentre = cName;
        }
      }

      return {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email || 'N/A',
        phone: teacher.phone || 'N/A',
        weeklyHours,
        sessionCount: teacher.sessions.length,
        status,
        overloadHours: Math.max(0, Math.round((weeklyHours - MAX_HOURS_WARNING) * 10) / 10),
        primaryCentre,
        courses: Array.from(courseNames),
      };
    });

    // 5. Query Centre Capacity Utilization
    const centres = await prisma.centre.findMany({
      where: centreId ? { id: centreId } : {},
      include: {
        rooms: {
          where: { isActive: true },
        },
        sessions: {
          where: {
            date: { gte: start, lte: end },
            AND: [
              courseId ? { courseId } : {},
            ],
          },
          include: { room: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const centreMetrics = centres.map(centre => {
      const activeRooms = centre.rooms.length;
      const totalCapacity = centre.rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
      
      let totalMinsBooked = 0;
      for (const s of centre.sessions) {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        totalMinsBooked += (eh * 60 + em) - (sh * 60 + sm);
      }

      const hoursBooked = Math.round((totalMinsBooked / 60) * 10) / 10;
      // Total operating slots = active rooms * 12 hours/day * number of days in range
      const maxPossibleHours = activeRooms * DAILY_OPERATING_HOURS * daysCount;
      const utilizationRate = maxPossibleHours > 0
        ? Math.round((hoursBooked / maxPossibleHours) * 1000) / 10
        : 0;

      return {
        id: centre.id,
        name: centre.name,
        activeRooms,
        totalCapacity,
        hoursBooked,
        maxPossibleHours,
        utilizationRate,
      };
    });

    // 6. Return response based on format (JSON or CSV)
    if (format === 'csv') {
      const csvRows: string[] = [];
      
      // Header Info
      csvRows.push('"Report: Teacher Workload & Workforce Analytics"');
      csvRows.push(`"Period: ${start.toLocaleDateString('en-GB')} to ${end.toLocaleDateString('en-GB')}"`);
      csvRows.push(`"Generated At: ${new Date().toLocaleString('en-GB')}"`);
      csvRows.push('');
      
      // Section 1: Teacher Workloads
      csvRows.push('"1. TEACHER WORKLOAD ANALYSIS"');
      csvRows.push('"Teacher Name","Email","Phone","Workload Hours","Sessions","Status","Overload Hours (Thresh: 25h)","Primary Centre","Associated Courses"');
      
      for (const t of teacherMetrics) {
        const escapedName = `"${t.name.replace(/"/g, '""')}"`;
        const escapedEmail = `"${t.email.replace(/"/g, '""')}"`;
        const escapedPhone = `"${t.phone.replace(/"/g, '""')}"`;
        const escapedPrimaryCentre = `"${t.primaryCentre.replace(/"/g, '""')}"`;
        const escapedCourses = `"${t.courses.join(', ').replace(/"/g, '""')}"`;
        
        csvRows.push(
          `${escapedName},${escapedEmail},${escapedPhone},${t.weeklyHours},${t.sessionCount},"${t.status}",${t.overloadHours},${escapedPrimaryCentre},${escapedCourses}`
        );
      }
      
      csvRows.push('');
      
      // Section 2: Centre Capacity Utilization
      csvRows.push('"2. CENTRE UTILIZATION SUMMARY"');
      csvRows.push('"Centre Name","Active Rooms","Total Room Capacity","Total Hours Booked","Max Operating Hours","Utilization Rate (%)"');
      
      for (const c of centreMetrics) {
        const escapedName = `"${c.name.replace(/"/g, '""')}"`;
        csvRows.push(
          `${escapedName},${c.activeRooms},${c.totalCapacity},${c.hoursBooked},${c.maxPossibleHours},"${c.utilizationRate}%"`
        );
      }

      const csvContent = csvRows.join('\n');
      
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="workforce_analytics_report_${start.toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Default response: JSON
    return NextResponse.json({
      timeRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      teacherMetrics,
      centreMetrics,
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to generate report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
