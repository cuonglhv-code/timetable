import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { roomSchema } from '@/lib/validators';
import { requireAuth, canAccessCentre, canDelete } from '@/lib/auth/authorization';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const room = await prisma.room.findUnique({
      where: { id },
      include: { centre: { select: { id: true, name: true } } },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (user.role === 'CENTRE_MANAGER' && user.centreId !== room.centreId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(room);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = roomSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.room.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (user.role === 'CENTRE_MANAGER' && user.centreId !== existing.centreId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const room = await prisma.room.update({
      where: { id },
      data: validation.data,
      include: { centre: { select: { id: true, name: true } } },
    });

    return NextResponse.json(room);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!canDelete(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.room.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (user.role === 'CENTRE_MANAGER' && user.centreId !== existing.centreId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sessionCount = await prisma.classSession.count({ where: { roomId: id } });
    if (sessionCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete room with existing sessions' },
        { status: 400 }
      );
    }

    await prisma.room.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
  }
}
