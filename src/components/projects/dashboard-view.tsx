'use client';

import { useState } from 'react';
import { useProject } from '@/hooks/use-projects';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';

interface DashboardViewProps {
  project: {
    id: string;
    type: 'KANBAN' | 'REQUESTS';
  };
  user?: { id: string; role: string };
}

export function DashboardView({ project }: DashboardViewProps) {
  const { lang, tr } = useLanguage();

  // Fetch full project data to perform dynamic client-side aggregations
  const { data: fullProject, isLoading, error, refetch } = useProject(project.id);

  // Open bugs widget visibility state (managed in localStorage/state)
  const [showOpenBugs, setShowOpenBugs] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`kanban-show-open-bugs-${project.id}`);
      return stored !== 'false';
    }
    return true;
  });

  const handleRemoveOpenBugs = () => {
    setShowOpenBugs(false);
    localStorage.setItem(`kanban-show-open-bugs-${project.id}`, 'false');
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton h-32 w-full rounded-2xl" />
        ))}
        {[1, 2].map(i => (
          <div key={i} className="skeleton h-72 w-full rounded-2xl md:col-span-3 lg:col-span-1" />
        ))}
      </div>
    );
  }

  if (error || !fullProject) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-2xl text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
        <h4 className="heading-md">{tr('common_error')}</h4>
        <button onClick={() => refetch()} className="btn-ghost mt-4 flex items-center gap-2 border">
          <RefreshCw className="w-3.5 h-3.5" />
          {lang === 'vi' ? 'Thử lại' : 'Retry'}
        </button>
      </div>
    );
  }

  const tasks = fullProject.sections.flatMap(s => s.tasks ?? []);
  const now = new Date();

  // 1. KPI: Average time to complete (days)
  const completedTasks = tasks.filter(t => t.completed && t.completedAt);
  const totalCompletionMs = completedTasks.reduce((sum, t) => {
    const start = new Date(t.createdAt).getTime();
    const end = new Date(t.completedAt!).getTime();
    return sum + Math.max(0, end - start);
  }, 0);
  const avgCompletionDays = completedTasks.length > 0
    ? parseFloat((totalCompletionMs / (1000 * 60 * 60 * 24) / completedTasks.length).toFixed(1))
    : null;

  // 2. KPI: Work in progress items (uncompleted tasks)
  const wipCount = tasks.filter(t => !t.completed).length;

  // 3. CHART: Weekly velocity (Story points shipped)
  const weeks: { week: string; startMs: number; points: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i * 7);
    const sun = new Date(d);
    sun.setDate(d.getDate() - d.getDay());
    sun.setHours(0, 0, 0, 0);
    const label = sun.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric' });
    weeks.push({ week: label, startMs: sun.getTime(), points: 0 });
  }

  completedTasks.forEach(t => {
    if (t.storyPoints) {
      const compMs = new Date(t.completedAt!).getTime();
      for (let i = 0; i < weeks.length; i++) {
        const currentStart = weeks[i].startMs;
        const nextStart = i < weeks.length - 1 ? weeks[i + 1].startMs : Infinity;
        if (compMs >= currentStart && compMs < nextStart) {
          weeks[i].points += t.storyPoints;
          break;
        }
      }
    }
  });

  const weeklyVelocityData = weeks.map(w => ({
    name: w.week,
    points: w.points,
  }));

  // 4. CHART: Average time in stage (minutes)
  const stageAvgTimeData = fullProject.sections.map(section => {
    const sectionTasks = section.tasks ?? [];
    let totalMs = 0;
    let count = 0;
    sectionTasks.forEach(t => {
      const start = new Date(t.createdAt).getTime();
      const end = t.completed && t.completedAt ? new Date(t.completedAt).getTime() : now.getTime();
      totalMs += Math.max(0, end - start);
      count++;
    });
    // Convert to minutes
    const avgMinutes = count > 0 ? parseFloat((totalMs / (1000 * 60) / count).toFixed(2)) : 0;
    return {
      name: section.name,
      avgMinutes,
    };
  });

  return (
    <div className="flex flex-col gap-6 flex-1 pb-10 select-none">
      {/* ── ROW 1: Small Widgets ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KPI 1: Average time to complete */}
        <div
          className="border rounded-2xl p-5 shadow-sm relative flex flex-col justify-between h-36"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <span className="text-[10px] font-bold tracking-wider block" style={{ color: 'var(--text-muted)' }}>
              {lang === 'vi' ? 'THỜI GIAN HOÀN THÀNH TRUNG BÌNH' : 'AVERAGE TIME TO COMPLETE'}
            </span>
            <div className="text-3xl font-black block mt-4" style={{ color: 'var(--text-primary)' }}>
              {avgCompletionDays !== null ? `${avgCompletionDays}d` : '—'}
            </div>
          </div>
          <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>
            ≡ {lang === 'vi' ? 'Không có bộ lọc' : 'No Filters'}
          </span>
        </div>

        {/* KPI 2: Work in progress items */}
        <div
          className="border rounded-2xl p-5 shadow-sm relative flex flex-col justify-between h-36"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <span className="text-[10px] font-bold tracking-wider block" style={{ color: 'var(--text-muted)' }}>
              {lang === 'vi' ? 'CÔNG VIỆC ĐANG THỰC HIỆN' : 'WORK IN PROGRESS ITEMS'}
            </span>
            <div className="text-3xl font-black block mt-4" style={{ color: 'var(--text-primary)' }}>
              {wipCount}
            </div>
          </div>
          <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>
            ≡ {lang === 'vi' ? '1 Bộ lọc' : '1 Filter'}
          </span>
        </div>

        {/* KPI 3: Open Bugs (Error State mockup Card) */}
        {showOpenBugs ? (
          <div
            className="border rounded-2xl p-5 shadow-sm relative flex flex-col justify-between h-36"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div>
              <span className="text-[10px] font-bold tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                {lang === 'vi' ? 'LỖI ĐANG MỞ' : 'OPEN BUGS'}
              </span>
              <div className="text-[11px] leading-relaxed mt-3" style={{ color: 'var(--text-secondary)' }}>
                {lang === 'vi' 
                  ? 'Biểu đồ này không thể hiển thị vì một trường không còn khả dụng' 
                  : 'This chart cannot be displayed because a field is no longer available'}
              </div>
            </div>
            <button
              onClick={handleRemoveOpenBugs}
              className="text-[10px] font-bold text-left hover:underline"
              style={{ color: 'var(--brand-primary)' }}
            >
              {lang === 'vi' ? 'Xóa biểu đồ' : 'Remove chart'}
            </button>
          </div>
        ) : (
          <div
            className="border border-dashed rounded-2xl p-5 flex items-center justify-center h-36"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <button
              onClick={() => {
                setShowOpenBugs(true);
                localStorage.removeItem(`kanban-show-open-bugs-${project.id}`);
              }}
              className="text-xs font-semibold hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              + {lang === 'vi' ? 'Khôi phục biểu đồ Lỗi' : 'Restore Open bugs chart'}
            </button>
          </div>
        )}
      </div>

      {/* ── ROW 2: Large Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: Weekly velocity (Story points shipped) */}
        <div
          className="border rounded-2xl p-5 shadow-sm flex flex-col h-80 justify-between"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              {lang === 'vi' ? 'Vận tốc tuần (Story points đã hoàn thành)' : 'Weekly velocity (Story points shipped)'}
            </h4>
          </div>
          <div className="flex-1 min-h-0 my-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyVelocityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)', fontSize: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="points"
                  stroke="#a7a1ff"
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 1 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>
            ≡ {lang === 'vi' ? 'Không có bộ lọc' : 'No Filters'}
          </span>
        </div>

        {/* CHART 2: Average time in stage */}
        <div
          className="border rounded-2xl p-5 shadow-sm flex flex-col h-80 justify-between"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              {lang === 'vi' ? 'Thời gian trung bình ở mỗi cột' : 'Average time in stage'}
            </h4>
          </div>
          <div className="flex-1 min-h-0 my-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageAvgTimeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: lang === 'vi' ? 'Thời gian (phút)' : 'Time in section (avg. in minutes)', angle: -90, position: 'insideLeft', style: { fontSize: '8px', fill: 'var(--text-muted)' } }}
                />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)', fontSize: '10px' }} />
                <Bar dataKey="avgMinutes" fill="#b4b0ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>
              ≡ {lang === 'vi' ? '1 Bộ lọc' : '1 Filter'}
            </span>
            <button className="text-[10px] font-bold border rounded px-2.5 py-1 hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
              {lang === 'vi' ? 'Xem tất cả' : 'See all'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
