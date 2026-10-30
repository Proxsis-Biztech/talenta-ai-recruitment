import React, { useState, useMemo } from 'react';
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
  Layers
} from 'lucide-react';
import { PesertaLayout } from './PesertaLayout';
import { Button, Badge } from '../ui';
import { getActiveSessionUser } from '../../services/userRegistryService';
import { getProgramById, getAllPrograms } from '../../services/assessmentCatalog';

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

  const [filter, setFilter] = useState<'semua' | 'belum' | 'selesai'>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFlowGuide, setShowFlowGuide] = useState(true);

  const activeUser = useMemo(() => getActiveSessionUser(), []);
  const activeProg = useMemo(() => {
    return getProgramById(activeUser.assessmentId || 'BMRI-DATA-02') || getProgramById('BMRI-DATA-02') || getProgramById('SE-402')!;
  }, [activeUser.assessmentId]);

  const allPrograms = useMemo(() => getAllPrograms(), []);

  // Check if candidate has completed CAT exam in current session
  const isCatCompleted = useMemo(() => {
    return localStorage.getItem('talenta_cat_completed') === 'true';
  }, []);

  const programs: AsesmenItem[] = useMemo(() => {
    return [
      {
        id: activeProg.id,
        title: activeProg.title,
        pt: activeProg.companyName,
        category: activeProg.category,
        status: isCatCompleted ? 'berjalan' : 'belum',
        badgeStatus: isCatCompleted ? 'CAT Selesai • Menuju Wawancara' : 'Belum Dikerjakan • Sesi Aktif',
        badgeVariant: isCatCompleted ? 'navy' : 'warning',
        duration: `${activeProg.durationMinutes} Menit`,
        questions: `${activeProg.totalQuestions} Soal CAT`,
        passingScore: activeProg.passingScore,
        deadline: 'Hari ini, 23:59 WIB',
        progress: isCatCompleted ? 60 : 10,
        currentStageNumber: isCatCompleted ? 3 : 2,
        description: activeProg.description,
        interviewInfo: {
          assessorName: 'Dr. Ir. Dwi Hartanto, M.Kom / Gemini AI Live',
          mode: 'Live Video & Audio Interaktif',
          duration: '45 Menit',
          timing: 'Dilakukan setelah lulus/submit ujian CAT 40 soal',
          correlationNote: 'Asesor akan memvalidasi penalaran studi kasus yang Anda jawab di lembar CAT serta mengukur kompetensi perilaku (BARS).'
        }
      },
      ...allPrograms
        .filter((p) => p.id !== activeProg.id)
        .slice(0, 2)
        .map((p, idx): AsesmenItem => {
          const isDone = idx === 1;
          return {
            id: p.id,
            title: p.title,
            pt: p.companyName,
            category: p.category,
            status: isDone ? 'selesai' : 'belum',
            badgeStatus: isDone ? 'Sudah Selesai & Lulus LHA' : 'Belum Dikerjakan',
            badgeVariant: isDone ? 'teal' : 'warning',
            duration: `${p.durationMinutes} Menit`,
            questions: `${p.totalQuestions} Soal CAT`,
            passingScore: p.passingScore,
            deadline: isDone ? '24 Okt 2026 (Selesai)' : '31 Okt 2026',
            progress: isDone ? 100 : 0,
            currentStageNumber: isDone ? 4 : 1,
            score: isDone ? 87.5 : undefined,
            description: p.description,
            interviewInfo: {
              assessorName: isDone ? 'Budi Santoso, S.Psi, M.M.' : 'Tim Asesor ' + p.companyName,
              mode: 'Live Interview Panel',
              duration: '30-45 Menit',
              timing: isDone ? 'Selesai Dilaksanakan' : 'Dijadwalkan setelah CAT',
              correlationNote: 'Konfirmasi bukti perilaku kerja dan pendalaman situational judgment kasus bisnis.'
            }
          };
        })
    ];
  }, [activeProg, allPrograms, isCatCompleted]);

  // Selected Program for Detail View
  const selectedItem = useMemo(() => {
    if (!selectedProgramId) return null;
    return programs.find((p) => p.id === selectedProgramId) || programs[0];
  }, [selectedProgramId, programs]);

  // Filtered programs for Catalog Mode
  const filtered = useMemo(() => {
    return programs.filter((p) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          p.title.toLowerCase().includes(q) ||
          p.pt.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Status filter
      if (filter === 'belum') {
        return p.status === 'belum' || p.status === 'berjalan';
      }
      if (filter === 'selesai') {
        return p.status === 'selesai';
      }
      return true;
    });
  }, [programs, searchQuery, filter]);

  const belumCount = programs.filter((p) => p.status === 'belum' || p.status === 'berjalan').length;
  const selesaiCount = programs.filter((p) => p.status === 'selesai').length;

  return (
    <PesertaLayout activeTab="asesmen">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-7 antialiased">
        {/* ═══════════════════════════════════════════════════════════
            MODE A: DETAIL VIEW (Ditampilkan saat Card Modul di-klik)
        ═══════════════════════════════════════════════════════════ */}
        {selectedItem ? (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Navigation & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
              <button
                onClick={() => {
                  searchParams.delete('id');
                  setSearchParams(searchParams);
                }}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-primary-navy bg-white hover:bg-slate-50 border border-slate-200/90 px-4 py-2.5 rounded-2xl transition-all shadow-2xs cursor-pointer group self-start"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>← Kembali ke Daftar Modul Asesmen</span>
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>Modul Terpilih:</span>
                <span className="font-mono font-bold text-primary-navy bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  {selectedItem.id}
                </span>
                <span>•</span>
                <span className="font-semibold text-slate-700">{selectedItem.pt}</span>
              </div>
            </div>

            {/* Main Detail Assessment Card (Persis sesuai foto pengguna) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
              {/* Top Row: Meta, Company, Status Badge */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-primary-navy bg-soft-blue px-2.5 py-1 rounded-lg border border-accent-border">
                      {selectedItem.id}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {selectedItem.pt}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs sm:text-sm text-muted-slate">{selectedItem.category}</span>
                    <Badge variant={selectedItem.badgeVariant}>{selectedItem.badgeStatus}</Badge>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-heading leading-tight">
                    {selectedItem.title}
                  </h1>
                </div>

                {/* Score or Status Pill */}
                {selectedItem.status === 'selesai' && typeof selectedItem.score === 'number' && (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl shrink-0 self-start lg:self-auto">
                    <Award className="w-6 h-6 text-emerald-600" />
                    <div>
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Nilai Komposit Akhir</span>
                      <span className="font-mono text-xl font-extrabold text-emerald-700 leading-none">{selectedItem.score} / 100</span>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
                {selectedItem.description}
              </p>

              {/* ─── 4-Step Pipeline Flow Indicator on this Assessment ─── */}
              <div className="p-4 sm:p-5 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>Alur Tahapan Seleksi Program Ini</span>
                  <span className="text-primary-navy font-semibold normal-case">
                    {selectedItem.status === 'selesai'
                      ? '✅ 4 dari 4 Tahap Selesai'
                      : selectedItem.status === 'berjalan'
                      ? '⏳ Tahap 2 Selesai • Menunggu Tahap 3 (Wawancara)'
                      : '🚀 Siap Dimulai (Tahap 1 & 2)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Step 1: Cek Perangkat */}
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-3 ${
                      selectedItem.status === 'selesai' || selectedItem.status === 'berjalan'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-white border-blue-200 text-primary-navy shadow-2xs'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        selectedItem.status === 'selesai' || selectedItem.status === 'berjalan'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-primary-navy text-white'
                      }`}
                    >
                      {selectedItem.status === 'selesai' || selectedItem.status === 'berjalan' ? '✓' : '1'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate">Cek Perangkat</p>
                      <p className="text-[11px] text-slate-500 truncate">Kamera &amp; Mic HD</p>
                    </div>
                  </div>

                  {/* Step 2: Ujian CAT 40 Soal */}
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-3 ${
                      selectedItem.status === 'selesai' || selectedItem.status === 'berjalan'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-white border-blue-300 text-primary-navy ring-2 ring-blue-500/20'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        selectedItem.status === 'selesai' || selectedItem.status === 'berjalan'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 text-white animate-pulse'
                      }`}
                    >
                      {selectedItem.status === 'selesai' || selectedItem.status === 'berjalan' ? '✓' : '2'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate">Ujian CAT (40 Soal)</p>
                      <p className="text-[11px] text-slate-500 truncate">{selectedItem.duration} • PG &amp; Kasus</p>
                    </div>
                  </div>

                  {/* Step 3: Wawancara Live Asesor */}
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-3 ${
                      selectedItem.status === 'selesai'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : selectedItem.status === 'berjalan'
                        ? 'bg-white border-blue-400 text-primary-navy ring-2 ring-blue-500/30 shadow-2xs'
                        : 'bg-slate-100/70 border-slate-200 text-slate-500'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        selectedItem.status === 'selesai'
                          ? 'bg-emerald-600 text-white'
                          : selectedItem.status === 'berjalan'
                          ? 'bg-blue-600 text-white animate-pulse'
                          : 'bg-slate-300 text-slate-700'
                      }`}
                    >
                      {selectedItem.status === 'selesai' ? '✓' : '3'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate">Wawancara Live Asesor</p>
                      <p className="text-[11px] text-slate-500 truncate">Setelah CAT Selesai</p>
                    </div>
                  </div>

                  {/* Step 4: Rekap Nilai LHA */}
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-3 ${
                      selectedItem.status === 'selesai'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-slate-100/70 border-slate-200 text-slate-500'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        selectedItem.status === 'selesai' ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                      }`}
                    >
                      {selectedItem.status === 'selesai' ? '✓' : '4'}
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
                      Informasi Wawancara Kompetensi: {selectedItem.interviewInfo.assessorName}
                    </p>
                    <p className="text-amber-800 mt-0.5">
                      {selectedItem.interviewInfo.correlationNote} <strong>({selectedItem.interviewInfo.timing})</strong>
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
                    Durasi CAT: <strong className="text-ink">{selectedItem.duration}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-blue-accent" />
                    Jumlah Soal: <strong className="text-ink">{selectedItem.questions}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Passing Grade: <strong className="text-emerald-700">{selectedItem.passingScore} / 100</strong>
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-xs text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/60">
                    Batas: {selectedItem.deadline}
                  </span>
                </div>

                {/* Dynamic Action Buttons based on Stage */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {selectedItem.status === 'selesai' ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/peserta/hasil')}
                        className="text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center gap-2 font-bold cursor-pointer"
                      >
                        <Award className="w-4 h-4 text-emerald-600" />
                        <span>Lihat Skor &amp; LHA ({selectedItem.score})</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </>
                  ) : selectedItem.status === 'berjalan' ? (
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
                        onClick={() => navigate(`/peserta/exam/${selectedItem.id}`)}
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

            {/* Extra Guidance on the Detail View */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">AI Proctoring & Integritas</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ujian diawasi oleh algoritma OpenCV dan deteksi multi-wajah. Pastikan pencahayaan cukup dan hindari membuka tab lain.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Manajemen Waktu Otomatis</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Timer 90 menit berjalan otomatis saat tes dimulai. Jawaban Anda tersimpan secara berkala setiap 5 detik ke cloud server.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-2">
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
        ) : (
          /* ═══════════════════════════════════════════════════════════
              MODE B: CATALOG VIEW (Card Modul Asesmen)
          ═══════════════════════════════════════════════════════════ */
          <div className="space-y-7 animate-fadeIn">
            {/* ─── Header Title & Description ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-primary-navy border border-blue-200/60 text-xs font-semibold mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-accent" />
                  <span>Portal Asesmen Mandiri Talenta+</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-ink tracking-tight">
                  Daftar Asesmen Saya
                </h1>
                <p className="text-sm text-muted-slate mt-1 max-w-2xl">
                  Pilih salah satu kartu modul asesmen di bawah untuk melihat rincian tahapan seleksi, panduan pengerjaan, dan memulai ujian.
                </p>
              </div>

              {/* Quick Search */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari asesmen atau instansi..."
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                />
              </div>
            </div>

            {/* ─── Penjelasan Korelasi CAT & Wawancara (Important Context Box) ─── */}
            {showFlowGuide && (
              <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-200/90 rounded-3xl p-5 sm:p-6 relative shadow-xs">
                <button
                  onClick={() => setShowFlowGuide(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xs font-semibold cursor-pointer p-1"
                  title="Tutup informasi ini"
                >
                  ✕
                </button>
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-primary-navy text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Video className="w-6 h-6 text-blue-200" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-extrabold text-primary-navy font-heading">
                        📌 Bagaimana Alur Asesmen & Mengapa Ada Sesi Wawancara (Interview)?
                      </h3>
                      <span className="text-[11px] font-bold bg-white text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
                        Penting Diketahui
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      Pelaksanaan asesmen di Talenta+ menggabungkan <strong>Ujian CAT (40 Soal)</strong> dan <strong>Wawancara Live (Asesor / Gemini AI)</strong>. Sesi wawancara dilakukan <strong>SETELAH</strong> Anda selesai mengerjakan ujian CAT. Asesor akan menanyakan alasan dan penalaran di balik keputusan kasus bisnis Anda saat CAT untuk memvalidasi kompetensi perilaku Anda secara nyata.
                    </p>
                    <div className="flex flex-wrap items-center gap-4 pt-1.5 text-xs font-semibold text-primary-navy">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Tahap 1: Cek Perangkat (Kamera &amp; Mic)
                      </span>
                      <span className="text-slate-300">→</span>
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Tahap 2: Ujian CAT 40 Soal
                      </span>
                      <span className="text-slate-300">→</span>
                      <span className="flex items-center gap-1.5 text-blue-800 font-bold">
                        <Video className="w-4 h-4 text-blue-600" />
                        Tahap 3: Wawancara Live Asesor
                      </span>
                      <span className="text-slate-300">→</span>
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Award className="w-4 h-4 text-amber-500" />
                        Tahap 4: Rekap Nilai &amp; LHA
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Filter Tabs: Belum Dikerjakan vs Selesai ─── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 self-start">
                <button
                  onClick={() => setFilter('semua')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    filter === 'semua'
                      ? 'bg-white text-primary-navy shadow-xs font-bold'
                      : 'text-slate-600 hover:text-ink'
                  }`}
                >
                  Semua Asesmen ({programs.length})
                </button>
                <button
                  onClick={() => setFilter('belum')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filter === 'belum'
                      ? 'bg-white text-primary-navy shadow-xs font-bold'
                      : 'text-slate-600 hover:text-ink'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Belum Dikerjakan / Berjalan ({belumCount})</span>
                </button>
                <button
                  onClick={() => setFilter('selesai')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filter === 'selesai'
                      ? 'bg-white text-primary-navy shadow-xs font-bold'
                      : 'text-slate-600 hover:text-ink'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Sudah Selesai ({selesaiCount})</span>
                </button>
              </div>

              <div className="text-xs text-muted-slate flex items-center gap-1.5">
                <Info className="w-4 h-4 text-slate-400" />
                <span>Menampilkan <strong>{filtered.length}</strong> modul asesmen</span>
              </div>
            </div>

            {/* ─── CARD MODUL ASESMEN (GRID VIEW) ─── */}
            {filtered.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-700">Tidak ada modul asesmen yang cocok dengan filter</p>
                <p className="text-xs text-muted-slate">Coba ubah kata kunci pencarian atau ganti tab filter di atas.</p>
                <Button variant="outline" onClick={() => { setFilter('semua'); setSearchQuery(''); }} className="text-xs mt-2">
                  Reset Filter
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((item) => {
                  const isFinished = item.status === 'selesai';
                  const isWaitingInterview = item.status === 'berjalan';

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        searchParams.set('id', item.id);
                        setSearchParams(searchParams);
                      }}
                      className="bg-white rounded-3xl border border-slate-200/90 hover:border-blue-500 hover:shadow-lg transition-all duration-200 p-6 flex flex-col justify-between cursor-pointer group relative overflow-hidden bg-gradient-to-b from-white to-slate-50/40"
                    >
                      {/* Top Accent Strip */}
                      <div
                        className={`absolute top-0 left-0 right-0 h-1.5 ${
                          isFinished
                            ? 'bg-emerald-500'
                            : isWaitingInterview
                            ? 'bg-blue-600'
                            : 'bg-amber-500'
                        }`}
                      />

                      <div className="space-y-4">
                        {/* Header: Code & Badge */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="font-mono text-xs font-bold text-primary-navy bg-soft-blue px-2.5 py-1 rounded-lg border border-accent-border">
                            {item.id}
                          </span>
                          <Badge variant={item.badgeVariant}>{item.badgeStatus}</Badge>
                        </div>

                        {/* Title & Organization */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 truncate">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{item.pt}</span>
                          </div>
                          <h3 className="text-base sm:text-lg font-bold font-heading text-ink group-hover:text-blue-accent transition-colors line-clamp-2 leading-snug">
                            {item.title}
                          </h3>
                          <span className="inline-block text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md mt-1">
                            {item.category}
                          </span>
                        </div>

                        {/* Description Preview */}
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>

                        {/* Stage Progress Bar */}
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span className="text-slate-500">Tahapan:</span>
                            <span
                              className={
                                isFinished
                                  ? 'text-emerald-700'
                                  : isWaitingInterview
                                  ? 'text-blue-700'
                                  : 'text-amber-700'
                              }
                            >
                              {isFinished
                                ? '✅ Selesai (Lulus LHA)'
                                : isWaitingInterview
                                ? '⏳ Tahap 3: Wawancara'
                                : '🚀 Tahap 1: Cek & CAT'}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isFinished
                                  ? 'bg-emerald-500 w-full'
                                  : isWaitingInterview
                                  ? 'bg-blue-600 w-3/4'
                                  : 'bg-amber-500 w-1/4'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Key Specs Grid */}
                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                          <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-medium">Durasi CAT</span>
                            <span className="text-xs font-bold text-slate-800 font-mono">{item.duration}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-medium">Beban Soal</span>
                            <span className="text-xs font-bold text-slate-800 font-mono">
                              {item.questions.split(' ')[0]} Soal
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-medium">Passing</span>
                            <span className="text-xs font-bold text-emerald-700 font-mono">
                              {item.passingScore}/100
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Deadline & Action */}
                      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-medium">
                          Batas: <strong className="text-slate-700">{item.deadline.split('(')[0]}</strong>
                        </span>
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-navy group-hover:text-blue-600 transition-colors">
                          <span>Buka Detail Modul</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </PesertaLayout>
  );
}
