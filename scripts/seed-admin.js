const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');

function generateId() {
  return 'c' + crypto.randomBytes(16).toString('hex').slice(0, 24);
}

async function main() {
  const dbPath = path.join(__dirname, '..', 'dev.db');
  const db = new Database(dbPath);

  const email = 'admin@school.edu';
  const password = 'Admin123!';
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = generateId();
  const now = new Date().toISOString();

  try {
    const existing = db.prepare('SELECT id FROM "User" WHERE email = ?').get(email);
    if (existing) {
      console.log('Admin account already exists:', email);
      return;
    }

    db.prepare(
      `INSERT INTO "User" (id, email, password, name, role, "isActive", "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, email, hashedPassword, 'System Admin', 'CENTRAL_ADMIN', 1, now, now);

    console.log('Admin account created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
  } catch (error) {
    console.error('Failed to create admin account:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
