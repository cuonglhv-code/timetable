import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGoogleCalendarService } from '@/lib/google/calendar-service';
import { isValidGoogleEduEmail } from '@/lib/google/domain-validation';
import { requireAuth, canAccessCentre } from '@/lib/auth/authorization';
import { z } from 'zod';

const shareSchema = z.object({
  classSessionId: z.string().min(1, 'Class session is required'),
  teacherEmail: z.string().email('Invalid email'),
  permission: z.enum(['READER', 'WRITER', 'OWNER']).default('READER'),
  sendEmailNotification: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = shareSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { classSessionId, teacherEmail, permission, sendEmailNotification } = validation.data;

    const session = await prisma.classSession.findUnique({
      where: { id: classSessionId },
      include: {
        course: true,
        teacher: true,
        centre: true,
        room: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Class session not found' }, { status: 404 });
    }

    if (user.role === 'CENTRE_MANAGER' && user.centreId !== session.centreId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const integration = await prisma.googleIntegration.findUnique({
      where: { centreId: session.centreId },
    });

    if (!integration || !integration.isDomainVerified) {
      return NextResponse.json(
        { error: 'Google Calendar integration not configured for this centre' },
        { status: 400 }
      );
    }

    if (!isValidGoogleEduEmail(teacherEmail, integration.verifiedDomain)) {
      return NextResponse.json(
        { error: `Email must belong to verified domain: @${integration.verifiedDomain}` },
        { status: 400 }
      );
    }

    const existing = await prisma.calendarShare.findUnique({
      where: {
        classSessionId_teacherEmail: {
          classSessionId,
          teacherEmail,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This class is already shared with this teacher' },
        { status: 409 }
      );
    }

    const service = await getGoogleCalendarService();

    let eventId: string | null = null;
    let htmlLink: string | null = null;

    try {
      const result = await service.createEvent(teacherEmail, session);
      eventId = result.eventId;
      htmlLink = result.htmlLink;
    } catch (error) {
      console.error('Failed to create Google Calendar event:', error);
      const share = await prisma.calendarShare.create({
        data: {
          classSessionId,
          teacherEmail,
          permission,
          sendEmailNotification,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return NextResponse.json(share, { status: 201 });
    }

    const share = await prisma.calendarShare.create({
      data: {
        classSessionId,
        teacherEmail,
        permission,
        sendEmailNotification,
        googleEventId: eventId,
        googleCalendarId: 'primary',
        status: 'SENT',
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.json(share, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error creating calendar share:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar share' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const classSessionId = searchParams.get('classSessionId');
    const teacherEmail = searchParams.get('teacherEmail');

    const where: Record<string, unknown> = {};
    if (classSessionId) where.classSessionId = classSessionId;
    if (teacherEmail) where.teacherEmail = teacherEmail;

    if (user.role === 'TEACHER') {
      where.teacherEmail = user.email;
    } else if (user.role === 'CENTRE_MANAGER' && user.centreId) {
      where.classSession = {
        centreId: user.centreId,
      };
    }

    const shares = await prisma.calendarShare.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(shares);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching calendar shares:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar shares' },
      { status: 500 }
    );
  }
}
