import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { taskSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth/authorization';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const validation = taskSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const {
      sectionId,
      name,
      description,
      completed,
      order,
      assigneeId,
      dueDateStart,
      dueDateEnd,
      effort,
      category,
      storyPoints,
      priority,
    } = validation.data;

    // Permissions check based on the section and project scope
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { project: true },
    });

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const project = section.project;

    // If teacher, they must belong to the project's centre (if scoped)
    if (user.role === 'TEACHER') {
      if (project.centreId && user.centreId !== project.centreId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (user.role === 'CENTRE_MANAGER') {
      if (project.centreId && user.centreId !== project.centreId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const task = await prisma.$transaction(async (tx) => {
      // Atomic ticket assignment (D2)
      const proj = await tx.project.update({
        where: { id: project.id },
        data: { ticketCounter: { increment: 1 } },
        select: { ticketCounter: true, ticketPrefix: true },
      });

      const ticketId = proj.ticketPrefix
        ? `${proj.ticketPrefix}-${proj.ticketCounter}`
        : `TASK-${proj.ticketCounter}`;

      const completedAt = completed ? new Date() : null; // D3

      return tx.task.create({
        data: {
          sectionId,
          name,
          description: description ?? null,
          completed: completed ?? false,
          order,
          assigneeId: assigneeId ?? null,
          dueDateStart: dueDateStart ?? null,
          dueDateEnd: dueDateEnd ?? null,
          effort: effort ?? null,
          category: category ?? null,
          storyPoints: storyPoints ?? null,
          priority: priority ?? 'MEDIUM',
          completedAt,
          ticketId,
        },
      });
    });

    // Fire-and-forget audit logging
    logAudit({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      entityType: 'Task',
      entityId: task.id,
      entityName: task.name,
      details: `Created task "${task.name}" under section "${section.name}" (Project: "${project.name}")`,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[TASKS_POST]', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
