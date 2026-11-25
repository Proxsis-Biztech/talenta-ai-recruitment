import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ClipboardCheck,
  Clock,
  ArrowRight,
  AlertTriangle,
  Scale,
  Building2,
  Sparkles,
  FileAudio
} from 'lucide-react';
import { AsesorLayout } from './AsesorLayout';
import { Button, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui';
import { getActiveSessionUser } from '../../services/userRegistryService';
import { fetchAssessorCandidates, type AssessorCandidate } from '../../services/assessorService';
import { resolveCandidateReviewStage } from '../../services/asesorReviewState';

export default function AsesorDashboard() {
  const navigate = useNavigate();

  const activeAsesor = useMemo(() => getActiveSessionUser(), []);
  const [candidates, setCandidates] = useState<AssessorCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [accountFilter, setAccountFilter] = useState<'all' | 'real' | 'test'>('all');

  useEffect(() => {
    let cancelled = false;
    fetchAssessorCandidates()
      .then((data) => {
        if (!cancelled) setCandidates(data);
      })
      .catch(() => {
        if (!cancelled) setCandidates([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCandidates(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCandidates = useMemo(() => {
    if (accountFilter === 'real') return candidates.filter((c) => !c.isTestAccount);
    if (accountFilter === 'test') return candidates.filter((c) => c.isTestAccount);
    return candidates;
  }, [candidates, accountFilter]);

  const waitingReviewCount = useMemo(
    () =>
      visibleCandidates.filter((c) => resolveCandidateReviewStage(c).stage === 'MENUNGGU_REVIEW').length,
    [visibleCandidates]
  );

  const needsActionCount = useMemo(
    () =>
      visibleCandidates.filter((c) => resolveCandidateReviewStage(c).stage === 'PERLU_TINDAKAN').length,
    [visibleCandidates]
  );

  const readyToSignCount = useMemo(
    () =>
      visibleCandidates.filter((c) => {
        const st = resolveCandidateReviewStage(c).stage;
        return st === 'FINALISASI' || st === 'DIREVIEW';
      }).length,
    [visibleCandidates]
  );

  const calibrationSampleCount = useMemo(
    () => visibleCandidates.filter((c) => c.isCalibrationSample).length,
    [visibleCandidates]
  );

  const prioritizedRows = useMemo(() => {
    return [...visibleCandidates]
      .map((c) => ({ candidate: c, stageMeta: resolveCandidateReviewStage(c) }))
      .sort((a, b) => a.stageMeta.sortOrder - b.stageMeta.sortOrder)
      .slice(0, 6);
  }, [visibleCandidates]);

  const primaryCandidate = useMemo(
    () =>
      prioritizedRows[0]?.candidate || visibleCandidates[0] || null,
    [prioritizedRows, visibleCandidates]
  );
  const primaryCode = primaryCandidate?.code;

  const openReviewConsole = () => {
    if (primaryCode) navigate(`/asesor/review-console/${primaryCode}`);
    else navigate('/asesor/review-console');
  };

  const openScoring = () => {
    if (primaryCode) navigate(`/asesor/scoring/${primaryCode}`);
    else navigate('/asesor/scoring');
  };

  const proctoringCandidateCount = visibleCandidates.filter(
    (candidate) =>
      (candidate.proctoringFlagCount ?? 0) > 0 ||
      (candidate.integrityScore != null && candidate.integrityScore < 100)
  ).length;
  const proctoringFindings = visibleCandidates.reduce(
    (sum, candidate) =>
      sum +
      (candidate.proctoringFlagCount ??
        (candidate.integrityScore != null && candidate.integrityScore < 100 ? 1 : 0)),
    0
  );
  const programCount = new Set(visibleCandidates.map((c) => c.program).filter(Boolean)).size;

  const primaryStageMeta = resolveCandidateReviewStage(primaryCandidate);

  return (
    <AsesorLayout activeTab="dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-7 sm:py-8 space-y-6 antialiased">
        {/* ─── Hero Assessor Header: Asymmetric 8 / 4 Split ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-blue text-primary-navy border border-accent-border text-xs font-semibold">
                  <Scale className="w-3.5 h-3.5 text-blue-accent" />
                  Dewan Asesor &amp; Kalibrasi LHA
                </span>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 tabular-nums">
                  Sampel Kalibrasi: {calibrationSampleCount} Sesi
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-ink">
                Panel Review Asesor: {activeAsesor.name || 'Asesor'}
              </h1>
              <p className="text-xs sm:text-sm text-muted-slate mt-1.5 flex flex-wrap items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>
                  Instansi PT:{' '}
                  <strong className="text-ink font-semibold">
                    {activeAsesor.companyName || 'Tenant Terdaftar'}
                  </strong>
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  Program:{' '}
                  <strong className="text-primary-navy font-semibold">
                    {programCount > 1
                      ? `${programCount} Program Aktif`
                      : visibleCandidates[0]?.program || 'Semua Program Aktif'}
                  </strong>
                </span>
              </p>

              {/* Clickable Priority Review Banner */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/asesor/interview-queue?status=MENUNGGU_REVIEW')}
                  className="text-left p-4 rounded-xl bg-amber-50/80 hover:bg-amber-100/70 border border-amber-200 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                      Siap Direview Asesor
                    </span>
                    <ArrowRight className="w-4 h-4 text-amber-700 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="font-heading text-lg sm:text-xl font-bold tabular-nums text-amber-950 mt-1">
                    {waitingReviewCount} Sesi Menunggu Review
                  </p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Klik untuk membuka antrean hasil wawancara Ava AI
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/asesor/interview-queue?status=PERLU_TINDAKAN')}
                  className="text-left p-4 rounded-xl bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-800">
                      Anomali / Kendala Teknis
                    </span>
                    <ArrowRight className="w-4 h-4 text-rose-700 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="font-heading text-lg sm:text-xl font-bold tabular-nums text-rose-950 mt-1">
                    {needsActionCount} Sesi Perlu Tindakan
                  </p>
                  <p className="text-xs text-rose-800 mt-0.5">
                    Mic gagal, koneksi putus, atau risiko proctoring tinggi
                  </p>
                </button>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs text-muted-slate">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary-navy" />
                  <span>Wawancara AI otomatis dijalankan oleh <strong className="text-ink">Ava</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-accent" />
                  <span>Siap Finalisasi / E-Sign: <strong className="text-primary-navy">{readyToSignCount}</strong></span>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={openReviewConsole}
                disabled={!primaryCode}
                className="py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <FileAudio className="w-4 h-4 text-blue-100" />
                <span>Buka Review Console</span>
              </Button>
            </div>
          </div>

          {/* Sisi Kanan (4 kolom): Sesi Prioritas Berikutnya */}
          <div className="lg:col-span-4 bg-slate-50/90 rounded-2xl border border-slate-200/90 p-6 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-primary-navy bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                  Prioritas Review
                </span>
                <Badge variant={primaryStageMeta.badgeVariant} format="soft">
                  {primaryStageMeta.label}
                </Badge>
              </div>

              <h3 className="font-heading font-bold text-base text-ink">
                {primaryCandidate?.name || (loadingCandidates ? 'Memuat kandidat...' : 'Belum ada kandidat')}
              </h3>
              <p className="font-mono text-xs text-muted-slate mt-0.5">
                {primaryCandidate?.code || '-'}
              </p>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-muted-slate">Skor CAT Teknis</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {primaryCandidate?.catScore != null ? `${primaryCandidate.catScore}/100` : '-'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-muted-slate">Skor Ava AI</span>
                  <span className="font-mono font-bold text-primary-navy">
                    {primaryCandidate?.interviewScore != null ? `${primaryCandidate.interviewScore}/100` : '-'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-slate">Proctoring AI</span>
                  <span
                    className={`font-semibold ${
                      primaryCandidate?.integrityScore == null
                        ? 'text-slate-500'
                        : primaryCandidate.integrityScore >= 90
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                    }`}
                  >
                    {primaryCandidate?.integrityScore == null
                      ? 'Belum Ada Data'
                      : primaryCandidate.integrityScore >= 90
                        ? `${primaryCandidate.integrityScore}% (Aman)`
                        : `${primaryCandidate.integrityScore}% (Perlu Review)`}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 space-y-2">
              <Button
                variant="primary"
                size="xs"
                onClick={openReviewConsole}
                disabled={!primaryCode}
                className="w-full py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Putar Rekaman &amp; Review</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={openScoring}
                className="w-full py-2 rounded-xl text-primary-navy font-bold flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border-slate-200 cursor-pointer"
              >
                <span>Buka Penilaian &amp; LHA</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Asymmetric 8 / 4 Split: Review Queue & Audit Action Center ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-heading font-bold text-base sm:text-lg text-ink">
                  Daftar Sesi Review Prioritas
                </h2>
                <p className="text-xs text-muted-slate mt-0.5">
                  Urutan prioritas: Perlu Tindakan → Menunggu Review → Direview → Finalisasi → Terbit
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold">
                  {(['all', 'real', 'test'] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAccountFilter(key)}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        accountFilter === key
                          ? 'bg-white text-primary-navy shadow-2xs'
                          : 'text-slate-500 hover:text-ink'
                      }`}
                    >
                      {key === 'all' ? 'Semua' : key === 'real' ? 'Peserta Asli' : 'Akun Uji'}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => navigate('/asesor/interview-queue')}
                  className="text-xs py-1.5 px-3 rounded-lg font-semibold cursor-pointer"
                >
                  Lihat Antrean Review ({visibleCandidates.length})
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KANDIDAT</TableHead>
                  <TableHead>CAT / AVA AI</TableHead>
                  <TableHead>STATUS REVIEW</TableHead>
                  <TableHead className="text-right">AKSI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prioritizedRows.map(({ candidate, stageMeta }) => (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-bold text-xs sm:text-sm text-ink">{candidate.name}</p>
                          {candidate.isCalibrationSample && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                              Sampel Kalibrasi
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-muted-slate">
                          {candidate.code} • {candidate.program}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      <span className="font-bold text-emerald-700">
                        {candidate.catScore != null ? `${candidate.catScore}` : '-'}
                      </span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="font-bold text-primary-navy">
                        {candidate.interviewScore != null ? `${candidate.interviewScore}` : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={stageMeta.badgeVariant} format="soft">
                        {stageMeta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={stageMeta.stage === 'TERBIT' ? 'outline' : 'primary'}
                        size="xs"
                        onClick={() =>
                          navigate(
                            stageMeta.stage === 'FINALISASI' || stageMeta.stage === 'TERBIT'
                              ? `/asesor/scoring/${candidate.code}`
                              : `/asesor/review-console/${candidate.code}`
                          )
                        }
                        className="text-xs py-1 px-3"
                      >
                        {stageMeta.stage === 'TERBIT'
                          ? 'Lihat LHA'
                          : stageMeta.stage === 'FINALISASI'
                            ? 'E-Sign LHA'
                            : 'Buka Review'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            {/* Card 1: Penilaian & Kalibrasi */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-slate uppercase tracking-wider">
                  Finalisasi &amp; E-Sign LHA
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="font-heading text-2xl font-bold tabular-nums text-ink">{readyToSignCount} Berkas Review</p>
                <p className="text-xs text-muted-slate mt-0.5">
                  Direview / siap difinalisasi &amp; tanda tangan elektronik LHA
                </p>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={openScoring}
                className="w-full text-xs py-2 rounded-lg font-semibold text-amber-800 bg-amber-50/60 hover:bg-amber-100/70 border-amber-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Buka Penilaian &amp; LHA</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Card 2: AI Proctoring Review */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-slate uppercase tracking-wider">
                  Inbox Flag Proctoring
                </span>
                <div className="w-8 h-8 rounded-lg bg-red-50 text-error-red flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="font-heading text-2xl font-bold tabular-nums text-ink">{proctoringFindings} Event AI</p>
                <p className="text-xs text-muted-slate mt-0.5">
                  {proctoringCandidateCount} kandidat perlu verifikasi snapshot bukti
                </p>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => navigate('/asesor/proctoring')}
                className="w-full text-xs py-2 rounded-lg font-semibold text-red-800 bg-red-50/60 hover:bg-red-100/70 border-red-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Tinjau Inbox Proctoring</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Card 3: Kalibrasi Sampel Acak */}
            <div className="bg-exam-bg rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-primary-navy">
                <AlertTriangle className="w-4 h-4 text-purple-600" />
                <span>Sampel Kalibrasi &amp; Kontrol Kualitas</span>
              </div>
              <p className="text-xs text-muted-slate leading-relaxed">
                Terdapat <strong>{calibrationSampleCount} sesi sampel acak</strong> untuk kalibrasi konsistensi penilai antar-asesor. Setiap perubahan skor AI wajib disertai alasan untuk Log Audit.
              </p>
              <div className="pt-1">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => navigate('/asesor/rekap')}
                  className="w-full text-xs py-1.5 rounded-lg bg-white border-slate-200 text-slate-700"
                >
                  Buka Rekap Program
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AsesorLayout>
  );
}
