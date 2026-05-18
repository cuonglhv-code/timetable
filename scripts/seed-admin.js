const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();

  const adminEmail = 'admin@jaxtina.edu';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    console.log('Admin user already exists');
    return;
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: 'System Admin',
      role: 'CENTRAL_ADMIN',
    },
  });

  console.log('Created default admin user:');
  console.log('  Email: admin@jaxtina.edu');
  console.log('  Password: admin123');
  console.log('  Role: CENTRAL_ADMIN');
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
