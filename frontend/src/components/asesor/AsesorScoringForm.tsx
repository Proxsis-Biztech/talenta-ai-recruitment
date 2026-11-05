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
  getCandidateByCode,
  calculateCompositeScore,
  formatToday,
  ASSESSOR_NAME,
  ASSESSOR_TITLE
} from '../../services/asesorScoreService';
import { getActiveSessionUser } from '../../services/userRegistryService';
import { getPortalToken } from '../../services/portalAuthService';

interface CompetencyItem {
  id: string;
  name: string;
  weight: number;
  score: number; // 1.0 - 5.0
  notes: string;
}

const DEFAULT_7_COMPETENCIES: CompetencyItem[] = [
  {
    id: 'c1',
    name: 'Analytical Thinking',
    weight: 20,
    score: 4.2,
    notes: 'Kandidat dengan cepat memetakan korelasi kausal antara penurunan OTP 1.4% dan penurunan kepuasan nasabah segmen prioritas.'
  },
  {
    id: 'c2',
    name: 'Problem Solving',
    weight: 20,
    score: 4.0,
    notes: 'Menyusun langkah perbaikan bertahap: intervensi darurat 24 jam pertama dan konsolidasi vendor jangka menengah.'
  },
  {
    id: 'c3',
    name: 'Decision Making',
    weight: 15,
    score: 3.8,
    notes: 'Keberanian menetapkan trade-off: memprioritaskan stabilitas layanan publik sebelum melakukan pemotongan anggaran.'
  },
  {
    id: 'c4',
    name: 'Planning & Organizing',
    weight: 15,
    score: 4.0,
    notes: 'Alokasi tim teknisi jelas dengan timeline perbaikan mesin CRM dan matriks eskalasi berjenjang.'
  },
  {
    id: 'c5',
    name: 'Cost Consciousness',
    weight: 10,
    score: 3.6,
    notes: 'Memberikan perhatian khusus pada beban OPEX listrik (+14%) melalui renegosiasi penalti SLA vendor.'
  },
  {
    id: 'c6',
    name: 'Customer Focus',
    weight: 10,
    score: 4.5,
    notes: 'Sangat responsif terhadap keluhan nasabah; mengusulkan kompensasi loyalitas dan transparansi update status.'
  },
  {
    id: 'c7',
    name: 'Strategic Agility',
    weight: 10,
    score: 3.9,
    notes: 'Fleksibilitas menyesuaikan rencana saat dihadapkan pada keterbatasan jumlah teller saat peak hour.'
  }
];

export default function AsesorScoringForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const candidate = getCandidateByCode(id);
  const activeAssessor = getActiveSessionUser();

  // Mode: In-Basket Fact Sheet Simulation vs Interview
  const [assessmentType, setAssessmentType] = useState<'inbasket' | 'interview'>('inbasket');

  // Competencies State
  const [competencies, setCompetencies] = useState<CompetencyItem[]>(DEFAULT_7_COMPETENCIES);

  // Candidate written answers used as the AI Fact Sheet input
  const [writtenAnswers, setWrittenAnswers] = useState({
    problemIdentification:
      'Penurunan OTP dari 99.2% menjadi 97.8% dan CSI dari 89 menjadi 83 adalah akar masalah utama. Keduanya menandakan degradasi layanan yang langsung dirasakan nasabah prioritas, sementara kenaikan beban listrik +14% dan keterlambatan vendor CRM memperparah kapasitas layanan pada peak hour.',
    priorityMatrix:
      'Priority 1 (Kritis): pemulihan OTP dan CSI dalam 24 jam pertama. Priority 2 (Penting): efisiensi OPEX listrik +14% dan renegosiasi SLA vendor ATM/CRM. Priority 3 (Sekunder): optimasi penjadwalan teller untuk peak hour 08.00-10.30.',
    solutionStrategy:
      'Intervensi darurat 24 jam: tim teknisi dikerahkan ke 4 titik transit dengan matriks eskalasi berjenjang. Jangka menengah: migrasi vendor CRM dengan SLA baru, kompensasi loyalitas bagi nasabah terdampak, dan transparansi update status antrean.',
    costEfficiency:
      'Fokus pada beban OPEX listrik (+14%) melalui renegosiasi penalti SLA vendor, efisiensi jadwal mesin ATM/CRM di luar jam sibuk, dan prioritas perbaikan pada unit dengan rasio antrean tertinggi agar anggaran tidak terbuang merata.'
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
      const token = getPortalToken();
      if (!token) return;
      try {
        const response = await axios.get(`/api/asesor/scores/${candidate.code}`, {
          params: { programTitle: candidate.program },
          headers: { Authorization: `Bearer ${token}` }
        });
        if (cancelled || !response.data?.data) return;
        const record = response.data.data;
        if (Array.isArray(record.competencies) && record.competencies.length > 0) {
          setCompetencies(
            record.competencies.map((item: any, index: number) => ({
              id: `c${index + 1}`,
              name: item.name,
              weight: item.weight,
              score: item.score,
              notes: item.notes || ''
            }))
          );
        }
        setRecommendation(record.recommendation);
        setIsSigned(record.status === 'signed');
        setLhaHash(record.lhaHash || '');
        setLhaNumber(record.lhaNumber || '');
        setSaveMessage('Penilaian tersimpan di server.');
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status !== 404) {
          setSaveMessage('Gagal memuat penilaian tersimpan.');
        }
      }
    };
    void loadScore();
    return () => {
      cancelled = true;
    };
  }, [candidate.code, candidate.program]);

  // Calculate Weighted Score (1 - 5 Scale)
  const weightedOverallScore = competencies
    .reduce((acc, curr) => acc + (curr.score * curr.weight) / 100, 0)
    .toFixed(2);

  // Run AI Fact Sheet Matching against the real Gemini engine
  const handleTriggerAiMatch = async () => {
    setIsMatchingLoading(true);
    setAiError('');
    try {
      const res = await axios.post('/api/admin/ai/fact-sheet-match', {
        submission: {
          candidateName: candidate.name,
          programTitle: `${candidate.program} (${candidate.pt})`,
          caseStudyTitle: 'In-Basket Simulation PT Anjak (OTP, CSI & OPEX)',
          ...writtenAnswers
        }
      });
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
    setCompetencies((prev) =>
      prev.map((c) =>
        c.id === compId
          ? { ...c, score: Math.min(5, Math.max(1, parseFloat((c.score + delta).toFixed(1)))) }
          : c
      )
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
        candidateCode: candidate.code,
        candidateName: candidate.name,
        programTitle: candidate.program,
        competencies: competencies.map((c) => ({
          name: c.name,
          weight: c.weight,
          score: c.score,
          notes: c.notes
        })),
        interviewScore,
        compositeScore: calculateCompositeScore(candidate.catScore, interviewScore),
        recommendation,
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
    const html = `<!doctype html><html lang="id"><head><meta charset="utf-8" /><title>LHA ${candidate.code}</title>
<style>body{font-family:Georgia,serif;margin:40px;color:#111}h1{font-size:18px;margin:0}table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px;vertical-align:top}th{background:#f1f5f9;text-align:left}.meta{font-size:12px;color:#555}</style>
</head><body>
<h1>SOLUSI ASESMEN INDONESIA</h1>
<p class="meta">Proxsis Talent Force • Assessment Center Enterprise<br/>NO: ${lhaNumber} • STATUS: CERTIFIED FINAL</p>
<hr/>
<p><strong>Nama Kandidat:</strong> ${candidate.name}<br/>
<strong>ID Kandidat:</strong> ${candidate.code}<br/>
<strong>Program:</strong> ${candidate.program} (${candidate.pt})<br/>
<strong>Skor CAT:</strong> ${candidate.catScore}/100<br/>
<strong>Skor Wawancara:</strong> ${Math.round(Number(weightedOverallScore) * 20 * 10) / 10}/100<br/>
<strong>Skor Komposit:</strong> ${calculateCompositeScore(candidate.catScore, Math.round(Number(weightedOverallScore) * 20 * 10) / 10)}</p>
<h2 style="font-size:14px">Matriks 7 Indikator Perilaku Terstandar</h2>
<table><thead><tr><th>KOMPETENSI</th><th>BOBOT</th><th>SKOR (1-5)</th><th>EVIDENCE CATATAN PERILAKU</th></tr></thead><tbody>${rows}</tbody></table>
<p><strong>Rekomendasi Dewan Asesor:</strong> ${recommendation}<br/>
<strong>Skor Komposit (1-5):</strong> ${weightedOverallScore}</p>
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
    setIsSubmitting(true);
    setSaveMessage('');
    try {
      await persistScore('signed');
      setSaveMessage(`Penilaian ${candidate.name} (${candidate.code}) berhasil ditandatangani dan LHA diterbitkan.`);
      setLhaModalOpen(true);
    } catch (err) {
      console.error('Finalize scoring error:', err);
      setSaveMessage(axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal menyimpan penilaian.' : 'Gagal menyimpan penilaian.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              {candidate.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 tracking-tight">
                  {candidate.name}
                </h1>
                <Badge variant="navy" className="text-xs sm:text-sm font-bold">
                  {candidate.pt}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-mono">
                {candidate.code} • {candidate.program} (CAT {candidate.catScore}/100)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center min-w-[110px]">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Skor Komposit</span>
              <p className="font-mono text-xl font-extrabold text-blue-700">{weightedOverallScore} / 5.0</p>
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
              disabled={isMatchingLoading}
              onClick={handleTriggerAiMatch}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
            >
              {isMatchingLoading ? (
                <span>Menganalisis Jawaban...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  <span>Jalankan AI Fact Sheet Matching</span>
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Respon tertulis kandidat — input untuk AI Fact Sheet Matching */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Respon Tertulis Kandidat (In-Basket PT Anjak)
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  4 Aspek Jawaban
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
                      value={writtenAnswers[key]}
                      onChange={(e) =>
                        setWrittenAnswers((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      rows={4}
                      className="w-full text-xs text-slate-700 bg-white border border-blue-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y"
                    />
                  </div>
                ))}
              </div>
            </div>

            {aiError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {aiError}
              </div>
            )}

            {!factSheetMatched && !aiError && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
                AI Fact Sheet Matching belum dijalankan untuk kandidat ini. Klik tombol di kanan
                atas untuk menganalisis respon tertulis.
              </div>
            )}

            {factSheetMatched && (
              <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs">
                <span className="text-slate-500 block mb-1">Fakta 1: Penurunan OTP (97.8%)</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1 font-mono">
                  <Check className="w-3.5 h-3.5" /> Teridentifikasi (Priority 1)
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs">
                <span className="text-slate-500 block mb-1">Fakta 2: Penurunan CSI (89 ke 83)</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1 font-mono">
                  <Check className="w-3.5 h-3.5" /> Teridentifikasi (Priority 1)
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs">
                <span className="text-slate-500 block mb-1">Fakta 3: Beban Listrik (+14%)</span>
                <span className="text-blue-700 font-bold flex items-center gap-1 font-mono">
                  <Check className="w-3.5 h-3.5" /> Terakomodasi (Priority 2)
                </span>
              </div>
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
                Rubrik 7 Indikator Perilaku Baku (Skala 1 - 5)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Terapkan diskresi profesional asesor (*Human-in-the-Loop*) untuk menyesuaikan skor draf AI
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Skor Komposit Akhir:</span>
              <span className="font-mono text-lg font-bold text-blue-700 ml-2">{weightedOverallScore} / 5.0</span>
            </div>
          </div>

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
                      onClick={() => handleUpdateScore(comp.id, -0.1)}
                      className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-sm text-blue-700 w-12 text-center bg-white py-1 rounded border border-slate-200">
                      {comp.score.toFixed(1)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateScore(comp.id, 0.1)}
                      className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Catatan Perilaku:</span>
                  <input
                    type="text"
                    value={comp.notes}
                    onChange={(e) => {
                      const updated = e.target.value;
                      setCompetencies((prev) =>
                        prev.map((c) => (c.id === comp.id ? { ...c, notes: updated } : c))
                      );
                    }}
                    className="w-full text-xs text-slate-700 bg-transparent focus:outline-none"
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
                  onClick={() => setRecommendation('LANJUT')}
                  className={`p-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
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
                  onClick={() => setRecommendation('DIPERTIMBANGKAN')}
                  className={`p-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
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
                  onClick={() => setRecommendation('TIDAK')}
                  className={`p-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
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

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={async () => {
                  try {
                    await persistScore('draft');
                    setSaveMessage(`Draft penilaian ${candidate.name} (${candidate.code}) tersimpan di server.`);
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
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                <span>Finalisasi Penilaian & Terbitkan LHA</span>
              </Button>
            </div>
          </div>
        </form>

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
                <span className="font-bold text-slate-900 text-sm">{candidate.name}</span>
                <span className="text-slate-500 block">ID: {candidate.code}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-semibold">Program Asesmen:</span>
                <span className="font-bold text-slate-900">{candidate.program}</span>
                <span className="text-slate-500 block">{candidate.pt}</span>
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
                    <td colSpan={2} className="p-2 border border-slate-200 text-right">SKOR KOMPOSIT AKHIR:</td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-blue-700 text-sm">
                      {weightedOverallScore}
                    </td>
                    <td className="p-2 border border-slate-200 text-emerald-700">
                      Rekomendasi: {recommendation}
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
