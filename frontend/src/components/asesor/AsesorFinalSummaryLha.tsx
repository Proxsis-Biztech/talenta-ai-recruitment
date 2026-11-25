import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowRight,
  Award,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileSpreadsheet,
  GraduationCap,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X
} from 'lucide-react';
import { AsesorLayout, resolveAsesorSessionUser } from './AsesorLayout';
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui';
import {
  fetchAssessorCandidate,
  fetchAssessorCandidates,
  fetchAssessorScoreByCode,
  type AssessorCandidate
} from '../../services/assessorService';
import { getPortalToken } from '../../services/portalAuthService';

type LhaFilter = 'all' | 'signed' | 'ready' | 'ungraded';
type AudienceFilter = 'all' | 'real' | 'test';

const formatWib = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return (
    d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }) + ' WIB'
  );
};

const RECOMMENDATION_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  LANJUT: { label: 'Direkomendasikan', variant: 'success' },
  DIPERTIMBANGKAN: { label: 'Dipertimbangkan', variant: 'warning' },
  TIDAK: { label: 'Belum Memenuhi', variant: 'danger' }
};

export default function AsesorFinalSummaryLha() {
  const navigate = useNavigate();
  const { id } = useParams();
  const activeAsesor = useMemo(() => resolveAsesorSessionUser(), []);

  const [candidates, setCandidates] = useState<AssessorCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [lhaFilter, setLhaFilter] = useState<LhaFilter>('all');
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('all');

  const [selected, setSelected] = useState<AssessorCandidate | null>(null);
  const [selectedScore, setSelectedScore] = useState<any | null>(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const [signing, setSigning] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [finalRec, setFinalRec] = useState<'LANJUT' | 'DIPERTIMBANGKAN' | 'TIDAK'>('LANJUT');
  const [finalNotes, setFinalNotes] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const openLhaDetail = async (code: string) => {
    setLoadingModal(true);
    setNotice(null);
    try {
      const cand = await fetchAssessorCandidate(code);
      setSelected(cand);
      if (cand) {
        const saved = await fetchAssessorScoreByCode(cand.code, cand.program).catch(() => null);
        setSelectedScore(saved);
        const rec = saved?.recommendation || cand.recommendation;
        setFinalRec(
          rec === 'LANJUT' || rec === 'DIPERTIMBANGKAN' || rec === 'TIDAK' ? rec : 'LANJUT'
        );
        setFinalNotes(saved?.notes || cand.assessorNotes || '');
      }
    } finally {
      setLoadingModal(false);
    }
  };

  useEffect(() => {
    if (id) {
      void openLhaDetail(id);
    }
  }, [id]);

  const audienceCandidates = useMemo(() => {
    if (audienceFilter === 'real') return candidates.filter((c) => !c.isTestAccount);
    if (audienceFilter === 'test') return candidates.filter((c) => Boolean(c.isTestAccount));
    return candidates;
  }, [candidates, audienceFilter]);

  const stats = useMemo(() => {
    const total = audienceCandidates.length;
    const graded = audienceCandidates.filter((c) => c.gpaScore != null && c.barsAverage != null);
    const signed = audienceCandidates.filter((c) => c.lhaStatus === 'signed');
    const readyToSign = graded.filter((c) => c.lhaStatus !== 'signed');
    const avgGpa =
      graded.length > 0
        ? graded.reduce((acc, c) => acc + (c.gpaScore || 0), 0) / graded.length
        : null;
    return {
      total,
      gradedCount: graded.length,
      signedCount: signed.length,
      readyCount: readyToSign.length,
      avgGpa
    };
  }, [audienceCandidates]);

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return audienceCandidates.filter((c) => {
      const isSigned = c.lhaStatus === 'signed';
      const hasBars = c.gpaScore != null && c.barsAverage != null;
      if (lhaFilter === 'signed' && !isSigned) return false;
      if (lhaFilter === 'ready' && (!hasBars || isSigned)) return false;
      if (lhaFilter === 'ungraded' && hasBars) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.program.toLowerCase().includes(q) ||
        (c.lhaNumber || '').toLowerCase().includes(q)
      );
    });
  }, [audienceCandidates, search, lhaFilter]);

  const handleSignLha = async () => {
    if (!selected) return;
    const competencies = Array.isArray(selectedScore?.competencies)
      ? selectedScore.competencies
      : [];
    if (competencies.length === 0) {
      setNotice({
        type: 'error',
        message: 'Isi nilai rubrik BARS pada menu Hasil Interview & BARS terlebih dahulu sebelum menerbitkan LHA.'
      });
      return;
    }

    setSigning(true);
    setNotice(null);
    try {
      const scoredComps = competencies.filter((c: any) => Number(c?.score) > 0);
      const totalWeight = competencies.reduce((sum: number, c: any) => sum + (Number(c?.weight) || 0), 0);
      const barsAvg =
        totalWeight > 0
          ? competencies.reduce(
              (sum: number, c: any) => sum + ((Number(c?.score) || 0) * (Number(c?.weight) || 0)) / totalWeight,
              0
            )
          : scoredComps.length > 0
            ? scoredComps.reduce((sum: number, c: any) => sum + (Number(c?.score) || 0), 0) / scoredComps.length
            : 0;
      const derivedInterviewScore = Math.round((barsAvg / 5) * 100);
      const token = getPortalToken();
      await axios.post(
        '/api/asesor/scores',
        {
          candidateCode: selected.code,
          candidateName: selected.name,
          candidateEmail: selected.email,
          programCode: selected.programCode,
          programTitle: selectedScore?.programTitle || selected.program,
          evaluationMode: 'bars_gpa',
          competencies,
          interviewScore: derivedInterviewScore,
          compositeScore: derivedInterviewScore,
          recommendation: finalRec,
          notes: finalNotes,
          status: 'signed',
          finalized: true
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setNotice({
        type: 'success',
        message: `LHA resmi untuk ${selected.name} (${selected.code}) berhasil ditandatangani (E-Sign) dan diterbitkan.`
      });
      await Promise.all([loadCandidates(true), openLhaDetail(selected.code)]);
    } catch (error: any) {
      setNotice({
        type: 'error',
        message: error?.response?.data?.error || 'Gagal menerbitkan & menandatangani LHA.'
      });
    } finally {
      setSigning(false);
    }
  };

  const handleDownloadPdf = async (candidate: AssessorCandidate) => {
    setDownloadingPdf(true);
    try {
      const token = getPortalToken();
      const response = await axios.get(
        `/api/asesor/lha/${encodeURIComponent(candidate.code)}/pdf`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          responseType: 'blob'
        }
      );
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LHA-${candidate.code}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (error: any) {
      setNotice({
        type: 'error',
        message: error?.response?.data?.error || 'LHA PDF belum tersedia atau gagal diunduh.'
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Kode Kandidat',
      'Nama',
      'Email',
      'Perusahaan',
      'Program',
      'Skor CAT',
      'Skor Live Coding',
      'Rata-rata BARS (1-5)',
      'GPA (0-4.00)',
      'Integritas Proctoring (%)',
      'Flag Proctoring',
      'Rekomendasi',
      'Status LHA',
      'Nomor LHA'
    ];
    const rows = filteredCandidates.map((c) => [
      c.code,
      c.name,
      c.email || '',
      c.company || '',
      c.program || '',
      c.catScore != null ? Math.round(c.catScore) : '',
      c.liveCodingScore != null ? Math.round(c.liveCodingScore) : '',
      c.barsAverage != null ? c.barsAverage.toFixed(2) : '',
      c.gpaScore != null ? c.gpaScore.toFixed(2) : '',
      c.integrityScore != null ? Math.round(c.integrityScore) : '',
      c.proctoringFlagCount ?? 0,
      c.recommendation || '',
      c.lhaStatus === 'signed' ? 'Terbit (Signed)' : c.gpaScore != null ? 'Siap E-Sign' : 'Belum Dinilai',
      c.lhaNumber || ''
    ]);
    const csv =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) =>
          row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-penilaian-lha-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <AsesorLayout activeTab="rekap-lha">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-7 sm:py-8 space-y-6 antialiased">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-ink tracking-tight">
              Rekap Penilaian Akhir &amp; LHA
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Rekapitulasi hasil Soal CAT, Live Coding, BARS (GPA 0.00–4.00), proctoring, serta penerbitan LHA (E-Sign).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadCandidates(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={filteredCandidates.length === 0}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
              Ekspor CSV Rekap
            </Button>
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Peserta</span>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="font-heading text-2xl font-bold text-ink mt-3 tabular-nums">
              {stats.total}
            </p>
            <p className="text-xs text-slate-500 mt-1">Kandidat pada cakupan aktif</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Sudah Dinilai BARS &amp; GPA</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <p className="font-heading text-2xl font-bold text-ink tabular-nums">
                {stats.gradedCount}
              </p>
              <span className="text-xs text-slate-500 tabular-nums">
                • Rata GPA {stats.avgGpa != null ? stats.avgGpa.toFixed(2) : '—'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Skala konversi BARS 1–5 → 4.00</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Siap Terbit LHA</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <p className="font-heading text-2xl font-bold text-amber-700 mt-3 tabular-nums">
              {stats.readyCount}
            </p>
            <p className="text-xs text-slate-500 mt-1">Sudah ada GPA, menunggu E-Sign</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">LHA Terbit (E-Sign)</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileCheck2 className="w-4 h-4" />
              </div>
            </div>
            <p className="font-heading text-2xl font-bold text-emerald-700 mt-3 tabular-nums">
              {stats.signedCount}
            </p>
            <p className="text-xs text-slate-500 mt-1">Terkunci dengan sertifikat SHA-256</p>
          </div>
        </div>

        {/* Table Rekap */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-base font-bold text-ink">
                  Rekapitulasi Nilai Akhir &amp; Status LHA Peserta
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Klik &ldquo;Preview &amp; LHA&rdquo; untuk memeriksa ringkasan nilai akhir serta menandatangani LHA.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama, kode, nomor LHA..."
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

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {([
                ['all', `Semua (${stats.total})`],
                ['ready', `Siap E-Sign (${stats.readyCount})`],
                ['signed', `LHA Terbit (${stats.signedCount})`],
                ['ungraded', 'Belum Dinilai BARS']
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLhaFilter(key)}
                  className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                    lhaFilter === key
                      ? 'bg-[#1E3A8A] text-white'
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
                  <TableHead>Soal CAT</TableHead>
                  <TableHead>Live Coding</TableHead>
                  <TableHead>BARS &amp; GPA</TableHead>
                  <TableHead>Proctoring</TableHead>
                  <TableHead>Rekomendasi</TableHead>
                  <TableHead>Status LHA</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-xs text-slate-500">
                      Memuat rekap penilaian akhir...
                    </TableCell>
                  </TableRow>
                ) : filteredCandidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-xs text-slate-500">
                      Tidak ada peserta yang sesuai dengan filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCandidates.map((c) => {
                    const recMeta = c.recommendation ? RECOMMENDATION_BADGE[c.recommendation] : null;
                    const isSigned = c.lhaStatus === 'signed';
                    const hasBars = c.gpaScore != null && c.barsAverage != null;
                    return (
                      <TableRow key={c.code} className="hover:bg-slate-50/70">
                        <TableCell>
                          <div className="min-w-[180px] max-w-[230px]">
                            <p className="font-semibold text-xs sm:text-sm text-ink truncate">{c.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                              <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                                {c.code}
                              </span>
                              <span className="truncate">{c.program}</span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-xs tabular-nums">
                          {c.catStatus === 'selesai' && c.catScore != null ? (
                            <span className="font-semibold text-ink">{Math.round(c.catScore)} / 100</span>
                          ) : (
                            <span className="text-slate-400">Belum</span>
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-xs tabular-nums">
                          {c.liveCodingStatus === 'selesai' && c.liveCodingScore != null ? (
                            <span className="font-semibold text-ink">{Math.round(c.liveCodingScore)} / 100</span>
                          ) : (
                            <span className="text-slate-400">Belum</span>
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap tabular-nums">
                          {hasBars ? (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                                GPA {c.gpaScore!.toFixed(2)}
                              </span>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                BARS {c.barsAverage!.toFixed(2)} / 5
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Belum Dinilai</span>
                          )}
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
                          {recMeta ? (
                            <Badge variant={recMeta.variant} format="soft">
                              {recMeta.label}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          {isSigned ? (
                            <div className="space-y-0.5">
                              <Badge variant="success" format="soft" hasDot>
                                Terbit (E-Sign)
                              </Badge>
                              {c.lhaNumber && (
                                <p className="font-mono text-[10px] text-slate-500">{c.lhaNumber}</p>
                              )}
                            </div>
                          ) : hasBars ? (
                            <Badge variant="warning" format="soft">
                              Siap E-Sign
                            </Badge>
                          ) : (
                            <Badge variant="neutral" format="outline">
                              Draft
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {isSigned && (
                              <button
                                type="button"
                                onClick={() => void handleDownloadPdf(c)}
                                disabled={downloadingPdf}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                                <span>PDF</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void openLhaDetail(c.code)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white text-[11px] font-semibold cursor-pointer"
                            >
                              <ClipboardCheck className="w-3 h-3" />
                              <span>{isSigned ? 'Detail LHA' : 'Preview & LHA'}</span>
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

      {/* Modal Preview Penilaian Akhir & Penerbitan LHA (E-Sign) */}
      {(selected || loadingModal) && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/70">
              <div>
                <h3 className="font-heading text-base font-bold text-ink">
                  Laporan Hasil Asesmen (LHA) &amp; Penilaian Akhir
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ringkasan hasil seluruh tahap sebelum tanda tangan digital asesor (E-Sign).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setSelectedScore(null);
                  setNotice(null);
                  if (id) navigate('/asesor/rekap-lha', { replace: true });
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingModal || !selected ? (
              <div className="p-10 text-center text-xs text-slate-500">
                Memuat rincian penilaian akhir &amp; LHA...
              </div>
            ) : (
              <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
                {notice && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-medium ${
                      notice.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    {notice.message}
                  </div>
                )}

                {/* Identitas Kandidat */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary-navy bg-white px-2 py-0.5 rounded border border-slate-200">
                        {selected.code}
                      </span>
                      <span className="font-heading text-base font-bold text-ink">{selected.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {selected.program} • {selected.company}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[11px] text-slate-500">Penilai / Asesor</p>
                    <p className="text-xs font-bold text-ink">{selected.assessorName || activeAsesor.name}</p>
                  </div>
                </div>

                {/* 4 Kartu Metrik Akhir (Tanpa Komposit, Fokus BARS GPA) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <p className="text-[11px] text-slate-500">Skor Soal CAT</p>
                    <p className="font-heading text-lg font-bold text-ink mt-1 tabular-nums">
                      {selected.catScore != null ? `${Math.round(selected.catScore)} / 100` : 'Belum'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <p className="text-[11px] text-slate-500">Live Coding</p>
                    <p className="font-heading text-lg font-bold text-ink mt-1 tabular-nums">
                      {selected.liveCodingScore != null ? `${Math.round(selected.liveCodingScore)} / 100` : 'Belum'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-blue-200 bg-soft-blue/50">
                    <p className="text-[11px] text-primary-navy font-semibold">GPA BARS (Skala 4.00)</p>
                    <p className="font-heading text-lg font-bold text-primary-navy mt-1 tabular-nums">
                      {selected.gpaScore != null ? `${selected.gpaScore.toFixed(2)} / 4.00` : 'Belum'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <p className="text-[11px] text-slate-500">Integritas Proctoring</p>
                    <p className="font-heading text-lg font-bold text-ink mt-1 tabular-nums">
                      {selected.integrityScore != null ? `${Math.round(selected.integrityScore)}%` : '—'}
                    </p>
                  </div>
                </div>

                {/* Rincian Rubrik BARS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading text-xs font-bold uppercase tracking-wide text-slate-600">
                      Rincian Kompetensi BARS (1–5)
                    </h4>
                    <button
                      type="button"
                      onClick={() => navigate(`/asesor/hasil-interview/${selected.code}`)}
                      className="text-xs font-semibold text-primary-navy hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ubah Nilai BARS</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  {Array.isArray(selectedScore?.competencies) && selectedScore.competencies.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedScore.competencies.map((comp: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-ink truncate">{comp.name}</p>
                            {comp.notes && <p className="text-[11px] text-slate-500 truncate mt-0.5">{comp.notes}</p>}
                          </div>
                          <span className="font-heading font-bold text-primary-navy tabular-nums shrink-0">
                            {comp.score} / 5
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900 flex items-center justify-between gap-3">
                      <span>Belum ada penilaian rubrik BARS untuk peserta ini.</span>
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => navigate(`/asesor/hasil-interview/${selected.code}`)}
                      >
                        Isi BARS Sekarang
                      </Button>
                    </div>
                  )}
                </div>

                {/* Rekomendasi & Catatan Akhir LHA */}
                {selected.lhaStatus === 'signed' ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-emerald-900">
                        <Lock className="w-4 h-4" />
                        <span>LHA Telah Ditandatangani &amp; Terbit Resmi</span>
                      </div>
                      <Badge variant="success" format="soft">
                        {selected.lhaNumber || 'Signed'}
                      </Badge>
                    </div>
                    <p className="text-emerald-800">
                      Ditandatangani pada {formatWib(selected.signedAt)} • Rekomendasi:{' '}
                      <strong>{selected.recommendation || finalRec}</strong>
                    </p>
                    {selected.lhaHash && (
                      <p className="font-mono text-[10px] text-emerald-700 break-all">
                        SHA-256: {selected.lhaHash}
                      </p>
                    )}
                    {finalNotes && (
                      <p className="text-emerald-900 pt-1 border-t border-emerald-200/80">
                        Catatan: {finalNotes}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Rekomendasi Keputusan Akhir
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          ['LANJUT', 'Direkomendasikan'],
                          ['DIPERTIMBANGKAN', 'Dipertimbangkan'],
                          ['TIDAK', 'Belum Memenuhi']
                        ] as const).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setFinalRec(key)}
                            className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                              finalRec === key
                                ? 'bg-primary-navy text-white border-primary-navy'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Ringkasan Catatan Resmi LHA
                      </label>
                      <textarea
                        rows={3}
                        value={finalNotes}
                        onChange={(e) => setFinalNotes(e.target.value)}
                        placeholder="Tuliskan kesimpulan kelayakan kandidat untuk dicantumkan pada dokumen LHA..."
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:border-primary-navy outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  {selected.lhaStatus === 'signed' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void handleDownloadPdf(selected)}
                      disabled={downloadingPdf}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      {downloadingPdf ? 'Mengunduh...' : 'Unduh Dokumen LHA (PDF)'}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void handleSignLha()}
                      disabled={signing || !(Array.isArray(selectedScore?.competencies) && selectedScore.competencies.length > 0)}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                      {signing ? 'Menerbitkan LHA...' : 'Finalisasi & Terbitkan LHA (E-Sign)'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AsesorLayout>
  );
}
