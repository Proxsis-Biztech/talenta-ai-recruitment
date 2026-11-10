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
  GraduationCap
} from 'lucide-react';
import { PesertaLayout } from './PesertaLayout';
import { Button, Badge, Card } from '../ui';
import { getActiveSessionUser } from '../../services/userRegistryService';
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

  // Active LMS tab (materi, ujian CAT, live coding test)
  const [activeLmsTab, setActiveLmsTab] = useState<'materi' | 'ujian' | 'coding'>(
    urlTab === 'coding' ? 'coding' : urlTab === 'materi' ? 'materi' : 'materi'
  );

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

  // Sync tab with URL
  useEffect(() => {
    if (urlTab && ['materi', 'ujian', 'coding'].includes(urlTab)) {
      setActiveLmsTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tab: 'materi' | 'ujian' | 'coding') => {
    setActiveLmsTab(tab);
    searchParams.set('tab', tab);
    setSearchParams(searchParams, { replace: true });
  };

  const isCatCompleted = useMemo(() => {
    return (
      ['submitted', 'graded', 'completed'].includes(String(serverExam?.status || '')) ||
      ['scheduled', 'called', 'completed'].includes(String(serverInterview?.status || '')) ||
      localStorage.getItem('talenta_cat_completed') === 'true'
    );
  }, [serverExam?.status, serverInterview?.status]);

  const isInterviewCompleted = serverInterview?.status === 'completed';

  // Comprehensive list of assessment cards
  const programs: AsesmenItem[] = useMemo(() => {
    // 1. Primary assigned program for active user
    const primaryItem: AsesmenItem = {
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
        assessorName: 'Dr. Ir. Dwi Hartanto, M.Kom / Gemini AI Live',
        mode: 'Live Video & Audio Interaktif',
        duration: '45 Menit',
        timing: 'Dilakukan setelah lulus/submit ujian CAT 40 soal',
        correlationNote:
          'Asesor akan memvalidasi penalaran studi kasus yang Anda jawab di lembar CAT serta mengukur kompetensi perilaku (BARS).'
      }
    };

    // 2. All other assessment programs from the catalog
    const allCatalog = getAllPrograms();
    const otherItems: AsesmenItem[] = allCatalog
      .filter((p) => p.id !== activeProg.id)
      .map((p) => {
        return {
          id: p.id,
          title: p.title,
          pt: p.companyName,
          category: p.category,
          status: 'belum' as const,
          badgeStatus: 'Terdaftar • Siap Dimulai',
          badgeVariant: 'warning' as const,
          duration: `${p.durationMinutes} Menit`,
          questions: `${p.totalQuestions} Soal CAT`,
          passingScore: p.passingScore,
          deadline: 'Periode Aktif 2026',
          progress: 0,
          currentStageNumber: 1,
          description: p.description,
          isAssigned: false,
          interviewInfo: {
            assessorName: 'Dewan Asesor & Gemini AI Live',
            mode: 'Live Video & Audio Interaktif',
            duration: '45 Menit',
            timing: 'Tahap 3 setelah ujian CAT',
            correlationNote: 'Validasi pemahaman silabus, kompetensi BARS, dan kesesuaian formasi.'
          }
        };
      });

    return [primaryItem, ...otherItems];
  }, [activeProg, isCatCompleted, isInterviewCompleted, serverInterview?.score, serverExam?.score]);

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
          <div className="space-y-6 animate-fadeIn">
            {/* ─── Top Navigation Toolbar & Back to Cards ─── */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:px-5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <button
                onClick={handleBackToCards}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-primary-navy text-xs sm:text-sm font-bold transition shadow-2xs cursor-pointer group"
              >
                <ArrowLeft className="w-4 h-4 text-primary-navy group-hover:-translate-x-1 transition-transform" />
                <span>← Kembali ke Daftar Kartu Asesmen</span>
              </button>

              <div className="flex items-center gap-2.5 text-xs">
                <span className="text-slate-500 hidden md:inline">Pindah Program Asesmen:</span>
                <select
                  value={currentProgram.id}
                  onChange={(e) => handleSelectProgram(e.target.value)}
                  className="bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-1.5 font-medium outline-hidden focus:border-primary-navy cursor-pointer shadow-2xs"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.title.length > 40 ? p.title.slice(0, 40) + '...' : p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ─── LMS Top Course Banner (Moodle Inspired) ─── */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="bg-gradient-to-r from-primary-navy via-slate-900 to-primary-navy p-6 sm:p-8 text-white relative">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-xs font-bold bg-white/15 px-3 py-1 rounded-lg border border-white/20 backdrop-blur-xs">
                        {currentProgram.id}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-blue-100 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-blue-300" />
                        {currentProgram.pt}
                      </span>
                      <span className="text-white/40">•</span>
                      <span className="text-xs sm:text-sm text-blue-200">{currentProgram.category}</span>
                      <Badge variant={currentProgram.badgeVariant}>{currentProgram.badgeStatus}</Badge>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold font-heading leading-tight tracking-tight">
                      {currentProgram.title}
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                      {currentProgram.description}
                    </p>
                  </div>

                  {/* Course Progress Card */}
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4.5 min-w-[240px] shrink-0 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-100">
                      <span>Progres Asesmen LMS</span>
                      <span className="font-mono text-emerald-400 font-extrabold">
                        {completedCount > 0 ? Math.round((completedCount / (materials.length || 1)) * 50) + (isCatCompleted ? 50 : 0) : isCatCompleted ? 50 : 15}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            completedCount > 0
                              ? Math.round((completedCount / (materials.length || 1)) * 50) + (isCatCompleted ? 50 : 0)
                              : isCatCompleted ? 50 : 15
                          }%`
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-blue-200 font-medium">
                      <div className="bg-white/5 py-1 px-1.5 rounded-lg border border-white/10">
                        <span className="block font-bold text-white">{completedCount}/{materials.length}</span>
                        <span>Materi</span>
                      </div>
                      <div className="bg-white/5 py-1 px-1.5 rounded-lg border border-white/10">
                        <span className="block font-bold text-white">{isCatCompleted ? 'Lulus' : 'Siap'}</span>
                        <span>Ujian CAT</span>
                      </div>
                      <div className="bg-white/5 py-1 px-1.5 rounded-lg border border-white/10">
                        <span className="block font-bold text-white">Online</span>
                        <span>Live Code</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── LMS Main Navigation Tabs (Moodle Course Hub) ─── */}
              <div className="bg-slate-50/90 px-6 sm:px-8 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 py-3">
                  {/* Tab 1: Materi & Master Silabus */}
                  <button
                    onClick={() => handleTabChange('materi')}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activeLmsTab === 'materi'
                        ? 'bg-primary-navy text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>1. Materi &amp; Master Silabus</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        activeLmsTab === 'materi' ? 'bg-white/20 text-white' : 'bg-blue-50 text-primary-navy'
                      }`}
                    >
                      {materials.length} Modul
                    </span>
                  </button>

                  {/* Tab 2: Ujian Soal CAT */}
                  <button
                    onClick={() => handleTabChange('ujian')}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activeLmsTab === 'ujian'
                        ? 'bg-primary-navy text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>2. Ujian Soal CAT (40 Soal)</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        activeLmsTab === 'ujian'
                          ? 'bg-white/20 text-white'
                          : isCatCompleted
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isCatCompleted ? '✓ Selesai' : 'Siap Mulai'}
                    </span>
                  </button>

                  {/* Tab 3: Live Coding Test (Judge0 Prototype) */}
                  <button
                    onClick={() => handleTabChange('coding')}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activeLmsTab === 'coding'
                        ? 'bg-primary-navy text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Code2 className="w-4 h-4" />
                    <span>3. Live Coding Test</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        activeLmsTab === 'coding' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      Judge0 IDE
                    </span>
                  </button>
                </div>

                {/* Quick Action / Return to Cards View */}
                <button
                  onClick={handleBackToCards}
                  className="text-xs font-semibold text-slate-500 hover:text-primary-navy py-2 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Lihat Semua Kartu Asesmen ({programs.length})</span>
                </button>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                TAB 1: MATERI & MASTER SILABUS (Preview Tampilan Materi)
            ═══════════════════════════════════════════════════════════ */}
            {activeLmsTab === 'materi' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Module Curriculum List */}
                  <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col h-[680px]">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-heading font-bold text-sm text-slate-900 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary-navy" />
                            Silabus &amp; Kurikulum Uji
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {completedCount} dari {materials.length} modul telah selesai dibaca
                          </p>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                          {Math.round((completedCount / (materials.length || 1)) * 100)}%
                        </span>
                      </div>

                      {/* Module search */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={materiSearch}
                          onChange={(e) => setMateriSearch(e.target.value)}
                          placeholder="Cari modul atau kompetensi..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-primary-navy"
                        />
                      </div>
                    </div>

                    {/* Module List Scrollable */}
                    <div className="p-3 overflow-y-auto space-y-2 flex-1">
                      {filteredMaterials.map((item, index) => {
                        const isSelected = selectedModule?.id === item.id;
                        const isDone = completedModules[item.id];
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedModule(item)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left space-y-2 ${
                              isSelected
                                ? 'bg-blue-50/70 border-primary-navy shadow-xs ring-1 ring-primary-navy/20'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center font-mono">
                                  {index + 1}
                                </span>
                                <Badge variant="teal" format="soft" className="text-[10px] py-0 px-1.5">
                                  {item.type || 'Materi'}
                                </Badge>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleModuleCompletion(item.id);
                                }}
                                title={isDone ? 'Tandai belum dibaca' : 'Tandai sudah dibaca'}
                                className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer border ${
                                  isDone
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'border-slate-300 hover:border-slate-400 bg-white'
                                }`}
                              >
                                {isDone && <Check className="w-3 h-3" />}
                              </button>
                            </div>

                            <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2">
                              {item.title}
                            </h4>

                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                              {item.content}
                            </p>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 font-sans">
                              <span>{item.competency || item.category}</span>
                              <span className="font-mono text-primary-navy font-semibold">
                                {item.code} • {item.version || 'v1.0'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Interactive Course Reader Preview */}
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col h-[680px]">
                    {selectedModule ? (
                      <div className="flex flex-col h-full">
                        {/* Reader Header */}
                        <div className="p-5 border-b border-slate-100 bg-slate-50/70 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="navy" format="soft">
                                {selectedModule.category}
                              </Badge>
                              <span className="font-mono text-xs text-slate-500 font-semibold">
                                {selectedModule.code} • {selectedModule.version || 'v2.1'}
                              </span>
                            </div>

                            <Button
                              variant={completedModules[selectedModule.id] ? 'secondary' : 'primary'}
                              size="xs"
                              onClick={() => toggleModuleCompletion(selectedModule.id)}
                              leftIcon={completedModules[selectedModule.id] ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : undefined}
                            >
                              {completedModules[selectedModule.id] ? 'Selesai Dibaca ✓' : 'Tandai Selesai Dibaca'}
                            </Button>
                          </div>

                          <h2 className="font-heading font-extrabold text-lg sm:text-xl text-slate-900 leading-snug">
                            {selectedModule.title}
                          </h2>

                          {selectedModule.competency && (
                            <p className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              Kompetensi Inti: <strong className="text-slate-800">{selectedModule.competency}</strong>
                            </p>
                          )}
                        </div>

                        {/* Reader Content Body Scrollable */}
                        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-700 leading-relaxed flex-1">
                          {/* Main syllabus text */}
                          <div className="bg-slate-50/80 rounded-2xl border border-slate-200/70 p-4.5 space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-primary-navy font-heading flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              Rangkuman Pokok Bahasan &amp; Konsep Kunci
                            </h4>
                            <p className="text-slate-700 leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                              {selectedModule.content}
                            </p>
                          </div>

                          {/* Rubric Section */}
                          {selectedModule.rubric && (
                            <div className="p-4.5 bg-blue-50/50 rounded-2xl border border-blue-200/60 space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 font-heading flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-blue-700" />
                                Rubrik Penilaian Asesor (Standar BARS)
                              </h4>
                              <p className="text-blue-950 text-xs sm:text-sm leading-relaxed">
                                {selectedModule.rubric}
                              </p>
                            </div>
                          )}

                          {/* Behavioral Indicators Checklist */}
                          {selectedModule.behavioralIndicators && selectedModule.behavioralIndicators.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-heading flex items-center gap-2">
                                <ListChecks className="w-4 h-4 text-slate-500" />
                                Indikator Kompetensi yang Diuji
                              </h4>
                              <div className="space-y-2">
                                {selectedModule.behavioralIndicators.map((indicator, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5 shadow-2xs"
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <span className="text-xs text-slate-700 font-medium leading-snug">
                                      {indicator}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Reader Bottom Actions Bar */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500 font-medium">
                            Siap melanjutkan tahapan tes?
                          </span>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTabChange('coding')}
                              leftIcon={<Code2 className="w-3.5 h-3.5" />}
                              className="text-xs"
                            >
                              Live Coding Test
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleTabChange('ujian')}
                              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                              className="text-xs font-bold"
                            >
                              Lanjut ke Ujian CAT
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 p-8">
                        <BookOpen className="w-10 h-10 text-slate-300" />
                        <p className="text-sm font-semibold">Pilih modul di sebelah kiri untuk melihat rincian silabus.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                TAB 2: UJIAN SOAL CAT (Computer Adaptive Test)
            ═══════════════════════════════════════════════════════════ */}
            {activeLmsTab === 'ujian' && (
              <div className="space-y-6 animate-fadeIn">
                {/* Main Detail Assessment Card */}
                <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
                  {/* Top Row: Meta, Company, Status Badge */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-primary-navy bg-soft-blue px-2.5 py-1 rounded-lg border border-accent-border">
                          {currentProgram.id}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {currentProgram.pt}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs sm:text-sm text-muted-slate">{currentProgram.category}</span>
                        <Badge variant={currentProgram.badgeVariant}>{currentProgram.badgeStatus}</Badge>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-extrabold text-ink font-heading leading-tight">
                        {currentProgram.title}
                      </h2>
                    </div>

                    {/* Score or Status Pill */}
                    {currentProgram.status === 'selesai' && typeof currentProgram.score === 'number' && (
                      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl shrink-0 self-start lg:self-auto">
                        <Award className="w-6 h-6 text-emerald-600" />
                        <div>
                          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Nilai Komposit Akhir</span>
                          <span className="font-mono text-xl font-extrabold text-emerald-700 leading-none">{currentProgram.score} / 100</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ─── 4-Step Pipeline Flow Indicator on this Assessment ─── */}
                  <div className="p-4 sm:p-5 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <span>Alur Tahapan Seleksi Program Ini</span>
                      <span className="text-primary-navy font-semibold normal-case">
                        {currentProgram.status === 'selesai'
                          ? '✅ 4 dari 4 Tahap Selesai'
                          : currentProgram.status === 'berjalan'
                          ? '⏳ Tahap 2 Selesai • Menunggu Tahap 3 (Wawancara)'
                          : '🚀 Siap Dimulai (Tahap 1 & 2)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Step 1: Cek Perangkat */}
                      <div
                        className={`p-3 rounded-xl border flex items-center gap-3 ${
                          currentProgram.status === 'selesai' || currentProgram.status === 'berjalan'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-white border-blue-200 text-primary-navy shadow-2xs'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            currentProgram.status === 'selesai' || currentProgram.status === 'berjalan'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-primary-navy text-white'
                          }`}
                        >
                          {currentProgram.status === 'selesai' || currentProgram.status === 'berjalan' ? '✓' : '1'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs truncate">Cek Perangkat</p>
                          <p className="text-[11px] text-slate-500 truncate">Kamera &amp; Mic HD</p>
                        </div>
                      </div>

                      {/* Step 2: Ujian CAT 40 Soal */}
                      <div
                        className={`p-3 rounded-xl border flex items-center gap-3 ${
                          currentProgram.status === 'selesai' || currentProgram.status === 'berjalan'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-white border-blue-300 text-primary-navy ring-2 ring-blue-500/20'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            currentProgram.status === 'selesai' || currentProgram.status === 'berjalan'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-blue-600 text-white animate-pulse'
                          }`}
                        >
                          {currentProgram.status === 'selesai' || currentProgram.status === 'berjalan' ? '✓' : '2'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs truncate">Ujian CAT (40 Soal)</p>
                          <p className="text-[11px] text-slate-500 truncate">{currentProgram.duration} • PG &amp; Kasus</p>
                        </div>
                      </div>

                      {/* Step 3: Wawancara Live Asesor */}
                      <div
                        className={`p-3 rounded-xl border flex items-center gap-3 ${
                          currentProgram.status === 'selesai'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : currentProgram.status === 'berjalan'
                            ? 'bg-white border-blue-400 text-primary-navy ring-2 ring-blue-500/30 shadow-2xs'
                            : 'bg-slate-100/70 border-slate-200 text-slate-500'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            currentProgram.status === 'selesai'
                              ? 'bg-emerald-600 text-white'
                              : currentProgram.status === 'berjalan'
                              ? 'bg-blue-600 text-white animate-pulse'
                              : 'bg-slate-300 text-slate-700'
                          }`}
                        >
                          {currentProgram.status === 'selesai' ? '✓' : '3'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs truncate">Wawancara Live Asesor</p>
                          <p className="text-[11px] text-slate-500 truncate">Setelah CAT Selesai</p>
                        </div>
                      </div>

                      {/* Step 4: Rekap Nilai LHA */}
                      <div
                        className={`p-3 rounded-xl border flex items-center gap-3 ${
                          currentProgram.status === 'selesai'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-slate-100/70 border-slate-200 text-slate-500'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            currentProgram.status === 'selesai' ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                          }`}
                        >
                          {currentProgram.status === 'selesai' ? '✓' : '4'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs truncate">Hasil &amp; Nilai LHA</p>
                          <p className="text-[11px] text-slate-500 truncate">Laporan Resmi</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ─── Penjelasan Khusus Wawancara untuk Asesmen Ini ─── */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <Video className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-950">
                          Informasi Wawancara Kompetensi: {currentProgram.interviewInfo.assessorName}
                        </p>
                        <p className="text-amber-800 mt-0.5">
                          {currentProgram.interviewInfo.correlationNote} <strong>({currentProgram.interviewInfo.timing})</strong>
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-semibold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-lg shrink-0 self-start md:self-auto">
                      Bobot Wawancara: 60%
                    </span>
                  </div>

                  {/* ─── Metric Details & Action Buttons ─── */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-slate">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-accent" />
                        Durasi CAT: <strong className="text-ink">{currentProgram.duration}</strong>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4 text-blue-accent" />
                        Jumlah Soal: <strong className="text-ink">{currentProgram.questions}</strong>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Passing Grade: <strong className="text-emerald-700">{currentProgram.passingScore} / 100</strong>
                      </span>
                      <span className="flex items-center gap-1.5 font-mono text-xs text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/60">
                        Batas: {currentProgram.deadline}
                      </span>
                    </div>

                    {/* Dynamic Action Buttons based on Stage */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      {currentProgram.status === 'selesai' ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => navigate('/peserta/hasil')}
                            className="text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center gap-2 font-bold cursor-pointer"
                          >
                            <Award className="w-4 h-4 text-emerald-600" />
                            <span>Lihat Skor &amp; LHA ({currentProgram.score})</span>
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </>
                      ) : currentProgram.status === 'berjalan' ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => navigate('/peserta/hasil')}
                            className="text-xs sm:text-sm py-2.5 px-3.5 rounded-xl cursor-pointer"
                          >
                            Skor CAT Sementara
                          </Button>
                          <Button
                            variant="primary"
                            onClick={() => navigate('/peserta/waiting-room')}
                            className="text-xs sm:text-sm py-2.5 px-5 rounded-xl flex items-center gap-2 font-bold shadow-sm bg-blue-600 hover:bg-blue-700 cursor-pointer"
                          >
                            <Video className="w-4 h-4" />
                            <span>Masuk Ruang Wawancara (Tahap 3)</span>
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => navigate('/peserta/device-check')}
                            className="text-xs sm:text-sm py-2.5 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
                          >
                            <Laptop className="w-4 h-4 text-slate-500" />
                            <span>1. Cek Perangkat</span>
                          </Button>
                          <Button
                            variant="primary"
                            onClick={() => navigate(`/peserta/exam/${currentProgram.id}`)}
                            className="text-xs sm:text-sm py-2.5 px-5 rounded-xl flex items-center gap-2 font-bold shadow-sm cursor-pointer"
                          >
                            <PlayCircle className="w-4 h-4" />
                            <span>2. Mulai Ujian CAT (40 Soal)</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Extra Guidance */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-2 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">AI Proctoring &amp; Integritas</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Ujian diawasi oleh algoritma OpenCV dan deteksi multi-wajah. Pastikan pencahayaan cukup dan hindari membuka tab lain.
                    </p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-2 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">Manajemen Waktu Otomatis</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Timer 90 menit berjalan otomatis saat tes dimulai. Jawaban Anda tersimpan secara berkala setiap 5 detik ke cloud server.
                    </p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-2 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <Video className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">Validasi Wawancara Langsung</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Setelah submit CAT, Anda akan langsung diarahkan ke antrean wawancara bersama asesor atau Gemini AI Live.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                TAB 3: LIVE CODING TEST (PROTOTYPE JUDGE0)
            ═══════════════════════════════════════════════════════════ */}
            {activeLmsTab === 'coding' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        JUDGE0 SANDBOX
                      </span>
                      <Badge variant="teal" format="soft">Prototype Evaluation Engine</Badge>
                    </div>
                    <h2 className="font-heading font-extrabold text-base sm:text-lg text-slate-900">
                      Live Coding &amp; Algorithmic Assessment
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Uji kemampuan problem solving, data structures, dan arsitektur kode secara interaktif dengan engine Judge0.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600 font-mono">
                    <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      <Cpu className="w-3.5 h-3.5 text-slate-500" />
                      Isolated Container
                    </span>
                  </div>
                </div>

                <PesertaLiveCodingJudge0 programTitle={currentProgram.title} />
              </div>
            )}
          </div>
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
                    Pilih kartu program asesmen di bawah untuk masuk ke ruang belajar terpadu (LMS), membaca master silabus, mengerjakan ujian soal CAT, dan live coding test.
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
