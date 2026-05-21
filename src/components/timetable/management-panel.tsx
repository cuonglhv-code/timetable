'use client';

import { useState } from 'react';
import { Plus, Trash2, Building2, DoorOpen, BookOpen, Users, Search, Filter, Edit2, Check, X, Activity } from 'lucide-react';
import { useCentres, useCreateCentre, useDeleteCentre } from '@/hooks/use-centres';
import { useRooms, useCreateRoom, useDeleteRoom } from '@/hooks/use-rooms';
import { useCourses, useCreateCourse, useDeleteCourse } from '@/hooks/use-courses';
import { useTeachers, useCreateTeacher, useDeleteTeacher } from '@/hooks/use-teachers';
import { useToast } from '@/components/ui/toast';
import { AuditLogView } from '@/components/dashboard/audit-log-view';

type Tab = 'centres' | 'rooms' | 'courses' | 'teachers' | 'activity';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'centres',  label: 'Centres',  icon: <Building2 className="w-4 h-4" /> },
  { id: 'rooms',    label: 'Rooms',    icon: <DoorOpen className="w-4 h-4" /> },
  { id: 'courses',  label: 'Courses',  icon: <BookOpen className="w-4 h-4" /> },
  { id: 'teachers', label: 'Teachers', icon: <Users className="w-4 h-4" /> },
  { id: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
];

export function ManagementPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('centres');

  return (
    <div className="card overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
      {/* Tab Nav */}
      <div className="flex border-b overflow-x-auto" style={{ borderColor: 'var(--border-subtle)' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                    activeTab === tab.id ? '' : 'border-transparent'
                  }`}
                  style={activeTab === tab.id
                    ? { color: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', background: 'rgba(99,102,241,0.06)' }
                    : { color: 'var(--text-secondary)', borderColor: 'transparent' }
                  }>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'centres'  && <CentresManager />}
        {activeTab === 'rooms'    && <RoomsManager />}
        {activeTab === 'courses'  && <CoursesManager />}
        {activeTab === 'teachers' && <TeachersManager />}
        {activeTab === 'activity' && <AuditLogView />}
      </div>
    </div>
  );
}

/* ─── Shared ──────────────────────────────────────────────────────── */
function SectionHeader({ title, count, onAdd, addLabel }: { title: string; count?: number; onAdd: () => void; addLabel: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h3 className="heading-md">{title}</h3>
        {count !== undefined && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{count} total</p>}
      </div>
      <button onClick={onAdd} className="btn-primary">
        <Plus className="w-4 h-4" /> {addLabel}
      </button>
    </div>
  );
}

function EmptyState({ message, cta, onCta }: { message: string; cta: string; onCta: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
           style={{ background: 'rgba(99,102,241,0.10)', color: 'var(--brand-primary)' }}>
        <Plus className="w-6 h-6" />
      </div>
      <p className="muted mb-4">{message}</p>
      <button onClick={onCta} className="btn-primary">{cta}</button>
    </div>
  );
}

function ItemRow({ children, onDelete, danger = false }: { children: React.ReactNode; onDelete: () => void; danger?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors group"
         style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}
         onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
         onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
      <div className="flex-1 min-w-0">{children}</div>
      <div className="flex items-center gap-2 ml-3">
        {confirming ? (
          <>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Delete?</span>
            <button onClick={onDelete} className="btn-danger px-2 py-1 text-xs">
              <Check className="w-3.5 h-3.5" /> Yes
            </button>
            <button onClick={() => setConfirming(false)} className="btn-ghost px-2 py-1 text-xs">
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button onClick={() => setConfirming(true)} className="btn-danger opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Centres ─────────────────────────────────────────────────────── */
function CentresManager() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const { data: centres, isLoading } = useCentres();
  const createCentre = useCreateCentre();
  const deleteCentre = useDeleteCentre();
  const { success } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createCentre.mutateAsync({ name: name.trim(), address: address.trim() || null });
    success('Centre Added', `"${name.trim()}" has been created.`);
    setName(''); setAddress(''); setShowForm(false);
  };

  if (isLoading) return <div className="skeleton h-48 rounded-xl" />;

  return (
    <div>
      <SectionHeader title="Centres" count={centres?.length} onAdd={() => setShowForm(true)} addLabel="Add Centre" />
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 p-5 rounded-xl space-y-3 animate-fade-in"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.20)' }}>
          <input type="text" placeholder="Centre name (e.g., Jaxtina-Nguyen Van Cu)"
                 value={name} onChange={e => setName(e.target.value)} className="field" required />
          <input type="text" placeholder="Address (optional)"
                 value={address} onChange={e => setAddress(e.target.value)} className="field" />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Create Centre</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}
      <div className="space-y-2">
        {centres?.length === 0
          ? <EmptyState message="No centres added yet." cta="Add your first centre" onCta={() => setShowForm(true)} />
          : centres?.map(c => (
            <ItemRow key={c.id} onDelete={() => deleteCentre.mutate(c.id)}>
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
              {c.address && <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{c.address}</div>}
            </ItemRow>
          ))}
      </div>
    </div>
  );
}

/* ─── Rooms ───────────────────────────────────────────────────────── */
function RoomsManager() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [centreId, setCentreId] = useState('');
  const [filterCentre, setFilterCentre] = useState('');
  const { data: rooms, isLoading } = useRooms();
  const { data: centres } = useCentres();
  const createRoom = useCreateRoom();
  const deleteRoom = useDeleteRoom();
  const { success } = useToast();

  const filteredRooms = filterCentre ? rooms?.filter(r => r.centreId === filterCentre) : rooms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !centreId) return;
    await createRoom.mutateAsync({ centreId, name: name.trim() });
    success('Room Added', `Room "${name.trim()}" has been created.`);
    setName(''); setCentreId(''); setShowForm(false);
  };

  if (isLoading) return <div className="skeleton h-48 rounded-xl" />;

  return (
    <div>
      <SectionHeader title="Rooms" count={rooms?.length} onAdd={() => setShowForm(true)} addLabel="Add Room" />
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 p-5 rounded-xl space-y-3 animate-fade-in"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.20)' }}>
          <select value={centreId} onChange={e => setCentreId(e.target.value)} className="field" required>
            <option value="">Select centre</option>
            {centres?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="text" placeholder="Room name (e.g., NVC-1.01)"
                 value={name} onChange={e => setName(e.target.value)} className="field" required />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Create Room</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}
      {/* Centre filter */}
      <div className="mb-4">
        <select value={filterCentre} onChange={e => setFilterCentre(e.target.value)} className="field" style={{ maxWidth: '240px' }}>
          <option value="">All Centres</option>
          {centres?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        {filteredRooms?.length === 0
          ? <EmptyState message="No rooms added yet." cta="Add your first room" onCta={() => setShowForm(true)} />
          : filteredRooms?.map(r => (
            <ItemRow key={r.id} onDelete={() => deleteRoom.mutate(r.id)}>
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{r.name}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{r.centre.name}</div>
            </ItemRow>
          ))}
      </div>
    </div>
  );
}

/* ─── Courses ─────────────────────────────────────────────────────── */
function CoursesManager() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [colorHex, setColorHex] = useState('#6366f1');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const { data: courses, isLoading } = useCourses();
  const createCourse = useCreateCourse();
  const deleteCourse = useDeleteCourse();
  const { success } = useToast();

  const categories = courses ? ['ALL', ...Array.from(new Set(courses.map(c => c.category)))] : ['ALL'];
  const filtered = courses?.filter(c => {
    const q = searchTerm.toLowerCase();
    return (c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
      && (selectedCategory === 'ALL' || c.category === selectedCategory);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return;
    await createCourse.mutateAsync({ name: name.trim(), category: category.trim(), colorHex });
    success('Course Added', `"${name.trim()}" has been added.`);
    setName(''); setCategory(''); setShowForm(false);
  };

  if (isLoading) return <div className="skeleton h-48 rounded-xl" />;

  return (
    <div>
      <SectionHeader title="Courses" count={courses?.length} onAdd={() => setShowForm(true)} addLabel="Add Course" />
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 p-5 rounded-xl space-y-3 animate-fade-in"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.20)' }}>
          <input type="text" placeholder="Course name (e.g., IELTS-Achiever 1)"
                 value={name} onChange={e => setName(e.target.value)} className="field" required />
          <input type="text" placeholder="Category (e.g., IELTS, TOEIC, 4Skills)"
                 value={category} onChange={e => setCategory(e.target.value)} className="field" required />
          <div className="flex items-center gap-3">
            <label className="label">Color</label>
            <input type="color" value={colorHex} onChange={e => setColorHex(e.target.value)}
                   className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
            <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{colorHex}</span>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Create Course</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}
      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search courses…" value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)} className="field pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="field" style={{ minWidth: '160px' }}>
            {categories.map(cat => <option key={cat} value={cat}>{cat === 'ALL' ? 'All Categories' : cat}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        {filtered?.length === 0
          ? <EmptyState message={courses?.length === 0 ? 'No courses added yet.' : 'No courses match your search.'} cta="Add a course" onCta={() => setShowForm(true)} />
          : filtered?.map(c => (
            <ItemRow key={c.id} onDelete={() => deleteCourse.mutate(c.id)}>
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: c.colorHex ?? '#6366f1' }} />
                <div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{c.category}</div>
                </div>
              </div>
            </ItemRow>
          ))}
      </div>
    </div>
  );
}

/* ─── Teachers ────────────────────────────────────────────────────── */
function TeachersManager() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [search, setSearch] = useState('');

  const { data: teachers, isLoading } = useTeachers();
  const createTeacher = useCreateTeacher();
  const deleteTeacher = useDeleteTeacher();
  const { success } = useToast();

  const filtered = teachers?.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createTeacher.mutateAsync({ name: name.trim(), email: email.trim() || null, phone: phone.trim() || null });
    success('Teacher Added', `${name.trim()} has been added.`);
    setName(''); setEmail(''); setPhone(''); setShowForm(false);
  };

  if (isLoading) return <div className="skeleton h-48 rounded-xl" />;

  return (
    <div>
      <SectionHeader title="Teachers" count={teachers?.length} onAdd={() => setShowForm(true)} addLabel="Add Teacher" />
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 p-5 rounded-xl space-y-3 animate-fade-in"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.20)' }}>
          <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} className="field" required />
          <input type="email" placeholder="Email (optional)" value={email} onChange={e => setEmail(e.target.value)} className="field" />
          <input type="tel" placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} className="field" />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Add Teacher</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search teachers…" value={search}
                 onChange={e => setSearch(e.target.value)} className="field pl-9" />
        </div>
      </div>
      <div className="space-y-2">
        {filtered?.length === 0
          ? <EmptyState message="No teachers added yet." cta="Add your first teacher" onCta={() => setShowForm(true)} />
          : filtered?.map(t => (
            <ItemRow key={t.id} onDelete={() => deleteTeacher.mutate(t.id)}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                     style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--brand-primary)' }}>
                  {t.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t.name}</div>
                  {t.email && <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.email}</div>}
                </div>
              </div>
            </ItemRow>
          ))}
      </div>
    </div>
  );
}
