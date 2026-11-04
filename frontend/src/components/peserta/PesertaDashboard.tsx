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
import { CameraProctorTile } from './CameraProctorTile';

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
    ? Boolean(dashboard?.user?.name && dashboard?.user?.phone && (dashboard?.user?.nik || dashboard?.user?.employeeNumber) && dashboard?.user?.education && dashboard?.user?.university && dashboard?.user?.city)
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
        {/* ─── Hero Header: Asymmetric 8 / 4 Split (Friendly, Clear Next Step) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          {/* Sisi Kiri (8 kolom): Salam Personal, Status Tahapan & Aksi Utama */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-7 sm:p-10 shadow-xs flex flex-col justify-between relative overflow-hidden card-hover">
            <div className="space-y-5 relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-soft-blue text-primary-navy text-xs font-semibold border border-accent-border">
                <Sparkles className="w-3.5 h-3.5 text-blue-accent" />
                <span>
                  {isCatCompleted
                    ? 'Tahap Ujian CAT Selesai • Lanjut Sesi Wawancara'
                    : 'Ujian CAT Siap Dikerjakan • 40 Soal'}
                </span>
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-ink tracking-tight leading-tight">
                  Selamat Datang, {activeUser.name}!
                </h1>
                <p className="text-sm sm:text-base text-muted-slate mt-3.5 leading-relaxed max-w-2xl">
                  {isCatCompleted
                    ? `Selamat, Anda telah menuntaskan lembar CAT untuk ${activeProgram.title}. Seluruh jawaban Anda telah tersimpan dengan aman. Langkah berikutnya adalah sesi Wawancara Tatap Muka bersama Asesor.`
                    : `Sesi evaluasi kompetensi untuk posisi ${activeProgram.title} di ${activeProgram.companyName} telah dibuka. Ikuti tahapan asesmen dengan tenang, seluruh progres Anda tercatat otomatis.`}
                </p>
              </div>
            </div>

            <div className="mt-9 pt-7 border-t border-slate-100 flex flex-wrap items-center gap-4 relative">
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
                    disabled={!dashboard?.lha}
                    onClick={() => navigate('/peserta/hasil')}
                    className="py-3 px-5 rounded-xl font-semibold text-xs sm:text-sm text-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>{dashboard?.lha ? 'Lihat LHA Resmi' : 'Menunggu Penilaian Asesor'}</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="primary"
                    disabled={!profileComplete}
                    onClick={() => navigate(`/peserta/exam/${activeProgram.id}`)}
                    className="py-3 px-6 rounded-xl font-bold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <PlayCircle className="w-4 h-4 text-blue-100" />
                    <span>{profileComplete ? 'Mulai Ujian CAT Sekarang (40 Soal)' : 'Lengkapi Profil untuk Memulai Ujian'}</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!profileComplete}
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
          <div className="lg:col-span-4 bg-exam-bg rounded-3xl border border-slate-200 p-7 sm:p-8 flex flex-col justify-between shadow-2xs relative overflow-hidden">
            <div className="space-y-5 relative">
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
                <div className="flex justify-between py-2.5 border-b border-slate-200/60">
                  <span>Instansi Penguji</span>
                  <span className="font-semibold text-ink text-right">{activeProgram.companyName}</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-slate-200/60">
                  <span>Nomor Peserta</span>
                  <span className="font-mono font-bold text-ink">{dashboard?.user?.candidateCode || activeUser.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span>Jadwal Wawancara</span>
                  <span className="font-mono font-semibold text-ink text-right">
                    {formatSchedule(interview.scheduledAt)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Status Pengawasan</span>
                  <span className={`text-[11px] font-semibold ${faceVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {faceVerified ? 'Siap' : 'Perlu tindakan'}
                  </span>
                </div>
                <CameraProctorTile compact active={Boolean(faceVerified && dashboard?.exam?.status === 'in_progress')} />
                <p className="text-[11px] text-slate-500 leading-snug">
                  Kamera aktif hanya saat Cek Perangkat atau sesi ujian berlangsung.
                </p>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          {/* Active Assessment Card (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-7 sm:p-10 shadow-xs flex flex-col justify-between card-hover">
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
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-exam-bg rounded-2xl border border-slate-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xs hover:border-accent-border">
                  <span className="text-xs text-muted-slate block font-medium">Durasi Ujian</span>
                  <p className="font-mono text-base font-bold text-ink mt-0.5">{activeProgram.durationMinutes} Menit</p>
                </div>
                <div className="p-4 bg-exam-bg rounded-2xl border border-slate-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xs hover:border-accent-border">
                  <span className="text-xs text-muted-slate block font-medium">Beban Soal</span>
                  <p className="font-mono text-base font-bold text-primary-navy mt-0.5">{activeProgram.totalQuestions} Butir (CAT)</p>
                </div>
                <div className="p-4 bg-exam-bg rounded-2xl border border-slate-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xs hover:border-accent-border">
                  <span className="text-xs text-muted-slate block font-medium">Status Hasil</span>
                  <p className="text-sm font-bold text-amber-700 mt-0.5">Menunggu asesor</p>
                </div>
                <div className="p-4 bg-exam-bg rounded-2xl border border-slate-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xs hover:border-accent-border">
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
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-7 sm:p-8 flex flex-col justify-between shadow-xs card-hover">
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
                    <p className="font-bold text-ink">{interview.assessorName || 'Tim Asesor Talenta+'}</p>
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
        <div className="bg-white rounded-3xl border border-slate-200 p-7 sm:p-10 shadow-xs space-y-8">
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
        <div className="bg-white rounded-3xl border border-slate-200 p-7 sm:p-10 shadow-xs">
          <div className="flex items-center gap-2.5 mb-6 text-ink">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h3 className="font-heading font-bold text-base">
              Tips Menjalani Asesmen dengan Nyaman &amp; Tenang
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-600">
            <div className="p-5 rounded-2xl bg-exam-bg border border-slate-200 space-y-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xs hover:border-accent-border">
              <div className="flex items-center gap-2 font-bold text-ink text-xs">
                <Smile className="w-3.5 h-3.5 text-blue-accent" />
                <span>Pencahayaan &amp; Posisi Nyaman</span>
              </div>
              <p className="leading-relaxed text-muted-slate text-xs">
                Duduk tegak menghadap layar di ruangan dengan pencahayaan cukup agar kamera web dapat mengenali kehadiran Anda tanpa silau.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-exam-bg border border-slate-200 space-y-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xs hover:border-accent-border">
              <div className="flex items-center gap-2 font-bold text-ink text-xs">
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>Koneksi Internet Stabil</span>
              </div>
              <p className="leading-relaxed text-muted-slate text-xs">
                Gunakan jaringan internet minimal 5 Mbps. Jika sinyal sempat terputus, sistem akan mencoba menghubungkan kembali secara otomatis.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-exam-bg border border-slate-200 space-y-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xs hover:border-accent-border">
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
