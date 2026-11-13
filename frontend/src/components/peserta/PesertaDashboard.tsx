import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Video,
  Award,
  Camera,
  UserCheck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  MoreHorizontal,
  Calendar as CalendarIcon
} from 'lucide-react';
import { PesertaLayout } from './PesertaLayout';
import { Button } from '../ui';
import { getActiveSessionUser } from '../../services/userRegistryService';
import { getProgramById } from '../../services/assessmentCatalog';
import { getPortalToken } from '../../services/portalAuthService';

type TaskFilterTab = 'all' | 'pending' | 'completed';

interface DashboardTask {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  status: 'completed' | 'pending' | 'upcoming';
  actionLabel: string;
  tone: 'mint' | 'amber' | 'lavender';
  icon: React.ComponentType<{ className?: string }>;
  onAction: () => void;
}

const WEEKDAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

export default function PesertaDashboard() {
  const navigate = useNavigate();

  const activeUser = useMemo(() => getActiveSessionUser(), []);

  const fallbackProgram = useMemo(() => {
    return (
      getProgramById(activeUser.assessmentId || 'SE-402') ||
      ({
        id: activeUser.assessmentId || 'SE-402',
        title: activeUser.assessmentTitle || 'Program Asesmen',
        companyName: activeUser.companyName || '-',
        durationMinutes: 90,
        gradeLevel: activeUser.gradeLevel || 'Grade B (Specialist / Mid)'
      } as any)
    );
  }, [activeUser.assessmentId, activeUser.assessmentTitle, activeUser.companyName, activeUser.gradeLevel]);

  const [dashboard, setDashboard] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [taskTab, setTaskTab] = useState<TaskFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    let cancelled = false;
    const loadDashboard = async () => {
      const token = getPortalToken();
      if (!token) {
        setLoadingDashboard(false);
        return;
      }
      try {
        const response = await axios.get('/api/portal/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!cancelled) setDashboard(response.data);
      } catch {
        if (!cancelled) setDashboard(null);
      } finally {
        if (!cancelled) setLoadingDashboard(false);
      }
    };
    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  // Real user & program data prioritized from /api/portal/dashboard
  const realUser = dashboard?.user || activeUser;
  const programTitle =
    dashboard?.program?.title || realUser?.assessmentTitle || fallbackProgram.title;
  const companyName = realUser?.companyName || fallbackProgram.companyName || '-';
  const programDuration =
    dashboard?.program?.durationMinutes || fallbackProgram.durationMinutes || 90;

  const programHeaderLabel = programTitle.toLowerCase().includes(companyName.toLowerCase())
    ? programTitle
    : `${programTitle} • ${companyName}`;

  const isCatCompleted = ['submitted', 'graded'].includes(dashboard?.exam?.status || '');
  const isInterviewCompleted = dashboard?.interview?.status === 'completed';
  const faceVerified = Boolean(dashboard?.user?.faceVerifiedAt || dashboard?.user?.deviceCheckCompletedAt);
  const profileComplete = dashboard
    ? Boolean(
        dashboard?.user?.name &&
          dashboard?.user?.phone &&
          dashboard?.user?.nik &&
          dashboard?.user?.education &&
          dashboard?.user?.university &&
          dashboard?.user?.city
      )
    : true;
  const interview = dashboard?.interview || {};
  const lha = dashboard?.lha;

  const formatShortDate = (value?: string | null) =>
    value
      ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      : '-';

  const formatDate = (value?: string | null) =>
    value
      ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-';

  const tasks: DashboardTask[] = useMemo(
    () => [
      {
        id: 'profile',
        title: 'Kelengkapan Data Diri & Dokumen',
        subtitle: `${realUser?.name || activeUser.name} • ${companyName}`,
        category: 'Administrasi',
        status: profileComplete ? 'completed' : 'pending',
        actionLabel: profileComplete ? 'Selesai' : 'Lengkapi',
        tone: 'mint',
        icon: UserCheck,
        onAction: () => navigate('/peserta/profile')
      },
      {
        id: 'device',
        title: 'Verifikasi Kamera, Mikrofon & Wajah',
        subtitle: faceVerified
          ? `Terverifikasi pada ${formatDate(dashboard?.user?.faceVerifiedAt || dashboard?.user?.deviceCheckCompletedAt)}`
          : 'Wajib sebelum memulai sesi CAT & Wawancara',
        category: 'Perangkat',
        status: faceVerified ? 'completed' : 'pending',
        actionLabel: faceVerified ? 'Tervalidasi' : 'Cek Perangkat',
        tone: 'amber',
        icon: Camera,
        onAction: () => navigate('/peserta/device-check')
      },
      {
        id: 'cat',
        title: `Ujian Kompetensi CAT — ${programTitle}`,
        subtitle: isCatCompleted
          ? `Selesai dikumpulkan • ${formatDate(dashboard?.exam?.submittedAt)}${
              dashboard?.exam?.score != null ? ` • Skor ${dashboard.exam.score}` : ''
            }`
          : `Durasi ${programDuration} Menit • Akses melalui Asesmen Saya`,
        category: 'Asesmen',
        status: isCatCompleted ? 'completed' : 'pending',
        actionLabel: isCatCompleted ? 'Selesai' : 'Buka Asesmen',
        tone: 'lavender',
        icon: FileText,
        onAction: () => navigate('/peserta/asesmen')
      },
      {
        id: 'interview',
        title: 'Sesi Wawancara Tatap Muka Asesor',
        subtitle: isInterviewCompleted
          ? `Selesai • ${interview.assessorName || 'Tim Asesor'}${
              interview.score != null ? ` • Skor ${interview.score}` : ''
            }`
          : interview.assessorName
            ? `Asesor: ${interview.assessorName} • ${
                interview.scheduledAt ? formatDate(interview.scheduledAt) : 'Menunggu Jadwal'
              }`
            : 'Sesi tatap muka daring bersama Dewan Asesor',
        category: 'Wawancara',
        status: isInterviewCompleted
          ? 'completed'
          : isCatCompleted
            ? 'pending'
            : 'upcoming',
        actionLabel: isInterviewCompleted
          ? 'Selesai'
          : isCatCompleted
            ? 'Buka Asesmen'
            : 'Menunggu CAT',
        tone: 'amber',
        icon: Video,
        onAction: () => navigate('/peserta/asesmen')
      },
      {
        id: 'lha',
        title: 'Laporan Hasil Asesmen (LHA) & Sertifikat',
        subtitle: lha?.signed
          ? `Diterbitkan pada ${formatDate(lha.signedAt)} • ${lha.recommendation || 'Terverifikasi'}`
          : 'Menunggu penerbitan resmi oleh Dewan Asesor',
        category: 'Evaluasi',
        status: lha?.signed ? 'completed' : 'upcoming',
        actionLabel: lha?.signed ? 'Lihat Hasil' : 'Menunggu LHA',
        tone: 'mint',
        icon: Award,
        onAction: () => navigate('/peserta/hasil')
      }
    ],
    [
      activeUser.name,
      companyName,
      dashboard?.exam?.score,
      dashboard?.exam?.submittedAt,
      dashboard?.user?.deviceCheckCompletedAt,
      dashboard?.user?.faceVerifiedAt,
      faceVerified,
      interview.assessorName,
      interview.scheduledAt,
      interview.score,
      isCatCompleted,
      isInterviewCompleted,
      lha?.recommendation,
      lha?.signed,
      lha?.signedAt,
      navigate,
      profileComplete,
      programDuration,
      programTitle,
      realUser?.name
    ]
  );

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((item) => {
      const matchTab =
        taskTab === 'all'
          ? true
          : taskTab === 'completed'
            ? item.status === 'completed'
            : item.status !== 'completed';
      const matchSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.subtitle.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);
      return matchTab && matchSearch;
    });
  }, [searchQuery, taskTab, tasks]);

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const remainingCatAndInterview = (isCatCompleted ? 0 : 1) + (isInterviewCompleted ? 0 : 1);

  // Build calendar cells (Monday-first grid)
  const calendarDays = useMemo(() => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();

    const cells: Array<{ date: Date; inMonth: boolean }> = [];

    const prevLastDate = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, prevLastDate - i),
        inMonth: false
      });
    }

    for (let d = 1; d <= totalDays; d++) {
      cells.push({
        date: new Date(year, month, d),
        inMonth: true
      });
    }

    const remainder = cells.length % 7;
    if (remainder !== 0) {
      const needed = 7 - remainder;
      for (let d = 1; d <= needed; d++) {
        cells.push({
          date: new Date(year, month + 1, d),
          inMonth: false
        });
      }
    }
    return cells;
  }, [calendarCursor]);

  const today = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const interviewDate = interview?.scheduledAt ? new Date(interview.scheduledAt) : null;
  const examSubmittedDate = dashboard?.exam?.submittedAt ? new Date(dashboard.exam.submittedAt) : null;

  // Real upcoming/pending events only (never show already-completed sessions as upcoming)
  const upcomingEvents = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      desc: string;
      dateLabel: string;
      durationLabel: string;
      dotColor: string;
      iconBg: string;
      icon: React.ComponentType<{ className?: string }>;
    }> = [];

    if (!isCatCompleted) {
      list.push({
        id: 'ev-cat',
        title: 'Ujian CAT Kompetensi',
        desc: `Akses melalui menu Asesmen Saya`,
        dateLabel: 'Tersedia',
        durationLabel: `${programDuration} Menit`,
        dotColor: 'bg-[#F95B2B]',
        iconBg: 'bg-[#F2F0FE] text-[#5B4CE4]',
        icon: FileText
      });
    }

    if (!isInterviewCompleted) {
      list.push({
        id: 'ev-interview',
        title: 'Wawancara Panel Asesor',
        desc: interview.assessorName ? `Asesor: ${interview.assessorName}` : 'Sesi tatap muka daring',
        dateLabel: interview.scheduledAt ? formatShortDate(interview.scheduledAt) : 'Menunggu',
        durationLabel: interview.queuePosition ? `Antrean #${interview.queuePosition}` : 'Terjadwal',
        dotColor: 'bg-amber-400',
        iconBg: 'bg-[#FEF7E6] text-[#D97706]',
        icon: Video
      });
    }

    if (!lha?.signed) {
      list.push({
        id: 'ev-lha',
        title: 'Penerbitan Hasil (LHA)',
        desc: 'Menunggu tanda tangan digital asesor',
        dateLabel: 'Pasca Sesi',
        durationLabel: 'Belum Terbit',
        dotColor: 'bg-[#0F9D8A]',
        iconBg: 'bg-[#EAF8F5] text-[#0F9D8A]',
        icon: ShieldCheck
      });
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (ev) => ev.title.toLowerCase().includes(q) || ev.desc.toLowerCase().includes(q)
    );
  }, [
    interview.assessorName,
    interview.queuePosition,
    interview.scheduledAt,
    isCatCompleted,
    isInterviewCompleted,
    lha?.signed,
    programDuration,
    searchQuery
  ]);

  const toneBadgeClasses: Record<DashboardTask['tone'], string> = {
    mint: 'bg-[#EAF8F5] text-[#0F9D8A]',
    amber: 'bg-[#FEF7E6] text-[#D97706]',
    lavender: 'bg-[#F2F0FE] text-[#5B4CE4]'
  };

  return (
    <PesertaLayout activeTab="dashboard">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6 sm:py-8 antialiased">
        {!profileComplete && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-amber-900">
                Lengkapi data diri sebelum memulai asesmen
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Kolom bertanda * pada Profil Peserta wajib diisi agar akses ujian dan wawancara terbuka penuh.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate('/peserta/profile')}
              className="text-xs py-2 px-4 shrink-0"
            >
              Lengkapi Data Diri
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
          {/* ─── Kolom Utama Kiri (8/12) ─── */}
          <div className="xl:col-span-8 space-y-8">
            {/* Section 1: Asesmen Saya (3 Pastel Cards ala Reference) */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-slate-900 tracking-tight">
                  Asesmen Saya<span className="text-[#F95B2B]">.</span>
                </h1>
                <p className="text-xs font-medium text-slate-500">
                  {loadingDashboard ? 'Memuat program...' : programHeaderLabel}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Card 1: Mint — Ujian CAT */}
                <div className="rounded-3xl bg-[#EAF8F5] p-5 flex flex-col items-center text-center transition-transform hover:-translate-y-0.5">
                  <div className="relative mb-4 mt-1">
                    <div className="w-14 h-14 rounded-2xl bg-[#0F9D8A] text-white flex items-center justify-center shadow-sm rotate-3">
                      <FileText className="w-6 h-6 -rotate-3" />
                    </div>
                    <span
                      className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#EAF8F5] ${
                        isCatCompleted ? 'bg-emerald-500' : 'bg-[#F95B2B]'
                      }`}
                    />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Ujian CAT</h2>
                  <p className="text-xs text-slate-500 mt-1 mb-5">
                    {isCatCompleted
                      ? dashboard?.exam?.score != null
                        ? `Skor: ${dashboard.exam.score}/100 • Selesai`
                        : 'Selesai & Tersimpan'
                      : `${programDuration} Menit • Siap Dikerjakan`}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/peserta/asesmen')}
                    className="w-full max-w-[150px] py-2 px-4 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 shadow-xs border border-slate-200/60 transition-colors cursor-pointer"
                  >
                    Buka Asesmen
                  </button>
                </div>

                {/* Card 2: Warm Cream — Wawancara Asesor */}
                <div className="rounded-3xl bg-[#FEF7E6] p-5 flex flex-col items-center text-center transition-transform hover:-translate-y-0.5">
                  <div className="relative mb-4 mt-1">
                    <div className="w-14 h-14 rounded-2xl bg-[#F59E0B] text-white flex items-center justify-center shadow-sm -rotate-3">
                      <Video className="w-6 h-6 rotate-3" />
                    </div>
                    <span
                      className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#FEF7E6] ${
                        isInterviewCompleted ? 'bg-emerald-500' : 'bg-[#F95B2B]'
                      }`}
                    />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Wawancara</h2>
                  <p className="text-xs text-slate-500 mt-1 mb-5">
                    {isInterviewCompleted
                      ? interview.score != null
                        ? `Skor: ${interview.score}/100 • Selesai`
                        : 'Selesai Dinilai Asesor'
                      : interview.scheduledAt
                        ? `Jadwal: ${formatShortDate(interview.scheduledAt)}`
                        : 'Menunggu Jadwal Asesor'}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/peserta/asesmen')}
                    className="w-full max-w-[150px] py-2 px-4 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 shadow-xs border border-slate-200/60 transition-colors cursor-pointer"
                  >
                    Lihat Tahapan
                  </button>
                </div>

                {/* Card 3: Soft Lavender — Hasil & LHA */}
                <div className="rounded-3xl bg-[#F2F0FE] p-5 flex flex-col items-center text-center transition-transform hover:-translate-y-0.5">
                  <div className="relative mb-4 mt-1">
                    <div className="w-14 h-14 rounded-2xl bg-[#5B4CE4] text-white flex items-center justify-center shadow-sm rotate-3">
                      <Award className="w-6 h-6 -rotate-3" />
                    </div>
                    <span
                      className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#F2F0FE] ${
                        lha?.signed ? 'bg-emerald-500' : 'bg-indigo-400'
                      }`}
                    />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Hasil &amp; LHA</h2>
                  <p className="text-xs text-slate-500 mt-1 mb-5">
                    {lha?.signed
                      ? `LHA Resmi • Skor ${lha.compositeScore ?? '-'}`
                      : `${completedCount}/${tasks.length} Tahap Selesai`}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(lha?.signed || profileComplete ? '/peserta/hasil' : '/peserta/profile')}
                    className="w-full max-w-[150px] py-2 px-4 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 shadow-xs border border-slate-200/60 transition-colors cursor-pointer"
                  >
                    {lha?.signed || profileComplete ? 'Lihat Hasil' : 'Cek Profil'}
                  </button>
                </div>
              </div>
            </section>

            {/* Section 2: Tahapan Asesmen */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-slate-900 tracking-tight">
                  Tahapan Asesmen<span className="text-[#F95B2B]">.</span>
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  {remainingCatAndInterview === 0
                    ? 'Seluruh sesi utama selesai'
                    : `${remainingCatAndInterview} sesi utama tersisa`}
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-6 border-b border-slate-200/80">
                {[
                  { key: 'all', label: 'Semua Tahap' },
                  { key: 'pending', label: 'Perlu Tindakan' },
                  { key: 'completed', label: 'Selesai' }
                ].map((tab) => {
                  const isActive = taskTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setTaskTab(tab.key as TaskFilterTab)}
                      className={`pb-2.5 text-sm font-semibold transition-colors relative cursor-pointer ${
                        isActive ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {tab.label}
                      {isActive && (
                        <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-slate-900" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Task Rows */}
              <div className="space-y-3">
                {filteredTasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600">
                      Tidak ada tahapan yang sesuai filter
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Coba ubah tab atau kata kunci pencarian Anda.
                    </p>
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    const Icon = task.icon;
                    const isCompleted = task.status === 'completed';
                    const isPending = task.status === 'pending';

                    return (
                      <div
                        key={task.id}
                        className="rounded-2xl bg-white border border-slate-100 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              toneBadgeClasses[task.tone]
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {task.title}
                              </p>
                              <span className="text-[11px] font-medium text-slate-400">
                                • {task.category}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{task.subtitle}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 shrink-0">
                          <MoreHorizontal className="w-4 h-4 text-slate-300 hidden sm:block" />
                          <button
                            type="button"
                            onClick={task.onAction}
                            className={`min-w-[122px] px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                              isPending
                                ? 'bg-[#F95B2B] hover:bg-[#e34d20] text-white shadow-xs'
                                : isCompleted
                                  ? 'bg-[#FDECE6] hover:bg-[#fbdcd1] text-[#F95B2B]'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            }`}
                          >
                            {task.actionLabel}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* ─── Panel Kanan (4/12): Search + Kalender + Jadwal Mendatang ─── */}
          <aside className="xl:col-span-4 bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-7">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari tahap atau jadwal asesmen..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F95B2B]/20 focus:border-[#F95B2B]"
              />
            </div>

            {/* Interactive Monthly Calendar */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#F95B2B]" />
                  {MONTHS_ID[calendarCursor.getMonth()]} {calendarCursor.getFullYear()}
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Bulan sebelumnya"
                    onClick={() =>
                      setCalendarCursor(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                      )
                    }
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Bulan berikutnya"
                    onClick={() =>
                      setCalendarCursor(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                      )
                    }
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-y-1.5 text-center">
                {WEEKDAYS_ID.map((day) => (
                  <div key={day} className="text-[11px] font-semibold text-slate-400 pb-1">
                    {day}
                  </div>
                ))}
                {calendarDays.map(({ date, inMonth }, idx) => {
                  const isToday = isSameDay(date, today);
                  const isInterviewDay = interviewDate ? isSameDay(date, interviewDate) : false;
                  const isExamDay = examSubmittedDate ? isSameDay(date, examSubmittedDate) : false;

                  return (
                    <div key={idx} className="flex items-center justify-center py-0.5">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                          isToday
                            ? 'bg-[#F95B2B] text-white font-bold shadow-xs'
                            : isInterviewDay || isExamDay
                              ? 'bg-[#FDECE6] text-[#F95B2B] font-bold'
                              : inMonth
                                ? 'text-slate-700 hover:bg-slate-100'
                                : 'text-slate-300'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Jadwal Mendatang (Real Pending Schedule Only) */}
            <div className="space-y-4">
              <h2 className="text-lg font-extrabold font-heading text-slate-900">
                Jadwal Mendatang<span className="text-[#F95B2B]">.</span>
              </h2>

              {upcomingEvents.length === 0 ? (
                <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/70 p-4 text-center space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-emerald-900">
                    Semua tahapan asesmen telah selesai
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Hasil &amp; LHA resmi Anda sudah tersedia.
                  </p>
                </div>
              ) : (
                <div className="relative pl-4 space-y-5 before:content-[''] before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                  {upcomingEvents.map((ev) => {
                    const EvIcon = ev.icon;
                    return (
                      <div key={ev.id} className="relative flex items-start justify-between gap-3">
                        <span
                          className={`absolute -left-4 top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${ev.dotColor}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 leading-snug">{ev.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{ev.desc}</p>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${ev.iconBg}`}>
                            <EvIcon className="w-4 h-4" />
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-[#F95B2B]">{ev.dateLabel}</p>
                            <p className="text-[11px] font-medium text-slate-500 flex items-center justify-end gap-1">
                              <Clock className="w-3 h-3" />
                              {ev.durationLabel}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate(upcomingEvents.length === 0 ? '/peserta/hasil' : '/peserta/asesmen')}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#F95B2B] hover:text-[#e34d20] pt-1 cursor-pointer"
              >
                {upcomingEvents.length === 0 ? 'Lihat Hasil & LHA' : 'Lihat semua jadwal Asesmen'}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </PesertaLayout>
  );
}
