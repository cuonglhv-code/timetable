import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/authorization';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const updateUserSchema = z.object({
  email: z.string().email('Invalid email').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  role: z.enum(['CENTRAL_ADMIN', 'CENTRE_MANAGER', 'ACADEMIC_SUPERVISOR', 'TEACHER']).optional(),
  centreId: z.string().nullable().optional(),
  teacherId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireRole(['CENTRAL_ADMIN']);
    const { id } = await params;

    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (validation.data.email) updateData.email = validation.data.email;
    if (validation.data.name) updateData.name = validation.data.name;
    if (validation.data.role) updateData.role = validation.data.role;
    if (validation.data.centreId !== undefined) updateData.centreId = validation.data.centreId;
    if (validation.data.teacherId !== undefined) updateData.teacherId = validation.data.teacherId;
    if (validation.data.isActive !== undefined) updateData.isActive = validation.data.isActive;
    if (validation.data.password) {
      updateData.password = await bcrypt.hash(validation.data.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        centreId: true,
        teacherId: true,
        isActive: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireRole(['CENTRAL_ADMIN']);
    const { id } = await params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
