import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileCheck2,
  GraduationCap,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  Users
} from 'lucide-react';
import { AsesorLayout, resolveAsesorSessionUser } from './AsesorLayout';
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui';
import { fetchAssessorCandidates, type AssessorCandidate } from '../../services/assessorService';

type StageFilter = 'all' | 'complete' | 'in_progress' | 'needs_bars' | 'ready_lha';
type AudienceFilter = 'all' | 'real' | 'test';

const stageCount = (c: AssessorCandidate) =>
  (c.catStatus === 'selesai' ? 1 : 0) +
  (c.liveCodingStatus === 'selesai' ? 1 : 0) +
  (c.interviewDone ? 1 : 0);

const getInitials = (name: string) =>
  (name || 'P')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const StageCell = ({
  status,
  sublabel
}: {
  status: 'selesai' | 'sedang' | 'belum';
  sublabel?: string | null;
}) => {
  if (status === 'selesai') {
    return (
      <div className="space-y-1">
        <Badge variant="success" format="soft" hasDot>
          Selesai
        </Badge>
        {sublabel && <p className="text-[11px] font-medium text-slate-500 tabular-nums">{sublabel}</p>}
      </div>
    );
  }
  if (status === 'sedang') {
    return (
      <div className="space-y-1">
        <Badge variant="warning" format="soft" hasDot>
          Sedang
        </Badge>
        {sublabel && <p className="text-[11px] text-slate-500 tabular-nums">{sublabel}</p>}
      </div>
    );
  }
  return (
    <Badge variant="neutral" format="outline">
      Belum
    </Badge>
  );
};

export default function AsesorDashboard() {
  const navigate = useNavigate();
  const activeUser = useMemo(() => resolveAsesorSessionUser(), []);
  const [candidates, setCandidates] = useState<AssessorCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('all');

  const loadCandidates = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const list = await fetchAssessorCandidates();
      setCandidates(list);
    } catch {
      setCandidates([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadCandidates();
  }, []);

  const audienceCandidates = useMemo(() => {
    if (audienceFilter === 'real') return candidates.filter((c) => !c.isTestAccount);
    if (audienceFilter === 'test') return candidates.filter((c) => Boolean(c.isTestAccount));
    return candidates;
  }, [candidates, audienceFilter]);

  const stats = useMemo(() => {
    const total = audienceCandidates.length;
    const catDone = audienceCandidates.filter((c) => c.catStatus === 'selesai').length;
    const codingDone = audienceCandidates.filter((c) => c.liveCodingStatus === 'selesai').length;
    const interviewDone = audienceCandidates.filter((c) => Boolean(c.interviewDone)).length;
    const fullComplete = audienceCandidates.filter((c) => stageCount(c) === 3).length;
    const gradedList = audienceCandidates.filter(
      (c) => c.gpaScore != null && c.barsAverage != null
    );
    const pendingBarsList = audienceCandidates.filter(
      (c) => Boolean(c.interviewDone) && (c.gpaScore == null || c.barsAverage == null)
    );
    const readyLhaList = gradedList.filter((c) => c.lhaStatus !== 'signed');
    const signedLhaCount = audienceCandidates.filter((c) => c.lhaStatus === 'signed').length;
    const avgGpa =
      gradedList.length > 0
        ? gradedList.reduce((acc, item) => acc + (item.gpaScore || 0), 0) / gradedList.length
        : null;

    return {
      total,
      catDone,
      codingDone,
      interviewDone,
      fullComplete,
      barsGraded: gradedList.length,
      pendingBarsList,
      readyLhaList,
      signedLhaCount,
      avgGpa
    };
  }, [audienceCandidates]);

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return audienceCandidates.filter((c) => {
      if (stageFilter === 'complete' && stageCount(c) !== 3) return false;
      if (stageFilter === 'in_progress' && stageCount(c) === 3) return false;
      if (stageFilter === 'needs_bars' && (!c.interviewDone || c.gpaScore != null)) return false;
      if (stageFilter === 'ready_lha' && (c.gpaScore == null || c.lhaStatus === 'signed')) return false;

      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.program || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q)
      );
    });
  }, [audienceCandidates, search, stageFilter]);

  const pct = (part: number, total: number) =>
    total > 0 ? Math.round((part / total) * 100) : 0;

  return (
    <AsesorLayout activeTab="dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-7 sm:py-8 space-y-6 antialiased">
        {/* Executive Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E3A8A] to-[#172554] text-white p-6 sm:p-7 shadow-sm">
          <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-blue-400/15 blur-2xl pointer-events-none" />
          <div className="absolute right-28 -bottom-16 w-48 h-48 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />

          <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-amber-200 text-xs font-semibold backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Konsol Evaluasi Asesor • Rubrik BARS &amp; GPA</span>
              </div>
              <h1 className="font-heading text-2xl sm:text-[28px] font-bold tracking-tight text-white">
                Selamat Datang, {activeUser?.name || 'Asesor'}
              </h1>
              <p className="text-sm text-blue-100/85 leading-relaxed">
                Pantau progres CAT, Live Coding, proctoring, penilaian wawancara Ava AI (BARS → GPA 0.00–4.00), hingga penerbitan LHA resmi dari satu halaman.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <div className="px-4 py-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs flex items-center gap-4">
                <div>
                  <p className="text-[11px] font-medium text-blue-200">Rata-rata GPA</p>
                  <p className="font-heading text-xl font-bold text-white tabular-nums">
                    {stats.avgGpa != null ? stats.avgGpa.toFixed(2) : '—'}
                    <span className="text-xs font-normal text-blue-200/80"> / 4.00</span>
                  </p>
                </div>
                <div className="h-8 w-px bg-white/15" />
                <div>
                  <p className="text-[11px] font-medium text-blue-200">Perlu Nilai BARS</p>
                  <p className="font-heading text-xl font-bold text-amber-300 tabular-nums">
                    {stats.pendingBarsList.length}
                    <span className="text-xs font-normal text-blue-200/80"> sesi</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadCandidates(true)}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      stats.pendingBarsList.length > 0
                        ? `/asesor/hasil-interview/${stats.pendingBarsList[0].code}`
                        : stats.readyLhaList.length > 0
                          ? `/asesor/rekap-lha/${stats.readyLhaList[0].code}`
                          : '/asesor/hasil-interview'
                    )
                  }
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {stats.pendingBarsList.length > 0 ? (
                    <>
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Nilai Interview BARS</span>
                    </>
                  ) : stats.readyLhaList.length > 0 ? (
                    <>
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      <span>Terbitkan LHA ({stats.readyLhaList.length})</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Buka Interview &amp; BARS</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Concise Non-Duplicated KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: Total Peserta */}
          <button
            type="button"
            onClick={() => setStageFilter('all')}
            className={`text-left bg-white rounded-2xl border p-5 shadow-2xs transition-all cursor-pointer flex flex-col justify-between ${
              stageFilter === 'all'
                ? 'border-slate-300 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">Total Peserta</span>
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-3">
                <p className="font-heading text-2xl font-bold text-slate-900 tabular-nums">
                  {stats.total}
                </p>
                <span className="text-xs font-medium text-slate-500">
                  ({stats.fullComplete} lengkap 3/3)
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-700 rounded-full transition-all"
                  style={{ width: `${pct(stats.fullComplete, stats.total)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 tabular-nums">
                {pct(stats.fullComplete, stats.total)}% menyelesaikan seluruh tahap
              </p>
            </div>
          </button>

          {/* Card 2: CAT & Live Coding */}
          <button
            type="button"
            onClick={() => navigate('/asesor/hasil-cat')}
            className="text-left bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">CAT &amp; Live Coding</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-3">
                <p className="font-heading text-2xl font-bold text-slate-900 tabular-nums">
                  {stats.catDone}
                </p>
                <span className="text-xs font-medium text-slate-500 tabular-nums">
                  CAT • {stats.codingDone} Coding
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${pct(stats.catDone, stats.total)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 tabular-nums">
                {pct(stats.catDone, stats.total)}% selesai ujian CAT
              </p>
            </div>
          </button>

          {/* Card 3: Interview AI & BARS */}
          <button
            type="button"
            onClick={() =>
              setStageFilter((prev) => (prev === 'needs_bars' ? 'all' : 'needs_bars'))
            }
            className={`text-left bg-white rounded-2xl border p-5 shadow-2xs transition-all cursor-pointer flex flex-col justify-between ${
              stageFilter === 'needs_bars'
                ? 'border-amber-500 ring-2 ring-amber-500/15 bg-amber-50/20'
                : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">Interview AI &amp; BARS</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-3">
                <p className="font-heading text-2xl font-bold text-slate-900 tabular-nums">
                  {stats.barsGraded}
                </p>
                <span className="text-xs font-medium text-slate-500 tabular-nums">
                  / {stats.interviewDone} selesai interview
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${pct(stats.barsGraded, Math.max(stats.interviewDone, 1))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 tabular-nums">
                {stats.pendingBarsList.length > 0
                  ? `${stats.pendingBarsList.length} interview menunggu nilai BARS`
                  : 'Semua interview telah dinilai BARS'}
              </p>
            </div>
          </button>

          {/* Card 4: LHA E-Sign */}
          <button
            type="button"
            onClick={() =>
              stats.readyLhaList.length > 0
                ? setStageFilter((prev) => (prev === 'ready_lha' ? 'all' : 'ready_lha'))
                : navigate('/asesor/rekap-lha')
            }
            className={`text-left bg-white rounded-2xl border p-5 shadow-2xs transition-all cursor-pointer flex flex-col justify-between ${
              stageFilter === 'ready_lha'
                ? 'border-emerald-500 ring-2 ring-emerald-500/15 bg-emerald-50/20'
                : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">Penerbitan LHA (E-Sign)</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-3">
                <p className="font-heading text-2xl font-bold text-emerald-700 tabular-nums">
                  {stats.signedLhaCount}
                </p>
                <span className="text-xs font-medium text-slate-500 tabular-nums">
                  terbit • {stats.readyLhaList.length} siap E-Sign
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${pct(stats.signedLhaCount, Math.max(stats.total, 1))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 tabular-nums">
                {pct(stats.signedLhaCount, stats.total)}% LHA bertanda tangan digital
              </p>
            </div>
          </button>
        </div>

        {/* Compact Priority Action Strip (only rendered when there are pending BARS or Ready LHA tasks) */}
        {!loading && (stats.pendingBarsList.length > 0 || stats.readyLhaList.length > 0) && (
          <div className="bg-white rounded-2xl border border-amber-200/90 p-4 sm:p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-heading text-sm font-bold text-slate-900">
                  Antrean Prioritas Evaluasi
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {stats.pendingBarsList.length > 0
                    ? `${stats.pendingBarsList.length} peserta selesai interview menunggu penilaian BARS`
                    : ''}
                  {stats.pendingBarsList.length > 0 && stats.readyLhaList.length > 0 ? ' • ' : ''}
                  {stats.readyLhaList.length > 0
                    ? `${stats.readyLhaList.length} peserta siap ditandatangani (E-Sign LHA)`
                    : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {stats.pendingBarsList.slice(0, 2).map((candidate) => (
                <Button
                  key={`bars-${candidate.code}`}
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/asesor/hasil-interview/${candidate.code}`)}
                  className="text-xs"
                >
                  <span>Nilai BARS: {candidate.name}</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              ))}
              {stats.readyLhaList.slice(0, 2).map((candidate) => (
                <Button
                  key={`lha-${candidate.code}`}
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/asesor/rekap-lha/${candidate.code}`)}
                  className="text-xs"
                >
                  <span>E-Sign LHA: {candidate.name}</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Unified Tracking Progres Peserta Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-base font-bold text-slate-900">
                  Tracking Progres Pengerjaan Peserta
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pantau capaian CAT, Live Coding, Interview AI, integritas proctoring, nilai BARS/GPA, dan status LHA per peserta.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama, kode, program..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-[11px] font-semibold">
                  {([
                    ['all', 'Semua'],
                    ['real', 'Peserta Asli'],
                    ['test', 'Akun Uji']
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAudienceFilter(key)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        audienceFilter === key
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
              {([
                ['all', `Semua (${stats.total})`],
                ['complete', `Selesai 3/3 (${stats.fullComplete})`],
                ['in_progress', 'Belum Lengkap'],
                ['needs_bars', `Perlu Nilai BARS (${stats.pendingBarsList.length})`],
                ['ready_lha', `Siap E-Sign (${stats.readyLhaList.length})`]
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStageFilter(key)}
                  className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                    stageFilter === key
                      ? 'bg-[#1E3A8A] text-white shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto [&_th]:px-3.5 [&_td]:px-3.5 [&_th]:whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead>Peserta</TableHead>
                  <TableHead>Progres</TableHead>
                  <TableHead>Soal CAT</TableHead>
                  <TableHead>Live Coding</TableHead>
                  <TableHead>Interview AI</TableHead>
                  <TableHead>Proctoring</TableHead>
                  <TableHead>BARS &amp; GPA</TableHead>
                  <TableHead className="text-right">Aksi Evaluasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-sm text-slate-500">
                      Memuat data progres peserta...
                    </TableCell>
                  </TableRow>
                ) : filteredCandidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-sm text-slate-500">
                      Tidak ada peserta yang cocok dengan filter saat ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCandidates.map((c) => {
                    const doneStages = stageCount(c);
                    const isSigned = c.lhaStatus === 'signed';
                    const hasBars = c.gpaScore != null && c.barsAverage != null;
                    return (
                      <TableRow key={c.code} className="hover:bg-slate-50/70 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2.5 min-w-[185px] max-w-[235px]">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-heading font-bold text-xs flex items-center justify-center shrink-0">
                              {getInitials(c.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                                  {c.name}
                                </span>
                                {c.isTestAccount && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold shrink-0">
                                    Uji
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 min-w-0">
                                <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                                  {c.code}
                                </span>
                                <span className="truncate" title={c.program}>
                                  {c.program}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <div className="w-24 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 tabular-nums">
                              <span>{doneStages}/3 Tahap</span>
                              <span className="text-slate-400">
                                {Math.round((doneStages / 3) * 100)}%
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              {[
                                c.catStatus === 'selesai',
                                c.liveCodingStatus === 'selesai',
                                Boolean(c.interviewDone)
                              ].map((done, idx) => (
                                <span
                                  key={idx}
                                  className={`h-1.5 rounded-full ${
                                    done ? 'bg-emerald-500' : 'bg-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <StageCell
                            status={c.catStatus || 'belum'}
                            sublabel={
                              c.catStatus === 'selesai' && c.catScore != null
                                ? `Skor ${Math.round(c.catScore)}/100`
                                : c.catAnsweredCount != null && c.catTotalQuestions
                                  ? `${c.catAnsweredCount}/${c.catTotalQuestions} soal`
                                  : null
                            }
                          />
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <StageCell
                            status={c.liveCodingStatus || 'belum'}
                            sublabel={
                              c.liveCodingStatus === 'selesai' && c.liveCodingScore != null
                                ? `Skor ${Math.round(c.liveCodingScore)}/100`
                                : null
                            }
                          />
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <StageCell
                            status={c.interviewDone ? 'selesai' : 'belum'}
                            sublabel={c.interviewDone ? 'Transkrip siap' : null}
                          />
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-xs">
                          {(c.proctoringFlagCount ?? 0) > 0 ? (
                            <Badge variant="warning" format="soft" hasDot>
                              {c.proctoringFlagCount} Flag
                            </Badge>
                          ) : c.integrityScore != null ? (
                            <Badge variant="success" format="soft">
                              {Math.round(c.integrityScore)}% Aman
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          {hasBars ? (
                            <div className="tabular-nums whitespace-nowrap space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                                  GPA {c.gpaScore!.toFixed(2)}
                                </span>
                                {isSigned && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                                    LHA
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">
                                BARS {c.barsAverage!.toFixed(2)} / 5
                              </p>
                            </div>
                          ) : c.interviewDone ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/asesor/hasil-interview/${c.code}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>Nilai BARS</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>Belum Dinilai</span>
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => navigate(`/asesor/hasil-cat/${c.code}`)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              CAT
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/asesor/hasil-interview/${c.code}`)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                c.interviewDone && !hasBars
                                  ? 'bg-[#1E3A8A] hover:bg-[#172554] text-white shadow-2xs'
                                  : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span>BARS</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/asesor/rekap-lha/${c.code}`)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                hasBars && !isSigned
                                  ? 'bg-[#1E3A8A] hover:bg-[#172554] text-white shadow-2xs'
                                  : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span>LHA</span>
                              <ArrowRight className="w-3 h-3 shrink-0" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AsesorLayout>
  );
}
