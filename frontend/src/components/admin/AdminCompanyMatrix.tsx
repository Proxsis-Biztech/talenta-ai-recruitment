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
const PROGRAM_LINKS_STORAGE_KEY = 'talenta_company_program_links_v1';

interface AdminCompanyMatrixProps {
  onNavigateToPrograms?: () => void;
  onNavigateToBankSoal?: (programCode?: string, companyName?: string) => void;
  onNavigateToMateri?: (programCode?: string, companyName?: string) => void;
}

interface PtProgramRow {
  key: string;
  linkKey: string;
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
  isExplicitLink?: boolean;
}

export function AdminCompanyMatrix({
  onNavigateToPrograms,
  onNavigateToBankSoal,
  onNavigateToMateri
}: AdminCompanyMatrixProps = {}) {
  const [companies, setCompanies] = useState<CompanyItem[]>(INITIAL_COMPANIES);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [allApplicants, setAllApplicants] = useState<any[]>([]);
  const [allPortalPeserta, setAllPortalPeserta] = useState<any[]>([]);
  const [billingTenants, setBillingTenants] = useState<Array<{ id: string; code: string; name: string; usedQuota?: number; availableQuota?: number }>>([]);
  const [detailPt, setDetailPt] = useState<CompanyItem | null>(null);
  const [editingPt, setEditingPt] = useState<CompanyItem | null>(null);
  const [editPtName, setEditPtName] = useState('');
  const [editPtIndustry, setEditPtIndustry] = useState('');
  const [editPtPic, setEditPtPic] = useState('');
  const [editPtQuotaMax, setEditPtQuotaMax] = useState(500);
  const [editPtContract, setEditPtContract] = useState('');
  const [hiddenCatalogCodes, setHiddenCatalogCodes] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_CATALOG_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map((s) => String(s).toUpperCase()) : [];
    } catch {
      return [];
    }
  });
  const [programLinks, setProgramLinks] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem(PROGRAM_LINKS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const normalized: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (Array.isArray(v)) {
            normalized[k] = v.map((item) => String(item).toUpperCase());
          }
        }
        return normalized;
      }
      return {};
    } catch {
      return {};
    }
  });

  // Inline program picker state inside Detail PT modal (assigns from Program Asesmen list)
  const [isAddProgramOpen, setIsAddProgramOpen] = useState(false);
  const [programPickerSearch, setProgramPickerSearch] = useState('');
  const [selectedProgramKeysToAdd, setSelectedProgramKeysToAdd] = useState<string[]>([]);
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
        if (data.programLinks && typeof data.programLinks === 'object' && !Array.isArray(data.programLinks)) {
          const normalizedLinks: Record<string, string[]> = {};
          for (const [k, v] of Object.entries(data.programLinks)) {
            if (Array.isArray(v)) {
              normalizedLinks[k] = Array.from(new Set(v.map((item) => String(item).toUpperCase())));
            }
          }
          setProgramLinks(normalizedLinks);
          try {
            localStorage.setItem(PROGRAM_LINKS_STORAGE_KEY, JSON.stringify(normalizedLinks));
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
      const [jobsResponse, applicantsResponse, portalUsersResponse, billingResponse] = await Promise.all([
        axios.get('/api/admin/jobs', { params: { limit: 200 }, headers }),
        axios.get('/api/admin/applicants', { params: { limit: 500 }, headers }),
        axios.get('/api/admin/portal-users', { params: { role: 'peserta' }, headers }).catch(() => ({ data: { data: [] } })),
        axios.get('/api/admin/billing/overview', { headers }).catch(() => ({ data: { data: null } }))
      ]);
      setAllJobs(Array.isArray(jobsResponse.data?.data) ? jobsResponse.data.data : []);
      setAllApplicants(Array.isArray(applicantsResponse.data?.data) ? applicantsResponse.data.data : []);
      setAllPortalPeserta(Array.isArray(portalUsersResponse.data?.data) ? portalUsersResponse.data.data : []);
      const bData = billingResponse.data?.data;
      if (bData) {
        const list = Array.isArray(bData.allTenants) ? [...bData.allTenants] : [];
        if (bData.activeTenant && !list.some((t: any) => t.id === bData.activeTenant.id)) {
          list.push(bData.activeTenant);
        }
        setBillingTenants(list);
      }
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
        const [jobsResponse, applicantsResponse, portalUsersResponse, billingResponse] = await Promise.all([
          axios.get('/api/admin/jobs', { params: { limit: 200 }, headers }),
          axios.get('/api/admin/applicants', { params: { limit: 500 }, headers }),
          axios.get('/api/admin/portal-users', { params: { role: 'peserta' }, headers }).catch(() => ({ data: { data: [] } })),
          axios.get('/api/admin/billing/overview', { headers }).catch(() => ({ data: { data: null } }))
        ]);
        if (cancelled) return;
        setAllJobs(Array.isArray(jobsResponse.data?.data) ? jobsResponse.data.data : []);
        setAllApplicants(Array.isArray(applicantsResponse.data?.data) ? applicantsResponse.data.data : []);
        setAllPortalPeserta(Array.isArray(portalUsersResponse.data?.data) ? portalUsersResponse.data.data : []);
        const bData = billingResponse.data?.data;
        if (bData) {
          const list = Array.isArray(bData.allTenants) ? [...bData.allTenants] : [];
          if (bData.activeTenant && !list.some((t: any) => t.id === bData.activeTenant.id)) {
            list.push(bData.activeTenant);
          }
          setBillingTenants(list);
        }
      } catch {
        if (!cancelled) {
          setAllJobs([]);
          setAllApplicants([]);
          setAllPortalPeserta([]);
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

  const persistProgramLinks = (nextLinks: Record<string, string[]>) => {
    setProgramLinks(nextLinks);
    try {
      localStorage.setItem(PROGRAM_LINKS_STORAGE_KEY, JSON.stringify(nextLinks));
    } catch {
      // ignore storage quota errors
    }
    void saveMasterRecord('company', 'programLinks', nextLinks);
  };

  const resetDetailProgramForms = () => {
    setIsAddProgramOpen(false);
    setProgramPickerSearch('');
    setSelectedProgramKeysToAdd([]);
    setProgFormError(null);
    setConfirmDeleteKey(null);
    setPtModalNotice(null);
  };

  const parseCodeList = (rawIds: unknown, fallbackId?: unknown): string[] => {
    const codes = new Set<string>();
    const add = (val: unknown) => {
      const clean = String(val || '').trim().toUpperCase();
      if (clean && clean !== '-') codes.add(clean);
    };
    if (fallbackId) add(fallbackId);
    if (Array.isArray(rawIds)) {
      rawIds.forEach(add);
    } else if (typeof rawIds === 'string' && rawIds.trim()) {
      try {
        const parsed = JSON.parse(rawIds);
        if (Array.isArray(parsed)) parsed.forEach(add);
        else add(rawIds);
      } catch {
        rawIds.split(',').forEach(add);
      }
    }
    return Array.from(codes);
  };

  const applicantMatchesProgram = (applicant: any, jobCode: string, jobTitle: string, jobId?: string): boolean => {
    const codeUpper = String(jobCode || '').trim().toUpperCase();
    const titleLower = String(jobTitle || '').trim().toLowerCase();
    if (jobId && applicant.jobId === jobId) return true;
    if (titleLower && (String(applicant.job?.title || '').toLowerCase() === titleLower || String(applicant.appliedPosition || '').toLowerCase() === titleLower)) {
      return true;
    }
    if (codeUpper && codeUpper !== '-') {
      const appCodes = parseCodeList(
        applicant.portalAssessmentIds,
        applicant.portalAssessmentId || applicant.job?.code || applicant.examAttempt?.programCode
      );
      if (appCodes.includes(codeUpper)) return true;
    }
    return false;
  };

  const buildJobRow = (job: any, isExplicitLink = false): PtProgramRow => {
    const code = String(job.code || '').toUpperCase();
    const linkKey = String(job.code || job.id || job.title || '').trim().toUpperCase();
    const relatedApplicants = allApplicants.filter((applicant: any) =>
      applicantMatchesProgram(applicant, code, job.title, job.id)
    );
    const cat = catalogPrograms.find(
      (p) => (code && p.id.toUpperCase() === code) || p.title.toLowerCase() === String(job.title || '').toLowerCase()
    );
    return {
      key: String(job.id || linkKey),
      linkKey,
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
      source: 'server',
      isExplicitLink
    };
  };

  const buildCatalogRow = (prog: AssessmentProgram, isExplicitLink = false): PtProgramRow => {
    const linkKey = prog.id.toUpperCase();
    const relatedApplicants = allApplicants.filter((applicant: any) =>
      applicantMatchesProgram(applicant, prog.id, prog.title)
    );
    return {
      key: `catalog:${linkKey}`,
      linkKey,
      code: prog.id,
      title: prog.title,
      category: prog.category,
      gradeLevel: prog.gradeLevel,
      durationMinutes: prog.durationMinutes,
      passingScore: prog.passingScore,
      totalQuestions: prog.totalQuestions,
      applicantCount: relatedApplicants.length,
      status: 'Katalog Program',
      source: 'catalog',
      isExplicitLink
    };
  };

  const availableProgramsList = useMemo<PtProgramRow[]>(() => {
    const byKey = new Map<string, PtProgramRow>();
    for (const job of allJobs) {
      const row = buildJobRow(job);
      if (!byKey.has(row.linkKey)) {
        byKey.set(row.linkKey, row);
      }
    }
    for (const prog of catalogPrograms) {
      const row = buildCatalogRow(prog);
      if (!byKey.has(row.linkKey)) {
        byKey.set(row.linkKey, row);
      }
    }
    return Array.from(byKey.values());
  }, [allJobs, allApplicants, catalogPrograms]);

  const handleAssignProgramsToPt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailPt) return;
    if (selectedProgramKeysToAdd.length === 0) {
      setProgFormError('Pilih minimal satu program dari daftar Program Asesmen terlebih dahulu.');
      return;
    }

    const currentLinks = programLinks[detailPt.id] || [];
    const nextCompanyLinks = Array.from(new Set([...currentLinks, ...selectedProgramKeysToAdd]));
    persistProgramLinks({
      ...programLinks,
      [detailPt.id]: nextCompanyLinks
    });

    // If any selected catalog program was previously hidden, unhide it
    const toUnhide = selectedProgramKeysToAdd.filter((k) => hiddenCatalogCodes.includes(k));
    if (toUnhide.length > 0) {
      persistHiddenCatalogCodes(hiddenCatalogCodes.filter((c) => !toUnhide.includes(c)));
    }

    const addedCount = selectedProgramKeysToAdd.length;
    setIsAddProgramOpen(false);
    setProgramPickerSearch('');
    setSelectedProgramKeysToAdd([]);
    setProgFormError(null);
    setPtModalNotice({
      type: 'success',
      text: `${addedCount} program asesmen berhasil ditambahkan ke ${detailPt.name}.`
    });
    showToast(`${addedCount} program asesmen ditambahkan untuk ${detailPt.name}.`);
  };

  const handleDeleteProgramFromPt = async (prog: PtProgramRow) => {
    if (!detailPt) return;
    setDeletingKey(prog.key);
    setPtModalNotice(null);

    try {
      const companyLinkedKeys = programLinks[detailPt.id] || [];
      const isLinkedHere = companyLinkedKeys.includes(prog.linkKey);

      if (isLinkedHere) {
        const remaining = companyLinkedKeys.filter((k) => k !== prog.linkKey);
        persistProgramLinks({
          ...programLinks,
          [detailPt.id]: remaining
        });
      }

      // Only delete the master server Job if it wasn't solely cross-linked from the global Program Asesmen list
      const jobRecord = prog.jobId ? allJobs.find((j) => j.id === prog.jobId) : undefined;
      const jobCompany = jobRecord
        ? jobRecord.companyName ||
          jobRecord.tenant?.name ||
          String(jobRecord.title || '').match(/\(([^)]+)\)\s*$/)?.[1] ||
          ''
        : '';
      const matchesThisCompanyDirectly =
        Boolean(jobRecord) &&
        (companyMatchesName(detailPt.name, jobCompany) || companyMatchesName(detailPt.name, jobRecord.title || ''));

      if (prog.source === 'server' && prog.jobId && (!isLinkedHere || matchesThisCompanyDirectly)) {
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
    const linkedKeys = programLinks[company.id] || [];

    for (const job of allJobs) {
      const parentheticalPt = String(job.title || '').match(/\(([^)]+)\)\s*$/)?.[1] || '';
      const jobCompany = job.companyName || job.tenant?.name || parentheticalPt || '';
      const matchesDirectly =
        companyMatchesName(company.name, jobCompany) || companyMatchesName(company.name, job.title || '');
      const row = buildJobRow(job, linkedKeys.includes(String(job.code || job.id || '').trim().toUpperCase()));
      if (!matchesDirectly && !linkedKeys.includes(row.linkKey)) {
        continue;
      }
      byKey.set(row.linkKey, row);
    }

    for (const prog of catalogPrograms) {
      const key = prog.id.toUpperCase();
      const isLinked = linkedKeys.includes(key);
      if (!companyMatchesName(company.name, prog.companyName) && !isLinked) continue;
      if (hiddenCatalogCodes.includes(key) && !isLinked) continue;
      if (byKey.has(key)) continue;
      byKey.set(key, buildCatalogRow(prog, isLinked));
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
        const related = allApplicants.filter((applicant: any) =>
          applicantMatchesProgram(applicant, prog.code, prog.title, prog.jobId)
        );
        const interviewed = related.filter((applicant: any) =>
          ['completed', 'scored'].includes(applicant.interviewStatus) ||
          ['submitted', 'graded'].includes(applicant.examAttempt?.status)
        ).length;
        const passed = related.filter(
          (applicant: any) =>
            Number(applicant.interviewScore ?? applicant.examAttempt?.score ?? 0) >= prog.passingScore &&
            (applicant.interviewScore != null || applicant.examAttempt?.score != null)
        ).length;
        return {
          program: `${prog.code !== '-' ? `[${prog.code}] ` : ''}${prog.title}`,
          quota: related.length,
          tahapBerkas: related.length,
          tahapInterview: interviewed,
          statusLulus: passed,
          statusGagal: Math.max(0, related.filter((a: any) => a.interviewScore != null || a.examAttempt?.score != null).length - passed)
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
  }, [selectedPtId, companies, allJobs, allApplicants, catalogPrograms, programLinks, hiddenCatalogCodes]);

  const companyStatsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        programCount: number;
        liveParticipants: number;
        completedAssessments: number;
        billingUsed: number;
        effectiveUsed: number;
        pct: number;
        pctLabel: string;
        barWidth: number;
      }
    >();

    for (const c of companies) {
      const matchedPrograms = getProgramsForCompany(c);
      const programCodesSet = new Set(
        matchedPrograms.map((p) => String(p.code || '').trim().toUpperCase()).filter((v) => v && v !== '-')
      );
      const programTitlesSet = new Set(
        matchedPrograms.map((p) => String(p.title || '').trim().toLowerCase()).filter(Boolean)
      );

      const seenKeys = new Set<string>();
      const completedKeys = new Set<string>();

      const recordParticipant = (key: string, completed: boolean) => {
        if (!key) return;
        seenKeys.add(key);
        if (completed) completedKeys.add(key);
      };

      for (const pu of allPortalPeserta) {
        const key = String(pu.email || pu.id || '').toLowerCase().trim();
        const codes = parseCodeList(pu.assessmentIds, pu.assessmentId);
        const matchesCompany =
          (pu.companyId && String(pu.companyId).toUpperCase() === c.id.toUpperCase()) ||
          companyMatchesName(c.name, pu.companyName);
        const matchesProg =
          codes.some((code) => programCodesSet.has(code)) ||
          (pu.assessmentTitle && programTitlesSet.has(String(pu.assessmentTitle).toLowerCase()));
        if (matchesCompany || matchesProg) {
          const isDone = ['completed', 'scored'].includes(String(pu.interviewStatus || '').toLowerCase()) || pu.interviewScore != null;
          recordParticipant(key, isDone);
        }
      }

      for (const app of allApplicants) {
        const key = String(app.email || app.id || '').toLowerCase().trim();
        const codes = parseCodeList(
          app.portalAssessmentIds,
          app.portalAssessmentId || app.job?.code || app.examAttempt?.programCode
        );
        const matchesCompany =
          (app.portalCompanyId && String(app.portalCompanyId).toUpperCase() === c.id.toUpperCase()) ||
          companyMatchesName(c.name, app.portalCompanyName) ||
          companyMatchesName(c.name, app.job?.title?.match(/\(([^)]+)\)\s*$/)?.[1]);
        const matchesProg =
          codes.some((code) => programCodesSet.has(code)) ||
          (app.job?.title && programTitlesSet.has(String(app.job.title).toLowerCase())) ||
          (app.appliedPosition && programTitlesSet.has(String(app.appliedPosition).toLowerCase()));
        if (matchesCompany || matchesProg) {
          const isDone =
            ['completed', 'scored'].includes(String(app.interviewStatus || '').toLowerCase()) ||
            ['submitted', 'graded'].includes(String(app.examAttempt?.status || '').toLowerCase()) ||
            app.lhaStatus === 'signed';
          recordParticipant(key, isDone);
        }
      }

      const matchedBilling = billingTenants.find(
        (bt) =>
          companyMatchesName(c.name, bt.name) ||
          String(bt.code || '').toUpperCase() === c.id.toUpperCase()
      );
      const billingUsed = Number(matchedBilling?.usedQuota || 0);
      const liveParticipants = seenKeys.size;
      const liveUsed = Math.max(liveParticipants, billingUsed);
      const effectiveUsed = Math.max(Number(c.quotaUsed || 0), liveUsed);
      const quotaMax = Math.max(1, Number(c.quotaMax || 500));
      const rawPct = (effectiveUsed / quotaMax) * 100;
      const pct = Math.min(100, Math.round(rawPct));
      const pctLabel = effectiveUsed > 0 && rawPct < 1 ? '<1%' : `${pct}%`;
      const barWidth = effectiveUsed > 0 ? Math.max(2, Math.min(100, rawPct)) : 0;

      map.set(c.id, {
        programCount: matchedPrograms.length,
        liveParticipants,
        completedAssessments: completedKeys.size,
        billingUsed,
        effectiveUsed,
        pct,
        pctLabel,
        barWidth
      });
    }

    return map;
  }, [companies, allPortalPeserta, allApplicants, billingTenants, allJobs, catalogPrograms, programLinks, hiddenCatalogCodes]);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ptName.trim()) return;

    const maxNum = companies.reduce((max, item) => {
      const m = item.id.match(/PT-(\d+)/i);
      return m ? Math.max(max, Number(m[1])) : max;
    }, companies.length);
    const nextCode = `PT-${String(maxNum + 1).padStart(2, '0')}`;

    const newCompany: CompanyItem = {
      id: nextCode,
      name: ptName.trim(),
      industry: ptIndustry.trim() || 'Korporasi & Institusi',
      pic: ptPic.trim() || 'HR Business Partner',
      quotaMax: Number(ptQuota) || 500,
      quotaUsed: 0,
      contractPeriod: ptContract || '2026 - 2027',
      activeProgramsCount: 0
    };

    const next = [...companies, newCompany];
    setCompanies(next);
    setSelectedPtId(newCompany.id);
    void saveMasterRecord('company', 'matrix', next);

    const token = localStorage.getItem('adminToken');
    if (token) {
      await axios
        .post(
          '/api/admin/tenants',
          { name: newCompany.name, code: newCompany.id, industry: newCompany.industry },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        .catch(() => undefined);
    }

    setIsAddModalOpen(false);
    setPtName('');
    setPtIndustry('');
    setPtPic('');
    showToast(`PT Mitra "${newCompany.name}" berhasil didaftarkan & disinkronkan ke tenant!`);
  };

  const openEditCompanyModal = (company: CompanyItem) => {
    setEditingPt(company);
    setEditPtName(company.name);
    setEditPtIndustry(company.industry);
    setEditPtPic(company.pic);
    setEditPtQuotaMax(company.quotaMax || 500);
    setEditPtContract(company.contractPeriod || 'Jan 2026 - Des 2026');
  };

  const handleSaveEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPt || !editPtName.trim()) return;
    const next = companies.map((item) =>
      item.id === editingPt.id
        ? {
            ...item,
            name: editPtName.trim(),
            industry: editPtIndustry.trim() || item.industry,
            pic: editPtPic.trim() || item.pic,
            quotaMax: Math.max(1, Number(editPtQuotaMax) || 500),
            contractPeriod: editPtContract.trim() || item.contractPeriod
          }
        : item
    );
    setCompanies(next);
    const updatedItem = next.find((item) => item.id === editingPt.id) || null;
    if (detailPt?.id === editingPt.id && updatedItem) setDetailPt(updatedItem);
    void saveMasterRecord('company', 'matrix', next);

    const token = localStorage.getItem('adminToken');
    if (token && updatedItem) {
      await axios
        .post(
          '/api/admin/tenants',
          { name: updatedItem.name, code: updatedItem.id, industry: updatedItem.industry },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        .catch(() => undefined);
    }
    setEditingPt(null);
    showToast(`Data & kuota ${editPtName.trim()} berhasil diperbarui.`);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#E0F2FE] text-[#075985]">
              {companies.length} Institusi Mitra Aktif
            </span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-[#0F172A] tracking-tight mt-1.5">
            Perusahaan (PT) &amp; Kuota Asesmen
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Daftar tenant multi-perusahaan, alokasi kuota lisensi, dan matriks sebaran kelulusan per tahapan.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          className="h-10 px-4 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white shrink-0 min-w-fit whitespace-nowrap"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Tambah PT Mitra
        </Button>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ─── PT Grid: Clickable Card per PT ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {companies.map((c) => {
          const stats = companyStatsMap.get(c.id) || {
            programCount: getProgramsForCompany(c).length,
            liveParticipants: 0,
            completedAssessments: 0,
            billingUsed: 0,
            effectiveUsed: c.quotaUsed || 0,
            pct: Math.min(100, Math.round(((c.quotaUsed || 0) / (c.quotaMax || 1)) * 100)),
            pctLabel: `${Math.min(100, Math.round(((c.quotaUsed || 0) / (c.quotaMax || 1)) * 100))}%`,
            barWidth: Math.min(100, Math.round(((c.quotaUsed || 0) / (c.quotaMax || 1)) * 100))
          };
          const programCount = stats.programCount;

          return (
            <div
              key={c.id}
              onClick={() => {
                resetDetailProgramForms();
                setSelectedPtId(c.id);
                setDetailPt(c);
              }}
              className="group rounded-xl border border-[#E2E8F0] bg-white p-6 transition-colors flex flex-col justify-between gap-4 hover:border-[#2563EB] shadow-[0_1px_3px_rgba(15,23,42,0.08)] cursor-pointer"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#EEF2FF] text-[#1E3A8A]">
                    <Building2 className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold bg-[#F1F5F9] text-[#475569]">
                      {c.id}
                    </span>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#F1F5F9] text-[#475569]">
                      {programCount} Program
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-heading font-semibold text-base text-[#0F172A] leading-snug truncate" title={c.name}>
                    {c.name}
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5 truncate">{c.industry}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E2E8F0]">
                  <div className="min-w-0">
                    <span className="text-xs text-[#64748B] block">PIC Resmi</span>
                    <span className="text-sm font-medium text-[#0F172A] block truncate mt-0.5" title={c.pic}>
                      {c.pic}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-[#64748B] block">Kontrak</span>
                    <span className="text-sm font-mono font-medium text-[#0F172A] block truncate mt-0.5">
                      {c.contractPeriod}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748B]">Kuota Asesmen</span>
                    <span className="font-mono font-semibold text-[#0F172A] tabular-nums">
                      {stats.effectiveUsed} / {c.quotaMax} ({stats.pctLabel})
                    </span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${stats.pct >= 90 ? 'bg-[#DC2626]' : 'bg-[#2563EB]'}`}
                      style={{ width: `${stats.barWidth}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-0.5">
                    <span>{stats.liveParticipants} peserta terdaftar</span>
                    <span className="font-mono">{stats.completedAssessments} selesai</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#E2E8F0]">
                <span className="text-xs text-[#64748B]">
                  {programCount} program asesmen
                </span>
                <span className="text-xs font-semibold text-[#2563EB] group-hover:underline">
                  Lihat detail →
                </span>
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
          const stats = companyStatsMap.get(detailPt.id) || {
            effectiveUsed: detailPt.quotaUsed || 0,
            pctLabel: `${Math.round(((detailPt.quotaUsed || 0) / (detailPt.quotaMax || 1)) * 100)}%`,
            liveParticipants: 0,
            completedAssessments: 0
          };
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
                    {stats.effectiveUsed} / {detailPt.quotaMax} ({stats.pctLabel})
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {stats.liveParticipants} peserta terdaftar • {stats.completedAssessments} selesai
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-soft-blue border border-accent-border flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] text-primary-navy block font-semibold">Total Program Asesmen</span>
                    <span className="font-mono font-extrabold text-primary-navy text-sm block mt-0.5">
                      {programs.length} Program Terdaftar
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="bg-white"
                    onClick={() => openEditCompanyModal(detailPt)}
                  >
                    Edit PT
                  </Button>
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
                        setIsAddProgramOpen((prev) => {
                          const next = !prev;
                          if (next) {
                            void reloadServerCatalog();
                          }
                          return next;
                        });
                        setSelectedProgramKeysToAdd([]);
                        setProgramPickerSearch('');
                        setProgFormError(null);
                      }}
                    >
                      {isAddProgramOpen ? 'Tutup Pilihan' : 'Tambah Program'}
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

                {isAddProgramOpen && (() => {
                  const existingKeys = new Set(programs.map((p) => p.linkKey));
                  const qLower = programPickerSearch.trim().toLowerCase();
                  const filteredOptions = availableProgramsList.filter((item) => {
                    if (!qLower) return true;
                    return (
                      item.title.toLowerCase().includes(qLower) ||
                      item.code.toLowerCase().includes(qLower) ||
                      item.category.toLowerCase().includes(qLower)
                    );
                  });

                  const togglePick = (linkKey: string) => {
                    setProgFormError(null);
                    setSelectedProgramKeysToAdd((prev) =>
                      prev.includes(linkKey) ? prev.filter((k) => k !== linkKey) : [...prev, linkKey]
                    );
                  };

                  return (
                    <form
                      onSubmit={handleAssignProgramsToPt}
                      className="p-4 rounded-xl border border-accent-border bg-soft-blue/35 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 pb-2 border-b border-accent-border/60">
                        <div>
                          <h5 className="font-heading font-bold text-xs sm:text-sm text-slate-900">
                            Pilih dari Daftar Program Asesmen — {detailPt.name}
                          </h5>
                          <p className="text-[11px] text-slate-500">
                            Pilih program yang sudah dibuat pada halaman Program Asesmen. Untuk membuat program baru, gunakan halaman Program Asesmen.
                          </p>
                        </div>
                        {onNavigateToPrograms && (
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
                            onClick={() => {
                              setDetailPt(null);
                              resetDetailProgramForms();
                              onNavigateToPrograms();
                            }}
                          >
                            Buat di Program Asesmen
                          </Button>
                        )}
                      </div>

                      {progFormError && (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{progFormError}</span>
                        </div>
                      )}

                      <Input
                        value={programPickerSearch}
                        onChange={(e) => setProgramPickerSearch(e.target.value)}
                        placeholder="Cari kode atau nama program asesmen..."
                        leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
                      />

                      <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                        {filteredOptions.length === 0 ? (
                          <div className="p-4 text-center rounded-lg border border-dashed border-slate-200 bg-white text-[11px] text-slate-500">
                            Tidak ada program asesmen yang cocok dengan pencarian Anda.
                          </div>
                        ) : (
                          filteredOptions.map((item) => {
                            const alreadyAssigned = existingKeys.has(item.linkKey);
                            const checked = selectedProgramKeysToAdd.includes(item.linkKey);
                            return (
                              <label
                                key={item.linkKey}
                                className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border transition-colors ${
                                  alreadyAssigned
                                    ? 'bg-slate-50 border-slate-200 opacity-65 cursor-not-allowed'
                                    : checked
                                    ? 'bg-white border-primary-navy ring-1 ring-primary-navy/20 cursor-pointer'
                                    : 'bg-white border-slate-200 hover:border-primary-navy/40 cursor-pointer'
                                }`}
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    disabled={alreadyAssigned}
                                    checked={alreadyAssigned || checked}
                                    onChange={() => !alreadyAssigned && togglePick(item.linkKey)}
                                    className="mt-0.5 rounded border-slate-300 text-primary-navy focus:ring-primary-navy"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-mono text-[10px] font-bold text-primary-navy bg-soft-blue px-1.5 py-0.5 rounded border border-accent-border">
                                        {item.code}
                                      </span>
                                      <Badge variant={item.status === 'Aktif' ? 'success' : 'teal'} format="soft">
                                        {item.status}
                                      </Badge>
                                      {alreadyAssigned && (
                                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                          Sudah Terdaftar
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-semibold text-xs text-slate-900 mt-1 truncate" title={item.title}>
                                      {item.title}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                      {item.category} • {item.durationMinutes} mnt • Pass {item.passingScore}
                                    </p>
                                  </div>
                                </div>
                              </label>
                            );
                          })
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] text-slate-600">
                          {selectedProgramKeysToAdd.length > 0
                            ? `${selectedProgramKeysToAdd.length} program dipilih`
                            : 'Centang program yang ingin ditautkan'}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              setIsAddProgramOpen(false);
                              setSelectedProgramKeysToAdd([]);
                              setProgramPickerSearch('');
                              setProgFormError(null);
                            }}
                          >
                            Batal
                          </Button>
                          <Button
                            type="submit"
                            variant="primary"
                            size="xs"
                            disabled={selectedProgramKeysToAdd.length === 0}
                            leftIcon={<Check className="w-3.5 h-3.5" />}
                          >
                            Tambahkan Program ({selectedProgramKeysToAdd.length})
                          </Button>
                        </div>
                      </div>
                    </form>
                  );
                })()}

                {programs.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-500">
                    Belum ada program asesmen yang terhubung ke {detailPt.name}. Klik tombol{' '}
                    <strong className="text-slate-700">+ Tambah Program</strong> di atas untuk memilih dari daftar Program Asesmen.
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
      {/* ─── MODAL EDIT PT MITRA ─── */}
      <Modal
        isOpen={Boolean(editingPt)}
        onClose={() => setEditingPt(null)}
        title={editingPt ? `Edit Data & Kuota — ${editingPt.name}` : 'Edit PT'}
        size="md"
      >
        <form onSubmit={handleSaveEditCompany} className="p-4 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Perusahaan (PT)</label>
            <input
              type="text"
              value={editPtName}
              onChange={(e) => setEditPtName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs outline-none focus:border-primary-navy"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Bidang Industri</label>
            <input
              type="text"
              value={editPtIndustry}
              onChange={(e) => setEditPtIndustry(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs outline-none focus:border-primary-navy"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">PIC Resmi Perusahaan</label>
            <input
              type="text"
              value={editPtPic}
              onChange={(e) => setEditPtPic(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs outline-none focus:border-primary-navy"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Alokasi Kuota Maksimum</label>
              <input
                type="number"
                value={editPtQuotaMax}
                onChange={(e) => setEditPtQuotaMax(Number(e.target.value))}
                min={1}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Periode Kontrak</label>
              <input
                type="text"
                value={editPtContract}
                onChange={(e) => setEditPtContract(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setEditingPt(null)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
