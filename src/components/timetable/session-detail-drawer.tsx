'use client';

import { useState } from 'react';
import { X, Edit2, Trash2, User, Building2, DoorOpen, BookOpen, Clock, Calendar, FileText, Check } from 'lucide-react';
import { useDeleteSession } from '@/hooks/use-sessions';
import { getSessionStatus } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { SessionForm } from './session-form';
import type { ClassSessionWithRelations } from '@/types';

interface SessionDetailDrawerProps {
  session: ClassSessionWithRelations | null;
  onClose: () => void;
}

const STATUS_CONFIG = {
  PLANNING: { label: 'Planning',  bg: 'var(--status-planning-bg)',  border: 'var(--status-planning-border)',  text: 'var(--status-planning-text)',  dot: '#fbbf24' },
  ON_GOING: { label: 'On Going',  bg: 'var(--status-ongoing-bg)',   border: 'var(--status-ongoing-border)',   text: 'var(--status-ongoing-text)',   dot: '#34d399' },
  FINISHED: { label: 'Finished',  bg: 'var(--status-finished-bg)',  border: 'var(--status-finished-border)',  text: 'var(--status-finished-text)',  dot: '#f87171' },
};

export function SessionDetailDrawer({ session, onClose }: SessionDetailDrawerProps) {
  const [editMode, setEditMode] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const deleteSession = useDeleteSession();
  const { success, error: toastError } = useToast();

  if (!session) return null;

  const status = getSessionStatus(session.date, session.startTime, session.endTime);
  const statusConfig = STATUS_CONFIG[status];
  const dateFormatted = new Date(session.date).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const handleDelete = async () => {
    try {
      await deleteSession.mutateAsync(session.id);
      success('Session Deleted', `"${session.className}" has been removed.`);
      onClose();
    } catch {
      toastError('Delete Failed', 'Could not delete this session.');
    }
  };

  if (editMode) {
    return (
      <SessionForm
        session={session}
        onClose={() => { setEditMode(false); onClose(); }}
      />
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" style={{ background: 'var(--bg-overlay)' }} onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 flex flex-col shadow-2xl animate-slide-in"
           style={{ background: 'var(--bg-elevated)', borderLeft: '1px solid var(--border-default)' }}>

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="badge text-xs font-semibold px-2.5 py-1"
                    style={{ background: statusConfig.bg, color: statusConfig.text, border: `1px solid ${statusConfig.border}` }}>
                <span className="w-1.5 h-1.5 rounded-full mr-1.5 inline-block" style={{ background: statusConfig.dot }} />
                {statusConfig.label}
              </span>
              {session.course.category && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: `${session.course.colorHex ?? '#6366f1'}22`, color: session.course.colorHex ?? '#6366f1' }}>
                  {session.course.category}
                </span>
              )}
              {(session as any).testType && (
                <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 animate-pulse">
                  {(() => {
                    const labels = { MINI_TEST: 'Mini Test', MID_TEST: 'Mid-term Test', FINAL_TEST: 'Final Exam' };
                    return labels[(session as any).testType as keyof typeof labels] || 'Test Day';
                  })()}
                </span>
              )}
            </div>
            <h2 className="heading-lg leading-tight">{session.className}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Course colour strip */}
        <div className="h-1 flex-shrink-0" style={{ background: session.course.colorHex ?? 'var(--brand-primary)' }} />

        {/* Details */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          <DetailRow icon={<Calendar className="w-4 h-4" />} label="Date">
            {dateFormatted}
          </DetailRow>

          <DetailRow icon={<Clock className="w-4 h-4" />} label="Time">
            {session.startTime} – {session.endTime}
            <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              ({getDurationLabel(session.startTime, session.endTime)})
            </span>
          </DetailRow>

          <DetailRow icon={<BookOpen className="w-4 h-4" />} label="Course">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0"
                   style={{ background: session.course.colorHex ?? '#6366f1' }} />
              {session.course.name}
            </div>
          </DetailRow>

          <DetailRow icon={<User className="w-4 h-4" />} label="Teacher">
            <div>
              <div>{session.teacher.name}</div>
              {session.teacher.email && (
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {session.teacher.email}
                </div>
              )}
              {session.teacher.phone && (
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {session.teacher.phone}
                </div>
              )}
            </div>
          </DetailRow>

          <DetailRow icon={<Building2 className="w-4 h-4" />} label="Centre">
            {session.centre.name}
            {session.centre.address && (
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{session.centre.address}</div>
            )}
          </DetailRow>

          <DetailRow icon={<DoorOpen className="w-4 h-4" />} label="Room">
            {session.room.name}
            {session.room.capacity && (
              <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>Capacity: {session.room.capacity}</span>
            )}
          </DetailRow>

          {session.notes && (
            <DetailRow icon={<FileText className="w-4 h-4" />} label="Notes">
              <p className="leading-relaxed text-sm" style={{ color: 'var(--text-secondary)' }}>{session.notes}</p>
            </DetailRow>
          )}

          {(session as any).examDownloadUrl && (
            <DetailRow icon={<FileText className="w-4 h-4 text-emerald-500" />} label="Exam Papers (Print-ready)">
              <a 
                href={(session as any).examDownloadUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs btn-ghost inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-emerald-600 hover:text-emerald-700 bg-[rgba(16,185,129,0.08)] dark:bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.2)] mt-1 transition-all hover:scale-[1.01]"
              >
                📥 Download Exam Papers
              </a>
            </DetailRow>
          )}

          {(session as any).lmsUrl && (
            <DetailRow icon={<Clock className="w-4 h-4 text-indigo-500" />} label="Online Test (LMS Link)">
              <a 
                href={(session as any).lmsUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs btn-ghost inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-indigo-600 hover:text-indigo-700 bg-[rgba(99,102,241,0.08)] dark:bg-[rgba(99,102,241,0.15)] border border-[rgba(99,102,241,0.2)] mt-1 transition-all hover:scale-[1.01]"
              >
                🌐 LMS Online Link (Share with Students)
              </a>
            </DetailRow>
          )}

          <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Created {new Date(session.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <button onClick={() => setEditMode(true)} className="btn-primary w-full justify-center py-2.5">
            <Edit2 className="w-4 h-4" /> Edit Session
          </button>

          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>Permanently delete this session?</span>
              <button onClick={handleDelete} className="btn-danger px-3 py-1.5 text-sm">
                <Check className="w-3.5 h-3.5" /> Yes, delete
              </button>
              <button onClick={() => setConfirming(false)} className="btn-ghost px-3 py-1.5 text-sm">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} className="btn-ghost w-full justify-center py-2 text-sm"
                    style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.25)' }}>
              <Trash2 className="w-4 h-4" /> Delete Session
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 mt-0.5"
           style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="label mb-1">{label}</div>
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{children}</div>
      </div>
    </div>
  );
}

function getDurationLabel(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
}
