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
    console.error('[Error] DATABASE_URL is not defined in your environment.');
    process.exit(1);
  }

  const isPostgres = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');
  console.log(`[Create Courses] Connecting to ${isPostgres ? 'PostgreSQL (Supabase)' : 'SQLite'} database...`);

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

// Curated beautiful color palette for courses
const coursesToCreate = [
  // 4Skills (Amber)
  { name: 'Active Communicative 4Skills', category: '4Skills', colorHex: '#f59e0b' },

  // IELTS Courses (Shades of blue, indigo, and purple for a premium tiered look)
  { name: 'IELTS-Foundation 1', category: 'IELTS', colorHex: '#60a5fa' },
  { name: 'IELTS-Foundation 2', category: 'IELTS', colorHex: '#3b82f6' },
  { name: 'IELTS-Booster 1', category: 'IELTS', colorHex: '#2563eb' },
  { name: 'IELTS-Booster 2', category: 'IELTS', colorHex: '#1d4ed8' },
  { name: 'IELTS-Achiever 1', category: 'IELTS', colorHex: '#818cf8' },
  { name: 'IELTS-Achiever 2', category: 'IELTS', colorHex: '#6366f1' },
  { name: 'IELTS-Achiever 3', category: 'IELTS', colorHex: '#4f46e5' },
  { name: 'IELTS-Expert (1-1)', category: 'IELTS', colorHex: '#a855f7' },
  { name: 'IELTS-Custom', category: 'IELTS', colorHex: '#475569' },

  // TOEIC Courses (Shades of emerald/teal/green for elegant coordination)
  { name: 'TOEIC-Foundation', category: 'TOEIC', colorHex: '#10b981' },
  { name: 'TOEIC-Starter', category: 'TOEIC', colorHex: '#059669' },
  { name: 'TOEIC-Builder', category: 'TOEIC', colorHex: '#047857' },
  { name: 'TOEIC-Focus', category: 'TOEIC', colorHex: '#065f46' },
  { name: 'TOEIC-Intensive', category: 'TOEIC', colorHex: '#0f766e' },
  { name: 'TOEIC-SW Achiever', category: 'TOEIC', colorHex: '#14b8a6' },
  { name: 'TOEIC-SW Mastery', category: 'TOEIC', colorHex: '#0d9488' },
  { name: 'TOEIC-Custom', category: 'TOEIC', colorHex: '#64748b' }
];

async function main() {
  const prisma = createPrismaClient();

  try {
    for (const item of coursesToCreate) {
      // Check if it already exists
      const existing = await prisma.course.findUnique({
        where: { name: item.name }
      });

      if (existing) {
        console.log(`[Course] already exists: "${item.name}" (Category: ${item.category})`);
        continue;
      }

      await prisma.course.create({
        data: item
      });
      console.log(`[Course] successfully created: "${item.name}" (Category: ${item.category})`);
    }
    console.log('\nAll courses and categories have been processed successfully!');
  } catch (error) {
    console.error('[Error] Failed to create courses:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
