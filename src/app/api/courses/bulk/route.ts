import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { courseSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth/authorization';
import { z } from 'zod';

const bulkCourseSchema = z.array(courseSchema);

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = bulkCourseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const courses = validation.data;

    const existingCourses = await prisma.course.findMany({
      select: { name: true }
    });
    const existingNames = new Set(existingCourses.map(c => c.name));

    const newCourses = courses.filter(c => !existingNames.has(c.name));

    if (newCourses.length === 0) {
      return NextResponse.json({
        count: 0,
        message: 'No new courses to import (all already exist).'
      }, { status: 200 });
    }

    const result = await prisma.course.createMany({
      data: newCourses.map(c => ({
        name: c.name,
        category: c.category,
        colorHex: c.colorHex ?? null,
        totalSessions: c.totalSessions ?? null,
      })),
    });

    return NextResponse.json({ 
      count: result.count,
      message: `Successfully imported ${result.count} courses.`
    }, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[COURSES_BULK_POST]', error);
    return NextResponse.json({ error: 'Failed to import courses' }, { status: 500 });
  }
}
