import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = 'superadmin';
  const plainPassword = 'cleaverzz25';
  
  // Check if admin already exists
  const existingAdmin = await prisma.admin.findUnique({
    where: { username },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const admin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
        role: 'superadmin',
      },
    });
    console.log(`Created admin user: ${admin.username} / ${plainPassword}`);
  } else {
    console.log(`Admin user ${username} already exists.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
