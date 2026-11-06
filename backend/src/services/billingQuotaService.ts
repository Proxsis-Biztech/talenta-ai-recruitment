import { PrismaClient } from '@prisma/client';
import { ensureBillingSeeded } from '../controllers/BillingController';

const prisma = new PrismaClient();

export async function deductQuotaForExam(params: {
  candidateCode?: string | null;
  candidateName: string;
  candidateEmail: string;
  programCode: string;
}): Promise<boolean> {
  try {
    await ensureBillingSeeded();
    const job = await prisma.job.findUnique({
      where: { code: params.programCode },
      select: { tenantId: true, title: true }
    });
    if (!job?.tenantId) return false;

    const tenant = await prisma.tenant.findUnique({
      where: { id: job.tenantId },
      select: { code: true, name: true }
    });
    if (!tenant) return false;

    const billingTenant = await prisma.billingTenant.findFirst({
      where: {
        OR: [
          { code: { contains: tenant.code, mode: 'insensitive' } },
          { name: { contains: tenant.name, mode: 'insensitive' } }
        ]
      }
    });
    if (!billingTenant || billingTenant.availableQuota <= 0) return false;

    const batchName = `AUTO-${params.candidateCode || params.candidateEmail}-${params.programCode}`;
    const existing = await prisma.billingTransaction.findFirst({
      where: { batchName, type: 'DEDUCTION' }
    });
    if (existing) return false;

    await prisma.$transaction([
      prisma.billingTenant.update({
        where: { id: billingTenant.id },
        data: {
          availableQuota: { decrement: 1 },
          usedQuota: { increment: 1 }
        }
      }),
      prisma.billingTransaction.create({
        data: {
          tenantId: billingTenant.id,
          batchName,
          programTitle: job.title,
          candidateCount: 1,
          deductedAmount: billingTenant.ratePerCandidate,
          type: 'DEDUCTION',
          description: `Deduksi otomatis ujian ${params.programCode} untuk ${params.candidateName}`
        }
      })
    ]);
    return true;
  } catch (error) {
    console.error('Deduct billing quota error:', error);
    return false;
  }
}