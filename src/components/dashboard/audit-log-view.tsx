'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, BookOpen, Building2, Users, DoorOpen, UserCheck, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  details: string | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, { text: string; bg: string }> = {
  CREATE: { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  UPDATE: { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  DELETE: { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  ClassSession: <BookOpen className="w-3.5 h-3.5" />,
  Centre:       <Building2 className="w-3.5 h-3.5" />,
  Teacher:      <Users className="w-3.5 h-3.5" />,
  Room:         <DoorOpen className="w-3.5 h-3.5" />,
  User:         <UserCheck className="w-3.5 h-3.5" />,
};

const PAGE_SIZE = 20;

export function AuditLogView() {
  const [page, setPage] = useState(0);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');

  const { data, isLoading } = useQuery<{ logs: AuditEntry[]; total: number }>({
    queryKey: ['audit-log', page, filterAction, filterEntity],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
      if (filterAction) params.set('action', filterAction);
      if (filterEntity) params.set('entityType', filterEntity);
      const res = await fetch(`/api/audit-log?${params}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="card overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b"
           style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
          <h3 className="heading-md">Activity Log</h3>
          {data && <span className="label text-xs">({data.total} entries)</span>}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(0); }} className="field text-xs py-1.5 px-2" style={{ minWidth: '110px' }}>
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>
          <select value={filterEntity} onChange={e => { setFilterEntity(e.target.value); setPage(0); }} className="field text-xs py-1.5 px-2" style={{ minWidth: '140px' }}>
            <option value="">All Entities</option>
            {['ClassSession','Centre','Teacher','Course','Room','User'].map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Entries */}
      <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="skeleton w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 rounded w-3/4" />
                  <div className="skeleton h-3 rounded w-1/2" />
                </div>
              </div>
            ))
          : data?.logs.length === 0
            ? (
              <div className="text-center py-16 muted">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No activity recorded yet.
              </div>
            )
            : data?.logs.map(log => {
                const ac = ACTION_COLORS[log.action] ?? { text: '#8b949e', bg: 'rgba(139,148,158,0.12)' };
                return (
                  <div key={log.id} className="flex items-start gap-3 px-5 py-3 transition-colors"
                       onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                       onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                         style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--brand-primary)' }}>
                      {log.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        {/* Action badge */}
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                              style={{ background: ac.bg, color: ac.text }}>
                          {log.action}
                        </span>
                        {/* Entity icon + type */}
                        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          {ENTITY_ICONS[log.entityType] ?? <Activity className="w-3.5 h-3.5" />}
                          {log.entityType}
                        </span>
                        <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {log.entityName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span>{log.userName}</span>
                        {log.details && <span className="truncate max-w-xs">· {log.details}</span>}
                      </div>
                    </div>
                    <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {timeAgo(log.createdAt)}
                    </span>
                  </div>
                );
              })
        }
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Page {page + 1} of {totalPages} · {data?.total} total
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-40">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-40">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
