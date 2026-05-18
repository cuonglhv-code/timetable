/**
 * Zod validation schemas for all API endpoints and forms.
 * @module lib/validators
 */

import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const centreSchema = z.object({
  name: z.string().min(1, 'Centre name is required').max(100, 'Centre name is too long'),
  address: z.string().max(200, 'Address is too long').nullable().optional(),
});

export const roomSchema = z.object({
  centreId: z.string().min(1, 'Centre is required'),
  name: z.string().min(1, 'Room name is required').max(50, 'Room name is too long'),
  capacity: z.number().int().positive('Capacity must be positive').nullable().optional(),
  isActive: z.boolean().default(true),
});

export const courseSchema = z.object({
  name: z.string().min(1, 'Course name is required').max(100, 'Course name is too long'),
  category: z.string().min(1, 'Category is required').max(50, 'Category is too long'),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .nullable()
    .optional(),
});

export const teacherSchema = z.object({
  name: z.string().min(1, 'Teacher name is required').max(100, 'Teacher name is too long'),
  email: z.string().email('Invalid email').nullable().optional(),
  phone: z.string().max(20, 'Phone number is too long').nullable().optional(),
  isActive: z.boolean().default(true),
});

export const sessionSchema = z.object({
  className: z.string().min(1, 'Class name is required').max(100, 'Class name is too long'),
  courseId: z.string().min(1, 'Course is required'),
  teacherId: z.string().min(1, 'Teacher is required'),
  centreId: z.string().min(1, 'Centre is required'),
  roomId: z.string().min(1, 'Room is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  startTime: z.string().regex(timeRegex, 'Start time must be in HH:mm format'),
  endTime: z.string().regex(timeRegex, 'End time must be in HH:mm format'),
  notes: z.string().max(500, 'Notes are too long').nullable().optional(),
}).refine((data) => {
  const [startHour, startMin] = data.startTime.split(':').map(Number);
  const [endHour, endMin] = data.endTime.split(':').map(Number);
  const start = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;
  if (end <= start) {
    return {
      message: 'End time must be after start time',
      path: ['endTime'],
    };
  }
  return true;
});

export const filterSchema = z.object({
  centreId: z.string().optional(),
  teacherId: z.string().optional(),
  courseId: z.string().optional(),
  searchQuery: z.string().optional(),
});

export const googleIntegrationSchema = z.object({
  centreId: z.string().min(1, 'Centre is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
  serviceAccountEmail: z.string().email('Invalid service account email'),
  serviceAccountKey: z.string().min(1, 'Service account key is required'),
  verifiedDomain: z.string().min(1, 'Domain is required'),
});

export const calendarShareSchema = z.object({
  classSessionId: z.string().min(1, 'Class session is required'),
  teacherEmail: z.string().email('Invalid email'),
  permission: z.enum(['READER', 'WRITER', 'OWNER']).default('READER'),
  sendEmailNotification: z.boolean().default(true),
});

export type CentreInput = z.infer<typeof centreSchema>;
export type RoomInput = z.infer<typeof roomSchema>;
export type CourseInput = z.infer<typeof courseSchema>;
export type TeacherInput = z.infer<typeof teacherSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;
export type FilterInput = z.infer<typeof filterSchema>;
export type GoogleIntegrationInput = z.infer<typeof googleIntegrationSchema>;
export type CalendarShareInput = z.infer<typeof calendarShareSchema>;
