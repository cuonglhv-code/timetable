const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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
      console.log(`Admin account already exists: ${email}`);
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
    
    console.log(`Admin account "${name}" created successfully!`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error(`Failed to create admin account "${name}":`, error.message);
  }
}

async function main() {
  console.log('[Seed] Connecting to database using Prisma Client & driver adapter...');
  const prisma = createPrismaClient();

  try {
    // Seed school admin (default in local seed-admin.js)
    await seedAdmin(prisma, 'admin@school.edu', 'Admin123!', 'System Admin');
    console.log('--------------------------------------------------');
    // Seed jaxtina admin (default in DEPLOYMENT.md)
    await seedAdmin(prisma, 'admin@jaxtina.edu', 'admin123', 'Jaxtina Admin');
  } catch (error) {
    console.error('[Seed Error] Critical error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
