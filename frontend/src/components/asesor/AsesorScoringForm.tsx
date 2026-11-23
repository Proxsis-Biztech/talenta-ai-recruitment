import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Save,
  ArrowRight,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowLeft,
  FileText,
  QrCode,
  Check,
  Download,
  Sliders,
  RotateCcw,
  Scale
} from 'lucide-react';
import { AsesorLayout } from './AsesorLayout';
import { Button, Badge, Card, CardHeader, CardTitle, CardDescription, CardContent, Modal } from '../ui';
import axios from 'axios';
import {
  calculateCompositeScore,
  formatToday,
  ASSESSOR_NAME,
  ASSESSOR_TITLE
} from '../../services/asesorScoreService';
import {
  fetchAssessorCandidate,
  fetchAssessorCandidates,
  type AssessorCandidate
} from '../../services/assessorService';
import { getActiveSessionUser } from '../../services/userRegistryService';
import { getPortalToken } from '../../services/portalAuthService';
import AsesorGovernancePanels from './AsesorGovernancePanels';

interface CompetencyItem {
  id: string;
  name: string;
  weight: number;
  score: number; // 1.0 - 5.0
  notes: string;
}

const DEFAULT_7_COMPETENCIES: CompetencyItem[] = [
  { id: 'c1', name: 'Analytical Thinking', weight: 20, score: 0, notes: '' },
  { id: 'c2', name: 'Problem Solving', weight: 20, score: 0, notes: '' },
  { id: 'c3', name: 'Decision Making', weight: 15, score: 0, notes: '' },
  { id: 'c4', name: 'Planning & Organizing', weight: 15, score: 0, notes: '' },
  { id: 'c5', name: 'Cost Consciousness', weight: 10, score: 0, notes: '' },
  { id: 'c6', name: 'Customer Focus', weight: 10, score: 0, notes: '' },
  { id: 'c7', name: 'Strategic Agility', weight: 10, score: 0, notes: '' }
];

export default function AsesorScoringForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [candidate, setCandidate] = useState<AssessorCandidate | null>(null);
  const [candidateList, setCandidateList] = useState<AssessorCandidate[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(true);
  const activeAssessor = getActiveSessionUser();

  const [liveConsoleNotes, setLiveConsoleNotes] = useState<Array<{ name: string; score: number; notes: string }>>([]);

  const hydrateCompetenciesFromSaved = (rawList: any[]) => {
    if (!Array.isArray(rawList) || rawList.length === 0) return;
    const isBars7Format =
      rawList.length >= 6 ||
      rawList.some((item) =>
        DEFAULT_7_COMPETENCIES.some((def) => def.name.toLowerCase() === String(item?.name || '').toLowerCase())
      );

    if (isBars7Format) {
      setLiveConsoleNotes([]);
      setCompetencies(
        DEFAULT_7_COMPETENCIES.map((def, index) => {
          const matched =
            rawList.find(
              (item) => String(item?.name || '').toLowerCase() === def.name.toLowerCase()
            ) || rawList[index];
          return {
            id: def.id,
            name: matched?.name || def.name,
            weight: typeof matched?.weight === 'number' ? matched.weight : def.weight,
            score: typeof matched?.score === 'number' ? matched.score : def.score,
            notes: String(matched?.notes ?? matched?.note ?? matched?.evidenceNotes ?? '')
          };
        })
      );
    } else {
      // Saved from Live Console (4 live competencies) -> keep all 7 BARS indicators and map overlapping notes/average
      const validScores = rawList.filter((item) => typeof item?.score === 'number' && item.score > 0);
      const avgLiveScore =
        validScores.length > 0
          ? parseFloat(
              (
                validScores.reduce((sum, item) => sum + Number(item.score || 0), 0) /
                validScores.length
              ).toFixed(1)
            )
          : 0;
      setLiveConsoleNotes(
        rawList.map((item) => ({
          name: String(item?.name || 'Kompetensi Live'),
          score: Number(item?.score || 0),
          notes: String(item?.notes ?? item?.note ?? '')
        }))
      );
      setCompetencies(
        DEFAULT_7_COMPETENCIES.map((def) => {
          const direct = rawList.find((item) =>
            String(item?.name || '').toLowerCase().includes(def.name.toLowerCase()) ||
            def.name.toLowerCase().includes(String(item?.name || '').toLowerCase().split(' ')[0])
          );
          return {
            ...def,
            score:
              typeof direct?.score === 'number' && direct.score > 0
                ? direct.score
                : avgLiveScore > 0
                  ? avgLiveScore
                  : def.score,
            notes: String(direct?.notes ?? direct?.note ?? '')
          };
        })
      );
    }
  };

  useEffect(() => {
    let cancelled = false;
    setCandidateLoading(true);
    setCompetencies(DEFAULT_7_COMPETENCIES);
    setLiveConsoleNotes([]);
    setFactSheetMatched(false);
    setAiError('');
    if (!id) {
      setCandidate(null);
      fetchAssessorCandidates()
        .then((list) => {
          if (!cancelled) setCandidateList(list);
        })
        .catch(() => {
          if (!cancelled) setCandidateList([]);
        })
        .finally(() => {
          if (!cancelled) setCandidateLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    fetchAssessorCandidate(id)
      .then((data) => {
        if (cancelled) return;
        setCandidate(data);
        if (data) {
          if (Array.isArray(data.competencies) && data.competencies.length > 0) {
            hydrateCompetenciesFromSaved(data.competencies);
          }
          if (data.lhaStatus === 'signed') {
            setIsSigned(true);
            setLhaNumber(data.lhaNumber || '');
            setLhaHash(data.lhaHash || '');
            setSaveMessage(
              `LHA sudah ditandatangani & diterbitkan (${data.lhaNumber || 'CERTIFIED'}). Penilaian terkunci.`
            );
          } else {
            setIsSigned(false);
            setLhaNumber(data.lhaNumber || '');
            setLhaHash(data.lhaHash || '');
            setSaveMessage('');
          }
          if (
            data.recommendation === 'LANJUT' ||
            data.recommendation === 'DIPERTIMBANGKAN' ||
            data.recommendation === 'TIDAK'
          ) {
            setRecommendation(data.recommendation);
          } else {
            setRecommendation('LANJUT');
          }
          if (data.assessorNotes) setAssessorNotes(data.assessorNotes);
          if (data.assessorName) setAssessorName(data.assessorName);
        }
      })
      .catch(() => {
        if (!cancelled) setCandidate(null);
      })
      .finally(() => {
        if (!cancelled) setCandidateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Mode: In-Basket Fact Sheet Simulation vs Interview
  const [assessmentType, setAssessmentType] = useState<'inbasket' | 'interview'>('inbasket');

  // Competencies State
  const [competencies, setCompetencies] = useState<CompetencyItem[]>(DEFAULT_7_COMPETENCIES);

  // Optional assessor field notes (no hardcoded dummy candidate submission)
  const [writtenAnswers, setWrittenAnswers] = useState({
    problemIdentification: '',
    priorityMatrix: '',
    solutionStrategy: '',
    costEfficiency: ''
  });

  // AI Fact Sheet Engine State
  const [isMatchingLoading, setIsMatchingLoading] = useState(false);
  const [factSheetMatched, setFactSheetMatched] = useState(false);
  const [aiError, setAiError] = useState('');
  const [priorityAccuracy, setPriorityAccuracy] = useState<number>(0);
  const [behavioralEvidence, setBehavioralEvidence] = useState<string>(
    'Belum ada analisis. Jalankan AI Fact Sheet Matching untuk menghasilkan draf justifikasi naratif bukti perilaku.'
  );

  // Recommendations & E-Sign
  const [recommendation, setRecommendation] = useState<'LANJUT' | 'DIPERTIMBANGKAN' | 'TIDAK'>('LANJUT');
  const [assessorNotes, setAssessorNotes] = useState<string>('');
  const [isSigned, setIsSigned] = useState<boolean>(false);
  const [assessorName, setAssessorName] = useState<string>(activeAssessor.name || ASSESSOR_NAME);
  const [assessorTitle, setAssessorTitle] = useState<string>(activeAssessor.specialization || ASSESSOR_TITLE);
  const [lhaHash, setLhaHash] = useState<string>('');
  const [lhaNumber, setLhaNumber] = useState<string>('');

  // LHA Preview Modal
  const [lhaModalOpen, setLhaModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadScore = async () => {
      if (!candidate) return;
      const token = getPortalToken();
      if (!token) return;
      try {
        const response = await axios.get(`/api/asesor/scores/${candidate!.code}`, {
          params: { programTitle: candidate!.program },
          headers: { Authorization: `Bearer ${token}` }
        });
        if (cancelled || !response.data?.data) return;
        const record = response.data.data;
        if (Array.isArray(record.competencies) && record.competencies.length > 0) {
          hydrateCompetenciesFromSaved(record.competencies);
        }
        setRecommendation(record.recommendation);
        setAssessorNotes(record.notes || '');
        setIsSigned(record.status === 'signed');
        setLhaHash(record.lhaHash || '');
        setLhaNumber(record.lhaNumber || '');
        setSaveMessage(
          record.status === 'signed'
            ? `LHA sudah ditandatangani & diterbitkan (${record.lhaNumber || 'CERTIFIED'}). Penilaian terkunci.`
            : 'Draft penilaian tersimpan di server.'
        );
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          // If candidate already has a recorded interview score (e.g. from Live Interview/seed),
          // seed an editable BARS baseline from that score so assessors can review & finalize smoothly.
          if (candidate.interviewScore != null && candidate.interviewScore > 0) {
            const convertedScale = Math.min(
              5,
              Math.max(1, parseFloat((candidate.interviewScore / 20).toFixed(1)))
            );
            setCompetencies((prev) =>
              prev.map((c) => ({ ...c, score: convertedScale }))
            );
            setSaveMessage(
              `Nilai awal (${candidate.interviewScore}/100 ≈ ${convertedScale.toFixed(1)}/5.0) dimuat dari catatan wawancara. Tinjau indikator BARS lalu simpan/terbitkan LHA.`
            );
          }
          return;
        }
        setSaveMessage('Gagal memuat penilaian tersimpan.');
      }
    };
    void loadScore();
    return () => {
      cancelled = true;
    };
  }, [candidate?.code, candidate?.program]);

  // Calculate Weighted Score (1 - 5 Scale, 0 = belum dinilai)
  const hasAnyCompetencyScore = competencies.some((c) => c.score > 0);
  const allCompetenciesScored = competencies.every((c) => c.score >= 1);
  const hasCompletedCat = Boolean(
    candidate &&
      (candidate.examStatus === 'submitted' ||
        candidate.examStatus === 'graded' ||
        candidate.catScore != null)
  );
  const canFinalize = Boolean(candidate && !isSigned && hasCompletedCat && allCompetenciesScored);
  const weightedOverallScore = competencies
    .reduce((acc, curr) => acc + (curr.score * curr.weight) / 100, 0)
    .toFixed(2);

  // Run AI Fact Sheet Matching against the assessor endpoint using real essay data
  const handleTriggerAiMatch = async () => {
    if (isSigned) {
      setAiError('LHA sudah final dan terkunci. Tidak dapat mengubah draf rubrik.');
      return;
    }
    const realEssays = candidate?.essayAnswers || [];
    const hasManualNotes = Object.values(writtenAnswers).some((val) => val.trim().length > 0);
    if (realEssays.length === 0 && !hasManualNotes) {
      setAiError('Belum ada jawaban esai CAT atau catatan kasus kandidat yang tersedia untuk dianalisis.');
      return;
    }

    const token = getPortalToken();
    if (!token) {
      setAiError('Sesi asesor tidak ditemukan. Silakan masuk kembali.');
      return;
    }

    const combinedEssayText = realEssays
      .map((item) => `[Soal #${item.orderNo}] ${item.prompt}\nJawaban: ${item.answer}`)
      .join('\n\n');

    setIsMatchingLoading(true);
    setAiError('');
    try {
      const res = await axios.post(
        '/api/asesor/ai/fact-sheet-match',
        {
          submission: {
            candidateName: candidate!.name,
            programTitle: `${candidate!.program} (${candidate!.company})`,
            caseStudyTitle: candidate!.program,
            problemIdentification:
              writtenAnswers.problemIdentification.trim() ||
              combinedEssayText ||
              '-',
            priorityMatrix: writtenAnswers.priorityMatrix.trim() || '-',
            solutionStrategy: writtenAnswers.solutionStrategy.trim() || '-',
            costEfficiency: writtenAnswers.costEfficiency.trim() || '-'
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const result = res.data?.data;
      if (!result) throw new Error('Respons AI tidak lengkap.');

      if (typeof result.priorityAccuracyScore === 'number') {
        setPriorityAccuracy(Math.round(result.priorityAccuracyScore));
      }
      if (result.behavioralEvidence) setBehavioralEvidence(result.behavioralEvidence);

      if (Array.isArray(result.competencyScores) && result.competencyScores.length > 0) {
        setCompetencies((prev) =>
          prev.map((c) => {
            const match = result.competencyScores.find(
              (s: { competency?: string }) =>
                (s.competency || '').toLowerCase().includes(c.name.toLowerCase()) ||
                c.name.toLowerCase().includes((s.competency || '').toLowerCase())
            );
            if (!match || typeof match.score !== 'number') return c;
            const clamped = Math.min(5, Math.max(1, match.score));
            return {
              ...c,
              score: Math.round(clamped * 10) / 10,
              notes: match.evidenceNotes || c.notes
            };
          })
        );
      }

      if (typeof result.recommendation === 'string') {
        const rec = result.recommendation.toLowerCase();
        if (rec.includes('tidak')) setRecommendation('TIDAK');
        else if (rec.includes('dipertimbang')) setRecommendation('DIPERTIMBANGKAN');
        else if (rec.includes('lanjut')) setRecommendation('LANJUT');
      }

      setFactSheetMatched(true);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : err instanceof Error
          ? err.message
          : 'Gagal menjalankan AI Fact Sheet Matching';
      setAiError(typeof msg === 'string' ? msg : 'Gagal menjalankan AI Fact Sheet Matching');
      setFactSheetMatched(false);
    } finally {
      setIsMatchingLoading(false);
    }
  };

  const handleUpdateScore = (compId: string, delta: number) => {
    if (isSigned) return;
    setCompetencies((prev) =>
      prev.map((c) => {
        if (c.id !== compId) return c;
        const base = c.score <= 0 ? (delta > 0 ? 3.0 : 1.0) : c.score + delta;
        return { ...c, score: Math.min(5, Math.max(1, parseFloat(base.toFixed(1)))) };
      })
    );
  };

  const persistScore = async (status: 'draft' | 'signed') => {
    const token = getPortalToken();
    if (!token) {
      throw new Error('Sesi asesor tidak ditemukan. Silakan masuk kembali.');
    }
    const interviewScore = Math.round(Number(weightedOverallScore) * 20 * 10) / 10;
    const response = await axios.post(
      '/api/asesor/scores',
      {
        candidateCode: candidate!.code,
        candidateName: candidate!.name,
        programTitle: candidate!.program,
        programCode: candidate!.programCode || undefined,
        competencies: competencies.map((c) => ({
          name: c.name,
          weight: c.weight,
          score: c.score,
          notes: c.notes
        })),
        interviewScore,
        compositeScore: calculateCompositeScore(candidate!.catScore ?? 0, interviewScore),
        recommendation,
        notes: assessorNotes.trim() || undefined,
        status
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (status === 'signed') {
      setLhaHash(response.data.data.lhaHash || '');
      setLhaNumber(response.data.data.lhaNumber || '');
      setIsSigned(true);
    }
    return response.data.data;
  };

  const downloadLhaPdf = async () => {
    const token = getPortalToken() || localStorage.getItem('adminToken');
    if (!token || !candidate?.code) {
      window.alert('LHA belum tersedia.');
      return;
    }
    try {
      const response = await axios.get(`/api/asesor/lha/${encodeURIComponent(candidate.code)}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `LHA-${candidate.code}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      window.alert('LHA bertanda tangan belum tersedia di server.');
    }
  };

  const printLha = () => {
    if (!lhaHash) {
      window.alert('LHA belum ditandatangani. Finalisasi penilaian terlebih dahulu.');
      return;
    }
    const rows = competencies
      .map(
        (c) =>
          `<tr><td>${c.name}</td><td style="text-align:center">${c.weight}%</td><td style="text-align:center">${c.score.toFixed(1)}</td><td>${c.notes.replace(/</g, '&lt;')}</td></tr>`
      )
      .join('');
    const html = `<!doctype html><html lang="id"><head><meta charset="utf-8" /><title>LHA ${candidate!.code}</title>
<style>body{font-family:Georgia,serif;margin:40px;color:#111}h1{font-size:18px;margin:0}table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px;vertical-align:top}th{background:#f1f5f9;text-align:left}.meta{font-size:12px;color:#555}</style>
</head><body>
<h1>SOLUSI ASESMEN INDONESIA</h1>
<p class="meta">Proxsis Talent Force • Assessment Center Enterprise<br/>NO: ${lhaNumber} • STATUS: CERTIFIED FINAL</p>
<hr/>
<p><strong>Nama Kandidat:</strong> ${candidate!.name}<br/>
<strong>ID Kandidat:</strong> ${candidate!.code}<br/>
<strong>Program:</strong> ${candidate!.program} (${candidate!.company})<br/>
<strong>Skor CAT:</strong> ${candidate!.catScore ?? '-'}/100<br/>
<strong>Skor Wawancara:</strong> ${Math.round(Number(weightedOverallScore) * 20 * 10) / 10}/100<br/>
<strong>Skor Komposit:</strong> ${calculateCompositeScore(candidate!.catScore ?? 0, Math.round(Number(weightedOverallScore) * 20 * 10) / 10)}</p>
<h2 style="font-size:14px">Matriks 7 Indikator Perilaku Terstandar</h2>
<table><thead><tr><th>KOMPETENSI</th><th>BOBOT</th><th>SKOR (1-5)</th><th>EVIDENCE CATATAN PERILAKU</th></tr></thead><tbody>${rows}</tbody></table>
<p><strong>Rekomendasi Dewan Asesor:</strong> ${recommendation}<br/>
<strong>Rata-Rata Rubrik BARS (1-5):</strong> ${weightedOverallScore} / 5.0<br/>
<strong>Skor Komposit Akhir (40% CAT + 60% Interview):</strong> ${calculateCompositeScore(candidate!.catScore ?? 0, Math.round(Number(weightedOverallScore) * 20 * 10) / 10)} / 100</p>
<p class="meta">Diverifikasi oleh: ${assessorName} — ${assessorTitle}<br/>Tanggal: ${formatToday()}<br/>Hash SHA-256: ${lhaHash}</p>
<p class="meta">Dokumen ini dihasilkan oleh Right Assessment Center Enterprise.</p>
</body></html>`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.alert('Popup diblokir. Izinkan popup untuk mencetak LHA.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasCompletedCat) {
      setSaveMessage('Kandidat belum menyelesaikan ujian CAT sehingga belum dapat difinalisasi menjadi LHA.');
      return;
    }
    if (!allCompetenciesScored) {
      setSaveMessage('Lengkapi skor untuk seluruh 7 indikator kompetensi (skala 1.0 - 5.0) sebelum menerbitkan LHA.');
      return;
    }
    setIsSubmitting(true);
    setSaveMessage('');
    try {
      await persistScore('signed');
      setSaveMessage(`Penilaian ${candidate!.name} (${candidate!.code}) berhasil ditandatangani dan LHA diterbitkan.`);
      setLhaModalOpen(true);
    } catch (err) {
      console.error('Finalize scoring error:', err);
      setSaveMessage(axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal menyimpan penilaian.' : 'Gagal menyimpan penilaian.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (candidateLoading) {
    return (
      <AsesorLayout activeTab="scoring">
        <div className="p-10 text-center text-sm text-slate-500">Memuat data kandidat...</div>
      </AsesorLayout>
    );
  }

  if (!id) {
    return (
      <AsesorLayout activeTab="scoring">
        <div className="max-w-5xl mx-auto p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-extrabold text-ink">
                Pilih Kandidat untuk Penilaian & LHA E-Sign
              </h1>
              <p className="text-xs text-muted-slate mt-1">
                Daftar kandidat pada tenant Anda. Pilih salah satu untuk membuka lembar BARS dan menerbitkan LHA.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/asesor/interview-queue')}>
              Lihat Antrean Lengkap
            </Button>
          </div>

          {candidateList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-muted-slate">
              Belum ada kandidat pada tenant ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidateList.map((item) => {
                const signed = item.lhaStatus === 'signed';
                const displayComposite =
                  item.compositeScore ??
                  (item.catScore != null && item.interviewScore != null
                    ? calculateCompositeScore(item.catScore, item.interviewScore)
                    : null);
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary-navy">{item.code}</span>
                        <Badge variant={signed ? 'success' : item.interviewStatus === 'completed' ? 'warning' : 'outline'}>
                          {signed ? 'LHA Terbit (Terkunci)' : item.interviewStatus === 'completed' ? 'Siap E-Sign' : item.interviewStatus}
                        </Badge>
                        {item.isTestAccount && (
                          <Badge variant="outline">Akun Uji</Badge>
                        )}
                      </div>
                      <p className="font-bold text-sm text-ink mt-1 truncate">{item.name}</p>
                      <p className="text-xs text-muted-slate truncate">{item.program}</p>
                      <p className="text-[11px] font-mono text-slate-500 mt-1">
                        CAT: {item.catScore ?? '-'} • Komposit: {displayComposite ?? '-'} • {item.lhaNumber || 'Belum Terbit LHA'}
                      </p>
                    </div>
                    <Button
                      variant={signed ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => navigate(`/asesor/scoring/${item.code}`)}
                      className="shrink-0 cursor-pointer"
                    >
                      {signed ? 'Lihat LHA' : 'Nilai'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AsesorLayout>
    );
  }

  if (!candidate) {
    return (
      <AsesorLayout activeTab="scoring">
        <div className="p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-ink">Kandidat tidak ditemukan.</p>
          <Button variant="primary" size="sm" onClick={() => navigate('/asesor/scoring')}>
            Pilih Kandidat Lain
          </Button>
        </div>
      </AsesorLayout>
    );
  }

  return (
    <AsesorLayout activeTab="scoring">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <button
          onClick={() => navigate('/asesor/interview-queue')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Antrean Penilaian</span>
        </button>

        {/* Candidate Identity Ribbon */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 font-bold text-lg flex items-center justify-center font-heading shrink-0 border border-blue-100">
              {candidate!.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 tracking-tight">
                  {candidate!.name}
                </h1>
                <Badge variant="navy" className="text-xs sm:text-sm font-bold">
                  {candidate!.company}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-mono">
                {candidate!.code} • {candidate!.program} (CAT {candidate!.catScore ?? '-'}/100)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center min-w-[115px]">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Rubrik BARS (1-5)</span>
              <p className="font-mono text-xl font-extrabold text-blue-700">
                {hasAnyCompetencyScore ? `${weightedOverallScore} / 5.0` : 'Belum'}
              </p>
            </div>
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-center min-w-[115px]">
              <span className="text-[10px] text-primary-navy uppercase font-bold">Komposit (0-100)</span>
              <p className="font-mono text-xl font-extrabold text-primary-navy">
                {hasAnyCompetencyScore && candidate!.catScore != null
                  ? calculateCompositeScore(
                      candidate!.catScore,
                      Math.round(Number(weightedOverallScore) * 20 * 10) / 10
                    )
                  : '—'}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center min-w-[110px]">
              <span className="text-[10px] text-emerald-800 uppercase font-bold">Akurasi Fakta</span>
              <p className="font-mono text-xl font-extrabold text-emerald-700">
                {factSheetMatched ? `${priorityAccuracy}%` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* AI Fact Sheet Matching Assistant Ribbon (BRD 4.3 & BR-FS-04) */}
        <Card className="bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border-blue-200 shadow-xs">
          <CardHeader className="p-5 border-b border-blue-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  AI Fact Sheet Matching Assistant (Engine Semantik)
                </CardTitle>
                <CardDescription className="text-xs text-slate-600">
                  Mencocokkan respon tertulis kandidat terhadap 5 fakta kunci skenario kasus PT Anjak
                </CardDescription>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              disabled={isMatchingLoading || isSigned}
              onClick={handleTriggerAiMatch}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              {isMatchingLoading ? (
                <span>Menganalisis Jawaban...</span>
              ) : isSigned ? (
                <span>LHA Terkunci</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  <span>Jalankan AI Fact Sheet Matching</span>
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Jawaban Esai Asli Kandidat dari CAT */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Jawaban Esai Asli Kandidat (Hasil Ujian CAT)
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {candidate.essayAnswers?.length || 0} Esai CAT
                </Badge>
              </div>
              {candidate.essayAnswers && candidate.essayAnswers.length > 0 ? (
                <div className="space-y-2.5">
                  {candidate.essayAnswers.map((essay) => (
                    <div
                      key={essay.questionId}
                      className="p-3 bg-white rounded-xl border border-blue-100 space-y-1"
                    >
                      <p className="text-[11px] font-bold text-slate-800">
                        Soal #{essay.orderNo}: {essay.prompt}
                      </p>
                      <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                        {essay.answer || '-'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  Kandidat ini belum mengerjakan atau tidak memiliki jawaban esai CAT pada sistem.
                </div>
              )}
            </div>

            {/* Catatan observasi opsional asesor untuk AI Fact Sheet Matching */}
            <details className="rounded-xl border border-blue-100 bg-white/80 p-3">
              <summary className="text-xs font-bold text-slate-700 cursor-pointer">
                Catatan Kasus Tambahan dari Asesor (Opsional untuk AI Fact Sheet)
              </summary>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3">
                {(
                  [
                    ['problemIdentification', 'Identifikasi Masalah'],
                    ['priorityMatrix', 'Matriks Prioritas'],
                    ['solutionStrategy', 'Strategi Solusi'],
                    ['costEfficiency', 'Efisiensi Biaya']
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">
                      {label}
                    </label>
                    <textarea
                      disabled={isSigned}
                      value={writtenAnswers[key]}
                      onChange={(e) =>
                        setWrittenAnswers((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      placeholder={`Catatan ${label.toLowerCase()} (opsional)...`}
                      rows={3}
                      className="w-full text-xs text-slate-700 bg-white border border-blue-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y disabled:bg-slate-100"
                    />
                  </div>
                ))}
              </div>
            </details>

            {aiError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {aiError}
              </div>
            )}

            {!factSheetMatched && !aiError && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
                AI Fact Sheet Matching belum dijalankan untuk kandidat ini. Analisis hanya menggunakan jawaban esai CAT asli atau catatan kasus yang diisi asesor.
              </div>
            )}

            {factSheetMatched && (
              <>
            <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs text-xs flex items-center justify-between">
              <span className="font-semibold text-slate-700">Skor Akurasi Fakta AI Fact Sheet</span>
              <span className="font-mono font-bold text-emerald-700">{priorityAccuracy}/100</span>
            </div>

            <div className="p-3 bg-white/80 rounded-xl border border-blue-100 text-xs text-slate-700 leading-relaxed font-mono">
              <span className="font-bold text-slate-900 block mb-1 font-sans">
                Draf Justifikasi Naratif Bukti Perilaku (*Auto-Drafting Evidence*):
              </span>
              <p className="text-slate-600 whitespace-pre-line">{behavioralEvidence}</p>
            </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 7 Core Behavioral Competencies Form (BRD 4.2 & 4.3) */}
        <form onSubmit={handleFinalize} className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-heading font-extrabold text-lg sm:text-xl text-slate-900">
                Rubrik {competencies.length} Indikator Perilaku Baku (Skala 1 - 5)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Terapkan diskresi profesional asesor (*Human-in-the-Loop*) untuk menyesuaikan skor draf AI
              </p>
            </div>
            <div className="text-right space-y-1">
              <div>
                <span className="text-xs text-slate-500">Rata-Rata Rubrik BARS (1–5):</span>
                <span className="font-mono text-lg font-bold text-blue-700 ml-2">
                  {hasAnyCompetencyScore ? `${weightedOverallScore} / 5.0` : 'Belum Dinilai'}
                </span>
              </div>
              {hasAnyCompetencyScore && candidate.catScore != null && (
                <div className="text-[11px] font-mono text-slate-600">
                  Skor Komposit (40% CAT + 60% Interview):{' '}
                  <strong className="text-primary-navy">
                    {calculateCompositeScore(
                      candidate.catScore,
                      Math.round(Number(weightedOverallScore) * 20 * 10) / 10
                    )}{' '}
                    / 100
                  </strong>
                </div>
              )}
              {!isSigned && hasCompletedCat && !hasAnyCompetencyScore && (
                <button
                  type="button"
                  onClick={() =>
                    setCompetencies((prev) => prev.map((c) => ({ ...c, score: 3.0 })))
                  }
                  className="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  Isi Skor Dasar (3.0 / Indikator)
                </button>
              )}
            </div>
          </div>

          {liveConsoleNotes.length > 0 && (
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2 text-xs">
              <p className="font-bold text-primary-navy">
                Referensi Catatan Sesi Live Console ({liveConsoleNotes.length} Kompetensi)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {liveConsoleNotes.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-white rounded-lg border border-blue-100">
                    <span className="font-bold text-slate-800">{item.name}</span>{' '}
                    <span className="font-mono text-blue-700 font-bold">({item.score}/5)</span>
                    {item.notes && <p className="text-slate-600 mt-1">{item.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {competencies.map((comp) => (
              <div
                key={comp.id}
                className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3 transition-colors hover:bg-slate-50"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{comp.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Bobot {comp.weight}%
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSigned}
                      onClick={() => handleUpdateScore(comp.id, -0.1)}
                      className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-sm text-blue-700 w-12 text-center bg-white py-1 rounded border border-slate-200">
                      {comp.score > 0 ? comp.score.toFixed(1) : '-'}
                    </span>
                    <button
                      type="button"
                      disabled={isSigned}
                      onClick={() => handleUpdateScore(comp.id, 0.1)}
                      className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Catatan Perilaku:</span>
                  <input
                    type="text"
                    disabled={isSigned}
                    value={comp.notes}
                    onChange={(e) => {
                      const updated = e.target.value;
                      setCompetencies((prev) =>
                        prev.map((c) => (c.id === comp.id ? { ...c, notes: updated } : c))
                      );
                    }}
                    className="w-full text-xs text-slate-700 bg-transparent focus:outline-none disabled:text-slate-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Rekomendasi Akhir & E-Sign Asesor (BR-AS-10) */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-2">
                Rekomendasi Dewan Asesor (Final Judgment):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  disabled={isSigned}
                  onClick={() => setRecommendation('LANJUT')}
                  className={`p-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                    recommendation === 'LANJUT'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Lanjut (Sangat Direkomendasikan)</span>
                </button>

                <button
                  type="button"
                  disabled={isSigned}
                  onClick={() => setRecommendation('DIPERTIMBANGKAN')}
                  className={`p-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                    recommendation === 'DIPERTIMBANGKAN'
                      ? 'bg-amber-50 border-amber-500 text-amber-800 ring-1 ring-amber-500'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>Dipertimbangkan (Dengan Catatan)</span>
                </button>

                <button
                  type="button"
                  disabled={isSigned}
                  onClick={() => setRecommendation('TIDAK')}
                  className={`p-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                    recommendation === 'TIDAK'
                      ? 'bg-red-50 border-red-500 text-red-800 ring-1 ring-red-500'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>Tidak Direkomendasikan</span>
                </button>
              </div>
            </div>

            {/* Assessor Overall Conclusion Notes */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Catatan Kesimpulan Dewan Asesor (Ditampilkan di LHA)
              </label>
              <textarea
                rows={3}
                disabled={isSigned}
                value={assessorNotes}
                onChange={(e) => setAssessorNotes(e.target.value)}
                placeholder="Tuliskan ringkasan kekuatan, area pengembangan, dan pertimbangan rekomendasi asesor..."
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Electronic Digital Signature (E-Sign) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">Pembubuhan Tanda Tangan Digital (E-Sign Asesor)</span>
                {isSigned ? (
                  <Badge variant="success" hasDot>
                    E-Sign Terverifikasi & Tersertifikasi
                  </Badge>
                ) : (
                  <Badge variant="warning">Belum Ditandatangani</Badge>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block">{assessorName}</span>
                  <span className="text-slate-500 text-[11px] font-mono">{assessorTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">{lhaHash ? 'SHA-256 HASH VERIFIED' : 'BELUM DITANDATANGANI'}</span>
                </div>
              </div>
            </div>
          </div>

          {!isSigned && !hasCompletedCat && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
              Prasyarat Finalisasi: Kandidat belum menyelesaikan ujian CAT ({candidate.examStatus}). Tombol terbitkan LHA dikunci hingga ujian CAT diselesaikan.
            </div>
          )}
          {!isSigned && hasCompletedCat && !allCompetenciesScored && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 font-medium">
              Isi skor seluruh 7 indikator kompetensi (minimal 1.0) untuk mengaktifkan finalisasi & penerbitan LHA.
            </div>
          )}
          {/* Submit Action Buttons */}
          {saveMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
              {saveMessage}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate('/asesor/interview-queue')}
            >
              Kembali ke Antrian
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              {isSigned && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => void downloadLhaPdf()}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  <span>Unduh PDF LHA</span>
                </Button>
              )}
              <Button
                variant="outline"
                type="button"
                disabled={isSubmitting || isSigned || !hasAnyCompetencyScore}
                onClick={async () => {
                  try {
                    await persistScore('draft');
                    setSaveMessage(`Draft penilaian ${candidate!.name} (${candidate!.code}) tersimpan di server.`);
                  } catch (err) {
                    setSaveMessage(axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal menyimpan draft.' : 'Gagal menyimpan draft.');
                  }
                }}
              >
                Simpan Draft Saja
              </Button>

              <Button
                variant="primary"
                type="submit"
                disabled={isSubmitting || !canFinalize}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs disabled:opacity-60"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                <span>{isSigned ? 'LHA Sudah Diterbitkan (Terkunci)' : 'Finalisasi Penilaian & Terbitkan LHA'}</span>
              </Button>
            </div>
          </div>
        </form>

        {/* Dual-Assessor Calibration + Post-Publication Official Correction & Versioning */}
        <AsesorGovernancePanels
          candidateCode={candidate!.code}
          candidateName={candidate!.name}
          programCode={candidate!.programCode || undefined}
          programTitle={candidate!.program}
          catScore={candidate!.catScore ?? null}
          competencies={competencies}
          recommendation={recommendation}
          assessorNotes={assessorNotes}
          isSigned={isSigned}
          lhaNumber={lhaNumber}
          onApplyConsensusToDraft={(consensus) => {
            setCompetencies(consensus.competencies);
            setRecommendation(consensus.recommendation);
            setAssessorNotes(consensus.notes);
            setSaveMessage('Konsensus kalibrasi 2 asesor telah diterapkan ke draf penilaian Penilai 1.');
          }}
        />

        {/* ─── LHA (LAPORAN HASIL ASESMEN) PREVIEW MODAL (BRD 6.2) ─── */}
        <Modal
          isOpen={lhaModalOpen}
          onClose={() => setLhaModalOpen(false)}
          title="Dokumen Resmi Laporan Hasil Asesmen (LHA)"
          size="2xl"
        >
          <div className="p-4 space-y-6 text-slate-800 bg-white">
            {/* Header Surat LHA */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">SOLUSI ASESMEN INDONESIA</h3>
                <p className="text-xs text-slate-500 font-medium">Proxsis Talent Force • Assessment Center Enterprise</p>
                <p className="text-[11px] text-slate-400">Permata Kuningan Building Lt. 17, HR Rasuna Said, Jakarta Selatan</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-blue-700 block text-base">LHA RESMI</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  NO: {lhaNumber || 'DRAFT'}
                </span>
                <span className="text-[10px] text-emerald-700 font-mono block mt-1">STATUS: CERTIFIED FINAL</span>
              </div>
            </div>

            {/* Candidate & Program Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block font-semibold">Nama Kandidat:</span>
                <span className="font-bold text-slate-900 text-sm">{candidate!.name}</span>
                <span className="text-slate-500 block">ID: {candidate!.code}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-semibold">Program Asesmen:</span>
                <span className="font-bold text-slate-900">{candidate!.program}</span>
                <span className="text-slate-500 block">{candidate!.company}</span>
              </div>
            </div>

            {/* Scorecard Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-2">Matriks 7 Indikator Perilaku Terstandar:</h4>
              <table className="w-full text-xs border border-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 text-left border border-slate-200">KOMPETENSI</th>
                    <th className="p-2 text-center border border-slate-200">BOBOT</th>
                    <th className="p-2 text-center border border-slate-200">SKOR (1-5)</th>
                    <th className="p-2 text-left border border-slate-200">EVIDENCE CATATAN PERILAKU</th>
                  </tr>
                </thead>
                <tbody>
                  {competencies.map((c) => (
                    <tr key={c.id}>
                      <td className="p-2 border border-slate-200 font-semibold">{c.name}</td>
                      <td className="p-2 border border-slate-200 text-center font-mono">{c.weight}%</td>
                      <td className="p-2 border border-slate-200 text-center font-mono font-bold text-blue-700">
                        {c.score.toFixed(1)}
                      </td>
                      <td className="p-2 border border-slate-200 text-[11px] text-slate-600">{c.notes}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={2} className="p-2 border border-slate-200 text-right">RATA-RATA BARS (1-5):</td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-blue-700 text-sm">
                      {weightedOverallScore} / 5.0
                    </td>
                    <td className="p-2 border border-slate-200 text-emerald-700">
                      Komposit (0-100):{' '}
                      {candidate!.catScore != null
                        ? calculateCompositeScore(
                            candidate!.catScore,
                            Math.round(Number(weightedOverallScore) * 20 * 10) / 10
                          )
                        : '-'}{' '}
                      • Rekomendasi: {recommendation}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* QR Code & Hash Kepatuhan UU PDP (BRD 6.2) */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0">
                  <QrCode className="w-10 h-10 text-slate-800" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">Jaminan Integritas & Validitas Laporan (UU PDP No. 27/2022)</span>
                  <span className="text-[11px] text-slate-500 font-mono block break-all">
                    {lhaHash ? `Hash: ${lhaHash}` : 'Hash tersedia setelah finalisasi LHA.'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {lhaNumber ? `No. ${lhaNumber} • ` : ''}Dapat diverifikasi publik melalui /api/lha/verify/:hash
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-bold text-slate-900 block">{assessorName}</span>
                <span className="text-slate-500 text-[11px]">Tanda Tangan Digital Terotorisasi</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setLhaModalOpen(false)}>
                Tutup
              </Button>
              <Button variant="outline" onClick={() => void downloadLhaPdf()}>
                <Download className="w-4 h-4 mr-1.5" />
                <span>Unduh PDF Server</span>
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  printLha();
                  setLhaModalOpen(false);
                  navigate('/asesor/rekap');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="w-4 h-4 mr-1.5" />
                <span>Cetak / Simpan LHA PDF</span>
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AsesorLayout>
  );
}
