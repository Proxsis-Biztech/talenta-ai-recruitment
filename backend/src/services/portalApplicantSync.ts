import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function ensureApplicantForPortalUser(userId: string) {
  const user = await prisma.portalUser.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'peserta') return null;

  const job = user.assessmentId
    ? await prisma.job.findFirst({ where: { code: user.assessmentId } })
    : null;
  const existing = await prisma.applicant.findUnique({ where: { email: user.email } });

  if (existing) {
    return prisma.applicant.update({
      where: { id: existing.id },
      data: {
        fullName: user.name,
        phone: user.phone || existing.phone,
        education: user.education || existing.education,
        university: user.university || existing.university,
        appliedPosition: existing.appliedPosition || job?.title || user.assessmentTitle || 'General',
        jobId: existing.jobId || job?.id || null
      }
    });
  }

  return prisma.applicant.create({
    data: {
      fullName: user.name,
      placeOfBirth: '-',
      dateOfBirth: new Date('1990-01-01'),
      phone: user.phone || '-',
      email: user.email,
      address: user.city || '-',
      gender: '-',
      education: user.education || 'S1',
      university: user.university || null,
      major: null,
      gpa: null,
      cvFileName: 'portal-profile',
      cvMimeType: 'application/pdf',
      syncStatus: 'success',
      appliedPosition: job?.title || user.assessmentTitle || 'General',
      jobId: job?.id || null
    }
  });
}
