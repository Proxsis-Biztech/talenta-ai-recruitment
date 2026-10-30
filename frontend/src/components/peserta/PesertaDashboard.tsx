import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Video,
  FileText,
  Laptop,
  Award,
  ChevronRight,
  Info,
  Check,
  Lightbulb,
  Wifi,
  Smile,
  Building2,
  FileQuestion
} from 'lucide-react';
import { PesertaLayout } from './PesertaLayout';
import { Button, Badge } from '../ui';
import { getActiveSessionUser } from '../../services/userRegistryService';
import { getProgramById } from '../../services/assessmentCatalog';

export default function PesertaDashboard() {
  const navigate = useNavigate();

  // Read active candidate and their assigned PT & assessment program
  const activeUser = useMemo(() => {
    return getActiveSessionUser();
  }, []);

  const activeProgram = useMemo(() => {
    return getProgramById(activeUser.assessmentId || 'SE-402') || getProgramById('SE-402')!;
  }, [activeUser.assessmentId]);

  const isCatCompleted = useMemo(() => {
    return localStorage.getItem('talenta_cat_completed') === 'true';
  }, []);

  const stages = [
    { title: 'Pendaftaran & Berkas', status: 'completed', date: '20 Okt 2026', desc: 'Terverifikasi' },
    { title: 'Verifikasi Device Check', status: 'completed', date: '24 Okt 2026', desc: 'Siap & Memenuhi Syarat' },
    {
      title: 'Tes Kemampuan Teknis (CAT)',
      status: isCatCompleted ? 'completed' : 'active',
      date: isCatCompleted ? 'Selesai Hari Ini' : 'Hari Ini',
      desc: isCatCompleted ? '40 Soal Telah Dikumpulkan' : '40 Soal • Siap Dimulai'
    },
    {
      title: 'Live Interview & Rubrik Asesor',
      status: isCatCompleted ? 'active' : 'upcoming',
      date: isCatCompleted ? 'Siap Sekarang' : '29 Okt 2026',
      desc: isCatCompleted ? 'Menunggu di Waiting Room' : 'Setelah CAT Selesai'
    },
    { title: 'Pengumuman & Rekap Hasil', status: 'upcoming', date: '02 Nov 2026', desc: 'Hasil Akhir LHA' }
  ];

  return (
    <PesertaLayout activeTab="dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8 antialiased">
        {/* ─── Hero Welcome Banner (Friendly, Calming, Clear Next Step) ─── */}
        <div className="bg-gradient-to-r from-primary-navy via-navy-dark to-blue-accent rounded-3xl p-6 sm:p-10 text-white shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 pointer-events-none transform skew-x-12 translate-x-16" />
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-blue-100 text-xs sm:text-sm font-medium backdrop-blur-xs border border-white/10">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>
                {isCatCompleted
                  ? '✅ Ujian CAT Telah Selesai • Lanjut ke Tahap Wawancara'
                  : 'Sesi Ujian CAT 40 Soal Siap Dikerjakan'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold font-heading tracking-tight text-white leading-tight">
              Halo, {activeUser.name}! 👋
            </h1>

            <p className="text-sm sm:text-base text-blue-100 leading-relaxed max-w-xl">
              {isCatCompleted
                ? `Selamat! Anda telah menyelesaikan 40 soal ujian CAT untuk ${activeProgram.title}. Langkah berikutnya adalah sesi Wawancara Live (Asesor / Gemini AI) untuk memvalidasi penalaran studi kasus Anda.`
                : `Selamat datang di portal seleksi Talenta+ untuk ${activeProgram.companyName}. Lembar ujian CAT 40 soal untuk program ${activeProgram.title} telah dipersiapkan.`}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              {isCatCompleted ? (
                <>
                  <button
                    onClick={() => navigate('/peserta/waiting-room')}
                    className="px-6 py-3 rounded-xl bg-white text-primary-navy font-bold text-sm hover:bg-blue-50 transition-all shadow-md flex items-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Video className="w-5 h-5 text-blue-accent" />
                    <span>Masuk Ruang Tunggu Wawancara (Tahap 3 &amp; 4)</span>
                  </button>
                  <button
                    onClick={() => navigate('/peserta/hasil')}
                    className="px-5 py-3 rounded-xl bg-white/15 text-white font-semibold text-sm hover:bg-white/20 transition-all flex items-center gap-2 cursor-pointer border border-white/20 backdrop-blur-xs"
                  >
                    <Award className="w-4 h-4 text-emerald-300" />
                    <span>Lihat Nilai Sementara CAT</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate(`/peserta/exam/${activeProgram.id}`)}
                    className="px-6 py-3 rounded-xl bg-white text-primary-navy font-bold text-sm hover:bg-blue-50 transition-all shadow-md flex items-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <PlayCircle className="w-5 h-5 text-blue-accent" />
                    <span>Mulai Ujian CAT Sekarang (40 Soal)</span>
                  </button>
                  <button
                    onClick={() => navigate('/peserta/device-check')}
                    className="px-5 py-3 rounded-xl bg-white/15 text-white font-semibold text-sm hover:bg-white/20 transition-all flex items-center gap-2 cursor-pointer border border-white/20 backdrop-blur-xs"
                  >
                    <Laptop className="w-4 h-4 text-emerald-300" />
                    <span>Cek Ulang Kamera &amp; Mic</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ─── 2-Column Split: Active Assessment & Upcoming Interview ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Assessment Card (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary-navy bg-soft-blue px-3 py-1 rounded-lg border border-accent-border">
                  PROGRAM AKTIF: {activeProgram.id}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Sesi Terbuka • {activeProgram.gradeLevel}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold font-heading text-ink leading-snug">
                {activeProgram.title}
              </h2>
              <p className="text-sm text-muted-slate mt-1.5 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>Instansi Penguji: <strong>{activeProgram.companyName}</strong></span>
              </p>

              {/* 4 Metric Cards */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70">
                  <span className="text-xs text-muted-slate block font-medium">Durasi Ujian</span>
                  <p className="font-mono text-base sm:text-lg font-bold text-ink mt-1">{activeProgram.durationMinutes} Menit</p>
                </div>
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70">
                  <span className="text-xs text-muted-slate block font-medium">Beban Soal</span>
                  <p className="font-mono text-base sm:text-lg font-bold text-primary-navy mt-1">{activeProgram.totalQuestions} Butir (CAT)</p>
                </div>
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70">
                  <span className="text-xs text-muted-slate block font-medium">Passing Grade</span>
                  <p className="font-mono text-base sm:text-lg font-bold text-emerald-600 mt-1">{activeProgram.passingScore} / 100</p>
                </div>
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70">
                  <span className="text-xs text-muted-slate block font-medium">Tingkat / Grade</span>
                  <p className="font-mono text-xs sm:text-sm font-bold text-amber-600 mt-1 line-clamp-1">{activeProgram.difficultyLabel} ({activeProgram.gradeLevel.split(' ')[0]})</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-muted-slate">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Pengawasan otomatis kamera web aktif untuk menjamin transparansi</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/peserta/detail/${activeProgram.id}`)}
                  className="flex-1 sm:flex-initial text-xs sm:text-sm py-2.5 px-4 rounded-xl"
                >
                  Detail & Tata Tertib
                </Button>
                {isCatCompleted ? (
                  <Button
                    variant="primary"
                    onClick={() => navigate('/peserta/waiting-room')}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm py-2.5 px-5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    <span>CAT Selesai • Lanjut Wawancara</span>
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => navigate(`/peserta/exam/${activeProgram.id}`)}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm py-2.5 px-5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Buka Lembar Ujian</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Interview Card (1 col) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-accent bg-blue-50 px-3 py-1 rounded-lg border border-blue-200/60">
                  JADWAL WAWANCARA
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-accent animate-ping" />
              </div>

              <h3 className="font-heading font-bold text-base sm:text-lg text-ink">
                Live Interview Asesor
              </h3>
              <p className="text-xs sm:text-sm text-muted-slate mt-1">
                Tahap 4: Pendalaman Kompetensi Teknis & Pemecahan Masalah
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <Calendar className="w-5 h-5 text-primary-navy shrink-0" />
                  <div className="text-xs sm:text-sm">
                    <p className="font-bold text-ink">Kamis, 29 Oktober 2026</p>
                    <p className="text-muted-slate text-xs">14:00 - 14:45 WIB (45 Menit)</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div className="w-9 h-9 rounded-full bg-soft-blue text-primary-navy font-bold text-xs flex items-center justify-center shrink-0 border border-accent-border">
                    DH
                  </div>
                  <div className="text-xs sm:text-sm">
                    <p className="font-bold text-ink">Dr. Ir. Dwi Hartanto, M.Kom</p>
                    <p className="text-muted-slate text-xs">Lead Assessor • Arsitektur Cloud</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100">
              <button
                onClick={() => navigate('/peserta/waiting-room')}
                className="w-full py-3 px-4 rounded-xl bg-soft-blue text-primary-navy hover:bg-blue-100/70 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer border border-accent-border"
              >
                <Clock className="w-4 h-4 text-blue-accent" />
                <span>Masuk ke Waiting Room</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── Visual Pipeline Tahapan Asesmen (Clean, Friendly Stepper) ─── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-heading font-bold text-lg text-ink">
                Progres Tahapan Seleksi Anda
              </h3>
              <p className="text-xs sm:text-sm text-muted-slate mt-0.5">
                Lacak seluruh pencapaian tahapan evaluasi Anda secara transparan dan jelas
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-primary-navy bg-soft-blue px-3.5 py-1.5 rounded-full border border-accent-border self-start sm:self-auto">
              {isCatCompleted ? 'Tahap 3 dari 5 Selesai (Wawancara Aktif)' : 'Tahap 2 dari 5 Selesai (Ujian CAT Aktif)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
            {stages.map((stg, idx) => {
              const isCompleted = stg.status === 'completed';
              const isActive = stg.status === 'active';
              return (
                <div
                  key={idx}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isActive
                      ? 'border-blue-accent bg-[#F0F6FE] shadow-sm'
                      : isCompleted
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-slate-200/70 bg-slate-50/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        Langkah 0{idx + 1}
                      </span>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : isActive ? (
                        <span className="w-3 h-3 rounded-full bg-blue-accent animate-pulse" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                    <p
                      className={`text-sm font-bold leading-snug ${
                        isActive
                          ? 'text-primary-navy'
                          : isCompleted
                          ? 'text-emerald-950'
                          : 'text-slate-600'
                      }`}
                    >
                      {stg.title}
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-slate-200/40">
                    <p className="text-xs text-muted-slate font-medium">{stg.desc}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{stg.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Tips Pengerjaan Ujian Nyaman & Lancar (Warm, Reassuring Guidance) ─── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2.5 mb-5 text-ink">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="font-heading font-bold text-base sm:text-lg">
              Tips Pengerjaan Ujian yang Nyaman & Tenang
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm text-slate-600">
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
              <div className="flex items-center gap-2 font-bold text-ink text-sm">
                <Smile className="w-4 h-4 text-blue-accent" />
                <span>Ruangan Tenang & Terang</span>
              </div>
              <p className="leading-relaxed text-muted-slate text-xs sm:text-sm">
                Pilih tempat yang nyaman dengan pencahayaan yang cukup di depan wajah Anda agar sistem kamera web dapat mendeteksi wajah dengan stabil.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
              <div className="flex items-center gap-2 font-bold text-ink text-sm">
                <Wifi className="w-4 h-4 text-emerald-600" />
                <span>Koneksi Internet Lancar</span>
              </div>
              <p className="leading-relaxed text-muted-slate text-xs sm:text-sm">
                Pastikan sambungan Wi-Fi atau paket data seluler Anda stabil minimal 5 Mbps agar pengiriman respon jawaban berlangsung mulus.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
              <div className="flex items-center gap-2 font-bold text-ink text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Jawaban Tersimpan Otomatis</span>
              </div>
              <p className="leading-relaxed text-muted-slate text-xs sm:text-sm">
                Setiap butir soal yang Anda pilih tersimpan otomatis ke sistem. Jika terjadi kendala peramban terputus, jawaban Anda tetap aman tersimpan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PesertaLayout>
  );
}
