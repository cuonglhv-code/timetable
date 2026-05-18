import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { courseSchema } from '@/lib/validators';
import { requireAuth, canDelete } from '@/lib/auth/authorization';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();
    const { id } = await params;

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json(course);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 });
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
    const validation = courseSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const course = await prisma.course.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json(course);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!canDelete(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const sessionCount = await prisma.classSession.count({ where: { courseId: id } });
    if (sessionCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete course with existing sessions' },
        { status: 400 }
      );
    }

    await prisma.course.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
