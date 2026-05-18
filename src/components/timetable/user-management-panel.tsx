'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Loader2 } from 'lucide-react';

interface User {
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

export function UserManagementPanel() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'TEACHER' as (typeof ROLE_OPTIONS)[number],
    centreId: '',
    teacherId: '',
  });

  const { data: users, isLoading, refetch } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        centreId: formData.centreId || null,
        teacherId: formData.teacherId || null,
      }),
    });

    if (res.ok) {
      setFormData({ email: '', password: '', name: '', role: 'TEACHER', centreId: '', teacherId: '' });
      setShowForm(false);
      refetch();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    refetch();
  };

  if (isLoading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Users</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
              minLength={6}
            />
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as (typeof ROLE_OPTIONS)[number] })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Centre ID (optional)"
              value={formData.centreId}
              onChange={(e) => setFormData({ ...formData, centreId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Teacher ID (optional)"
              value={formData.teacherId}
              onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              Create
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {users?.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">{user.name}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                {user.role.replace(/_/g, ' ')}
              </span>
              <button
                onClick={() => handleDelete(user.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {users?.length === 0 && (
          <div className="text-center py-8 text-gray-500">No users yet</div>
        )}
      </div>
    </div>
  );
}
