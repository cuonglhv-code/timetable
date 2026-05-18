/**
 * Filter bar for filtering sessions by centre, teacher, course, and search.
 * @module components/timetable/filter-bar
 */

'use client';

import { Search } from 'lucide-react';
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search classes..."
            value={filters.searchQuery ?? ''}
            onChange={(e) =>
              onFilterChange({ ...filters, searchQuery: e.target.value || undefined })
            }
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={filters.centreId ?? ''}
          onChange={(e) =>
            onFilterChange({ ...filters, centreId: e.target.value || undefined })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Centres</option>
          {centres?.map((centre) => (
            <option key={centre.id} value={centre.id}>
              {centre.name}
            </option>
          ))}
        </select>

        <select
          value={filters.teacherId ?? ''}
          onChange={(e) =>
            onFilterChange({ ...filters, teacherId: e.target.value || undefined })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Teachers</option>
          {teachers?.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>

        <select
          value={filters.courseId ?? ''}
          onChange={(e) =>
            onFilterChange({ ...filters, courseId: e.target.value || undefined })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Courses</option>
          {courses?.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
