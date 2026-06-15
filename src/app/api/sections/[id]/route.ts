import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sectionSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth/authorization';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.section.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    // Permissions check
    const isAdmin = user.role === 'CENTRAL_ADMIN' || user.role === 'ACADEMIC_SUPERVISOR';
    const isCreator = existing.project.creatorId === user.id;
    const isManagerOfCentre = user.role === 'CENTRE_MANAGER' && existing.project.centreId === user.centreId;

    if (!isAdmin && !isCreator && !isManagerOfCentre) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = sectionSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const updated = await prisma.section.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[SECTION_PATCH]', error);
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.section.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    // Permissions check
    const isAdmin = user.role === 'CENTRAL_ADMIN' || user.role === 'ACADEMIC_SUPERVISOR';
    const isCreator = existing.project.creatorId === user.id;
    const isManagerOfCentre = user.role === 'CENTRE_MANAGER' && existing.project.centreId === user.centreId;

    if (!isAdmin && !isCreator && !isManagerOfCentre) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.section.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[SECTION_DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
}
