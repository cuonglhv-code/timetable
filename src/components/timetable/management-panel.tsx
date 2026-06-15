'use client';

import { useState, useRef } from 'react';
import { Plus, Trash2, Building2, DoorOpen, BookOpen, Users, Search, Filter, Edit2, Check, X, FileUp, Download } from 'lucide-react';
import { useCentres, useCreateCentre, useDeleteCentre } from '@/hooks/use-centres';
import { useRooms, useCreateRoom, useDeleteRoom } from '@/hooks/use-rooms';
import { useCourses, useCreateCourse, useUpdateCourse, useDeleteCourse, useCreateBulkCourses } from '@/hooks/use-courses';
import { useTeachers, useCreateTeacher, useDeleteTeacher } from '@/hooks/use-teachers';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/providers/language-provider';
import type { Course } from '@/types';

type Tab = 'centres' | 'rooms' | 'courses' | 'teachers';

interface ManagementPanelProps {
  activeTab?: Tab;
  showTabsNav?: boolean;
}

export function ManagementPanel({ activeTab: propActiveTab, showTabsNav = true }: ManagementPanelProps) {
  const { tr } = useLanguage();
  const [internalActiveTab, setInternalActiveTab] = useState<Tab>('centres');

  const activeTab = propActiveTab ?? internalActiveTab;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'centres',  label: tr('mgmt_centres'),  icon: <Building2 className="w-4 h-4" /> },
    { id: 'rooms',    label: tr('mgmt_rooms'),    icon: <DoorOpen className="w-4 h-4" /> },
    { id: 'courses',  label: tr('mgmt_courses'),  icon: <BookOpen className="w-4 h-4" /> },
    { id: 'teachers', label: tr('mgmt_teachers'), icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="card overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: 'none' }}>
      
      {/* Tab Nav (only rendered if showTabsNav is true) */}
      {showTabsNav && (
        <div className="flex border-b overflow-x-auto" style={{ borderColor: 'var(--border-subtle)' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setInternalActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                      activeTab === tab.id ? '' : 'border-transparent'
                    }`}
                    style={activeTab === tab.id
                      ? { color: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', background: 'var(--bg-glass-hover)' }
                      : { color: 'var(--text-secondary)', borderColor: 'transparent' }
                    }>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 sm:p-5">
        {activeTab === 'centres'  && <CentresManager />}
        {activeTab === 'rooms'    && <RoomsManager />}
        {activeTab === 'courses'  && <CoursesManager />}
        {activeTab === 'teachers' && <TeachersManager />}
      </div>
    </div>
  );
}

/* ─── Shared ──────────────────────────────────────────────────────── */
function SectionHeader({ title, count, onAdd, addLabel }: { title: string; count?: number; onAdd: () => void; addLabel: string }) {
  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <div>
        <h3 className="heading-md" style={{ fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
        {count !== undefined && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{count} total</p>}
      </div>
      <button onClick={onAdd} className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1">
        <Plus className="w-3.5 h-3.5" /> {addLabel}
      </button>
    </div>
  );
}

function EmptyState({ message, cta, onCta }: { message: string; cta: string; onCta: () => void }) {
  return (
    <div className="text-center py-12 border border-dashed rounded-xl" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
           style={{ background: 'rgba(232,160,32,0.08)', color: 'var(--brand-primary)' }}>
        <Plus className="w-5 h-5" />
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      <button onClick={onCta} className="btn-primary py-1 px-3 text-xs">{cta}</button>
    </div>
  );
}

function ItemRow({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-colors group"
         style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', boxShadow: 'none' }}
         onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
         onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
      <div className="flex-1 min-w-0">{children}</div>
      <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
        {confirming ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Delete?</span>
            <button onClick={onDelete} className="btn-danger px-2 py-0.5 text-[10px]">
              <Check className="w-3 h-3" /> Yes
            </button>
            <button onClick={() => setConfirming(false)} className="btn-ghost px-1.5 py-0.5 text-[10px]">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="btn-danger opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md">
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
  const { tr } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createCentre.mutateAsync({ name: name.trim(), address: address.trim() || null });
    success(tr('common_added'), `"${name.trim()}" has been created.`);
    setName(''); setAddress(''); setShowForm(false);
  };

  if (isLoading) return <div className="skeleton h-40 rounded-xl" />;

  return (
    <div className="space-y-4">
      <SectionHeader title={tr('mgmt_centres')} count={centres?.length} onAdd={() => setShowForm(true)} addLabel={tr('mgmt_add_centre')} />
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg space-y-3 animate-fade-in border"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
          <input type="text" placeholder={tr('mgmt_centre_name')}
                 value={name} onChange={e => setName(e.target.value)} className="field text-xs py-1.5" required />
          <input type="text" placeholder={tr('mgmt_address')}
                 value={address} onChange={e => setAddress(e.target.value)} className="field text-xs py-1.5" />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary py-1 px-3 text-xs">{tr('mgmt_create')}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost py-1 px-3 text-xs">{tr('mgmt_cancel')}</button>
          </div>
        </form>
      )}
      <div className="grid gap-2">
        {centres?.length === 0
          ? <EmptyState message="No centres added yet." cta="Add your first centre" onCta={() => setShowForm(true)} />
          : centres?.map(c => (
            <ItemRow key={c.id} onDelete={() => deleteCentre.mutate(c.id)}>
              <div className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
              {c.address && <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>📍 {c.address}</div>}
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
  const { tr } = useLanguage();

  const filteredRooms = filterCentre ? rooms?.filter(r => r.centreId === filterCentre) : rooms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !centreId) return;
    await createRoom.mutateAsync({ centreId, name: name.trim() });
    success(tr('common_added'), `Room "${name.trim()}" has been created.`);
    setName(''); setCentreId(''); setShowForm(false);
  };

  if (isLoading) return <div className="skeleton h-40 rounded-xl" />;

  return (
    <div className="space-y-4">
      <SectionHeader title={tr('mgmt_rooms')} count={rooms?.length} onAdd={() => setShowForm(true)} addLabel={tr('mgmt_add_room')} />
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg space-y-3 animate-fade-in border"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
          <select value={centreId} onChange={e => setCentreId(e.target.value)} className="field text-xs py-1.5" required>
            <option value="">{tr('form_select_centre')}</option>
            {centres?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="text" placeholder={tr('mgmt_room_name')}
                 value={name} onChange={e => setName(e.target.value)} className="field text-xs py-1.5" required />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary py-1 px-3 text-xs">{tr('mgmt_create')}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost py-1 px-3 text-xs">{tr('mgmt_cancel')}</button>
          </div>
        </form>
      )}
      {/* Centre filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        <select value={filterCentre} onChange={e => setFilterCentre(e.target.value)} className="field text-xs py-1 px-2.5 max-w-[200px]"
                style={{ background: 'var(--field-bg)', border: '1px solid var(--border-default)' }}>
          <option value="">{tr('filter_all_centres')}</option>
          {centres?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid gap-2">
        {filteredRooms?.length === 0
          ? <EmptyState message="No rooms added yet." cta="Add your first room" onCta={() => setShowForm(true)} />
          : filteredRooms?.map(r => (
            <ItemRow key={r.id} onDelete={() => deleteRoom.mutate(r.id)}>
              <div className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>{r.name}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>🏢 {r.centre.name}</div>
            </ItemRow>
          ))}
      </div>
    </div>
  );
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/* ─── Courses ─────────────────────────────────────────────────────── */
function CoursesManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [colorHex, setColorHex] = useState('#6366f1');
  const [totalSessions, setTotalSessions] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: courses, isLoading } = useCourses();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();
  const createBulkCourses = useCreateBulkCourses();
  const { success, error: toastError } = useToast();
  const { tr } = useLanguage();

  const categories = courses ? ['ALL', ...Array.from(new Set(courses.map(c => c.category)))] : ['ALL'];
  const filtered = courses?.filter(c => {
    const q = searchTerm.toLowerCase();
    return (c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
      && (selectedCategory === 'ALL' || c.category === selectedCategory);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return;
    const sessionsNum = totalSessions.trim() ? parseInt(totalSessions, 10) : null;
    if (sessionsNum !== null && isNaN(sessionsNum)) return;

    try {
      if (editingCourse) {
        await updateCourse.mutateAsync({
          id: editingCourse.id,
          data: { name: name.trim(), category: category.trim(), colorHex, totalSessions: sessionsNum }
        });
        success('Course Updated', `"${name.trim()}" has been updated.`);
      } else {
        await createCourse.mutateAsync({ name: name.trim(), category: category.trim(), colorHex, totalSessions: sessionsNum });
        success('Course Added', `"${name.trim()}" has been added.`);
      }
      resetForm();
    } catch (err: any) {
      toastError('Error', err.message);
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setName(course.name);
    setCategory(course.category);
    setColorHex(course.colorHex || '#6366f1');
    setTotalSessions(course.totalSessions?.toString() || '');
    setShowForm(true);
  };

  const resetForm = () => {
    setName('');
    setCategory('');
    setTotalSessions('');
    setColorHex('#6366f1');
    setEditingCourse(null);
    setShowForm(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const startIdx = (lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('category')) ? 1 : 0;
        
        const coursesToImport = lines.slice(startIdx).map(line => {
          const parts = parseCSVLine(line);
          const name = parts[0]?.replace(/"/g, '').trim();
          const category = parts[1]?.replace(/"/g, '').trim();
          const colorHex = parts[2]?.replace(/"/g, '').trim() || '#6366f1';
          const sessions = parts[3]?.replace(/"/g, '').trim();
          
          return {
            name,
            category,
            colorHex: /^#[0-9A-Fa-f]{6}$/.test(colorHex) ? colorHex : '#6366f1',
            totalSessions: sessions ? parseInt(sessions, 10) : null
          };
        }).filter(c => c.name && c.category);

        if (coursesToImport.length === 0) {
          throw new Error('No valid course data found in CSV.');
        }

        const result = await createBulkCourses.mutateAsync(coursesToImport);
        success('Import Successful', result.message);
      } catch (err: any) {
        toastError('Import Failed', err.message);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const headers = 'Name,Category,ColorHex,TotalSessions\n';
    const sample = 'IELTS-Achiever 1,IELTS,#6366f1,24\nIELTS-Achiever 2,IELTS,#8b5cf6,24';
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'courses_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="skeleton h-40 rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="heading-md" style={{ fontSize: '1rem', fontWeight: 600 }}>{tr('mgmt_courses')}</h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{courses?.length} {tr('mgmt_total')}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button onClick={handleDownloadTemplate} className="btn-ghost py-1 px-2.5 text-xs flex items-center gap-1 border"
                  style={{ borderColor: 'var(--border-default)' }}>
            <Download className="w-3.5 h-3.5" /> {tr('mgmt_download_template')}
          </button>
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="btn-ghost py-1 px-2.5 text-xs flex items-center gap-1 border"
                  style={{ borderColor: 'var(--border-default)' }} disabled={isImporting}>
            <FileUp className="w-3.5 h-3.5" /> {isImporting ? tr('mgmt_importing') : tr('mgmt_import_csv')}
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary py-1 px-3 text-xs flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> {tr('mgmt_add_course')}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg space-y-3 animate-fade-in border"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
          <input type="text" placeholder={tr('mgmt_course_name')}
                 value={name} onChange={e => setName(e.target.value)} className="field text-xs py-1.5" required />
          <input type="text" placeholder={tr('mgmt_category')}
                 value={category} onChange={e => setCategory(e.target.value)} className="field text-xs py-1.5" required />
          <input type="number" placeholder={tr('mgmt_total_sessions')} min="1"
                 value={totalSessions} onChange={e => setTotalSessions(e.target.value)} className="field text-xs py-1.5" />
          <div className="flex items-center gap-3">
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>{tr('mgmt_color')}</label>
            <input type="color" value={colorHex} onChange={e => setColorHex(e.target.value)}
                   className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
            <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{colorHex}</span>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary py-1 px-3 text-xs">{editingCourse ? tr('mgmt_save') : tr('mgmt_create')}</button>
            <button type="button" onClick={resetForm} className="btn-ghost py-1 px-3 text-xs">{tr('mgmt_cancel')}</button>
          </div>
        </form>
      )}

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder={tr('mgmt_search_courses')} value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)} className="field pl-9 text-xs py-1.5"
                 style={{ background: 'var(--field-bg)', border: '1px solid var(--border-default)' }} />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="field text-xs py-1.5 px-2.5"
                  style={{ background: 'var(--field-bg)', border: '1px solid var(--border-default)', minWidth: '140px' }}>
            {categories.map(cat => <option key={cat} value={cat}>{cat === 'ALL' ? tr('mgmt_all_categories') : cat}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-2">
        {filtered?.length === 0
          ? <EmptyState message={courses?.length === 0 ? tr('mgmt_no_data') : tr('mgmt_no_data')} cta={tr('mgmt_add_course')} onCta={() => setShowForm(true)} />
          : filtered?.map(c => (
            <ItemRow key={c.id} onDelete={() => deleteCourse.mutate(c.id)}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.colorHex ?? '#6366f1' }} />
                  <div className="min-w-0">
                    <div className="font-semibold text-xs truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                    <div className="text-[10px] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <span className="px-1.5 py-0.5 rounded-full font-bold"
                            style={{ background: 'rgba(255,248,232,0.04)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                        {c.category}
                      </span>
                      {c.totalSessions && (
                        <>
                          <span>·</span>
                          <span>{c.totalSessions} {tr('mgmt_sessions_count')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleEdit(c)} className="p-1.5 hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors group-hover:opacity-100 opacity-0">
                  <Edit2 className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                </button>
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
  const { tr } = useLanguage();

  const filtered = teachers?.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createTeacher.mutateAsync({ name: name.trim(), email: email.trim() || null, phone: phone.trim() || null });
    success(tr('common_added'), `${name.trim()} has been added.`);
    setName(''); setEmail(''); setPhone(''); setShowForm(false);
  };

  if (isLoading) return <div className="skeleton h-40 rounded-xl" />;

  return (
    <div className="space-y-4">
      <SectionHeader title={tr('mgmt_teachers')} count={teachers?.length} onAdd={() => setShowForm(true)} addLabel={tr('mgmt_add_teacher')} />
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg space-y-3 animate-fade-in border"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
          <input type="text" placeholder={tr('mgmt_teacher_name')} value={name} onChange={e => setName(e.target.value)} className="field text-xs py-1.5" required />
          <input type="email" placeholder={tr('mgmt_email')} value={email} onChange={e => setEmail(e.target.value)} className="field text-xs py-1.5" />
          <input type="tel" placeholder={tr('mgmt_phone')} value={phone} onChange={e => setPhone(e.target.value)} className="field text-xs py-1.5" />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary py-1 px-3 text-xs">{tr('mgmt_create')}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost py-1 px-3 text-xs">{tr('mgmt_cancel')}</button>
          </div>
        </form>
      )}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder={tr('mgmt_search_teachers')} value={search}
                 onChange={e => setSearch(e.target.value)} className="field pl-9 text-xs py-1.5"
                 style={{ background: 'var(--field-bg)', border: '1px solid var(--border-default)' }} />
        </div>
      </div>
      <div className="grid gap-2">
        {filtered?.length === 0
          ? <EmptyState message="No teachers added yet." cta="Add your first teacher" onCta={() => setShowForm(true)} />
          : filtered?.map(t => (
            <ItemRow key={t.id} onDelete={() => deleteTeacher.mutate(t.id)}>
              <div className="flex items-center gap-3">
                
                {/* Circular initials avatar of consistent sizing */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border"
                     style={{
                       background: 'rgba(232,160,32,0.10)',
                       color: 'var(--brand-primary)',
                       borderColor: 'rgba(232,160,32,0.25)'
                     }}>
                  {t.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(-2)}
                </div>
                <div>
                  <div className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>{t.name}</div>
                  {t.email && <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>✉️ {t.email}</div>}
                </div>
              </div>
            </ItemRow>
          ))}
      </div>
    </div>
  );
}
