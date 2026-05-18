import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { centreSchema } from '@/lib/validators';
import { requireAuth, canDeleteCentre } from '@/lib/auth/authorization';

export async function GET() {
  try {
    await requireAuth();

    const centres = await prisma.centre.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { rooms: true },
        },
      },
    });

    return NextResponse.json(centres);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch centres' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = centreSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, address } = validation.data;

    const existing = await prisma.centre.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: 'A centre with this name already exists' },
        { status: 409 }
      );
    }

    const centre = await prisma.centre.create({
      data: { name, address: address ?? null },
    });

    return NextResponse.json(centre, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create centre' }, { status: 500 });
  }
}
