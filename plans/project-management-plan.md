# Implementation Plan: Project Management Tab (Asana-Style)

This plan outlines the architecture, database changes, and UI features required to integrate a full-stack, Asana-style "Group Project Tracker" into the Jaxtina Timetable application.

---

## 1. Major Improvements Over the Original Plan
Based on the review of the draft plan, the following enhancements have been incorporated to align perfectly with the production-ready architecture of `my-timetable`:

1. **Scoping & Centre-Based Security**: 
   - Projects are no longer just global. An optional `centreId` is added to the `Project` model to restrict project access to specific centres, matching the security schema of `CentreManager`.
   - Explicit database indexes on `centreId` and `creatorId` prevent performance issues as projects scale.
2. **Type-Safe Views & Priorities**:
   - `defaultView` is defined as a Prisma Enum (`ProjectViewType` containing `LIST`, `BOARD`, `CALENDAR`, `TIMELINE`) instead of a loose string.
   - `effort` is mapped to a `TaskEffort` Enum (`LOW`, `MEDIUM`, `HIGH`) to ensure uniform badge rendering and easy filtering.
3. **Bilingual Support (EN + VI)**:
   - Specific translation keys for project views, task creation, columns, and errors are defined to keep the bilingual design intact.
4. **Robust Reordering Logic**:
   - Drag-and-drop operations for Board/List views will use a batch reordering endpoint (`PATCH /api/tasks/reorder`) running inside a serializable database transaction (`prisma.$transaction`) to prevent dirty reads and race conditions.
5. **Audit Trail Compliance**:
   - Every mutation (create, edit, delete, complete) will invoke the `logAudit()` system asynchronously to capture change logs.

---

## 2. Proposed Database Schema Changes

#### [MODIFY] [schema.prisma](file:///c:/Users/cuong/Jaxtina%20Coding/my-timetable/prisma/schema.prisma)

```prisma
enum ProjectViewType {
  LIST
  BOARD
  CALENDAR
  TIMELINE
}

enum TaskEffort {
  LOW
  MEDIUM
  HIGH
}

model Project {
  id          String          @id @default(cuid())
  name        String
  description String?
  defaultView ProjectViewType @default(LIST)
  
  // Scoping to center (null means global/accessible by all managers)
  centreId    String?
  centre      Centre?         @relation(fields: [centreId], references: [id], onDelete: Cascade)
  
  // Ownership
  creatorId   String
  creator     User            @relation("ProjectCreator", fields: [creatorId], references: [id], onDelete: Restrict)
  
  sections    Section[]
  
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([centreId])
  @@index([creatorId])
}

model Section {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name      String
  order     Int      // Section position order inside the project
  tasks     Task[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([projectId])
}

model Task {
  id            String      @id @default(cuid())
  sectionId     String
  section       Section     @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  
  name          String
  description   String?
  completed     Boolean     @default(false)
  order         Int         // Task position order inside the section
  
  // Assignee mapping
  assigneeId    String?
  assignee      User?       @relation("TaskAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)
  
  // Duration
  dueDateStart  DateTime?
  dueDateEnd    DateTime?
  
  // Attributes
  effort        TaskEffort?
  category      String?     // e.g., "Feature", "Bug", "Design", "Academic"
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@index([sectionId])
  @@index([assigneeId])
}
```

*Note: Update existing models (e.g. `User`, `Centre`) to expose the inverse relations:*
- `User`: `createdProjects Project[] @relation("ProjectCreator")`, `assignedTasks Task[] @relation("TaskAssignee")`
- `Centre`: `projects Project[]`

---

## 3. Translation Keys (`src/lib/i18n.ts`)

Add the following translations to the `TRANSLATIONS` dictionary:

```typescript
// English Translations
en: {
  nav_projects: 'Projects',
  project_title: 'Project Management',
  project_create_btn: 'New Project',
  project_default_view: 'Default View',
  project_no_desc: 'No description provided.',
  project_view_list: 'List',
  project_view_board: 'Board',
  project_view_calendar: 'Calendar',
  project_view_timeline: 'Timeline',
  project_add_task: 'Add Task...',
  project_section_add: 'Add Section',
  project_assignee: 'Assignee',
  project_due_date: 'Due Date',
  project_effort: 'Effort',
  project_category: 'Category',
  project_effort_low: 'Low',
  project_effort_medium: 'Medium',
  project_effort_high: 'High',
  project_task_placeholder: 'Task name...',
  project_delete_confirm: 'Are you sure you want to delete this project?',
  project_error_load: 'Could not load project details.',
  project_save_success: 'Project saved successfully.',
}

// Vietnamese Translations
vi: {
  nav_projects: 'Dự án',
  project_title: 'Quản lý dự án',
  project_create_btn: 'Dự án mới',
  project_default_view: 'Giao diện mặc định',
  project_no_desc: 'Chưa có mô tả.',
  project_view_list: 'Danh sách',
  project_view_board: 'Bảng',
  project_view_calendar: 'Lịch',
  project_view_timeline: 'Mốc thời gian',
  project_add_task: 'Thêm công việc...',
  project_section_add: 'Thêm phần',
  project_assignee: 'Người thực hiện',
  project_due_date: 'Hạn chót',
  project_effort: 'Độ khó',
  project_category: 'Phân loại',
  project_effort_low: 'Thấp',
  project_effort_medium: 'Vừa',
  project_effort_high: 'Cao',
  project_task_placeholder: 'Tên công việc...',
  project_delete_confirm: 'Bạn có chắc chắn muốn xóa dự án này không?',
  project_error_load: 'Không thể tải chi tiết dự án.',
  project_save_success: 'Lưu dự án thành công.',
}
```

---

## 4. API Endpoints (`src/app/api/projects/`)

All endpoints will be secured using `requireAuth()` and role verification.

### `GET /api/projects`
- **Access**: `CENTRAL_ADMIN`, `ACADEMIC_SUPERVISOR`, `CENTRE_MANAGER`, `TEACHER`
- **Behavior**: Returns projects. If the user is a `CENTRE_MANAGER` or `TEACHER`, it returns only projects where `centreId === user.centreId` or `centreId === null`. Admins receive all projects.

### `POST /api/projects`
- **Access**: `CENTRAL_ADMIN`, `ACADEMIC_SUPERVISOR`, `CENTRE_MANAGER`
- **Payload**: `{ name: string, description?: string, defaultView: ProjectViewType, centreId?: string }`
- **Behavior**: Creates a project, automatically sets `creatorId = user.id`. Creates a default "To Do" section. Triggers audit log.

### `PATCH /api/projects/[id]` / `DELETE /api/projects/[id]`
- **Access**: Creators, Admins, or Centre Managers of that centre.
- **Behavior**: Updates metadata or deletes project. Deleting cascades to sections and tasks. Triggers audit log.

### `POST /api/sections` / `PATCH /api/sections/[id]` / `DELETE /api/sections/[id]`
- **Behavior**: Manages sections within a project. Section deletes cascade to tasks.

### `POST /api/tasks` / `PATCH /api/tasks/[id]` / `DELETE /api/tasks/[id]`
- **Behavior**: Manages tasks. Mutation logs are saved.

### `PATCH /api/tasks/reorder` (New Batch Reorder API)
- **Payload**: `{ tasks: { id: string, order: number, sectionId: string }[] }`
- **Behavior**: Updates multiple tasks in a single serializable Prisma transaction to guarantee smooth drag-and-drop state persistence without race conditions.

---

## 5. UI Architecture & Components

The interface will be constructed under `src/components/projects/`:
- `projects-container.tsx`: Main shell containing the project list sidebar/dropdown, active project state, view selector, and controls.
- `list-view.tsx`: Table layout grouping tasks by section. Inline editable row at the bottom for quick task additions.
- `board-view.tsx`: Kanban column layout with `@dnd-kit/core` and `@dnd-kit/sortable`. Accents for Effort/Category pills use the saffron-amber variable (`var(--brand-primary)`) or subtle borders.
- `calendar-view.tsx`: Full monthly grid layout using `date-fns` displaying multi-day event bars.
- `timeline-view.tsx`: Gantt chart layout showing a sidebar list of tasks synchronized with a horizontal scroll timeline grid representing weeks/months.

---

## 6. Implementation Checklist

- [ ] Define the Prisma models in `schema.prisma` and run `npx prisma db push` & `npx prisma generate`
- [ ] Add translation strings to `src/lib/i18n.ts`
- [ ] Create API routes in `src/app/api/projects/` (and sub-paths for sections, tasks, reorder)
- [ ] Write Zod schemas for input validation in `src/lib/validators.ts`
- [ ] Create hooks in `src/hooks/use-projects.ts` using `@tanstack/react-query`
- [ ] Add "Projects" tab to `src/app/timetable-app.tsx`
- [ ] Build the frontend view components (List, Board, Calendar, Timeline)
- [ ] Create mock data seed script `scripts/seed-projects.js` and test it
- [ ] Verify permissions (Teachers are read-only for editing projects/sections, but can manage tasks assigned to them)
