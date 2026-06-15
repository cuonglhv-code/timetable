const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { startOfWeek, addDays } = require('date-fns');

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
  console.log(`[Seed Demo] Connecting to ${isPostgres ? 'PostgreSQL' : 'SQLite'} database...`);

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
    console.log('[Seed] Cleaning up old class sessions to seed fresh ones...');
    await prisma.classSession.deleteMany({});

    console.log('[Seed] Seeding Centres...');
    const centreNames = ['Jaxtina-Nguyen Van Cu', 'Jaxtina-Chien Thang', 'Jaxtina-Minh Khai'];
    const centres = [];
    for (const name of centreNames) {
      let centre = await prisma.centre.findUnique({ where: { name } });
      if (!centre) {
        centre = await prisma.centre.create({ data: { id: generateId(), name } });
        console.log(`Created Centre: ${name}`);
      }
      centres.push(centre);
    }

    console.log('[Seed] Seeding Rooms...');
    const rooms = [];
    const roomSpecs = [
      { centreName: 'Jaxtina-Nguyen Van Cu', name: 'Room 101', capacity: 20 },
      { centreName: 'Jaxtina-Nguyen Van Cu', name: 'Room 102', capacity: 25 },
      { centreName: 'Jaxtina-Nguyen Van Cu', name: 'Lab 1', capacity: 15 },
      { centreName: 'Jaxtina-Chien Thang', name: 'Room A', capacity: 30 },
      { centreName: 'Jaxtina-Chien Thang', name: 'Room B', capacity: 20 },
      { centreName: 'Jaxtina-Minh Khai', name: 'VIP Room 1', capacity: 8 },
      { centreName: 'Jaxtina-Minh Khai', name: 'Conference Room', capacity: 40 },
    ];
    for (const spec of roomSpecs) {
      const centre = centres.find(c => c.name === spec.centreName);
      if (!centre) continue;

      let room = await prisma.room.findFirst({
        where: { centreId: centre.id, name: spec.name }
      });
      if (!room) {
        room = await prisma.room.create({
          data: { id: generateId(), centreId: centre.id, name: spec.name, capacity: spec.capacity }
        });
        console.log(`Created Room: ${spec.name} for ${spec.centreName}`);
      }
      rooms.push(room);
    }

    console.log('[Seed] Seeding Courses...');
    const courseSpecs = [
      { name: 'IELTS Intensive', category: 'Test Prep', colorHex: '#6366f1' },
      { name: 'TOEIC Mastery', category: 'Test Prep', colorHex: '#10b981' },
      { name: 'General Communication', category: 'General', colorHex: '#f59e0b' },
      { name: 'Kids English Course', category: 'Kids', colorHex: '#ec4899' },
    ];
    const courses = [];
    for (const spec of courseSpecs) {
      let course = await prisma.course.findUnique({ where: { name: spec.name } });
      if (!course) {
        course = await prisma.course.create({ data: { id: generateId(), ...spec } });
        console.log(`Created Course: ${spec.name}`);
      }
      courses.push(course);
    }

    console.log('[Seed] Seeding Teachers...');
    const teacherSpecs = [
      { name: 'Mr. David Miller', email: 'david@jaxtina.com', phone: '0912345678' },
      { name: 'Mrs. Emily Watson', email: 'emily@jaxtina.com', phone: '0987654321' },
      { name: 'Mr. Nguyen Minh', email: 'minh.n@jaxtina.com', phone: '0905556677' },
    ];
    const teachers = [];
    for (const spec of teacherSpecs) {
      let teacher = await prisma.teacher.findFirst({ where: { name: spec.name } });
      if (!teacher) {
        teacher = await prisma.teacher.create({ data: { id: generateId(), ...spec } });
        console.log(`Created Teacher: ${spec.name}`);
      }
      teachers.push(teacher);
    }

    console.log('[Seed] Seeding Admin accounts if missing...');
    const hashedPass = await bcrypt.hash('admin123', 10);
    const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@jaxtina.edu' } });
    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          id: generateId(),
          email: 'admin@jaxtina.edu',
          password: hashedPass,
          name: 'Jaxtina Admin',
          role: 'CENTRAL_ADMIN',
          isActive: true
        }
      });
      console.log('Created admin account: admin@jaxtina.edu / admin123');
    }

    console.log('[Seed] Scheduling mock class sessions for the current week...');
    const now = new Date();
    const monday = startOfWeek(now, { weekStartsOn: 1 });

    const sessionsData = [
      // Monday
      { dayOffset: 0, className: 'IELTS Listening Workshop', course: 'IELTS Intensive', teacher: 'Mrs. Emily Watson', room: 'Room 101', start: '09:00', end: '10:30', notes: 'Focus on section 3 strategies' },
      { dayOffset: 0, className: 'TOEIC Grammar Review', course: 'TOEIC Mastery', teacher: 'Mr. Nguyen Minh', room: 'Room 102', start: '14:00', end: '15:30', notes: 'Part 5 multiple choice questions' },
      
      // Tuesday
      { dayOffset: 1, className: 'Basic Pronunciation Practice', course: 'General Communication', teacher: 'Mr. David Miller', room: 'Room A', start: '10:15', end: '11:45', notes: 'Vowel and consonant sounds' },
      { dayOffset: 1, className: 'IELTS Writing Task 2 Prep', course: 'IELTS Intensive', teacher: 'Mrs. Emily Watson', room: 'Room B', start: '18:00', end: '19:30', notes: 'Structuring agree/disagree essays' },
      
      // Wednesday
      { dayOffset: 2, className: 'English Phonics Fun', course: 'Kids English Course', teacher: 'Mr. Nguyen Minh', room: 'Room 101', start: '09:00', end: '10:30', notes: 'Interactive phonics games', testType: 'MINI_TEST', lmsUrl: 'https://lms.jaxtina.com/tests/kids-phonics' },
      { dayOffset: 2, className: 'Conversational Fluency Class', course: 'General Communication', teacher: 'Mr. David Miller', room: 'VIP Room 1', start: '14:00', end: '15:30', notes: 'Topic: Travel and culture' },
      
      // Thursday
      { dayOffset: 3, className: 'IELTS Scanning & Skimming', course: 'IELTS Intensive', teacher: 'Mrs. Emily Watson', room: 'Room A', start: '10:15', end: '11:45', notes: 'Handling academic texts', testType: 'MID_TEST', examDownloadUrl: 'https://jaxtina.edu/exams/ielts-reading-mid.pdf', lmsUrl: 'https://lms.jaxtina.com/tests/ielts-reading-mid' },
      { dayOffset: 3, className: 'TOEIC Listening Practice', course: 'TOEIC Mastery', teacher: 'Mr. Nguyen Minh', room: 'Room 102', start: '18:30', end: '20:00', notes: 'Full audio test practice' },
      
      // Friday
      { dayOffset: 4, className: 'IELTS Mock Speaking Evaluation', course: 'IELTS Intensive', teacher: 'Mrs. Emily Watson', room: 'Room 101', start: '09:00', end: '10:30', notes: 'One-on-one evaluations', testType: 'FINAL_TEST', examDownloadUrl: 'https://jaxtina.edu/exams/ielts-speaking-final.pdf' },
      { dayOffset: 4, className: 'Idiomatic Expressions Guide', course: 'General Communication', teacher: 'Mr. David Miller', room: 'Conference Room', start: '14:00', end: '15:30', notes: 'Slang and common phrases' },
      
      // Saturday
      { dayOffset: 5, className: 'Weekend Speaking Club', course: 'General Communication', teacher: 'Mr. David Miller', room: 'Room 101', start: '10:00', end: '11:30', notes: 'Open discussion session' },
      
      // Sunday
      { dayOffset: 6, className: 'Kids English Speaking Practice', course: 'Kids English Course', teacher: 'Mr. Nguyen Minh', room: 'Room A', start: '15:00', end: '16:30', notes: 'Roleplay activities' },
    ];

    for (const data of sessionsData) {
      const sessionDate = addDays(monday, data.dayOffset);
      const courseObj = courses.find(c => c.name === data.course);
      const teacherObj = teachers.find(t => t.name === data.teacher);
      const roomObj = rooms.find(r => r.name === data.room);
      const centreObj = centres.find(c => c.id === roomObj.centreId);

      await prisma.classSession.create({
        data: {
          id: generateId(),
          className: data.className,
          courseId: courseObj.id,
          teacherId: teacherObj.id,
          centreId: centreObj.id,
          roomId: roomObj.id,
          date: new Date(Date.UTC(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate())),
          startTime: data.start,
          endTime: data.end,
          notes: data.notes,
          testType: data.testType || null,
          examDownloadUrl: data.examDownloadUrl || null,
          lmsUrl: data.lmsUrl || null
        }
      });
    }

    console.log('[Seed] Scheduling one dynamic ON-GOING session for today...');
    const todayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon=0, Sun=6
    const todayDate = addDays(monday, todayIndex);
    const currentHour = now.getHours();
    
    // Choose timeslot enclosing the current hour
    const startHour = Math.max(7, currentHour - 1);
    const endHour = Math.min(21, startHour + 2);
    const pad = (n) => n.toString().padStart(2, '0');
    const ongoingStart = `${pad(startHour)}:00`;
    const ongoingEnd = `${pad(endHour)}:00`;

    const ongoingCourse = courses[0]; // IELTS
    const ongoingTeacher = teachers[0]; // David Miller
    const ongoingRoom = rooms.find(r => r.centreId === centres[0].id); // Room 101

    await prisma.classSession.create({
      data: {
        id: generateId(),
        className: 'Ongoing Demo Class (Pulsing Emerald)',
        courseId: ongoingCourse.id,
        teacherId: ongoingTeacher.id,
        centreId: centres[0].id,
        roomId: ongoingRoom.id,
        date: new Date(Date.UTC(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate())),
        startTime: ongoingStart,
        endTime: ongoingEnd,
        notes: 'Pulsing color represents active session happening now!'
      }
    });

    console.log('[Seed] Successfully seeded all mock data!');
    console.log(`Today's dynamic ongoing session created for: ${ongoingStart} to ${ongoingEnd}`);
  } catch (error) {
    console.error('[Seed Error] Failed to seed demo data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
