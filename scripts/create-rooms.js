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
  console.log(`[Create Rooms] Connecting to ${isPostgres ? 'PostgreSQL (Supabase)' : 'SQLite'} database...`);

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
    return words[0]; // Already an acronym (like HO)
  }
  return words.map(w => w[0] ? w[0].toUpperCase() : '').join('');
}

async function main() {
  const prisma = createPrismaClient();

  try {
    const centres = await prisma.centre.findMany();
    console.log(`Found ${centres.length} centres in database.`);

    for (const centre of centres) {
      const acronym = getAcronym(centre.name);
      console.log(`\nProcessing Centre: "${centre.name}" -> Acronym: "${acronym}"`);

      for (let i = 1; i <= 6; i++) {
        const roomName = `${acronym}-1.0${i}`;

        // Check if room already exists for this centre
        const existing = await prisma.room.findFirst({
          where: {
            centreId: centre.id,
            name: roomName
          }
        });

        if (existing) {
          console.log(`  - Room already exists: "${roomName}"`);
          continue;
        }

        await prisma.room.create({
          data: {
            centreId: centre.id,
            name: roomName,
            capacity: 20
          }
        });
        console.log(`  - Successfully created room: "${roomName}"`);
      }
    }
    console.log('\nAll rooms have been processed successfully!');
  } catch (error) {
    console.error('[Error] Failed to create rooms:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
