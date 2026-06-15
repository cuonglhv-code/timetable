'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { useCentres } from '@/hooks/use-centres';
import { useTeachers } from '@/hooks/use-teachers';
import { useToast } from '@/components/ui/toast';

interface AppUser {
  id: string;
  email: string;
  name: string;
  role: string;
  centreId: string | null;
  teacherId: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

const ROLE_OPTIONS = ['CENTRAL_ADMIN', 'CENTRE_MANAGER', 'ACADEMIC_SUPERVISOR', 'TEACHER'] as const;

const ROLE_STYLE: Record<string, { label: string; color: string }> = {
  CENTRAL_ADMIN:      { label: 'Admin',      color: '#f59e0b' },
  CENTRE_MANAGER:     { label: 'Manager',    color: '#6366f1' },
  ACADEMIC_SUPERVISOR:{ label: 'Supervisor', color: '#22d3ee' },
  TEACHER:            { label: 'Teacher',    color: '#34d399' },
};

export function UserManagementPanel() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '', password: '', name: '',
    role: 'TEACHER' as (typeof ROLE_OPTIONS)[number],
    centreId: '', teacherId: '',
  });

  const { data: centres } = useCentres();
  const { data: teachers } = useTeachers();
  const { success, error: toastError } = useToast();

  const { data: users, isLoading, refetch } = useQuery<AppUser[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          centreId: formData.centreId || null,
          teacherId: formData.teacherId || null,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      success('User Created', `${formData.name} has been added.`);
      setFormData({ email: '', password: '', name: '', role: 'TEACHER', centreId: '', teacherId: '' });
      setShowForm(false);
      refetch();
    } catch (err) {
      toastError('Failed to Create User', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    success('User Removed', `${name} has been deleted.`);
    refetch();
  };

  if (isLoading) return (
    <div className="card p-5 space-y-2.5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: 'none' }}>
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
    </div>
  );

  return (
    <div className="card overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: 'none' }}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b animate-fade-in"
           style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h3 className="heading-md" style={{ fontSize: '1rem', fontWeight: 600 }}>User Management</h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {users?.length ?? 0} accounts in the system
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add User
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 border-b animate-fade-in space-y-4"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs block mb-1">Full Name</label>
              <input type="text" placeholder="e.g., Nguyen Thi A" value={formData.name}
                     onChange={e => setFormData({ ...formData, name: e.target.value })}
                     className="field text-xs py-1.5" required />
            </div>
            <div>
              <label className="label text-xs block mb-1">Email</label>
              <input type="email" placeholder="user@jaxtina.edu.vn" value={formData.email}
                     onChange={e => setFormData({ ...formData, email: e.target.value })}
                     className="field text-xs py-1.5" required />
            </div>
            <div>
              <label className="label text-xs block mb-1">Password</label>
              <input type="password" placeholder="Min 6 characters" value={formData.password}
                     onChange={e => setFormData({ ...formData, password: e.target.value })}
                     className="field text-xs py-1.5" required minLength={6} />
            </div>
            <div>
              <label className="label text-xs block mb-1">Role</label>
              <select value={formData.role}
                      onChange={e => setFormData({ ...formData, role: e.target.value as (typeof ROLE_OPTIONS)[number] })}
                      className="field text-xs py-1.5">
                {ROLE_OPTIONS.map(r => (
                  <option key={r} value={r}>{ROLE_STYLE[r]?.label ?? r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs block mb-1">Centre (optional)</label>
              <select value={formData.centreId}
                      onChange={e => setFormData({ ...formData, centreId: e.target.value })}
                      className="field text-xs py-1.5">
                <option value="">None</option>
                {centres?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs block mb-1">Linked Teacher (optional)</label>
              <select value={formData.teacherId}
                      onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                      className="field text-xs py-1.5">
                <option value="">None</option>
                {teachers?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primary py-1.5 px-3.5 text-xs">Create Account</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost py-1.5 px-3.5 text-xs">Cancel</button>
          </div>
        </form>
      )}

      {/* Users List */}
      <div className="p-3 grid gap-2">
        {users?.length === 0 ? (
          <div className="p-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            No users found. Create the first account above.
          </div>
        ) : users?.map(user => (
          <UserRow key={user.id} user={user} onDelete={() => handleDelete(user.id, user.name)} />
        ))}
      </div>
    </div>
  );
}

function UserRow({ user, onDelete }: { user: AppUser; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const roleInfo = ROLE_STYLE[user.role] ?? { label: user.role, color: '#8b949e' };

  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg group transition-colors border"
         style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', boxShadow: 'none' }}
         onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
         onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
      
      <div className="flex items-center gap-3 min-w-0">
        {/* Unified Circular initials avatar of consistent sizing */}
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border"
             style={{
               background: `${roleInfo.color}15`,
               color: roleInfo.color,
               borderColor: `${roleInfo.color}33`
             }}>
          {user.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(-2)}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</div>
          <div className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>{user.email}</div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-shrink-0">
        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
              style={{ background: `${roleInfo.color}12`, color: roleInfo.color, borderColor: `${roleInfo.color}25` }}>
          {roleInfo.label}
        </span>
        
        {user.lastLogin && (
          <span className="text-[10px] hidden md:block" style={{ color: 'var(--text-muted)' }}>
            Last: {new Date(user.lastLogin).toLocaleDateString()}
          </span>
        )}

        {confirming ? (
          <div className="flex items-center gap-1">
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Delete?</span>
            <button onClick={onDelete} className="btn-danger px-2 py-0.5 text-[10px]"><Check className="w-3 h-3" /> Yes</button>
            <button onClick={() => setConfirming(false)} className="btn-ghost px-1.5 py-0.5 text-[10px]"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)}
                  className="btn-danger opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
