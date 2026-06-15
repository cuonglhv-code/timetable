import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/authorization';

export async function PATCH(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    // Expecting body to have { tasks: { id: string, order: number, sectionId: string }[] }
    const { tasks } = body;

    if (!Array.isArray(tasks)) {
      return NextResponse.json({ error: 'Invalid payload: tasks must be an array' }, { status: 400 });
    }

    // Run batch updates inside a transaction
    // SQLite does not support multiple isolation levels standardly but we can run a basic transaction
    await prisma.$transaction(
      async (tx) => {
        for (const t of tasks) {
          await tx.task.update({
            where: { id: t.id },
            data: {
              order: t.order,
              sectionId: t.sectionId,
            },
          });
        }
      },
      {
        isolationLevel: 'Serializable', // SQLite or Postgres will execute this reliably
      }
    );

    return NextResponse.json({ success: true, count: tasks.length });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[TASKS_REORDER_PATCH]', error);
    return NextResponse.json({ error: 'Failed to reorder tasks' }, { status: 500 });
  }
}
