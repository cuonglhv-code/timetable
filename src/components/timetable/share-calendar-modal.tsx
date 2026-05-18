'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Calendar } from 'lucide-react';
import { useTeachers } from '@/hooks/use-teachers';
import { useGoogleIntegration } from '@/hooks/use-google-integration';
import { useCreateCalendarShare, useCalendarShares } from '@/hooks/use-calendar-shares';
import { ShareStatusBadge } from './share-status-badge';
import type { ClassSessionWithRelations } from '@/types';

interface ShareCalendarModalProps {
  sessions: ClassSessionWithRelations[];
  centreId: string;
  onClose: () => void;
}

export function ShareCalendarModal({ sessions, centreId, onClose }: ShareCalendarModalProps) {
  const [emails, setEmails] = useState<string[]>(['']);
  const [permission, setPermission] = useState<'READER' | 'WRITER'>('READER');
  const [sendNotification, setSendNotification] = useState(true);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(
    new Set(sessions.map((s) => s.id))
  );

  const { data: integration } = useGoogleIntegration(centreId);
  const { data: teachers } = useTeachers();
  const createShare = useCreateCalendarShare();
  const { data: existingShares } = useCalendarShares({
    classSessionId: sessions.length === 1 ? sessions[0]?.id : undefined,
  });

  const handleAddEmail = () => setEmails([...emails, '']);
  const handleRemoveEmail = (index: number) => setEmails(emails.filter((_, i) => i !== index));
  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const toggleSession = (sessionId: string) => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  const handleShare = async () => {
    const validEmails = emails.filter((e) => e.trim().includes('@'));
    const selectedSessionList = sessions.filter((s) => selectedSessions.has(s.id));

    for (const email of validEmails) {
      for (const session of selectedSessionList) {
        try {
          await createShare.mutateAsync({
            classSessionId: session.id,
            teacherEmail: email.trim(),
            permission,
            sendEmailNotification: sendNotification,
          });
        } catch (error) {
          console.error(`Failed to share ${session.className} with ${email}:`, error);
        }
      }
    }

    onClose();
  };

  const isDomainValid = (email: string) => {
    if (!integration?.verifiedDomain) return true;
    const domain = email.split('@')[1]?.toLowerCase();
    return domain === integration.verifiedDomain.toLowerCase();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Share to Google Calendar</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!integration?.configured && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Google Calendar integration is not configured for this centre.
                Please configure it in Admin → Centres → Google Settings first.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Classes to Share
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {sessions.map((session) => (
                <label key={session.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSessions.has(session.id)}
                    onChange={() => toggleSession(session.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{session.className}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(session.date).toLocaleDateString()} · {session.startTime} - {session.endTime}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teacher Google Email Addresses
            </label>
            <div className="space-y-2">
              {emails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(index, e.target.value)}
                      placeholder={`teacher@${integration?.verifiedDomain ?? 'school.edu'}`}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        email && !isDomainValid(email) ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {email && !isDomainValid(email) && (
                      <p className="mt-1 text-xs text-red-600">
                        Must be @{integration?.verifiedDomain} email
                      </p>
                    )}
                  </div>
                  {emails.length > 1 && (
                    <button
                      onClick={() => handleRemoveEmail(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={handleAddEmail}
              className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add another email
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Permission Level
              </label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as 'READER' | 'WRITER')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="READER">Reader (View only)</option>
                <option value="WRITER">Writer (Can edit)</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendNotification}
                  onChange={(e) => setSendNotification(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Send email notification</span>
              </label>
            </div>
          </div>

          {existingShares && existingShares.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Existing Shares
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {existingShares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-2 text-sm">
                    <div>
                      <span className="font-medium">{share.teacherEmail}</span>
                      <span className="text-gray-500 ml-2">→ {share.classSession.className}</span>
                    </div>
                    <ShareStatusBadge status={share.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={!integration?.configured || selectedSessions.size === 0 || emails.every((e) => !e.trim())}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createShare.isPending ? 'Sharing...' : 'Share to Calendar'}
          </button>
        </div>
      </div>
    </div>
  );
}
