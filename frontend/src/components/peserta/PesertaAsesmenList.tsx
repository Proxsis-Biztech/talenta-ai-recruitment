import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileCheck2,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  PlayCircle,
  Search,
  Filter,
  Check,
  Award,
  Building2,
  Video,
  HelpCircle,
  Sparkles,
  Info,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Play,
  X,
  Laptop,
  AlertCircle,
  BookOpen,
  FileText,
  Lock,
  Layers,
  Code2,
  Terminal,
  Cpu,
  ExternalLink,
  Download,
  ListChecks,
  Eye,
  GraduationCap,
  FileCode,
  Camera,
  UserCheck
} from 'lucide-react';
import { PesertaLayout } from './PesertaLayout';
import { Button, Badge, Card } from '../ui';
import { getActiveSessionUser, getAllPesertaUsers } from '../../services/userRegistryService';
import { getProgramById, getAllPrograms } from '../../services/assessmentCatalog';
import { getPortalToken } from '../../services/portalAuthService';
import { INITIAL_MATERI_LIST, type MasterMateriItem } from '../admin/AdminMasterMateriTree';
import PesertaLiveCodingJudge0 from './PesertaLiveCodingJudge0';

interface AsesmenItem {
  id: string;
  title: string;
  pt: string;
  category: string;
  status: 'belum' | 'berjalan' | 'selesai';
  badgeStatus: string;
  badgeVariant: 'teal' | 'navy' | 'warning' | 'neutral';
  duration: string;
  questions: string;
  passingScore: number;
  deadline: string;
  progress: number;
  currentStageNumber: number; // 1: Cek Perangkat, 2: CAT, 3: Wawancara, 4: Selesai
  score?: number;
  description: string;
  isAssigned?: boolean;
  interviewInfo: {
    assessorName: string;
    mode: string;
    duration: string;
    timing: string;
    correlationNote: string;
  };
}

export default function PesertaAsesmenList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProgramId = searchParams.get('id');
  const urlTab = searchParams.get('tab') as 'materi' | 'ujian' | 'coding' | null;

  // Active LMS tab: 1. Materi & Silabus, 2. Ujian Teknis (CAT & Code), 3. Wawancara Asesor
  const [activeLmsTab, setActiveLmsTab] = useState<'materi' | 'ujian' | 'wawancara'>(() => {
    if (urlTab === 'ujian' || (urlTab as any) === 'wawancara') return urlTab as any;
    if (urlTab === 'coding') return 'ujian';
    return 'materi';
  });


  const [filter, setFilter] = useState<'semua' | 'aktif' | 'selesai'>('semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Course materials state for LMS view
  const [materials, setMaterials] = useState<MasterMateriItem[]>([]);
  const [selectedModule, setSelectedModule] = useState<MasterMateriItem | null>(null);
  const [completedModules, setCompletedModules] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('peserta_completed_modules');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [materiSearch, setMateriSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<'semua' | 'belum' | 'selesai'>('semua');
  const [openSections, setOpenSections] = useState<{
    materi: boolean;
    ujian: boolean;
    wawancara: boolean;
  }>(() => ({
    materi: urlTab !== 'ujian' && urlTab !== 'coding' && (urlTab as any) !== 'wawancara',
    ujian: urlTab === 'ujian' || urlTab === 'coding',
    wawancara: (urlTab as any) === 'wawancara'
  }));
  const [activeModalModule, setActiveModalModule] = useState<MasterMateriItem | null>(null);
  const [showLiveCoding, setShowLiveCoding] = useState(false);

  const activeUser = useMemo(() => getActiveSessionUser(), []);
  const activeProg = useMemo(() => {
    return (
      getProgramById(activeUser.assessmentId || 'BMRI-DATA-02') ||
      ({
        id: activeUser.assessmentId || 'BMRI-DATA-02',
        title: activeUser.assessmentTitle || 'Lead Data Engineer & Concurrency Specialist (PT Bank Mandiri Tbk)',
        companyName: activeUser.companyName || 'PT Bank Mandiri (Persero) Tbk',
        category: 'Program Asesmen',
        description:
          'Evaluasi menyeluruh mencakup arsitektur streaming terdistribusi, Lakehouse tuning, Apache Spark/Kafka, idempotensi data finansial berkapasitas tinggi, dan integritas wawancara.',
        durationMinutes: 90,
        passingScore: 70,
        totalQuestions: 40,
        gradeLevel: activeUser.gradeLevel || 'Grade B (Specialist / Mid)'
      } as any)
    );
  }, [activeUser.assessmentId, activeUser.assessmentTitle, activeUser.companyName, activeUser.gradeLevel]);

  const [serverExam, setServerExam] = useState<{ status?: string; score?: number | null } | null>(null);
  const [serverInterview, setServerInterview] = useState<{ status?: string; score?: number | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = getPortalToken();
    if (!token) return;
    axios
      .get('/api/portal/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (cancelled) return;
        setServerExam(response.data?.exam || null);
        setServerInterview(response.data?.interview || null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch materials for current program
  useEffect(() => {
    let cancelled = false;
    const token = getPortalToken();

    const loadLocalMaterials = () => {
      let savedList: MasterMateriItem[] = [];
      try {
        const stored = localStorage.getItem('talenta_master_materi_table_v2');
        if (stored) savedList = JSON.parse(stored);
      } catch {}

      const pool = savedList.length > 0 ? savedList : INITIAL_MATERI_LIST;
      const currentProgId = selectedProgramId || activeProg.id;
      let matched = pool.filter(
        (m) =>
          m.code === currentProgId ||
          (activeProg.companyName && m.companyName.toLowerCase().includes(activeProg.companyName.toLowerCase().slice(0, 8)))
      );
      if (matched.length === 0) {
        matched = pool.slice(0, 4);
      }
      setMaterials(matched);
      if (matched.length > 0 && !selectedModule) {
        setSelectedModule(matched[0]);
      }
    };

    if (token) {
      axios
        .get('/api/portal/materials', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          if (cancelled) return;
          if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
            setMaterials(res.data.data);
            setSelectedModule(res.data.data[0]);
          } else {
            loadLocalMaterials();
          }
        })
        .catch(() => {
          if (!cancelled) loadLocalMaterials();
        });
    } else {
      loadLocalMaterials();
    }

    return () => {
      cancelled = true;
    };
  }, [activeProg.id, activeProg.companyName, selectedProgramId]);

  const isCatCompleted = useMemo(() => {
    return (
      ['submitted', 'graded', 'completed'].includes(String(serverExam?.status || '')) ||
      ['scheduled', 'called', 'completed'].includes(String(serverInterview?.status || '')) ||
      localStorage.getItem('talenta_cat_completed') === 'true'
    );
  }, [serverExam?.status, serverInterview?.status]);

  const isInterviewCompleted = serverInterview?.status === 'completed';

  // Sync tab with URL & enforce sequential progression
  useEffect(() => {
    if (urlTab && ['materi', 'ujian', 'wawancara'].includes(urlTab)) {
      setActiveLmsTab(urlTab as any);
    } else if (urlTab === 'coding') {
      setActiveLmsTab('ujian');
    }
  }, [urlTab]);

  const handleTabChange = (tab: 'materi' | 'ujian' | 'wawancara') => {
    setActiveLmsTab(tab);
    searchParams.set('tab', tab);
    setSearchParams(searchParams, { replace: true });
  };

  // Comprehensive list of assessment cards ASSIGNED specifically to this candidate
  const programs: AsesmenItem[] = useMemo(() => {
    // 1. Find all program IDs assigned to the active candidate
    const allPeserta = getAllPesertaUsers();
    const currentPeserta = allPeserta.find(
      (p) =>
        (activeUser.id && p.id === activeUser.id) ||
        (activeUser.username && p.username.toLowerCase() === activeUser.username.toLowerCase())
    );

    const assignedIds = new Set<string>();
    if (activeProg?.id) assignedIds.add(activeProg.id);
    if (activeUser?.assessmentId) assignedIds.add(activeUser.assessmentId);
    if (activeUser?.assignedProgramIds && Array.isArray(activeUser.assignedProgramIds)) {
      activeUser.assignedProgramIds.forEach((id) => assignedIds.add(id));
    }
    if (currentPeserta?.assessmentId) assignedIds.add(currentPeserta.assessmentId);
    if (currentPeserta?.assignedProgramIds && Array.isArray(currentPeserta.assignedProgramIds)) {
      currentPeserta.assignedProgramIds.forEach((id) => assignedIds.add(id));
    }

    const allCatalog = getAllPrograms();
    const items: AsesmenItem[] = [];

    assignedIds.forEach((pId) => {
      const isPrimary = pId === activeProg.id;
      const catalogData = allCatalog.find((c) => c.id === pId);

      if (isPrimary) {
        items.push({
          id: activeProg.id,
          title: activeProg.title,
          pt: activeProg.companyName,
          category: activeProg.category,
          status: isInterviewCompleted ? 'selesai' : isCatCompleted ? 'berjalan' : 'belum',
          badgeStatus: isInterviewCompleted
            ? 'Selesai • Hasil Wawancara Tersedia'
            : isCatCompleted
            ? 'CAT Selesai • Menuju Wawancara'
            : 'Sesi Aktif • Siap Dimulai',
          badgeVariant: isInterviewCompleted ? 'teal' : isCatCompleted ? 'navy' : 'warning',
          duration: `${activeProg.durationMinutes} Menit`,
          questions: `${activeProg.totalQuestions} Soal CAT`,
          passingScore: activeProg.passingScore,
          deadline: 'Hari ini, 23:59 WIB',
          progress: isInterviewCompleted ? 100 : isCatCompleted ? 60 : 25,
          currentStageNumber: isInterviewCompleted ? 4 : isCatCompleted ? 3 : 2,
          score: serverInterview?.score ?? serverExam?.score ?? undefined,
          description: activeProg.description,
          isAssigned: true,
          interviewInfo: {
            assessorName: 'Dr. Ir. Dwi Hartanto, M.Kom / Ava AI',
            mode: 'Live Video & Audio Interaktif',
            duration: '45 Menit',
            timing: 'Dilakukan setelah lulus/submit ujian CAT & Live Coding',
            correlationNote:
              'Asesor akan memvalidasi penalaran studi kasus yang Anda jawab di lembar CAT serta menguji arsitektur kode di live coding.'
          }
        });
      } else if (catalogData) {
        items.push({
          id: catalogData.id,
          title: catalogData.title,
          pt: catalogData.companyName,
          category: catalogData.category,
          status: 'belum',
          badgeStatus: 'Terdaftar • Siap Dimulai',
          badgeVariant: 'warning',
          duration: `${catalogData.durationMinutes} Menit`,
          questions: `${catalogData.totalQuestions} Soal CAT`,
          passingScore: catalogData.passingScore,
          deadline: 'Periode Aktif 2026',
          progress: 0,
          currentStageNumber: 1,
          description: catalogData.description,
          isAssigned: true,
          interviewInfo: {
            assessorName: 'Dewan Asesor Terakreditasi',
            mode: 'Live Video & Audio Interaktif',
            duration: '45 Menit',
            timing: 'Tahap 3 setelah ujian teknis',
            correlationNote: 'Validasi pemahaman silabus, kompetensi BARS, dan kesesuaian formasi.'
          }
        });
      }
    });

    return items;
  }, [activeProg, activeUser, isCatCompleted, isInterviewCompleted, serverInterview?.score, serverExam?.score]);

  // View state: if an ID is present in URL, view that program's LMS room; otherwise, view the Cards Grid!
  const isViewingLmsRoom = Boolean(selectedProgramId);

  const currentProgram = useMemo(() => {
    if (selectedProgramId) {
      return programs.find((p) => p.id === selectedProgramId) || programs[0];
    }
    return programs[0];
  }, [selectedProgramId, programs]);

  const handleSelectProgram = (programId: string) => {
    searchParams.set('id', programId);
    setSearchParams(searchParams);
  };

  const handleBackToCards = () => {
    searchParams.delete('id');
    searchParams.delete('tab');
    setSearchParams(searchParams);
  };

  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      if (filter === 'aktif' && p.status === 'selesai') return false;
      if (filter === 'selesai' && p.status !== 'selesai') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          p.title.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.pt.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [programs, filter, searchQuery]);

  const filteredMaterials = useMemo(() => {
    const q = materiSearch.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        (m.competency && m.competency.toLowerCase().includes(q)) ||
        m.code.toLowerCase().includes(q)
    );
  }, [materials, materiSearch]);

  const toggleModuleCompletion = (modId: string) => {
    const updated = { ...completedModules, [modId]: !completedModules[modId] };
    setCompletedModules(updated);
    try {
      localStorage.setItem('peserta_completed_modules', JSON.stringify(updated));
    } catch {}
  };

  const completedCount = useMemo(() => {
    return materials.filter((m) => completedModules[m.id]).length;
  }, [materials, completedModules]);

  return (
    <PesertaLayout activeTab="asesmen">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-7 space-y-6 antialiased">
        {/* ═══════════════════════════════════════════════════════════
            TAMPILAN 1: LMS MOODLE-STYLE COURSE ROOM (JIKA PROGRAM DIPILIH)
        ═══════════════════════════════════════════════════════════ */}
        {isViewingLmsRoom && currentProgram ? (
          (() => {
            const totalUnits = (materials.length || 0) + 3; // materi + 2 tes teknis + 1 wawancara
            const doneUnits =
              completedCount +
              (isCatCompleted ? 1 : 0) +
              (isInterviewCompleted ? 1 : 0);
            const overallPct = Math.round((doneUnits / (totalUnits || 1)) * 100);

            const visibleMaterials = filteredMaterials.filter((item) => {
              const isDone = Boolean(completedModules[item.id]);
              if (moduleFilter === 'selesai') return isDone;
              if (moduleFilter === 'belum') return !isDone;
              return true;
            });

            const toggleSection = (key: 'materi' | 'ujian' | 'wawancara') => {
              setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
            };

            return (
              <div className="max-w-5xl mx-auto space-y-5 animate-fadeIn">
                {/* Back & Switcher subtle bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleBackToCards}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0F275C] transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali ke Daftar Asesmen</span>
                  </button>

                  {programs.length > 1 && (
                    <select
                      value={currentProgram.id}
                      onChange={(e) => handleSelectProgram(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-700 text-xs rounded-full px-3.5 py-1.5 font-medium outline-hidden focus:border-[#0F275C] cursor-pointer shadow-2xs"
                    >
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id} — {p.title.length > 38 ? p.title.slice(0, 38) + '...' : p.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* ─── Dark Navy Hero Banner ─── */}
                <div className="rounded-3xl bg-gradient-to-br from-[#0F275C] via-[#132F6B] to-[#0B1D47] p-6 sm:p-8 text-white shadow-md">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold bg-white/10 border border-white/15 text-blue-100 px-3 py-1 rounded-full">
                          {currentProgram.id}
                        </span>
                        <span className="text-[11px] font-semibold bg-white/10 border border-white/15 text-blue-100 px-3 py-1 rounded-full">
                          {currentProgram.pt}
                        </span>
                        <span className="text-[11px] font-semibold bg-white/10 border border-white/15 text-blue-100 px-3 py-1 rounded-full">
                          {currentProgram.category}
                        </span>
                      </div>

                      <h1 className="text-2xl sm:text-3xl font-extrabold font-heading leading-tight tracking-tight">
                        {currentProgram.title}
                      </h1>

                      <p className="text-xs sm:text-sm text-blue-100/80 max-w-2xl leading-relaxed">
                        {currentProgram.description}
                      </p>
                    </div>

                    {/* Progres Asesmen Glass Card */}
                    <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 min-w-[240px] shrink-0 space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-bold tracking-wider uppercase text-blue-200">
                        <span>Progres Asesmen</span>
                        <span className="text-white font-extrabold">{overallPct}%</span>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${overallPct}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white/10 rounded-xl py-2 px-1.5 border border-white/10">
                          <span className="block text-sm font-extrabold text-white">
                            {completedCount}/{materials.length}
                          </span>
                          <span className="text-[10px] text-blue-200">Materi</span>
                        </div>
                        <div className="bg-white/10 rounded-xl py-2 px-1.5 border border-white/10">
                          <span className="block text-sm font-extrabold text-white">
                            {isCatCompleted ? '1/2' : '0/2'}
                          </span>
                          <span className="text-[10px] text-blue-200">Tes Teknis</span>
                        </div>
                        <div className="bg-white/10 rounded-xl py-2 px-1.5 border border-white/10">
                          <span className="block text-sm font-extrabold text-white">
                            {isInterviewCompleted ? '1/1' : '0/1'}
                          </span>
                          <span className="text-[10px] text-blue-200">Wawancara</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── Filter Pills & Search Row ─── */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    {[
                      { key: 'semua', label: 'Semua' },
                      { key: 'belum', label: 'Belum Selesai' },
                      { key: 'selesai', label: 'Selesai' }
                    ].map((pill) => {
                      const active = moduleFilter === pill.key;
                      return (
                        <button
                          key={pill.key}
                          type="button"
                          onClick={() => setModuleFilter(pill.key as 'semua' | 'belum' | 'selesai')}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#0F275C] text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {pill.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={materiSearch}
                      onChange={(e) => setMateriSearch(e.target.value)}
                      placeholder="Cari modul atau kompetensi..."
                      className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F275C]"
                    />
                  </div>
                </div>

                {/* ─── Section 1: Materi & Materi Silabus ─── */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('materi')}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-blue-50 text-[#0F275C] font-extrabold text-xs flex items-center justify-center shrink-0">
                        1
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                          Materi &amp; Materi Silabus
                        </h2>
                        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500 mt-0.5">
                          <span>{materials.length} modul • baca mandiri</span>
                          <span>
                            {completedCount}/{materials.length} selesai
                          </span>
                          <span className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden inline-block">
                            <span
                              className="block h-full bg-emerald-500 rounded-full"
                              style={{
                                width: `${Math.round((completedCount / (materials.length || 1)) * 100)}%`
                              }}
                            />
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                          completedCount === materials.length && materials.length > 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {completedCount === materials.length && materials.length > 0
                          ? 'SELESAI'
                          : 'SEDANG BERJALAN'}
                      </span>
                      {openSections.materi ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {openSections.materi && (
                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                      {visibleMaterials.length === 0 ? (
                        <div className="px-5 py-8 text-center text-xs text-slate-400">
                          Tidak ada modul yang sesuai dengan filter saat ini.
                        </div>
                      ) : (
                        visibleMaterials.map((item) => {
                          const isDone = Boolean(completedModules[item.id]);
                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                setSelectedModule(item);
                                setActiveModalModule(item);
                              }}
                              className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
                            >
                              <div className="flex items-start gap-3.5 min-w-0">
                                {isDone ? (
                                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                                    <Check className="w-3.5 h-3.5" />
                                  </span>
                                ) : (
                                  <span className="w-6 h-6 rounded-full border-2 border-amber-400 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                                    <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                                  </span>
                                )}

                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                      {item.type || 'MODUL'}
                                    </span>
                                    {isDone && (
                                      <span className="text-[11px] font-semibold text-slate-500">
                                        Selesai
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                                    {item.title}
                                  </h3>
                                  <p className="text-xs text-slate-500 line-clamp-1">
                                    {item.content}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                                    <span>{item.competency || item.category}</span>
                                    <span>{(item as any).duration || '15 menit'}</span>
                                    <span className="font-mono">
                                      {item.code} • {item.version || 'v2.1'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 flex justify-end">
                                {isDone ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedModule(item);
                                      setActiveModalModule(item);
                                    }}
                                    className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                                  >
                                    Review
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleModuleCompletion(item.id);
                                    }}
                                    className="px-4 py-1.5 rounded-lg bg-[#0F275C] hover:bg-[#16367d] text-white text-xs font-bold cursor-pointer shadow-2xs"
                                  >
                                    Tandai Selesai
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* ─── Section 2: Ujian Teknis (CAT & Live Code) ─── */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('ujian')}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-blue-50 text-[#0F275C] font-extrabold text-xs flex items-center justify-center shrink-0">
                        2
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                          Ujian Teknis (CAT &amp; Live Code)
                        </h2>
                        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500 mt-0.5">
                          <span>2 sesi • terjadwal</span>
                          <span>{isCatCompleted ? '1/2' : '0/2'} selesai</span>
                          <span className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden inline-block">
                            <span
                              className="block h-full bg-emerald-500 rounded-full"
                              style={{ width: isCatCompleted ? '50%' : '0%' }}
                            />
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                          isCatCompleted
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-blue-50 text-[#0F275C]'
                        }`}
                      >
                        {isCatCompleted ? 'CAT SELESAI' : 'SIAP DIKERJAKAN'}
                      </span>
                      {openSections.ujian ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {openSections.ujian && (
                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                      {/* Row 2.1: Ujian CAT */}
                      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          {isCatCompleted ? (
                            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded-full border-2 border-amber-400 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                              <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                            </span>
                          )}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                UJIAN CAT
                              </span>
                              {isCatCompleted && (
                                <span className="text-[11px] font-semibold text-emerald-700">
                                  Selesai • Jawaban Tersimpan
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">
                              Ujian Kompetensi Teknis (Computer Assisted Test)
                            </h3>
                            <p className="text-xs text-slate-500">
                              Diawasi AI Proctoring &amp; penyimpanan jawaban otomatis setiap 5 detik.
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                              <span>{currentProgram.questions}</span>
                              <span>{currentProgram.duration}</span>
                              <span>Passing Grade: {currentProgram.passingScore}/100</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 justify-end">
                          {!isCatCompleted && (
                            <button
                              type="button"
                              onClick={() => navigate('/peserta/device-check')}
                              className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                            >
                              Cek Perangkat
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              navigate(isCatCompleted ? '/peserta/hasil' : `/peserta/exam/${currentProgram.id}`)
                            }
                            className="px-4 py-1.5 rounded-lg bg-[#0F275C] hover:bg-[#16367d] text-white text-xs font-bold cursor-pointer shadow-2xs"
                          >
                            {isCatCompleted ? 'Lihat Hasil CAT' : 'Mulai Ujian CAT'}
                          </button>
                        </div>
                      </div>

                      {/* Row 2.2: Live Coding */}
                      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              isCatCompleted
                                ? 'border-2 border-amber-400 text-amber-500'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {isCatCompleted ? (
                              <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                            ) : (
                              <Lock className="w-3 h-3" />
                            )}
                          </span>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              LIVE CODING • JUDGE0
                            </span>
                            <h3 className="text-sm font-bold text-slate-900">
                              Uji Praktik Pemrograman (Live Coding Sandbox)
                            </h3>
                            <p className="text-xs text-slate-500">
                              {isCatCompleted
                                ? 'Sandbox Judge0 aktif. Kerjakan studi kasus algoritma & struktur data.'
                                : 'Terkunci — selesaikan Ujian CAT terlebih dahulu untuk membuka sesi Live Coding.'}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 flex justify-end">
                          {isCatCompleted ? (
                            <button
                              type="button"
                              onClick={() => setShowLiveCoding((v) => !v)}
                              className="px-4 py-1.5 rounded-lg bg-[#0F275C] hover:bg-[#16367d] text-white text-xs font-bold cursor-pointer shadow-2xs"
                            >
                              {showLiveCoding ? 'Tutup Sandbox' : 'Buka Live Coding'}
                            </button>
                          ) : (
                            <span className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold">
                              Terkunci
                            </span>
                          )}
                        </div>
                      </div>

                      {isCatCompleted && showLiveCoding && (
                        <div className="p-5 bg-slate-50/70">
                          <PesertaLiveCodingJudge0 programTitle={currentProgram.title} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ─── Section 3: Sesi Wawancara (Asesor & AI) ─── */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('wawancara')}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-blue-50 text-[#0F275C] font-extrabold text-xs flex items-center justify-center shrink-0">
                        3
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                          Sesi Wawancara (Asesor &amp; AI)
                        </h2>
                        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500 mt-0.5">
                          <span>1 sesi • Live Asesor</span>
                          <span>{isInterviewCompleted ? '1/1' : '0/1'} selesai</span>
                          <span className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden inline-block">
                            <span
                              className="block h-full bg-emerald-500 rounded-full"
                              style={{ width: isInterviewCompleted ? '100%' : '0%' }}
                            />
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                          isInterviewCompleted
                            ? 'bg-emerald-50 text-emerald-700'
                            : isCatCompleted
                              ? 'bg-blue-50 text-[#0F275C]'
                              : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isInterviewCompleted
                          ? 'SELESAI'
                          : isCatCompleted
                            ? 'SIAP MASUK'
                            : 'TERKUNCI'}
                      </span>
                      {openSections.wawancara ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {openSections.wawancara && (
                    <div className="border-t border-slate-100 px-5 py-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            WAWANCARA BARS • 45 MENIT
                          </span>
                          <h3 className="text-sm font-bold text-slate-900">
                            Asesor: {currentProgram.interviewInfo?.assessorName || 'Dewan Asesor Tersertifikasi'}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Validasi penalaran teknis CAT, pembahasan kode, serta evaluasi kompetensi perilaku (BARS 1–5).
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={!isCatCompleted}
                            onClick={() => navigate(`/peserta/waiting-room?id=${currentProgram.id}`)}
                            className={`px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold transition-colors ${
                              isCatCompleted
                                ? 'bg-white hover:bg-slate-50 text-slate-700 cursor-pointer'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            Ruang Tunggu
                          </button>
                          <button
                            type="button"
                            disabled={!isCatCompleted}
                            onClick={() => navigate(`/peserta/wawancara?id=${currentProgram.id}`)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              isCatCompleted
                                ? 'bg-[#0F275C] hover:bg-[#16367d] text-white cursor-pointer shadow-2xs'
                                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {isInterviewCompleted ? 'Wawancara Selesai' : 'Mulai Wawancara'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Helper Caption */}
                <p className="text-center text-xs text-slate-400 pt-1">
                  Klik baris untuk detail modul • tombol aksi mengubah status
                </p>

                {/* Module Detail Reader Modal */}
                {activeModalModule && (
                  <div
                    className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
                    onClick={() => setActiveModalModule(null)}
                  >
                    <div
                      className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/70">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0F275C]">
                              {activeModalModule.type || activeModalModule.category}
                            </span>
                            <span className="font-mono text-xs text-slate-500">
                              {activeModalModule.code} • {activeModalModule.version || 'v2.1'}
                            </span>
                          </div>
                          <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                            {activeModalModule.title}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveModalModule(null)}
                          className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 space-y-1.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F275C]">
                            Pokok Bahasan &amp; Ringkasan Materi
                          </h4>
                          <p className="whitespace-pre-line">{activeModalModule.content}</p>
                        </div>

                        {activeModalModule.rubric && (
                          <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-200/60 space-y-1.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                              Rubrik Penilaian Asesor (BARS)
                            </h4>
                            <p className="text-blue-950">{activeModalModule.rubric}</p>
                          </div>
                        )}

                        {activeModalModule.behavioralIndicators &&
                          activeModalModule.behavioralIndicators.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Indikator Kompetensi yang Diuji
                              </h4>
                              <ul className="space-y-1.5">
                                {activeModalModule.behavioralIndicators.map((ind, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-start gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 text-xs"
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{ind}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>

                      <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveModalModule(null)}
                          className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Tutup
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toggleModuleCompletion(activeModalModule.id);
                            setActiveModalModule(null);
                          }}
                          className="px-5 py-2 rounded-xl bg-[#0F275C] hover:bg-[#16367d] text-white text-xs font-bold cursor-pointer"
                        >
                          {completedModules[activeModalModule.id]
                            ? 'Tandai Belum Selesai'
                            : 'Tandai Selesai'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          /* ═══════════════════════════════════════════════════════════
              TAMPILAN 2: DAFTAR KARTU ASESMEN SAYA (CARDS VIEW)
          ═══════════════════════════════════════════════════════════ */
          <div className="space-y-6 animate-fadeIn">
            {/* ─── Hero Header Asesmen Saya ─── */}
            <div className="bg-gradient-to-r from-primary-navy via-slate-900 to-primary-navy rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xs">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold backdrop-blur-xs text-blue-100">
                    <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                    <span>Portal Peserta Seleksi &amp; Uji Kompetensi</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-heading leading-tight tracking-tight">
                    Asesmen Saya
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                    Daftar program asesmen resmi yang ditugaskan khusus kepada Anda. Masuk ke ruang asesmen untuk membaca master silabus, mengikuti ujian teknis (CAT &amp; Live Coding), dan sesi wawancara tatap muka bersama asesor.
                  </p>
                </div>

                {/* Quick Stats Banner */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 shrink-0 min-w-[240px] space-y-2">
                  <p className="text-xs font-bold text-blue-200">Total Program Terdaftar</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white font-heading">{programs.length}</span>
                    <span className="text-xs text-blue-200">Program Asesmen</span>
                  </div>
                  <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[11px] text-blue-100">
                    <span>{programs.filter((p) => p.status === 'selesai').length} Selesai</span>
                    <span>•</span>
                    <span className="text-emerald-300 font-semibold">
                      {programs.filter((p) => p.status !== 'selesai').length} Aktif / Tersedia
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Search & Status Filter Bar ─── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari judul program, kode (SE-402, BMRI...), instansi, atau topik..."
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-primary-navy rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 transition outline-hidden focus:ring-2 focus:ring-primary-navy/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
                {[
                  { key: 'semua', label: 'Semua Program', count: programs.length },
                  { key: 'aktif', label: 'Aktif / Berjalan', count: programs.filter((p) => p.status !== 'selesai').length },
                  { key: 'selesai', label: 'Selesai', count: programs.filter((p) => p.status === 'selesai').length }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as any)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      filter === tab.key
                        ? 'bg-primary-navy text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        filter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ─── Grid Kartu Asesmen ─── */}
            {filteredPrograms.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Tidak Ada Program Asesmen yang Cocok</h3>
                <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau ganti filter status di atas.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilter('semua');
                  }}
                  className="text-xs font-bold text-primary-navy hover:underline pt-2 cursor-pointer"
                >
                  Reset Filter &amp; Pencarian
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPrograms.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectProgram(item.id)}
                    className="group bg-white rounded-3xl border border-slate-200/90 hover:border-primary-navy/40 p-6 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden"
                  >
                    {item.isAssigned && (
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-2xs flex items-center gap-1">
                        <span>★ Ditugaskan</span>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Header Badges */}
                      <div className="flex items-center justify-between gap-2 pr-16">
                        <span className="font-mono text-xs font-bold text-primary-navy bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
                          {item.id}
                        </span>
                        <Badge variant={item.badgeVariant}>{item.badgeStatus}</Badge>
                      </div>

                      {/* Company & Title */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{item.pt}</span>
                        </p>
                        <h3 className="font-heading font-extrabold text-base text-slate-900 group-hover:text-primary-navy transition-colors mt-1.5 line-clamp-2 leading-snug">
                          {item.title}
                        </h3>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Feature Component Badges */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/70 text-[11px] font-medium text-slate-700 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">Silabus &amp; BARS</span>
                        </div>
                        <div className="bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/70 text-[11px] font-medium text-slate-700 flex items-center gap-1.5">
                          <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{item.questions}</span>
                        </div>
                        <div className="bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/70 text-[11px] font-medium text-slate-700 flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="truncate">Judge0 IDE</span>
                        </div>
                        <div className="bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/70 text-[11px] font-medium text-slate-700 flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">Wawancara AI</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                          <span>Progres Asesmen</span>
                          <span className="font-mono font-bold text-slate-800">{item.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary-navy to-blue-500 rounded-full transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {item.duration}
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectProgram(item.id);
                        }}
                        className="text-xs font-bold rounded-xl py-2 px-3.5 flex items-center gap-1.5 group-hover:bg-slate-800 cursor-pointer shadow-xs"
                      >
                        <span>Masuk ke Ruang Asesmen</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PesertaLayout>
  );
}
