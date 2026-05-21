'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, ShieldAlert, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityName: string;
  details: string | null;
  createdAt: string;
}

export function NotificationsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch recent activities
  const fetchRecentLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/audit-log?page=1&limit=5');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch recent audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for new notifications every 30s
  useEffect(() => {
    fetchRecentLogs();
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/audit-log?page=1&limit=5');
        if (res.ok) {
          const data = await res.json();
          const newLogs = data.logs || [];
          
          if (newLogs.length > 0) {
            setLogs(prev => {
              // If there are actually new items not seen in prev, trigger badge
              const newestPrevId = prev[0]?.id;
              const matches = newLogs.filter((l: AuditLog) => l.id === newestPrevId);
              if (matches.length === 0 && newestPrevId && !isOpen) {
                setUnreadCount(prevCount => prevCount + 1);
              }
              return newLogs;
            });
          }
        }
      } catch (e) {
        // Ignore silent polling errors
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenToggle = () => {
    if (!isOpen) {
      fetchRecentLogs();
      setUnreadCount(0); // clear count
    }
    setIsOpen(!isOpen);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'UPDATE':
        return <Edit className="w-4 h-4 text-blue-400" />;
      case 'DELETE':
        return <Trash2 className="w-4 h-4 text-rose-400" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleOpenToggle}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg glass-hover transition-all duration-200"
        style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
        aria-label="View system notifications"
      >
        <Bell className="w-4.5 h-4.5" />
        
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 animate-pulse-glow" 
                style={{ boxShadow: '0 0 8px #6366f1' }} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-xl shadow-2xl animate-fade-in py-1"
             style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
          
          <div className="flex items-center justify-between px-4 py-3 border-b" 
               style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>System Activities</span>
            {unreadCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-medium">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar p-1">
            {isLoading && logs.length === 0 ? (
              <div className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                <div className="inline-block w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-2" />
                <div>Fetching latest updates...</div>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                No recent activities found.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-default text-xs"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ color: 'var(--text-primary)' }} className="font-medium truncate">
                      {log.details || `${log.userName} performed ${log.action} on ${log.entityType}`}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1" style={{ color: 'var(--text-muted)' }}>
                      <span className="font-semibold">{log.userName}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
