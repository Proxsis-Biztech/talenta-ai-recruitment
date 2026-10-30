import React, { useState } from 'react';
import {
  CreditCard,
  PlusCircle,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Building2,
  TrendingDown,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Receipt,
  QrCode,
  Check
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/Table';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

export interface CompanyBillingTenant {
  id: string;
  code: string;
  name: string;
  industry: string;
  contactPerson: string;
  email: string;
  creditBalance: number;
  availableQuota: number;
  usedQuota: number;
  ratePerCandidate: number;
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
  status: 'PAID_APPROVED' | 'PENDING_APPROVAL' | 'REJECTED';
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

const INITIAL_TENANTS: CompanyBillingTenant[] = [
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

const INITIAL_INVOICES: BillingInvoice[] = [
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
    paymentMethod: 'Bank Transfer BCA VA',
    bankAccount: 'BCA VA: 8271-9002-3841-001',
    status: 'PAID_APPROVED'
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
    paymentMethod: 'Mandiri Corporate Transfer',
    bankAccount: 'Mandiri: 124-00-1122334-9',
    status: 'PAID_APPROVED'
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

const INITIAL_TRANSACTIONS: CreditUsageTransaction[] = [
  {
    id: 'trx-001',
    tenantId: 't-cimb',
    batchName: 'Batch 1 - Management Associate Program',
    programTitle: 'The Complete Banker: In-Basket Simulation PT Anjak',
    candidateCount: 25,
    deductedAmount: 1125000,
    timestamp: '2026-10-27 08:30:00',
    type: 'DEDUCTION',
    description: 'Auto-debit 25 kandidat saat kelas batch dibuka (25 x Rp 45.000)'
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
    description: 'Auto-debit 20 kandidat saat kelas batch dibuka (20 x Rp 45.000)'
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
    description: 'Refund 1 kuota karena kandidat berhalangan hadir sebelum ujian'
  }
];

export default function AdminBillingCredit() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('t-cimb');
  const [tenants, setTenants] = useState<CompanyBillingTenant[]>(INITIAL_TENANTS);
  const [invoices, setInvoices] = useState<BillingInvoice[]>(INITIAL_INVOICES);
  const [transactions, setTransactions] = useState<CreditUsageTransaction[]>(INITIAL_TRANSACTIONS);
  const [activeTab, setActiveTab] = useState<'invoices' | 'transactions' | 'pricing'>('invoices');

  // Top-Up Modal State
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [quotaInput, setQuotaInput] = useState<number>(50);
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer BCA Virtual Account');
  const [selectedInvoicePreview, setSelectedInvoicePreview] = useState<BillingInvoice | null>(null);
  const [statementModalOpen, setStatementModalOpen] = useState(false);

  const activeTenant = tenants.find((t) => t.id === selectedTenantId) || tenants[0];

  const subtotal = quotaInput * 45000;
  const ppn11 = Math.round(subtotal * 0.11);
  const totalPayable = subtotal + ppn11;

  const handleCreateTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newInv: BillingInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV/PTF-SAI/2026/10/${randomSuffix}`,
      tenantId: activeTenant.id,
      tenantName: activeTenant.name,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      requestedQuota: Number(quotaInput),
      subtotal,
      ppn11,
      totalAmount: totalPayable,
      paymentMethod,
      bankAccount: 'BCA VA: 8271-9002-3841-' + randomSuffix.toString().slice(0, 3),
      status: 'PENDING_APPROVAL'
    };

    setInvoices([newInv, ...invoices]);
    setTopUpModalOpen(false);
    setSelectedInvoicePreview(newInv);
  };

  const handleApproveInvoice = (invId: string) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invId ? { ...inv, status: 'PAID_APPROVED' } : inv))
    );
    const targetInv = invoices.find((i) => i.id === invId);
    if (targetInv) {
      setTenants((prev) =>
        prev.map((t) =>
          t.id === targetInv.tenantId
            ? {
                ...t,
                availableQuota: t.availableQuota + targetInv.requestedQuota,
                creditBalance: t.creditBalance + targetInv.subtotal
              }
            : t
        )
      );
      setTransactions((prev) => [
        {
          id: `trx-${Date.now()}`,
          tenantId: targetInv.tenantId,
          batchName: 'Top-up Kuota Prabayar',
          programTitle: `Persetujuan Invoice #${targetInv.invoiceNumber}`,
          candidateCount: targetInv.requestedQuota,
          deductedAmount: -targetInv.subtotal,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          type: 'TOP_UP',
          description: `Penambahan ${targetInv.requestedQuota} kuota via ${targetInv.paymentMethod}`
        },
        ...prev
      ]);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
              BRD Section 4.6 & MoSCoW BR-BL-11
            </span>
            <span className="text-xs text-slate-500">Unit Economics: Rp 45.000 / Kandidat</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sistem Saldo Kredit & Penagihan Multi-Tenant
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manajemen saldo kredit prabayar perusahaan, pemotongan otomatis per kelas, faktur PPN 11%, dan rekapitulasi statement batch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setStatementModalOpen(true)}
          >
            <Receipt className="w-4 h-4 text-slate-600" />
            <span>Statement Perusahaan</span>
          </Button>

          <Button
            variant="primary"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            onClick={() => setTopUpModalOpen(true)}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ajukan Top-Up Kuota</span>
          </Button>
        </div>
      </div>

      {/* Tenant Switcher Ribbon */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>Pilih Sub-Perusahaan Klien (Multi-Tenant):</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => setSelectedTenantId(tenant.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedTenantId === tenant.id
                  ? 'bg-blue-700 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tenant.name.split('(')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* 4 StatCards Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo Kredit Aktif</span>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              {formatRupiah(activeTenant.creditBalance)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Setara {activeTenant.availableQuota} kandidat ujian</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kuota Tersedia</span>
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              {activeTenant.availableQuota} <span className="text-sm font-normal text-slate-500">Kandidat</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span>Siap dialokasikan ke kelas baru</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kuota Terpakai</span>
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              {activeTenant.usedQuota} <span className="text-sm font-normal text-slate-500">Partisipan</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 font-medium font-mono">
              <span>{formatRupiah(activeTenant.usedQuota * activeTenant.ratePerCandidate)} total debit</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit Economics</span>
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              Rp 45.000 <span className="text-xs font-normal text-slate-500">/ knd</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-purple-600 font-medium">
              <span>+ PPN 11% (Faktur Pajak Resmi)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'invoices'
              ? 'border-blue-600 text-blue-700 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Faktur & Invoice Resmi ({invoices.filter((i) => i.tenantId === activeTenant.id).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'transactions'
              ? 'border-blue-600 text-blue-700 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Mutasi Pemotongan Kelas ({transactions.filter((t) => t.tenantId === activeTenant.id).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'pricing'
              ? 'border-blue-600 text-blue-700 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Ketentuan Bisnis BRD & PPN</span>
        </button>
      </div>

      {/* Tab Content 1: Invoices */}
      {activeTab === 'invoices' && (
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">Daftar Tagihan & Invoice Top-Up</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Penerbitan dokumen tagihan resmi (Invoice PDF) per pengajuan saldo kredit kuota (BRD BR-BL-12)
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="font-semibold text-slate-700 text-xs">NO. INVOICE</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs">TANGGAL</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs">KUOTA DIAJUKAN</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs">DPP (SUBTOTAL)</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs">PPN 11%</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs">TOTAL TAGIHAN</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs">STATUS</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs text-right">AKSI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices
                  .filter((inv) => inv.tenantId === activeTenant.id)
                  .map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono text-xs font-semibold text-blue-700">
                        {inv.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-mono">{inv.date}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-900 font-mono">
                        {inv.requestedQuota} Kandidat
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 font-mono">
                        {formatRupiah(inv.subtotal)}
                      </TableCell>
                      <TableCell className="text-xs text-amber-700 font-mono">
                        {formatRupiah(inv.ppn11)}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-emerald-700 font-mono">
                        {formatRupiah(inv.totalAmount)}
                      </TableCell>
                      <TableCell>
                        {inv.status === 'PAID_APPROVED' ? (
                          <Badge variant="success" hasDot>
                            Disetujui & Lunas
                          </Badge>
                        ) : (
                          <Badge variant="warning" hasDot>
                            Menunggu Verifikasi
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => setSelectedInvoicePreview(inv)}
                            className="text-xs text-slate-700"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            <span>Lihat Invoice</span>
                          </Button>

                          {inv.status === 'PENDING_APPROVAL' && (
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={() => handleApproveInvoice(inv.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              <span>Setujui Pembayaran</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab Content 2: Transactions / Deductions */}
      {activeTab === 'transactions' && (
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-5 border-b border-slate-100">
            <CardTitle className="text-base text-slate-900">Buku Kas & Riwayat Pemotongan Kuota Kelas</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Audit trail otomatis pemotongan Rp 45.000/kandidat saat kelas dibuka dan refund saat batal sebelum ujian
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="font-semibold text-slate-700 text-xs">WAKTU (TIMESTAMP)</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs">BATCH KELAS</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs">MODUL PROGRAM</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs">JUMLAH KANDIDAT</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs">MUTASI KREDIT</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs">KETERANGAN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions
                  .filter((t) => t.tenantId === activeTenant.id)
                  .map((trx) => (
                    <TableRow key={trx.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono text-xs text-slate-500">{trx.timestamp}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-800">{trx.batchName}</TableCell>
                      <TableCell className="text-xs text-slate-600">{trx.programTitle}</TableCell>
                      <TableCell className="text-xs font-mono font-bold text-slate-900">
                        {trx.candidateCount} Peserta
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold">
                        {trx.type === 'DEDUCTION' ? (
                          <span className="text-rose-600">- {formatRupiah(trx.deductedAmount)}</span>
                        ) : trx.type === 'REFUND' ? (
                          <span className="text-blue-600">+ {formatRupiah(Math.abs(trx.deductedAmount))} (Refund)</span>
                        ) : (
                          <span className="text-emerald-600">+ {formatRupiah(Math.abs(trx.deductedAmount))}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{trx.description}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab Content 3: Pricing Rules (BRD Section 4.6) */}
      {activeTab === 'pricing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-5 border-b border-slate-100">
              <CardTitle className="text-base text-slate-900">Ketentuan Unit Economics (BRD 4.6)</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Formula monetisasi resmi platform Proxsis Talent Force & Solusi Asesmen Indonesia
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-sm text-slate-700">
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
                <span className="font-semibold text-blue-900 block mb-1">1. Alur Top-Up Kuota Kredit</span>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Admin sub-perusahaan mengajukan penambahan saldo kredit (misal Rp 1.500.000). Sistem otomatis menghitung PPN 11% (Rp 165.000) sehingga total pembayaran menjadi Rp 1.665.000. Sistem menerbitkan Invoice PDF resmi.
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <span className="font-semibold text-emerald-900 block mb-1">2. Verifikasi & Approval</span>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Admin mengunggah bukti transfer bank. Super Admin memverifikasi dana masuk dan menyetujui transaksi (status Approved), sehingga saldo kredit bertambah seketika.
                </p>
              </div>

              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-100">
                <span className="font-semibold text-amber-900 block mb-1">3. Pemotongan Kredit Kelas</span>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Ketika sebuah kelas dibuka dengan 10 kandidat, sistem otomatis memotong saldo sebesar 10 x Rp 45.000 = Rp 450.000 secara real-time.
                </p>
              </div>

              <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100">
                <span className="font-semibold text-purple-900 block mb-1">4. Kebijakan Refund / Batal</span>
                <p className="text-xs text-purple-800 leading-relaxed">
                  Jika peserta berhalangan hadir dan dibatalkan sebelum jadwal mulai ujian, kredit dikembalikan utuh (refund credit) ke saldo perusahaan.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-5 border-b border-slate-100">
              <CardTitle className="text-base text-slate-900">Rekening Tujuan & Tata Cara Pembayaran</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Nomor rekening resmi PT Solusi Asesmen Indonesia
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs space-y-2">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Bank Penerima:</span>
                  <span className="font-bold text-slate-800">Bank Central Asia (BCA)</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Nomor Rekening:</span>
                  <span className="font-bold text-blue-700">8271-9002-3841-000</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Nama Penerima:</span>
                  <span className="font-bold text-slate-800">PT Solusi Asesmen Indonesia</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NPWP Perusahaan:</span>
                  <span className="font-bold text-slate-800">01.829.345.2-014.000</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-100 rounded-xl text-xs text-slate-600 leading-relaxed">
                Catatan: Faktur Pajak elektronik (e-Faktur) akan diterbitkan maksimal 3 hari kerja setelah pembayaran dinyatakan terverifikasi pada sistem.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top-Up Modal Wizard */}
      <Modal
        isOpen={topUpModalOpen}
        onClose={() => setTopUpModalOpen(false)}
        title="Pengajuan Top-Up Saldo Kuota Kredit (PPN 11%)"
        size="lg"
      >
        <form onSubmit={handleCreateTopUp} className="space-y-4 p-1">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Perusahaan Pemohon</label>
            <Input value={activeTenant.name} disabled className="bg-slate-100 text-xs font-medium" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Jumlah Kuota Kandidat</label>
              <Input
                type="number"
                min="1"
                value={quotaInput}
                onChange={(e) => setQuotaInput(Math.max(1, parseInt(e.target.value) || 1))}
                className="font-mono text-sm"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">Tarif: Rp 45.000 / kandidat</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Metode Pembayaran</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="Bank Transfer BCA Virtual Account">Bank Transfer BCA Virtual Account</option>
                <option value="Mandiri Corporate Transfer">Mandiri Corporate Transfer</option>
                <option value="BNI Virtual Account Corporate">BNI Virtual Account Corporate</option>
              </select>
            </div>
          </div>

          {/* Breakdown Perhitungan */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Dasar Pengenaan Pajak (DPP) ({quotaInput} x Rp 45.000):</span>
              <span className="font-mono font-medium">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between text-amber-700">
              <span>PPN 11% (Faktur Pajak Standar):</span>
              <span className="font-mono font-medium">+ {formatRupiah(ppn11)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
              <span>Total Tagihan Invoice:</span>
              <span className="font-mono text-blue-700 text-base">{formatRupiah(totalPayable)}</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Setelah formulir ini dikirim, Invoice PDF akan diterbitkan dan kuota akan otomatis ditambahkan seketika setelah bukti transfer disetujui Super Admin.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setTopUpModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Terbitkan Invoice Sekarang
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invoice Detail / Print Preview Modal */}
      {selectedInvoicePreview && (
        <Modal
          isOpen={!!selectedInvoicePreview}
          onClose={() => setSelectedInvoicePreview(null)}
          title={`Faktur Tagihan Resmi: ${selectedInvoicePreview.invoiceNumber}`}
          size="2xl"
        >
          <div className="p-4 space-y-6 text-slate-800 bg-white">
            {/* Header Surat Tagihan */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">PT SOLUSI ASESMEN INDONESIA</h3>
                <p className="text-xs text-slate-500">Proxsis Talent Force Assessment Platform Partner</p>
                <p className="text-xs text-slate-500">Permata Kuningan Building Lt. 17, HR Rasuna Said, Jakarta Selatan</p>
                <p className="text-xs text-slate-500">NPWP: 01.829.345.2-014.000</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-blue-700 block text-base">INVOICE RESMI</span>
                <span className="text-xs text-slate-500 font-mono">{selectedInvoicePreview.invoiceNumber}</span>
                <div className="mt-2">
                  {selectedInvoicePreview.status === 'PAID_APPROVED' ? (
                    <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
                      LUNAS (PAID)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-bold font-mono">
                      UNPAID / MENUNGGU TRANSFER
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase block">Ditagihkan Kepada:</span>
                <span className="font-bold text-slate-900 text-sm">{selectedInvoicePreview.tenantName}</span>
                <p className="text-slate-600 mt-0.5">PIC: Divisi Human Capital / Talent Acquisition</p>
              </div>
              <div className="text-right">
                <div className="flex justify-end gap-3 text-slate-600">
                  <span>Tanggal Terbit:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedInvoicePreview.date}</span>
                </div>
                <div className="flex justify-end gap-3 text-slate-600 mt-1">
                  <span>Jatuh Tempo:</span>
                  <span className="font-mono font-bold text-rose-700">{selectedInvoicePreview.dueDate}</span>
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100">
                  <TableHead className="text-xs font-semibold">DESKRIPSI LAYANAN ASESMEN</TableHead>
                  <TableHead className="text-xs font-semibold text-center">KUOTA</TableHead>
                  <TableHead className="text-xs font-semibold text-right">TARIF / KANDIDAT</TableHead>
                  <TableHead className="text-xs font-semibold text-right">JUMLAH (IDR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-xs">
                    <span className="font-semibold block text-slate-900">Lisensi Ujian Asesmen Cerdas AI & ExamRoom</span>
                    <span className="text-slate-500 text-[11px]">Termasuk 12 parameter AI proctoring, split-screen exam, dan draf LHA</span>
                  </TableCell>
                  <TableCell className="text-xs text-center font-mono font-bold">
                    {selectedInvoicePreview.requestedQuota}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono">Rp 45.000</TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatRupiah(selectedInvoicePreview.subtotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Calculation Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal (DPP):</span>
                  <span className="font-mono">{formatRupiah(selectedInvoicePreview.subtotal)}</span>
                </div>
                <div className="flex justify-between text-amber-800">
                  <span>PPN 11%:</span>
                  <span className="font-mono">{formatRupiah(selectedInvoicePreview.ppn11)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-300 pt-2 text-sm">
                  <span>Total Tagihan:</span>
                  <span className="font-mono text-blue-700">{formatRupiah(selectedInvoicePreview.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
              <div>
                <span className="font-semibold block text-slate-800">Instruksi Pembayaran:</span>
                <span className="text-blue-700 font-mono font-bold">{selectedInvoicePreview.bankAccount}</span>
                <span className="block text-slate-500 text-[11px] mt-0.5">a/n PT Solusi Asesmen Indonesia</span>
              </div>
              <div className="flex items-center gap-2">
                <QrCode className="w-8 h-8 text-slate-700" />
                <span className="text-[10px] text-slate-500">QRIS Terverifikasi</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedInvoicePreview(null)}>
                Tutup
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const printWin = window.open('', '_blank');
                  if (!printWin) return;
                  printWin.document.write(`
                    <html>
                      <head>
                        <title>INVOICE - ${selectedInvoicePreview.invoiceNumber}</title>
                        <style>
                          body { font-family: sans-serif; padding: 40px; color: #1e293b; }
                          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; }
                          .badge { background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 6px; font-weight: bold; }
                          table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                          th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
                          th { background: #f8fafc; }
                          .total { text-align: right; font-weight: bold; font-size: 16px; margin-top: 20px; }
                          .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b; }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <div>
                            <h2>PT SOLUSI ASESMEN INDONESIA (PROXSIS GROUP)</h2>
                            <p>Invoice Penagihan Kuota Asesmen Kandidat (BRD Multi-Tenant)</p>
                          </div>
                          <div style="text-align: right;">
                            <h3>${selectedInvoicePreview.invoiceNumber}</h3>
                            <p>Status: <span class="badge">${selectedInvoicePreview.status}</span></p>
                          </div>
                        </div>
                        <div style="margin-top: 20px;">
                          <p><strong>Ditagihkan Kepada:</strong> ${selectedInvoicePreview.tenantName}</p>
                          <p><strong>Tanggal Terbit:</strong> ${selectedInvoicePreview.date} | <strong>Jatuh Tempo:</strong> ${selectedInvoicePreview.dueDate}</p>
                        </div>
                        <table>
                          <thead>
                            <tr>
                              <th>Deskripsi Layanan</th>
                              <th>Jumlah Kuota</th>
                              <th>Tarif Satuan (Rp)</th>
                              <th>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Lisensi Ujian Asesmen Terintegrasi & AI Proctoring (Kandidat Simultan)</td>
                              <td>${selectedInvoicePreview.requestedQuota} Peserta</td>
                              <td>Rp 45.000</td>
                              <td>${formatRupiah(selectedInvoicePreview.subtotal)}</td>
                            </tr>
                            <tr>
                              <td colspan="3" style="text-align: right; font-weight: bold;">PPN 11%</td>
                              <td>${formatRupiah(selectedInvoicePreview.ppn11)}</td>
                            </tr>
                            <tr style="background: #f1f5f9; font-weight: bold;">
                              <td colspan="3" style="text-align: right;">TOTAL PEMBAYARAN</td>
                              <td style="color: #1e40af;">${formatRupiah(selectedInvoicePreview.totalAmount)}</td>
                            </tr>
                          </tbody>
                        </table>
                        <div style="margin-top: 30px; padding: 15px; background: #f8fafc; border-radius: 8px;">
                          <p><strong>Rekening Transfer:</strong> ${selectedInvoicePreview.bankAccount} a/n PT Solusi Asesmen Indonesia</p>
                        </div>
                        <div class="footer">
                          <p>Dokumen ini diterbitkan secara otomatis dan sah secara hukum sesuai UU No. 11/2008 & BRD SAI v1.0.</p>
                        </div>
                        <script>window.print();</script>
                      </body>
                    </html>
                  `);
                  printWin.document.close();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                <Download className="w-4 h-4 mr-1.5" />
                <span>Unduh / Cetak Invoice PDF</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Statement Perusahaan Modal */}
      <Modal
        isOpen={statementModalOpen}
        onClose={() => setStatementModalOpen(false)}
        title={`Statement Rekapitulasi Kredit: ${activeTenant.name}`}
        size="2xl"
      >
        <div className="p-4 space-y-4 text-xs text-slate-700">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
            <div>
              <span className="font-semibold text-slate-900 block text-sm">{activeTenant.name}</span>
              <span className="text-slate-500">Periode Laporan: Oktober 2026</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Sisa Saldo:</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                {formatRupiah(activeTenant.creditBalance)} ({activeTenant.availableQuota} kuota)
              </span>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100">
                <TableHead className="text-xs">TANGGAL</TableHead>
                <TableHead className="text-xs">AKTIVITAS / BATCH</TableHead>
                <TableHead className="text-xs text-center">KUOTA</TableHead>
                <TableHead className="text-xs text-right">MUTASI KREDIT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions
                .filter((t) => t.tenantId === activeTenant.id)
                .map((trx) => (
                  <TableRow key={trx.id}>
                    <TableCell className="font-mono text-xs">{trx.timestamp.split(' ')[0]}</TableCell>
                    <TableCell className="text-xs">
                      <span className="font-semibold block">{trx.batchName}</span>
                      <span className="text-slate-500">{trx.description}</span>
                    </TableCell>
                    <TableCell className="text-xs text-center font-mono">{trx.candidateCount}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold">
                      {trx.type === 'DEDUCTION' ? (
                        <span className="text-rose-600">- {formatRupiah(trx.deductedAmount)}</span>
                      ) : (
                        <span className="text-emerald-600">+ {formatRupiah(Math.abs(trx.deductedAmount))}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setStatementModalOpen(false)}>
              Tutup
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const printWin = window.open('', '_blank');
                if (!printWin) return;
                const rows = transactions
                  .filter((t) => t.tenantId === activeTenant.id)
                  .map(
                    (t) => `
                    <tr>
                      <td>${t.timestamp}</td>
                      <td><strong>${t.batchName}</strong><br/>${t.description}</td>
                      <td>${t.candidateCount} Peserta</td>
                      <td>${t.type === 'DEDUCTION' ? '- ' + formatRupiah(t.deductedAmount) : '+ ' + formatRupiah(Math.abs(t.deductedAmount))}</td>
                    </tr>
                  `
                  )
                  .join('');

                printWin.document.write(`
                  <html>
                    <head>
                      <title>Statement Rekapitulasi Kredit - ${activeTenant.name}</title>
                      <style>
                        body { font-family: sans-serif; padding: 40px; color: #1e293b; }
                        h2, p { margin: 0 0 8px 0; }
                        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
                        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
                        th { background: #f8fafc; font-weight: bold; }
                      </style>
                    </head>
                    <body>
                      <h2>PT SOLUSI ASESMEN INDONESIA</h2>
                      <p>Laporan Rekapitulasi Mutasi Kuota & Kredit Klien</p>
                      <div style="margin-top: 16px; padding: 12px; background: #f1f5f9; border-radius: 6px;">
                        <p><strong>Nama Klien / Tenant:</strong> ${activeTenant.name}</p>
                        <p><strong>Sisa Saldo Kuota:</strong> ${formatRupiah(activeTenant.creditBalance)} (${activeTenant.availableQuota} kandidat)</p>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>Waktu Transaksi</th>
                            <th>Aktivitas Batch Asesmen</th>
                            <th>Beban Kandidat</th>
                            <th>Mutasi Saldo</th>
                          </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                      </table>
                      <script>window.print();</script>
                    </body>
                  </html>
                `);
                printWin.document.close();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              <Download className="w-4 h-4 mr-1.5" />
              <span>Cetak / Ekspor Statement PDF</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
