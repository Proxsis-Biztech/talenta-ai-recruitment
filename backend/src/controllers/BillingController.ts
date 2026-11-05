import { Request, Response } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';
import { resolveAdminTenantId } from '../middleware/tenant';

const prisma = new PrismaClient();

export interface CompanyBillingTenant {
  id: string;
  code: string;
  name: string;
  industry: string;
  contactPerson: string;
  email: string;
  creditBalance: number; // In Rupiah (e.g. 4500000 = 100 quota)
  availableQuota: number; // Candidate slots
  usedQuota: number;
  ratePerCandidate: number; // Rp 45.000
}

export interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  date: string;
  dueDate: string;
  requestedQuota: number;
  subtotal: number;
  ppn11: number;
  totalAmount: number;
  paymentMethod: string;
  bankAccount: string;
  status: 'PENDING_APPROVAL' | 'PAID_APPROVED' | 'REJECTED';
  proofReceiptUrl?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface CreditUsageTransaction {
  id: string;
  tenantId: string;
  batchName: string;
  programTitle: string;
  candidateCount: number;
  deductedAmount: number;
  timestamp: string;
  type: 'DEDUCTION' | 'TOP_UP' | 'REFUND';
  description: string;
}

// In-memory persistent demo store initialized with BRD client targets
let TENANTS: CompanyBillingTenant[] = [
  {
    id: 't-cimb',
    code: 'CIMB-B2B',
    name: 'PT Bank CIMB Niaga Tbk (The Complete Banker)',
    industry: 'Perbankan & Jasa Keuangan',
    contactPerson: 'Sari Handayani (VP Talent Acquisition)',
    email: 'talent.acq@cimbniaga.co.id',
    creditBalance: 6750000,
    availableQuota: 150,
    usedQuota: 45,
    ratePerCandidate: 45000
  },
  {
    id: 't-kcic',
    code: 'KCIC-B2B',
    name: 'PT Kereta Cepat Indonesia China (KCIC)',
    industry: 'Transportasi Perkeretaapian Cepat',
    contactPerson: 'Dwi Wicaksono (Head of Human Capital)',
    email: 'hc.recruitment@kcic.co.id',
    creditBalance: 4500000,
    availableQuota: 100,
    usedQuota: 60,
    ratePerCandidate: 45000
  },
  {
    id: 't-mrt',
    code: 'MRT-B2B',
    name: 'PT MRT Jakarta (Perseroda)',
    industry: 'Transportasi Publik Modern',
    contactPerson: 'Rizki Amanda (Talent Development Lead)',
    email: 'recruitment@jakartamrt.co.id',
    creditBalance: 3600000,
    availableQuota: 80,
    usedQuota: 38,
    ratePerCandidate: 45000
  },
  {
    id: 't-transjakarta',
    code: 'TJ-B2B',
    name: 'PT Transportasi Jakarta (Transjakarta)',
    industry: 'Transportasi Massal Kota',
    contactPerson: 'Bambang S. (HR Manager)',
    email: 'hr@transjakarta.co.id',
    creditBalance: 2250000,
    availableQuota: 50,
    usedQuota: 12,
    ratePerCandidate: 45000
  },
  {
    id: 't-kohler',
    code: 'KOHLER-B2B',
    name: 'PT Kohler Manufacturing Indonesia',
    industry: 'Manufaktur & Desain Sanitari',
    contactPerson: 'Jessica Tan (HRBP Lead)',
    email: 'recruitment@kohler.com',
    creditBalance: 3150000,
    availableQuota: 70,
    usedQuota: 20,
    ratePerCandidate: 45000
  }
];

let INVOICES: BillingInvoice[] = [
  {
    id: 'inv-101',
    invoiceNumber: 'INV/PTF-SAI/2026/10/0042',
    tenantId: 't-cimb',
    tenantName: 'PT Bank CIMB Niaga Tbk (The Complete Banker)',
    date: '2026-10-25',
    dueDate: '2026-11-01',
    requestedQuota: 150,
    subtotal: 6750000,
    ppn11: 742500,
    totalAmount: 7492500,
    paymentMethod: 'Bank Transfer BCA VA (Virtual Account)',
    bankAccount: 'BCA VA: 8271-9002-3841-001',
    status: 'PAID_APPROVED',
    approvedAt: '2026-10-26T09:15:00Z',
    approvedBy: 'superadmin'
  },
  {
    id: 'inv-102',
    invoiceNumber: 'INV/PTF-SAI/2026/10/0043',
    tenantId: 't-kcic',
    tenantName: 'PT Kereta Cepat Indonesia China (KCIC)',
    date: '2026-10-26',
    dueDate: '2026-11-02',
    requestedQuota: 100,
    subtotal: 4500000,
    ppn11: 495000,
    totalAmount: 4995000,
    paymentMethod: 'Mandiri Corporate Direct Transfer',
    bankAccount: 'Bank Mandiri: 124-00-1122334-9 (SAI Asesmen)',
    status: 'PAID_APPROVED',
    approvedAt: '2026-10-27T11:30:00Z',
    approvedBy: 'superadmin'
  },
  {
    id: 'inv-103',
    invoiceNumber: 'INV/PTF-SAI/2026/10/0044',
    tenantId: 't-mrt',
    tenantName: 'PT MRT Jakarta (Perseroda)',
    date: '2026-10-28',
    dueDate: '2026-11-04',
    requestedQuota: 50,
    subtotal: 2250000,
    ppn11: 247500,
    totalAmount: 2497500,
    paymentMethod: 'Bank Transfer BCA VA',
    bankAccount: 'BCA VA: 8271-9002-3841-002',
    status: 'PENDING_APPROVAL'
  }
];

let TRANSACTIONS: CreditUsageTransaction[] = [
  {
    id: 'trx-001',
    tenantId: 't-cimb',
    batchName: 'Batch 1 - Management Associate Program',
    programTitle: 'The Complete Banker: In-Basket Simulation PT Anjak',
    candidateCount: 25,
    deductedAmount: 1125000,
    timestamp: '2026-10-27 08:30:00',
    type: 'DEDUCTION',
    description: 'Auto-debit 25 kandidat saat kelas batch dibuka'
  },
  {
    id: 'trx-002',
    tenantId: 't-cimb',
    batchName: 'Batch 2 - Executive Branch Manager',
    programTitle: 'The Complete Banker: Strategic Decision Simulation',
    candidateCount: 20,
    deductedAmount: 900000,
    timestamp: '2026-10-28 10:00:00',
    type: 'DEDUCTION',
    description: 'Auto-debit 20 kandidat saat kelas batch dibuka'
  },
  {
    id: 'trx-003',
    tenantId: 't-cimb',
    batchName: 'Batch 2 - Executive Branch Manager',
    programTitle: 'The Complete Banker: Strategic Decision Simulation',
    candidateCount: 1,
    deductedAmount: -45000,
    timestamp: '2026-10-28 14:15:00',
    type: 'REFUND',
    description: 'Refund 1 kuota karena kandidat berhalangan sebelum ujian'
  }
];

const serializeInvoice = (invoice: any) => ({
  ...invoice,
  approvedAt: invoice.approvedAt ? new Date(invoice.approvedAt).toISOString() : undefined
});

const serializeTransaction = (transaction: any) => ({
  ...transaction,
  timestamp: new Date(transaction.timestamp).toISOString().replace('T', ' ').slice(0, 19)
});

const ensureBillingSeeded = async () => {
  for (const tenant of TENANTS) {
    await prisma.billingTenant.upsert({
      where: { id: tenant.id },
      update: {},
      create: tenant
    });
  }
  for (const invoice of INVOICES) {
    const { tenantName: _tenantName, ...record } = invoice;
    await prisma.billingInvoice.upsert({
      where: { id: record.id },
      update: {},
      create: {
        ...record,
        approvedAt: record.approvedAt ? new Date(record.approvedAt) : null
      }
    });
  }
  for (const transaction of TRANSACTIONS) {
    await prisma.billingTransaction.upsert({
      where: { id: transaction.id },
      update: {},
      create: {
        ...transaction,
        timestamp: new Date(transaction.timestamp.replace(' ', 'T'))
      }
    });
  }
};

export const getBillingOverview = async (req: AuthRequest, res: Response) => {
  try {
    await ensureBillingSeeded();
    const scopedTenantId = resolveAdminTenantId(req);
    const scopedTenant = scopedTenantId
      ? await prisma.tenant.findUnique({ where: { id: scopedTenantId }, select: { code: true } })
      : null;
    const tenantId = (req.query.tenantId as string) || 't-cimb';
    const tenants = await prisma.billingTenant.findMany({
      where: scopedTenant?.code ? { code: { contains: scopedTenant.code } } : {},
      orderBy: { code: 'asc' }
    });
    const tenant = scopedTenant ? tenants[0] : tenants.find((item) => item.id === tenantId) || tenants[0];
    if (!tenant) return res.status(404).json({ error: 'Tenant billing tidak ditemukan' });

    const invoices = await prisma.billingInvoice.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' }
    });
    const transactions = await prisma.billingTransaction.findMany({
      where: { tenantId: tenant.id },
      orderBy: { timestamp: 'desc' }
    });

    return res.json({
      success: true,
      data: {
        activeTenant: tenant,
        allTenants: tenants.map((item) => ({
          id: item.id,
          name: item.name,
          code: item.code,
          availableQuota: item.availableQuota
        })),
        ratePerCandidate: 45000,
        ppnRatePercent: 11,
        invoices: invoices.map(serializeInvoice),
        transactions: transactions.map(serializeTransaction),
        totalCreditSpent: transactions.reduce(
          (acc, curr) => acc + (curr.type === 'DEDUCTION' ? curr.deductedAmount : 0),
          0
        )
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal memuat data billing' });
  }
};

export const requestTopUpQuota = async (req: Request, res: Response) => {
  try {
    await ensureBillingSeeded();
    const { tenantId, requestedQuota, paymentMethod } = req.body;
    if (!requestedQuota || Number(requestedQuota) < 1) {
      return res.status(400).json({ error: 'Jumlah kuota minimal 1 partisipan' });
    }

    const tenants = await prisma.billingTenant.findMany({ orderBy: { code: 'asc' } });
    const tenant = tenants.find((item) => item.id === tenantId) || tenants[0];
    if (!tenant) return res.status(404).json({ error: 'Tenant billing tidak ditemukan' });

    const subtotal = Number(requestedQuota) * 45000;
    const ppn11 = Math.round(subtotal * 0.11);
    const totalAmount = subtotal + ppn11;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV/PTF-SAI/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${randomSuffix}`;

    const invoice = await prisma.billingInvoice.create({
      data: {
        invoiceNumber,
        tenantId: tenant.id,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        requestedQuota: Number(requestedQuota),
        subtotal,
        ppn11,
        totalAmount,
        paymentMethod: paymentMethod || 'Bank Transfer BCA Virtual Account',
        bankAccount: `BCA VA: 8271-9002-3841-${randomSuffix.toString().slice(0, 3)}`,
        status: 'PENDING_APPROVAL'
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Pengajuan invoice top-up berhasil diterbitkan.',
      data: serializeInvoice(invoice)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal memproses top-up kuota' });
  }
};

export const approveInvoice = async (req: Request, res: Response) => {
  try {
    await ensureBillingSeeded();
    const { invoiceId } = req.params;
    const invoice = await prisma.billingInvoice.findUnique({ where: { id: String(invoiceId) } });
    if (!invoice) return res.status(404).json({ error: 'Invoice tidak ditemukan' });
    if (invoice.status === 'PAID_APPROVED') {
      return res.status(400).json({ error: 'Invoice ini sudah disetujui sebelumnya' });
    }

    const approved = await prisma.$transaction(async (tx) => {
      const updated = await tx.billingInvoice.update({
        where: { id: invoice.id },
        data: {
          status: 'PAID_APPROVED',
          approvedAt: new Date(),
          approvedBy: 'superadmin'
        }
      });
      await tx.billingTenant.update({
        where: { id: invoice.tenantId },
        data: {
          availableQuota: { increment: invoice.requestedQuota },
          creditBalance: { increment: invoice.subtotal }
        }
      });
      await tx.billingTransaction.create({
        data: {
          tenantId: invoice.tenantId,
          batchName: 'Top-up Kuota Prabayar',
          programTitle: `Persetujuan Invoice #${invoice.invoiceNumber}`,
          candidateCount: invoice.requestedQuota,
          deductedAmount: -invoice.subtotal,
          type: 'TOP_UP',
          description: `Penambahan ${invoice.requestedQuota} kuota via ${invoice.paymentMethod}`
        }
      });
      return updated;
    });

    return res.json({
      success: true,
      message: 'Invoice berhasil disetujui dan saldo kredit telah bertambah.',
      data: serializeInvoice(approved)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal menyetujui invoice' });
  }
};

export const verifyLhaPublic = async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;
    if (!hash || hash.length < 32) {
      return res.status(400).json({ valid: false, error: 'Hash verifikasi tidak valid' });
    }

    const score = await prisma.assessorScore.findUnique({ where: { lhaHash: String(hash) } });
    if (!score || score.status !== 'signed') {
      return res.status(404).json({ valid: false, error: 'LHA tidak ditemukan atau belum ditandatangani.' });
    }

    const competencies = JSON.parse(score.competencies || '[]');
    return res.json({
      valid: true,
      documentTitle: 'Laporan Hasil Asesmen (LHA) Resmi',
      issuingAuthority: 'Solusi Asesmen Indonesia (SAI) & Proxsis Talent Force',
      verificationHash: score.lhaHash,
      lhaNumber: score.lhaNumber,
      candidateCode: score.candidateCode,
      candidateName: score.candidateName,
      programTitle: score.programTitle,
      interviewScore: score.interviewScore,
      compositeScore: score.compositeScore,
      recommendation: score.recommendation,
      competencies,
      algorithm: 'SHA-256',
      issuedDate: score.signedAt?.toISOString(),
      signatory: {
        assessorId: score.assessorId,
        status: 'Digitally Signed'
      }
    });
  } catch (err: any) {
    return res.status(500).json({ valid: false, error: err.message || 'Gagal memverifikasi LHA' });
  }
};
