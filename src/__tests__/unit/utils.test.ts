import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isTimeOverlap, timeToMinutes, minutesToTime, getSessionStatus } from '@/lib/utils';

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
