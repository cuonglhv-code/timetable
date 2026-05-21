import { Suspense } from 'react';
import { PublicTimetable } from './public-timetable';

export const metadata = {
  title: 'Jaxtina — Class Timetable',
  description: 'View the current week class schedule at Jaxtina English Centre.',
};

export default function PublicTimetablePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
        <div className="text-center">
          <div className="skeleton w-32 h-6 rounded mx-auto mb-3" />
          <div className="muted text-sm">Loading timetable…</div>
        </div>
      </div>
    }>
      <PublicTimetable />
    </Suspense>
  );
}
