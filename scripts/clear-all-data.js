const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Load environment variables manually if they are not loaded (for local CLI executions)
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

function generateId() {
  return 'c' + crypto.randomBytes(16).toString('hex').slice(0, 24);
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[Error] DATABASE_URL is not defined in your environment or .env file.');
    process.exit(1);
  }

  const isPostgres = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');
  console.log(`[Clear Data] Connecting to ${isPostgres ? 'PostgreSQL' : 'SQLite'} database...`);

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

  // Fallback to SQLite (better-sqlite3)
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  return new PrismaClient({ adapter });
}

async function seedAdmin(prisma, email, password, name) {
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      console.log(`[Clear Data] Admin account already exists: ${email}`);
      return;
    }
    await prisma.user.create({
      data: {
        id: generateId(),
        email,
        password: hashedPassword,
        name,
        role: 'CENTRAL_ADMIN',
        isActive: true,
      },
    });
    console.log(`[Clear Data] Seeded default admin account: ${email}`);
  } catch (error) {
    console.error(`[Clear Data] Failed to seed admin "${name}":`, error.message);
  }
}

async function main() {
  const prisma = createPrismaClient();

  try {
    console.log('[Clear Data] Deleting mock data tables...');

    // 1. TaskBlock
    const tbCount = await prisma.taskBlock.deleteMany({});
    console.log(`- Deleted ${tbCount.count} TaskBlock records`);

    // 2. Task
    const tCount = await prisma.task.deleteMany({});
    console.log(`- Deleted ${tCount.count} Task records`);

    // 3. Section
    const sCount = await prisma.section.deleteMany({});
    console.log(`- Deleted ${sCount.count} Section records`);

    // 4. Project
    const pCount = await prisma.project.deleteMany({});
    console.log(`- Deleted ${pCount.count} Project records`);

    // 5. ClassSession
    const csCount = await prisma.classSession.deleteMany({});
    console.log(`- Deleted ${csCount.count} ClassSession records`);

    // 6. Room
    const rCount = await prisma.room.deleteMany({});
    console.log(`- Deleted ${rCount.count} Room records`);

    // 7. Centre
    const cCount = await prisma.centre.deleteMany({});
    console.log(`- Deleted ${cCount.count} Centre records`);

    // 8. AuditLog
    const alCount = await prisma.auditLog.deleteMany({});
    console.log(`- Deleted ${alCount.count} AuditLog records`);

    // 9. User (Preserving CENTRAL_ADMIN role accounts)
    const uCount = await prisma.user.deleteMany({
      where: {
        NOT: {
          role: 'CENTRAL_ADMIN',
        },
      },
    });
    console.log(`- Deleted ${uCount.count} non-admin User records`);

    // 10. Teacher
    const tchrCount = await prisma.teacher.deleteMany({});
    console.log(`- Deleted ${tchrCount.count} Teacher records`);

    // 11. Course
    const crsCount = await prisma.course.deleteMany({});
    console.log(`- Deleted ${crsCount.count} Course records`);

    console.log('[Clear Data] Ensuring default admin accounts are seeded...');
    await seedAdmin(prisma, 'admin@school.edu', 'Admin123!', 'System Admin');
    await seedAdmin(prisma, 'admin@jaxtina.edu', 'admin123', 'Jaxtina Admin');

    console.log('[Clear Data] All mock data deleted successfully!');
  } catch (error) {
    console.error('[Clear Data Error] Failed to clear mock data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
