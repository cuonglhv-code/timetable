import { auth } from '@/auth';
import { cookies } from 'next/headers';
import { TimetableApp } from './timetable-app';
import { PublicTimetable } from './public/timetable/public-timetable';
import { PublicEmailPrompt } from './public-email-prompt';

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    return (
      <TimetableApp
        user={{
          id: session.user.id,
          name: session.user.name ?? '',
          email: session.user.email ?? '',
          role: session.user.role,
          centreId: session.user.centreId,
          teacherId: session.user.teacherId,
        }}
      />
    );
  }

  const cookieStore = await cookies();
  const viewerEmail = cookieStore.get('viewer_email')?.value;

  if (viewerEmail && viewerEmail.toLowerCase().endsWith('@jaxtina.com')) {
    return <PublicTimetable />;
  }

  return <PublicEmailPrompt />;
}

