const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
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
  console.log(`[Create Teachers] Connecting to ${isPostgres ? 'PostgreSQL (Supabase)' : 'SQLite'} database...`);

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

function getAcronym(name) {
  const cleanName = name.replace(/^Jaxtina-/, '');
  const words = cleanName.split(/[\s-]+/);
  if (words.length === 1 && words[0].toUpperCase() === words[0]) {
    return words[0];
  }
  return words.map(w => w[0] ? w[0].toUpperCase() : '').join('');
}

function generateId() {
  return 'c' + crypto.randomBytes(16).toString('hex').slice(0, 24);
}

// English and Vietnamese first names & last names to generate realistic combinations
const firstNames = ['James', 'Sarah', 'Minh', 'Thu', 'David', 'Emma', 'Hoang', 'Vy', 'Alex', 'Lan'];
const lastNames = ['Smith', 'Nguyen', 'Johnson', 'Tran', 'Miller', 'Pham', 'Brown', 'Le', 'Davis', 'Vu'];

async function main() {
  const prisma = createPrismaClient();
  const hashedPassword = await bcrypt.hash('Teacher123!', 10);

  try {
    const centres = await prisma.centre.findMany();
    console.log(`Found ${centres.length} centres in database.`);

    for (const centre of centres) {
      const acronym = getAcronym(centre.name);
      console.log(`\nProcessing Centre: "${centre.name}" (${acronym})`);

      for (let i = 1; i <= 5; i++) {
        // Generate realistic semi-random names
        const fn = firstNames[(acronym.charCodeAt(0) + i) % firstNames.length];
        const ln = lastNames[(acronym.charCodeAt(acronym.length - 1) + i) % lastNames.length];
        const teacherName = `${fn} ${ln} (${acronym})`;
        const email = `teacher.${acronym.toLowerCase()}${i}@jaxtina.edu`;
        const phone = `090${Math.floor(1000000 + Math.random() * 9000000)}`;

        // Check if teacher profile already exists
        let teacher = await prisma.teacher.findUnique({
          where: { email }
        });

        if (!teacher) {
          teacher = await prisma.teacher.create({
            data: {
              id: generateId(),
              name: teacherName,
              email,
              phone,
              isActive: true
            }
          });
          console.log(`  - Created Teacher Profile: "${teacherName}"`);
        } else {
          console.log(`  - Teacher Profile already exists: "${teacherName}"`);
        }

        // Check if User account already exists
        const userExists = await prisma.user.findUnique({
          where: { email }
        });

        if (!userExists) {
          await prisma.user.create({
            data: {
              id: generateId(),
              email,
              password: hashedPassword,
              name: teacherName,
              role: 'TEACHER',
              centreId: centre.id,
              teacherId: teacher.id,
              isActive: true
            }
          });
          console.log(`    - Created User Account for "${teacherName}"`);
        } else {
          console.log(`    - User Account already exists for "${teacherName}"`);
        }
      }
    }
    console.log('\nAll teachers have been processed successfully!');
  } catch (error) {
    console.error('[Error] Failed to create teachers:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
