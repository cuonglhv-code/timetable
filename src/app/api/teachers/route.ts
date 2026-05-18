import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { teacherSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth/authorization';

export async function GET() {
  try {
    await requireAuth();

    const teachers = await prisma.teacher.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(teachers);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = teacherSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, email, phone, isActive } = validation.data;

    if (email) {
      const existing = await prisma.teacher.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json(
          { error: 'A teacher with this email already exists' },
          { status: 409 }
        );
      }
    }

    const teacher = await prisma.teacher.create({
      data: {
        name,
        email: email ?? null,
        phone: phone ?? null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(teacher, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create teacher' }, { status: 500 });
  }
}
