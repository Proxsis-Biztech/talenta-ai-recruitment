import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Video,
  Mic,
  MicOff,
  Flag,
  ShieldAlert,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  Star,
  LogOut,
  ChevronRight,
  FileText
} from 'lucide-react';
import { Button, Badge, Card } from '../ui';

interface RubricItem {
  id: string;
  name: string;
  weight: number; // percentage
  score: number; // 1 to 5
  notes: string;
  descriptors: { [key: number]: string };
}

export default function AsesorLiveConsole() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [isRecording, setIsRecording] = useState(true);
  const [elapsed, setElapsed] = useState(380); // ~6 mins
  const [activeCompetency, setActiveCompetency] = useState<string>('c1');
  const [flagModalOpen, setFlagModalOpen] = useState(false);

  // Rubric state
  const [rubrics, setRubrics] = useState<RubricItem[]>([
    {
      id: 'c1',
      name: 'System Architecture & Scalability',
      weight: 30,
      score: 4,
      notes: 'Mampu menjelaskan strategi sharding dan caching multi-tier dengan argumen teknis yang solid.',
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
      score: 4,
      notes: 'Paham pemanfaatan explain analyze dan indeks composite.',
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
      score: 5,
      notes: 'Solusi rekursif dan penanganan edge case sangat efisien.',
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
      score: 4,
      notes: 'Gaya penyampaian runtut, profesional, dan terbuka terhadap feedback penguji.',
      descriptors: {
        1: 'Tidak komunikatif dan pasif.',
        2: 'Penjelasan berbelit-belit dan sulit dipahami.',
        3: 'Komunikasi jelas dalam konteks teknis standar.',
        4: 'Artikulasi terstruktur, lugas, dan persuasif.',
        5: 'Komunikasi level leadership teknologi yang inspiratif.'
      }
    }
  ]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

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

  // Calculate weighted score (scaled to 100)
  const totalWeightedScore = rubrics.reduce((acc, r) => {
    return acc + (r.score / 5) * r.weight;
  }, 0);

  const currentRubric = rubrics.find((r) => r.id === activeCompetency) || rubrics[0];

  const handleEndSession = () => {
    navigate('/asesor/scoring/demo');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none">
      {/* ─── Topbar Live Console ─── */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold font-heading">
            T+
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">
              Live Console Asesor: Sesi Farhan Pratama (KND-0891)
            </h1>
            <p className="text-[11px] text-slate-400">Software Engineer Specialist Batch IV • Room-A1</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Record button */}
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-2 border cursor-pointer ${
              isRecording
                ? 'bg-red-950 text-red-300 border-red-800 animate-pulse'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-slate-500'}`} />
            <span>{isRecording ? `REC • ${formatTimer(elapsed)}` : 'PAUSED'}</span>
          </button>

          {/* Flag Integritas Button */}
          <button
            onClick={() => alert('Flag integritas dicatat: Kejadian mencurigakan ditandai pada timestamp ' + formatTimer(elapsed))}
            className="px-3 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Tandai Flag</span>
          </button>

          {/* Akhiri Sesi Button */}
          <button
            onClick={handleEndSession}
            className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Akhiri Sesi & Nilai</span>
          </button>
        </div>
      </header>

      {/* ─── Main Console Grid: Candidate Video (Left) + Rubric Scoring (Right) ─── */}
      <div className="flex-1 flex overflow-hidden p-4 sm:p-6 gap-6">
        {/* ─── Left: Candidate Live Stream & Notes ─── */}
        <div className="w-1/2 flex flex-col justify-between bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden relative shadow-2xl">
          {/* Video Placeholder */}
          <div className="relative flex-1 flex flex-col items-center justify-center p-8 bg-slate-900">
            <div className="w-28 h-28 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-300 font-heading font-extrabold text-3xl shadow-inner">
              FP
            </div>
            <div className="mt-4 text-center">
              <p className="font-heading font-bold text-base text-white">Farhan Pratama</p>
              <p className="text-xs text-slate-400 font-mono">Skor CAT Teknis: 88/100 (Peringkat #3)</p>
            </div>

            {/* OpenCV Live Overlay Box */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-[11px] text-emerald-400 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Face Tracked • Head Pitch 0.2° (Normal)</span>
            </div>
          </div>

          {/* Quick Questions Helper for Assessor */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 text-xs space-y-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-blue-accent">
              Panduan Soal Terstruktur Asesor:
            </span>
            <p className="text-slate-300 font-medium leading-relaxed">
              "Jelaskan bagaimana Anda mengisolasi fault pada microservice payment gateway agar kegagalan 3rd party tidak menyebabkan cascading failure pada seluruh core service."
            </p>
          </div>
        </div>

        {/* ─── Right: Interactive Rubric Scoring Panel ─── */}
        <div className="w-1/2 bg-white text-ink rounded-2xl border border-border-slate flex flex-col overflow-hidden shadow-xs">
          {/* Header Rubrik */}
          <div className="p-5 border-b border-border-slate flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="font-heading font-extrabold text-base text-ink">
                Rubrik Penilaian Multi-Kompetensi
              </h2>
              <p className="text-xs text-muted-slate">Skala 1 - 5 dengan pembobotan persentase otomatis</p>
            </div>

            {/* Dynamic Total Score */}
            <div className="text-right">
              <span className="text-[10px] text-muted-slate uppercase font-bold">Skor Wawancara:</span>
              <p className="font-mono text-2xl font-extrabold text-primary-navy">
                {totalWeightedScore.toFixed(1)} / 100
              </p>
            </div>
          </div>

          {/* Competency Tabs */}
          <div className="flex border-b border-border-slate bg-slate-100 overflow-x-auto p-1 gap-1">
            {rubrics.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveCompetency(r.id)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeCompetency === r.id
                    ? 'bg-white text-primary-navy shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{r.name.split(' ')[0]}</span>
                <span className="ml-1 text-[10px] font-mono text-slate-400">({r.score}/5)</span>
              </button>
            ))}
          </div>

          {/* Active Rubric Form */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading font-bold text-base text-ink">
                  {currentRubric.name}
                </h3>
                <span className="text-xs font-mono font-semibold text-primary-navy bg-soft-blue px-2 py-0.5 rounded">
                  Bobot: {currentRubric.weight}%
                </span>
              </div>
              <p className="text-xs text-muted-slate">
                Pilihlah tingkat kecakapan kandidat berdasarkan observasi jawaban:
              </p>
            </div>

            {/* 1 - 5 Rating Scale Buttons with Descriptors */}
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((val) => {
                const isSelected = currentRubric.score === val;
                return (
                  <div
                    key={val}
                    onClick={() => handleScoreChange(currentRubric.id, val)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
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
                    <div>
                      <p className="text-xs font-bold">
                        {val === 5 ? 'Sangat Istimewa (Expert)' : val === 4 ? 'Kompeten / Mahir' : val === 3 ? 'Cukup / Sesuai Standar' : val === 2 ? 'Di Bawah Standar' : 'Tidak Memenuhi'}
                      </p>
                      <p className="text-[11px] text-muted-slate mt-0.5 leading-relaxed">
                        {currentRubric.descriptors[val]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Field Catatan Asesor */}
            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                Catatan Asesor untuk {currentRubric.name}:
              </label>
              <textarea
                rows={3}
                value={currentRubric.notes}
                onChange={(e) => handleNotesChange(currentRubric.id, e.target.value)}
                placeholder="Tuliskan poin observasi penting terkait kompetensi ini..."
                className="w-full p-3 rounded-xl border border-border-slate focus:border-primary-navy text-xs outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* Footer Save / Next Competency */}
          <div className="p-4 border-t border-border-slate bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-muted-slate">
              Tersimpan otomatis ke database evaluasi
            </span>
            <Button
              variant="primary"
              onClick={handleEndSession}
              className="text-xs flex items-center gap-1.5"
            >
              <span>Lanjut ke Formulir Rekomendasi</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
