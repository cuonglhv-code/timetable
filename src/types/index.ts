/**
 * TypeScript interfaces for all data structures in the timetable system.
 * @module types/index
 */

export interface Centre {
  id: string;
  name: string;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  centreId: string;
  name: string;
  capacity: number | null;
  isActive: boolean;
}

export interface Course {
  id: string;
  name: string;
  category: string;
  colorHex: string | null;
}

export interface Teacher {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

export interface ClassSession {
  id: string;
  className: string;
  courseId: string;
  teacherId: string;
  centreId: string;
  roomId: string;
  date: Date;
  startTime: string;
  endTime: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassSessionWithRelations extends ClassSession {
  course: Course;
  teacher: Teacher;
  centre: Centre;
  room: Room;
}

export interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

export interface ConflictCheck {
  hasConflict: boolean;
  conflictingSession?: ClassSessionWithRelations;
  conflictType: 'room' | 'teacher' | 'none';
}

export interface FilterOptions {
  centreId?: string;
  teacherId?: string;
  courseId?: string;
  searchQuery?: string;
}

export type SharePermission = 'READER' | 'WRITER' | 'OWNER';
export type ShareStatus = 'PENDING' | 'SENT' | 'ACCEPTED' | 'REVOKED' | 'FAILED';

export interface GoogleIntegration {
  id: string;
  centreId: string;
  clientId: string;
  serviceAccountEmail: string;
  verifiedDomain: string;
  isDomainVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarShare {
  id: string;
  classSessionId: string;
  teacherEmail: string;
  teacherName: string | null;
  permission: SharePermission;
  sendEmailNotification: boolean;
  googleEventId: string | null;
  googleCalendarId: string | null;
  status: ShareStatus;
  lastSyncAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarShareWithSession extends CalendarShare {
  classSession: ClassSessionWithRelations;
}
