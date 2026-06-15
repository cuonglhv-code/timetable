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
  // IELTS
  { name: 'IELTS Foundation 1', category: 'IELTS', totalSessions: 25, colorHex: '#60a5fa' },
  { name: 'IELTS Foundation 2', category: 'IELTS', totalSessions: 20, colorHex: '#3b82f6' },
  { name: 'Booster 1', category: 'IELTS', totalSessions: 28, colorHex: '#2563eb' },
  { name: 'Booster 2', category: 'IELTS', totalSessions: 28, colorHex: '#1d4ed8' },
  { name: 'Achiever 1', category: 'IELTS', totalSessions: 28, colorHex: '#818cf8' },
  { name: 'Achiever 2', category: 'IELTS', totalSessions: 28, colorHex: '#6366f1' },
  { name: 'Achiever 3', category: 'IELTS', totalSessions: 28, colorHex: '#4f46e5' },
  { name: 'Luyện đề Intensive', category: 'IELTS', totalSessions: 28, colorHex: '#475569' },

  // TOEIC
  { name: 'TOEIC Foundation', category: 'TOEIC', totalSessions: 30, colorHex: '#10b981' },
  { name: 'TOEIC Starter', category: 'TOEIC', totalSessions: 24, colorHex: '#059669' },
  { name: 'TOEIC Builder', category: 'TOEIC', totalSessions: 26, colorHex: '#047857' },
  { name: 'TOEIC Focus', category: 'TOEIC', totalSessions: 26, colorHex: '#065f46' },
  { name: 'TOEIC L&R Intensive', category: 'TOEIC', totalSessions: 6, colorHex: '#0f766e' },
  { name: 'TOEIC SW Achiever', category: 'TOEIC', totalSessions: 24, colorHex: '#14b8a6' },
  { name: 'TOEIC SW Mastery', category: 'TOEIC', totalSessions: 6, colorHex: '#0d9488' },

  // 4Skills
  { name: '4Skills Pre-S', category: '4Skills', totalSessions: 28, colorHex: '#f59e0b' },
  { name: '4Skills Starter (S)', category: '4Skills', totalSessions: 28, colorHex: '#d97706' },
  { name: '4Skills Total Comprehension (TC)', category: '4Skills', totalSessions: 28, colorHex: '#b45309' },
  { name: '4Skills Master of TC (MTC)', category: '4Skills', totalSessions: 28, colorHex: '#78350f' },

  // Grammar
  { name: 'Grammar Foundation', category: 'Grammar', totalSessions: 40, colorHex: '#ec4899' },
  { name: 'Grammar Builder', category: 'Grammar', totalSessions: 40, colorHex: '#db2777' },
  { name: 'Grammar Exam Ready 1', category: 'Grammar', totalSessions: 40, colorHex: '#be185d' },
  { name: 'Grammar Exam Ready 2', category: 'Grammar', totalSessions: 40, colorHex: '#9d174d' }
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
