import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { centreSchema } from '@/lib/validators';
import { requireAuth, canDeleteCentre, canAccessCentre } from '@/lib/auth/authorization';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const centre = await prisma.centre.findUnique({
      where: { id },
      include: {
        rooms: { where: { isActive: true }, orderBy: { name: 'asc' } },
      },
    });

    if (!centre) {
      return NextResponse.json({ error: 'Centre not found' }, { status: 404 });
    }

    if (!canAccessCentre(user, centre.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(centre);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch centre' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (user.role === 'TEACHER' || user.role === 'ACADEMIC_SUPERVISOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = centreSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.centre.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Centre not found' }, { status: 404 });
    }

    if (!canAccessCentre(user, existing.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const centre = await prisma.centre.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json(centre);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update centre' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!canDeleteCentre(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.centre.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Centre not found' }, { status: 404 });
    }

    const roomCount = await prisma.room.count({ where: { centreId: id } });
    if (roomCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete centre with existing rooms' },
        { status: 400 }
      );
    }

    await prisma.centre.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete centre' }, { status: 500 });
  }
}
