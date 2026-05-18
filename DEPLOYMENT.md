# Deployment Guide — Vercel + Supabase

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cuonglhv-code/my-agent)

## Step 1: Create Supabase Database (~2 minutes)

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Fill in:
   - **Project name:** `my-timetable`
   - **Database password:** Generate a strong password (save it!)
   - **Region:** **Southeast Asia (Singapore)** — closest to Vietnam for lowest latency
3. Click **Create new project** — wait ~2 minutes for provisioning

### Get Connection String

1. Go to **Settings** (gear icon) → **Database**
2. Under **Connection string**, select **URI** tab
3. Choose **Transaction** mode (port 6543) — this uses Supavisor connection pooling, essential for serverless
4. Copy the connection string. It looks like:
   ```
   postgresql://postgres.[project-id]:[your-password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```

## Step 2: Generate Secrets

Run these commands locally:

```bash
# Generate ENCRYPTION_KEY (64-char hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate AUTH_SECRET
npx auth secret
# OR
openssl rand -base64 32
```

## Step 3: Configure Google OAuth (Optional, for SSO)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project → **APIs & Services** → **Credentials**
3. Create **OAuth 2.0 Client ID** (Web application)
4. Add authorized redirect URI:
   ```
   https://YOUR-APP.vercel.app/api/auth/callback/google
   ```
5. Copy **Client ID** and **Client Secret**

## Step 4: Deploy to Vercel

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Prepare for Vercel + Supabase deployment"
   git push origin main
   ```

2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
5. Add environment variables (see Step 5)
6. Click **Deploy**

## Step 5: Add Environment Variables

In Vercel Dashboard → **Settings** → **Environment Variables**, add these for **Production**:

| Variable | Value | Example |
|----------|-------|---------|
| `DATABASE_URL` | Supabase Transaction connection string (port 6543) | `postgresql://postgres.xxx:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` |
| `ENCRYPTION_KEY` | 64-char hex from Step 2 | `a1b2c3d4...` |
| `AUTH_SECRET` | Random string from Step 2 | `VJl8k2mN...` |
| `AUTH_URL` | Your production URL | `https://my-timetable.vercel.app` |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID | `123456-abc.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret | `GOCSPX-abc123` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email | `timetable@project.iam.gserviceaccount.com` |
| `GOOGLE_SERVICE_ACCOUNT_KEY_ENCRYPTED` | Encrypted JSON key | `dGl...==:YWJ...==:ZGU...==:eyJ...` |
| `GOOGLE_DELEGATED_DOMAIN` | Google Workspace domain | `school.edu` |
| `GOOGLE_CALENDAR_API_SCOPES` | API scopes | `calendar.events,calendar.settings` |

**Important:** Set `DATABASE_URL` for **all environments** (Production, Preview, Development) so Prisma works everywhere.

## Step 6: Run Database Migration

After first deployment, apply the schema to Supabase:

```bash
# Pull production env vars locally
vercel env pull .env.production.local

# Run migration
npx prisma migrate deploy
```

**Alternative (no Vercel CLI):**
Set `DATABASE_URL` in your local `.env` temporarily and run:
```bash
npx prisma migrate deploy
```

## Step 7: Seed Admin User

```bash
# With DATABASE_URL set (from .env.production.local or manually)
node scripts/seed-admin.js
```

Default admin credentials:
- **Email:** `admin@jaxtina.edu`
- **Password:** `admin123`
- **Role:** `CENTRAL_ADMIN`

**Change the password immediately after first login!**

## Step 8: Update AUTH_URL

After deployment, update `AUTH_URL` in Vercel env vars to your actual production URL (e.g., `https://my-timetable.vercel.app`), then redeploy.

## Step 9: (Optional) Enable Row Level Security

Supabase supports PostgreSQL RLS for an extra layer of security. Run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Centre" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Teacher" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GoogleIntegration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CalendarShare" ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies require session-level variables (e.g., set_config('app.user_id', ...))
-- which need custom middleware setup. The application-level RBAC in this project
-- already provides full access control. RLS is an optional defense-in-depth layer.
```

## Custom Domain (Optional)

1. Vercel Dashboard → **Settings** → **Domains**
2. Add your domain (e.g., `timetable.yourschool.edu`)
3. Follow DNS configuration instructions (CNAME or A record)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check Node.js version (requires 18+) |
| Database connection timeout | Use **Transaction** mode (port 6543), not Session mode (port 5432) |
| `PrismaClientInitializationError` | Verify `DATABASE_URL` format and that Supabase project is active |
| Auth callback error | Check `AUTH_URL` matches your domain exactly |
| Google OAuth fails | Verify redirect URI in Google Cloud Console matches your Vercel URL |
| Prisma errors | Run `npx prisma generate` locally and push changes |
| Migration fails on Supabase | Supabase has pre-created tables. Run `npx prisma db push` instead for first setup |

## Post-Deployment Checklist

- [ ] Supabase project created in Singapore region
- [ ] `DATABASE_URL` set with Transaction mode (port 6543)
- [ ] Database migration applied (`npx prisma migrate deploy`)
- [ ] Admin user created (seed script)
- [ ] Login works (credentials + Google SSO if configured)
- [ ] All CRUD operations work
- [ ] Role-based access enforced (test with different user roles)
- [ ] Google Calendar integration configured (if using)
- [ ] Custom domain set up (optional)
- [ ] Admin password changed from default
