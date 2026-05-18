import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGoogleCalendarService } from '@/lib/google/calendar-service';
import { requireAuth, canManageGoogleIntegration, canAccessCentre } from '@/lib/auth/authorization';
import { z } from 'zod';

const integrationSchema = z.object({
  centreId: z.string().min(1, 'Centre is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
  serviceAccountEmail: z.string().email('Invalid service account email'),
  serviceAccountKey: z.string().min(1, 'Service account key is required'),
  verifiedDomain: z.string().min(1, 'Domain is required'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (!canManageGoogleIntegration(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = integrationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { centreId, clientId, clientSecret, serviceAccountEmail, serviceAccountKey, verifiedDomain } =
      validation.data;

    if (!canAccessCentre(user, centreId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const centre = await prisma.centre.findUnique({ where: { id: centreId } });
    if (!centre) {
      return NextResponse.json({ error: 'Centre not found' }, { status: 404 });
    }

    const service = await getGoogleCalendarService();
    const isConnected = await service.testConnection(verifiedDomain);

    if (!isConnected) {
      return NextResponse.json(
        { error: 'Connection test failed. Verify service account and domain-wide delegation.' },
        { status: 400 }
      );
    }

    const integration = await prisma.googleIntegration.upsert({
      where: { centreId },
      create: {
        centreId,
        clientId,
        clientSecret,
        serviceAccountEmail,
        serviceAccountKey,
        verifiedDomain,
        isDomainVerified: true,
      },
      update: {
        clientId,
        clientSecret,
        serviceAccountEmail,
        serviceAccountKey,
        verifiedDomain,
        isDomainVerified: true,
      },
    });

    return NextResponse.json(integration, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error configuring Google integration:', error);
    return NextResponse.json(
      { error: 'Failed to configure Google integration' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const centreId = searchParams.get('centreId');

    if (!centreId) {
      return NextResponse.json(
        { error: 'centreId query parameter is required' },
        { status: 400 }
      );
    }

    const integration = await prisma.googleIntegration.findUnique({
      where: { centreId },
    });

    if (!integration) {
      return NextResponse.json({ configured: false });
    }

    return NextResponse.json({
      configured: true,
      serviceAccountEmail: integration.serviceAccountEmail,
      verifiedDomain: integration.verifiedDomain,
      isDomainVerified: integration.isDomainVerified,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching Google integration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Google integration' },
      { status: 500 }
    );
  }
}
