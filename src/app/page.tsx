import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { TimetableApp } from './timetable-app';

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

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
