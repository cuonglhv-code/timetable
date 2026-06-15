import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { projectSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth/authorization';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    const user = await requireAuth();

    // Filter projects based on roles and centre scoping
    let whereClause = {};
    if (user.role === 'TEACHER' || user.role === 'CENTRE_MANAGER') {
      if (user.centreId) {
        whereClause = {
          OR: [
            { centreId: user.centreId },
            { centreId: null },
          ],
        };
      } else {
        // Scoped user with no centre can only see global projects
        whereClause = { centreId: null };
      }
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[PROJECTS_GET]', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = projectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, description, defaultView, type, centreId } = validation.data;

    // Verify centre scoping permission
    if (centreId && user.role === 'CENTRE_MANAGER' && user.centreId !== centreId) {
      return NextResponse.json({ error: 'Forbidden centre scope' }, { status: 403 });
    }

    // Create project and sections inside a transaction
    const project = await prisma.$transaction(async (tx) => {
      // Collision softening at creation time:
      let prefix = name.replace(/\s+/g, '').slice(0, 4).toUpperCase();
      if (!prefix) {
        prefix = 'PROJ';
      }
      let ticketPrefix = prefix;
      let suffix = 2;
      while (await tx.project.findFirst({ where: { centreId: centreId ?? null, ticketPrefix } })) {
        ticketPrefix = `${prefix}${suffix++}`;
      }

      const proj = await tx.project.create({
        data: {
          name,
          description: description ?? null,
          defaultView,
          type,
          centreId: centreId ?? null,
          creatorId: user.id,
          ticketPrefix,
        },
      });

      if (type === 'REQUESTS') {
        // Seed REQUESTS columns with statusColor
        await tx.section.createMany({
          data: [
            { projectId: proj.id, name: 'Not started', order: 1000, statusColor: '#3b82f6' },
            { projectId: proj.id, name: 'In progress', order: 2000, statusColor: '#f59e0b' },
            { projectId: proj.id, name: 'Pending',     order: 3000, statusColor: '#f97316' },
            { projectId: proj.id, name: 'Complete',    order: 4000, statusColor: '#22c55e' },
          ],
        });
      } else {
        // Seed three default Kanban columns
        await tx.section.createMany({
          data: [
            { projectId: proj.id, name: 'To Do',       order: 1000 },
            { projectId: proj.id, name: 'In Progress',  order: 2000 },
            { projectId: proj.id, name: 'Done',         order: 3000 },
          ],
        });
      }

      return proj;
    });

    // Fire-and-forget audit logging
    logAudit({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      entityType: 'Project',
      entityId: project.id,
      entityName: project.name,
      details: `Created project: ${project.name} (${defaultView} view, type ${type})`,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[PROJECTS_POST]', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
