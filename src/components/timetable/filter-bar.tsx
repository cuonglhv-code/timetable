'use client';

import { Search, X, Download, Plus, Filter } from 'lucide-react';
import { useCentres } from '@/hooks/use-centres';
import { useTeachers } from '@/hooks/use-teachers';
import { useCourses } from '@/hooks/use-courses';
import { useLanguage } from '@/providers/language-provider';
import type { FilterOptions } from '@/types';

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  user: { role: string };
}

export function FilterBar({ filters, onFilterChange, user }: FilterBarProps) {
  const { tr, lang } = useLanguage();
  const { data: centres } = useCentres();
  const { data: teachers } = useTeachers();
  const { data: courses } = useCourses();

  const isWriteUser = user.role !== 'TEACHER';
  const hasActiveFilters = !!(filters.centreId || filters.teacherId || filters.courseId || filters.searchQuery);

  const clearFilters = () => onFilterChange({});

  const handleAddClick = () => {
    window.dispatchEvent(new CustomEvent('open-session-form'));
  };

  const removeFilter = (key: keyof FilterOptions) => {
    const next = { ...filters };
    delete next[key];
    onFilterChange(next);
  };

  // Build active filter chips
  const activeChips: { key: keyof FilterOptions; label: string }[] = [];
  if (filters.centreId && centres) {
    const c = centres.find(x => x.id === filters.centreId);
    if (c) activeChips.push({ key: 'centreId', label: `${tr('form_centre')}: ${c.name}` });
  }
  if (filters.teacherId && teachers) {
    const t = teachers.find(x => x.id === filters.teacherId);
    if (t) activeChips.push({ key: 'teacherId', label: `${tr('form_teacher')}: ${t.name}` });
  }
  if (filters.courseId && courses) {
    const c = courses.find(x => x.id === filters.courseId);
    if (c) activeChips.push({ key: 'courseId', label: `${tr('form_course')}: ${c.name}` });
  }
  if (filters.searchQuery) {
    activeChips.push({ key: 'searchQuery', label: `"${filters.searchQuery}"` });
  }

  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl border"
         style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
      
      {/* Toolbar Main Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Left-aligned: Add Button (hidden for read-only TEACHER) */}
        <div className="flex items-center flex-shrink-0">
          {isWriteUser ? (
            <button
              onClick={handleAddClick}
              className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Thêm buổi học' : 'Add Session'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              <Filter className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'BỘ LỌC' : 'FILTERS'}</span>
            </div>
          )}
        </div>

        {/* Right-aligned selectors + Search */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 flex-1 min-w-0">
          
          {/* Dropdown Centre */}
          <select
            value={filters.centreId ?? ''}
            onChange={e => onFilterChange({ ...filters, centreId: e.target.value || undefined })}
            className="field text-xs py-1.5 px-2.5 max-w-[140px] truncate"
            style={{ border: '1px solid var(--border-default)', background: 'var(--field-bg)' }}
          >
            <option value="">{tr('filter_all_centres')}</option>
            {centres?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Dropdown Teacher */}
          <select
            value={filters.teacherId ?? ''}
            onChange={e => onFilterChange({ ...filters, teacherId: e.target.value || undefined })}
            className="field text-xs py-1.5 px-2.5 max-w-[140px] truncate"
            style={{ border: '1px solid var(--border-default)', background: 'var(--field-bg)' }}
          >
            <option value="">{tr('filter_all_teachers')}</option>
            {teachers?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          {/* Dropdown Course */}
          <select
            value={filters.courseId ?? ''}
            onChange={e => onFilterChange({ ...filters, courseId: e.target.value || undefined })}
            className="field text-xs py-1.5 px-2.5 max-w-[140px] truncate"
            style={{ border: '1px solid var(--border-default)', background: 'var(--field-bg)' }}
          >
            <option value="">{tr('filter_all_courses')}</option>
            {courses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Search bar */}
          <div className="relative min-w-[160px] flex-1 max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                    style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={tr('filter_search')}
              value={filters.searchQuery ?? ''}
              onChange={e => onFilterChange({ ...filters, searchQuery: e.target.value || undefined })}
              className="field pl-8 pr-2.5 py-1.5 text-xs w-full"
              style={{ border: '1px solid var(--border-default)', background: 'var(--field-bg)' }}
            />
          </div>

          {/* Export to CSV */}
          <a
            href={`/api/sessions/export?format=csv${
              filters.centreId  ? `&centreId=${filters.centreId}`   : ''
            }${
              filters.teacherId ? `&teacherId=${filters.teacherId}` : ''
            }`}
            download="timetable.csv"
            className="btn-ghost py-1.5 px-2.5 text-xs flex items-center gap-1 border"
            style={{ borderColor: 'var(--border-default)' }}
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">CSV</span>
          </a>
        </div>
      </div>

      {/* Dismissible Chips Row */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t"
             style={{ borderColor: 'var(--border-subtle)' }}>
          <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {lang === 'vi' ? 'Đang lọc:' : 'Active filters:'}
          </span>
          {activeChips.map(chip => (
            <div key={chip.key}
                 className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                 style={{ background: 'rgba(232,160,32,0.1)', color: 'var(--brand-primary)', border: '1px solid rgba(232,160,32,0.2)' }}>
              <span>{chip.label}</span>
              <button onClick={() => removeFilter(chip.key)}
                      className="hover:text-brand-accent p-0.5 rounded-full">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button onClick={clearFilters}
                  className="text-xs hover:underline flex items-center gap-0.5 ml-auto text-[11px]"
                  style={{ color: 'var(--brand-primary)' }}>
            {tr('filter_clear')}
          </button>
        </div>
      )}
    </div>
  );
}
