import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGoogleCalendarService } from '@/lib/google/calendar-service';
import { isValidGoogleEduEmail } from '@/lib/google/domain-validation';
import { requireAuth, canAccessCentre } from '@/lib/auth/authorization';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role === 'TEACHER' || user.role === 'ACADEMIC_SUPERVISOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { centreId } = body;

    if (!centreId) {
      return NextResponse.json(
        { error: 'centreId is required' },
        { status: 400 }
      );
    }

    if (!canAccessCentre(user, centreId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const integration = await prisma.googleIntegration.findUnique({
      where: { centreId },
    });

    if (!integration || !integration.isDomainVerified) {
      return NextResponse.json(
        { error: 'Google Calendar integration not configured for this centre' },
        { status: 400 }
      );
    }

    const pendingShares = await prisma.calendarShare.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        classSession: { centreId },
      },
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

    const service = await getGoogleCalendarService();
    let success = 0;
    let failed = 0;

    for (const share of pendingShares) {
      if (!isValidGoogleEduEmail(share.teacherEmail, integration.verifiedDomain)) {
        await prisma.calendarShare.update({
          where: { id: share.id },
          data: {
            status: 'FAILED',
            errorMessage: `Email not in verified domain: @${integration.verifiedDomain}`,
          },
        });
        failed++;
        continue;
      }

      try {
        let result;
        if (share.googleEventId) {
          result = await service.updateEvent(
            share.teacherEmail,
            share.googleEventId,
            share.classSession
          );
        } else {
          result = await service.createEvent(share.teacherEmail, share.classSession);
        }

        await prisma.calendarShare.update({
          where: { id: share.id },
          data: {
            googleEventId: result.eventId,
            googleCalendarId: 'primary',
            status: 'SENT',
            lastSyncAt: new Date(),
            errorMessage: null,
          },
        });
        success++;
      } catch (error) {
        await prisma.calendarShare.update({
          where: { id: share.id },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Sync failed',
          },
        });
        failed++;
      }
    }

    return NextResponse.json({ success, failed, total: pendingShares.length });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error in batch sync:', error);
    return NextResponse.json(
      { error: 'Failed to perform batch sync' },
      { status: 500 }
    );
  }
}
