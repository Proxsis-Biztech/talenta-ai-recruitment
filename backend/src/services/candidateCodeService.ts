import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type PortalUserClient = Pick<PrismaClient, 'portalUser'>;

export async function generateCandidateCode(client: PortalUserClient = prisma): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = `KND-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const existing = await client.portalUser.findUnique({
      where: { candidateCode: code },
      select: { id: true }
    });
    if (!existing) return code;
  }
  return `KND-${Date.now().toString().slice(-6)}`;
}

export async function ensureCandidateCode(
  userId: string,
  client: PortalUserClient = prisma
): Promise<string | null> {
  const user = await client.portalUser.findUnique({
    where: { id: userId },
    select: { id: true, role: true, candidateCode: true }
  });
  if (!user) return null;
  if (user.role !== 'peserta') return user.candidateCode;
  if (user.candidateCode) return user.candidateCode;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidateCode = await generateCandidateCode(client);
    try {
      await client.portalUser.update({ where: { id: user.id }, data: { candidateCode } });
      return candidateCode;
    } catch {
      // Retry when another request claimed the same code concurrently.
    }
  }
  return null;
}

export async function backfillCandidateCodes(): Promise<number> {
  const users = await prisma.portalUser.findMany({
    where: { role: 'peserta', candidateCode: null },
    select: { id: true }
  });
  for (const user of users) {
    await ensureCandidateCode(user.id);
  }
  return users.length;
}