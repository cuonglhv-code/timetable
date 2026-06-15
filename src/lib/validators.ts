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
  totalSessions: z.number().int().positive('Total sessions must be positive').nullable().optional(),
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
  sessionNumber: z.number().int().positive('Session number must be positive').nullable().optional(),
  testType: z.enum(['MINI_TEST', 'MID_TEST', 'FINAL_TEST']).or(z.literal('')).nullable().optional(),
  examDownloadUrl: z.string().url('Invalid URL').or(z.literal('')).nullable().optional(),
  lmsUrl: z.string().url('Invalid URL').or(z.literal('')).nullable().optional(),
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

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name is too long'),
  description: z.string().max(500, 'Description is too long').nullable().optional(),
  defaultView: z.enum(['LIST', 'BOARD', 'CALENDAR', 'TIMELINE']).default('LIST'),
  type: z.enum(['KANBAN', 'REQUESTS']).default('KANBAN'),
  centreId: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  isFavorited: z.boolean().optional(),
});

export const sectionSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  name: z.string().min(1, 'Section name is required').max(100, 'Section name is too long'),
  order: z.number().int().default(0),
  statusColor: z.string().max(20).nullable().optional(),
});

export const taskSchema = z.object({
  sectionId: z.string().min(1, 'Section is required'),
  name: z.string().min(1, 'Task name is required').max(100, 'Task name is too long'),
  description: z.string().max(1000, 'Description is too long').nullable().optional(),
  completed: z.boolean().default(false),
  order: z.number().int().default(0),
  assigneeId: z.string().nullable().optional(),
  dueDateStart: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
  dueDateEnd: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
  effort: z.enum(['LOW', 'MEDIUM', 'HIGH']).nullable().optional(),
  category: z.string().max(50, 'Category is too long').nullable().optional(),
  storyPoints: z.number().int().nonnegative().nullable().optional(),
  priority: z.enum(['BLOCKER', 'HIGH', 'MEDIUM', 'LOW', 'TRIVIAL']).nullable().optional(),
  completedAt: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
});

export type CentreInput = z.infer<typeof centreSchema>;
export type RoomInput = z.infer<typeof roomSchema>;
export type CourseInput = z.infer<typeof courseSchema>;
export type TeacherInput = z.infer<typeof teacherSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;
export type FilterInput = z.infer<typeof filterSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type TaskInput = z.input<typeof taskSchema>; // Use z.input because transform changes output type to Date objects

