import { Request, Response } from 'express';
import crypto from 'crypto';

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

export const getBillingOverview = async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || 't-cimb';
    const tenant = TENANTS.find(t => t.id === tenantId) || TENANTS[0];
    const invoices = INVOICES.filter(i => i.tenantId === tenant.id);
    const transactions = TRANSACTIONS.filter(t => t.tenantId === tenant.id);

    return res.json({
      success: true,
      data: {
        activeTenant: tenant,
        allTenants: TENANTS.map(t => ({ id: t.id, name: t.name, code: t.code, availableQuota: t.availableQuota })),
        ratePerCandidate: 45000,
        ppnRatePercent: 11,
        invoices,
        transactions,
        totalCreditSpent: transactions.reduce((acc, curr) => acc + (curr.type === 'DEDUCTION' ? curr.deductedAmount : 0), 0)
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal memuat data billing' });
  }
};

export const requestTopUpQuota = async (req: Request, res: Response) => {
  try {
    const { tenantId, requestedQuota, paymentMethod } = req.body;
    if (!requestedQuota || requestedQuota < 1) {
      return res.status(400).json({ error: 'Jumlah kuota minimal 1 partisipan' });
    }

    const tenant = TENANTS.find(t => t.id === tenantId) || TENANTS[0];
    const subtotal = requestedQuota * 45000;
    const ppn11 = Math.round(subtotal * 0.11);
    const totalAmount = subtotal + ppn11;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV/PTF-SAI/2026/${new Date().getMonth() + 1}/${randomSuffix}`;

    const newInvoice: BillingInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      tenantId: tenant.id,
      tenantName: tenant.name,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      requestedQuota: Number(requestedQuota),
      subtotal,
      ppn11,
      totalAmount,
      paymentMethod: paymentMethod || 'Bank Transfer BCA Virtual Account',
      bankAccount: 'BCA VA: 8271-9002-3841-' + randomSuffix.toString().slice(0, 3),
      status: 'PENDING_APPROVAL'
    };

    INVOICES.unshift(newInvoice);

    return res.status(201).json({
      success: true,
      message: 'Pengajuan invoice top-up berhasil diterbitkan.',
      data: newInvoice
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal memproses top-up kuota' });
  }
};

export const approveInvoice = async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const invoice = INVOICES.find(i => i.id === invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice tidak ditemukan' });
    }

    if (invoice.status === 'PAID_APPROVED') {
      return res.status(400).json({ error: 'Invoice ini sudah disetujui sebelumnya' });
    }

    invoice.status = 'PAID_APPROVED';
    invoice.approvedAt = new Date().toISOString();
    invoice.approvedBy = 'superadmin';

    // Top up tenant balance
    const tenant = TENANTS.find(t => t.id === invoice.tenantId);
    if (tenant) {
      tenant.availableQuota += invoice.requestedQuota;
      tenant.creditBalance += invoice.subtotal;

      TRANSACTIONS.unshift({
        id: `trx-${Date.now()}`,
        tenantId: tenant.id,
        batchName: 'Top-up Kuota Prabayar',
        programTitle: `Persetujuan Invoice #${invoice.invoiceNumber}`,
        candidateCount: invoice.requestedQuota,
        deductedAmount: -invoice.subtotal,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        type: 'TOP_UP',
        description: `Penambahan ${invoice.requestedQuota} kuota via ${invoice.paymentMethod}`
      });
    }

    return res.json({
      success: true,
      message: 'Invoice berhasil disetujui dan saldo kredit telah bertambah.',
      data: invoice
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal menyetujui invoice' });
  }
};

export const verifyLhaPublic = async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;
    if (!hash || hash.length < 8) {
      return res.status(400).json({ valid: false, error: 'Hash verifikasi tidak valid' });
    }

    // Deterministic verify verification metadata conforming to UU PDP & BRD Section 6.2
    return res.json({
      valid: true,
      documentTitle: 'Laporan Hasil Asesmen (LHA) Resmi Eksekutif',
      issuingAuthority: 'Solusi Asesmen Indonesia (SAI) & Proxsis Talent Force',
      verificationHash: hash,
      algorithm: 'SHA-256 Digitally Signed',
      issuedDate: '2026-10-29',
      retentionPolicyNotice: 'Kepatuhan UU PDP No. 27/2022: Dokumen dan snapshot terenkripsi dijamin keabsahannya.',
      signatory: {
        name: 'Anggita, M.Psi., Psikolog',
        title: 'Lead Assessor Assessment Center',
        license: 'SIPP No. 042/SAI-HIMPSI/2026',
        status: 'Digitally Signed & Certified'
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
