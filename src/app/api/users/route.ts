import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, type Role } from '@/lib/auth/authorization';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['CENTRAL_ADMIN', 'CENTRE_MANAGER', 'ACADEMIC_SUPERVISOR', 'TEACHER']),
  centreId: z.string().nullable().optional(),
  teacherId: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(['CENTRAL_ADMIN']);

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as Role | null;
    const centreId = searchParams.get('centreId');

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (centreId) where.centreId = centreId;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        centreId: true,
        teacherId: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['CENTRAL_ADMIN']);

    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { email, password, name, role, centreId, teacherId } = validation.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        centreId: centreId ?? null,
        teacherId: teacherId ?? null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        centreId: true,
        teacherId: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
