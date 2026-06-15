import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/class-planning/route';
import { POST as submitPOST } from '@/app/api/class-planning/[id]/submit/route';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/authorization';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    classOpeningPlan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    classSession: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}));

type RequireRoleResolved = Awaited<ReturnType<typeof requireRole>>;

describe('Class Planning API Collection & CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET should list opening plans and restrict tenancy for CENTRE_MANAGER', async () => {
    vi.mocked(requireRole).mockResolvedValue({
      id: 'manager-1',
      name: 'Manager A',
      role: 'CENTRE_MANAGER',
      centreId: 'centre-1',
    } as unknown as RequireRoleResolved);

    // 1. Success case: requesting their own centre
    const req = new NextRequest('http://localhost/api/class-planning?centreId=centre-1');
    await GET(req);
    expect(prisma.classOpeningPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { centreId: 'centre-1' }
          ])
        })
      })
    );

    // 2. Tenancy boundary breach case: requesting another centre
    const reqBreach = new NextRequest('http://localhost/api/class-planning?centreId=centre-2');
    const resBreach = await GET(reqBreach);
    expect(resBreach.status).toBe(403);
  });

  it('POST should create plan and block invalid tenancy', async () => {
    vi.mocked(requireRole).mockResolvedValue({
      id: 'manager-1',
      name: 'Manager A',
      role: 'CENTRE_MANAGER',
      centreId: 'centre-1',
    } as unknown as RequireRoleResolved);

    const body = {
      className: 'IELTS Course Plan A',
      courseId: 'course-123',
      centreId: 'centre-2', // Breach attempt
    };

    const req = new NextRequest('http://localhost/api/class-planning', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});

describe('Class Planning Submission & Conflict Checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submitPOST should return 400 if plan resources are not fully specified', async () => {
    vi.mocked(requireRole).mockResolvedValue({
      id: 'manager-1',
      name: 'Manager A',
      role: 'CENTRE_MANAGER',
      centreId: 'centre-1',
    } as unknown as RequireRoleResolved);

    // Mock findUnique to return plan with missing teacherId
    const incompletePlan = {
      id: 'plan-1',
      className: 'Test Plan',
      courseId: 'course-1',
      centreId: 'centre-1',
      teacherId: null, // missing
      roomId: 'room-1',
      date: new Date('2026-06-25'),
      startTime: '08:00',
      endTime: '10:00',
      minStudents: 15,
      currentStudents: 15,
      status: 'PLANNING',
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        classOpeningPlan: {
          findUnique: vi.fn().mockResolvedValue(incompletePlan),
        },
      };
      return callback(tx as unknown as Parameters<typeof callback>[0]);
    });

    const params = Promise.resolve({ id: 'plan-1' });
    const req = new NextRequest('http://localhost/api/class-planning/plan-1/submit', { method: 'POST' });
    const res = await submitPOST(req, { params });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Criteria incomplete');
  });

  it('submitPOST should succeed and promote class in serializable transaction', async () => {
    vi.mocked(requireRole).mockResolvedValue({
      id: 'manager-1',
      name: 'Manager A',
      role: 'CENTRE_MANAGER',
      centreId: 'centre-1',
    } as unknown as RequireRoleResolved);

    const readyPlan = {
      id: 'plan-2',
      className: 'Test Plan Ready',
      courseId: 'course-1',
      centreId: 'centre-1',
      teacherId: 'teacher-1',
      roomId: 'room-1',
      date: new Date('2026-06-25'),
      startTime: '08:00',
      endTime: '10:00',
      minStudents: 15,
      currentStudents: 15,
      status: 'PLANNING',
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        classOpeningPlan: {
          findUnique: vi.fn().mockResolvedValue(readyPlan),
          update: vi.fn().mockResolvedValue({ ...readyPlan, status: 'SUBMITTED' }),
        },
        classSession: {
          findMany: vi.fn().mockResolvedValue([]), // No conflicts
          create: vi.fn().mockResolvedValue({ id: 'session-777', className: readyPlan.className }),
        },
      };
      return callback(tx as unknown as Parameters<typeof callback>[0]);
    });

    const params = Promise.resolve({ id: 'plan-2' });
    const req = new NextRequest('http://localhost/api/class-planning/plan-2/submit', { method: 'POST' });
    const res = await submitPOST(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.session.id).toBe('session-777');
    expect(data.plan.status).toBe('SUBMITTED');
  });

  it('submitPOST should return 409 if teacher is already booked (conflict)', async () => {
    vi.mocked(requireRole).mockResolvedValue({
      id: 'manager-1',
      name: 'Manager A',
      role: 'CENTRE_MANAGER',
      centreId: 'centre-1',
    } as unknown as RequireRoleResolved);

    const readyPlan = {
      id: 'plan-3',
      className: 'Test Plan Ready',
      courseId: 'course-1',
      centreId: 'centre-1',
      teacherId: 'teacher-1',
      roomId: 'room-1',
      date: new Date('2026-06-25'),
      startTime: '08:00',
      endTime: '10:00',
      minStudents: 15,
      currentStudents: 15,
      status: 'PLANNING',
    };

    const conflictingSession = {
      id: 'existing-session',
      className: 'Conflicting Class',
      roomId: 'room-99',
      teacherId: 'teacher-1', // same teacher
      date: new Date('2026-06-25'),
      startTime: '09:00', // overlaps 08:00-10:00
      endTime: '11:00',
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        classOpeningPlan: {
          findUnique: vi.fn().mockResolvedValue(readyPlan),
        },
        classSession: {
          findMany: vi.fn().mockResolvedValue([conflictingSession]), // Conflict exists
        },
      };
      return callback(tx as unknown as Parameters<typeof callback>[0]);
    });

    const params = Promise.resolve({ id: 'plan-3' });
    const req = new NextRequest('http://localhost/api/class-planning/plan-3/submit', { method: 'POST' });
    const res = await submitPOST(req, { params });
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toContain('conflict');
  });
});
