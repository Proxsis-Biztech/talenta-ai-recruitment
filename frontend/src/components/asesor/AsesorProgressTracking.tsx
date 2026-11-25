import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  Code2,
  FileText,
  GraduationCap,
  MessageSquare,
  Search
} from 'lucide-react';
import { AsesorLayout } from './AsesorLayout';
import { AsesorProctoringCard } from './AsesorProctoringCard';
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui';
import {
  fetchAssessorCandidate,
  fetchAssessorCandidates,
  type AssessorCandidate
} from '../../services/assessorService';

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

const stageCount = (c: AssessorCandidate) =>
  (c.catStatus === 'selesai' ? 1 : 0) +
  (c.liveCodingStatus === 'selesai' ? 1 : 0) +
  (c.interviewDone ? 1 : 0);

const StatusPill = ({
  status,
  detail
}: {
  status: 'selesai' | 'sedang' | 'belum';
  detail?: string | null;
}) => {
  if (status === 'selesai') {
    return (
      <Badge variant="success" format="soft" hasDot>
        Selesai{detail ? ` • ${detail}` : ''}
      </Badge>
    );
  }
  if (status === 'sedang') {
    return (
      <Badge variant="warning" format="soft" hasDot>
        Sedang Berjalan
      </Badge>
    );
  }
  return (
    <Badge variant="neutral" format="soft">
      Belum Mengerjakan
    </Badge>
  );
};

export default function AsesorProgressTracking() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [candidates, setCandidates] = useState<AssessorCandidate[]>([]);
  const [selected, setSelected] = useState<AssessorCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [progressFilter, setProgressFilter] = useState<'all' | 'complete' | 'in_progress' | 'not_started'>('all');
  const [accountFilter, setAccountFilter] = useState<'all' | 'real' | 'test'>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (id) {
      fetchAssessorCandidate(id)
        .then((data) => {
          if (!cancelled) setSelected(data);
        })
        .catch(() => {
          if (!cancelled) setSelected(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      fetchAssessorCandidates()
        .then((list) => {
          if (!cancelled) setCandidates(list);
        })
        .catch(() => {
          if (!cancelled) setCandidates([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [id]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => {
      if (accountFilter === 'real' && c.isTestAccount) return false;
      if (accountFilter === 'test' && !c.isTestAccount) return false;
      const done = stageCount(c);
      if (progressFilter === 'complete' && done < 3) return false;
      if (progressFilter === 'in_progress' && (done === 0 || done === 3)) return false;
      if (progressFilter === 'not_started' && (done > 0 || c.catStatus === 'sedang' || c.liveCodingStatus === 'sedang')) {
        return false;
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.program.toLowerCase().includes(q)
      );
    });
  }, [candidates, search, progressFilter, accountFilter]);

  if (id) {
    if (loading) {
      return (
        <AsesorLayout activeTab="tracking">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 text-center text-sm text-slate-500">
            Memuat detail progres peserta...
          </div>
        </AsesorLayout>
      );
    }

    if (!selected) {
      return (
        <AsesorLayout activeTab="tracking">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 text-center space-y-3">
            <p className="text-sm font-semibold text-ink">Peserta tidak ditemukan pada tenant Anda.</p>
            <Button variant="primary" size="sm" onClick={() => navigate('/asesor/tracking')}>
              Kembali ke Tracking Progres
            </Button>
          </div>
        </AsesorLayout>
      );
    }

    const doneStages = stageCount(selected);
    const catQuestions = selected.catDetails?.questions || [];
    const transcriptSegments = selected.transcriptSegments || [];
    const candidateTurns = transcriptSegments.filter((s) => s.speaker === 'Kandidat');
    const coding = selected.liveCodingSubmission;

    return (
      <AsesorLayout activeTab="tracking">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-7 sm:py-8 space-y-6 antialiased">
          <button
            type="button"
            onClick={() => navigate('/asesor/tracking')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-ink cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Daftar Tracking Progres</span>
          </button>

          {/* Header Profil & Progress Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary-navy bg-soft-blue px-2.5 py-0.5 rounded-md border border-accent-border">
                  {selected.code}
                </span>
                <Badge variant={doneStages === 3 ? 'success' : doneStages > 0 ? 'warning' : 'neutral'} format="soft">
                  {doneStages}/3 Tahap Selesai
                </Badge>
                {selected.gpaScore != null && (
                  <Badge variant="navy" format="soft">
                    GPA BARS: {selected.gpaScore.toFixed(2)} / 4.00
                  </Badge>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-ink tracking-tight mt-1">
                {selected.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                {selected.program} • {selected.company}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/asesor/hasil-cat/${selected.code}`)}
                leftIcon={<ClipboardList className="w-3.5 h-3.5" />}
              >
                Hasil CAT &amp; Coding
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/asesor/hasil-interview/${selected.code}`)}
                leftIcon={<GraduationCap className="w-3.5 h-3.5" />}
              >
                Transkrip &amp; Nilai BARS
              </Button>
            </div>
          </div>

          {/* 3-Stage Stepper Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Tahap 1 • Soal CAT</span>
                <ClipboardList className="w-4 h-4 text-primary-navy" />
              </div>
              <StatusPill
                status={selected.catStatus || 'belum'}
                detail={selected.catScore != null ? `Skor ${selected.catScore}` : null}
              />
              <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Soal Terjawab</span>
                  <span className="font-semibold tabular-nums">
                    {selected.catAnsweredCount ?? 0}
                    {selected.catTotalQuestions ? ` / ${selected.catTotalQuestions}` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu Mulai</span>
                  <span className="tabular-nums">{formatWib(selected.catDetails?.startedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu Selesai</span>
                  <span className="tabular-nums">{formatWib(selected.catDetails?.submittedAt)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Tahap 2 • Live Coding</span>
                <Code2 className="w-4 h-4 text-blue-600" />
              </div>
              <StatusPill
                status={selected.liveCodingStatus || 'belum'}
                detail={coding ? `Skor ${coding.score}` : null}
              />
              <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-100">
                <div className="flex justify-between gap-2">
                  <span>Tantangan</span>
                  <span className="font-semibold truncate">{coding?.problemTitle || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bahasa</span>
                  <span className="font-semibold uppercase">{coding?.language || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Test Cases / Kirim</span>
                  <span className="tabular-nums">
                    {coding ? `${coding.passedTests}/${coding.totalTests} • ${formatWib(coding.submittedAt)}` : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Tahap 3 • Interview AI &amp; BARS</span>
                <MessageSquare className="w-4 h-4 text-emerald-600" />
              </div>
              <StatusPill
                status={selected.interviewDone ? 'selesai' : 'belum'}
                detail={
                  selected.gpaScore != null ? `GPA ${selected.gpaScore.toFixed(2)}` : null
                }
              />
              <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Durasi Wawancara</span>
                  <span className="tabular-nums">
                    {selected.interviewDurationSec != null
                      ? `${Math.floor(selected.interviewDurationSec / 60)}m ${String(selected.interviewDurationSec % 60).padStart(2, '0')}s`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Baris Transkrip / Respons</span>
                  <span className="tabular-nums">
                    {transcriptSegments.length} baris ({candidateTurns.length} kandidat)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Penilaian BARS &amp; GPA</span>
                  <span className="font-semibold tabular-nums text-primary-navy">
                    {selected.barsAverage != null && selected.gpaScore != null
                      ? `BARS ${selected.barsAverage.toFixed(2)}/5 • GPA ${selected.gpaScore.toFixed(2)}/4`
                      : 'Belum Dinilai'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Keterangan Proctoring Saat Ujian CAT & Interview AI */}
          <AsesorProctoringCard
            candidateCode={selected.code}
            integrityScore={selected.integrityScore}
            stageFilter="all"
          />

          {/* Detail Pengerjaan CAT */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-base sm:text-lg font-bold text-ink">
                  Detail Pengerjaan Soal CAT
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ringkasan jawaban peserta per butir soal dan kompetensi teknis.
                </p>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => navigate(`/asesor/hasil-cat/${selected.code}`)}
                rightIcon={<ArrowRight className="w-3 h-3" />}
              >
                Buka Halaman Hasil CAT &amp; Coding
              </Button>
            </div>

            {catQuestions.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">
                Belum ada rekaman jawaban CAT yang tersimpan untuk peserta ini.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {catQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-primary-navy">#{q.orderNo}</span>
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-medium text-slate-600">
                          {q.competency}
                        </span>
                        <span className="text-[11px] text-slate-400 uppercase">{q.type}</span>
                      </div>
                      <p className="text-ink font-medium line-clamp-2">{q.text}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs text-slate-600">
                        Jawaban:{' '}
                        <strong className="font-mono text-ink">
                          {q.candidateAnswer == null || q.candidateAnswer === ''
                            ? 'Kosong'
                            : Array.isArray(q.candidateAnswer)
                              ? q.candidateAnswer.join(', ')
                              : typeof q.candidateAnswer === 'object'
                                ? 'Terisi'
                                : String(q.candidateAnswer).slice(0, 40)}
                        </strong>
                      </span>
                      {q.isCorrect === true && <Badge variant="success" format="soft">Benar</Badge>}
                      {q.isCorrect === false && <Badge variant="danger" format="soft">Salah</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail Pengerjaan Live Coding & Interview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-bold text-ink flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-blue-600" />
                  Detail Live Coding
                </h2>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => navigate(`/asesor/hasil-cat/${selected.code}?tab=coding`)}
                >
                  Lihat Kode Penuh
                </Button>
              </div>
              {!coding ? (
                <p className="text-xs text-slate-500 py-4">Peserta belum mengumpulkan solusi Live Coding.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant={coding.completed ? 'success' : 'warning'} format="soft">
                      {coding.statusLabel} ({coding.passedTests}/{coding.totalTests} test)
                    </Badge>
                    <span className="font-semibold text-ink">{coding.problemTitle}</span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {coding.language}
                    </span>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-48">
                    {coding.code || '// Tidak ada kode'}
                  </pre>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-bold text-ink flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Ringkasan Transkrip &amp; Nilai BARS
                </h2>
                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => navigate(`/asesor/hasil-interview/${selected.code}`)}
                >
                  Buka &amp; Nilai BARS
                </Button>
              </div>
              {transcriptSegments.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">Belum ada transkrip wawancara AI tersimpan.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {transcriptSegments
                    .filter((s) => s.speaker !== 'Sistem')
                    .slice(0, 6)
                    .map((seg, i) => (
                      <div key={i} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 text-xs">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-primary-navy">{seg.speaker}</span>
                          <span className="font-mono text-[10px] text-slate-400">{seg.timestamp}</span>
                        </div>
                        <p className="text-slate-700 line-clamp-2">{seg.text}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </AsesorLayout>
    );
  }

  return (
    <AsesorLayout activeTab="tracking">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-7 sm:py-8 space-y-6 antialiased">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-ink tracking-tight">
              Tracking Progres Pengerjaan Peserta
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Pantau progres pengerjaan Soal CAT, Live Coding, hingga Interview AI beserta detail hasil setiap tahap.
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs font-semibold shadow-2xs self-start">
            {(['all', 'real', 'test'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setAccountFilter(key)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  accountFilter === key ? 'bg-primary-navy text-white' : 'text-slate-500 hover:text-ink'
                }`}
              >
                {key === 'all' ? 'Semua' : key === 'real' ? 'Peserta Asli' : 'Akun Uji'}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, kode kandidat, atau program..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-primary-navy outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: 'all', label: 'Semua Status' },
                { key: 'complete', label: 'Lengkap (3/3)' },
                { key: 'in_progress', label: 'Sedang Berjalan' },
                { key: 'not_started', label: 'Belum Mulai' }
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setProgressFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  progressFilter === f.key
                    ? 'bg-primary-navy text-white'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PESERTA</TableHead>
                  <TableHead>PROGRAM</TableHead>
                  <TableHead>PROGRES</TableHead>
                  <TableHead>SOAL CAT</TableHead>
                  <TableHead>LIVE CODING</TableHead>
                  <TableHead>INTERVIEW AI</TableHead>
                  <TableHead>PROCTORING</TableHead>
                  <TableHead>BARS &amp; GPA</TableHead>
                  <TableHead className="text-right">DETAIL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-xs text-slate-500">
                      Memuat daftar progres peserta...
                    </TableCell>
                  </TableRow>
                ) : filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-xs text-slate-500">
                      Tidak ada peserta yang sesuai dengan filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredList.map((c) => {
                    const done = stageCount(c);
                    const pct = Math.round((done / 3) * 100);
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-semibold text-sm text-ink">{c.name}</p>
                            <p className="font-mono text-[11px] text-slate-500">{c.code}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-700 max-w-[200px]">
                          <span className="line-clamp-2">{c.program}</span>
                        </TableCell>
                        <TableCell className="min-w-[120px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold">
                              <span className="text-slate-600">{done}/3 Tahap</span>
                              <span className="text-primary-navy tabular-nums">{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-primary-navy rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            status={c.catStatus || 'belum'}
                            detail={c.catScore != null ? `${c.catScore}` : null}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            status={c.liveCodingStatus || 'belum'}
                            detail={c.liveCodingScore != null ? `${c.liveCodingScore}` : null}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusPill status={c.interviewDone ? 'selesai' : 'belum'} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {(c.proctoringFlagCount ?? 0) > 0 ? (
                            <Badge variant="warning" format="soft" hasDot>
                              {c.proctoringFlagCount} Flag
                            </Badge>
                          ) : c.integrityScore != null ? (
                            <Badge variant="success" format="soft">
                              Integritas {Math.round(c.integrityScore)}%
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {c.gpaScore != null && c.barsAverage != null ? (
                            <span className="font-semibold text-primary-navy tabular-nums">
                              BARS {c.barsAverage.toFixed(2)} • GPA {c.gpaScore.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-400">Belum dinilai</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => navigate(`/asesor/tracking/${c.code}`)}
                            rightIcon={<ArrowRight className="w-3 h-3" />}
                          >
                            Detail Pengerjaan
                          </Button>
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
