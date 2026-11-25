import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle2,
  Clock,
  FileAudio,
  GraduationCap,
  MessageSquare,
  Save,
  Search
} from 'lucide-react';
import { AsesorLayout } from './AsesorLayout';
import { AsesorProctoringCard } from './AsesorProctoringCard';
import { Badge, Button } from '../ui';
import {
  fetchAssessorCandidate,
  fetchAssessorCandidates,
  fetchAssessorScoreByCode,
  fetchRecordingAudioBlobUrl,
  type AssessorCandidate
} from '../../services/assessorService';
import { getPortalToken } from '../../services/portalAuthService';

interface BarsCompetency {
  id: string;
  name: string;
  weight: number;
  score: number;
  notes: string;
  descriptors: Record<number, string>;
}

const DEFAULT_BARS_RUBRICS: BarsCompetency[] = [
  {
    id: 'c1',
    name: 'System Architecture & Scalability',
    weight: 30,
    score: 0,
    notes: '',
    descriptors: {
      1: 'Tidak memahami konsep dasar arsitektur terdistribusi.',
      2: 'Mengetahui istilah umum namun kesulitan merancang alur data.',
      3: 'Memahami prinsip microservices dan mampu menyelesaikan skenario standar.',
      4: 'Sangat baik dalam mendesain toleransi kesalahan dan strategi caching.',
      5: 'Kecakapan arsitektural tingkat eksepsional dengan benchmark teruji.'
    }
  },
  {
    id: 'c2',
    name: 'Database Optimization & Tuning',
    weight: 25,
    score: 0,
    notes: '',
    descriptors: {
      1: 'Hanya memahami query CRUD dasar.',
      2: 'Kurang memahami indeks B-Tree dan optimasi query.',
      3: 'Mampu menganalisis slow query dan membuat indexing standar.',
      4: 'Menguasai connection pooling, partitioning, dan locking mitigation.',
      5: 'Mampu merancang database high-throughput tanpa risiko deadlock.'
    }
  },
  {
    id: 'c3',
    name: 'Problem Solving & Algorithmic Thinking',
    weight: 25,
    score: 0,
    notes: '',
    descriptors: {
      1: 'Kesulitan menemukan pendekatan awal masalah.',
      2: 'Solusi brute force tanpa optimasi kompleksitas.',
      3: 'Solusi optimal untuk skenario umum (O(n log n)).',
      4: 'Analisis kompleksitas waktu dan memori sangat akurat.',
      5: 'Menghasilkan pendekatan algoritma optimal beserta edge cases.'
    }
  },
  {
    id: 'c4',
    name: 'Komunikasi & Artikulasi Teknis',
    weight: 20,
    score: 0,
    notes: '',
    descriptors: {
      1: 'Tidak komunikatif dan pasif.',
      2: 'Penjelasan berbelit-belit dan sulit dipahami.',
      3: 'Komunikasi jelas dalam konteks teknis standar.',
      4: 'Artikulasi terstruktur, lugas, dan persuasif.',
      5: 'Komunikasi level leadership teknologi yang sangat jelas.'
    }
  }
];

const getGpaPredicate = (gpa: number | null) => {
  if (gpa == null) return { label: 'Belum Dinilai', variant: 'neutral' as const };
  if (gpa >= 3.5) return { label: 'Sangat Baik', variant: 'success' as const };
  if (gpa >= 2.75) return { label: 'Baik / Kompeten', variant: 'teal' as const };
  if (gpa >= 2.0) return { label: 'Cukup / Pertimbangkan', variant: 'warning' as const };
  return { label: 'Kurang Memenuhi', variant: 'danger' as const };
};

export default function AsesorInterviewResults() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [candidates, setCandidates] = useState<AssessorCandidate[]>([]);
  const [selected, setSelected] = useState<AssessorCandidate | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search, setSearch] = useState('');
  const [transcriptQuery, setTranscriptQuery] = useState('');

  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  const [rubrics, setRubrics] = useState<BarsCompetency[]>(DEFAULT_BARS_RUBRICS);
  const [activeCompId, setActiveCompId] = useState<string>('c1');
  const [recommendation, setRecommendation] = useState<'LANJUT' | 'DIPERTIMBANGKAN' | 'TIDAK'>('LANJUT');
  const [assessorNotes, setAssessorNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    fetchAssessorCandidates()
      .then((list) => {
        if (cancelled) return;
        setCandidates(list);
        if (!id && list.length > 0) {
          const priority =
            list.find((c) => c.interviewDone && c.gpaScore == null) ||
            list.find((c) => c.interviewDone) ||
            list[0];
          if (priority) {
            navigate(`/asesor/hasil-interview/${priority.code}`, { replace: true });
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

  const loadDetail = async (code: string, options?: { silent?: boolean }) => {
    if (!options?.silent) setLoadingDetail(true);
    setNotice(null);
    try {
      const data = await fetchAssessorCandidate(code);
      setSelected(data);
      if (!data) return;

      setAssessorNotes(data.assessorNotes || '');
      if (
        data.recommendation === 'LANJUT' ||
        data.recommendation === 'DIPERTIMBANGKAN' ||
        data.recommendation === 'TIDAK'
      ) {
        setRecommendation(data.recommendation);
      }

      let hydrated = false;
      try {
        const saved = await fetchAssessorScoreByCode(data.code, data.program);
        const savedComps = Array.isArray(saved?.competencies) ? saved.competencies : [];
        if (savedComps.length > 0) {
          hydrated = true;
          setRubrics(
            DEFAULT_BARS_RUBRICS.map((def, idx) => {
              const match =
                savedComps.find(
                  (c: any) => String(c?.name || '').toLowerCase() === def.name.toLowerCase()
                ) || savedComps[idx];
              return {
                ...def,
                score: typeof match?.score === 'number' ? match.score : 0,
                notes: typeof match?.notes === 'string' ? match.notes : ''
              };
            })
          );
          if (saved?.notes) setAssessorNotes(saved.notes);
          if (
            saved?.recommendation === 'LANJUT' ||
            saved?.recommendation === 'DIPERTIMBANGKAN' ||
            saved?.recommendation === 'TIDAK'
          ) {
            setRecommendation(saved.recommendation);
          }
        }
      } catch {
        // No AssessorScore yet
      }

      if (!hydrated) {
        setRubrics(DEFAULT_BARS_RUBRICS.map((r) => ({ ...r, score: 0, notes: '' })));
      }
    } catch {
      if (!options?.silent) setSelected(null);
    } finally {
      if (!options?.silent) setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setSelected(null);
      return;
    }
    void loadDetail(id);
  }, [id]);

  useEffect(() => {
    let activeUrl: string | null = null;
    if (!selected?.audioRecordingId) {
      setAudioBlobUrl(null);
      return;
    }
    setAudioLoading(true);
    fetchRecordingAudioBlobUrl(selected.audioRecordingId)
      .then((url) => {
        activeUrl = url;
        setAudioBlobUrl(url);
      })
      .catch(() => setAudioBlobUrl(null))
      .finally(() => setAudioLoading(false));
    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [selected?.audioRecordingId]);

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

  // Filter hanya percakapan wawancara (Ava AI & Kandidat)
  const dialogueSegments = useMemo(() => {
    const raw = Array.isArray(selected?.transcriptSegments) ? selected.transcriptSegments : [];
    const dialogueOnly = raw.filter((s) => s.speaker === 'Ava AI' || s.speaker === 'Kandidat');
    const q = transcriptQuery.trim().toLowerCase();
    if (!q) return dialogueOnly;
    return dialogueOnly.filter(
      (s) =>
        s.text.toLowerCase().includes(q) ||
        s.speaker.toLowerCase().includes(q) ||
        s.timestamp.toLowerCase().includes(q)
    );
  }, [selected?.transcriptSegments, transcriptQuery]);

  const hasAnyScore = rubrics.some((r) => r.score > 0);
  const barsAverage = useMemo(() => {
    if (!hasAnyScore) return null;
    const totalWeight = rubrics.reduce((sum, r) => sum + r.weight, 0);
    const val = rubrics.reduce((sum, r) => sum + (r.score * r.weight) / (totalWeight || 100), 0);
    return Math.round(val * 100) / 100;
  }, [rubrics, hasAnyScore]);

  const gpaScore = useMemo(() => {
    if (barsAverage == null) return null;
    return Math.round((barsAverage / 5) * 4 * 100) / 100;
  }, [barsAverage]);

  const gpaPredicate = getGpaPredicate(gpaScore);
  const activeRubric = rubrics.find((r) => r.id === activeCompId) || rubrics[0];

  const handleSelectScore = (compId: string, val: number) => {
    setRubrics((prev) => {
      const next = prev.map((r) => (r.id === compId ? { ...r, score: val } : r));
      const totalWeight = next.reduce((s, r) => s + r.weight, 0);
      const nextBars = next.reduce((s, r) => s + (r.score * r.weight) / (totalWeight || 100), 0);
      const nextGpa = (nextBars / 5) * 4;
      setRecommendation(nextGpa >= 2.75 ? 'LANJUT' : nextGpa >= 2.0 ? 'DIPERTIMBANGKAN' : 'TIDAK');
      return next;
    });
  };

  const handleSaveBarsGpa = async () => {
    if (!selected) return;
    setNotice(null);
    if (!hasAnyScore || barsAverage == null || gpaScore == null) {
      setNotice({
        type: 'error',
        message: 'Silakan berikan nilai skala BARS (1–5) minimal pada satu kompetensi sebelum menyimpan.'
      });
      return;
    }

    setSaving(true);
    try {
      const token = getPortalToken();
      if (!token) throw new Error('Sesi asesor tidak valid.');

      const interviewScore100 = Math.round(barsAverage * 20 * 10) / 10;
      await axios.post(
        '/api/asesor/scores',
        {
          candidateCode: selected.code,
          candidateName: selected.name,
          programTitle: selected.program,
          programCode: selected.programCode,
          competencies: rubrics.map((r) => ({
            name: r.name,
            weight: r.weight,
            score: r.score,
            notes: r.notes
          })),
          interviewScore: interviewScore100,
          compositeScore: interviewScore100,
          recommendation,
          notes: assessorNotes.trim() || `Penilaian BARS ${barsAverage.toFixed(2)}/5.00 (GPA ${gpaScore.toFixed(2)}/4.00)`,
          status: 'signed',
          finalized: true,
          evaluationMode: 'bars_gpa'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await loadDetail(selected.code, { silent: true });
      setCandidates((prev) =>
        prev.map((c) =>
          c.code === selected.code
            ? { ...c, barsAverage, gpaScore, recommendation }
            : c
        )
      );
      setNotice({
        type: 'success',
        message: `Penilaian BARS (${barsAverage.toFixed(2)}/5.00) & GPA (${gpaScore.toFixed(2)}/4.00) berhasil disimpan.`
      });
    } catch (err) {
      setNotice({
        type: 'error',
        message: axios.isAxiosError(err)
          ? err.response?.data?.error || 'Gagal menyimpan penilaian BARS & GPA.'
          : 'Gagal menyimpan penilaian BARS & GPA.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AsesorLayout activeTab="hasil-interview">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-7 sm:py-8 space-y-6 antialiased">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-ink tracking-tight">
              Hasil Interview &amp; Penilaian BARS (GPA)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Tinjau transkrip percakapan wawancara Ava AI dan berikan penilaian rubrik BARS (skala 1–5) yang dikonversi ke GPA (0.00–4.00).
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
              placeholder="Cari nama, kode kandidat, atau program..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-primary-navy outline-none"
            />
          </div>
          <div className="lg:col-span-7">
            <select
              value={id || ''}
              onChange={(e) => {
                if (e.target.value) navigate(`/asesor/hasil-interview/${e.target.value}`);
              }}
              disabled={loadingList || filteredCandidates.length === 0}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-ink focus:outline-none focus:border-primary-navy"
            >
              {filteredCandidates.length === 0 ? (
                <option value="">Tidak ada peserta ditemukan</option>
              ) : (
                filteredCandidates.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code}) — {c.interviewDone ? 'Sudah Interview' : 'Belum Interview'}
                    {c.gpaScore != null ? ` • GPA ${c.gpaScore.toFixed(2)}/4.00` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {notice && (
          <div
            className={`px-4 py-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <span>{notice.message}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="font-bold underline cursor-pointer shrink-0"
            >
              Tutup
            </button>
          </div>
        )}

        {loadingDetail ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center text-sm text-slate-500">
            Memuat transkrip wawancara &amp; lembar penilaian BARS...
          </div>
        ) : !selected ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center text-sm text-slate-500">
            Pilih peserta di atas untuk melihat transkrip percakapan dan mengisi penilaian BARS &amp; GPA.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Panel Kiri (6 cols): Transkrip Percakapan Wawancara + Proctoring Interview AI */}
            <div className="lg:col-span-6 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-base font-bold text-ink flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary-navy" />
                    <span>Transkrip Percakapan Wawancara</span>
                    <span className="text-xs font-normal text-slate-500">
                      ({dialogueSegments.length} pesan)
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dialog antara Pewawancara <strong>Ava AI</strong> dan <strong>Kandidat</strong>.
                  </p>
                </div>

                {selected.interviewDurationSec != null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium tabular-nums">
                    <Clock className="w-3.5 h-3.5" />
                    {Math.floor(selected.interviewDurationSec / 60)}m{' '}
                    {String(selected.interviewDurationSec % 60).padStart(2, '0')}s
                  </span>
                )}
              </div>

              {/* Audio Player jika tersedia */}
              {(audioLoading || audioBlobUrl) && (
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <FileAudio className="w-3.5 h-3.5 text-primary-navy" />
                    <span>Rekaman Audio Sesi</span>
                  </div>
                  {audioLoading ? (
                    <p className="text-xs text-slate-500">Memuat berkas audio...</p>
                  ) : (
                    audioBlobUrl && <audio controls src={audioBlobUrl} className="w-full h-9" />
                  )}
                </div>
              )}

              {/* Search Transkrip */}
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={transcriptQuery}
                    onChange={(e) => setTranscriptQuery(e.target.value)}
                    placeholder="Cari isi percakapan di transkrip..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 focus:border-primary-navy outline-none"
                  />
                </div>
              </div>

              {/* Chat Bubbles Transkrip Bersih */}
              <div className="p-5 space-y-3 max-h-[600px] overflow-y-auto bg-slate-50/30">
                {dialogueSegments.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    {selected.transcriptText
                      ? 'Tidak ada pesan percakapan yang cocok dengan pencarian.'
                      : 'Belum ada transkrip percakapan wawancara untuk peserta ini.'}
                  </div>
                ) : (
                  dialogueSegments.map((seg, idx) => {
                    const isAva = seg.speaker === 'Ava AI';
                    return (
                      <div
                        key={`${seg.timestamp}-${idx}`}
                        className={`p-3.5 rounded-2xl border text-xs sm:text-[13px] leading-relaxed ${
                          isAva
                            ? 'bg-white border-slate-200 text-slate-800 mr-6'
                            : 'bg-soft-blue/70 border-accent-border text-ink ml-6'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className={`text-[11px] font-bold ${
                              isAva ? 'text-primary-navy' : 'text-blue-700'
                            }`}
                          >
                            {isAva ? 'Ava AI (Pewawancara)' : `${selected.name} (Kandidat)`}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">{seg.timestamp}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{seg.text}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <AsesorProctoringCard
              candidateCode={selected.code}
              integrityScore={selected.integrityScore}
              stageFilter="interview"
            />
            </div>

            {/* Panel Kanan (6 cols): Penilaian BARS Saja -> GPA (Tanpa Komposit) */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
              {/* Header BARS + GPA Summary */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-heading text-base font-bold text-ink flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary-navy" />
                    <span>Penilaian Rubrik BARS &amp; GPA</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Beri nilai BARS (1–5) per kompetensi. Nilai akhir dihitung langsung sebagai GPA skala 4.00.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-center">
                    <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                      Rata-Rata BARS
                    </span>
                    <span className="font-heading text-lg font-bold tabular-nums text-ink">
                      {barsAverage != null ? `${barsAverage.toFixed(2)} / 5.00` : '—'}
                    </span>
                  </div>
                  <div className="px-3.5 py-2 rounded-xl bg-primary-navy text-white text-center shadow-2xs">
                    <span className="text-[10px] font-semibold uppercase text-blue-100 block">
                      Skor GPA
                    </span>
                    <span className="font-heading text-lg font-bold tabular-nums">
                      {gpaScore != null ? `${gpaScore.toFixed(2)} / 4.00` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs Kompetensi BARS */}
              <div className="p-1.5 bg-slate-100 border-b border-slate-200 flex gap-1 overflow-x-auto">
                {rubrics.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveCompId(r.id)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      activeCompId === r.id
                        ? 'bg-white text-primary-navy shadow-2xs'
                        : 'text-slate-600 hover:text-ink'
                    }`}
                  >
                    <span>{r.name.split(' ')[0]}</span>
                    <span className="ml-1 font-mono text-[11px] text-slate-500">
                      ({r.score > 0 ? `${r.score}/5` : '-/5'})
                    </span>
                  </button>
                ))}
              </div>

              {/* Detail Rubrik Aktif */}
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-heading text-sm sm:text-base font-bold text-ink">
                    {activeRubric.name}
                  </h3>
                  <Badge variant="navy" format="soft">Bobot {activeRubric.weight}%</Badge>
                </div>

                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((val) => {
                    const isSelected = activeRubric.score === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleSelectScore(activeRubric.id, val)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-soft-blue border-primary-navy ring-1 ring-primary-navy text-primary-navy'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-ink'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-primary-navy text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {val}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold">
                            {val === 5
                              ? 'Sangat Istimewa (Expert)'
                              : val === 4
                                ? 'Kompeten / Mahir'
                                : val === 3
                                  ? 'Cukup / Sesuai Standar'
                                  : val === 2
                                    ? 'Di Bawah Standar'
                                    : 'Tidak Memenuhi'}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {activeRubric.descriptors[val]}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Catatan Kompetensi ({activeRubric.name})
                  </label>
                  <textarea
                    rows={2}
                    value={activeRubric.notes}
                    onChange={(e) =>
                      setRubrics((prev) =>
                        prev.map((r) => (r.id === activeRubric.id ? { ...r, notes: e.target.value } : r))
                      )
                    }
                    placeholder="Catatan observasi jawaban kandidat..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-primary-navy text-xs outline-none"
                  />
                </div>

                {/* Ringkasan GPA & Keputusan Asesor */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink">
                      Predikat &amp; Rekomendasi GPA BARS
                    </span>
                    <Badge variant={gpaPredicate.variant} format="soft">
                      {gpaPredicate.label}
                      {gpaScore != null ? ` (${gpaScore.toFixed(2)} / 4.00)` : ''}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { key: 'LANJUT', label: 'Lanjut / Lulus' },
                        { key: 'DIPERTIMBANGKAN', label: 'Dipertimbangkan' },
                        { key: 'TIDAK', label: 'Tidak Lulus' }
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setRecommendation(opt.key)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                          recommendation === opt.key
                            ? 'bg-primary-navy text-white border-primary-navy'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Catatan Evaluasi Keseluruhan
                    </label>
                    <textarea
                      rows={2}
                      value={assessorNotes}
                      onChange={(e) => setAssessorNotes(e.target.value)}
                      placeholder="Ringkasan catatan wawancara untuk hasil GPA peserta..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:border-primary-navy text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>GPA = (Rata-rata BARS ÷ 5) × 4.00</span>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/asesor/rekap-lha/${selected.code}`)}
                  >
                    Rekap &amp; Terbitkan LHA →
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={saving}
                    onClick={handleSaveBarsGpa}
                    leftIcon={<Save className="w-3.5 h-3.5" />}
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Penilaian BARS & GPA'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AsesorLayout>
  );
}
