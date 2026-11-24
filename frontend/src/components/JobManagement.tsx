import React, { useEffect, useState, useCallback, useMemo, useDeferredValue } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  Trash2, Briefcase, Plus, Edit2, AlertCircle, Clock, 
  Target, Search, RefreshCw, Building2,
  BookOpen, Layers, CheckCircle2, Eye, HelpCircle, Check, 
  X, Filter, Award, ShieldCheck, Brain,
  ChevronRight, FileText, Info
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal
} from './ui';
import { 
  DEFAULT_ASSESSMENT_PROGRAMS, 
  findProgramByTitle, 
  buildDefaultBankSoal,
  type AssessmentProgram, 
  type QuestionItem 
} from '../services/assessmentCatalog';
import { 
  INITIAL_MATERI_LIST, 
  type MasterMateriItem 
} from './admin/AdminMasterMateriTree';
import { loadMasterScope } from '../services/masterDataService';
import {
  INITIAL_COMPANIES,
  loadCompanyDirectory,
  companyMatchesName,
  type CompanyItem
} from '../services/companyDirectory';
import { AdminStatCard, AdminEmptyState } from './admin/AdminStatCard';

interface Job {
  id: string;
  code: string | null;
  title: string;
  description: string;
  status: string;
  interviewDuration: number | null;
  interviewPassingScore: number | null;
  assessmentDate: string | null;
  assessmentEndDate: string | null;
  createdAt: string;
}


function getJobScheduleStatus(job: Job): {
  key: 'active' | 'inactive' | 'scheduled' | 'ended';
  label: string;
  variant: 'success' | 'neutral' | 'navy' | 'warning';
} {
  const now = Date.now();
  const start = job.assessmentDate ? new Date(job.assessmentDate).setHours(0, 0, 0, 0) : null;
  const end = job.assessmentEndDate ? new Date(job.assessmentEndDate).setHours(23, 59, 59, 999) : null;
  if (start && now < start) return { key: 'scheduled', label: 'Terjadwal', variant: 'navy' };
  if (end && now > end) return { key: 'ended', label: 'Berakhir', variant: 'warning' };
  if (start || end) return { key: 'active', label: 'Aktif', variant: 'success' };
  return job.status === 'active'
    ? { key: 'active', label: 'Aktif', variant: 'success' }
    : { key: 'inactive', label: 'Nonaktif', variant: 'neutral' };
}

/** Ambil daftar master materi fallback lokal sebelum scope server termuat */
function resolveQuestionMateriAndSyllabus(
  q: QuestionItem,
  materials: MasterMateriItem[],
  programTitle?: string
): { materiLabel: string; silabusLabel: string } {
  const comp = (q.competency || '').toLowerCase();
  const matchedMat =
    materials.find(
      (m) =>
        comp &&
        ((m.title && m.title.toLowerCase().includes(comp)) ||
          (m.category && m.category.toLowerCase().includes(comp)) ||
          (m.subcategory && m.subcategory.toLowerCase().includes(comp)) ||
          (m.content && m.content.toLowerCase().includes(comp)))
    ) ||
    (materials.length > 0 ? materials[(Math.max(1, q.id) - 1) % materials.length] : undefined);

  const rawSyllabus = (matchedMat?.content || '')
    .split(/\n|;/)
    .map((s: string) => s.replace(/^[\d.\-*•\s]+/, '').trim())
    .filter(Boolean);

  return {
    materiLabel: matchedMat?.title || programTitle || 'Materi Program Asesmen',
    silabusLabel:
      rawSyllabus[0] ||
      matchedMat?.subcategory ||
      matchedMat?.category ||
      q.competency ||
      'Silabus Kompetensi Formasi'
  };
}

function getPersistedMasterMateri(): MasterMateriItem[] {
  try {
    const saved = localStorage.getItem('talenta_master_materi_table_v2');
    const parsed = saved ? JSON.parse(saved) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as MasterMateriItem[];
  } catch {
    /* parse error → jatuh ke konstanta bawaan */
  }
  return INITIAL_MATERI_LIST;
}

function questionTypeLabel(t: QuestionItem['type']): string {
  return t === 'single'
    ? 'Pilihan Ganda'
    : t === 'multi'
    ? 'Multi-Select'
    : t === 'short'
    ? 'Isian Singkat'
    : t === 'essay'
    ? 'Studi Kasus / Esai'
    : 'Matching';
}

export default function JobManagement() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>(INITIAL_COMPANIES);
  const [bankSoalQuestions, setBankSoalQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');

  // Add Job Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState<'active' | 'inactive'>('active');
  const [newDuration, setNewDuration] = useState<number | ''>(15);
  const [newPassingScore, setNewPassingScore] = useState<number | ''>(70);
  const [newAssessmentDate, setNewAssessmentDate] = useState('');
  const [newAssessmentEndDate, setNewAssessmentEndDate] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Edit Job Modal State
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editDuration, setEditDuration] = useState<number | ''>('');
  const [editPassingScore, setEditPassingScore] = useState<number | ''>('');
  const [editAssessmentDate, setEditAssessmentDate] = useState('');
  const [editAssessmentEndDate, setEditAssessmentEndDate] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Details Modal State (Soal, Materi, Rubrik)
  type DetailedQuestion = QuestionItem & { category?: 'psikotes' | 'kompetensi' };
  const [selectedJobDetail, setSelectedJobDetail] = useState<{
    job: Job;
    program: Omit<AssessmentProgram, 'questions'> & { questions: DetailedQuestion[] };
    materials: MasterMateriItem[];
  } | null>(null);
  const [detailTab, setDetailTab] = useState<'soal' | 'materi' | 'rubrik'>('soal');
  const [detailQuestionCategory, setDetailQuestionCategory] = useState<'psikotes' | 'kompetensi'>('psikotes');
  const [serverMateri, setServerMateri] = useState<MasterMateriItem[] | null>(null);
  const [qSearch, setQSearch] = useState('');
  const [qTypeFilter, setQTypeFilter] = useState('ALL');
  const [qDiffFilter, setQDiffFilter] = useState('ALL');

  const getBankQuestionCountForJob = useCallback((job: Job) => {
    const program = findProgramByTitle(job.title, job.id);
    const programCode = (job.code || program.id).toUpperCase();
    const count = bankSoalQuestions.filter(
      (question) => (question.programCode || 'SE-402').toUpperCase() === programCode
    ).length;
    if (count > 0 || job.code) return count;
    return program.questions?.length || 0;
  }, [bankSoalQuestions]);

  const getMaterialsForJob = useCallback((job: Job, materiPool?: MasterMateriItem[] | null): MasterMateriItem[] => {
    const program = findProgramByTitle(job.title, job.id);
    const programCode = (job.code || program.id).toUpperCase();

    // Ambil langsung dari data menu Materi & Soal (scope 'materi' -> 'table') tanpa dummy data
    const masterList =
      materiPool !== undefined && materiPool !== null
        ? materiPool
        : (serverMateri !== null ? serverMateri : getPersistedMasterMateri());

    return masterList.filter(
      (m) => String(m.code || '').toUpperCase() === programCode
    );
  }, [serverMateri]);

  useEffect(() => {
    loadMasterScope<any>('bank-soal')
      .then((data) => {
        const defaults = buildDefaultBankSoal();
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          const existingCodes = new Set(data.questions.map((q: any) => q.programCode));
          const missing = defaults.filter((q) => !existingCodes.has(q.programCode));
          setBankSoalQuestions(missing.length > 0 ? [...data.questions, ...missing] : data.questions);
        } else {
          setBankSoalQuestions(defaults);
        }
      })
      .catch(() => {
        setBankSoalQuestions(buildDefaultBankSoal());
      });

    loadMasterScope<MasterMateriItem[]>('materi')
      .then((data) => {
        if (Array.isArray(data?.table)) {
          setServerMateri(data.table);
        }
      })
      .catch(() => undefined);
  }, []);

  const mapBankQuestion = (question: any, index: number): QuestionItem & { category: 'psikotes' | 'kompetensi' } => {
    const typeMap: Record<string, QuestionItem['type']> = {
      'Pilihan Ganda': 'single',
      'Multi-Select': 'multi',
      'Isian Singkat': 'short',
      'Esai': 'essay',
      'Matching': 'matching'
    };
    const pCode = question.programCode || 'CAT';
    const matchingPairs = Array.isArray(question.matchingPairs)
      ? question.matchingPairs.map((pair: any) => ({
          left: pair.left || '',
          rightOptions: Array.isArray(pair.rightOptions) ? pair.rightOptions : [pair.correctRight || pair.right || ''],
          correctRight: pair.correctRight || pair.right || ''
        }))
      : [];
    return {
      id: index + 1,
      questionCode: question.id || `SOAL-${pCode}-${String(index + 1).padStart(2, '0')}`,
      sourceBank: `Bank Soal CAT [${pCode}]`,
      category: question.category === 'psikotes' ? 'psikotes' : 'kompetensi',
      type: typeMap[question.type] || 'single',
      text: question.text || '',
      competency: question.competency || 'General',
      difficulty: question.difficulty || 'Sedang',
      options: (question.options || []).map((option: any) => ({
        key: option.key,
        label: option.text || option.label || '',
        isCorrect: Boolean(option.isCorrect)
      })),
      matchingPairs,
      codeSnippet: null,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
      weight: 1
    } as unknown as QuestionItem & { category: 'psikotes' | 'kompetensi' };
  };

  const handleOpenDetailModal = async (job: Job, initialTab: 'soal' | 'materi' | 'rubrik' = 'soal') => {
    const program = findProgramByTitle(job.title, job.id);
    const programCode = (job.code || program.id).toUpperCase();

    let latestQuestions = bankSoalQuestions;
    let latestMateri = serverMateri;
    try {
      const [bankData, materiData] = await Promise.all([
        loadMasterScope<any>('bank-soal'),
        loadMasterScope<MasterMateriItem[]>('materi')
      ]);
      if (Array.isArray(bankData?.questions) && bankData.questions.length > 0) {
        const defaults = buildDefaultBankSoal();
        const existingCodes = new Set(bankData.questions.map((q: any) => q.programCode));
        const missing = defaults.filter((q) => !existingCodes.has(q.programCode));
        latestQuestions = missing.length > 0 ? [...bankData.questions, ...missing] : bankData.questions;
        setBankSoalQuestions(latestQuestions);
      }
      if (Array.isArray(materiData?.table)) {
        latestMateri = materiData.table;
        setServerMateri(latestMateri);
      }
    } catch {
      // fallback to currently loaded state
    }

    let programQuestions = latestQuestions
      .filter((question) => (question.programCode || 'SE-402').toUpperCase() === programCode)
      .map(mapBankQuestion);
    if (programQuestions.length === 0 && !job.code && program.questions && program.questions.length > 0) {
      programQuestions = program.questions.map((q) => ({ ...q, category: 'kompetensi' as const }));
    }
    const questionsWithMeta = programQuestions.map((q, idx) => ({
      ...q,
      category: q.category === 'psikotes' ? ('psikotes' as const) : ('kompetensi' as const),
      questionCode: q.questionCode || `SOAL-${programCode}-${String(q.id || idx + 1).padStart(2, '0')}`,
      sourceBank: q.sourceBank || `Bank Soal CAT [${programCode} • ${program.companyName || 'Program'}]`
    }));
    const matchedPt = companies.find((c) => companyMatchesName(c.name, job.title));
    const resolvedCompany =
      matchedPt?.name ||
      (job.title.includes('(') ? job.title.split('(').slice(-1)[0].replace(')', '').trim() : '') ||
      program.companyName;
    const detailProgram = { ...program, id: programCode, companyName: resolvedCompany, questions: questionsWithMeta };
    const materials = getMaterialsForJob(job, latestMateri);
    const hasPsikotes = questionsWithMeta.some((q) => q.category === 'psikotes');
    const hasKompetensi = questionsWithMeta.some((q) => q.category !== 'psikotes');
    setSelectedJobDetail({ job, program: detailProgram, materials });
    setDetailTab(initialTab);
    setDetailQuestionCategory(hasPsikotes ? 'psikotes' : hasKompetensi ? 'kompetensi' : 'psikotes');
    setQSearch('');
    setQTypeFilter('ALL');
    setQDiffFilter('ALL');
  };

  const detailCategoryCounts = useMemo(() => {
    const qs = selectedJobDetail?.program.questions ?? [];
    return {
      psikotes: qs.filter((q) => q.category === 'psikotes').length,
      kompetensi: qs.filter((q) => q.category !== 'psikotes').length
    };
  }, [selectedJobDetail]);

  const categoryQuestionsInDetail = useMemo(() => {
    const qs = selectedJobDetail?.program.questions ?? [];
    return qs.filter((q) =>
      detailQuestionCategory === 'psikotes' ? q.category === 'psikotes' : q.category !== 'psikotes'
    );
  }, [selectedJobDetail, detailQuestionCategory]);

  const deferredQSearch = useDeferredValue(qSearch);

  const filteredQuestions = useMemo(() => {
    const qLower = deferredQSearch.toLowerCase();
    return categoryQuestionsInDetail.filter((q) => {
      const matchSearch =
        !qLower ||
        q.text.toLowerCase().includes(qLower) ||
        q.competency.toLowerCase().includes(qLower) ||
        (q.explanation && q.explanation.toLowerCase().includes(qLower)) ||
        (q.questionCode && q.questionCode.toLowerCase().includes(qLower)) ||
        (q.sourceBank && q.sourceBank.toLowerCase().includes(qLower));
      const matchType = qTypeFilter === 'ALL' || q.type === qTypeFilter;
      const matchDiff = qDiffFilter === 'ALL' || q.difficulty === qDiffFilter;
      return matchSearch && matchType && matchDiff;
    });
  }, [categoryQuestionsInDetail, deferredQSearch, qTypeFilter, qDiffFilter]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/jobs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        setJobs(response.data.data);
      } else {
        // Resilient fallback to DEFAULT_ASSESSMENT_PROGRAMS from catalog
        const fallbackJobs: Job[] = DEFAULT_ASSESSMENT_PROGRAMS.map((p) => ({
          id: p.id,
          code: p.id,
          title: `${p.title} (${p.companyName})`,
          description: p.description,
          status: 'active',
          interviewDuration: p.durationMinutes,
          interviewPassingScore: p.passingScore,
          assessmentDate: null,
          assessmentEndDate: null,
          createdAt: new Date().toISOString()
        }));
        setJobs(fallbackJobs);
      }
    } catch {
      // Fallback on network or auth error so admin is never left with an empty screen
      const fallbackJobs: Job[] = DEFAULT_ASSESSMENT_PROGRAMS.map((p) => ({
        id: p.id,
        code: p.id,
        title: `${p.title} (${p.companyName})`,
        description: p.description,
        status: 'active',
        interviewDuration: p.durationMinutes,
        interviewPassingScore: p.passingScore,
        assessmentDate: null,
        assessmentEndDate: null,
        createdAt: new Date().toISOString()
      }));
      setJobs(fallbackJobs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const applyCompanyToTitle = (rawTitle: string, companyName: string): string => {
    const trimmed = rawTitle.trim();
    if (!companyName) return trimmed;
    if (companyMatchesName(companyName, trimmed)) return trimmed;
    const baseTitle = trimmed.replace(/\s*\([^)]+\)\s*$/, '').trim();
    return `${baseTitle} (${companyName})`;
  };

  useEffect(() => {
    let cancelled = false;
    void loadCompanyDirectory().then((list) => {
      if (!cancelled && list.length > 0) setCompanies(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setAddError('Judul posisi wajib diisi.');
      return;
    }
    if (!newDescription.trim()) {
      setAddError('Deskripsi / job deskripsi wajib diisi.');
      return;
    }
    const finalTitle = applyCompanyToTitle(newTitle, newCompanyName);
    setAddLoading(true);
    setAddError('');
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post('/api/admin/jobs', {
        code: newCode.trim() ? newCode.trim().toUpperCase() : null,
        title: finalTitle,
        description: newDescription.trim(),
        status: newStatus,
        interviewDuration: newDuration === '' ? null : Number(newDuration),
        interviewPassingScore: newPassingScore === '' ? null : Number(newPassingScore),
        assessmentDate: newAssessmentDate || null,
        assessmentEndDate: newAssessmentEndDate || null,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowAddModal(false);
      setNewCompanyName('');
      setNewCode('');
      setNewTitle('');
      setNewDescription('');
      setNewStatus('active');
      setNewDuration(15);
      setNewPassingScore(70);
      setNewAssessmentDate('');
      setNewAssessmentEndDate('');
      Swal.fire({
        icon: 'success',
        title: 'Formasi Berhasil Dibuat',
        text: 'Formasi pekerjaan baru siap menerima pendaftar asesmen.',
        timer: 2000,
        showConfirmButton: false
      });
      fetchJobs();
    } catch (err: unknown) {
      setAddError(axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal membuat lowongan.' : 'Gagal membuat lowongan.');
    } finally {
      setAddLoading(false);
    }
  };

  const openEditModal = (job: Job) => {
    setEditingJob(job);
    const matchedComp = companies.find((c) => companyMatchesName(c.name, job.title));
    setEditCompanyName(matchedComp ? matchedComp.name : '');
    setEditCode(job.code || '');
    setEditTitle(job.title);
    setEditDescription(job.description || '');
    setEditStatus((job.status as 'active' | 'inactive') || 'active');
    setEditDuration(job.interviewDuration ?? 15);
    setEditPassingScore(job.interviewPassingScore ?? 70);
    setEditAssessmentDate(job.assessmentDate ? job.assessmentDate.slice(0, 10) : '');
    setEditAssessmentEndDate(job.assessmentEndDate ? job.assessmentEndDate.slice(0, 10) : '');
    setEditError('');
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;
    if (!editTitle.trim()) {
      setEditError('Judul posisi wajib diisi.');
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      const finalEditTitle = applyCompanyToTitle(editTitle, editCompanyName);
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/admin/jobs/${editingJob.id}`, {
        code: editCode.trim() ? editCode.trim().toUpperCase() : null,
        title: finalEditTitle,
        description: editDescription.trim(),
        status: editStatus,
        interviewDuration: editDuration === '' ? null : Number(editDuration),
        interviewPassingScore: editPassingScore === '' ? null : Number(editPassingScore),
        assessmentDate: editAssessmentDate || null,
        assessmentEndDate: editAssessmentEndDate || null,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setEditingJob(null);
      Swal.fire({
        icon: 'success',
        title: 'Program Asesmen Diperbarui',
        text: 'Konfigurasi program asesmen berhasil disimpan.',
        timer: 2000,
        showConfirmButton: false
      });
      fetchJobs();
    } catch (err: unknown) {
      setEditError(axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal memperbarui lowongan.' : 'Gagal memperbarui lowongan.');
    } finally {
      setEditLoading(false);
    }
  };

  // Distribusi tipe soal dinamis sesuai kategori aktif (Psikotes / Uji Kompetensi)
  const detailQuestionCounts = useMemo(() => {
    const qs = categoryQuestionsInDetail;
    return {
      total: qs.length,
      single: qs.filter((q) => q.type === 'single').length,
      multi: qs.filter((q) => q.type === 'multi').length,
      matching: qs.filter((q) => q.type === 'matching').length,
      short: qs.filter((q) => q.type === 'short').length,
      essay: qs.filter((q) => q.type === 'essay').length,
    };
  }, [categoryQuestionsInDetail]);

  const handleDeleteJob = async (id: string, title: string) => {
    const result = await Swal.fire({
      title: 'Hapus Formasi Asesmen?',
      text: `Apakah Anda yakin ingin menghapus "${title}"? Data pendaftar pada formasi ini tidak dapat dipulihkan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1E3A8A',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Ya, Hapus Formasi',
      cancelButtonText: 'Batal',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/admin/jobs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Dihapus',
        text: 'Formasi lowongan telah dihapus dari sistem.',
        timer: 2000,
        showConfirmButton: false
      });
      fetchJobs();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal menghapus lowongan.' : 'Gagal menghapus lowongan.';
      Swal.fire({ icon: 'error', title: 'Gagal Menghapus', text: msg });
    }
  };

  // Metrics
  const activeCount = useMemo(() => {
    return jobs.filter(j => j.status === 'active').length;
  }, [jobs]);

  const inactiveCount = useMemo(() => {
    return jobs.filter(j => j.status !== 'active').length;
  }, [jobs]);

  const avgPassingScore = useMemo(() => {
    const scored = jobs.filter(j => j.interviewPassingScore !== null);
    if (scored.length === 0) return 70;
    const sum = scored.reduce((acc, curr) => acc + (curr.interviewPassingScore || 0), 0);
    return Math.round(sum / scored.length);
  }, [jobs]);

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const filteredJobs = useMemo(() => {
    const q = deferredSearchQuery.toLowerCase();
    return jobs.filter(job => {
      const matchesSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, deferredSearchQuery, statusFilter]);

  return (
    <div className="space-y-6 font-sans">
      {/* Telemetry Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <AdminStatCard
          label="Total Formasi Lowongan"
          value={jobs.length}
          subtext="Posisi dibuka"
          badge="Katalog"
          badgeVariant="neutral"
          icon={Briefcase}
          loading={loading && jobs.length === 0}
        />
        <AdminStatCard
          label="Lowongan Aktif"
          value={activeCount}
          subtext="Menerima pelamar"
          badge="Aktif"
          badgeVariant="success"
          icon={CheckCircle2}
          loading={loading && jobs.length === 0}
        />
        <AdminStatCard
          label="Rata-rata Passing Score"
          value={`${avgPassingScore}%`}
          subtext="Ambang kelulusan"
          badge="Kompetensi"
          badgeVariant="info"
          icon={Target}
          loading={loading && jobs.length === 0}
        />
        <AdminStatCard
          label="Formasi Arsip"
          value={inactiveCount}
          subtext="Program nonaktif / ditutup"
          badge="Arsip"
          badgeVariant="neutral"
          icon={Clock}
          loading={loading && jobs.length === 0}
        />
      </div>

      {/* Control & Filter Ledger Bar */}
      <Card elevation="flat" className="p-4 border-[#E2E8F0] rounded-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap flex-1 items-center gap-3 min-w-0">
          <div className="w-full sm:w-[240px]">
            <Input
              placeholder="Cari judul lowongan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-[#94A3B8]" />}
              className="h-10 rounded-lg"
            />
          </div>

          <div className="inline-flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg text-xs font-sans">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`h-8 px-3 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-[#1E3A8A] text-white font-semibold'
                  : 'text-[#475569] hover:text-[#0F172A] font-medium'
              }`}
            >
              Semua ({jobs.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`h-8 px-3 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'active'
                  ? 'bg-[#1E3A8A] text-white font-semibold'
                  : 'text-[#475569] hover:text-[#0F172A] font-medium'
              }`}
            >
              Aktif ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`h-8 px-3 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'inactive'
                  ? 'bg-[#1E3A8A] text-white font-semibold'
                  : 'text-[#475569] hover:text-[#0F172A] font-medium'
              }`}
            >
              Nonaktif ({inactiveCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchJobs}
            title="Segarkan Data Program"
            aria-label="Segarkan Data Program"
            className="h-10 w-10 rounded-lg border-[#E2E8F0] text-[#475569]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="h-10 px-4 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white min-w-fit whitespace-nowrap"
          >
            Buat Lowongan Baru
          </Button>
        </div>
      </Card>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-lg text-xs text-[#991B1B] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Jobs Table (desktop) */}
      <div className="hidden md:block bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.08)] overflow-x-auto">
      <Table className="w-full min-w-[920px]">
        <TableHeader className="sticky top-0 z-10 bg-white">
          <TableRow className="border-b border-[#E2E8F0]">
            <TableHead className="w-[48px] text-center text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">#</TableHead>
            <TableHead className="min-w-[260px] text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Formasi</TableHead>
            <TableHead className="w-[260px] text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Konten Asesmen</TableHead>
            <TableHead className="w-[100px] text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Status</TableHead>
            <TableHead className="w-[150px] text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Periode</TableHead>
            <TableHead className="w-[110px] text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Rilis</TableHead>
            <TableHead className="w-[160px] text-right text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`sk-${i}`} className="h-16">
                <TableCell colSpan={7}><div className="h-5 w-full rounded bg-[#E2E8F0] animate-pulse" /></TableCell>
              </TableRow>
            ))
          ) : filteredJobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <AdminEmptyState
                  icon={Briefcase}
                  title="Belum ada lowongan"
                  description="Tidak ada lowongan yang sesuai kriteria filter. Ubah filter atau tambah formasi baru."
                />
              </TableCell>
            </TableRow>
          ) : (
            filteredJobs.map((job, idx) => (
              <TableRow key={job.id} className="h-16 hover:bg-[#F8FAFC] transition-colors">
                <TableCell className="text-center font-mono text-xs text-[#64748B] tabular-nums">
                  {(idx + 1).toString().padStart(2, '0')}
                </TableCell>
                <TableCell>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[#0F172A] leading-snug line-clamp-1" title={job.title}>
                      {job.title}
                    </div>
                    <p className="text-xs text-[#64748B] line-clamp-1 mt-0.5" title={job.description}>
                      {job.description}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => void handleOpenDetailModal(job, 'soal')}
                    className="text-left text-[13px] text-[#475569] hover:text-[#1E3A8A] whitespace-nowrap tabular-nums cursor-pointer"
                    title="Klik untuk melihat detail Soal CAT & Materi"
                  >
                    {getBankQuestionCountForJob(job)} Soal CAT • {getMaterialsForJob(job).length} Panduan • {job.interviewDuration || 15} mnt • Lulus {job.interviewPassingScore !== null ? `${job.interviewPassingScore}%` : '70%'}
                  </button>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
                      getJobScheduleStatus(job).key === 'active'
                        ? 'bg-[#DCFCE7] text-[#166534]'
                        : getJobScheduleStatus(job).key === 'scheduled'
                          ? 'bg-[#E0F2FE] text-[#075985]'
                          : 'bg-[#F1F5F9] text-[#475569]'
                    }`}
                  >
                    {getJobScheduleStatus(job).label.toUpperCase()}
                  </span>
                </TableCell>
                <TableCell className="text-[#475569] text-xs font-mono whitespace-nowrap tabular-nums">
                  {job.assessmentDate || job.assessmentEndDate ? (
                    <span>
                      {job.assessmentDate
                        ? new Date(job.assessmentDate).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
                        : '—'}
                      {' – '}
                      {job.assessmentEndDate
                        ? new Date(job.assessmentEndDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
                        : '—'}
                    </span>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-[#64748B] whitespace-nowrap text-xs font-mono tabular-nums">
                  {new Date(job.createdAt).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => void handleOpenDetailModal(job)}
                      leftIcon={<Eye className="w-3 h-3" />}
                    >
                      <span className="hidden sm:inline">Detail</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => openEditModal(job)}
                      leftIcon={<Edit2 className="w-3 h-3" />}
                    >
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => handleDeleteJob(job.id, job.title)}
                      leftIcon={<Trash2 className="w-3 h-3" />}
                    >
                      <span className="hidden sm:inline">Hapus</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>

      {/* Program cards (mobile) */}
      <div className="md:hidden space-y-3">
        {filteredJobs.map((job) => (
          <div key={job.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 line-clamp-2">{job.title}</p>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{job.description}</p>
              </div>
              <Badge
                variant={getJobScheduleStatus(job).variant}
                format="soft"
                hasDot={getJobScheduleStatus(job).key === 'active'}
                className="shrink-0"
              >
                {getJobScheduleStatus(job).label}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
              <span>{job.interviewDuration || 15} menit</span>
              <span>Pass {job.interviewPassingScore ?? 70}%</span>
              <span className="font-mono">
                {job.assessmentDate || job.assessmentEndDate
                  ? `${job.assessmentDate ? new Date(job.assessmentDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '—'} – ${
                      job.assessmentEndDate
                        ? new Date(job.assessmentEndDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'
                    }`
                  : 'Jadwal belum diatur'}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="xs"
                onClick={() => void handleOpenDetailModal(job)}
                leftIcon={<Eye className="w-3 h-3" />}
                className="flex-1"
              >
                Detail
              </Button>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => openEditModal(job)}
                leftIcon={<Edit2 className="w-3 h-3" />}
                className="flex-1"
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="xs"
                onClick={() => handleDeleteJob(job.id, job.title)}
                leftIcon={<Trash2 className="w-3 h-3" />}
                className="flex-1"
              >
                Hapus
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Job Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Buat Formasi Lowongan Pekerjaan Baru"
        description="Konfigurasikan judul posisi, durasi wawancara AI, dan passing grade kelulusan."
        size="lg"
      >
        <form onSubmit={handleAddJob} className="space-y-4 font-sans">
          {addError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <div>
            <Select
              label="Perusahaan (PT) Mitra"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
            >
              <option value="">-- Pilih Perusahaan (atau ketik manual di judul) --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.name}>
                  [{c.id}] {c.name}
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-slate-500 mt-1">Program akan otomatis terhubung ke card Perusahaan (PT) yang dipilih.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              Judul Posisi Pekerjaan
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              className="w-full px-3.5 py-2.5 text-sm font-sans bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              Kode Program Asesmen (opsional)
            </label>
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="e.g. SE-402"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy transition-colors"
            />
            <p className="text-[11px] text-slate-500 mt-1">Isi kode agar formasi ini dapat dipakai sebagai program CAT, access code, dan penugasan peserta.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              Deskripsi Pekerjaan &amp; Kriteria Kualifikasi
            </label>
            <textarea
              required
              rows={4}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Deskripsikan tanggung jawab utama, tech stack, dan persyaratan kompetensi..."
              className="w-full px-3.5 py-2.5 text-sm font-sans bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy leading-relaxed transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Durasi Wawancara AI (Menit)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full h-11 px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Ambang Kelulusan (Passing Score 0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={newPassingScore}
                onChange={(e) => setNewPassingScore(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full h-11 px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Tanggal Mulai Asesmen
              </label>
              <input
                type="date"
                value={newAssessmentDate}
                onChange={(e) => setNewAssessmentDate(e.target.value)}
                className="w-full h-11 px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Tanggal Selesai Asesmen
              </label>
              <input
                type="date"
                value={newAssessmentEndDate}
                min={newAssessmentDate || undefined}
                onChange={(e) => setNewAssessmentEndDate(e.target.value)}
                className="w-full h-11 px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 -mt-2">Rentang tanggal pelaksanaan asesmen. Dapat diubah kapan saja.</p>

          <div>
            <Select
              label="Status Formasi"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as 'active' | 'inactive')}
              className="h-11 rounded-xl font-medium"
            >
              <option value="active">Aktif (Terbuka untuk Pendaftaran)</option>
              <option value="inactive">Nonaktif (Arsip Internal)</option>
            </Select>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddModal(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={addLoading}
              isLoading={addLoading}
            >
              Simpan Formasi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Program Asesmen Modal */}
      {editingJob && (
        <Modal
          isOpen={!!editingJob}
          onClose={() => setEditingJob(null)}
          title="Edit Program Asesmen"
          description={`Kelola konfigurasi, jadwal, dan parameter kelulusan untuk ${editingJob.title}.`}
          size="lg"
        >
          <div className="max-h-[68vh] overflow-y-auto pr-1 font-sans space-y-4">
            <form id="job-edit-form" onSubmit={handleUpdateJob} className="space-y-4">
                {editError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                <div>
                  <Select
                    label="Perusahaan (PT) Mitra"
                    value={editCompanyName}
                    onChange={(e) => {
                      const nextPt = e.target.value;
                      setEditCompanyName(nextPt);
                      if (nextPt) {
                        setEditTitle((prev) => applyCompanyToTitle(prev.replace(/\s*\([^)]+\)\s*$/, ''), nextPt));
                      }
                    }}
                  >
                    <option value="">-- Tanpa PT Khusus / Lainnya --</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.name}>
                        [{c.id}] {c.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Judul Posisi Pekerjaan</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-sans bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Kode Program Asesmen</label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SE-402"
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Deskripsi Pekerjaan &amp; Kriteria Kualifikasi</label>
                  <textarea
                    required
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-sans bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">Durasi Wawancara AI (Menit)</label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full h-11 px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">Ambang Kelulusan (Passing Score 0-100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editPassingScore}
                      onChange={(e) => setEditPassingScore(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full h-11 px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">Tanggal Mulai Asesmen</label>
                    <input
                      type="date"
                      value={editAssessmentDate}
                      onChange={(e) => setEditAssessmentDate(e.target.value)}
                      className="w-full h-11 px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">Tanggal Selesai Asesmen</label>
                    <input
                      type="date"
                      value={editAssessmentEndDate}
                      min={editAssessmentDate || undefined}
                      onChange={(e) => setEditAssessmentEndDate(e.target.value)}
                      className="w-full h-11 px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 -mt-2">Kosongkan bila jadwal asesmen belum ditentukan.</p>

                <div>
                  <Select
                    label="Status Formasi"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
                    className="h-11 rounded-xl font-medium"
                  >
                    <option value="active">Aktif (Terbuka untuk Pendaftaran)</option>
                    <option value="inactive">Nonaktif (Arsip Internal)</option>
                  </Select>
                </div>

              </form>
          </div>

          {/* Footer Edit */}
          <div className="pt-3 border-t border-slate-100 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Menyimpan konfigurasi program asesmen.
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditingJob(null)}>
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={editLoading}
                isLoading={editLoading}
                onClick={() => {
                  const formEl = document.getElementById('job-edit-form') as HTMLFormElement | null;
                  if (formEl) formEl.requestSubmit();
                }}
              >
                Simpan Perubahan
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail Soal & Materi Program Asesmen Modal */}
      {selectedJobDetail && (
        <Modal
          isOpen={!!selectedJobDetail}
          onClose={() => setSelectedJobDetail(null)}
          title={
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {selectedJobDetail.job.title}
                </h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-slate-500">
                  <Badge variant="navy" format="solid" className="text-[11px]">
                    {selectedJobDetail.program.companyName}
                  </Badge>
                  <span className="font-mono text-slate-500">ID: {selectedJobDetail.program.id}</span>
                  <span>•</span>
                  <span>{selectedJobDetail.program.gradeLevel}</span>
                  <span>•</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Ambang Lulus: {selectedJobDetail.job.interviewPassingScore || 75}%
                  </span>
                  <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Durasi: {selectedJobDetail.job.interviewDuration || 90} Menit
                  </span>
                  <Badge
                    variant={getJobScheduleStatus(selectedJobDetail.job).variant}
                    format="soft"
                    hasDot={getJobScheduleStatus(selectedJobDetail.job).key === 'active'}
                    className="text-[11px]"
                  >
                    {getJobScheduleStatus(selectedJobDetail.job).label}
                  </Badge>
                  <span className="font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    Periode Asesmen: {selectedJobDetail.job.assessmentDate
                      ? new Date(selectedJobDetail.job.assessmentDate).toLocaleDateString('id-ID', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })
                      : 'Belum diatur'}
                    {' – '}
                    {selectedJobDetail.job.assessmentEndDate
                      ? new Date(selectedJobDetail.job.assessmentEndDate).toLocaleDateString('id-ID', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })
                      : 'Belum diatur'}
                  </span>
                </div>
              </div>
            </div>
          }
          size="5xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Seluruh soal dan silabus telah tervalidasi standar industri dan terintegrasi ke engine CAT.
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedJobDetail(null)}
              >
                Tutup Jendela
              </Button>
            </div>
          }
        >
          <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1 font-sans">
            {selectedJobDetail.job.description && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Deskripsi &amp; Kualifikasi Program Asesmen
                </span>
                {selectedJobDetail.job.description}
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setDetailTab('soal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  detailTab === 'soal'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Bank Soal CAT ({selectedJobDetail.program.questions.length} Soal)</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('materi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  detailTab === 'materi'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Panduan Materi ({selectedJobDetail.materials.length} Panduan)</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('rubrik')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  detailTab === 'rubrik'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Standar Rubrik BARS (1-5) & Bobot</span>
              </button>
            </div>

            {/* TAB 1: SOAL-SOAL CAT (Dipisah Soal Psikotes vs Uji Kompetensi dari Menu Materi & Soal) */}
            {detailTab === 'soal' && (
              <div className="space-y-4">
                {/* Kategori Switcher: Soal Psikotes vs Uji Kompetensi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDetailQuestionCategory('psikotes');
                      setQTypeFilter('ALL');
                    }}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition cursor-pointer ${
                      detailQuestionCategory === 'psikotes'
                        ? 'border-indigo-500 bg-indigo-50/80 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          detailQuestionCategory === 'psikotes'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 border border-slate-200 text-slate-600'
                        }`}
                      >
                        <Brain className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">Soal Psikotes</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          Penalaran logis, numerik, verbal &amp; kepribadian
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold shrink-0 ${
                        detailQuestionCategory === 'psikotes'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 border border-slate-200 text-slate-700'
                      }`}
                    >
                      {detailCategoryCounts.psikotes} Soal
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDetailQuestionCategory('kompetensi');
                      setQTypeFilter('ALL');
                    }}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition cursor-pointer ${
                      detailQuestionCategory === 'kompetensi'
                        ? 'border-primary-navy bg-soft-blue shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          detailQuestionCategory === 'kompetensi'
                            ? 'bg-primary-navy text-white'
                            : 'bg-slate-100 border border-slate-200 text-slate-600'
                        }`}
                      >
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">Uji Kompetensi</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          Teknis, studi kasus, arsitektur &amp; materi program
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold shrink-0 ${
                        detailQuestionCategory === 'kompetensi'
                          ? 'bg-primary-navy text-white'
                          : 'bg-slate-100 border border-slate-200 text-slate-700'
                      }`}
                    >
                      {detailCategoryCounts.kompetensi} Soal
                    </span>
                  </button>
                </div>

                {/* Question Distribution Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Total Soal</span>
                    <span className="text-lg font-mono font-bold text-slate-800">{detailQuestionCounts.total}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                    <span className="block text-[10px] uppercase font-bold text-blue-600">Pilihan Ganda</span>
                    <span className="text-lg font-mono font-bold text-blue-700">{detailQuestionCounts.single}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                    <span className="block text-[10px] uppercase font-bold text-purple-600">Multi-Select</span>
                    <span className="text-lg font-mono font-bold text-purple-700">{detailQuestionCounts.multi}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                    <span className="block text-[10px] uppercase font-bold text-amber-600">Matching</span>
                    <span className="text-lg font-mono font-bold text-amber-700">{detailQuestionCounts.matching}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                    <span className="block text-[10px] uppercase font-bold text-teal-600">Isian Singkat</span>
                    <span className="text-lg font-mono font-bold text-teal-700">{detailQuestionCounts.short}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                    <span className="block text-[10px] uppercase font-bold text-rose-600">Studi Kasus</span>
                    <span className="text-lg font-mono font-bold text-rose-700">{detailQuestionCounts.essay}</span>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={qSearch}
                      onChange={(e) => setQSearch(e.target.value)}
                      placeholder="Cari teks soal, kompetensi, atau kata kunci..."
                      className="w-full h-11 pl-10 pr-9 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    {qSearch && (
                      <button
                        type="button"
                        onClick={() => setQSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="w-48">
                      <Select
                        value={qTypeFilter}
                        onChange={(e) => setQTypeFilter(e.target.value)}
                        className="h-11 rounded-xl font-medium"
                      >
                        <option value="ALL">Semua Tipe Soal</option>
                        <option value="single">Pilihan Ganda</option>
                        <option value="multi">Multi-Select</option>
                        <option value="matching">Matching (Menjodohkan)</option>
                        <option value="short">Isian Singkat</option>
                        <option value="essay">Esai / Studi Kasus</option>
                      </Select>
                    </div>

                    <div className="w-52">
                      <Select
                        value={qDiffFilter}
                        onChange={(e) => setQDiffFilter(e.target.value)}
                        className="h-11 rounded-xl font-medium"
                      >
                        <option value="ALL">Semua Tingkat Kesulitan</option>
                        <option value="Mudah">Mudah</option>
                        <option value="Sedang">Sedang</option>
                        <option value="Sulit">Sulit</option>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Question List */}
                <div className="space-y-3.5">
                  {filteredQuestions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-sm">
                      {detailQuestionCounts.total === 0
                        ? `Belum ada soal ${detailQuestionCategory === 'psikotes' ? 'Psikotes' : 'Uji Kompetensi'} untuk program ini pada menu Materi & Soal.`
                        : 'Tidak ada soal yang sesuai dengan kata kunci atau filter yang dipilih.'}
                    </div>
                  ) : (
                    filteredQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="p-4.5 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-colors shadow-2xs space-y-3.5"
                      >
                        {/* Question Header */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-bold text-sm flex items-center justify-center border border-indigo-200">
                              #{q.id.toString().padStart(2, '0')}
                            </span>
                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {q.type === 'single' ? 'Pilihan Ganda' : q.type === 'multi' ? 'Multi-Select' : q.type === 'short' ? 'Isian Singkat' : q.type === 'essay' ? 'Studi Kasus / Esai' : 'Matching'}
                            </span>
                            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                              q.difficulty === 'Sulit' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              q.difficulty === 'Sedang' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {q.difficulty}
                            </span>
                          </div>
                          <span className="text-xs sm:text-sm text-slate-500 font-medium">
                            Kompetensi: <strong className="text-slate-800">{q.competency}</strong>
                          </span>
                        </div>

                        {/* Keterangan Materi & Silabus Program (hanya tampil bila materi sudah tersedia di Materi & Soal) */}
                        {selectedJobDetail.materials.length > 0 && (() => {
                          const detailMateriInfo = resolveQuestionMateriAndSyllabus(
                            q,
                            selectedJobDetail.materials,
                            selectedJobDetail.job.title
                          );
                          return (
                            <div className="flex items-center gap-2 flex-wrap text-xs bg-blue-50/60 px-3 py-1.5 rounded-lg border border-blue-200/70 text-slate-700">
                              <span className="font-semibold text-primary-navy flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                Materi:
                              </span>
                              <span className="font-semibold text-slate-900">{detailMateriInfo.materiLabel}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-semibold text-primary-navy">Silabus:</span>
                              <span className="text-slate-800">{detailMateriInfo.silabusLabel}</span>
                            </div>
                          );
                        })()}

                        {/* Question Body */}
                        <p className="text-sm sm:text-[15px] font-medium text-slate-900 leading-relaxed">
                          {q.text}
                        </p>

                        {/* Code Snippet if any */}
                        {q.codeSnippet && (
                          <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto leading-normal">
                            <code>{q.codeSnippet}</code>
                          </pre>
                        )}

                        {/* Options */}
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            {q.options.map((opt) => (
                              <div
                                key={opt.key}
                                className={`p-3 sm:p-3.5 rounded-xl border text-sm flex items-start gap-3 transition-colors ${
                                  opt.isCorrect
                                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium ring-1 ring-emerald-300/50'
                                    : 'bg-slate-50/70 border-slate-200 text-slate-800 hover:bg-slate-50'
                                }`}
                              >
                                <span
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                                    opt.isCorrect
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {opt.key}
                                </span>
                                <span className="flex-1 leading-relaxed">{opt.label}</span>
                                {opt.isCorrect && (
                                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md whitespace-nowrap flex items-center gap-1 shrink-0">
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    KUNCI BENAR
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Matching Pairs if any */}
                        {q.matchingPairs && q.matchingPairs.length > 0 && (
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-800 block">
                              Pasangan Pencocokan Baku:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.matchingPairs.map((pair, idx) => (
                                <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm flex items-center justify-between gap-2">
                                  <span className="font-semibold text-slate-800">{pair.left}</span>
                                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                                    {pair.correctRight || pair.rightOptions[0]}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Short Answer / Correct Answer */}
                        {q.correctAnswer && (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-900 flex items-center gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              <strong>Kunci Jawaban Tepat:</strong> {q.correctAnswer}
                            </span>
                          </div>
                        )}

                        {/* Explanation / Rasional */}
                        {q.explanation && (
                          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-sm text-blue-900 flex items-start gap-2.5">
                            <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-blue-800">Rasional &amp; Pembahasan:</strong> {q.explanation}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: SILABUS & MATERI UJI */}
            {detailTab === 'materi' && (
              <div className="space-y-4">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center gap-3">
                  <Layers className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-indigo-950">
                      Silabus & Modul Pembelajaran Baku
                    </p>
                    <p className="text-indigo-700 text-[11px] mt-0.5">
                      Modul materi yang dijadikan bahan acuan penyusunan bank soal CAT dan wawancara live asesor untuk posisi ini.
                    </p>
                  </div>
                </div>

                {selectedJobDetail.materials.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-500 text-xs sm:text-sm space-y-1">
                    <Layers className="w-7 h-7 text-slate-300 mx-auto mb-1" />
                    <p className="font-semibold text-slate-700">
                      Belum ada panduan materi untuk program {selectedJobDetail.program.id}.
                    </p>
                    <p className="text-xs text-slate-500">
                      Tambahkan panduan materi melalui menu <strong>Materi &amp; Soal</strong> di sidebar agar muncul di sini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedJobDetail.materials.map((mat) => (
                    <Card key={mat.id} elevation="flat" className="p-4.5 border border-slate-200 space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              {mat.code}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                              {mat.type}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              {mat.assessmentLevel}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">v{mat.version}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-1.5">
                            {mat.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Kategori: <strong className="text-slate-700">{mat.category}</strong> • Subkategori: {mat.subcategory || '-'}
                          </p>
                        </div>
                        <Badge variant="success" format="soft" hasDot>
                          {mat.status || 'Aktif'}
                        </Badge>
                      </div>

                      <div>
                        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Ringkasan Silabus & Pokok Bahasan
                        </h5>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {mat.content}
                        </p>
                      </div>

                      <div>
                        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Panduan Rubrik & Standar Kelulusan Asesor
                        </h5>
                        <p className="text-xs text-slate-600 leading-relaxed bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-blue-900">
                          {mat.rubric}
                        </p>
                      </div>

                      {mat.behavioralIndicators && mat.behavioralIndicators.length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Indikator Perilaku Baku (Behavioral Indicators)
                          </h5>
                          <div className="space-y-1.5">
                            {mat.behavioralIndicators.map((ind, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span className="leading-tight">{ind}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: RUBRIK BARS & BOBOT */}
            {detailTab === 'rubrik' && (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-3">
                  <Award className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-950">
                      Standar Skala Penilaian BARS (1 - 5)
                    </p>
                    <p className="text-emerald-700 text-[11px] mt-0.5">
                      Behaviorally Anchored Rating Scale yang diterapkan oleh AI Assessor Ava dan dewan asesor independen untuk evaluasi kompetensi.
                    </p>
                  </div>
                </div>

                {/* BARS Scale 1-5 Grid */}
                <div className="space-y-2.5">
                  <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/50 flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-rose-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div className="text-xs">
                      <strong className="text-rose-900 block text-sm">Skor 1 — Sangat Kurang / Tidak Efektif</strong>
                      <p className="text-rose-800 mt-0.5 leading-relaxed">
                        Kandidat gagal memahami konsep dasar sistem, tidak mampu mengidentifikasi akar masalah, atau memberikan usulan yang melanggar standar keselamatan/keamanan data fatal.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-amber-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div className="text-xs">
                      <strong className="text-amber-900 block text-sm">Skor 2 — Di Bawah Standar Minimum</strong>
                      <p className="text-amber-800 mt-0.5 leading-relaxed">
                        Mengetahui teori permukaan tetapi kesulitan menghubungkan trade-off praktis, alur mitigasi tidak terstruktur, dan membutuhkan supervisi intensif dari supervisor.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div className="text-xs">
                      <strong className="text-blue-900 block text-sm">Skor 3 — Memenuhi Standar Kompetensi (Passing Baseline)</strong>
                      <p className="text-blue-800 mt-0.5 leading-relaxed">
                        Memenuhi seluruh parameter standar posisi, memberikan solusi teknis yang aman dan teruji, serta mematuhi SLA operasional dan tata kelola perusahaan tanpa pelanggaran.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/50 flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      4
                    </span>
                    <div className="text-xs">
                      <strong className="text-indigo-900 block text-sm">Skor 4 — Melampaui Standar / Efektif</strong>
                      <p className="text-indigo-800 mt-0.5 leading-relaxed">
                        Mampu memetakan korelasi risiko multi-dimensi, menyusun rencana penanganan bertahap (immediate vs long-term), serta mengoptimalkan efisiensi komputasi/biaya secara terukur.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      5
                    </span>
                    <div className="text-xs">
                      <strong className="text-emerald-900 block text-sm">Skor 5 — Sangat Unggul / Role Model</strong>
                      <p className="text-emerald-800 mt-0.5 leading-relaxed">
                        Inovatif, memiliki visi arsitektur holistik, memimpin komunikasi krisis dengan persuasif, serta menghasilkan rekomendasi bernilai tambah strategis tinggi bagi korporasi.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Selection Pipeline Weighting */}
                <Card elevation="flat" className="p-4 border border-slate-200 space-y-3">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Bobot Tahapan Seleksi Terpadu (100%)
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Tes CAT ({selectedJobDetail.program.questions.length} Soal)</span>
                      <span className="font-mono font-bold text-base text-primary-navy">35%</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">AI Proctoring</span>
                      <span className="font-mono font-bold text-base text-purple-700">15%</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Live Interview BARS</span>
                      <span className="font-mono font-bold text-base text-indigo-700">30%</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Review Berkas</span>
                      <span className="font-mono font-bold text-base text-teal-700">10%</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Keputusan Akhir</span>
                      <span className="font-mono font-bold text-base text-emerald-700">10%</span>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
