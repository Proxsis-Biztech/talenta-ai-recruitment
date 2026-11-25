import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardList,
  Code2,
  Search,
  XCircle
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

export default function AsesorCatCodingResults() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'coding' ? 'coding' : 'cat';

  const [candidates, setCandidates] = useState<AssessorCandidate[]>([]);
  const [selected, setSelected] = useState<AssessorCandidate | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<'cat' | 'coding'>(initialTab);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    fetchAssessorCandidates()
      .then((list) => {
        if (cancelled) return;
        setCandidates(list);
        if (!id && list.length > 0) {
          const withWork =
            list.find((c) => c.catStatus === 'selesai' || c.liveCodingStatus === 'selesai') || list[0];
          if (withWork) {
            navigate(`/asesor/hasil-cat/${withWork.code}`, { replace: true });
          }
        }
      })
      .catch(() => {
        if (!cancelled) setCandidates([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  useEffect(() => {
    if (!id) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    fetchAssessorCandidate(id)
      .then((data) => {
        if (!cancelled) setSelected(data);
      })
      .catch(() => {
        if (!cancelled) setSelected(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.program.toLowerCase().includes(q)
    );
  }, [candidates, search]);

  const catDetails = selected?.catDetails;
  const coding = selected?.liveCodingSubmission;

  return (
    <AsesorLayout activeTab="hasil-cat">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-7 sm:py-8 space-y-6 antialiased">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-ink tracking-tight">
              Hasil Pengerjaan Soal CAT &amp; Live Coding
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Tinjau jawaban butir soal CAT (pilihan ganda, isian, esai) serta kode program yang dikumpulkan peserta pada Live Coding.
            </p>
          </div>
          {selected && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/asesor/tracking/${selected.code}`)}
            >
              Lihat Tracking Progres
            </Button>
          )}
        </div>

        {/* Selector Peserta */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter daftar peserta..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-primary-navy outline-none"
            />
          </div>
          <div className="lg:col-span-7">
            <select
              value={id || ''}
              onChange={(e) => {
                if (e.target.value) navigate(`/asesor/hasil-cat/${e.target.value}`);
              }}
              disabled={loadingList || filteredCandidates.length === 0}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-ink focus:outline-none focus:border-primary-navy"
            >
              {filteredCandidates.length === 0 ? (
                <option value="">Tidak ada peserta ditemukan</option>
              ) : (
                filteredCandidates.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code}) — CAT: {c.catStatus === 'selesai' ? `${c.catScore ?? 0}/100` : 'Belum'} • Coding: {c.liveCodingStatus === 'selesai' ? `${c.liveCodingScore ?? 0}/100` : 'Belum'}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {loadingDetail ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center text-sm text-slate-500">
            Memuat hasil pengerjaan CAT &amp; Live Coding...
          </div>
        ) : !selected ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center text-sm text-slate-500">
            Pilih peserta di atas untuk melihat hasil pengerjaan CAT &amp; Live Coding.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Switch Tabs */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 gap-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab('cat')}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'cat' ? 'bg-primary-navy text-white' : 'text-slate-600 hover:text-ink'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span>Hasil Soal CAT ({catDetails?.questions?.length || 0} Soal)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('coding')}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'coding' ? 'bg-primary-navy text-white' : 'text-slate-600 hover:text-ink'
                }`}
              >
                <Code2 className="w-4 h-4" />
                <span>Hasil Live Coding</span>
              </button>
            </div>

            {activeTab === 'cat' ? (
              <div className="space-y-5">
                {/* Summary CAT */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                    <p className="text-xs text-slate-500">Status Pengerjaan CAT</p>
                    <div className="mt-1.5">
                      <Badge
                        variant={selected.catStatus === 'selesai' ? 'success' : selected.catStatus === 'sedang' ? 'warning' : 'neutral'}
                        format="soft"
                      >
                        {selected.catStatus === 'selesai'
                          ? 'Selesai'
                          : selected.catStatus === 'sedang'
                            ? 'Sedang Dikerjakan'
                            : 'Belum Mengerjakan'}
                      </Badge>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                    <p className="text-xs text-slate-500">Skor CAT Otomatis</p>
                    <p className="font-heading text-2xl font-bold tabular-nums text-primary-navy mt-1">
                      {catDetails?.score != null ? `${catDetails.score} / 100` : '—'}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                    <p className="text-xs text-slate-500">Jumlah Soal Terjawab</p>
                    <p className="font-heading text-2xl font-bold tabular-nums text-ink mt-1">
                      {selected.catAnsweredCount ?? 0} / {catDetails?.questions?.length || selected.catTotalQuestions || 0}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                    <p className="text-xs text-slate-500">Waktu Dikumpulkan</p>
                    <p className="text-xs font-semibold text-ink mt-2">{formatWib(catDetails?.submittedAt)}</p>
                  </div>
                </div>

                {/* Keterangan Proctoring Saat Pengerjaan Soal CAT */}
                <AsesorProctoringCard
                  candidateCode={selected.code}
                  integrityScore={catDetails?.integrityScore ?? selected.integrityScore}
                  stageFilter="cat"
                />

                {/* Breakdown Kompetensi */}
                {catDetails && catDetails.competencyScores?.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
                    <h2 className="font-heading text-sm sm:text-base font-bold text-ink">
                      Capaian per Kompetensi CAT
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {catDetails.competencyScores.map((comp, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-ink">{comp.name}</p>
                            {comp.weight && <p className="text-[11px] text-slate-500">Bobot {comp.weight}</p>}
                          </div>
                          <span className="font-heading text-base font-bold tabular-nums text-primary-navy">
                            {comp.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Daftar Butir Soal & Jawaban */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="font-heading text-sm sm:text-base font-bold text-ink">
                      Lembar Jawaban Soal CAT Peserta
                    </h2>
                  </div>
                  {!catDetails || catDetails.questions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      Peserta ini belum memulai atau menyimpan jawaban soal CAT.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12 text-center">#</TableHead>
                            <TableHead>SOAL &amp; KOMPETENSI</TableHead>
                            <TableHead>JAWABAN PESERTA</TableHead>
                            <TableHead>KUNCI / INDIKATOR</TableHead>
                            <TableHead className="text-right">STATUS</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {catDetails.questions.map((q) => {
                            const matchedOpt =
                              typeof q.candidateAnswer === 'string'
                                ? q.options.find((o) => o.key === q.candidateAnswer)
                                : null;
                            const matchedKeyOpt =
                              typeof q.correctAnswer === 'string'
                                ? q.options.find((o) => o.key === q.correctAnswer)
                                : null;

                            return (
                              <TableRow key={q.id}>
                                <TableCell className="text-center font-mono text-xs font-semibold text-slate-500">
                                  {q.orderNo}
                                </TableCell>
                                <TableCell className="max-w-md space-y-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <Badge variant="outline">{q.competency}</Badge>
                                    <span className="text-[11px] uppercase text-slate-400">{q.type}</span>
                                  </div>
                                  <p className="text-xs text-ink font-medium leading-relaxed">{q.text}</p>
                                  {q.codeSnippet && (
                                    <pre className="p-2 rounded-lg bg-slate-900 text-slate-100 font-mono text-[10px] overflow-x-auto">
                                      {q.codeSnippet}
                                    </pre>
                                  )}
                                </TableCell>
                                <TableCell className="max-w-xs text-xs text-ink">
                                  {q.candidateAnswer == null || q.candidateAnswer === '' ? (
                                    <span className="text-slate-400 italic">Tidak dijawab</span>
                                  ) : matchedOpt ? (
                                    <span>
                                      <strong className="font-mono text-primary-navy">{matchedOpt.key}.</strong>{' '}
                                      {matchedOpt.label}
                                    </span>
                                  ) : Array.isArray(q.candidateAnswer) ? (
                                    <span className="font-mono">{q.candidateAnswer.join(', ')}</span>
                                  ) : typeof q.candidateAnswer === 'object' ? (
                                    <pre className="text-[11px] font-mono bg-slate-50 p-2 rounded">
                                      {JSON.stringify(q.candidateAnswer, null, 2)}
                                    </pre>
                                  ) : (
                                    <p className="whitespace-pre-wrap">{String(q.candidateAnswer)}</p>
                                  )}
                                </TableCell>
                                <TableCell className="max-w-xs text-xs text-slate-600">
                                  {q.type === 'essay' ? (
                                    <span className="text-slate-400">Penilaian manual / esai</span>
                                  ) : matchedKeyOpt ? (
                                    <span>
                                      <strong className="font-mono">{matchedKeyOpt.key}.</strong> {matchedKeyOpt.label}
                                    </span>
                                  ) : q.correctAnswer != null ? (
                                    <span className="font-mono">
                                      {Array.isArray(q.correctAnswer)
                                        ? q.correctAnswer.join(', ')
                                        : typeof q.correctAnswer === 'object'
                                          ? 'Pasangan Matching'
                                          : String(q.correctAnswer)}
                                    </span>
                                  ) : (
                                    '—'
                                  )}
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                  {q.isCorrect === true ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Benar
                                    </span>
                                  ) : q.isCorrect === false ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                                      <XCircle className="w-3.5 h-3.5" /> Salah
                                    </span>
                                  ) : (
                                    <Badge variant="neutral" format="soft">Esai / Review</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Tab Live Coding */
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
                {!coding ? (
                  <div className="py-10 text-center space-y-2">
                    <Code2 className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold text-ink">Belum Ada Submission Live Coding</p>
                    <p className="text-xs text-slate-500">
                      Peserta {selected.name} belum mengirimkan kode jawaban pada modul Live Coding.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                        <p className="text-xs text-slate-500">Tantangan</p>
                        <p className="text-sm font-bold text-ink mt-1">{coding.problemTitle}</p>
                        <p className="font-mono text-[11px] text-slate-500">{coding.problemId}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                        <p className="text-xs text-slate-500">Bahasa &amp; Status</p>
                        <p className="text-sm font-bold text-primary-navy uppercase mt-1">{coding.language}</p>
                        <p className="text-xs text-slate-600">{coding.statusLabel}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                        <p className="text-xs text-slate-500">Skor &amp; Test Cases</p>
                        <p className="font-heading text-xl font-bold tabular-nums text-emerald-700 mt-1">
                          {coding.score} / 100
                        </p>
                        <p className="text-xs text-slate-600 tabular-nums">
                          {coding.passedTests} dari {coding.totalTests} test case lulus
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                        <p className="text-xs text-slate-500">Waktu Pengiriman</p>
                        <p className="text-xs font-semibold text-ink mt-2">{formatWib(coding.submittedAt)}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-ink block">
                        Kode Sumber Jawaban Peserta
                      </span>
                      <pre className="p-5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto max-h-[520px]">
                        {coding.code}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AsesorLayout>
  );
}
