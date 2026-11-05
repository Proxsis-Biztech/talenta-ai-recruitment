import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  Trash2, Briefcase, Plus, Edit2, AlertCircle, Clock, 
  Target, Search, RefreshCw, Building2,
  BookOpen, Layers, CheckCircle2, Eye, HelpCircle, Check, 
  X, Filter, SlidersHorizontal, ListOrdered, Award, ShieldCheck, 
  ChevronRight, FileText, Download
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Input,
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
  upsertProgram,
  getAllPrograms,
  buildDefaultBankSoal,
  type AssessmentProgram, 
  type QuestionItem 
} from '../services/assessmentCatalog';
import { 
  INITIAL_MATERI_LIST, 
  type MasterMateriItem 
} from './admin/AdminMasterMateriTree';
import { loadMasterScope } from '../services/masterDataService';

interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  interviewDuration: number | null;
  interviewPassingScore: number | null;
  createdAt: string;
}

/** Override materi khusus per formasi (hasil edit di modal Ubah Formasi) */
const MATERI_OVERRIDES_KEY = 'talenta_job_materi_overrides_v1';

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

function getJobMateriOverrides(): Record<string, MasterMateriItem[]> {
  try {
    const saved = localStorage.getItem(MATERI_OVERRIDES_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    if (parsed && typeof parsed === 'object') return parsed as Record<string, MasterMateriItem[]>;
  } catch {
    /* parse error → tanpa override */
  }
  return {};
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
  const [bankSoalQuestions, setBankSoalQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');

  // Add Job Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState<'active' | 'inactive'>('active');
  const [newDuration, setNewDuration] = useState<number | ''>(15);
  const [newPassingScore, setNewPassingScore] = useState<number | ''>(70);
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Edit Job Modal State
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editDuration, setEditDuration] = useState<number | ''>('');
  const [editPassingScore, setEditPassingScore] = useState<number | ''>('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Edit Tab State: Konfigurasi + Bank Soal + Materi (use case edit lengkap)
  const [editTab, setEditTab] = useState<'profil' | 'soal' | 'materi'>('profil');
  const [editQuestions, setEditQuestions] = useState<QuestionItem[]>([]);
  const [editMaterials, setEditMaterials] = useState<MasterMateriItem[]>([]);
  const [originalQuestions, setOriginalQuestions] = useState<QuestionItem[]>([]);
  const [originalMaterials, setOriginalMaterials] = useState<MasterMateriItem[]>([]);
  const [editingQId, setEditingQId] = useState<number | null>(null);
  const [editingMatId, setEditingMatId] = useState<string | null>(null);
  const [editQSearch, setEditQSearch] = useState('');

  // Import dari Bank Soal Panel State
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importSourceProgramId, setImportSourceProgramId] = useState('');
  const [importTypeFilter, setImportTypeFilter] = useState('ALL');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const allProgramsList = useMemo(() => getAllPrograms(), []);


  // Details Modal State (Soal, Materi, Rubrik)
  const [selectedJobDetail, setSelectedJobDetail] = useState<{
    job: Job;
    program: AssessmentProgram;
    materials: MasterMateriItem[];
  } | null>(null);
  const [detailTab, setDetailTab] = useState<'soal' | 'materi' | 'rubrik'>('soal');
  const [qSearch, setQSearch] = useState('');
  const [qTypeFilter, setQTypeFilter] = useState('ALL');
  const [qDiffFilter, setQDiffFilter] = useState('ALL');

  const getBankQuestionCountForJob = useCallback((job: Job) => {
    const program = findProgramByTitle(job.title, job.id);
    const count = bankSoalQuestions.filter((question) => (question.programCode || 'SE-402') === program.id).length;
    return count > 0 ? count : (program.questions?.length || 40);
  }, [bankSoalQuestions]);

  const getMaterialsForJob = useCallback((job: Job): MasterMateriItem[] => {
    // 1) Edit khusus per formasi (dari modal Ubah) selalu menang
    const overrides = getJobMateriOverrides();
    if (overrides[job.id]?.length) return overrides[job.id];

    // 2) Master materi yang tersimpan — termasuk hasil edit di menu Master Materi,
    //    supaya kedua menu selalu menampilkan data yang sama (use case tersambung).
    const masterList = getPersistedMasterMateri();
    const titleLower = job.title.toLowerCase();
    const matched = masterList.filter(m => {
      if (titleLower.includes('telkom') && m.companyId === 'PT-TELKOM') return true;
      if (titleLower.includes('mandiri') && m.companyId === 'PT-MANDIRI') return true;
      if (titleLower.includes('cimb') && m.companyId === 'PT-CIMB') return true;
      if (titleLower.includes('astra') && m.companyId === 'PT-ASTRA') return true;
      if (titleLower.includes('pertamina') && m.companyId === 'PT-PERTAMINA') return true;
      return false;
    });

    if (matched.length > 0) return matched;

    // Resilient fallback custom module for dynamic/custom jobs
    const company = job.title.includes('(') ? job.title.split('(')[1].replace(')', '').trim() : 'Enterprise Partner';
    return [
      {
        id: `mat-${job.id}-1`,
        code: `MOD-${job.id.substring(0, 5).toUpperCase()}`,
        title: `Silabus Teknis & Uji Studi Kasus: ${job.title}`,
        category: 'Kompetensi Inti & Terapan',
        subcategory: 'Standar Operasional & Rekayasa Arsitektur Enterprise',
        competency: 'System Resilience, Problem Solving & Business Alignment',
        companyId: 'PT-DYNAMIC',
        companyName: company,
        assessmentType: 'Technical & Hard Competency',
        assessmentLevel: 'Level 3: Senior / Lead Specialist',
        type: 'Studi Kasus',
        version: 'v2.5',
        content: job.description + ' Pengujian mengukur ketepatan logika, optimasi resource komputasi, penanganan anomali data, dan kepatuhan prosedur operasional standar.',
        rubric: `Standar penilaian skala BARS 1-5 dengan ambang kelulusan minimum ${job.interviewPassingScore || 75}%. Penilaian mengevaluasi pemahaman konsep, artikulasi trade-off teknis, dan kesiapan mitigasi risiko di lingkungan live.`,
        behavioralIndicators: [
          `Mampu merancang dan menganalisis solusi teknis untuk formasi ${job.title}`,
          'Menjelaskan trade-off antara kecepatan implementasi, biaya operasional, dan keandalan sistem',
          'Mematuhi tata kelola privasi data, audit trail integritas, dan regulasi kepatuhan industri'
        ],
        status: 'Aktif',
        updatedAt: '2026-11-02'
      }
    ];
  }, []);

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
  }, []);

  const mapBankQuestion = (question: any, index: number): QuestionItem => {
    const typeMap: Record<string, QuestionItem['type']> = {
      'Pilihan Ganda': 'single',
      'Multi-Select': 'multi',
      'Isian Singkat': 'short',
      'Esai': 'essay',
      'Matching': 'matching'
    };
    return {
      id: index + 1,
      type: typeMap[question.type] || 'single',
      text: question.text || '',
      competency: question.competency || 'General',
      difficulty: question.difficulty || 'Sedang',
      options: (question.options || []).map((option: any) => ({
        key: option.key,
        label: option.text || option.label || '',
        isCorrect: Boolean(option.isCorrect)
      })),
      matchingPairs: [],
      codeSnippet: null,
      explanation: question.explanation || '',
      weight: 1
    } as unknown as QuestionItem;
  };

  const handleOpenDetailModal = (job: Job) => {
    const program = findProgramByTitle(job.title, job.id);
    let programQuestions = bankSoalQuestions
      .filter((question) => (question.programCode || 'SE-402') === program.id)
      .map(mapBankQuestion);
    if (programQuestions.length === 0 && program.questions && program.questions.length > 0) {
      programQuestions = program.questions;
    }
    const detailProgram = { ...program, questions: programQuestions };
    const materials = getMaterialsForJob(job);
    setSelectedJobDetail({ job, program: detailProgram, materials });
    setDetailTab('soal');
    setQSearch('');
    setQTypeFilter('ALL');
    setQDiffFilter('ALL');
  };

  const filteredQuestions = useMemo(() => {
    if (!selectedJobDetail) return [];
    return selectedJobDetail.program.questions.filter((q) => {
      const matchSearch = 
        !qSearch ||
        q.text.toLowerCase().includes(qSearch.toLowerCase()) ||
        q.competency.toLowerCase().includes(qSearch.toLowerCase()) ||
        (q.explanation && q.explanation.toLowerCase().includes(qSearch.toLowerCase()));
      const matchType = qTypeFilter === 'ALL' || q.type === qTypeFilter;
      const matchDiff = qDiffFilter === 'ALL' || q.difficulty === qDiffFilter;
      return matchSearch && matchType && matchDiff;
    });
  }, [selectedJobDetail, qSearch, qTypeFilter, qDiffFilter]);

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
          title: `${p.title} (${p.companyName})`,
          description: p.description,
          status: 'active',
          interviewDuration: p.durationMinutes,
          interviewPassingScore: p.passingScore,
          createdAt: new Date().toISOString()
        }));
        setJobs(fallbackJobs);
      }
    } catch {
      // Fallback on network or auth error so admin is never left with an empty screen
      const fallbackJobs: Job[] = DEFAULT_ASSESSMENT_PROGRAMS.map((p) => ({
        id: p.id,
        title: `${p.title} (${p.companyName})`,
        description: p.description,
        status: 'active',
        interviewDuration: p.durationMinutes,
        interviewPassingScore: p.passingScore,
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

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setAddError('Judul posisi wajib diisi.');
      return;
    }
    setAddLoading(true);
    setAddError('');
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post('/api/admin/jobs', {
        title: newTitle.trim(),
        description: newDescription.trim(),
        status: newStatus,
        interviewDuration: newDuration === '' ? null : Number(newDuration),
        interviewPassingScore: newPassingScore === '' ? null : Number(newPassingScore),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowAddModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewStatus('active');
      setNewDuration(15);
      setNewPassingScore(70);
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
    setEditTitle(job.title);
    setEditDescription(job.description || '');
    setEditStatus((job.status as 'active' | 'inactive') || 'active');
    setEditDuration(job.interviewDuration ?? 15);
    setEditPassingScore(job.interviewPassingScore ?? 70);
    setEditError('');

    // Muat soal & materi yang sama persis dengan menu "Lihat Soal & Materi"
    // sehingga aksi Ubah bisa melihat dan menyunting konten yang identik.
    const program = findProgramByTitle(job.title, job.id);
    setEditQuestions(JSON.parse(JSON.stringify(program.questions)) as QuestionItem[]);
    setOriginalQuestions(JSON.parse(JSON.stringify(program.questions)) as QuestionItem[]);
    setEditMaterials(JSON.parse(JSON.stringify(getMaterialsForJob(job))) as MasterMateriItem[]);
    setOriginalMaterials(JSON.parse(JSON.stringify(getMaterialsForJob(job))) as MasterMateriItem[]);
    setEditTab('profil');
    setEditingQId(null);
    setEditingMatId(null);
    setEditQSearch('');
    setShowImportPanel(false);
    setImportSourceProgramId(program.id);
    setImportTypeFilter('ALL');
    setImportMode('append');
    setImportFeedback(null);
  };

  const availableBankQuestionsForImport = useMemo(() => {
    if (!importSourceProgramId) return [];
    const sourceQuestions = bankSoalQuestions
      .filter((q) => (q.programCode || 'SE-402') === importSourceProgramId)
      .map(mapBankQuestion);
    if (sourceQuestions.length > 0) return sourceQuestions;
    const fallbackProg = allProgramsList.find((p) => p.id === importSourceProgramId);
    return fallbackProg?.questions || [];
  }, [importSourceProgramId, bankSoalQuestions, allProgramsList]);

  const countByImportType = useMemo(() => {
    const counts: Record<string, number> = { single: 0, multi: 0, short: 0, essay: 0, matching: 0 };
    availableBankQuestionsForImport.forEach((q) => {
      if (counts[q.type] !== undefined) counts[q.type]++;
    });
    return counts;
  }, [availableBankQuestionsForImport]);

  const filteredImportQuestions = useMemo(() => {
    if (importTypeFilter === 'ALL') return availableBankQuestionsForImport;
    return availableBankQuestionsForImport.filter((q) => q.type === importTypeFilter);
  }, [availableBankQuestionsForImport, importTypeFilter]);

  const handleExecuteImport = async () => {
    if (!editingJob || filteredImportQuestions.length === 0) return;
    const program = findProgramByTitle(editTitle.trim() || editingJob.title, editingJob.id);

    let nextList: QuestionItem[] = [];
    if (importMode === 'replace') {
      nextList = filteredImportQuestions.map((q, idx) => ({ ...q, id: idx + 1 }));
    } else {
      const existingTexts = new Set(editQuestions.map((q) => q.text.trim().toLowerCase()));
      const toAdd = filteredImportQuestions.filter((q) => !existingTexts.has(q.text.trim().toLowerCase()));
      if (toAdd.length === 0) {
        setImportFeedback({
          type: 'info',
          message: `Semua butir soal bertipe "${importTypeFilter === 'ALL' ? 'Semua Tipe' : questionTypeLabel(importTypeFilter as any)}" dari program sumber sudah ada pada formasi ini.`
        });
        return;
      }
      nextList = [...editQuestions, ...toAdd].map((q, idx) => ({ ...q, id: idx + 1 }));
    }

    setEditQuestions(nextList);
    try {
      await syncQuestionsToServer(program.id, nextList);
      setImportFeedback({
        type: 'success',
        message: `Berhasil mengimpor ${importMode === 'replace' ? nextList.length : (nextList.length - editQuestions.length)} butir soal (${importTypeFilter === 'ALL' ? 'Semua Tipe' : questionTypeLabel(importTypeFilter as any)}). Total ${nextList.length} soal aktif.`
      });
      setShowImportPanel(false);
    } catch {
      setImportFeedback({
        type: 'error',
        message: 'Soal berhasil dimuat ke editor, tetapi sinkronisasi ke server mengalami kendala.'
      });
    }
  };

  const syncQuestionsToServer = async (programCode: string, questions: QuestionItem[]) => {
    const token = localStorage.getItem('adminToken');
    const payload = questions.map((question) => {
      const options = question.options || [];
      let correctAnswer: unknown = null;
      if (question.type === 'single') correctAnswer = options.find((option) => option.isCorrect)?.key ?? null;
      else if (question.type === 'multi') correctAnswer = options.filter((option) => option.isCorrect).map((option) => option.key);
      else if (question.type === 'short') correctAnswer = options[0]?.label ?? null;
      else if (question.type === 'matching') correctAnswer = question.matchingPairs || [];
      return {
        type: question.type,
        text: question.text,
        competency: question.competency,
        difficulty: question.difficulty,
        options,
        matchingPairs: question.matchingPairs || [],
        correctAnswer,
        points: 1
      };
    });
    await axios.post(`/api/admin/programs/${programCode}/questions/sync`, { questions: payload }, {
      headers: { Authorization: `Bearer ${token}` }
    });
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
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/admin/jobs/${editingJob.id}`, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        status: editStatus,
        interviewDuration: editDuration === '' ? null : Number(editDuration),
        interviewPassingScore: editPassingScore === '' ? null : Number(editPassingScore),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Persist bank soal ke katalog asesmen (langsung dipakai lembar ujian CAT
      // peserta & menu Lihat Soal & Materi) dan materi ke override per formasi.
      try {
        const program = findProgramByTitle(editTitle.trim(), editingJob.id);
        upsertProgram({ ...program, questions: editQuestions, totalQuestions: editQuestions.length });
        await syncQuestionsToServer(program.id, editQuestions);
        const overrides = getJobMateriOverrides();
        overrides[editingJob.id] = editMaterials;
        localStorage.setItem(MATERI_OVERRIDES_KEY, JSON.stringify(overrides));
      } catch (persistErr) {
        console.warn('Gagal menyimpan edit soal/materi formasi:', persistErr);
      }

      setEditingJob(null);
      Swal.fire({
        icon: 'success',
        title: 'Formasi Diperbarui',
        text: 'Konfigurasi, bank soal CAT, dan silabus materi diperbarui. Perubahan langsung berlaku di portal peserta.',
        timer: 2200,
        showConfirmButton: false
      });
      fetchJobs();
    } catch (err: unknown) {
      setEditError(axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal memperbarui lowongan.' : 'Gagal memperbarui lowongan.');
    } finally {
      setEditLoading(false);
    }
  };

  // ─── Handler edit bank soal & materi (tab di modal Ubah) ───
  const updateEditQuestion = (qid: number, patch: Partial<QuestionItem>) => {
    setEditQuestions((prev) => prev.map((q) => (q.id === qid ? { ...q, ...patch } : q)));
  };

  const updateEditOption = (qid: number, optKey: string, patch: { label?: string; isCorrect?: boolean }, exclusive = false) => {
    setEditQuestions((prev) => prev.map((q) => {
      if (q.id !== qid || !q.options) return q;
      return {
        ...q,
        options: q.options.map((o) => {
          if (o.key === optKey) return { ...o, ...patch };
          if (exclusive && patch.isCorrect) return { ...o, isCorrect: false };
          return o;
        }),
      };
    }));
  };

  const handleAddQuestion = () => {
    const nextId = editQuestions.reduce((max, q) => Math.max(max, q.id), 0) + 1;
    setEditQuestions((prev) => [
      ...prev,
      {
        id: nextId,
        type: 'single',
        competency: 'Umum',
        difficulty: 'Sedang',
        text: '',
        options: [
          { key: 'A', label: '', isCorrect: true },
          { key: 'B', label: '' },
          { key: 'C', label: '' },
          { key: 'D', label: '' },
        ],
      },
    ]);
    setEditingQId(nextId);
  };

  const handleDeleteQuestion = (qid: number) => {
    setEditQuestions((prev) => prev.filter((q) => q.id !== qid));
    if (editingQId === qid) setEditingQId(null);
  };

  const resetQuestionToOriginal = (qid: number) => {
    const original = originalQuestions.find((oq) => oq.id === qid);
    if (!original) return;
    setEditQuestions((prev) => prev.map((q) => (q.id === qid ? (JSON.parse(JSON.stringify(original)) as QuestionItem) : q)));
    setEditingQId(null);
  };

  const updateEditMaterial = (mid: string, patch: Partial<MasterMateriItem>) => {
    setEditMaterials((prev) => prev.map((m) => (m.id === mid ? { ...m, ...patch } : m)));
  };

  const resetMaterialToOriginal = (mid: string) => {
    const original = originalMaterials.find((om) => om.id === mid);
    if (!original) return;
    setEditMaterials((prev) => prev.map((m) => (m.id === mid ? (JSON.parse(JSON.stringify(original)) as MasterMateriItem) : m)));
    setEditingMatId(null);
  };

  const editVisibleQuestions = useMemo(() => {
    if (!editQSearch) return editQuestions;
    const t = editQSearch.toLowerCase();
    return editQuestions.filter(
      (q) =>
        q.text.toLowerCase().includes(t) ||
        q.competency.toLowerCase().includes(t) ||
        (q.explanation || '').toLowerCase().includes(t)
    );
  }, [editQuestions, editQSearch]);

  // Distribusi tipe soal dinamis (dipakai ribbon pada modal Lihat Soal & Materi)
  const detailQuestionCounts = useMemo(() => {
    const qs = selectedJobDetail?.program.questions ?? [];
    return {
      total: qs.length,
      single: qs.filter((q) => q.type === 'single').length,
      multi: qs.filter((q) => q.type === 'multi').length,
      matching: qs.filter((q) => q.type === 'matching').length,
      short: qs.filter((q) => q.type === 'short').length,
      essay: qs.filter((q) => q.type === 'essay').length,
    };
  }, [selectedJobDetail]);

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

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 font-sans">
      {/* Telemetry Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card elevation="flat" className="p-4.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Formasi Lowongan
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-ink">
              {jobs.length}
            </span>
            <span className="text-xs text-muted-slate">Posisi Dibuka</span>
          </div>
        </Card>

        <Card elevation="flat" className="p-4.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Lowongan Aktif
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-success-green">
              {activeCount}
            </span>
            <span className="text-xs text-success-green font-medium">Menerima Pelamar</span>
          </div>
        </Card>

        <Card elevation="flat" className="p-4.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Rata-rata Passing Score
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-primary-navy">
              {avgPassingScore}%
            </span>
            <span className="text-xs text-muted-slate">Ambang Kelulusan</span>
          </div>
        </Card>

        <Card elevation="flat" className="p-4.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Formasi Arsip / Nonaktif
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-700">
              {inactiveCount}
            </span>
            <span className="text-xs text-muted-slate">Ditutup</span>
          </div>
        </Card>
      </div>

      {/* Control & Filter Ledger Bar */}
      <Card elevation="flat" className="p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-none sm:max-w-md">
            <Input
              placeholder="Cari judul lowongan atau keahlian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-sans">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-md transition-colors font-medium cursor-pointer ${
                statusFilter === 'ALL' 
                  ? 'bg-white text-slate-900 font-bold shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({jobs.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-md transition-colors font-medium cursor-pointer ${
                statusFilter === 'active' 
                  ? 'bg-white text-emerald-800 font-bold shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aktif ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-md transition-colors font-medium cursor-pointer ${
                statusFilter === 'inactive' 
                  ? 'bg-white text-slate-800 font-bold shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nonaktif ({inactiveCount})
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchJobs}
            title="Refresh Data"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Segarkan
          </Button>
          <span className="hidden xl:inline text-[11px] text-slate-500">11 program default tersimpan otomatis di database</span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Buat Lowongan Baru
          </Button>
        </div>
      </Card>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Jobs Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 text-center">#</TableHead>
            <TableHead>Formasi Lowongan</TableHead>
            <TableHead>Konfigurasi Interview AI</TableHead>
            <TableHead>Status Perekrutan</TableHead>
            <TableHead>Tanggal Rilis</TableHead>
            <TableHead className="text-right">Opsi Pengelolaan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-slate-400 font-sans text-sm">
                Memuat daftar formasi lowongan...
              </TableCell>
            </TableRow>
          ) : filteredJobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-14 text-center">
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-11 h-11 rounded-full bg-slate-100 text-muted-slate flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-ink">Belum ada lowongan</p>
                  <p className="text-xs text-muted-slate">Tidak ada lowongan yang sesuai kriteria filter. Ubah filter atau tambah formasi baru.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredJobs.map((job, idx) => (
              <TableRow key={job.id}>
                <TableCell className="text-center font-mono text-muted-slate">
                  {(idx + 1).toString().padStart(2, '0')}
                </TableCell>
                <TableCell className="max-w-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-soft-blue border border-accent-border flex items-center justify-center text-primary-navy shrink-0 mt-0.5">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 leading-snug">{job.title}</div>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 font-sans">
                        {job.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(job)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3 text-blue-600" />
                          {getBankQuestionCountForJob(job)} Soal CAT
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenDetailModal(job);
                            setDetailTab('materi');
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors cursor-pointer"
                        >
                          <Layers className="w-3 h-3 text-emerald-600" />
                          Silabus & Rubrik BARS
                        </button>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono text-xs">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {job.interviewDuration ? `${job.interviewDuration}m` : '15m'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary-navy bg-soft-blue border border-accent-border px-2 py-0.5 rounded font-bold font-mono text-xs">
                      <Target className="w-3 h-3 text-primary-navy" />
                      Pass: {job.interviewPassingScore !== null ? `${job.interviewPassingScore}%` : '70%'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={job.status === 'active' ? 'success' : 'neutral'}
                    format="soft"
                    hasDot={job.status === 'active'}
                  >
                    {job.status === 'active' ? 'AKTIF' : 'NONAKTIF'}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-500 whitespace-nowrap text-xs">
                  {new Date(job.createdAt).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => handleOpenDetailModal(job)}
                      leftIcon={<Eye className="w-3 h-3" />}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs"
                      title={`Lihat ${getBankQuestionCountForJob(job)} soal ujian CAT dan silabus materi untuk formasi ini`}
                    >
                      Lihat Soal & Materi
                    </Button>
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => openEditModal(job)}
                      leftIcon={<Edit2 className="w-3 h-3" />}
                    >
                      Ubah
                    </Button>
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => handleDeleteJob(job.id, job.title)}
                      leftIcon={<Trash2 className="w-3 h-3" />}
                    >
                      Hapus
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

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

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              Status Formasi
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as 'active' | 'inactive')}
              className="w-full h-11 px-3.5 py-2 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy cursor-pointer"
            >
              <option value="active">Aktif (Terbuka untuk Pendaftaran)</option>
              <option value="inactive">Nonaktif (Arsip Internal)</option>
            </select>
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

      {/* Ubah Formasi Modal — Konfigurasi + Bank Soal + Materi (tampil sama dengan Lihat Soal & Materi, tapi bisa disunting) */}
      {editingJob && (
        <Modal
          isOpen={!!editingJob}
          onClose={() => setEditingJob(null)}
          title="Ubah Konfigurasi, Bank Soal & Materi Formasi"
          description={`Kelola parameter evaluasi, bank soal CAT, dan silabus materi untuk ${editingJob.title}.`}
          size="5xl"
        >
          {/* Tab Selector */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              type="button"
              onClick={() => setEditTab('profil')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                editTab === 'profil' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Edit2 className="w-4 h-4" />
              <span>Konfigurasi Formasi</span>
            </button>
            <button
              type="button"
              onClick={() => setEditTab('soal')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                editTab === 'soal' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Bank Soal CAT ({editQuestions.length} Soal)</span>
            </button>
            <button
              type="button"
              onClick={() => setEditTab('materi')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                editTab === 'materi' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Silabus & Materi ({editMaterials.length} Modul)</span>
            </button>
          </div>

          <div className="max-h-[68vh] overflow-y-auto pr-1 font-sans space-y-4">
            {/* TAB PROFIL — form selalu terpasang (hidden/tab lain) agar tombol simpan global tetap terhubung */}
            <div className={editTab === 'profil' ? 'block' : 'hidden'}>
              <form id="job-edit-form" onSubmit={handleUpdateJob} className="space-y-4">
                {editError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

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

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Status Formasi</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full h-11 px-3.5 py-2 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy cursor-pointer"
                  >
                    <option value="active">Aktif (Terbuka untuk Pendaftaran)</option>
                    <option value="inactive">Nonaktif (Arsip Internal)</option>
                  </select>
                </div>

                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900 flex items-start gap-2.5">
                  <BookOpen className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Tab <strong>Bank Soal CAT</strong> dan <strong>Silabus &amp; Materi</strong> berisi konten yang sama dengan
                    menu “Lihat Soal &amp; Materi”, namun dapat disunting dan langsung berlaku di lembar ujian peserta.
                  </span>
                </div>
              </form>
            </div>

            {/* TAB SOAL — Bank soal editable (tampilan kartu identik dengan modal Lihat Soal) */}
            {editTab === 'soal' && (() => {
              const editInputCls = 'w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy';
              const labelCls = 'block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5';
              return (
                <div className="space-y-4">
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900 flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-950 text-sm">Bank Soal CAT — {editQuestions.length} Butir Aktif</p>
                      <p className="text-blue-700 text-xs mt-0.5">
                        Soal yang disunting di sini langsung dipakai pada lembar ujian CAT peserta dan tampil identik pada menu
                        “Lihat Soal &amp; Materi”.
                      </p>
                    </div>
                  </div>

                  {importFeedback && (
                    <div
                      className={`p-3.5 rounded-xl border text-sm flex items-center justify-between gap-2 animate-in fade-in ${
                        importFeedback.type === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : importFeedback.type === 'error'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-blue-50 border-blue-200 text-blue-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {importFeedback.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0" />
                        )}
                        <span>{importFeedback.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImportFeedback(null)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant={showImportPanel ? 'primary' : 'outline'}
                      size="md"
                      onClick={() => {
                        setShowImportPanel(!showImportPanel);
                        setImportFeedback(null);
                      }}
                      className="h-11 px-4 text-sm font-semibold rounded-xl"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {showImportPanel ? 'Tutup Panel Import' : 'Import dari Bank Soal CAT'}
                    </Button>
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={editQSearch}
                        onChange={(e) => setEditQSearch(e.target.value)}
                        placeholder="Cari soal untuk diedit..."
                        className="w-full h-11 pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy placeholder:text-slate-400"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={handleAddQuestion}
                      className="h-11 px-4 text-sm font-semibold rounded-xl"
                    >
                      Tambah Soal
                    </Button>
                  </div>

                  {showImportPanel && (
                    <div className="p-4.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-4 shadow-2xs animate-in fade-in duration-150">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-soft-blue text-primary-navy flex items-center justify-center font-bold">
                            <Download className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 font-heading">
                              Panel Import dari Bank Soal CAT
                            </h4>
                            <p className="text-xs text-slate-600">
                              Pilih program sumber dan tipe soal dari Bank Soal CAT untuk diimpor ke formasi ini.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowImportPanel(false)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {/* 1. Sumber Program */}
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
                            1. Program Sumber Bank Soal
                          </label>
                          <select
                            value={importSourceProgramId}
                            onChange={(e) => setImportSourceProgramId(e.target.value)}
                            className="w-full h-11 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-primary-navy font-medium text-slate-800 shadow-2xs cursor-pointer"
                          >
                            {allProgramsList.map((prog) => (
                              <option key={prog.id} value={prog.id}>
                                [{prog.id}] {prog.title.replace(/\s*\([^)]*\)\s*$/, '')} ({prog.companyName})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Dropdown Tipe Soal */}
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
                            2. Dropdown Tipe Soal di Bank Soal CAT *
                          </label>
                          <select
                            value={importTypeFilter}
                            onChange={(e) => setImportTypeFilter(e.target.value)}
                            className="w-full h-11 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-primary-navy font-bold text-primary-navy shadow-2xs cursor-pointer"
                          >
                            <option value="ALL">Semua Tipe Soal ({availableBankQuestionsForImport.length} Butir)</option>
                            <option value="single">Pilihan Ganda ({countByImportType.single || 0} Butir)</option>
                            <option value="multi">Multi-Select / Kompleks ({countByImportType.multi || 0} Butir)</option>
                            <option value="short">Isian Singkat ({countByImportType.short || 0} Butir)</option>
                            <option value="essay">Studi Kasus / Esai ({countByImportType.essay || 0} Butir)</option>
                            <option value="matching">Matching / Menjodohkan ({countByImportType.matching || 0} Butir)</option>
                          </select>
                        </div>

                        {/* 3. Mode Aksi Impor */}
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
                            3. Mode Aksi Impor
                          </label>
                          <select
                            value={importMode}
                            onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')}
                            className="w-full h-11 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-primary-navy font-medium text-slate-800 shadow-2xs cursor-pointer"
                          >
                            <option value="append">Tambahkan ke Soal yang Ada (Append)</option>
                            <option value="replace">Gantikan / Timpa Seluruh Soal (Replace)</option>
                          </select>
                        </div>
                      </div>

                      {/* Footer Panel Import */}
                      <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                        <div className="text-sm text-slate-700">
                          Ditemukan <strong className="text-primary-navy font-bold">{filteredImportQuestions.length}</strong> butir soal siap diimpor
                          {importTypeFilter !== 'ALL' && (
                            <span className="ml-1 text-xs text-slate-500">
                              (hanya bertipe {questionTypeLabel(importTypeFilter as any)})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowImportPanel(false)}
                            className="h-10 px-4 text-sm font-medium rounded-lg"
                          >
                            Batal
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={filteredImportQuestions.length === 0}
                            onClick={handleExecuteImport}
                            leftIcon={<Download className="w-4 h-4" />}
                            className="h-10 px-4 text-sm font-semibold rounded-lg"
                          >
                            Impor {filteredImportQuestions.length} Soal ke Formasi
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3.5">
                    {editVisibleQuestions.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-sm">
                        Tidak ada soal yang cocok dengan pencarian. Tambah soal baru atau ubah kata kunci.
                      </div>
                    ) : (
                      editVisibleQuestions.map((q) => {
                        const isEditing = editingQId === q.id;
                        return (
                          <div
                            key={q.id}
                            className={`p-4.5 rounded-2xl border shadow-2xs space-y-3.5 transition-colors ${
                              isEditing ? 'bg-blue-50/40 border-accent-border' : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {/* Header */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-bold text-sm flex items-center justify-center border border-indigo-200">
                                  #{q.id.toString().padStart(2, '0')}
                                </span>
                                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  {questionTypeLabel(q.type)}
                                </span>
                                <span
                                  className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                                    q.difficulty === 'Sulit'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : q.difficulty === 'Sedang'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  {q.difficulty}
                                </span>
                                <span className="text-xs text-slate-500">{q.competency}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {isEditing ? (
                                  <>
                                    <Button type="button" variant="outline" size="sm" onClick={() => resetQuestionToOriginal(q.id)} className="text-xs">
                                      Batal
                                    </Button>
                                    <Button type="button" variant="primary" size="sm" onClick={() => setEditingQId(null)} className="text-xs font-semibold">
                                      Selesai Edit
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button type="button" variant="secondary" size="sm" leftIcon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => setEditingQId(q.id)} className="text-xs">
                                      Edit Soal
                                    </Button>
                                    <Button type="button" variant="danger" size="sm" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => handleDeleteQuestion(q.id)} className="text-xs">
                                      Hapus
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>

                            {isEditing ? (
                              /* ── Form edit soal ── */
                              <div className="space-y-3.5">
                                <div>
                                  <label className={labelCls}>Teks Soal</label>
                                  <textarea
                                    rows={3}
                                    value={q.text}
                                    onChange={(e) => updateEditQuestion(q.id, { text: e.target.value })}
                                    className={`${editInputCls} leading-relaxed text-sm`}
                                  />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className={labelCls}>Kompetensi Diterapkan</label>
                                    <input
                                      type="text"
                                      value={q.competency}
                                      onChange={(e) => updateEditQuestion(q.id, { competency: e.target.value })}
                                      className={editInputCls}
                                    />
                                  </div>
                                  <div>
                                    <label className={labelCls}>Tipe Soal</label>
                                    <select
                                      value={q.type}
                                      onChange={(e) => updateEditQuestion(q.id, { type: e.target.value as QuestionItem['type'] })}
                                      className={`${editInputCls} h-11 py-2 font-medium cursor-pointer`}
                                    >
                                      <option value="single">Pilihan Ganda</option>
                                      <option value="multi">Multi-Select</option>
                                      <option value="short">Isian Singkat</option>
                                      <option value="essay">Studi Kasus / Esai</option>
                                      <option value="matching">Matching</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className={labelCls}>Tingkat Kesulitan</label>
                                    <select
                                      value={q.difficulty}
                                      onChange={(e) => updateEditQuestion(q.id, { difficulty: e.target.value as QuestionItem['difficulty'] })}
                                      className={`${editInputCls} h-11 py-2 font-medium cursor-pointer`}
                                    >
                                      <option value="Mudah">Mudah</option>
                                      <option value="Sedang">Sedang</option>
                                      <option value="Sulit">Sulit</option>
                                    </select>
                                  </div>
                                </div>

                                {q.codeSnippet && (
                                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto leading-normal">
                                    <code>{q.codeSnippet}</code>
                                  </pre>
                                )}

                                {/* Opsi jawaban (single/multi/matching) */}
                                {q.options && q.options.length > 0 && (
                                  <div className="space-y-2.5">
                                    <span className="text-xs sm:text-sm font-semibold text-slate-700 block">
                                      Opsi Jawaban — centang {q.type === 'multi' ? 'semua jawaban benar (boleh lebih dari satu)' : 'satu jawaban benar'}
                                    </span>
                                    {q.options.map((opt) => (
                                      <div key={opt.key} className="flex items-center gap-2.5">
                                        <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                                          <input
                                            type={q.type === 'multi' ? 'checkbox' : 'radio'}
                                            name={`q-${q.id}-correct`}
                                            checked={!!opt.isCorrect}
                                            onChange={(e) =>
                                              updateEditOption(q.id, opt.key, { isCorrect: e.target.checked }, q.type !== 'multi')
                                            }
                                            className="w-4 h-4 accent-emerald-600 cursor-pointer"
                                          />
                                          <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700">
                                            {opt.key}
                                          </span>
                                        </label>
                                        <input
                                          type="text"
                                          value={opt.label}
                                          onChange={(e) => updateEditOption(q.id, opt.key, { label: e.target.value })}
                                          placeholder={`Teks jawaban ${opt.key}...`}
                                          className="flex-1 h-10 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Matching pairs (read-only) */}
                                {q.matchingPairs && q.matchingPairs.length > 0 && (
                                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                                    <span className="text-xs sm:text-sm font-bold text-slate-800 block">Pasangan Pencocokan Baku:</span>
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

                                {/* Kunci jawaban isian singkat / esai */}
                                {q.type === 'short' || q.type === 'essay' ? (
                                  <div>
                                    <label className={labelCls}>Kunci Jawaban Tepat</label>
                                    <input
                                      type="text"
                                      value={q.correctAnswer || ''}
                                      onChange={(e) => updateEditQuestion(q.id, { correctAnswer: e.target.value })}
                                      className={editInputCls}
                                    />
                                  </div>
                                ) : null}

                                <div>
                                  <label className={labelCls}>Rasional &amp; Pembahasan</label>
                                  <textarea
                                    rows={2}
                                    value={q.explanation || ''}
                                    onChange={(e) => updateEditQuestion(q.id, { explanation: e.target.value })}
                                    className={`${editInputCls} leading-relaxed text-sm`}
                                  />
                                </div>
                              </div>
                            ) : (
                              /* ── Tampilan ringkas (identik modal Lihat Soal & Materi) ── */
                              <div className="space-y-3">
                                <p className="text-sm sm:text-[15px] font-medium text-slate-900 leading-relaxed">{q.text}</p>

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
                                            opt.isCorrect ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-700'
                                          }`}
                                        >
                                          {opt.key}
                                        </span>
                                        <span className="flex-1 leading-relaxed">{opt.label}</span>
                                        {opt.isCorrect && (
                                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md whitespace-nowrap flex items-center gap-1 shrink-0">
                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                            KUNCI
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {q.correctAnswer && (
                                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-900 flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>
                                      <strong>Kunci Jawaban:</strong> {q.correctAnswer}
                                    </span>
                                  </div>
                                )}

                                {q.explanation && (
                                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-sm text-blue-900 flex items-start gap-2.5">
                                    <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                    <span>
                                      <strong className="text-blue-800">Rasional:</strong> {q.explanation}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}

            {/* TAB MATERI — Silabus & materi editable (sumber sama dengan menu Master Materi & Lihat Soal & Materi) */}
            {editTab === 'materi' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-900 flex items-start gap-3">
                  <Layers className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-indigo-950 text-sm">Silabus &amp; Modul Pembelajaran Formasi Ini</p>
                    <p className="text-indigo-700 text-xs mt-0.5">
                      Data sama dengan tab materi pada menu “Lihat Soal &amp; Materi”. Suntingan tersimpan bersama konfigurasi saat menekan
                      <strong> Simpan Semua Perubahan</strong>.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {editMaterials.map((mat) => {
                    const isEditing = editingMatId === mat.id;
                    return (
                      <Card key={mat.id} elevation="flat" className="p-5 border border-slate-200 rounded-2xl space-y-3.5">
                        <div className="flex items-start justify-between gap-3 flex-wrap border-b border-slate-100 pb-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                                {mat.code}
                              </span>
                              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">{mat.type}</span>
                              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                {mat.assessmentLevel}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">v{mat.version}</span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                              Kategori: <strong className="text-slate-700">{mat.category}</strong> • Subkategori: {mat.subcategory || '-'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isEditing ? (
                              <>
                                <Button type="button" variant="outline" size="sm" onClick={() => resetMaterialToOriginal(mat.id)} className="text-xs">
                                  Batal
                                </Button>
                                <Button type="button" variant="primary" size="sm" onClick={() => setEditingMatId(null)} className="text-xs font-semibold">
                                  Selesai Edit
                                </Button>
                              </>
                            ) : (
                              <Button type="button" variant="secondary" size="sm" leftIcon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => setEditingMatId(mat.id)} className="text-xs">
                                Edit Materi
                              </Button>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="space-y-3.5">
                            <div>
                              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Judul Modul</label>
                              <input
                                type="text"
                                value={mat.title}
                                onChange={(e) => updateEditMaterial(mat.id, { title: e.target.value })}
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                              />
                            </div>
                            <div>
                              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Ringkasan Silabus &amp; Pokok Bahasan</label>
                              <textarea
                                rows={3}
                                value={mat.content}
                                onChange={(e) => updateEditMaterial(mat.id, { content: e.target.value })}
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                              />
                            </div>
                            <div>
                              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Panduan Rubrik &amp; Standar Kelulusan Asesor</label>
                              <textarea
                                rows={2}
                                value={mat.rubric}
                                onChange={(e) => updateEditMaterial(mat.id, { rubric: e.target.value })}
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Status Modul</label>
                                <select
                                  value={mat.status || 'Aktif'}
                                  onChange={(e) => updateEditMaterial(mat.id, { status: e.target.value as MasterMateriItem['status'] })}
                                  className="w-full h-11 px-3.5 py-2 text-sm font-medium bg-white border border-slate-300 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                                >
                                  <option value="Aktif">Aktif</option>
                                  <option value="Draft">Draft</option>
                                  <option value="Reviu">Reviu</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <h4 className="text-base font-bold text-slate-900">{mat.title}</h4>
                            <div>
                              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Ringkasan Silabus &amp; Pokok Bahasan</h5>
                              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">{mat.content}</p>
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Panduan Rubrik &amp; Standar Kelulusan Asesor</h5>
                              <p className="text-sm text-slate-700 leading-relaxed bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 text-blue-900">{mat.rubric}</p>
                            </div>
                          </div>
                        )}

                        {mat.behavioralIndicators && mat.behavioralIndicators.length > 0 && (
                          <div>
                            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Indikator Perilaku Baku (Behavioral Indicators)</h5>
                            <div className="space-y-2">
                              {mat.behavioralIndicators.map((ind, i) => (
                                <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  <span className="leading-snug">{ind}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Shared Footer — simpan seluruh tab sekaligus */}
          <div className="pt-3 border-t border-slate-100 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Menyimpan konfigurasi, seluruh bank soal CAT, dan silabus materi sekaligus.
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
                Simpan Semua Perubahan
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
                <span>Silabus & Materi Uji ({selectedJobDetail.materials.length} Modul)</span>
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

            {/* TAB 1: SOAL-SOAL CAT */}
            {detailTab === 'soal' && (
              <div className="space-y-4">
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

                  <div className="flex items-center gap-2.5">
                    <select
                      value={qTypeFilter}
                      onChange={(e) => setQTypeFilter(e.target.value)}
                      className="h-11 px-3.5 py-2 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-primary-navy shadow-2xs cursor-pointer"
                    >
                      <option value="ALL">Semua Tipe Soal</option>
                      <option value="single">Pilihan Ganda</option>
                      <option value="multi">Multi-Select</option>
                      <option value="matching">Matching (Menjodohkan)</option>
                      <option value="short">Isian Singkat</option>
                      <option value="essay">Esai / Studi Kasus</option>
                    </select>

                    <select
                      value={qDiffFilter}
                      onChange={(e) => setQDiffFilter(e.target.value)}
                      className="h-11 px-3.5 py-2 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-primary-navy shadow-2xs cursor-pointer"
                    >
                      <option value="ALL">Semua Tingkat Kesulitan</option>
                      <option value="Mudah">Mudah</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Sulit">Sulit</option>
                    </select>
                  </div>
                </div>

                {/* Question List */}
                <div className="space-y-3.5">
                  {filteredQuestions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-sm">
                      {detailQuestionCounts.total === 0 ? 'Belum ada soal di Bank Soal CAT untuk program ini.' : 'Tidak ada soal yang sesuai dengan kata kunci atau filter yang dipilih.'}
                    </div>
                  ) : (
                    filteredQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="p-4.5 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-colors shadow-2xs space-y-3.5"
                      >
                        {/* Question Header */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
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
