import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/authorization';

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const limit  = parseInt(searchParams.get('limit') ?? '50', 10);
    const page   = parseInt(searchParams.get('page')  ?? '0',  10);
    const action = searchParams.get('action') ?? undefined;
    const entity = searchParams.get('entityType') ?? undefined;

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (entity) where.entityType = entity;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: page * limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total, page, limit });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
