import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGoogleCalendarService } from '@/lib/google/calendar-service';
import { requireAuth, canAccessCentre } from '@/lib/auth/authorization';
import { z } from 'zod';

const updateSchema = z.object({
  permission: z.enum(['READER', 'WRITER', 'OWNER']).optional(),
  sendEmailNotification: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function checkShareAccess(shareId: string, user: any) {
  const share = await prisma.calendarShare.findUnique({
    where: { id: shareId },
    include: {
      classSession: {
        include: {
          course: true,
          teacher: true,
          centre: true,
          room: true,
        },
      },
    },
  });

  if (!share) {
    return { error: 'Calendar share not found', status: 404 };
  }

  if (user.role === 'TEACHER' && share.teacherEmail !== user.email) {
    return { error: 'Forbidden', status: 403 };
  }

  if (user.role === 'CENTRE_MANAGER' && user.centreId !== share.classSession.centreId) {
    return { error: 'Forbidden', status: 403 };
  }

  return { share };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const accessCheck = await checkShareAccess(id, user);
    if ('error' in accessCheck) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
    }

    const { share } = accessCheck;

    if (share.status === 'REVOKED') {
      return NextResponse.json(
        { error: 'Cannot update a revoked share' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (validation.data.permission) updateData.permission = validation.data.permission;
    if (validation.data.sendEmailNotification !== undefined) {
      updateData.sendEmailNotification = validation.data.sendEmailNotification;
    }

    if (share.googleEventId && share.teacherEmail) {
      try {
        const service = await getGoogleCalendarService();
        const result = await service.updateEvent(
          share.teacherEmail,
          share.googleEventId,
          share.classSession
        );
        updateData.googleEventId = result.eventId;
        updateData.lastSyncAt = new Date();
        updateData.status = 'SENT';
        updateData.errorMessage = null;
      } catch (error) {
        updateData.status = 'FAILED';
        updateData.errorMessage = error instanceof Error ? error.message : 'Sync failed';
      }
    }

    const updatedShare = await prisma.calendarShare.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedShare);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error updating calendar share:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar share' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const accessCheck = await checkShareAccess(id, user);
    if ('error' in accessCheck) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
    }

    const { share } = accessCheck;

    if (share.googleEventId && share.teacherEmail) {
      try {
        const service = await getGoogleCalendarService();
        await service.deleteEvent(share.teacherEmail, share.googleEventId);
      } catch (error) {
        console.error('Failed to delete Google Calendar event:', error);
      }
    }

    await prisma.calendarShare.update({
      where: { id },
      data: { status: 'REVOKED' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error revoking calendar share:', error);
    return NextResponse.json(
      { error: 'Failed to revoke calendar share' },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const accessCheck = await checkShareAccess(id, user);
    if ('error' in accessCheck) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
    }

    const { share } = accessCheck;

    if (!share.googleEventId || !share.teacherEmail) {
      return NextResponse.json(
        { error: 'Cannot sync: no Google event ID or email' },
        { status: 400 }
      );
    }

    const service = await getGoogleCalendarService();

    try {
      const result = await service.updateEvent(
        share.teacherEmail,
        share.googleEventId,
        share.classSession
      );

      const updatedShare = await prisma.calendarShare.update({
        where: { id },
        data: {
          status: 'SENT',
          lastSyncAt: new Date(),
          errorMessage: null,
          googleEventId: result.eventId,
        },
      });

      return NextResponse.json(updatedShare);
    } catch (error) {
      const updatedShare = await prisma.calendarShare.update({
        where: { id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Sync failed',
        },
      });

      return NextResponse.json(updatedShare, { status: 500 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error syncing calendar share:', error);
    return NextResponse.json(
      { error: 'Failed to sync calendar share' },
      { status: 500 }
    );
  }
}
