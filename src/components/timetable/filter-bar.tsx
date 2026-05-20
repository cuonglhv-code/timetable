'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useCentres } from '@/hooks/use-centres';
import { useTeachers } from '@/hooks/use-teachers';
import { useCourses } from '@/hooks/use-courses';
import type { FilterOptions } from '@/types';

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const { data: centres } = useCentres();
  const { data: teachers } = useTeachers();
  const { data: courses } = useCourses();

  const hasActiveFilters = !!(filters.centreId || filters.teacherId || filters.courseId || filters.searchQuery);

  const clearFilters = () => onFilterChange({});

  return (
    <div className="card p-4" style={{ background: 'var(--bg-surface)' }}>
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search classes, teachers, courses…"
            value={filters.searchQuery ?? ''}
            onChange={e => onFilterChange({ ...filters, searchQuery: e.target.value || undefined })}
            className="field pl-9"
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center">
          <div className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="label text-xs">Filters:</span>
          </div>

          <select
            value={filters.centreId ?? ''}
            onChange={e => onFilterChange({ ...filters, centreId: e.target.value || undefined })}
            className="field"
            style={{ minWidth: '160px', flex: '1' }}
          >
            <option value="">All Centres</option>
            {centres?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select
            value={filters.teacherId ?? ''}
            onChange={e => onFilterChange({ ...filters, teacherId: e.target.value || undefined })}
            className="field"
            style={{ minWidth: '160px', flex: '1' }}
          >
            <option value="">All Teachers</option>
            {teachers?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <select
            value={filters.courseId ?? ''}
            onChange={e => onFilterChange({ ...filters, courseId: e.target.value || undefined })}
            className="field"
            style={{ minWidth: '160px', flex: '1' }}
          >
            <option value="">All Courses</option>
            {courses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn-ghost flex-shrink-0 gap-1.5 px-3 py-2 text-xs">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
