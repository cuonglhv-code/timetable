# Jaxtina Timetable Portal — User & Administrator Guide

Welcome to the Jaxtina Portal. This system provides **Class Scheduling & Timetable Management**, featuring visual calendar views, recurring schedule generation, and strict real-time conflict prevention for rooms and teachers.

This guide details system mechanics, conflict resolution rules, and step-by-step instructions customized for each of the four user roles: **Central Admin**, **Academic Supervisor**, **Centre Manager**, and **Teacher**.

---

## 🔑 Role Matrix & Permissions Overview

| Feature / Action | Central Admin (`CENTRAL_ADMIN`) | Academic Supervisor (`ACADEMIC_SUPERVISOR`) | Centre Manager (`CENTRE_MANAGER`) | Teacher (`TEACHER`) |
| :--- | :---: | :---: | :---: | :---: |
| **System Scope** | Global (All Centres) | Global (All Centres) | Scoped to Assigned Centre | Scoped to Assigned Teacher |
| **Timetable - View** | Read All | Read All | Read All | Read Self |
| **Timetable - Schedule / Edit** | Write All | Write All | Write Scoped | Read-Only |
| **Timetable - Delete** | Delete All | Blocked | Delete Scoped | Blocked |
| **Resource Settings - Centres** | Create, Update, Delete | Read-Only | Read-Only | Blocked |
| **Resource Settings - Rooms** | Create, Update, Delete | Create, Update, Delete | Create, Update, Delete (Scoped) | Blocked |
| **Resource Settings - Courses** | Create, Update, Delete | Create, Update, Delete | Create, Update, Delete | Blocked |
| **Resource Settings - Teachers**| Create, Update, Delete | Create, Update, Delete | Create, Update, Delete | Blocked |
| **User Management** | Full Access | Blocked | Blocked | Blocked |
| **Dashboard & Audit Logs** | Full Access | View Dashboard & Workload | Scoped Dashboard & Workload | Blocked |

---

## 🗓️ Timetable & Scheduling Mechanics

### 1. Conflict Prevention Rules
To prevent double bookings, the scheduling engine validates every class session inside a **Serializable Transaction** at the database level.
* **Room Conflict:** No two sessions in the same centre can occupy the same room at overlapping times.
* **Teacher Conflict:** A teacher cannot be scheduled to teach two sessions at overlapping times, even across different centres.
* **Time Overlaps:** An overlap is defined as any intersection of time intervals. For example, if Class A is from `08:00 - 09:30` and Class B is scheduled for `09:15 - 10:45`, a conflict is triggered.

### 2. Single vs. Recurring Scheduling
* **Single Session:** Booked for one specific date and time.
* **Recurring Series:** Schedulers can input a start date, select one or more days of the week (e.g., Monday and Thursday), and a "Repeat Until" end date. The engine dynamically calculates and books all matching calendar dates. If *even one* date in the series has a conflict, the transaction rolls back, schedules nothing, and alerts you to the exact date and conflict detail.

### 3. Exam & Test Management
When scheduling sessions, you can toggle additional test attributes:
* **Test Type:** Select `Mini Test`, `Mid-term Test`, or `Final Exam`. This applies a highlighted status badge in the calendar.
* **Exam Papers (Print-ready):** Paste a download link for teacher resources.
* **LMS Link:** Add a URL to online tests which teachers can copy and share with students.

---

## 📊 Module Guides

### 1. Dashboard View
* **Overview:** Tracks key performance metrics like *Average Time to Complete Tasks* and *Work in Progress Items*. It displays live charts for *Weekly Velocity* (story points completed) and *Average Time in Stage* (average duration tasks remain in a column/status).
* **Workload:** Monitors teaching hours per teacher in a bar chart to prevent burnout and ensure balanced scheduling.
* **Activity Logs:** A chronological audit log tracking all actions (create, edit, delete) on sessions for transparency.

### 2. Calendar Views (Week / Month)
* **Filters:** Filter sessions by Centre, Course, Teacher, or class name search.
* **Week View:** Grid layout showing time blocks. Clicking an empty slot opens the scheduling form pre-filled with that date and time.
* **Month View:** Calendar grid showing daily session cards with status dots:
  * 🟡 **Planning:** The scheduled start time is in the future.
  * 🟢 **On-going:** The session is currently taking place.
  * 🔴 **Finished:** The scheduled end time has passed.
* **Detail Drawer:** Click on any session to view notes, teacher details, and copy LMS/exam links.

---

## 👤 User Guides by Role

### 👨‍🏫 1. Teacher Guide
As a Teacher, your view is optimized for transparency, preparation, and collaboration.

#### How to view your classes:
1. Log in to the portal. You will land directly on the **Timetable** view.
2. The timetable is auto-filtered to show only classes assigned to you.
3. Switch between **Week View** and **Month View** depending on your preference.

#### Preparing for a test session:
1. Locate the highlighted red test banner on your calendar (marked as *Mini Test*, *Mid-term Test*, or *Final Exam*).
2. Click the calendar card to open the **Detail Drawer**.
3. Click **📥 Download Exam Papers** to download print-ready PDFs for your physical classroom.
4. Copy the **🌐 LMS Online Link** and paste it into your online group chat or share it with students.

---

### 💼 2. Centre Manager Guide
As a Centre Manager, you are responsible for operational efficiency and schedule creation for your centre.

#### Scheduling a class:
1. Go to the **Timetable** tab and select your centre from the top filter bar (your view defaults to your assigned centre).
2. Click on the time slot (in Week View) or double-click a date (in Month View).
3. Fill out the class name, course, and teacher.
4. Select a **Room** (only active rooms in your centre will be listed).
5. Specify if it is **Recurring** to generate weekly schedules.
6. Click **Save**. If the system reports a room/teacher conflict, adjust the details and save again.

#### Managing centre resources:
1. Navigate to the **Settings** tab.
2. Select **Rooms** to add new classrooms, customize capacities, or deactivate rooms undergoing maintenance.
3. Select **Teachers** to register new staff or update details.

---

### 🎓 3. Academic Supervisor Guide
Academic Supervisors act as curriculum creators and program overseers across all branches.

#### Curriculum & Course Setup:
1. Go to the **Settings** tab and select **Courses**.
2. Click **Add Course** to define new modules, categories, colors, and the total session count.
3. Alternatively, click **Import CSV** to bulk upload courses from curriculum sheets.

#### Coordinating scheduling:
1. Use the **Timetable** filter bar to review teacher schedules across all centres.
2. Edit session timings, notes, and test materials to update teachers globally.
3. Check the **Teacher Workload** chart in the Dashboard to identify underutilized or overloaded teachers.

---

### 👑 4. Central Admin Guide
Central Administrators have unrestricted write access to system variables, security, audit logs, and user onboarding.

#### Onboarding new users:
1. Go to **Settings** and select the **Users** sub-tab.
2. Click **Add User** to register accounts.
3. Assign a role (`CENTRAL_ADMIN`, `CENTRE_MANAGER`, `ACADEMIC_SUPERVISOR`, `TEACHER`).
4. For Managers, link them to their primary **Centre**.
5. For Teachers, link their login account to their corresponding **Teacher profile** so their timetable filters correctly.

#### Auditing the system:
1. Go to the **Dashboard** and select the **Activity Logs** sub-tab.
2. Filter through the chronological action history to inspect additions, modifications, or deletions of crucial assets.
3. Use the global search bar in the top navigation to search for and locate records.
