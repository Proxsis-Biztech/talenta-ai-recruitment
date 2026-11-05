import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
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
import { getPortalToken } from '../../services/portalAuthService';

export default function PesertaDashboard() {
  const navigate = useNavigate();

  // Read active candidate and their assigned PT & assessment program
  const activeUser = useMemo(() => {
    return getActiveSessionUser();
  }, []);

  const activeProgram = useMemo(() => {
    return getProgramById(activeUser.assessmentId || 'SE-402') || getProgramById('SE-402')!;
  }, [activeUser.assessmentId]);

  const [dashboard, setDashboard] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    const loadDashboard = async () => {
      const token = getPortalToken();
      if (!token) return;
      try {
        const response = await axios.get('/api/portal/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!cancelled) setDashboard(response.data);
      } catch {
        if (!cancelled) setDashboard(null);
      }
    };
    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const isCatCompleted = ['submitted', 'graded'].includes(dashboard?.exam?.status || '');
  const faceVerified = Boolean(dashboard?.user?.faceVerifiedAt);
  const profileComplete = dashboard
    ? Boolean(dashboard?.user?.name && dashboard?.user?.phone && dashboard?.user?.nik && dashboard?.user?.education && dashboard?.user?.university && dashboard?.user?.city)
    : true;
  const interview = dashboard?.interview || {};
  const lha = dashboard?.lha;

  const formatDate = (value?: string | null) =>
    value
      ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-';

  const formatSchedule = (value?: string | null) =>
    value
      ? new Date(value).toLocaleString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) + ' WIB'
      : 'Belum dijadwalkan';

  const stages = [
    { title: 'Pendaftaran & Berkas', status: 'completed', date: formatDate(dashboard?.user?.createdAt), desc: 'Terverifikasi' },
    {
      title: 'Verifikasi Device Check',
      status: faceVerified ? 'completed' : 'active',
      date: faceVerified ? formatDate(dashboard?.user?.faceVerifiedAt) : 'Belum dilakukan',
      desc: faceVerified ? 'Wajah terverifikasi' : 'Perlu verifikasi perangkat'
    },
    {
      title: 'Tes Kemampuan Teknis (CAT)',
      status: isCatCompleted ? 'completed' : 'active',
      date: isCatCompleted ? formatDate(dashboard?.exam?.submittedAt) : 'Siap dimulai',
      desc: isCatCompleted ? 'Jawaban tersimpan' : 'Paket soal • Siap Dimulai'
    },
    {
      title: 'Live Interview & Rubrik Asesor',
      status: interview.status === 'completed' ? 'completed' : isCatCompleted ? 'active' : 'upcoming',
      date: interview.scheduledAt ? formatDate(interview.scheduledAt) : 'Belum dijadwalkan',
      desc: interview.assessorName || 'Menunggu asesor'
    },
    {
      title: 'Pengumuman & Rekap Hasil',
      status: lha?.signed ? 'completed' : 'upcoming',
      date: lha?.signedAt ? formatDate(lha.signedAt) : 'Menunggu LHA',
      desc: lha?.signed ? 'LHA telah terbit' : 'Setelah penilaian asesor'
    }
  ];

  const profileFilled = [
    dashboard?.user?.name,
    dashboard?.user?.phone,
    dashboard?.user?.nik,
    dashboard?.user?.education,
    dashboard?.user?.university,
    dashboard?.user?.city
  ].filter(Boolean).length;
  const completedStages = stages.filter((stage) => stage.status === 'completed').length;
  const assessmentProgress = Math.round((completedStages / stages.length) * 100);
  const activeStage = stages.find((stage) => stage.status === 'active')?.title || 'Selesai';
  const initials = activeUser.name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();

  return (
    <PesertaLayout activeTab="dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-10 sm:space-y-12 antialiased">
        {!profileComplete && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-amber-900">Lengkapi data diri sebelum memulai asesmen</p>
              <p className="text-xs text-amber-800 mt-1">Kolom bertanda * pada Profil Peserta wajib diisi. Tahap berikutnya terkunci sampai profil lengkap.</p>
            </div>
            <Button variant="primary" onClick={() => navigate('/peserta/profile')} className="text-xs py-2 px-4 shrink-0">
              Lengkapi Data Diri
            </Button>
          </div>
        )}
        {/* ─── Hero Header: Connected Dual-Tone Split Banner (Sambung Menyatu, Beda Warna, Elegan) ─── */}
        <div className="rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden bg-white grid grid-cols-1 lg:grid-cols-12">
          {/* Sisi Kiri (lg:col-span-8): Tema Deep Primary Navy dengan Nuansa Elegan */}
          <div className="lg:col-span-8 bg-gradient-to-br from-[#1E3A8A] via-[#1a347d] to-[#11214e] text-white p-6 sm:p-9 flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Lighting Orbs */}
            <div aria-hidden className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-blue-400/15 blur-3xl pointer-events-none" />
            <div aria-hidden className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
            <div aria-hidden className="absolute right-16 bottom-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

            <div className="space-y-6 relative">
              {/* Top Header Badge & Live Session Indicator */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white flex items-center justify-center font-bold text-base shadow-sm ring-2 ring-white/10">
                    {initials || 'P'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-blue-200">Dashboard Peserta</p>
                      <span className="w-1 h-1 rounded-full bg-blue-300/60" />
                      <span className="text-[11px] font-mono font-medium text-blue-200/90">
                        ID {dashboard?.user?.candidateCode || activeUser.id.slice(0, 8)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white/95 mt-0.5">{activeProgram.companyName}</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/20 border border-emerald-300/40 px-3 py-1 text-xs font-semibold text-emerald-200 backdrop-blur-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  Sesi Aktif
                </span>
              </div>

              {/* Greeting & Subtitle */}
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight leading-tight">
                  Selamat Datang, {activeUser.name}!
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-blue-100/90 mt-3 leading-relaxed max-w-2xl font-normal">
                  {isCatCompleted
                    ? `Selamat, Anda telah menuntaskan lembar CAT untuk ${activeProgram.title}. Seluruh jawaban Anda telah tersimpan dengan aman. Langkah berikutnya adalah sesi Wawancara Tatap Muka bersama Asesor.`
                    : `Sesi evaluasi kompetensi untuk posisi ${activeProgram.title} di ${activeProgram.companyName} telah dibuka. Ikuti tahapan asesmen dengan tenang, seluruh progres Anda tercatat otomatis.`}
                </p>
              </div>

              {/* Dual Progress Glass Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-blue-100 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-300" />
                      Progres Tahapan
                    </span>
                    <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-md text-[11px]">
                      {completedStages} / {stages.length}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/20 overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-300 transition-all duration-500 shadow-xs"
                      style={{ width: `${assessmentProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-blue-200/90 font-medium truncate">
                    Tahap aktif: <span className="text-white font-semibold">{activeStage}</span>
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-blue-100 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                      Kelengkapan Profil
                    </span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded-md text-[11px] ${
                        profileFilled === 6 ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/20 text-amber-200'
                      }`}
                    >
                      {profileFilled} / 6
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/20 overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        profileFilled === 6
                          ? 'bg-gradient-to-r from-emerald-400 to-teal-300'
                          : 'bg-gradient-to-r from-amber-400 to-yellow-300'
                      }`}
                      style={{ width: `${(profileFilled / 6) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-blue-200/90 font-medium">
                    {profileFilled === 6 ? (
                      <span className="text-emerald-200 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Data profil terverifikasi lengkap
                      </span>
                    ) : (
                      <span className="text-amber-200">Lengkapi profil Anda agar 6/6</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Buttons in Left Side */}
            <div className="mt-8 pt-6 border-t border-white/15 flex flex-wrap items-center gap-3.5 relative">
              {isCatCompleted ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/peserta/waiting-room')}
                    className="py-3 px-6 rounded-xl font-bold text-xs sm:text-sm bg-white text-primary-navy hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer group"
                  >
                    <Video className="w-4 h-4 text-primary-navy" />
                    <span>Masuk Ruang Tunggu Wawancara</span>
                    <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </button>
                  <button
                    type="button"
                    disabled={!dashboard?.lha}
                    onClick={() => navigate('/peserta/hasil')}
                    className={`py-3 px-5 rounded-xl font-semibold text-xs sm:text-sm border transition-all duration-200 flex items-center gap-2 ${
                      dashboard?.lha
                        ? 'border-white/30 text-white hover:bg-white/10 cursor-pointer'
                        : 'border-white/20 text-white/60 bg-white/5 cursor-not-allowed'
                    }`}
                  >
                    <Award className="w-4 h-4 text-emerald-300" />
                    <span>{dashboard?.lha ? 'Lihat LHA Resmi' : 'Menunggu Penilaian Asesor'}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={!profileComplete}
                    onClick={() => navigate(`/peserta/exam/${activeProgram.id}`)}
                    className="py-3 px-6 rounded-xl font-bold text-xs sm:text-sm bg-white text-primary-navy hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <PlayCircle className="w-4 h-4 text-primary-navy" />
                    <span>{profileComplete ? 'Mulai Ujian CAT Sekarang (40 Soal)' : 'Lengkapi Profil untuk Memulai Ujian'}</span>
                    <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </button>
                  <button
                    type="button"
                    disabled={!profileComplete}
                    onClick={() => navigate('/peserta/device-check')}
                    className="py-3 px-5 rounded-xl font-semibold text-xs sm:text-sm text-white border border-white/30 hover:bg-white/10 transition-all duration-200 flex items-center gap-2 cursor-pointer"
                  >
                    <Laptop className="w-4 h-4 text-white" />
                    <span>Uji Ulang Kamera &amp; Mic</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Sisi Kanan (lg:col-span-4): Sambungan Doket & Status dengan Warna Kontras Bersih */}
          <div className="lg:col-span-4 bg-gradient-to-b from-[#FAFBFD] via-[#F8FAFC] to-[#F1F5F9] border-t lg:border-t-0 lg:border-l border-slate-200/90 p-6 sm:p-8 flex flex-col justify-between relative">
            <div className="space-y-5">
              {/* Header Sisi Kanan */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80">
                <span className="font-mono text-xs font-bold text-primary-navy uppercase tracking-wider bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  REF: {activeProgram.id}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sesi Aktif
                </span>
              </div>

              {/* Structured Metadata Rows */}
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-white border border-slate-200/70 shadow-2xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-primary-navy">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Instansi Penguji</p>
                      <p className="text-xs font-bold text-slate-800 truncate">{activeProgram.companyName}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200/70 shadow-2xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-700">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Nomor Peserta</p>
                      <p className="text-xs font-mono font-bold text-primary-navy truncate">
                        {dashboard?.user?.candidateCode || activeUser.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200/70 shadow-2xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Jadwal Wawancara</p>
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {formatSchedule(interview.scheduledAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Support & Integrity Badge */}
            <div className="mt-6 pt-4 border-t border-slate-200/80 space-y-2.5">
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-3 text-xs text-emerald-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-emerald-950 text-xs">Pusat Bantuan &amp; Integritas</p>
                  <p className="text-[11px] text-emerald-800 leading-snug">
                    Butuh bantuan teknis? Hubungi helpdesk pengawas melalui bilah atas atau periksa kesiapan perangkat Anda.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/peserta/device-check')}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
              >
                <Laptop className="w-3.5 h-3.5 text-slate-500" />
                <span>Uji Kesiapan Perangkat (Kamera &amp; Mic)</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── 8 / 4 Split: Active Assessment & Upcoming Interview ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          {/* Active Assessment Card (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col justify-between ">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary-navy bg-soft-blue px-3 py-1 rounded-lg border border-accent-border">
                  PROGRAM UTAMA: {activeProgram.id}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Sesi Terbuka • {activeProgram.gradeLevel}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold font-heading text-ink leading-snug">
                {activeProgram.title}
              </h2>

              {/* 4 Metric Chips */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-exam-bg rounded-2xl border border-slate-200">
                  <span className="text-xs text-muted-slate block font-medium">Durasi Ujian</span>
                  <p className="font-mono text-base font-bold text-ink mt-0.5">{activeProgram.durationMinutes} Menit</p>
                </div>
                <div className="p-4 bg-exam-bg rounded-2xl border border-slate-200">
                  <span className="text-xs text-muted-slate block font-medium">Beban Soal</span>
                  <p className="font-mono text-base font-bold text-primary-navy mt-0.5">{activeProgram.totalQuestions} Butir (CAT)</p>
                </div>
                <div className="p-4 bg-exam-bg rounded-2xl border border-slate-200">
                  <span className="text-xs text-muted-slate block font-medium">Status Hasil</span>
                  <p className="text-sm font-bold text-amber-700 mt-0.5">Menunggu asesor</p>
                </div>
                <div className="p-4 bg-exam-bg rounded-2xl border border-slate-200">
                  <span className="text-xs text-muted-slate block font-medium">Tingkat / Grade</span>
                  <p className="font-mono text-xs sm:text-sm font-bold text-amber-600 mt-1 line-clamp-1">{activeProgram.difficultyLabel} ({activeProgram.gradeLevel.split(' ')[0]})</p>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
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
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col justify-between shadow-xs ">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-accent bg-soft-blue px-3 py-1 rounded-md border border-accent-border">
                  JADWAL WAWANCARA
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-accent" />
              </div>

              <h3 className="font-heading font-bold text-base text-ink">
                Live Interview Asesor
              </h3>
              <p className="text-xs text-muted-slate mt-1 leading-relaxed">
                Tahap 4: Pendalaman Kompetensi Teknis &amp; Pemecahan Kasus Nyata
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-exam-bg border border-slate-200">
                  <Calendar className="w-4 h-4 text-primary-navy shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-ink">
                      {formatSchedule(interview.scheduledAt)}
                    </p>
                    <p className="text-muted-slate text-[11px]">{dashboard?.program?.durationMinutes || 45} Menit</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-2xl bg-exam-bg border border-slate-200 transition-colors hover:border-accent-border">
                  <div className="w-8 h-8 rounded-full bg-soft-blue text-primary-navy font-bold text-xs flex items-center justify-center shrink-0 border border-accent-border">
                    DH
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-ink">{interview.assessorName || 'Tim Asesor Right'}</p>
                    <p className="text-muted-slate text-[11px]">Asesor Sesi Wawancara</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                disabled={!profileComplete}
                onClick={() => navigate('/peserta/waiting-room')}
                className="w-full py-2.5 px-4 rounded-xl text-primary-navy font-bold text-xs flex items-center justify-center gap-2 cursor-pointer bg-soft-blue hover:bg-blue-100/70 border-accent-border"
              >
                <Clock className="w-4 h-4 text-blue-accent" />
                <span>{profileComplete ? 'Masuk ke Waiting Room' : 'Lengkapi Profil untuk Wawancara'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Visual Pipeline Tahapan Asesmen (Clean, Friendly Stepper) ─── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {stages.map((stg, idx) => {
              const isCompleted = stg.status === 'completed';
              const isActive = stg.status === 'active';
              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between ${
                    isActive
                      ? 'border-blue-accent/70 bg-soft-blue shadow-2xs ring-1 ring-blue-accent/20'
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
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-accent" />
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
                  <div className="mt-4 pt-2.5 border-t border-slate-200/50">
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
          <div className="flex items-center gap-2.5 mb-6 text-ink">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h3 className="font-heading font-bold text-base">
              Tips Menjalani Asesmen dengan Nyaman &amp; Tenang
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-600">
            <div className="p-5 rounded-2xl bg-exam-bg border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-ink text-xs">
                <Smile className="w-3.5 h-3.5 text-blue-accent" />
                <span>Pencahayaan &amp; Posisi Nyaman</span>
              </div>
              <p className="leading-relaxed text-muted-slate text-xs">
                Duduk tegak menghadap layar di ruangan dengan pencahayaan cukup agar kamera web dapat mengenali kehadiran Anda tanpa silau.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-exam-bg border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-ink text-xs">
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>Koneksi Internet Stabil</span>
              </div>
              <p className="leading-relaxed text-muted-slate text-xs">
                Gunakan jaringan internet minimal 5 Mbps. Jika sinyal sempat terputus, sistem akan mencoba menghubungkan kembali secara otomatis.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-exam-bg border border-slate-200 space-y-2">
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
