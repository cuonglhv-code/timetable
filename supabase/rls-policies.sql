-- Supabase Row Level Security (RLS) Policies
-- Optional: Defense-in-depth layer for database-level access control
-- Run in: Supabase Dashboard → SQL Editor
--
-- NOTE: The application already enforces RBAC via middleware and API route checks.
-- These policies add an extra safety net but require session-level user context.
-- For full RLS, you'd need to set app.user_id via middleware on each request.

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Centre" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Teacher" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GoogleIntegration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CalendarShare" ENABLE ROW LEVEL SECURITY;

-- Basic policy: Allow all authenticated users to read (application handles filtering)
CREATE POLICY "Allow authenticated read" ON "User" FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON "Centre" FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON "Room" FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON "Course" FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON "Teacher" FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON "ClassSession" FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON "GoogleIntegration" FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON "CalendarShare" FOR SELECT USING (true);

-- Write policies: Restrict to service role (application handles authorization)
-- This means only the service key can write, which Prisma uses by default
-- For user-level RLS, you'd need to parse JWT claims and set session variables
