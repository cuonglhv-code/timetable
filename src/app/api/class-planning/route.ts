import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/authorization';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';

const createPlanSchema = z.object({
  className: z.string().min(1),
  courseId: z.string(),
  centreId: z.string(),
  teacherId: z.string().nullable().optional(),
  roomId: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  minStudents: z.number().int().min(1).default(15),
  currentStudents: z.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(['CENTRAL_ADMIN', 'ACADEMIC_SUPERVISOR', 'CENTRE_MANAGER']);

    const { searchParams } = new URL(request.url);
    let centreId = searchParams.get('centreId');
    const status = searchParams.get('status');

    if (user.role === 'CENTRE_MANAGER') {
      if (centreId && centreId !== user.centreId) {
        return NextResponse.json({ error: 'Forbidden: Cannot access other centres' }, { status: 403 });
      }
      centreId = user.centreId;
    }

    const plans = await prisma.classOpeningPlan.findMany({
      where: {
        AND: [
          centreId ? { centreId } : {},
          status ? { status } : {},
        ],
      },
      include: {
        course: true,
        centre: true,
        teacher: true,
        room: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(plans);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['CENTRAL_ADMIN', 'CENTRE_MANAGER']);
    const body = await request.json();
    const result = createPlanSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input data', details: result.error.format() }, { status: 400 });
    }

    const data = result.data;

    // Tenancy Check
    if (user.role === 'CENTRE_MANAGER') {
      if (data.centreId !== user.centreId) {
        return NextResponse.json({ error: 'Forbidden: Cannot create plans for other centres' }, { status: 403 });
      }
    }

    // Parse date if provided
    let parsedDate: Date | null = null;
    if (data.date) {
      const [year, month, day] = data.date.split('-').map(Number);
      parsedDate = new Date(Date.UTC(year, month - 1, day));
    }

    const plan = await prisma.classOpeningPlan.create({
      data: {
        className: data.className,
        courseId: data.courseId,
        centreId: data.centreId,
        teacherId: data.teacherId || null,
        roomId: data.roomId || null,
        date: parsedDate,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        minStudents: data.minStudents,
        currentStudents: data.currentStudents,
        status: 'PLANNING',
      },
      include: {
        course: true,
        centre: true,
        teacher: true,
        room: true,
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      entityType: 'ClassOpeningPlan',
      entityId: plan.id,
      entityName: plan.className,
      details: `Created planned class opening: ${plan.className} for course ID ${plan.courseId}`,
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to create opening plan:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
