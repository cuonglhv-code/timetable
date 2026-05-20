/**
 * Utility functions for time calculations and conflict detection.
 * @module lib/utils
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes without conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Check if two time ranges overlap.
 * @param start1 - Start time of first range (HH:mm)
 * @param end1 - End time of first range (HH:mm)
 * @param start2 - Start time of second range (HH:mm)
 * @param end2 - End time of second range (HH:mm)
 * @returns true if the ranges overlap
 */
export function isTimeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const [h1, m1] = start1.split(':').map(Number);
  const [e1h, e1m] = end1.split(':').map(Number);
  const [h2, m2] = start2.split(':').map(Number);
  const [e2h, e2m] = end2.split(':').map(Number);

  const start1Min = h1 * 60 + m1;
  const end1Min = e1h * 60 + e1m;
  const start2Min = h2 * 60 + m2;
  const end2Min = e2h * 60 + e2m;

  return start1Min < end2Min && start2Min < end1Min;
}

/**
 * Convert time string (HH:mm) to minutes from midnight.
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to time string (HH:mm).
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Generate time slots for the week view grid.
 * @param startHour - Starting hour (default 8)
 * @param endHour - Ending hour (default 21)
 * @returns Array of time slot objects
 */
export function generateTimeSlots(startHour = 8, endHour = 21) {
  const slots = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    slots.push({
      hour,
      minute: 0,
      label: `${hour.toString().padStart(2, '0')}:00`,
    });
  }
  return slots;
}

/**
 * Format a date to YYYY-MM-DD string.
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to a Date object (local timezone).
 */
export function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Determine the status of a class session based on the current system time.
 */
export function getSessionStatus(
  dateVal: string | Date,
  startTime: string,
  endTime: string
): 'PLANNING' | 'ON_GOING' | 'FINISHED' {
  const now = new Date();
  
  // Extract YYYY-MM-DD literally to bypass timezone shifting
  let dateStr = '';
  if (typeof dateVal === 'string') {
    dateStr = dateVal.split('T')[0];
  } else if (dateVal instanceof Date) {
    dateStr = dateVal.toISOString().split('T')[0];
  } else {
    dateStr = new Date(dateVal).toISOString().split('T')[0];
  }
  
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Create start Date object
  const sessionStart = new Date(year, month - 1, day);
  const [startHour, startMin] = startTime.split(':').map(Number);
  sessionStart.setHours(startHour, startMin, 0, 0);

  // Create end Date object
  const sessionEnd = new Date(year, month - 1, day);
  const [endHour, endMin] = endTime.split(':').map(Number);
  sessionEnd.setHours(endHour, endMin, 0, 0);
  
  if (now < sessionStart) {
    return 'PLANNING';
  } else if (now > sessionEnd) {
    return 'FINISHED';
  } else {
    return 'ON_GOING';
  }
}

