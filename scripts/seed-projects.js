const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
    console.error('[Error] DATABASE_URL is not defined in your environment.');
    process.exit(1);
  }

  const isPostgres = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');
  console.log(`[Seed Projects] Connecting to ${isPostgres ? 'PostgreSQL' : 'SQLite'} database...`);

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
    console.log('[Seed Projects] Finding or creating creator user...');
    let user = await prisma.user.findFirst({
      where: { role: 'CENTRAL_ADMIN' }
    });

    if (!user) {
      console.log('No Admin user found. Seeding default Admin...');
      const bcrypt = require('bcryptjs');
      const hashedPass = await bcrypt.hash('admin123', 10);
      user = await prisma.user.create({
        data: {
          id: generateId(),
          email: 'admin@jaxtina.edu',
          password: hashedPass,
          name: 'Jaxtina Admin',
          role: 'CENTRAL_ADMIN',
          isActive: true
        }
      });
    }

    console.log(`Using Creator User: ${user.name} (${user.email})`);

    // Clean up old projects
    console.log('[Seed Projects] Cleaning up old projects...');
    await prisma.project.deleteMany({});

    console.log('[Seed Projects] Seeding Demo Project 1: IELTS Revamp...');
    const project1 = await prisma.project.create({
      data: {
        id: generateId(),
        name: 'IELTS curriculum Revamp 2026',
        description: 'Collaborative curriculum planning, textbook updates, and lesson slide designs for the upcoming Academic IELTS courses.',
        defaultView: 'BOARD',
        creatorId: user.id,
      }
    });

    console.log('[Seed Projects] Seeding Sections for IELTS Revamp...');
    const section1 = await prisma.section.create({
      data: {
        id: generateId(),
        projectId: project1.id,
        name: 'Planning & Research',
        order: 1000,
      }
    });

    const section2 = await prisma.section.create({
      data: {
        id: generateId(),
        projectId: project1.id,
        name: 'Curriculum Outline Design',
        order: 2000,
      }
    });

    const section3 = await prisma.section.create({
      data: {
        id: generateId(),
        projectId: project1.id,
        name: 'Review & Approvals',
        order: 3000,
      }
    });

    console.log('[Seed Projects] Seeding Tasks for IELTS Revamp...');
    const now = new Date();
    
    // Tasks for Section 1
    await prisma.task.create({
      data: {
        id: generateId(),
        sectionId: section1.id,
        name: 'Analyse Cambridge IELTS 20 Teacher feedback',
        description: 'Review the pain points and comments from teachers regarding the Camb 20 standard textbook exercises.',
        completed: true,
        order: 1000,
        assigneeId: user.id,
        dueDateStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5),
        dueDateEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
        effort: 'MEDIUM',
        category: 'Research',
      }
    });

    await prisma.task.create({
      data: {
        id: generateId(),
        sectionId: section1.id,
        name: 'Benchmark other IELTS centers in Hanoi',
        description: 'Analyze course structures, duration, and session counts of main local competitors.',
        completed: false,
        order: 2000,
        assigneeId: user.id,
        dueDateStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
        dueDateEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
        effort: 'LOW',
        category: 'Competitors',
      }
    });

    // Tasks for Section 2
    await prisma.task.create({
      data: {
        id: generateId(),
        sectionId: section2.id,
        name: 'Draft new 24-session syllabus layout',
        description: 'Set lesson distribution for Listening, Reading, Writing, Speaking. Ensure total sessions sum up to 24.',
        completed: false,
        order: 1000,
        assigneeId: user.id,
        dueDateStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2),
        dueDateEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
        effort: 'HIGH',
        category: 'Syllabus',
      }
    });

    await prisma.task.create({
      data: {
        id: generateId(),
        sectionId: section2.id,
        name: 'Design slide template (Arial, Ink & Chalk theme)',
        description: 'Create standardized PPT templates using saffron-amber accents and neutral dark slate colors.',
        completed: false,
        order: 2000,
        effort: 'LOW',
        category: 'Design',
      }
    });

    // Tasks for Section 3
    await prisma.task.create({
      data: {
        id: generateId(),
        sectionId: section3.id,
        name: 'Academic Director approval presentation',
        description: 'Prepare pitch deck explaining changes, expected student satisfaction lift, and training plan for teachers.',
        completed: false,
        order: 1000,
        assigneeId: user.id,
        dueDateStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10),
        dueDateEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 12),
        effort: 'HIGH',
        category: 'Admin',
      }
    });

    console.log('[Seed Projects] Seeding Demo Project 2 (Centre Scoped): Centre Operations...');
    // Find a centre if it exists
    const centre = await prisma.centre.findFirst();
    const centreId = centre ? centre.id : null;

    const project2 = await prisma.project.create({
      data: {
        id: generateId(),
        name: centre ? `Operations — ${centre.name}` : 'Local Centre Operations',
        description: 'Operational tracking, room scheduling reviews, and class management tasks specific to the centre.',
        defaultView: 'LIST',
        centreId: centreId,
        creatorId: user.id,
      }
    });

    const secTodo = await prisma.section.create({
      data: {
        id: generateId(),
        projectId: project2.id,
        name: 'To Do',
        order: 1000,
      }
    });

    await prisma.task.create({
      data: {
        id: generateId(),
        sectionId: secTodo.id,
        name: 'Audit room capacities and seating layout',
        description: 'Physically review room 101 and 102 tables, chairs, and projector alignments.',
        completed: false,
        order: 1000,
        dueDateEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4),
        effort: 'MEDIUM',
        category: 'Audit',
      }
    });

    console.log('[Seed Projects] Seeding completed successfully!');
  } catch (error) {
    console.error('[Seed Projects Error] Critical error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
