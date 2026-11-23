import React, { useState, useEffect, useMemo } from 'react';
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
  Trash2,
  Eye,
  BookOpen,
  Clock,
  Award,
  AlertCircle,
  X,
  CheckSquare
} from 'lucide-react';
import { loadMasterScope, saveMasterRecord } from '../../services/masterDataService';
import { getAllPrograms, type AssessmentProgram } from '../../services/assessmentCatalog';
import {
  INITIAL_COMPANIES,
  companyMatchesName,
  type CompanyItem
} from '../../services/companyDirectory';
export type { CompanyItem };
import {
  Button,
  Badge,
  Input,
  Select,
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Modal
} from '../ui';

const STORAGE_KEY = 'talenta_companies_matrix_v1';
const HIDDEN_CATALOG_STORAGE_KEY = 'talenta_hidden_catalog_programs_v1';

interface AdminCompanyMatrixProps {
  onNavigateToPrograms?: () => void;
  onNavigateToBankSoal?: (programCode?: string, companyName?: string) => void;
  onNavigateToMateri?: (programCode?: string, companyName?: string) => void;
}

interface PtProgramRow {
  key: string;
  jobId?: string;
  code: string;
  title: string;
  category: string;
  gradeLevel: string;
  durationMinutes: number;
  passingScore: number;
  totalQuestions: number;
  applicantCount: number;
  status: string;
  source: 'server' | 'catalog';
}

export function AdminCompanyMatrix({
  onNavigateToPrograms,
  onNavigateToBankSoal,
  onNavigateToMateri
}: AdminCompanyMatrixProps = {}) {
  const [companies, setCompanies] = useState<CompanyItem[]>(INITIAL_COMPANIES);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [allApplicants, setAllApplicants] = useState<any[]>([]);
  const [detailPt, setDetailPt] = useState<CompanyItem | null>(null);
  const [hiddenCatalogCodes, setHiddenCatalogCodes] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_CATALOG_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map((s) => String(s).toUpperCase()) : [];
    } catch {
      return [];
    }
  });

  // Inline Add/Delete Program Asesmen states inside Detail PT modal
  const [isAddProgramOpen, setIsAddProgramOpen] = useState(false);
  const [progTitle, setProgTitle] = useState('');
  const [progCode, setProgCode] = useState('');
  const [progDescription, setProgDescription] = useState('');
  const [progDuration, setProgDuration] = useState(60);
  const [progPassingScore, setProgPassingScore] = useState(75);
  const [progStatus, setProgStatus] = useState<'active' | 'inactive'>('active');
  const [progStartDate, setProgStartDate] = useState('');
  const [progEndDate, setProgEndDate] = useState('');
  const [progSubmitting, setProgSubmitting] = useState(false);
  const [progFormError, setProgFormError] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [ptModalNotice, setPtModalNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMasterScope<any>('company')
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.matrix) && data.matrix.length > 0) {
          setCompanies(data.matrix);
        } else {
          void saveMasterRecord('company', 'matrix', INITIAL_COMPANIES);
        }
        if (Array.isArray(data.hiddenCatalogPrograms)) {
          const normalized = data.hiddenCatalogPrograms.map((s: unknown) => String(s).toUpperCase());
          setHiddenCatalogCodes(normalized);
          try {
            localStorage.setItem(HIDDEN_CATALOG_STORAGE_KEY, JSON.stringify(normalized));
          } catch {
            // ignore storage errors
          }
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

  const reloadServerCatalog = async () => {
    const token = localStorage.getItem('adminToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    try {
      const [jobsResponse, applicantsResponse] = await Promise.all([
        axios.get('/api/admin/jobs', { params: { limit: 200 }, headers }),
        axios.get('/api/admin/applicants', { params: { limit: 200 }, headers })
      ]);
      setAllJobs(Array.isArray(jobsResponse.data?.data) ? jobsResponse.data.data : []);
      setAllApplicants(Array.isArray(applicantsResponse.data?.data) ? applicantsResponse.data.data : []);
    } catch {
      // keep existing state on transient reload error
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadServerCatalog = async () => {
      const token = localStorage.getItem('adminToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      try {
        const [jobsResponse, applicantsResponse] = await Promise.all([
          axios.get('/api/admin/jobs', { params: { limit: 200 }, headers }),
          axios.get('/api/admin/applicants', { params: { limit: 200 }, headers })
        ]);
        if (cancelled) return;
        setAllJobs(Array.isArray(jobsResponse.data?.data) ? jobsResponse.data.data : []);
        setAllApplicants(Array.isArray(applicantsResponse.data?.data) ? applicantsResponse.data.data : []);
      } catch {
        if (!cancelled) {
          setAllJobs([]);
          setAllApplicants([]);
        }
      }
    };
    void loadServerCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  const catalogPrograms = useMemo<AssessmentProgram[]>(() => getAllPrograms(), []);

  const persistHiddenCatalogCodes = (nextCodes: string[]) => {
    setHiddenCatalogCodes(nextCodes);
    try {
      localStorage.setItem(HIDDEN_CATALOG_STORAGE_KEY, JSON.stringify(nextCodes));
    } catch {
      // ignore storage quota errors
    }
    void saveMasterRecord('company', 'hiddenCatalogPrograms', nextCodes);
  };

  const resetDetailProgramForms = () => {
    setIsAddProgramOpen(false);
    setProgTitle('');
    setProgCode('');
    setProgDescription('');
    setProgDuration(60);
    setProgPassingScore(75);
    setProgStatus('active');
    setProgStartDate('');
    setProgEndDate('');
    setProgFormError(null);
    setConfirmDeleteKey(null);
    setPtModalNotice(null);
  };

  const handleCreateProgramForPt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailPt) return;

    const trimmedTitle = progTitle.trim();
    const trimmedDesc = progDescription.trim();
    const normalizedCode = progCode.trim().toUpperCase();

    if (!trimmedTitle) {
      setProgFormError('Nama program / posisi wajib diisi.');
      return;
    }
    if (!trimmedDesc) {
      setProgFormError('Deskripsi & kualifikasi program wajib diisi.');
      return;
    }
    if (progStartDate && progEndDate && progEndDate < progStartDate) {
      setProgFormError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    const token = localStorage.getItem('adminToken');
    if (!token) {
      setProgFormError('Sesi admin tidak ditemukan. Silakan login ulang.');
      return;
    }

    const finalTitle = companyMatchesName(detailPt.name, trimmedTitle)
      ? trimmedTitle
      : `${trimmedTitle} (${detailPt.name})`;

    setProgSubmitting(true);
    setProgFormError(null);
    try {
      const response = await axios.post(
        '/api/admin/jobs',
        {
          code: normalizedCode || null,
          title: finalTitle,
          description: trimmedDesc,
          status: progStatus,
          interviewDuration: Number(progDuration) || 60,
          interviewPassingScore: Number(progPassingScore) || 75,
          assessmentDate: progStartDate || null,
          assessmentEndDate: progEndDate || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const createdJob = response.data?.data;
      if (createdJob) {
        setAllJobs((prev) => [createdJob, ...prev]);
      }
      if (normalizedCode && hiddenCatalogCodes.includes(normalizedCode)) {
        persistHiddenCatalogCodes(hiddenCatalogCodes.filter((c) => c !== normalizedCode));
      }
      await reloadServerCatalog();

      setIsAddProgramOpen(false);
      setProgTitle('');
      setProgCode('');
      setProgDescription('');
      setProgDuration(60);
      setProgPassingScore(75);
      setProgStatus('active');
      setProgStartDate('');
      setProgEndDate('');
      setPtModalNotice({
        type: 'success',
        text: `Program "${finalTitle}" berhasil ditambahkan ke ${detailPt.name}.`
      });
      showToast(`Program asesmen "${finalTitle}" ditambahkan untuk ${detailPt.name}.`);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error || 'Gagal menambahkan program asesmen.'
        : 'Gagal menambahkan program asesmen.';
      setProgFormError(msg);
    } finally {
      setProgSubmitting(false);
    }
  };

  const handleDeleteProgramFromPt = async (prog: PtProgramRow) => {
    if (!detailPt) return;
    setDeletingKey(prog.key);
    setPtModalNotice(null);

    try {
      if (prog.source === 'server' && prog.jobId) {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          setPtModalNotice({ type: 'error', text: 'Sesi admin tidak ditemukan. Silakan login ulang.' });
          return;
        }
        await axios.delete(`/api/admin/jobs/${encodeURIComponent(prog.jobId)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAllJobs((prev) => prev.filter((job) => job.id !== prog.jobId));
      }

      const codeUpper = String(prog.code || '').toUpperCase();
      if (codeUpper && codeUpper !== '-' && !hiddenCatalogCodes.includes(codeUpper)) {
        const isInCatalog = catalogPrograms.some((p) => p.id.toUpperCase() === codeUpper);
        if (isInCatalog || prog.source === 'catalog') {
          persistHiddenCatalogCodes([...hiddenCatalogCodes, codeUpper]);
        }
      }

      setConfirmDeleteKey(null);
      setPtModalNotice({
        type: 'success',
        text: `Program "${prog.title}" berhasil dihapus dari ${detailPt.name}.`
      });
      showToast(`Program "${prog.title}" dihapus dari ${detailPt.name}.`);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error || 'Gagal menghapus program asesmen.'
        : 'Gagal menghapus program asesmen.';
      setPtModalNotice({ type: 'error', text: msg });
      setConfirmDeleteKey(null);
    } finally {
      setDeletingKey(null);
    }
  };

  const getProgramsForCompany = (company: CompanyItem): PtProgramRow[] => {
    const byKey = new Map<string, PtProgramRow>();

    for (const job of allJobs) {
      const parentheticalPt = String(job.title || '').match(/\(([^)]+)\)\s*$/)?.[1] || '';
      const jobCompany = job.companyName || job.tenant?.name || parentheticalPt || '';
      if (!companyMatchesName(company.name, jobCompany) && !companyMatchesName(company.name, job.title || '')) {
        continue;
      }
      const code = String(job.code || job.id || '').toUpperCase();
      const relatedApplicants = allApplicants.filter(
        (applicant: any) => applicant.jobId === job.id || applicant.job?.title === job.title || applicant.appliedPosition === job.title
      );
      const cat = catalogPrograms.find(
        (p) => p.id.toUpperCase() === code || p.title.toLowerCase() === String(job.title || '').toLowerCase()
      );
      const mapKey = code || String(job.id || job.title).toLowerCase();
      byKey.set(mapKey, {
        key: String(job.id || mapKey),
        jobId: job.id ? String(job.id) : undefined,
        code: job.code || cat?.id || '-',
        title: job.title,
        category: cat?.category || 'Asesmen Korporasi',
        gradeLevel: cat?.gradeLevel || 'Grade B (Specialist / Mid)',
        durationMinutes: Number(job.interviewDuration || cat?.durationMinutes || 60),
        passingScore: Number(job.interviewPassingScore || cat?.passingScore || 75),
        totalQuestions: cat?.totalQuestions || 40,
        applicantCount: relatedApplicants.length,
        status: job.status === 'active' ? 'Aktif' : 'Nonaktif',
        source: 'server'
      });
    }

    for (const prog of catalogPrograms) {
      if (!companyMatchesName(company.name, prog.companyName)) continue;
      const key = prog.id.toUpperCase();
      if (hiddenCatalogCodes.includes(key)) continue;
      if (byKey.has(key)) continue;
      byKey.set(key, {
        key: `catalog:${key}`,
        code: prog.id,
        title: prog.title,
        category: prog.category,
        gradeLevel: prog.gradeLevel,
        durationMinutes: prog.durationMinutes,
        passingScore: prog.passingScore,
        totalQuestions: prog.totalQuestions,
        applicantCount: 0,
        status: 'Katalog Program',
        source: 'catalog'
      });
    }

    return Array.from(byKey.values());
  };

  useEffect(() => {
    if (!selectedPt) {
      setMatrixData([]);
      return;
    }
    const matched = getProgramsForCompany(selectedPt);
    if (matched.length > 0) {
      const rows = matched.map((prog) => {
        const related = allApplicants.filter(
          (applicant: any) =>
            applicant.job?.title === prog.title ||
            applicant.appliedPosition === prog.title ||
            (applicant.job?.code && applicant.job.code === prog.code)
        );
        const interviewed = related.filter((applicant: any) =>
          ['completed', 'scored'].includes(applicant.interviewStatus)
        ).length;
        const passed = related.filter(
          (applicant: any) => Number(applicant.interviewScore || 0) >= prog.passingScore
        ).length;
        return {
          program: `${prog.code !== '-' ? `[${prog.code}] ` : ''}${prog.title}`,
          quota: related.length,
          tahapBerkas: related.length,
          tahapInterview: interviewed,
          statusLulus: passed,
          statusGagal: Math.max(0, related.length - passed)
        };
      });
      setMatrixData(rows);
      return;
    }

    const fallbackRows = allJobs
      .filter((job: any) => job.status === 'active')
      .slice(0, 8)
      .map((job: any) => {
        const related = allApplicants.filter(
          (applicant: any) => applicant.job?.title === job.title || applicant.appliedPosition === job.title
        );
        const interviewed = related.filter((applicant: any) =>
          ['completed', 'scored'].includes(applicant.interviewStatus)
        ).length;
        const passed = related.filter(
          (applicant: any) => Number(applicant.interviewScore || 0) >= Number(job.interviewPassingScore || 70)
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
    setMatrixData(fallbackRows);
  }, [selectedPtId, companies, allJobs, allApplicants, catalogPrograms]);

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

      {/* ─── PT Grid: Card per PT (hover-only border & highlight, no card click) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {companies.map((c) => {
          const pct = Math.min(100, Math.round((c.quotaUsed / (c.quotaMax || 1)) * 100));
          const matchedPrograms = getProgramsForCompany(c);
          const programCount = matchedPrograms.length;

          return (
            <div
              key={c.id}
              className="pt-hover-card group rounded-2xl border border-slate-200 bg-white p-5 transition-all flex flex-col justify-between gap-4 hover:bg-soft-blue/35 hover:border-primary-navy hover:ring-1 hover:ring-primary-navy/25 hover:shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors bg-soft-blue text-primary-navy group-hover:bg-primary-navy group-hover:text-white">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-primary-navy bg-soft-blue px-2 py-0.5 rounded border border-accent-border">
                          {c.id}
                        </span>
                        <Badge variant="teal" format="soft">
                          {programCount} Program
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-heading font-extrabold text-sm sm:text-base text-ink leading-snug">
                    {c.name}
                  </h3>
                  <p className="text-xs text-muted-slate mt-0.5">{c.industry}</p>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">PIC Resmi</span>
                    <span className="font-semibold text-slate-800 text-right truncate">{c.pic}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Kontrak</span>
                    <span className="font-mono text-[11px] font-semibold text-slate-700">{c.contractPeriod}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Kuota Asesmen</span>
                    <span>
                      <strong className="font-mono text-primary-navy">{c.quotaUsed}</strong>
                      <span className="text-slate-400">
                        {' '}/ {c.quotaMax} ({pct}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div
                      className={`h-full rounded-full ${pct > 80 ? 'bg-warning-amber' : 'bg-primary-navy'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-primary-navy" />
                  <span>{programCount} program asesmen</span>
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  className="pt-detail-btn cursor-pointer text-slate-700 border-slate-300 transition-colors group-hover:bg-primary-navy group-hover:text-white group-hover:border-primary-navy hover:bg-navy-dark hover:text-white hover:border-navy-dark"
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                  onClick={() => {
                    resetDetailProgramForms();
                    setSelectedPtId(c.id);
                    setDetailPt(c);
                  }}
                >
                  Detail
                </Button>
              </div>
            </div>
          );
        })}
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

      {/* Modal: Detail Perusahaan (PT) & Program Asesmen */}
      <Modal
        isOpen={Boolean(detailPt)}
        onClose={() => {
          setDetailPt(null);
          resetDetailProgramForms();
        }}
        title={detailPt ? `Detail Perusahaan — ${detailPt.name}` : 'Detail Perusahaan (PT)'}
        description={detailPt ? `${detailPt.industry} • PIC: ${detailPt.pic}` : undefined}
        size="2xl"
      >
        {detailPt && (() => {
          const programs = getProgramsForCompany(detailPt);
          const pct = Math.round((detailPt.quotaUsed / detailPt.quotaMax) * 100);
          return (
            <div className="p-2 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Kode &amp; Kontrak</span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">
                    {detailPt.id} • {detailPt.contractPeriod}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Kuota Terpakai</span>
                  <span className="font-mono font-bold text-primary-navy block mt-0.5">
                    {detailPt.quotaUsed} / {detailPt.quotaMax} ({pct}%)
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-soft-blue border border-accent-border">
                  <span className="text-[11px] text-primary-navy block font-semibold">Total Program Asesmen</span>
                  <span className="font-mono font-extrabold text-primary-navy text-sm block mt-0.5">
                    {programs.length} Program Terdaftar
                  </span>
                </div>
              </div>

              {ptModalNotice && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                    ptModalNotice.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {ptModalNotice.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span className="font-medium">{ptModalNotice.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPtModalNotice(null)}
                    className="p-1 rounded hover:bg-black/5 cursor-pointer shrink-0"
                    aria-label="Tutup notifikasi"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-heading font-bold text-sm text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary-navy" />
                    <span>Daftar Program Asesmen pada {detailPt.name}</span>
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant={isAddProgramOpen ? 'outline' : 'primary'}
                      size="xs"
                      leftIcon={isAddProgramOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setIsAddProgramOpen((prev) => !prev);
                        setProgFormError(null);
                      }}
                    >
                      {isAddProgramOpen ? 'Tutup Form' : 'Tambah Program'}
                    </Button>
                    {onNavigateToBankSoal && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          const firstCode = programs[0]?.code;
                          const companyName = detailPt.name;
                          setDetailPt(null);
                          resetDetailProgramForms();
                          onNavigateToBankSoal(firstCode !== '-' ? firstCode : undefined, companyName);
                        }}
                      >
                        Buka Bank Soal
                      </Button>
                    )}
                    {onNavigateToPrograms && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setDetailPt(null);
                          resetDetailProgramForms();
                          onNavigateToPrograms();
                        }}
                      >
                        Kelola Program Asesmen
                      </Button>
                    )}
                  </div>
                </div>

                {isAddProgramOpen && (
                  <form
                    onSubmit={handleCreateProgramForPt}
                    className="p-4 rounded-xl border border-accent-border bg-soft-blue/35 space-y-3.5"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-accent-border/60">
                      <div>
                        <h5 className="font-heading font-bold text-xs sm:text-sm text-slate-900">
                          Tambah Program Asesmen Baru — {detailPt.name}
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          Program otomatis terhubung ke {detailPt.name} dan siap digunakan di Bank Soal CAT serta daftar program aktif.
                        </p>
                      </div>
                    </div>

                    {progFormError && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{progFormError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <Input
                          label="Nama Program / Posisi *"
                          value={progTitle}
                          onChange={(e) => setProgTitle(e.target.value)}
                          placeholder="Contoh: Management Trainee Operational"
                          required
                        />
                      </div>
                      <div>
                        <Input
                          label="Kode Program"
                          value={progCode}
                          onChange={(e) => setProgCode(e.target.value.toUpperCase())}
                          placeholder="Contoh: PT02-MT-01"
                          isMonospace
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Input
                          label="Durasi CAT/Interview (menit)"
                          type="number"
                          min={1}
                          max={180}
                          value={progDuration}
                          onChange={(e) => setProgDuration(Number(e.target.value))}
                          isMonospace
                        />
                      </div>
                      <div>
                        <Input
                          label="Passing Grade (0–100)"
                          type="number"
                          min={0}
                          max={100}
                          value={progPassingScore}
                          onChange={(e) => setProgPassingScore(Number(e.target.value))}
                          isMonospace
                        />
                      </div>
                      <div>
                        <Select
                          label="Status Program"
                          value={progStatus}
                          onChange={(e) => setProgStatus(e.target.value as 'active' | 'inactive')}
                        >
                          <option value="active">Aktif</option>
                          <option value="inactive">Nonaktif</option>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Input
                          label="Tanggal Mulai (opsional)"
                          type="date"
                          value={progStartDate}
                          onChange={(e) => setProgStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Input
                          label="Tanggal Selesai (opsional)"
                          type="date"
                          value={progEndDate}
                          onChange={(e) => setProgEndDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Textarea
                        label="Deskripsi & Kriteria Kualifikasi *"
                        rows={3}
                        value={progDescription}
                        onChange={(e) => setProgDescription(e.target.value)}
                        placeholder={`Jelaskan tujuan asesmen, kompetensi yang diuji, dan kualifikasi peserta untuk ${detailPt.name}...`}
                        required
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setIsAddProgramOpen(false);
                          setProgFormError(null);
                        }}
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="xs"
                        disabled={progSubmitting}
                        leftIcon={<Save className="w-3.5 h-3.5" />}
                      >
                        {progSubmitting ? 'Menyimpan...' : 'Simpan Program'}
                      </Button>
                    </div>
                  </form>
                )}

                {programs.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-500">
                    Belum ada program asesmen yang terhubung ke {detailPt.name}. Klik tombol{' '}
                    <strong className="text-slate-700">+ Tambah Program</strong> di atas untuk menambahkan program baru.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {programs.map((prog) => {
                      const isConfirming = confirmDeleteKey === prog.key;
                      const isDeleting = deletingKey === prog.key;
                      return (
                        <div
                          key={prog.key}
                          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-primary-navy/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-primary-navy bg-soft-blue px-2 py-0.5 rounded border border-accent-border">
                                {prog.code}
                              </span>
                              <Badge variant={prog.status === 'Aktif' ? 'success' : 'teal'} format="soft">
                                {prog.status}
                              </Badge>
                              <span className="text-[11px] text-slate-500 font-medium">{prog.gradeLevel}</span>
                            </div>
                            <p className="font-bold text-sm text-slate-900">{prog.title}</p>
                            <p className="text-[11px] text-slate-500">{prog.category}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <div className="flex flex-wrap items-center gap-4 text-[11px] bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-1.5 text-slate-700">
                                <Clock className="w-3.5 h-3.5 text-primary-navy" />
                                <span className="font-mono font-bold">{prog.durationMinutes} mnt</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-700">
                                <Award className="w-3.5 h-3.5 text-emerald-600" />
                                <span>
                                  Pass <strong className="font-mono">{prog.passingScore}</strong>
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-700">
                                <Users className="w-3.5 h-3.5 text-blue-600" />
                                <span>
                                  <strong className="font-mono">{prog.applicantCount}</strong> Peserta
                                </span>
                              </div>
                            </div>

                            {isConfirming ? (
                              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl">
                                <span className="text-[11px] font-semibold text-rose-700">Hapus?</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="xs"
                                  disabled={isDeleting}
                                  onClick={() => setConfirmDeleteKey(null)}
                                >
                                  Batal
                                </Button>
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="xs"
                                  disabled={isDeleting}
                                  onClick={() => handleDeleteProgramFromPt(prog)}
                                >
                                  {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {onNavigateToMateri && prog.code && prog.code !== '-' && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="xs"
                                    leftIcon={<FileText className="w-3.5 h-3.5 text-primary-navy" />}
                                    onClick={() => {
                                      const ptName = detailPt.name;
                                      setDetailPt(null);
                                      resetDetailProgramForms();
                                      onNavigateToMateri(prog.code, ptName);
                                    }}
                                    title={`Kelola Master Materi untuk ${prog.code}`}
                                  >
                                    Materi
                                  </Button>
                                )}
                                {onNavigateToBankSoal && prog.code && prog.code !== '-' && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="xs"
                                    leftIcon={<CheckSquare className="w-3.5 h-3.5 text-emerald-700" />}
                                    onClick={() => {
                                      const ptName = detailPt.name;
                                      setDetailPt(null);
                                      resetDetailProgramForms();
                                      onNavigateToBankSoal(prog.code, ptName);
                                    }}
                                    title={`Kelola Bank Soal CAT untuk ${prog.code}`}
                                  >
                                    Soal CAT
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="xs"
                                  className="text-rose-600 border-rose-200 hover:bg-rose-600 hover:text-white hover:border-rose-600"
                                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                  onClick={() => setConfirmDeleteKey(prog.key)}
                                  title={
                                    prog.applicantCount > 0
                                      ? 'Program masih memiliki peserta terdaftar'
                                      : `Hapus program ${prog.title}`
                                  }
                                >
                                  Hapus
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDetailPt(null);
                    resetDetailProgramForms();
                  }}
                >
                  Tutup Detail
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
