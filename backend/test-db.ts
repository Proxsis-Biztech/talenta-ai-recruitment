import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const admins = await prisma.admin.findMany();
  console.log("Admins:", admins);
}
main().catch(console.error);
