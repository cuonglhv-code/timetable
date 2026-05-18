import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { decrypt } from '@/lib/crypto';
import type { ClassSessionWithRelations, SharePermission } from '@/types';

interface GoogleCalendarConfig {
  serviceAccountEmail: string;
  encryptedKey: string;
  scopes: string[];
}

class GoogleCalendarService {
  private auth: JWT;
  private scopes: string[];

  constructor(config: GoogleCalendarConfig) {
    const keyJson = JSON.parse(decrypt(config.encryptedKey));
    this.scopes = config.scopes;
    this.auth = new google.auth.JWT({
      email: config.serviceAccountEmail,
      key: keyJson.private_key,
      scopes: config.scopes,
    });
  }

  private getCalendar(teacherEmail: string) {
    this.auth.subject = teacherEmail;
    return google.calendar({ version: 'v3', auth: this.auth });
  }

  async createEvent(
    teacherEmail: string,
    session: ClassSessionWithRelations
  ): Promise<{ eventId: string; htmlLink: string }> {
    const calendar = this.getCalendar(teacherEmail);

    const startDate = new Date(session.date);
    const [startHour, startMin] = session.startTime.split(':').map(Number);
    startDate.setHours(startHour, startMin, 0, 0);

    const endDate = new Date(session.date);
    const [endHour, endMin] = session.endTime.split(':').map(Number);
    endDate.setHours(endHour, endMin, 0, 0);

    const event = {
      summary: `${session.className} - ${session.course.name}`,
      description: this.buildDescription(session),
      location: `${session.centre.name} - ${session.room.name}`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      attendees: [{ email: teacherEmail }],
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'none',
    });

    return {
      eventId: response.data.id!,
      htmlLink: response.data.htmlLink!,
    };
  }

  async updateEvent(
    teacherEmail: string,
    eventId: string,
    session: ClassSessionWithRelations
  ): Promise<{ eventId: string; htmlLink: string }> {
    const calendar = this.getCalendar(teacherEmail);

    const startDate = new Date(session.date);
    const [startHour, startMin] = session.startTime.split(':').map(Number);
    startDate.setHours(startHour, startMin, 0, 0);

    const endDate = new Date(session.date);
    const [endHour, endMin] = session.endTime.split(':').map(Number);
    endDate.setHours(endHour, endMin, 0, 0);

    const event = {
      summary: `${session.className} - ${session.course.name}`,
      description: this.buildDescription(session),
      location: `${session.centre.name} - ${session.room.name}`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'Asia/Ho_Chi_Minh',
      },
    };

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: event,
      sendUpdates: 'none',
    });

    return {
      eventId: response.data.id!,
      htmlLink: response.data.htmlLink!,
    };
  }

  async deleteEvent(teacherEmail: string, eventId: string): Promise<void> {
    const calendar = this.getCalendar(teacherEmail);
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'none',
    });
  }

  async testConnection(teacherEmail: string): Promise<boolean> {
    try {
      const calendar = this.getCalendar(teacherEmail);
      await calendar.calendarList.get({ calendarId: 'primary' });
      return true;
    } catch {
      return false;
    }
  }

  private buildDescription(session: ClassSessionWithRelations): string {
    const lines = [
      `Class: ${session.className}`,
      `Course: ${session.course.name}`,
      `Teacher: ${session.teacher.name}`,
      `Room: ${session.room.name}`,
      `Centre: ${session.centre.name}`,
    ];
    if (session.notes) {
      lines.push(`\nNotes: ${session.notes}`);
    }
    return lines.join('\n');
  }
}

let calendarServiceInstance: GoogleCalendarService | null = null;

export async function getGoogleCalendarService(): Promise<GoogleCalendarService> {
  if (calendarServiceInstance) {
    return calendarServiceInstance;
  }

  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const encryptedKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_ENCRYPTED;
  const scopesEnv = process.env.GOOGLE_CALENDAR_API_SCOPES ?? 'calendar.events,calendar.settings';

  if (!serviceAccountEmail || !encryptedKey) {
    throw new Error('Google Calendar credentials not configured');
  }

  const scopes = scopesEnv.split(',').map((s) => `https://www.googleapis.com/auth/${s.trim()}`);

  calendarServiceInstance = new GoogleCalendarService({
    serviceAccountEmail,
    encryptedKey,
    scopes,
  });

  return calendarServiceInstance;
}
