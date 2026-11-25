import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Calendar,
  FileAudio,
  FileText,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Scale
} from 'lucide-react';
import { AsesorLayout } from './AsesorLayout';
import { Button, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui';
import {
  fetchAssessorCandidates,
  submitAssessorSessionAction,
  type AssessorCandidate
} from '../../services/assessorService';
import {
  resolveCandidateReviewStage,
  type UnifiedReviewStage
} from '../../services/asesorReviewState';

type StageFilter = 'ALL' | 'QUEUE' | UnifiedReviewStage;

export default function AsesorQueueTable() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState<'all' | 'real' | 'test'>('all');
  const [programFilter, setProgramFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL');
  const [candidates, setCandidates] = useState<AssessorCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusyCode, setActionBusyCode] = useState<string | null>(null);

  const loadCandidates = useCallback(() => {
    setLoading(true);
    fetchAssessorCandidates()
      .then((data) => {
        setCandidates(data);
        const queryStatus = new URLSearchParams(location.search).get('status')?.toUpperCase();
        if (
          queryStatus &&
          ['ALL', 'QUEUE', 'MENUNGGU_REVIEW', 'PERLU_TINDAKAN', 'DIREVIEW', 'FINALISASI', 'TERBIT', 'BELUM_INTERVIEW'].includes(queryStatus)
        ) {
          setStageFilter(queryStatus as StageFilter);
        } else {
          const hasQueue = data.some((c) => {
            const st = resolveCandidateReviewStage(c).stage;
            return st === 'MENUNGGU_REVIEW' || st === 'PERLU_TINDAKAN';
          });
          setStageFilter(hasQueue ? 'QUEUE' : 'ALL');
        }
      })
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false));
  }, [location.search]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  useEffect(() => {
    const queryStatus = new URLSearchParams(location.search).get('status')?.toUpperCase();
    if (
      queryStatus &&
      ['ALL', 'QUEUE', 'MENUNGGU_REVIEW', 'PERLU_TINDAKAN', 'DIREVIEW', 'FINALISASI', 'TERBIT', 'BELUM_INTERVIEW'].includes(queryStatus)
    ) {
      setStageFilter(queryStatus as StageFilter);
    }
  }, [location.search]);

  const programOptions = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => {
      if (c.program && c.program !== '-') set.add(c.program);
    });
    return Array.from(set);
  }, [candidates]);

  const stageCounts = useMemo(() => {
    const counts: Record<UnifiedReviewStage, number> = {
      BELUM_INTERVIEW: 0,
      PERLU_TINDAKAN: 0,
      MENUNGGU_REVIEW: 0,
      DIREVIEW: 0,
      FINALISASI: 0,
      TERBIT: 0
    };
    candidates.forEach((c) => {
      counts[resolveCandidateReviewStage(c).stage] += 1;
    });
    return {
      ...counts,
      ALL: candidates.length,
      QUEUE: counts.MENUNGGU_REVIEW + counts.PERLU_TINDAKAN
    };
  }, [candidates]);

  const enriched = useMemo(() => {
    return candidates
      .map((candidate) => {
        const meta = resolveCandidateReviewStage(candidate);
        const sessionDateRaw = candidate.completedAt || candidate.submittedAt || candidate.scheduledAt;
        const sessionDateIso = sessionDateRaw ? new Date(sessionDateRaw).toISOString().slice(0, 10) : '';
        return {
          candidate,
          meta,
          sessionDateRaw,
          sessionDateIso
        };
      })
      .sort((a, b) => a.meta.sortOrder - b.meta.sortOrder);
  }, [candidates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter(({ candidate, meta, sessionDateIso }) => {
      if (stageFilter === 'QUEUE') {
        if (meta.stage !== 'MENUNGGU_REVIEW' && meta.stage !== 'PERLU_TINDAKAN') return false;
      } else if (stageFilter !== 'ALL' && meta.stage !== stageFilter) {
        return false;
      }
      if (programFilter !== 'ALL' && candidate.program !== programFilter) return false;
      if (dateFilter && sessionDateIso !== dateFilter) return false;
      if (accountFilter === 'real' && candidate.isTestAccount) return false;
      if (accountFilter === 'test' && !candidate.isTestAccount) return false;
      if (!q) return true;
      return (
        candidate.name.toLowerCase().includes(q) ||
        candidate.code.toLowerCase().includes(q) ||
        candidate.program.toLowerCase().includes(q) ||
        (candidate.programCode || '').toLowerCase().includes(q)
      );
    });
  }, [enriched, stageFilter, programFilter, dateFilter, accountFilter, search]);

  const handleQuickSessionAction = async (
    code: string,
    action: 'reschedule' | 'resolve_manual'
  ) => {
    const promptMsg =
      action === 'reschedule'
        ? 'Masukkan alasan penjadwalan ulang wawancara AI (misal: mikrofon tidak terdeteksi):'
        : 'Masukkan catatan keputusan manual untuk melanjutkan review kandidat:';
    const reason = window.prompt(promptMsg);
    if (!reason || reason.trim().length < 5) {
      if (reason !== null) window.alert('Catatan/alasan minimal 5 karakter.');
      return;
    }
    setActionBusyCode(code);
    try {
      await submitAssessorSessionAction(code, { action, reason: reason.trim() });
      loadCandidates();
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal memproses tindakan sesi.');
    } finally {
      setActionBusyCode(null);
    }
  };

  const stageTabs: Array<{ key: StageFilter; label: string; count: number }> = [
    { key: 'QUEUE', label: 'Perlu Review', count: stageCounts.QUEUE },
    { key: 'MENUNGGU_REVIEW', label: 'Menunggu Review', count: stageCounts.MENUNGGU_REVIEW },
    { key: 'PERLU_TINDAKAN', label: 'Perlu Tindakan', count: stageCounts.PERLU_TINDAKAN },
    { key: 'DIREVIEW', label: 'Direview', count: stageCounts.DIREVIEW },
    { key: 'FINALISASI', label: 'Finalisasi', count: stageCounts.FINALISASI },
    { key: 'TERBIT', label: 'Terbit (E-Sign)', count: stageCounts.TERBIT },
    { key: 'ALL', label: 'Semua', count: stageCounts.ALL }
  ];

  return (
    <AsesorLayout activeTab="queue">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="navy" format="soft" className="text-[11px] font-bold">
                AVA AI-FIRST WORKFLOW
              </Badge>
              <span className="text-[11px] text-slate-500 font-mono">
                Selesai Interview AI &rarr; Menunggu Review &rarr; Direview &rarr; Finalisasi &rarr; E-Sign &rarr; Terbit
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-ink tracking-tight">
              Antrean Review Sesi Wawancara AI
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Daftar sesi wawancara yang dijalankan Ava AI beserta sesi bermasalah yang memerlukan tindak lanjut asesor.
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs font-semibold shadow-2xs self-start">
            {(['all', 'real', 'test'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setAccountFilter(key)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  accountFilter === key
                    ? 'bg-primary-navy text-white shadow-2xs'
                    : 'text-slate-500 hover:text-ink'
                }`}
              >
                {key === 'all' ? 'Semua' : key === 'real' ? 'Peserta Asli' : 'Akun Uji'}
              </button>
            ))}
          </div>
        </div>

        {/* Status Tabs + Program/Date Filters */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {stageTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStageFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  stageFilter === tab.key
                    ? tab.key === 'PERLU_TINDAKAN'
                      ? 'bg-rose-600 text-white'
                      : 'bg-primary-navy text-white'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    stageFilter === tab.key ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, kode kandidat, atau program..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-primary-navy outline-none"
              />
            </div>

            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-ink focus:outline-none focus:border-primary-navy"
            >
              <option value="ALL">Semua Program Asesmen</option>
              {programOptions.map((prog) => (
                <option key={prog} value={prog}>
                  {prog}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-primary-navy outline-none"
                />
              </div>
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="text-xs text-slate-500 hover:text-ink px-2 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KANDIDAT</TableHead>
                <TableHead>PROGRAM ASESMEN</TableHead>
                <TableHead>WAKTU SELESAI AI</TableHead>
                <TableHead>DATA SESI AI</TableHead>
                <TableHead>CAT / SKOR AI</TableHead>
                <TableHead>STATUS REVIEW</TableHead>
                <TableHead className="text-right">AKSI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-xs text-slate-500">
                    Memuat antrean review...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-xs text-slate-500">
                    Tidak ada sesi kandidat pada filter ini.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(({ candidate, meta, sessionDateRaw }) => (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-bold text-ink text-xs sm:text-sm">{candidate.name}</p>
                          {candidate.isCalibrationSample && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                              <Scale className="w-2.5 h-2.5" />
                              Sampel Kalibrasi
                            </span>
                          )}
                          {candidate.isTestAccount && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                              Akun Uji
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-slate font-mono">
                          {candidate.code} • {candidate.email}
                        </p>
                        {meta.stage === 'PERLU_TINDAKAN' && candidate.actionReason && (
                          <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-1 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{candidate.actionReason}</span>
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 max-w-[210px]">
                      <span className="line-clamp-2">{candidate.program}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600 whitespace-nowrap">
                      {sessionDateRaw
                        ? new Date(sessionDateRaw).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                            candidate.hasAudioRecording
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-400 border-slate-200'
                          }`}
                        >
                          <FileAudio className="w-3 h-3" />
                          Audio
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                            candidate.hasTranscript
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-50 text-slate-400 border-slate-200'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          Transkrip
                        </span>
                        {(candidate.aiCompetencies?.length || 0) > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200">
                            <Sparkles className="w-3 h-3" />
                            Skor AI
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      <span className="font-bold text-emerald-700">
                        CAT {candidate.catScore != null ? `${candidate.catScore}` : '-'}
                      </span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="font-bold text-primary-navy">
                        AI {candidate.interviewScore != null ? `${candidate.interviewScore}` : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={meta.badgeVariant} format="soft">
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        {meta.stage === 'PERLU_TINDAKAN' && (
                          <>
                            <Button
                              variant="outline"
                              size="xs"
                              disabled={actionBusyCode === candidate.code}
                              onClick={() => handleQuickSessionAction(candidate.code, 'reschedule')}
                              leftIcon={<RefreshCw className="w-3 h-3" />}
                              title="Jadwalkan ulang sesi AI"
                            >
                              Jadwal Ulang
                            </Button>
                            <Button
                              variant="outline"
                              size="xs"
                              disabled={actionBusyCode === candidate.code}
                              onClick={() => handleQuickSessionAction(candidate.code, 'resolve_manual')}
                              leftIcon={<CheckCircle2 className="w-3 h-3" />}
                              title="Putuskan lanjut manual ke review"
                            >
                              Putuskan Manual
                            </Button>
                          </>
                        )}
                        {meta.stage === 'FINALISASI' || meta.stage === 'TERBIT' ? (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => navigate(`/asesor/scoring/${candidate.code}`)}
                            rightIcon={<ArrowRight className="w-3 h-3" />}
                          >
                            {meta.stage === 'TERBIT' ? 'Lihat LHA' : 'E-Sign LHA'}
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => navigate(`/asesor/review-console/${candidate.code}`)}
                            rightIcon={<ArrowRight className="w-3 h-3" />}
                          >
                            Buka Review
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AsesorLayout>
  );
}
