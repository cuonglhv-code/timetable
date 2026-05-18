import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { roomSchema } from '@/lib/validators';
import { requireAuth, canAccessCentre } from '@/lib/auth/authorization';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const centreId = searchParams.get('centreId');

    const where: Record<string, unknown> = centreId ? { centreId } : {};

    if (user.role === 'CENTRE_MANAGER') {
      where.centreId = user.centreId;
    }

    const rooms = await prisma.room.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        centre: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(rooms);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = roomSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { centreId, name, capacity, isActive } = validation.data;

    if (user.role === 'CENTRE_MANAGER' && user.centreId !== centreId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const centre = await prisma.centre.findUnique({ where: { id: centreId } });
    if (!centre) {
      return NextResponse.json({ error: 'Centre not found' }, { status: 404 });
    }

    const existing = await prisma.room.findFirst({ where: { centreId, name } });
    if (existing) {
      return NextResponse.json(
        { error: 'A room with this name already exists in this centre' },
        { status: 409 }
      );
    }

    const room = await prisma.room.create({
      data: {
        centreId,
        name,
        capacity: capacity ?? null,
        isActive: isActive ?? true,
      },
      include: {
        centre: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}
