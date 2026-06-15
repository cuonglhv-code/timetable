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
  console.log(`[Create Centres] Connecting to ${isPostgres ? 'PostgreSQL (Supabase)' : 'SQLite'} database...`);

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

const centresToCreate = [
  'JAX-MINH KHAI',
  'JAX-CHIEN THANG',
  'JAX-NGUYEN VAN CU',
  'JAX-TRAN QUOC HOAN',
  'JAX-TRAN PHU',
  'JAX-GO VAP',
  'JAX-B2S',
  'JAX-HO'
];

async function main() {
  const prisma = createPrismaClient();

  try {
    for (const name of centresToCreate) {
      // Check if it already exists
      const existing = await prisma.centre.findUnique({
        where: { name }
      });

      if (existing) {
        console.log(`[Centre] already exists: "${name}"`);
        continue;
      }

      await prisma.centre.create({
        data: { name }
      });
      console.log(`[Centre] successfully created: "${name}"`);
    }
    console.log('\nAll centres have been processed successfully!');
  } catch (error) {
    console.error('[Error] Failed to create centres:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
