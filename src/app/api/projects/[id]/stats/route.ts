import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/authorization';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

    // Fetch project to verify it exists and check access permissions
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Role-based security check
    if (project.centreId && (user.role === 'TEACHER' || user.role === 'CENTRE_MANAGER')) {
      if (user.centreId !== project.centreId) {
        return NextResponse.json({ error: 'Forbidden centre access' }, { status: 403 });
      }
    }

    // Fetch all tasks for this project
    const tasks = await prisma.task.findMany({
      where: {
        section: { projectId },
      },
      include: {
        section: true,
        assignee: {
          select: { id: true, name: true },
        },
      },
    });

    const now = new Date();

    // 1. totalByCategory
    const categoryCounts: Record<string, number> = {};
    tasks.forEach(t => {
      const cat = t.category?.trim() || 'Uncategorized';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const totalByCategory = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
    }));

    // 2. overdueCount (dueDateEnd is in the past and task is not completed)
    const overdueTasks = tasks.filter(t => !t.completed && t.dueDateEnd && new Date(t.dueDateEnd) < now);
    const overdueCount = overdueTasks.length;

    // 3. completedCount
    const completedTasks = tasks.filter(t => t.completed);
    const completedCount = completedTasks.length;

    // 4. avgCompletionDays
    let totalCompletionTimeMs = 0;
    let completedWithDatesCount = 0;
    completedTasks.forEach(t => {
      if (t.completedAt) {
        const compDate = new Date(t.completedAt);
        const crDate = new Date(t.createdAt);
        const diffMs = compDate.getTime() - crDate.getTime();
        totalCompletionTimeMs += Math.max(0, diffMs);
        completedWithDatesCount++;
      }
    });
    const avgCompletionDays = completedWithDatesCount > 0
      ? parseFloat(((totalCompletionTimeMs / (1000 * 60 * 60 * 24)) / completedWithDatesCount).toFixed(1))
      : null;

    // 5. byWeek (Tasks completed in the last 4 weeks)
    const weekMap: Record<string, number> = {};
    const weekLabels: string[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i * 7);
      // Align to Sunday of that week
      const sun = new Date(d);
      sun.setDate(d.getDate() - d.getDay());
      const label = sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      weekMap[label] = 0;
      weekLabels.push(label);
    }

    completedTasks.forEach(t => {
      if (t.completedAt) {
        const compDate = new Date(t.completedAt);
        const diffDays = Math.floor((now.getTime() - compDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 28) {
          // Find closest week start label
          const taskSun = new Date(compDate);
          taskSun.setDate(compDate.getDate() - compDate.getDay());
          const label = taskSun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (weekMap[label] !== undefined) {
            weekMap[label]++;
          }
        }
      }
    });
    const byWeek = weekLabels.map(week => ({
      week,
      count: weekMap[week] || 0,
    }));

    // 6. byAssigneeWeek (Tasks completed by assignee)
    const assigneeCompletedMap: Record<string, number> = {};
    completedTasks.forEach(t => {
      const name = t.assignee?.name || 'Unassigned';
      assigneeCompletedMap[name] = (assigneeCompletedMap[name] || 0) + 1;
    });
    const byAssigneeWeek = Object.entries(assigneeCompletedMap).map(([name, count]) => ({
      name,
      count,
    }));

    // 7. avgTimeByAssignee (Average completion days per assignee)
    const assigneeTimeMap: Record<string, { totalMs: number; count: number }> = {};
    completedTasks.forEach(t => {
      if (t.completedAt) {
        const name = t.assignee?.name || 'Unassigned';
        const compDate = new Date(t.completedAt);
        const crDate = new Date(t.createdAt);
        const diffMs = compDate.getTime() - crDate.getTime();
        
        if (!assigneeTimeMap[name]) {
          assigneeTimeMap[name] = { totalMs: 0, count: 0 };
        }
        assigneeTimeMap[name].totalMs += Math.max(0, diffMs);
        assigneeTimeMap[name].count++;
      }
    });
    const avgTimeByAssignee = Object.entries(assigneeTimeMap).map(([name, val]) => ({
      name,
      avgDays: parseFloat(((val.totalMs / (1000 * 60 * 60 * 24)) / val.count).toFixed(1)),
    }));

    // 8. overdueByCategory (Overdue tasks per category)
    const overdueCategoryMap: Record<string, number> = {};
    overdueTasks.forEach(t => {
      const cat = t.category?.trim() || 'Uncategorized';
      overdueCategoryMap[cat] = (overdueCategoryMap[cat] || 0) + 1;
    });
    const overdueByCategory = Object.entries(overdueCategoryMap).map(([category, count]) => ({
      category,
      count,
    }));

    // 9. stageAvgDays (Average age of open tasks in each section/column)
    const sectionAgeMap: Record<string, { totalMs: number; count: number }> = {};
    const openTasks = tasks.filter(t => !t.completed);
    openTasks.forEach(t => {
      const sectionName = t.section.name;
      const crDate = new Date(t.createdAt);
      const diffMs = now.getTime() - crDate.getTime();

      if (!sectionAgeMap[sectionName]) {
        sectionAgeMap[sectionName] = { totalMs: 0, count: 0 };
      }
      sectionAgeMap[sectionName].totalMs += Math.max(0, diffMs);
      sectionAgeMap[sectionName].count++;
    });
    const stageAvgDays = Object.entries(sectionAgeMap).map(([sectionName, val]) => ({
      sectionName,
      avgDays: parseFloat(((val.totalMs / (1000 * 60 * 60 * 24)) / val.count).toFixed(1)),
    }));

    // 10. byStatus (Task count in each status section - specifically for REQUESTS project)
    const statusCounts: Record<string, number> = {};
    // Pre-populate sections
    const projectSections = await prisma.section.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });
    projectSections.forEach(s => {
      statusCounts[s.name] = 0;
    });
    tasks.forEach(t => {
      statusCounts[t.section.name] = (statusCounts[t.section.name] || 0) + 1;
    });
    const byStatus = Object.entries(statusCounts).map(([sectionName, count]) => ({
      sectionName,
      count,
    }));

    return NextResponse.json({
      totalByCategory,
      overdueCount,
      completedCount,
      avgCompletionDays,
      byWeek,
      byAssigneeWeek,
      avgTimeByAssignee,
      overdueByCategory,
      stageAvgDays,
      byStatus,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[PROJECT_STATS_GET]', error);
    return NextResponse.json({ error: 'Failed to fetch project statistics' }, { status: 500 });
  }
}
