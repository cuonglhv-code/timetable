import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { teacherSchema } from '@/lib/validators';
import { requireAuth, canDelete } from '@/lib/auth/authorization';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();
    const { id } = await params;

    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    return NextResponse.json(teacher);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch teacher' }, { status: 500 });
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
    const validation = teacherSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.teacher.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    if (validation.data.email) {
      const emailExists = await prisma.teacher.findFirst({
        where: { email: validation.data.email, id: { not: id } },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: 'A teacher with this email already exists' },
          { status: 409 }
        );
      }
    }

    const teacher = await prisma.teacher.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json(teacher);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update teacher' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!canDelete(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.teacher.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const sessionCount = await prisma.classSession.count({ where: { teacherId: id } });
    if (sessionCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete teacher with existing sessions' },
        { status: 400 }
      );
    }

    await prisma.teacher.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete teacher' }, { status: 500 });
  }
}
