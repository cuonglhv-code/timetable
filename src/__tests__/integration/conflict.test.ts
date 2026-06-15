import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/sessions/route';
import { GET as checkConflictGET } from '@/app/api/sessions/check-conflict/route';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/authorization';
import { NextRequest } from 'next/server';

// Mock authorization
vi.mock('@/lib/auth/authorization', () => ({
  requireAuth: vi.fn(),
  canAccessCentre: vi.fn(() => true),
  canDeleteSession: vi.fn(() => true),
  getTeacherSessions: vi.fn(() => []),
}));

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    classSession: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock audit logs
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}));

describe('Sessions API POST Concurrency and Conflict Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 409 Conflict if conflict is detected in the transaction', async () => {
    // 1. Mock authorized user
    (requireAuth as any).mockResolvedValue({
      id: 'user-1',
      name: 'Manager A',
      role: 'CENTRE_MANAGER',
      centreId: 'centre-1',
    });

    // 2. Mock transaction behavior to return conflict details
    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      const txMock = {
        classSession: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'conflicting-id',
              className: 'Existing IELTS A',
              roomId: 'room-1',
              teacherId: 'teacher-1',
              date: new Date('2026-05-21'),
              startTime: '08:00',
              endTime: '10:00',
              course: { name: 'IELTS course' },
              teacher: { name: 'Teacher John' },
              centre: { name: 'Jaxtina Centre' },
              room: { name: 'Room 101' },
            },
          ]),
          create: vi.fn(),
        },
      };
      return callback(txMock);
    });

    const body = {
      className: 'New IELTS B',
      courseId: 'course-1',
      teacherId: 'teacher-1',
      centreId: 'centre-1',
      roomId: 'room-1',
      date: '2026-05-21',
      startTime: '09:00', // overlaps with 08:00-10:00
      endTime: '10:30',
      notes: '',
    };

    const req = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    
    const resData = await res.json();
    expect(resData.error).toContain('conflict detected');
  });

  it('should catch database serialization conflict (P2034) and return 409', async () => {
    (requireAuth as any).mockResolvedValue({
      id: 'user-1',
      name: 'Manager A',
      role: 'CENTRE_MANAGER',
      centreId: 'centre-1',
    });

    // Mock prisma transaction to throw Prisma code P2034 (Serialization Conflict)
    (prisma.$transaction as any).mockRejectedValue({
      code: 'P2034',
      message: 'Transaction failed due to serialization conflict',
    });

    const body = {
      className: 'New IELTS B',
      courseId: 'course-1',
      teacherId: 'teacher-1',
      centreId: 'centre-1',
      roomId: 'room-1',
      date: '2026-05-21',
      startTime: '09:00',
      endTime: '10:30',
      notes: '',
    };

    const req = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);

    const resData = await res.json();
    expect(resData.error).toContain('Concurrent scheduling action detected');
  });
});

describe('check-conflict GET Endpoint', () => {
  it('should return no conflicts if required parameters are missing', async () => {
    (requireAuth as any).mockResolvedValue({ id: 'user-1', role: 'CENTRE_MANAGER' });

    const req = new NextRequest('http://localhost/api/sessions/check-conflict?date=2026-05-21');
    const res = await checkConflictGET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hasConflict).toBe(false);
  });

  it('should properly check room conflicts and not match all records when teacherId is omitted', async () => {
    (requireAuth as any).mockResolvedValue({ id: 'user-1', role: 'CENTRE_MANAGER' });

    const mockFindMany = vi.fn().mockResolvedValue([
      {
        id: 'session-1',
        roomId: 'room-1',
        teacherId: 'teacher-1',
        date: new Date(Date.UTC(2026, 4, 21)),
        startTime: '08:00',
        endTime: '10:00',
      }
    ]);
    (prisma.classSession.findMany as any).mockImplementation(mockFindMany);

    const req = new NextRequest('http://localhost/api/sessions/check-conflict?date=2026-05-21&startTime=09:00&endTime=10:30&roomId=room-1');
    const res = await checkConflictGET(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.hasConflict).toBe(true);
    expect(data.roomConflicts.length).toBe(1);

    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        date: new Date(Date.UTC(2026, 4, 21)),
        startTime: { lt: '10:30' },
        endTime: { gt: '09:00' },
        OR: [{ roomId: 'room-1' }],
      })
    }));
  });
});
