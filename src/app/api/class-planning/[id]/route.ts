import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/authorization';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';

const updatePlanSchema = z.object({
  className: z.string().min(1).optional(),
  courseId: z.string().optional(),
  centreId: z.string().optional(),
  teacherId: z.string().nullable().optional(),
  roomId: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  minStudents: z.number().int().min(1).optional(),
  currentStudents: z.number().int().min(0).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireRole(['CENTRAL_ADMIN', 'CENTRE_MANAGER']);
    const { id } = await params;
    const body = await request.json();
    const result = updatePlanSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input data', details: result.error.format() }, { status: 400 });
    }

    const data = result.data;

    // Fetch existing plan to check tenancy
    const existing = await prisma.classOpeningPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Opening plan not found' }, { status: 404 });
    }

    if (existing.status === 'SUBMITTED') {
      return NextResponse.json({ error: 'Cannot modify a plan that has already been submitted' }, { status: 400 });
    }

    if (user.role === 'CENTRE_MANAGER') {
      if (existing.centreId !== user.centreId || (data.centreId && data.centreId !== user.centreId)) {
        return NextResponse.json({ error: 'Forbidden: Tenancy boundary restriction' }, { status: 403 });
      }
    }

    // Parse date if provided
    let parsedDate: Date | null | undefined = undefined;
    if (data.date === null) {
      parsedDate = null;
    } else if (data.date !== undefined) {
      const [year, month, day] = data.date.split('-').map(Number);
      parsedDate = new Date(Date.UTC(year, month - 1, day));
    }

    const plan = await prisma.classOpeningPlan.update({
      where: { id },
      data: {
        className: data.className,
        courseId: data.courseId,
        centreId: data.centreId,
        teacherId: data.teacherId !== undefined ? data.teacherId : undefined,
        roomId: data.roomId !== undefined ? data.roomId : undefined,
        date: parsedDate,
        startTime: data.startTime !== undefined ? data.startTime : undefined,
        endTime: data.endTime !== undefined ? data.endTime : undefined,
        minStudents: data.minStudents,
        currentStudents: data.currentStudents,
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
      action: 'UPDATE',
      entityType: 'ClassOpeningPlan',
      entityId: plan.id,
      entityName: plan.className,
      details: `Updated planned class opening: ${plan.className}`,
    });

    return NextResponse.json(plan);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to update opening plan:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireRole(['CENTRAL_ADMIN', 'CENTRE_MANAGER']);
    const { id } = await params;

    const existing = await prisma.classOpeningPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Opening plan not found' }, { status: 404 });
    }

    if (existing.status === 'SUBMITTED') {
      return NextResponse.json({ error: 'Cannot delete a plan that has already been submitted' }, { status: 400 });
    }

    if (user.role === 'CENTRE_MANAGER') {
      if (existing.centreId !== user.centreId) {
        return NextResponse.json({ error: 'Forbidden: Tenancy boundary restriction' }, { status: 403 });
      }
    }

    await prisma.classOpeningPlan.delete({
      where: { id },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'DELETE',
      entityType: 'ClassOpeningPlan',
      entityId: id,
      entityName: existing.className,
      details: `Deleted planned class opening: ${existing.className}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to delete opening plan:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
