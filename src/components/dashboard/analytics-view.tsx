'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import {
  Calendar, TrendingUp, Download, BookOpen, Users, Clock, BarChart2
} from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import type { TranslationKey } from '@/lib/i18n';
import { useCentres } from '@/hooks/use-centres';
import { useCourses } from '@/hooks/use-courses';

interface CentreMetric {
  id: string;
  name: string;
  activeRooms: number;
  totalCapacity: number;
  hoursBooked: number;
  maxPossibleHours: number;
  utilizationRate: number;
}

interface CourseCategoryMetric {
  category: string;
  sessionCount: number;
  hoursBooked: number;
}

interface AnalyticsData {
  timeRange: {
    startDate: string;
    endDate: string;
  };
  centreMetrics: CentreMetric[];
  courseCategoryMetrics: CourseCategoryMetric[];
}

interface AnalyticsViewProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    centreId: string | null;
    teacherId: string | null;
  };
}

interface CustomTooltipProps extends Partial<TooltipContentProps<number, string>> {
  tr: (key: TranslationKey) => string;
  donutTotal?: number;
}

const COLORS = [
  'var(--brand-primary)',    // Saffron-amber
  'var(--brand-secondary)',  // Teal
  '#818cf8',                 // Indigo
  '#c084fc',                 // Purple
  '#fb7185',                 // Rose/Pink
  '#38bdf8',                 // Sky Blue
  '#fca5a5'                  // Pastel Red
];

// Custom tooltips declared outside of the render function to prevent re-creation
function CustomBarTooltip({ active, payload, label, tr }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const hoursBooked = Number(payload[0].value ?? 0);
    const maxPossible = Number(payload[1]?.value ?? 0);
    const rate = maxPossible > 0 ? Math.round((hoursBooked / maxPossible) * 1000) / 10 : 0;
    
    return (
      <div className="p-3 border rounded-xl shadow-2xl text-xs space-y-1"
           style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-strong)' }}>
        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p style={{ color: payload[0].color }}>
          {tr('analytics_legend_booked')}: <span className="font-bold">{hoursBooked}h</span>
        </p>
        {payload[1] && (
          <p style={{ color: 'var(--text-secondary)' }}>
            {tr('analytics_legend_max')}: <span className="font-bold">{maxPossible}h</span>
          </p>
        )}
        <div className="h-px bg-gray-800 my-1" />
        <p style={{ color: 'var(--brand-accent)' }}>
          {tr('analytics_legend_rate')}: <span className="font-bold">{rate}%</span>
        </p>
      </div>
    );
  }
  return null;
}

function CustomPieTooltip({ active, payload, tr, donutTotal = 1 }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload as CourseCategoryMetric;
    const pct = donutTotal > 0 ? Math.round((item.sessionCount / donutTotal) * 1000) / 10 : 0;
    return (
      <div className="p-3 border rounded-xl shadow-2xl text-xs"
           style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-strong)' }}>
        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{item.category}</p>
        <p style={{ color: 'var(--brand-secondary)' }}>
          {tr('analytics_kpi_sessions')}: <span className="font-bold">{item.sessionCount}</span>
        </p>
        <p style={{ color: 'var(--brand-primary)' }}>
          {tr('analytics_legend_booked')}: <span className="font-bold">{item.hoursBooked}h</span>
        </p>
        <p style={{ color: 'var(--text-accent)' }}>
          Share: <span className="font-bold">{pct}%</span>
        </p>
      </div>
    );
  }
  return null;
}

export function AnalyticsView({ user }: AnalyticsViewProps) {
  const { tr, lang } = useLanguage();

  // 1. Resolve default date range (Current Month)
  const defaultDates = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    
    // First day of month (local)
    const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    // Last day of month (local)
    const lastDay = new Date(y, m + 1, 0).getDate();
    const endDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    return { startDate, endDate };
  }, []);

  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);
  
  // Tenancy restrictions: Centre managers are locked to their center
  const isCentreManager = user.role === 'CENTRE_MANAGER';
  const [selectedCentreId, setSelectedCentreId] = useState(
    isCentreManager && user.centreId ? user.centreId : 'ALL'
  );
  const [selectedCourseId, setSelectedCourseId] = useState('ALL');

  const { data: centres } = useCentres();
  const { data: courses } = useCourses();

  // Find assigned center name for manager
  const managerCentreName = useMemo(() => {
    if (!isCentreManager || !user.centreId || !centres) return null;
    return centres.find(c => c.id === user.centreId)?.name || 'My Centre';
  }, [isCentreManager, user.centreId, centres]);

  // 2. Query reports endpoint
  const queryParams = new URLSearchParams();
  queryParams.append('startDate', startDate);
  queryParams.append('endDate', endDate);
  if (selectedCentreId !== 'ALL') queryParams.append('centreId', selectedCentreId);
  if (selectedCourseId !== 'ALL') queryParams.append('courseId', selectedCourseId);

  const { data, isLoading, isError } = useQuery<AnalyticsData>({
    queryKey: ['analytics-report', startDate, endDate, selectedCentreId, selectedCourseId],
    queryFn: async () => {
      const res = await fetch(`/api/reports?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to load report data');
      return res.json();
    },
    refetchInterval: 60_000,
  });

  // 3. Compute KPIs
  const kpiStats = useMemo(() => {
    if (!data) return { totalHours: 0, totalSessions: 0, avgUtil: 0, activeRooms: 0 };

    const totalHours = data.centreMetrics.reduce((sum, c) => sum + c.hoursBooked, 0);
    const totalSessions = data.courseCategoryMetrics.reduce((sum, c) => sum + c.sessionCount, 0);
    const totalMaxHours = data.centreMetrics.reduce((sum, c) => sum + c.maxPossibleHours, 0);
    const avgUtil = totalMaxHours > 0 ? Math.round((totalHours / totalMaxHours) * 1000) / 10 : 0;
    const activeRooms = data.centreMetrics.reduce((sum, c) => sum + c.activeRooms, 0);

    return { totalHours, totalSessions, avgUtil, activeRooms };
  }, [data]);

  // Donut chart total calculation for percentage sharing
  const donutTotal = useMemo(() => {
    return data?.courseCategoryMetrics.reduce((sum, c) => sum + c.sessionCount, 0) || 0;
  }, [data]);

  const handleExportCSV = () => {
    const exportParams = new URLSearchParams(queryParams);
    exportParams.append('format', 'csv');
    window.open(`/api/reports?${exportParams.toString()}`, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* ── Filter Bar ────────────────────────────────────────── */}
      <div className="card p-4 flex flex-col xl:flex-row xl:items-end justify-between gap-4 animate-fade-in"
           style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        
        <div className="flex flex-wrap items-center gap-4 flex-1">
          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>
              {tr('analytics_start_date')}
            </span>
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 absolute left-3 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="field pl-9 pr-3 py-1.5 text-xs w-40"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
              />
            </div>
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>
              {tr('analytics_end_date')}
            </span>
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 absolute left-3 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="field pl-9 pr-3 py-1.5 text-xs w-40"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
              />
            </div>
          </div>

          {/* Centre selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>
              {tr('form_centre')}
            </span>
            {isCentreManager ? (
              <div className="field px-3 py-1.5 text-xs font-semibold cursor-not-allowed flex items-center gap-1.5"
                   style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                <Users className="w-3.5 h-3.5" />
                <span>{managerCentreName}</span>
              </div>
            ) : (
              <select
                value={selectedCentreId}
                onChange={e => setSelectedCentreId(e.target.value)}
                className="field py-1.5 px-3 text-xs w-44"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
              >
                <option value="ALL">{lang === 'vi' ? 'Tất cả cơ sở' : 'All Centres'}</option>
                {centres?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          {/* Course selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>
              {tr('form_course')}
            </span>
            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="field py-1.5 px-3 text-xs w-44"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
            >
              <option value="ALL">{lang === 'vi' ? 'Tất cả khoá học' : 'All Courses'}</option>
              {courses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* CSV Export Button */}
        <button
          onClick={handleExportCSV}
          disabled={isLoading}
          className="btn-primary py-2 px-4 text-xs flex items-center justify-center gap-2 font-bold flex-shrink-0 transition-transform active:scale-95"
          style={{ background: 'linear-gradient(135deg, var(--brand-primary) 0%, #4f46e5 100%)', border: 'none' }}
        >
          <Download className="w-4 h-4" />
          <span>{tr('analytics_export_btn')}</span>
        </button>
      </div>

      {/* ── KPI Widgets ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <Clock className="w-5 h-5" />,
            label: tr('analytics_kpi_total_hrs'),
            value: isLoading ? '—' : `${kpiStats.totalHours}h`,
            color: '#34d399',
            bg: 'rgba(52,211,153,0.08)'
          },
          {
            icon: <BookOpen className="w-5 h-5" />,
            label: tr('analytics_kpi_sessions'),
            value: isLoading ? '—' : kpiStats.totalSessions,
            color: '#c084fc',
            bg: 'rgba(192,132,252,0.08)'
          },
          {
            icon: <TrendingUp className="w-5 h-5" />,
            label: tr('analytics_kpi_avg_util'),
            value: isLoading ? '—' : `${kpiStats.avgUtil}%`,
            color: 'var(--brand-primary)',
            bg: 'rgba(232,160,32,0.08)',
            shadow: 'var(--shadow-glow)'
          },
          {
            icon: <Users className="w-5 h-5" />,
            label: tr('analytics_kpi_active_rms'),
            value: isLoading ? '—' : kpiStats.activeRooms,
            color: '#2dd4bf',
            bg: 'rgba(45,212,191,0.08)'
          }
        ].map((kpi, idx) => (
          <div key={idx} className="card p-4 flex items-start gap-4 transition-all duration-300 hover:border-accent"
               style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: kpi.shadow }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: kpi.bg, color: kpi.color }}>
              {kpi.icon}
            </div>
            <div>
              {isLoading ? (
                <div className="skeleton w-12 h-6 rounded mb-1.5" />
              ) : (
                <div className="text-xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{kpi.value}</div>
              )}
              <div className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Charts Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* Room Utilization Bar Chart */}
        <div className="xl:col-span-3 card p-5 flex flex-col gap-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
            <h3 className="heading-md">{tr('analytics_room_util')}</h3>
          </div>
          
          <div className="w-full h-80">
            {isLoading ? (
              <div className="w-full h-full skeleton rounded-xl" />
            ) : isError || !data || data.centreMetrics.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-sm muted">{tr('mgmt_no_data')}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.centreMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                  <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} unit="h" />
                  <Tooltip content={<CustomBarTooltip tr={tr} />} cursor={{ fill: 'var(--bg-glass)' }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="hoursBooked" name={tr('analytics_legend_booked')} fill="var(--brand-secondary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="maxPossibleHours" name={tr('analytics_legend_max')} fill="rgba(232, 160, 32, 0.2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Course Category Donut Chart */}
        <div className="xl:col-span-2 card p-5 flex flex-col gap-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
            <h3 className="heading-md">{tr('analytics_course_dist')}</h3>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row items-center justify-around gap-4 min-h-60">
            {isLoading ? (
              <div className="w-full h-full skeleton rounded-xl" />
            ) : isError || !data || data.courseCategoryMetrics.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-sm muted">{tr('mgmt_no_data')}</div>
            ) : (
              <>
                {/* Donut graphic */}
                <div className="w-44 h-44 relative flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.courseCategoryMetrics}
                        nameKey="category"
                        dataKey="sessionCount"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {data.courseCategoryMetrics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="var(--bg-surface)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip tr={tr} donutTotal={donutTotal} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center Text displaying total sessions */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                      {donutTotal}
                    </span>
                    <span className="text-[10px] tracking-wide mt-1 uppercase" style={{ color: 'var(--text-muted)' }}>
                      {tr('mgmt_sessions_count')}
                    </span>
                  </div>
                </div>

                {/* Custom list legend on side */}
                <div className="flex flex-col gap-2 flex-1 justify-center w-full">
                  {data.courseCategoryMetrics.map((item, idx) => {
                    const share = donutTotal > 0 ? Math.round((item.sessionCount / donutTotal) * 100) : 0;
                    return (
                      <div key={item.category} className="flex items-center justify-between text-xs py-1 border-b"
                           style={{ borderColor: 'var(--border-subtle)' }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[idx % COLORS.length] }} />
                          <span className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.category}</span>
                        </div>
                        <span className="font-mono font-medium flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                          {item.sessionCount} ({share}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
