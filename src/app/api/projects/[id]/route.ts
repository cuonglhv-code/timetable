import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { projectSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth/authorization';
import { logAudit } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
              include: {
                assignee: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Role-based security check for reading the project
    if (project.centreId && (user.role === 'TEACHER' || user.role === 'CENTRE_MANAGER')) {
      if (user.centreId !== project.centreId) {
        return NextResponse.json({ error: 'Forbidden centre access' }, { status: 403 });
      }
    }

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[PROJECT_GET]', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Permissions check
    const isCreator = existing.creatorId === user.id;
    const isAdmin = user.role === 'CENTRAL_ADMIN' || user.role === 'ACADEMIC_SUPERVISOR';
    const isManagerOfCentre = user.role === 'CENTRE_MANAGER' && existing.centreId === user.centreId;

    if (!isCreator && !isAdmin && !isManagerOfCentre) {
      return NextResponse.json({ error: 'Forbidden project modification' }, { status: 403 });
    }

    const body = await request.json();
    const validation = projectSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const updated = await prisma.project.update({
      where: { id },
      data: validation.data,
    });

    logAudit({
      userId: user.id,
      userName: user.name,
      action: 'UPDATE',
      entityType: 'Project',
      entityId: updated.id,
      entityName: updated.name,
      details: `Updated project fields: ${Object.keys(validation.data).join(', ')}`,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[PROJECT_PATCH]', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Permissions check
    const isCreator = existing.creatorId === user.id;
    const isAdmin = user.role === 'CENTRAL_ADMIN' || user.role === 'ACADEMIC_SUPERVISOR';
    const isManagerOfCentre = user.role === 'CENTRE_MANAGER' && existing.centreId === user.centreId;

    if (!isCreator && !isAdmin && !isManagerOfCentre) {
      return NextResponse.json({ error: 'Forbidden project deletion' }, { status: 403 });
    }

    await prisma.project.delete({ where: { id } });

    logAudit({
      userId: user.id,
      userName: user.name,
      action: 'DELETE',
      entityType: 'Project',
      entityId: id,
      entityName: existing.name,
      details: `Deleted project: ${existing.name}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[PROJECT_DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
