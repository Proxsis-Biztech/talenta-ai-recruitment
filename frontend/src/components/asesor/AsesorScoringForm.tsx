import React, { useState } from 'react';
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

  // Mode: In-Basket Fact Sheet Simulation vs Interview
  const [assessmentType, setAssessmentType] = useState<'inbasket' | 'interview'>('inbasket');

  // Competencies State
  const [competencies, setCompetencies] = useState<CompetencyItem[]>(DEFAULT_7_COMPETENCIES);

  // AI Fact Sheet Engine State
  const [isMatchingLoading, setIsMatchingLoading] = useState(false);
  const [factSheetMatched, setFactSheetMatched] = useState(true);
  const [priorityAccuracy, setPriorityAccuracy] = useState<number>(88);
  const [behavioralEvidence, setBehavioralEvidence] = useState<string>(
    'Kandidat Farhan Pratama menunjukkan penalaran analitis tajam dengan menempatkan isu penurunan OTP 1.4% sebagai krisis operasional utama yang harus dipulihkan dalam 24 jam. Kandidat mengenali 5 dari 5 fakta skenario PT Anjak, serta menghubungkan keterlambatan vendor CRM dengan lonjakan antrean teller. Asesor merekomendasikan kandidat untuk tahap penempatan akhir.'
  );

  // Recommendations & E-Sign
  const [recommendation, setRecommendation] = useState<'LANJUT' | 'DIPERTIMBANGKAN' | 'TIDAK'>('LANJUT');
  const [isSigned, setIsSigned] = useState<boolean>(true);
  const [assessorName, setAssessorName] = useState<string>('Anggita, M.Psi., Psikolog');
  const [assessorTitle, setAssessorTitle] = useState<string>('Lead Assessor (SIPP No. 042/SAI-HIMPSI/2026)');

  // LHA Preview Modal
  const [lhaModalOpen, setLhaModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate Weighted Score (1 - 5 Scale)
  const weightedOverallScore = competencies
    .reduce((acc, curr) => acc + (curr.score * curr.weight) / 100, 0)
    .toFixed(2);

  // Run AI Fact Sheet Matching Simulation
  const handleTriggerAiMatch = () => {
    setIsMatchingLoading(true);
    setTimeout(() => {
      setIsMatchingLoading(false);
      setFactSheetMatched(true);
      setPriorityAccuracy(92);
      setBehavioralEvidence(
        'HASIL AI FACT SHEET MATCHING (DeepSeek/Gemini Engine):\n• Penurunan OTP (99.2% -> 97.8%): Teridentifikasi sebagai Priority 1 (Kritis) ✓\n• Penurunan CSI (89 -> 83): Teridentifikasi sebagai dampak langsung ke nasabah prioritas ✓\n• Beban Listrik (+14%): Diakomodasi dalam strategi efisiensi biaya vendor ✓\n• Skor Akurasi Prioritas: 92% | Draf rating komposit: 4.15 / 5.00'
      );
    }, 1200);
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

  const handleFinalize = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setLhaModalOpen(true);
    }, 500);
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
              FP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-heading text-slate-900">
                  Farhan Pratama
                </h1>
                <Badge variant="navy" className="text-xs">
                  CIMB Niaga: The Complete Banker
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                KND-2026-0891 • In-Basket Simulation PT Anjak (OTP, CSI & OPEX)
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
              <p className="font-mono text-xl font-extrabold text-emerald-700">{priorityAccuracy}%</p>
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
          <CardContent className="p-5 space-y-3">
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
          </CardContent>
        </Card>

        {/* 7 Core Behavioral Competencies Form (BRD 4.2 & 4.3) */}
        <form onSubmit={handleFinalize} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-heading font-bold text-base text-slate-900">
                Rubrik 7 Indikator Perilaku Baku (Skala 1 - 5)
              </h2>
              <p className="text-xs text-slate-500">
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
                  <span className="font-mono text-[10px] text-slate-400">SHA-256 HASH VERIFIED</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate('/asesor/interview-queue')}
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
                <span className="text-[11px] text-slate-500 font-mono">NO: LHA/SAI-PTF/2026/10/0891</span>
                <span className="text-[10px] text-emerald-700 font-mono block mt-1">STATUS: CERTIFIED FINAL</span>
              </div>
            </div>

            {/* Candidate & Program Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block font-semibold">Nama Kandidat:</span>
                <span className="font-bold text-slate-900 text-sm">Farhan Pratama</span>
                <span className="text-slate-500 block">ID: KND-2026-0891</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-semibold">Program Asesmen:</span>
                <span className="font-bold text-slate-900">The Complete Banker (CIMB Niaga)</span>
                <span className="text-slate-500 block">Simulasi In-Basket Kasus PT Anjak</span>
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
                  <span className="text-[11px] text-slate-500 font-mono block">
                    Hash: 9e3a7f82b4c109d3810f5439a82645eb48992a0129bc...
                  </span>
                  <span className="text-[10px] text-slate-400">Dapat divalidasi keabsahannya oleh tim Human Capital klien secara publik</span>
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
                  alert('Mengunduh LHA Resmi format PDF ber-QR Code...');
                  setLhaModalOpen(false);
                  navigate('/asesor/rekap');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="w-4 h-4 mr-1.5" />
                <span>Unduh LHA PDF Resmi</span>
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AsesorLayout>
  );
}
