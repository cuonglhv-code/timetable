const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');

// Load environment variables manually if they are not loaded
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*["']?([^"'\r\n#]+)["']?/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  });
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[Error] DATABASE_URL is not defined.');
    process.exit(1);
  }

  const isPostgres = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');
  console.log(`[Diagnostic] DATABASE_URL: ${databaseUrl.split('@')[1] || databaseUrl}`);
  console.log(`[Diagnostic] Dialect: ${isPostgres ? 'PostgreSQL (Supabase)' : 'SQLite'}`);

  if (isPostgres) {
    const { PrismaPg } = require('@prisma/adapter-pg');
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = createPrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
        isActive: true,
      }
    });
    console.log(`\n[Diagnostic] Connection successful!`);
    console.log(`[Diagnostic] Total users found: ${users.length}`);
    users.forEach(u => {
      console.log(`  - Email: ${u.email} | Role: ${u.role} | Active: ${u.isActive}`);
    });
  } catch (error) {
    console.error(`\n[Diagnostic Error] Failed to query database:`, error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
