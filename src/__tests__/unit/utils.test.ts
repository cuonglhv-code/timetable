import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isTimeOverlap, timeToMinutes, minutesToTime, getSessionStatus, parseDate, formatDate, getUTCDateString, formatUTCShort } from '@/lib/utils';

describe('isTimeOverlap', () => {
  it('should return true for overlapping time ranges', () => {
    expect(isTimeOverlap('08:00', '09:30', '09:00', '10:30')).toBe(true);
    expect(isTimeOverlap('13:00', '15:00', '12:00', '14:00')).toBe(true);
    expect(isTimeOverlap('08:00', '10:00', '08:30', '09:30')).toBe(true); // fully contained
  });

  it('should return false for non-overlapping time ranges', () => {
    expect(isTimeOverlap('08:00', '09:00', '09:30', '10:30')).toBe(false);
    expect(isTimeOverlap('14:00', '16:00', '11:00', '13:00')).toBe(false);
  });

  it('should return false for adjacent time ranges (touching boundary)', () => {
    expect(isTimeOverlap('08:00', '09:30', '09:30', '11:00')).toBe(false);
    expect(isTimeOverlap('12:00', '13:00', '13:00', '14:00')).toBe(false);
  });
});

describe('timeToMinutes & minutesToTime conversion', () => {
  it('should correctly convert HH:mm to minutes from midnight', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('08:30')).toBe(510);
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('should correctly convert minutes from midnight to HH:mm string', () => {
    expect(minutesToTime(0)).toBe('00:00');
    expect(minutesToTime(510)).toBe('08:30');
    expect(minutesToTime(1439)).toBe('23:59');
  });
});

describe('getSessionStatus', () => {
  beforeEach(() => {
    // Mock system time to 2026-05-21 12:00:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-21T12:00:00.000'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return PLANNING for future sessions', () => {
    const status = getSessionStatus('2026-05-21', '14:00', '15:30');
    expect(status).toBe('PLANNING');
  });

  it('should return ON_GOING for sessions currently happening', () => {
    const status = getSessionStatus('2026-05-21', '11:30', '13:00');
    expect(status).toBe('ON_GOING');
  });

  it('should return FINISHED for past sessions', () => {
    const status = getSessionStatus('2026-05-21', '08:00', '10:00');
    expect(status).toBe('FINISHED');
  });
});

describe('parseDate and formatDate UTC consistency', () => {
  it('should parse date string as UTC midnight Date', () => {
    const date = parseDate('2026-06-12');
    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(5); // June is 5
    expect(date.getUTCDate()).toBe(12);
    expect(date.getUTCHours()).toBe(0);
    expect(date.getUTCMinutes()).toBe(0);
  });

  it('should format Date using UTC components', () => {
    const date = new Date(Date.UTC(2026, 5, 12));
    expect(formatDate(date)).toBe('2026-06-12');
  });
});

describe('getUTCDateString and formatUTCShort timezone safety', () => {
  it('should extract UTC date string correctly without timezone shift', () => {
    const dateStr = '2026-06-13T00:00:00.000Z';
    expect(getUTCDateString(dateStr)).toBe('2026-06-13');

    const dateObj = new Date(Date.UTC(2026, 5, 13));
    expect(getUTCDateString(dateObj)).toBe('2026-06-13');
  });

  it('should format UTC short string correctly', () => {
    expect(formatUTCShort('2026-06-13T00:00:00.000Z')).toBe('13 Jun');
    expect(formatUTCShort('2026-12-05')).toBe('5 Dec');
  });
});

