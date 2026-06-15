import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sectionSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth/authorization';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = sectionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { projectId, name, order } = validation.data;

    // Permissions check
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const isAdmin = user.role === 'CENTRAL_ADMIN' || user.role === 'ACADEMIC_SUPERVISOR';
    const isCreator = project.creatorId === user.id;
    const isManagerOfCentre = user.role === 'CENTRE_MANAGER' && project.centreId === user.centreId;

    if (!isAdmin && !isCreator && !isManagerOfCentre) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const section = await prisma.section.create({
      data: {
        projectId,
        name,
        order,
      },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[SECTIONS_POST]', error);
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}
