# Jaxtina Timetable — Agent Instructions

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` — runs `scripts/prepare-prisma.js` → `prisma generate` → `next build`
- `npm run lint` — ESLint 9 flat config
- `npm run test` — Vitest with jsdom (run single file: `npx vitest run <path>`)
- `npm run start` — production server

## Build & Prisma quirks

- `prepare-prisma.js` dynamically rewrites `prisma/schema.prisma` datasource provider (`sqlite` vs `postgresql`) based on `DATABASE_URL`. Runs on `postinstall` and `build`. The checked-in schema always says `sqlite`.
- Prisma client generated to `src/generated/prisma` (custom `output`), NOT `node_modules/.prisma/client`. Import via `@/lib/prisma` (singleton wrapper).
- Driver adapters: `better-sqlite3` (local, `dev.db`), `pg` (production/Supabase port 6543). Auto-selected in `src/lib/prisma.ts`.
- Migrations: `npx prisma migrate deploy` for production; `npx prisma db push` for first Supabase setup.

## Auth & Roles

- **NextAuth v5 beta**, JWT strategy, 8h expiry, credentials provider (bcryptjs). Config: `src/auth.config.ts` + `src/auth.ts`.
- Middleware at `src/middleware.ts` protects all routes except `/public`, `/login`, `/api/auth`, static assets.
- Roles: `CENTRAL_ADMIN` | `CENTRE_MANAGER` | `ACADEMIC_SUPERVISOR` | `TEACHER`
- Auth helpers in `src/lib/auth/authorization.ts`: `requireAuth()`, `requireRole()`, `canAccessCentre()`.
- `TEACHER` is read-only for sessions. `CENTRE_MANAGER` scoped to their centre.

## API routes (App Router)

- RESTful CRUD at `src/app/api/{centres,rooms,courses,teachers,sessions}/route.ts`
- Sessions: `GET/POST /api/sessions`, `PATCH/DELETE /api/sessions/[id]`, `GET /api/sessions/check-conflict`
- Session create/update uses `prisma.$transaction` with `isolationLevel: 'Serializable'` for conflict detection.
- All handlers guard with `requireAuth()` + role checks. Teachers auto-filtered server-side.

## Testing

- Vitest v4, jsdom, `@/` alias, setup at `src/__tests__/setup.ts` (clears mocks).
- Unit: `src/__tests__/unit/`. Integration: `src/__tests__/integration/` (mock prisma + auth — no real DB).

## Code conventions

- `@/` path alias → `src/`. Zod schemas in `src/lib/validators.ts`. React Query hooks per entity in `src/hooks/`.
- Query key pattern: `['entityName', filters]`. Mutations invalidate the query key on success.
- Domain types in `src/types/index.ts`; NextAuth type extensions in `src/types/next-auth.d.ts`.
- Audit logging via `src/lib/audit.ts` — fire-and-forget, non-blocking.
- Tailwind merge: `cn()` from `src/lib/utils.ts`. Toast provider in root layout. dnd-kit for drag-and-drop.
