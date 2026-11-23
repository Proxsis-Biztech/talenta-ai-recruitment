import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { downloadCsvFile } from '../../utils/csvExport';
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
  Check,
  FileText,
  Upload,
  Trash2
} from 'lucide-react';
import { loadMasterScope, saveMasterRecord } from '../../services/masterDataService';
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
  const [companies, setCompanies] = useState<CompanyItem[]>(INITIAL_COMPANIES);

  useEffect(() => {
    let cancelled = false;
    loadMasterScope<CompanyItem[]>('company')
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.matrix) && data.matrix.length > 0) {
          setCompanies(data.matrix);
        } else {
          void saveMasterRecord('company', 'matrix', INITIAL_COMPANIES);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Dynamic Report Template state per Tenant/PT
  const [reportTpl, setReportTpl] = useState({
    headerTitle: 'LAPORAN HASIL ASESMEN (LHA)',
    pdfTitle: '',
    footerText: '',
    introText: '',
    closingNote:
      'Hasil asesmen bersifat rekomendasi profesional asesor. Keputusan akhir mengikuti kebijakan pemberi tugas.',
    signatoryName: '',
    signatoryTitle: 'Lead Assessor / Kepala Proyek',
    showCompetencyTable: true,
    showInterviewScore: true,
    showAssessorNotes: true,
    showIntegrityHash: true,
    templateFileUrl: null as string | null,
    templateFileName: null as string | null
  });
  const [tplSaving, setTplSaving] = useState(false);
  const [tplUploading, setTplUploading] = useState(false);

  useEffect(() => {
    if (!selectedPt?.id) return;
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    let cancelled = false;
    axios
      .get(`/api/admin/report-templates/${encodeURIComponent(selectedPt.id)}`, {
        params: { companyName: selectedPt.name },
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        if (data) {
          setReportTpl({
            headerTitle: data.headerTitle || 'LAPORAN HASIL ASESMEN (LHA)',
            pdfTitle: data.pdfTitle || `${selectedPt.name} - Laporan Hasil Asesmen`,
            footerText: data.footerText || `${selectedPt.name} • RIGHT Assessment Platform`,
            introText: data.introText || '',
            closingNote:
              data.closingNote ||
              'Hasil asesmen bersifat rekomendasi profesional asesor. Keputusan akhir mengikuti kebijakan pemberi tugas.',
            signatoryName: data.signatoryName || '',
            signatoryTitle: data.signatoryTitle || 'Lead Assessor / Kepala Proyek',
            showCompetencyTable: data.showCompetencyTable !== false,
            showInterviewScore: data.showInterviewScore !== false,
            showAssessorNotes: data.showAssessorNotes !== false,
            showIntegrityHash: data.showIntegrityHash !== false,
            templateFileUrl: data.templateFileUrl || null,
            templateFileName: data.templateFileName || null
          });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selectedPt?.id, selectedPt?.name]);

  const handleSaveReportTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPt?.id) return;
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    setTplSaving(true);
    try {
      await axios.put(
        `/api/admin/report-templates/${encodeURIComponent(selectedPt.id)}`,
        {
          ...reportTpl,
          companyName: selectedPt.name
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`Template laporan LHA untuk ${selectedPt.name} berhasil disimpan.`);
    } catch {
      showToast('Gagal menyimpan template laporan.');
    } finally {
      setTplSaving(false);
    }
  };

  const handleUploadTemplateFile = async (file: File) => {
    if (!selectedPt?.id) return;
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    setTplUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(
        `/api/admin/report-templates/${encodeURIComponent(selectedPt.id)}/upload`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      const uploaded = res.data?.file;
      if (uploaded) {
        setReportTpl((prev) => ({
          ...prev,
          templateFileUrl: uploaded.url,
          templateFileName: uploaded.name
        }));
      }
      showToast(`File template "${file.name}" berhasil diunggah untuk ${selectedPt.name}.`);
    } catch {
      showToast('Gagal mengunggah file template.');
    } finally {
      setTplUploading(false);
    }
  };

  const handleDownloadPreviewPdf = async () => {
    if (!selectedPt?.id) return;
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    try {
      const response = await axios.get(
        `/api/admin/report-templates/${encodeURIComponent(selectedPt.id)}/preview-pdf`,
        {
          params: { companyName: selectedPt.name },
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Template-LHA-${selectedPt.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('Gagal mengunduh preview PDF template.');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Matriks Peserta x Program x Tahap x Status (dihitung dari data server)
  const [matrixData, setMatrixData] = useState<Array<{
    program: string;
    quota: number;
    tahapBerkas: number;
    tahapInterview: number;
    statusLulus: number;
    statusGagal: number;
  }>>([]);

  useEffect(() => {
    let cancelled = false;
    const loadMatrix = async () => {
      const token = localStorage.getItem('adminToken');
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [jobsResponse, applicantsResponse] = await Promise.all([
          axios.get('/api/admin/jobs', { params: { limit: 100 }, headers }),
          axios.get('/api/admin/applicants', { params: { limit: 100 }, headers })
        ]);
        if (cancelled) return;
        const jobs = jobsResponse.data.data || [];
        const applicants = applicantsResponse.data.data || [];
        const rows = jobs
          .filter((job: any) => job.status === 'active')
          .slice(0, 10)
          .map((job: any) => {
            const related = applicants.filter(
              (applicant: any) =>
                applicant.job?.title === job.title || applicant.appliedPosition === job.title
            );
            const interviewed = related.filter((applicant: any) =>
              ['completed', 'scored'].includes(applicant.interviewStatus)
            ).length;
            const passed = related.filter(
              (applicant: any) =>
                Number(applicant.interviewScore || 0) >= Number(job.interviewPassingScore || 70)
            ).length;
            return {
              program: job.title,
              quota: related.length,
              tahapBerkas: related.length,
              tahapInterview: interviewed,
              statusLulus: passed,
              statusGagal: Math.max(0, related.length - passed)
            };
          });
        setMatrixData(rows);
      } catch {
        if (!cancelled) setMatrixData([]);
      }
    };
    void loadMatrix();
    return () => {
      cancelled = true;
    };
  }, []);

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
    void saveMasterRecord('company', 'matrix', next);

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
      m.tahapInterview,
      m.statusLulus,
      m.statusGagal
    ]);

    const csvContent = [
      `# MATRIKS SEBARAN PESERTA - ${selectedPt.name}`,
      headers.join(','),
      ...rows.map((e) => e.join(','))
    ].join('\r\n');

    downloadCsvFile(csvContent, `Matriks_Peserta_${selectedPt.name.replace(/\s+/g, '_')}.csv`);

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
                <TableHead className="text-center">LIVE INTERVIEW</TableHead>
                <TableHead className="text-center">STATUS LULUS</TableHead>
                <TableHead className="text-center">STATUS GAGAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrixData.length === 0 && (
                <TableRow>
                  <TableCell className="text-center text-xs text-slate-400 py-8" colSpan={7}>
                    Belum ada program aktif dengan data peserta.
                  </TableCell>
                </TableRow>
              )}
              {matrixData.map((m, idx) => (
                <TableRow key={idx} className="hover:bg-slate-50/50">
                  <TableCell className="font-sans font-bold text-ink text-xs">{m.program}</TableCell>
                  <TableCell className="font-mono text-center text-slate-700 text-xs">{m.quota}</TableCell>
                  <TableCell className="font-mono text-center text-slate-700 text-xs">{m.tahapBerkas}</TableCell>
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

      {/* ─── Template Laporan Dinamis per Tenant (LHA) ─── */}
      <form
        onSubmit={handleSaveReportTemplate}
        className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-heading font-bold text-sm text-ink flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-navy" />
              Template Laporan Dinamis (LHA) —{' '}
              <span className="text-primary-navy">{selectedPt.name}</span>
            </h3>
            <p className="text-xs text-muted-slate mt-0.5">
              Unggah kop/file template resmi atau atur judul, penandatangan, dan seksi PDF LHA khusus tenant ini.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleDownloadPreviewPdf()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-primary-navy cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Contoh PDF</span>
            </button>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-primary-navy" />
              <span>{tplUploading ? 'Mengunggah...' : 'Upload Template (PDF/DOCX/PNG)'}</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                disabled={tplUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUploadTemplateFile(file);
                  event.target.value = '';
                }}
              />
            </label>
          </div>
        </div>

        {reportTpl.templateFileUrl && (
          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-primary-navy shrink-0" />
              <span className="text-slate-600">File Template Aktif:</span>
              <a
                href={reportTpl.templateFileUrl}
                target="_blank"
                rel="noreferrer"
                download={reportTpl.templateFileName || undefined}
                className="font-bold text-primary-navy hover:underline truncate"
              >
                {reportTpl.templateFileName || 'Download Template'}
              </a>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={reportTpl.templateFileUrl}
                download={reportTpl.templateFileName || true}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-primary-navy font-semibold hover:bg-blue-50"
              >
                <Download className="w-3 h-3" />
                <span>Download</span>
              </a>
              <button
                type="button"
                onClick={() =>
                  setReportTpl((prev) => ({ ...prev, templateFileUrl: null, templateFileName: null }))
                }
                className="text-rose-600 hover:text-rose-700 cursor-pointer p-1"
                title="Hapus file template"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Judul Utama Laporan LHA</label>
            <input
              type="text"
              value={reportTpl.headerTitle}
              onChange={(e) => setReportTpl({ ...reportTpl, headerTitle: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-primary-navy"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Header / Title PDF</label>
            <input
              type="text"
              value={reportTpl.pdfTitle}
              onChange={(e) => setReportTpl({ ...reportTpl, pdfTitle: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-primary-navy"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Footer Resmi PDF</label>
            <input
              type="text"
              value={reportTpl.footerText}
              onChange={(e) => setReportTpl({ ...reportTpl, footerText: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-primary-navy"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Penandatangan (Opsional)</label>
            <input
              type="text"
              value={reportTpl.signatoryName}
              onChange={(e) => setReportTpl({ ...reportTpl, signatoryName: e.target.value })}
              placeholder="Contoh: Dr. Ir. Dwi Hartanto"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-primary-navy"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Jabatan Penandatangan</label>
            <input
              type="text"
              value={reportTpl.signatoryTitle}
              onChange={(e) => setReportTpl({ ...reportTpl, signatoryTitle: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-primary-navy"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Paragraf Pembuka (Opsional)</label>
            <input
              type="text"
              value={reportTpl.introText}
              onChange={(e) => setReportTpl({ ...reportTpl, introText: e.target.value })}
              placeholder="Catatan pengantar khusus PT..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-primary-navy"
            />
          </div>
        </div>

        <div className="text-xs">
          <label className="block font-bold text-slate-700 mb-1">Catatan Penutup Laporan</label>
          <input
            type="text"
            value={reportTpl.closingNote}
            onChange={(e) => setReportTpl({ ...reportTpl, closingNote: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-primary-navy"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
            {[
              { key: 'showCompetencyTable', label: 'Tabel Skor Kompetensi' },
              { key: 'showInterviewScore', label: 'Skor Wawancara' },
              { key: 'showAssessorNotes', label: 'Catatan Asesor' },
              { key: 'showIntegrityHash', label: 'Hash Verifikasi SHA-256' }
            ].map((toggle) => (
              <label key={toggle.key} className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={(reportTpl as any)[toggle.key]}
                  onChange={(e) =>
                    setReportTpl((prev) => ({ ...prev, [toggle.key]: e.target.checked }))
                  }
                  className="rounded border-slate-300 text-primary-navy focus:ring-primary-navy"
                />
                <span>{toggle.label}</span>
              </label>
            ))}
          </div>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={tplSaving}
            isLoading={tplSaving}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Simpan Template Laporan
          </Button>
        </div>
      </form>

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
