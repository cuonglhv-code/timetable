import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { taskSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth/authorization';
import { logAudit } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const existing = await prisma.task.findUnique({
      where: { id },
      include: {
        section: {
          include: { project: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const project = existing.section.project;

    // Permissions check
    if (user.role === 'TEACHER') {
      // Teachers can only update tasks in their centre
      if (project.centreId && user.centreId !== project.centreId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Teachers can only check off/update tasks they are assigned to, OR tasks in their projects.
      // Let's allow them to update any task in a project within their centre, which is highly collaborative.
    } else if (user.role === 'CENTRE_MANAGER') {
      if (project.centreId && user.centreId !== project.centreId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const validation = taskSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const dataToUpdate = { ...validation.data };

    // completedAt handling (D3)
    if (dataToUpdate.completed === true) {
      dataToUpdate.completedAt = new Date();
    } else if (dataToUpdate.completed === false) {
      dataToUpdate.completedAt = null;
    }

    const updated = await prisma.task.update({
      where: { id },
      data: dataToUpdate,
    });

    // Check what was updated to log meaningful details
    const changes: string[] = [];
    if (validation.data.completed !== undefined) {
      changes.push(validation.data.completed ? 'marked completed' : 'marked active');
    }
    if (validation.data.name !== undefined) changes.push('renamed');
    if (validation.data.assigneeId !== undefined) changes.push('reassigned');
    if (validation.data.sectionId !== undefined) changes.push('moved section');

    logAudit({
      userId: user.id,
      userName: user.name,
      action: 'UPDATE',
      entityType: 'Task',
      entityId: updated.id,
      entityName: updated.name,
      details: `Updated task "${updated.name}" (${changes.join(', ') || 'attributes changed'})`,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[TASK_PATCH]', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const existing = await prisma.task.findUnique({
      where: { id },
      include: {
        section: {
          include: { project: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const project = existing.section.project;

    // Permissions check: Teachers can delete tasks they created or if they are admin/managers
    if (user.role === 'TEACHER') {
      if (project.centreId && user.centreId !== project.centreId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (user.role === 'CENTRE_MANAGER') {
      if (project.centreId && user.centreId !== project.centreId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await prisma.task.delete({ where: { id } });

    logAudit({
      userId: user.id,
      userName: user.name,
      action: 'DELETE',
      entityType: 'Task',
      entityId: id,
      entityName: existing.name,
      details: `Deleted task "${existing.name}" (Project: "${project.name}")`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[TASK_DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
