import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { courseSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth/authorization';

export async function GET() {
  try {
    await requireAuth();

    const courses = await prisma.course.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(courses);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = courseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, category, colorHex } = validation.data;

    const existing = await prisma.course.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: 'A course with this name already exists' },
        { status: 409 }
      );
    }

    const course = await prisma.course.create({
      data: { name, category, colorHex: colorHex ?? null },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
