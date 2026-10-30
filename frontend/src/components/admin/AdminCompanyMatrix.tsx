import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  Plus,
  CheckCircle2,
  Save,
  Check
} from 'lucide-react';
import {
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Modal
} from '../ui';

export interface CompanyItem {
  id: string;
  name: string;
  industry: string;
  pic: string;
  quotaMax: number;
  quotaUsed: number;
  contractPeriod: string;
  activeProgramsCount: number;
}

const STORAGE_KEY = 'talenta_companies_matrix_v1';

const INITIAL_COMPANIES: CompanyItem[] = [
  {
    id: 'PT-01',
    name: 'PT Telkom Indonesia Tbk',
    industry: 'Telekomunikasi & Digital Tech',
    pic: 'Indra Gunawan (VP Human Capital)',
    quotaMax: 1500,
    quotaUsed: 1240,
    contractPeriod: 'Jan 2026 - Des 2026',
    activeProgramsCount: 3
  },
  {
    id: 'PT-02',
    name: 'Astra International Tbk',
    industry: 'Konglomerasi Otomotif & Energi',
    pic: 'Budi Santosa (HR Director)',
    quotaMax: 800,
    quotaUsed: 620,
    contractPeriod: 'Mar 2026 - Mar 2027',
    activeProgramsCount: 2
  },
  {
    id: 'PT-03',
    name: 'Bank Mandiri Tbk',
    industry: 'Perbankan & Jasa Keuangan',
    pic: 'Rina Marlina (Talent Acquisition Lead)',
    quotaMax: 2000,
    quotaUsed: 1450,
    contractPeriod: 'Feb 2026 - Feb 2027',
    activeProgramsCount: 4
  },
  {
    id: 'PT-04',
    name: 'PT Bank CIMB Niaga Tbk',
    industry: 'Perbankan Komersial (The Complete Banker)',
    pic: 'Sari Handayani (VP Talent Acquisition)',
    quotaMax: 1200,
    quotaUsed: 780,
    contractPeriod: 'Jan 2026 - Des 2026',
    activeProgramsCount: 2
  },
  {
    id: 'PT-05',
    name: 'Pertamina Hulu Energi',
    industry: 'Minyak & Gas Bumi',
    pic: 'Agus Purnomo (Head of Talent Development)',
    quotaMax: 500,
    quotaUsed: 210,
    contractPeriod: 'Mei 2026 - Mei 2027',
    activeProgramsCount: 1
  }
];

export function AdminCompanyMatrix() {
  const [companies, setCompanies] = useState<CompanyItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved companies:', e);
    }
    return INITIAL_COMPANIES;
  });

  const [selectedPtId, setSelectedPtId] = useState<string>('PT-01');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for new PT
  const [ptName, setPtName] = useState('');
  const [ptIndustry, setPtIndustry] = useState('');
  const [ptPic, setPtPic] = useState('');
  const [ptQuota, setPtQuota] = useState(500);
  const [ptContract, setPtContract] = useState('Jan 2026 - Des 2026');

  const selectedPt = companies.find((c) => c.id === selectedPtId) || companies[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Matriks Peserta x Program x Tahap x Status
  const matrixData = [
    {
      program: 'Software Engineer Specialist Batch IV',
      quota: 450,
      tahapBerkas: 450,
      tahapCAT: 380,
      tahapInterview: 120,
      statusLulus: 85,
      statusGagal: 35
    },
    {
      program: 'Data Architect & AI Specialist',
      quota: 300,
      tahapBerkas: 300,
      tahapCAT: 240,
      tahapInterview: 80,
      statusLulus: 50,
      statusGagal: 30
    },
    {
      program: 'Digital Product Manager Fellow',
      quota: 490,
      tahapBerkas: 490,
      tahapCAT: 410,
      tahapInterview: 140,
      statusLulus: 95,
      statusGagal: 45
    }
  ];

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ptName.trim()) return;

    const newCompany: CompanyItem = {
      id: `PT-0${companies.length + 1}`,
      name: ptName.trim(),
      industry: ptIndustry.trim() || 'Korporasi & Institusi',
      pic: ptPic.trim() || 'HR Business Partner',
      quotaMax: Number(ptQuota) || 500,
      quotaUsed: 0,
      contractPeriod: ptContract || '2026 - 2027',
      activeProgramsCount: 1
    };

    const next = [...companies, newCompany];
    setCompanies(next);
    setSelectedPtId(newCompany.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    setIsAddModalOpen(false);
    setPtName('');
    setPtIndustry('');
    setPtPic('');
    showToast(`PT Mitra "${newCompany.name}" berhasil didaftarkan ke sistem!`);
  };

  const handleExportMatrixCSV = () => {
    const headers = [
      'PROGRAM ASESMEN',
      'KUOTA',
      'TAHAP BERKAS',
      'TAHAP CAT',
      'LIVE INTERVIEW',
      'STATUS LULUS',
      'STATUS GAGAL'
    ];
    const rows = matrixData.map((m) => [
      `"${m.program}"`,
      m.quota,
      m.tahapBerkas,
      m.tahapCAT,
      m.tahapInterview,
      m.statusLulus,
      m.statusGagal
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [`# MATRIKS SEBARAN PESERTA - ${selectedPt.name}`, headers.join(','), ...rows.map((e) => e.join(','))].join(
        '\n'
      );

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Matriks_Peserta_${selectedPt.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Matriks peserta untuk ${selectedPt.name} berhasil diekspor ke file CSV!`);
  };

  return (
    <div className="bg-white rounded-2xl border border-border-slate p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-primary-navy bg-soft-blue px-2.5 py-0.5 rounded border border-accent-border">
              KORPORASI &amp; PT MITRA
            </span>
            <Badge variant="navy">{companies.length} Institusi Mitra Aktif</Badge>
          </div>
          <h2 className="text-xl font-extrabold font-heading text-ink tracking-tight mt-1">
            Manajemen Kuota &amp; Matriks Peserta Perusahaan
          </h2>
          <p className="text-xs text-muted-slate mt-0.5">
            Daftar tenant multi-perusahaan, alokasi kuota lisensi, dan matriks sebaran kelulusan per tahapan.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          className="text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah PT Mitra</span>
        </Button>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ─── PT Table with Quota Progress Bar ─── */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>PERUSAHAAN</TableHead>
              <TableHead>INDUSTRI</TableHead>
              <TableHead>PIC RESMI</TableHead>
              <TableHead className="w-64">PENGGUNAAN KUOTA ASESMEN</TableHead>
              <TableHead>KONTRAK</TableHead>
              <TableHead className="text-right">DETAIL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c) => {
              const pct = Math.round((c.quotaUsed / c.quotaMax) * 100);
              const isSelected = selectedPtId === c.id;
              return (
                <TableRow
                  key={c.id}
                  isSelected={isSelected}
                  onClick={() => setSelectedPtId(c.id)}
                  className="cursor-pointer hover:bg-slate-50/80"
                >
                  <TableCell>
                    <p className="font-bold text-ink text-xs sm:text-sm">{c.name}</p>
                    <p className="font-mono text-[11px] text-muted-slate">
                      {c.id} • {c.activeProgramsCount} Program Aktif
                    </p>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{c.industry}</TableCell>
                  <TableCell className="text-xs text-slate-600">{c.pic}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-primary-navy">{c.quotaUsed}</span>
                        <span className="text-slate-400">
                          / {c.quotaMax} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full ${
                            pct > 80 ? 'bg-warning-amber' : 'bg-primary-navy'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{c.contractPeriod}</TableCell>
                  <TableCell className="text-right">
                    <Button variant={isSelected ? 'primary' : 'outline'} size="xs" className="cursor-pointer">
                      Matriks
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ─── Detail PT: Matriks Peserta x Program x Tahap x Status ─── */}
      <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-bold text-sm text-ink">
              Matriks Sebaran Peserta: <span className="text-primary-navy font-extrabold">{selectedPt.name}</span>
            </h3>
            <p className="text-xs text-muted-slate font-sans">
              Sebaran kandidat berdasarkan Program x Tahap Seleksi x Status Kelulusan
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMatrixCSV}
            className="text-xs flex items-center gap-1.5 cursor-pointer bg-white"
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Ekspor Matriks (CSV)
          </Button>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>PROGRAM ASESMEN</TableHead>
                <TableHead className="text-center">KUOTA</TableHead>
                <TableHead className="text-center">TAHAP BERKAS</TableHead>
                <TableHead className="text-center">TAHAP CAT</TableHead>
                <TableHead className="text-center">LIVE INTERVIEW</TableHead>
                <TableHead className="text-center">STATUS LULUS</TableHead>
                <TableHead className="text-center">STATUS GAGAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrixData.map((m, idx) => (
                <TableRow key={idx} className="hover:bg-slate-50/50">
                  <TableCell className="font-sans font-bold text-ink text-xs">{m.program}</TableCell>
                  <TableCell className="font-mono text-center text-slate-700 text-xs">{m.quota}</TableCell>
                  <TableCell className="font-mono text-center text-slate-700 text-xs">{m.tahapBerkas}</TableCell>
                  <TableCell className="font-mono text-center text-blue-accent font-bold text-xs">
                    {m.tahapCAT}
                  </TableCell>
                  <TableCell className="font-mono text-center text-primary-navy font-bold text-xs">
                    {m.tahapInterview}
                  </TableCell>
                  <TableCell className="font-mono text-center text-emerald-600 font-bold text-xs">
                    {m.statusLulus}
                  </TableCell>
                  <TableCell className="font-mono text-center text-rose-600 font-bold text-xs">
                    {m.statusGagal}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ─── MODAL TAMBAH PT MITRA BARU ─── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Daftarkan PT / Institusi Mitra Baru"
        size="md"
      >
        <form onSubmit={handleAddCompany} className="p-4 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Perusahaan (PT / BUMN / Korporasi)</label>
            <input
              type="text"
              value={ptName}
              onChange={(e) => setPtName(e.target.value)}
              placeholder="Contoh: PT Kereta Cepat Indonesia China (KCIC)"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs outline-none focus:border-primary-navy"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Bidang Industri</label>
            <input
              type="text"
              value={ptIndustry}
              onChange={(e) => setPtIndustry(e.target.value)}
              placeholder="Contoh: Transportasi Perkeretaapian Cepat / Perbankan"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs outline-none focus:border-primary-navy"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">PIC Resmi Perusahaan (Nama &amp; Jabatan)</label>
            <input
              type="text"
              value={ptPic}
              onChange={(e) => setPtPic(e.target.value)}
              placeholder="Contoh: Dwi Wicaksono (Head of Human Capital)"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs outline-none focus:border-primary-navy"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Alokasi Kuota Asesmen</label>
              <input
                type="number"
                value={ptQuota}
                onChange={(e) => setPtQuota(Number(e.target.value))}
                min={50}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Periode Kontrak Asesmen</label>
              <input
                type="text"
                value={ptContract}
                onChange={(e) => setPtContract(e.target.value)}
                placeholder="Jan 2026 - Des 2026"
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Simpan &amp; Daftarkan PT
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
