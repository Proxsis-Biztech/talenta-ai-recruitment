import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  FileAudio,
  FileText,
  ShieldAlert,
  Save,
  CheckCircle2,
  ChevronRight,
  Search,
  Sparkles,
  Quote,
  AlertTriangle,
  RefreshCw,
  Scale,
  Eye,
  Clock
} from 'lucide-react';
import { Button, Badge, Modal } from '../ui';
import { calculateCompositeScore } from '../../services/asesorScoreService';
import {
  fetchAssessorCandidate,
  fetchAssessorCandidates,
  fetchAssessorScoreByCode,
  fetchRecordingAudioBlobUrl,
  submitAssessorSessionAction,
  type AssessorCandidate
} from '../../services/assessorService';
import { resolveCandidateReviewStage } from '../../services/asesorReviewState';
import { getPortalToken } from '../../services/portalAuthService';

interface RubricItem {
  id: string;
  name: string;
  weight: number;
  score: number;
  notes: string;
  descriptors: Record<number, string>;
}

const INITIAL_RUBRICS: RubricItem[] = [
  {
    id: 'c1',
    name: 'System Architecture & Scalability',
    weight: 30,
    score: 0,
    notes: '',
    descriptors: {
      1: 'Tidak memahami konsep dasar arsitektur terdistribusi.',
      2: 'Mengetahui istilah umum namun kesulitan merancang diagram alur data.',
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
      2: 'Kurang memahami indeks B-Tree dan indexing pitfalls.',
      3: 'Mampu menganalisis slow query dan membuat indexing standar.',
      4: 'Sangat menguasai connection pooling, partitioning, dan locking mitigation.',
      5: 'Mampu merancang database high-throughput tanpa resiko deadlock.'
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
      5: 'Menghasilkan arsitektur algoritma optimal dengan pertimbangan edge cases tinggi.'
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
      5: 'Komunikasi level leadership teknologi yang inspiratif.'
    }
  }
];

export default function AsesorLiveConsole() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const isHiddenObserverMode =
    location.pathname.startsWith('/asesor/observer') ||
    new URLSearchParams(location.search).get('mode') === 'observer';

  const [candidate, setCandidate] = useState<AssessorCandidate | null>(null);
  const [candidateList, setCandidateList] = useState<AssessorCandidate[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(true);
  const [pickerSearch, setPickerSearch] = useState('');

  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [transcriptQuery, setTranscriptQuery] = useState('');

  const [activeCompetency, setActiveCompetency] = useState<string>('c1');
  const [rubrics, setRubrics] = useState<RubricItem[]>(INITIAL_RUBRICS);
  const [aiOverrideReason, setAiOverrideReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [noticeBanner, setNoticeBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [sessionModal, setSessionModal] = useState<{
    action: 'reschedule' | 'resolve_manual' | 'flag_issue';
    title: string;
    description: string;
    placeholder: string;
  } | null>(null);
  const [sessionModalReason, setSessionModalReason] = useState('');
  const [sessionModalError, setSessionModalError] = useState('');

  const loadCandidateDetail = async (targetId: string, options?: { silent?: boolean }) => {
    if (!options?.silent) setCandidateLoading(true);
    try {
      const data = await fetchAssessorCandidate(targetId);
      setCandidate(data);
      if (!data) return;

      if (data.aiOverrideReason) {
        setAiOverrideReason(data.aiOverrideReason);
      } else {
        setAiOverrideReason('');
      }

      let loadedFromSaved = false;
      try {
        const saved = await fetchAssessorScoreByCode(data.code, data.program);
        const rawSavedComps = Array.isArray(saved?.competencies) ? saved.competencies : [];
        if (rawSavedComps.length > 0) {
          loadedFromSaved = true;
          setRubrics(
            INITIAL_RUBRICS.map((item, idx) => {
              const match =
                rawSavedComps.find(
                  (c: any) => String(c?.name || '').toLowerCase() === item.name.toLowerCase()
                ) || rawSavedComps[idx];
              if (!match) return item;
              return {
                ...item,
                score: typeof match.score === 'number' && Number.isFinite(match.score) ? match.score : item.score,
                notes: typeof match.notes === 'string' ? match.notes : item.notes
              };
            })
          );
        }
      } catch {
        // Ignore when no AssessorScore exists yet
      }

      if (!loadedFromSaved) {
        const aiList = Array.isArray(data.aiCompetencies) ? data.aiCompetencies : [];
        if (aiList.length > 0) {
          setRubrics(
            INITIAL_RUBRICS.map((item, idx) => {
              const aiMatch =
                aiList.find(
                  (ai) => String(ai?.name || '').toLowerCase() === item.name.toLowerCase()
                ) || aiList[idx];
              return {
                ...item,
                score: aiMatch && typeof aiMatch.aiScore === 'number' ? aiMatch.aiScore : 0,
                notes: ''
              };
            })
          );
        } else {
          setRubrics(INITIAL_RUBRICS);
        }
      }
    } catch {
      if (!options?.silent) setCandidate(null);
    } finally {
      if (!options?.silent) setCandidateLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setCandidate(null);
      setCandidateLoading(true);
      fetchAssessorCandidates()
        .then((list) => setCandidateList(list))
        .catch(() => setCandidateList([]))
        .finally(() => setCandidateLoading(false));
      return;
    }
    void loadCandidateDetail(id);
  }, [id]);

  useEffect(() => {
    let activeUrl: string | null = null;
    if (!candidate?.audioRecordingId) {
      setAudioBlobUrl(null);
      return;
    }
    setAudioLoading(true);
    fetchRecordingAudioBlobUrl(candidate.audioRecordingId)
      .then((url) => {
        activeUrl = url;
        setAudioBlobUrl(url);
      })
      .catch(() => setAudioBlobUrl(null))
      .finally(() => setAudioLoading(false));

    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [candidate?.audioRecordingId]);

  const handleScoreChange = (rubricId: string, val: number) => {
    setRubrics((prev) =>
      prev.map((r) => (r.id === rubricId ? { ...r, score: val } : r))
    );
  };

  const handleNotesChange = (rubricId: string, text: string) => {
    setRubrics((prev) =>
      prev.map((r) => (r.id === rubricId ? { ...r, notes: text } : r))
    );
  };

  const aiBaselineByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const ai of candidate?.aiCompetencies || []) {
      const key = String(ai?.name || '').toLowerCase();
      if (key && typeof ai?.aiScore === 'number') map.set(key, ai.aiScore);
    }
    return map;
  }, [candidate?.aiCompetencies]);

  const overriddenCompetencies = useMemo(() => {
    const diffs: Array<{ name: string; aiScore: number; newScore: number }> = [];
    for (const r of rubrics) {
      const aiScore = aiBaselineByName.get(r.name.toLowerCase());
      if (aiScore != null && r.score > 0 && r.score !== aiScore) {
        diffs.push({ name: r.name, aiScore, newScore: r.score });
      }
    }
    return diffs;
  }, [rubrics, aiBaselineByName]);

  const handleAdoptAllAiScores = () => {
    if (!candidate?.aiCompetencies?.length) return;
    setRubrics((prev) =>
      prev.map((item, idx) => {
        const ai =
          candidate.aiCompetencies?.find(
            (a) => String(a?.name || '').toLowerCase() === item.name.toLowerCase()
          ) || candidate.aiCompetencies?.[idx];
        return ai && typeof ai.aiScore === 'number' ? { ...item, score: ai.aiScore } : item;
      })
    );
  };

  const handleAdoptSingleAiScore = (rubricName: string, aiScore: number) => {
    setRubrics((prev) =>
      prev.map((r) => (r.name === rubricName ? { ...r, score: aiScore } : r))
    );
  };

  const hasScoredAny = rubrics.some((r) => r.score > 0);
  const totalWeightedScore = rubrics.reduce((acc, r) => {
    return acc + (r.score > 0 ? (r.score / 5) * r.weight : 0);
  }, 0);

  const currentRubric = rubrics.find((r) => r.id === activeCompetency) || rubrics[0];
  const currentAiEvidence = useMemo(() => {
    const list = candidate?.aiCompetencies || [];
    const idx = rubrics.findIndex((r) => r.id === currentRubric.id);
    return (
      list.find((a) => String(a?.name || '').toLowerCase() === currentRubric.name.toLowerCase()) ||
      list[idx] ||
      null
    );
  }, [candidate?.aiCompetencies, currentRubric, rubrics]);

  const transcriptSegments = useMemo(() => {
    const segs = Array.isArray(candidate?.transcriptSegments) ? candidate.transcriptSegments : [];
    const q = transcriptQuery.trim().toLowerCase();
    if (!q) return segs;
    return segs.filter(
      (s) =>
        String(s?.text || '').toLowerCase().includes(q) ||
        String(s?.speaker || '').toLowerCase().includes(q) ||
        String(s?.timestamp || '').toLowerCase().includes(q)
    );
  }, [candidate?.transcriptSegments, transcriptQuery]);

  const saveReview = async (finalizeAndRedirect: boolean) => {
    if (!candidate) return;
    setNoticeBanner(null);
    if (!hasScoredAny) {
      setNoticeBanner({
        type: 'error',
        message: 'Silakan berikan minimal satu nilai rubrik (skala 1–5) terlebih dahulu.'
      });
      return;
    }
    if (overriddenCompetencies.length > 0 && aiOverrideReason.trim().length < 5) {
      setNoticeBanner({
        type: 'error',
        message: 'Anda mengubah skor rekomendasi Ava AI. Wajib mengisi Alasan Perubahan Skor AI minimal 5 karakter untuk pencatatan Log Audit.'
      });
      return;
    }

    setSaving(true);
    try {
      const token = getPortalToken();
      if (!token) throw new Error('Sesi asesor tidak ditemukan.');
      const interviewScore = Math.round(totalWeightedScore * 10) / 10;
      const compositeScoreValue = calculateCompositeScore(candidate.catScore ?? 0, interviewScore);
      await axios.post(
        '/api/asesor/scores',
        {
          candidateCode: candidate.code,
          candidateName: candidate.name,
          programTitle: candidate.program,
          programCode: candidate.programCode,
          competencies: rubrics.map((rubric) => ({
            name: rubric.name,
            weight: rubric.weight,
            score: rubric.score,
            notes: rubric.notes
          })),
          interviewScore,
          compositeScore: compositeScoreValue,
          recommendation:
            compositeScoreValue >= 80
              ? 'LANJUT'
              : compositeScoreValue >= 60
                ? 'DIPERTIMBANGKAN'
                : 'TIDAK',
          status: 'draft',
          finalized: finalizeAndRedirect,
          aiOverrideReason: overriddenCompetencies.length > 0 ? aiOverrideReason.trim() : aiOverrideReason.trim() || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (finalizeAndRedirect) {
        navigate(`/asesor/scoring/${candidate.code}`);
      } else {
        await loadCandidateDetail(candidate.code, { silent: true });
        setNoticeBanner({
          type: 'success',
          message: 'Review dan catatan skor berhasil disimpan (status: Direview).'
        });
      }
    } catch (error) {
      setNoticeBanner({
        type: 'error',
        message: axios.isAxiosError(error)
          ? error.response?.data?.error || 'Gagal menyimpan hasil review.'
          : 'Gagal menyimpan hasil review.'
      });
    } finally {
      setSaving(false);
    }
  };

  const openSessionActionModal = (action: 'reschedule' | 'resolve_manual' | 'flag_issue') => {
    const configMap = {
      reschedule: {
        action: 'reschedule' as const,
        title: 'Jadwalkan Ulang Wawancara Ava AI',
        description: 'Sesi kandidat akan dikembalikan ke antrean terjadwal agar peserta dapat mengulang wawancara AI.',
        placeholder: 'Contoh: Mikrofon peserta tidak terdeteksi selama sesi wawancara...'
      },
      resolve_manual: {
        action: 'resolve_manual' as const,
        title: 'Putuskan Manual & Lanjut Review',
        description: 'Status "Perlu Tindakan" akan diselesaikan secara manual oleh asesor agar proses review dan penilaian BARS dapat dilanjutkan.',
        placeholder: 'Contoh: Jawaban teks dan hasil CAT sudah memadai untuk dilanjutkan ke tahap review...'
      },
      flag_issue: {
        action: 'flag_issue' as const,
        title: 'Tandai Sesi Perlu Tindakan',
        description: 'Masukkan keterangan kendala teknis atau anomali integritas pada sesi wawancara ini.',
        placeholder: 'Contoh: Audio terputus di tengah jawaban soal #2...'
      }
    };
    setSessionModal(configMap[action]);
    setSessionModalReason('');
    setSessionModalError('');
  };

  const handleConfirmSessionAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate || !sessionModal) return;
    const trimmed = sessionModalReason.trim();
    if (trimmed.length < 5) {
      setSessionModalError('Catatan/alasan minimal 5 karakter.');
      return;
    }

    const actionType = sessionModal.action;
    setActionBusy(true);
    setSessionModalError('');
    try {
      await submitAssessorSessionAction(candidate.code, { action: actionType, reason: trimmed });
      setSessionModal(null);
      setSessionModalReason('');
      if (actionType === 'reschedule') {
        navigate('/asesor/interview-queue');
        return;
      }
      await loadCandidateDetail(candidate.code, { silent: true });
      setNoticeBanner({
        type: 'success',
        message:
          actionType === 'resolve_manual'
            ? 'Status "Perlu Tindakan" berhasil diselesaikan secara manual. Anda dapat melanjutkan review BARS.'
            : 'Sesi berhasil ditandai masuk antrean Perlu Tindakan.'
      });
    } catch (err: any) {
      setSessionModalError(err?.response?.data?.error || 'Gagal memproses tindakan sesi.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleSessionAction = (
    action: 'reschedule' | 'resolve_manual' | 'flag_issue' | 'toggle_calibration'
  ) => {
    if (!candidate) return;
    if (action === 'toggle_calibration') {
      setActionBusy(true);
      submitAssessorSessionAction(candidate.code, { action, reason: '' })
        .then(() => loadCandidateDetail(candidate.code, { silent: true }))
        .catch((err: any) =>
          setNoticeBanner({
            type: 'error',
            message: err?.response?.data?.error || 'Gagal memperbarui status kalibrasi.'
          })
        )
        .finally(() => setActionBusy(false));
      return;
    }
    openSessionActionModal(action);
  };

  if (candidateLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center text-sm">
        Memuat Review Console &amp; data wawancara AI...
      </div>
    );
  }

  if (!id) {
    const q = pickerSearch.trim().toLowerCase();
    const sorted = [...candidateList]
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.program.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          resolveCandidateReviewStage(a).sortOrder - resolveCandidateReviewStage(b).sortOrder
      );

    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 sm:p-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h1 className="font-heading text-xl font-extrabold">
                Review Console Wawancara Ava AI
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Pilih sesi kandidat untuk memutar rekaman audio, memeriksa transkrip, bukti kutipan skor AI, dan mengisi rubrik BARS.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/asesor/interview-queue')}
                className="border-slate-700 text-slate-200 hover:bg-slate-900"
              >
                Buka Antrean Review
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/asesor/dashboard')}
                className="border-slate-700 text-slate-200 hover:bg-slate-900"
              >
                Dashboard
              </Button>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Cari nama, kode kandidat, atau program..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 outline-none"
            />
          </div>

          {sorted.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400">
              Belum ada kandidat pada tenant PT ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sorted.map((item) => {
                const st = resolveCandidateReviewStage(item);
                return (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-blue-400 font-bold">
                          {item.code}
                        </span>
                        <Badge variant={st.badgeVariant} format="soft">
                          {st.label}
                        </Badge>
                        {item.isCalibrationSample && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-semibold">
                            Sampel Kalibrasi
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-sm text-white mt-1.5 truncate">{item.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{item.program}</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        CAT: {item.catScore != null ? `${item.catScore}/100` : '-'} • Skor AI:{' '}
                        {item.interviewScore != null ? `${item.interviewScore}/100` : '-'}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/asesor/review-console/${item.code}`)}
                      className="shrink-0"
                    >
                      Buka Review
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-sm font-semibold">Kandidat tidak ditemukan atau berada di tenant PT lain.</p>
        <Button variant="primary" size="sm" onClick={() => navigate('/asesor/interview-queue')}>
          Kembali ke Antrean Review
        </Button>
      </div>
    );
  }

  const stageMeta = resolveCandidateReviewStage(candidate);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {isHiddenObserverMode && (
        <div className="bg-purple-950/90 border-b border-purple-800 px-6 py-2 text-xs text-purple-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-purple-300" />
            <span>
              <strong>Mode Observer Kalibrasi (Tersembunyi):</strong> Pemantauan acak konsistensi skor Ava AI &amp; panel penilai.
            </span>
          </div>
          <span className="font-mono text-[11px] text-purple-300">{candidate.code}</span>
        </div>
      )}

      {/* ─── Topbar Review Console ─── */}
      <header className="min-h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold font-heading shrink-0">
            {candidate.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight truncate">
                Review Console: {candidate.name} ({candidate.code})
              </h1>
              <Badge variant={stageMeta.badgeVariant} format="soft">
                {stageMeta.label}
              </Badge>
              {candidate.isCalibrationSample && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950 text-purple-200 border border-purple-700 text-[10px] font-bold">
                  <Scale className="w-3 h-3" />
                  Sampel Kalibrasi
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {candidate.program} • {candidate.company} • CAT:{' '}
              {candidate.catScore != null ? `${candidate.catScore}/100` : '-'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => handleSessionAction('flag_issue')}
            className="px-3 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Tandai Perlu Tindakan</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => saveReview(false)}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Draft Review'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/asesor/interview-queue')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Antrean Review
          </button>
        </div>
      </header>

      {/* ─── Main Console Grid: Audio & Transcript Evidence (Left) + AI & BARS Rubric (Right) ─── */}
      {noticeBanner && (
        <div
          className={`mx-4 sm:mx-6 mt-4 px-4 py-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            noticeBanner.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700 text-emerald-100'
              : noticeBanner.type === 'error'
                ? 'bg-rose-950/90 border-rose-700 text-rose-100'
                : 'bg-slate-900 border-slate-700 text-slate-200'
          }`}
        >
          <span>{noticeBanner.message}</span>
          <button
            type="button"
            onClick={() => setNoticeBanner(null)}
            className="text-xs font-bold underline shrink-0 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 sm:p-6 overflow-hidden">
        {/* ─── Left Column (6 cols): Audio Player + Timestamped Transcript + Issue Controls ─── */}
        <div className="lg:col-span-6 flex flex-col gap-4 bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-5 overflow-hidden">
          {candidate.needsAction && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-rose-200">Sesi Masuk Antrean "Perlu Tindakan"</p>
                  <p className="text-rose-300 mt-0.5">
                    {candidate.actionReason || 'Terdeteksi kendala teknis atau anomali integritas pada sesi ini.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => handleSessionAction('reschedule')}
                  className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Jadwalkan Ulang AI</span>
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => handleSessionAction('resolve_manual')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Putuskan Manual &amp; Lanjut Review</span>
                </button>
              </div>
            </div>
          )}

          {/* Audio Player Box */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <FileAudio className="w-4 h-4 text-blue-400" />
                <span>Rekaman Audio Wawancara Ava AI</span>
              </div>
              {candidate.interviewDurationSec != null && (
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.floor(candidate.interviewDurationSec / 60)}m{' '}
                  {String(candidate.interviewDurationSec % 60).padStart(2, '0')}s
                </span>
              )}
            </div>

            {audioLoading ? (
              <p className="text-xs text-slate-400">Memuat berkas audio rekaman...</p>
            ) : audioBlobUrl ? (
              <audio controls src={audioBlobUrl} className="w-full h-10" />
            ) : (
              <p className="text-xs text-slate-400">
                Rekaman audio belum tersedia untuk sesi ini (gunakan transkrip dan bukti kutipan di bawah untuk review).
              </p>
            )}
          </div>

          {/* Timestamped Transcript */}
          <div className="flex-1 flex flex-col min-h-[320px] bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Transkrip Lengkap dengan Penanda Waktu</span>
                <span className="text-[10px] font-mono text-slate-400">
                  ({transcriptSegments.length} baris)
                </span>
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={transcriptQuery}
                  onChange={(e) => setTranscriptQuery(e.target.value)}
                  placeholder="Cari di transkrip..."
                  className="w-full pl-8 pr-2.5 py-1 text-[11px] rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 max-h-[460px]">
              {transcriptSegments.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  {candidate.transcriptText
                    ? 'Tidak ada baris transkrip yang cocok dengan pencarian.'
                    : 'Belum ada transkrip wawancara AI untuk kandidat ini.'}
                </div>
              ) : (
                transcriptSegments.map((seg, idx) => (
                  <div
                    key={`${seg.timestamp}-${idx}`}
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      seg.speaker === 'Ava AI'
                        ? 'bg-slate-900/90 border-slate-800 text-slate-200'
                        : seg.speaker === 'Kandidat'
                          ? 'bg-blue-950/35 border-blue-900/60 text-slate-100'
                          : 'bg-slate-900/50 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-blue-300">
                        {seg.timestamp}
                      </span>
                      <span
                        className={`text-[11px] font-bold ${
                          seg.speaker === 'Ava AI'
                            ? 'text-teal-300'
                            : seg.speaker === 'Kandidat'
                              ? 'text-blue-300'
                              : 'text-slate-400'
                        }`}
                      >
                        {seg.speaker}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{seg.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ─── Right Column (6 cols): AI Score Evidence + BARS Review + Override Audit ─── */}
        <div className="lg:col-span-6 bg-white text-ink rounded-2xl border border-border-slate flex flex-col overflow-hidden shadow-xs">
          {/* Header Rubrik */}
          <div className="p-5 border-b border-border-slate flex flex-wrap items-center justify-between gap-3 bg-slate-50">
              <div>
                <h2 className="font-heading font-bold text-base text-ink">
                  Skor Ava AI &amp; Rubrik Penilaian Asesor (BARS 1–5)
                </h2>
                <p className="text-xs text-muted-slate mt-0.5">
                  Setujui rekomendasi skor AI atau sesuaikan nilai dengan alasan wajib untuk Log Audit.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {(candidate.aiCompetencies?.length || 0) > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handleAdoptAllAiScores}
                    leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
                  >
                    Setujui Semua Skor AI
                  </Button>
                )}
                <div className="text-right">
                  <span className="text-[10px] text-muted-slate uppercase font-semibold block">
                    Skor Review:
                  </span>
                  <p className="font-heading tabular-nums text-lg sm:text-xl font-bold text-primary-navy">
                    {hasScoredAny ? `${totalWeightedScore.toFixed(1)} / 100` : 'Belum Dinilai'}
                  </p>
                </div>
              </div>
          </div>

          {/* Competency Tabs */}
          <div className="flex border-b border-border-slate bg-slate-100 overflow-x-auto p-1 gap-1">
            {rubrics.map((r) => {
              const aiVal = aiBaselineByName.get(r.name.toLowerCase());
              const isChanged = aiVal != null && r.score > 0 && r.score !== aiVal;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveCompetency(r.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeCompetency === r.id
                      ? 'bg-white text-primary-navy shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{r.name.split(' ')[0]}</span>
                  <span className="ml-1 text-[10px] font-mono text-slate-500">
                    ({r.score > 0 ? `${r.score}/5` : '-/5'})
                  </span>
                  {isChanged && (
                    <span className="ml-1 text-[9px] px-1 rounded bg-amber-100 text-amber-800">
                      Ubah
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Rubric Form + AI Quote Evidence */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5 max-h-[560px]">
            {currentAiEvidence && (
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Rekomendasi Ava AI: {currentAiEvidence.aiScore} / 5</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleAdoptSingleAiScore(currentRubric.name, currentAiEvidence.aiScore)
                    }
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-bold cursor-pointer"
                  >
                    Setujui Skor AI ({currentAiEvidence.aiScore}/5)
                  </button>
                </div>
                <p className="text-xs text-indigo-900">{currentAiEvidence.rationale}</p>
                <div className="p-2.5 rounded-lg bg-white/90 border border-indigo-100 text-[11px] text-slate-700 flex items-start gap-2">
                  <Quote className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono text-[10px] text-indigo-600 font-bold mr-1.5">
                      [{currentAiEvidence.timestamp}]
                    </span>
                    <span className="italic">"{currentAiEvidence.quote}"</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="font-heading font-bold text-sm sm:text-base text-ink">
                  {currentRubric.name}
                </h3>
                <span className="text-xs font-mono font-semibold text-primary-navy bg-soft-blue px-2 py-0.5 rounded">
                  Bobot: {currentRubric.weight}%
                </span>
              </div>
              <p className="text-xs text-muted-slate">
                Pilih skala BARS 1–5 sesuai bukti audio &amp; kutipan transkrip:
              </p>
            </div>

            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((val) => {
                const isSelected = currentRubric.score === val;
                const isAiChoice = currentAiEvidence?.aiScore === val;
                return (
                  <div
                    key={val}
                    onClick={() => handleScoreChange(currentRubric.id, val)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'border-primary-navy bg-soft-blue text-primary-navy ring-1 ring-primary-navy shadow-xs'
                        : 'border-border-slate hover:bg-slate-50 text-ink'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-primary-navy text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {val}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
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
                        {isAiChoice && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            Pilihan AI
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-slate mt-0.5 leading-relaxed">
                        {currentRubric.descriptors[val]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                Catatan Asesor untuk {currentRubric.name}:
              </label>
              <textarea
                rows={2}
                value={currentRubric.notes}
                onChange={(e) => handleNotesChange(currentRubric.id, e.target.value)}
                placeholder="Tuliskan observasi atau klarifikasi jawaban kandidat..."
                className="w-full p-2.5 rounded-xl border border-border-slate focus:border-primary-navy text-xs outline-none leading-relaxed"
              />
            </div>

            {overriddenCompetencies.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
                <label className="block text-xs font-bold text-amber-950">
                  Alasan Perubahan Skor AI * (Wajib — Tercatat di Log Audit)
                </label>
                <p className="text-[11px] text-amber-800">
                  Perubahan terdeteksi:{' '}
                  {overriddenCompetencies
                    .map((d) => `${d.name} (AI ${d.aiScore}/5 → ${d.newScore}/5)`)
                    .join(', ')}
                </p>
                <textarea
                  rows={2}
                  required
                  value={aiOverrideReason}
                  onChange={(e) => setAiOverrideReason(e.target.value)}
                  placeholder="Jelaskan dasar objektif penyesuaian skor AI (minimal 5 karakter)..."
                  className="w-full p-2.5 rounded-lg border border-amber-300 bg-white focus:border-amber-600 text-xs outline-none"
                />
              </div>
            )}
          </div>

          {/* Footer Save / Finalize */}
          <div className="p-4 border-t border-border-slate bg-slate-50 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-muted-slate">
              {overriddenCompetencies.length > 0
                ? 'Perubahan skor AI akan dicatat otomatis ke Log Audit.'
                : 'Finalisasi untuk lanjut ke Preview LHA & E-Sign.'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => saveReview(false)}
                disabled={saving}
                className="text-xs"
              >
                Simpan Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => saveReview(true)}
                disabled={saving}
                className="text-xs flex items-center gap-1.5"
              >
                <span>{saving ? 'Memproses...' : 'Finalisasi ke Penilaian & LHA'}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Aksi Sesi Non-Blocking */}
      <Modal
        isOpen={Boolean(sessionModal)}
        onClose={() => {
          if (!actionBusy) setSessionModal(null);
        }}
        title={sessionModal?.title || 'Tindakan Sesi'}
        size="md"
      >
        {sessionModal && (
          <form onSubmit={handleConfirmSessionAction} className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">{sessionModal.description}</p>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Catatan / Alasan *
              </label>
              <textarea
                rows={3}
                value={sessionModalReason}
                onChange={(e) => {
                  setSessionModalReason(e.target.value);
                  if (sessionModalError) setSessionModalError('');
                }}
                placeholder={sessionModal.placeholder}
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary-navy text-xs text-ink outline-none"
                autoFocus
              />
              {sessionModalError && (
                <p className="text-xs text-rose-600 mt-1">{sessionModalError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={actionBusy}
                onClick={() => setSessionModal(null)}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={actionBusy}>
                {actionBusy ? 'Menyimpan...' : 'Konfirmasi & Simpan'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
