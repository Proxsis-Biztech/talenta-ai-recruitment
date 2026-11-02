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
        {/* ─── Hero Header: Asymmetric 8 / 4 Split (Friendly, Clear Next Step) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Sisi Kiri (8 kolom): Salam Personal, Status Tahapan & Aksi Utama */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-soft-blue text-primary-navy text-xs font-semibold border border-accent-border">
                <Sparkles className="w-3.5 h-3.5 text-blue-accent" />
                <span>
                  {isCatCompleted
                    ? 'Tahap Ujian CAT Selesai • Lanjut Sesi Wawancara'
                    : 'Ujian CAT Siap Dikerjakan • 40 Soal'}
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-ink tracking-tight">
                  Selamat Datang, {activeUser.name}!
                </h1>
                <p className="text-sm sm:text-base text-muted-slate mt-2 leading-relaxed">
                  {isCatCompleted
                    ? `Selamat, Anda telah menuntaskan lembar CAT untuk ${activeProgram.title}. Seluruh jawaban Anda telah tersimpan dengan aman. Langkah berikutnya adalah sesi Wawancara Tatap Muka bersama Asesor.`
                    : `Sesi evaluasi kompetensi untuk posisi ${activeProgram.title} di ${activeProgram.companyName} telah dibuka. Ikuti tahapan asesmen dengan tenang, seluruh progres Anda tercatat otomatis.`}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-3.5">
              {isCatCompleted ? (
                <>
                  <Button
                    variant="primary"
                    onClick={() => navigate('/peserta/waiting-room')}
                    className="py-3 px-6 rounded-xl font-bold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Video className="w-4 h-4 text-blue-100" />
                    <span>Masuk Ruang Tunggu Wawancara</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/peserta/hasil')}
                    className="py-3 px-5 rounded-xl font-semibold text-xs sm:text-sm text-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>Lihat Rekap Nilai CAT</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="primary"
                    onClick={() => navigate(`/peserta/exam/${activeProgram.id}`)}
                    className="py-3 px-6 rounded-xl font-bold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <PlayCircle className="w-4 h-4 text-blue-100" />
                    <span>Mulai Ujian CAT Sekarang (40 Soal)</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/peserta/device-check')}
                    className="py-3 px-5 rounded-xl font-semibold text-xs sm:text-sm text-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Laptop className="w-4 h-4 text-primary-navy" />
                    <span>Uji Ulang Kamera &amp; Mic</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Sisi Kanan (4 kolom): Docket Status Peserta & Bantuan Cepat */}
          <div className="lg:col-span-4 bg-exam-bg rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-2xs">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-primary-navy uppercase tracking-wider bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  REF: {activeProgram.id}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Sesi Aktif
                </span>
              </div>

              <div className="space-y-2 text-xs text-muted-slate">
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span>Instansi Penguji</span>
                  <span className="font-semibold text-ink text-right">{activeProgram.companyName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span>Nomor Peserta</span>
                  <span className="font-mono font-bold text-ink">{activeUser.id}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Batas Waktu CAT</span>
                  <span className="font-mono font-semibold text-ink">Hari ini, 23:59 WIB</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200/80 bg-white/70 rounded-xl p-3 text-xs text-slate-600 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                Butuh bantuan teknis? Hubungi helpdesk pengawas melalui ikon bantuan di bilah atas.
              </p>
            </div>
          </div>
        </div>

        {/* ─── 8 / 4 Split: Active Assessment & Upcoming Interview ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Active Assessment Card (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary-navy bg-soft-blue px-3 py-1 rounded-lg border border-accent-border">
                  PROGRAM UTAMA: {activeProgram.id}
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

              {/* 4 Metric Chips */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-exam-bg rounded-xl border border-slate-200">
                  <span className="text-xs text-muted-slate block font-medium">Durasi Ujian</span>
                  <p className="font-mono text-base font-bold text-ink mt-0.5">{activeProgram.durationMinutes} Menit</p>
                </div>
                <div className="p-3.5 bg-exam-bg rounded-xl border border-slate-200">
                  <span className="text-xs text-muted-slate block font-medium">Beban Soal</span>
                  <p className="font-mono text-base font-bold text-primary-navy mt-0.5">{activeProgram.totalQuestions} Butir (CAT)</p>
                </div>
                <div className="p-3.5 bg-exam-bg rounded-xl border border-slate-200">
                  <span className="text-xs text-muted-slate block font-medium">Passing Grade</span>
                  <p className="font-mono text-base font-bold text-emerald-600 mt-0.5">{activeProgram.passingScore} / 100</p>
                </div>
                <div className="p-3.5 bg-exam-bg rounded-xl border border-slate-200">
                  <span className="text-xs text-muted-slate block font-medium">Tingkat / Grade</span>
                  <p className="font-mono text-xs sm:text-sm font-bold text-amber-600 mt-1 line-clamp-1">{activeProgram.difficultyLabel} ({activeProgram.gradeLevel.split(' ')[0]})</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-xs text-muted-slate">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pengawasan otomatis kamera web aktif untuk menjamin objektivitas &amp; kejujuran</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/peserta/detail/${activeProgram.id}`)}
                  className="flex-1 sm:flex-initial text-xs sm:text-sm py-2 px-4 rounded-xl"
                >
                  Silabus &amp; Tata Tertib
                </Button>
                {isCatCompleted ? (
                  <Button
                    variant="primary"
                    onClick={() => navigate('/peserta/waiting-room')}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm py-2 px-5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    <span>Lanjut ke Wawancara</span>
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => navigate(`/peserta/exam/${activeProgram.id}`)}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm py-2 px-5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Buka Lembar Ujian</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Interview Card (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-accent bg-soft-blue px-3 py-1 rounded-md border border-accent-border">
                  JADWAL WAWANCARA
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-accent animate-ping" />
              </div>

              <h3 className="font-heading font-bold text-base text-ink">
                Live Interview Asesor
              </h3>
              <p className="text-xs text-muted-slate mt-1 leading-relaxed">
                Tahap 4: Pendalaman Kompetensi Teknis &amp; Pemecahan Kasus Nyata
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-exam-bg border border-slate-200">
                  <Calendar className="w-4 h-4 text-primary-navy shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-ink">Kamis, 29 Oktober 2026</p>
                    <p className="text-muted-slate text-[11px]">14:00 - 14:45 WIB (45 Menit)</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-exam-bg border border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-soft-blue text-primary-navy font-bold text-xs flex items-center justify-center shrink-0 border border-accent-border">
                    DH
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-ink">Dr. Ir. Dwi Hartanto, M.Kom</p>
                    <p className="text-muted-slate text-[11px]">Lead Assessor • Arsitektur Cloud</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => navigate('/peserta/waiting-room')}
                className="w-full py-2.5 px-4 rounded-xl text-primary-navy font-bold text-xs flex items-center justify-center gap-2 cursor-pointer bg-soft-blue hover:bg-blue-100/70 border-accent-border"
              >
                <Clock className="w-4 h-4 text-blue-accent" />
                <span>Masuk ke Waiting Room</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Visual Pipeline Tahapan Asesmen (Clean, Friendly Stepper) ─── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-heading font-bold text-lg text-ink">
                Progres Tahapan Seleksi Anda
              </h3>
              <p className="text-xs sm:text-sm text-muted-slate mt-0.5">
                Lacak seluruh pencapaian tahapan evaluasi Anda secara transparan dan berurutan
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-primary-navy bg-soft-blue px-3.5 py-1.5 rounded-full border border-accent-border self-start sm:self-auto">
              {isCatCompleted ? 'Tahap 3 dari 5 Selesai (Wawancara Aktif)' : 'Tahap 2 dari 5 Selesai (Ujian CAT Aktif)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {stages.map((stg, idx) => {
              const isCompleted = stg.status === 'completed';
              const isActive = stg.status === 'active';
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isActive
                      ? 'border-blue-accent bg-soft-blue shadow-2xs'
                      : isCompleted
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        Langkah 0{idx + 1}
                      </span>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isActive ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-accent animate-pulse" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                    <p
                      className={`text-xs font-bold leading-snug ${
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
                  <div className="mt-3 pt-2 border-t border-slate-200/50">
                    <p className="text-[11px] text-muted-slate font-medium">{stg.desc}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{stg.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Tips Pengerjaan Ujian Nyaman & Lancar (Reassuring Guidance) ─── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2 mb-4 text-ink">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h3 className="font-heading font-bold text-base">
              Tips Menjalani Asesmen dengan Nyaman &amp; Tenang
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="p-4 rounded-xl bg-exam-bg border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-ink text-xs">
                <Smile className="w-3.5 h-3.5 text-blue-accent" />
                <span>Pencahayaan &amp; Posisi Nyaman</span>
              </div>
              <p className="leading-relaxed text-muted-slate text-xs">
                Duduk tegak menghadap layar di ruangan dengan pencahayaan cukup agar kamera web dapat mengenali kehadiran Anda tanpa silau.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-exam-bg border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-ink text-xs">
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>Koneksi Internet Stabil</span>
              </div>
              <p className="leading-relaxed text-muted-slate text-xs">
                Gunakan jaringan internet minimal 5 Mbps. Jika sinyal sempat terputus, sistem akan mencoba menghubungkan kembali secara otomatis.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-exam-bg border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-ink text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Penyimpanan Respon Otomatis</span>
              </div>
              <p className="leading-relaxed text-muted-slate text-xs">
                Setiap jawaban Anda langsung tersimpan berkala di cloud. Anda bebas meninjau kembali butir soal yang ragu-ragu kapan saja sebelum mengumpulkan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PesertaLayout>
  );
}
