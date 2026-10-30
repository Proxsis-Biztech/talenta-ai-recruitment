import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  Download,
  Share2,
  FileText,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  UserCheck,
  ArrowLeft,
  Printer
} from 'lucide-react';
import { PesertaLayout } from './PesertaLayout';
import { Button, Badge } from '../ui';
import RadarChart from '../RadarChart';

export default function PesertaHasilScorecard() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);

  const competencyScores = [
    { label: 'System Architecture & Microservices', score: 88, max: 100, weight: '25%' },
    { label: 'Database Optimization & SQL Indexing', score: 82, max: 100, weight: '20%' },
    { label: 'Problem Solving & Algoritma CAT', score: 90, max: 100, weight: '30%' },
    { label: 'Communication & Articulation Asesor', score: 85, max: 100, weight: '15%' },
    { label: 'Integrity & Ethics Compliance', score: 98, max: 100, weight: '10%' }
  ];

  const compositeScore = 87.8;

  const handleDownloadPDF = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      window.print();
    }, 400);
  };

  return (
    <PesertaLayout activeTab="hasil">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-7 antialiased print:p-0 print:max-w-none">
        {/* ─── Hero Result Banner (Celebratory, Clear, Warm) ─── */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-primary-navy rounded-3xl p-6 sm:p-10 text-white shadow-sm relative overflow-hidden print:bg-white print:text-slate-900 print:border print:border-slate-300">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 text-emerald-100 text-xs sm:text-sm font-semibold backdrop-blur-xs border border-white/10 print:border-slate-300 print:text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 print:text-emerald-600" />
                <span>Hasil Resmi Telah Diverifikasi & Lulus</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold font-heading tracking-tight text-white print:text-slate-900 leading-tight">
                Selamat! Anda Dinyatakan LULUS
              </h1>
              <p className="text-sm sm:text-base text-emerald-100 print:text-slate-600 max-w-xl leading-relaxed">
                Asesmen Kompetensi Software Engineer Specialist Batch IV • PT Telkom Indonesia Tbk.
              </p>
            </div>

            {/* Composite Score Card */}
            <div className="bg-white/15 border border-white/20 p-6 rounded-3xl backdrop-blur-md flex flex-col items-center justify-center shrink-0 min-w-[160px] shadow-sm print:bg-slate-100 print:border-slate-300">
              <span className="text-xs uppercase tracking-wider text-emerald-200 print:text-slate-600 font-bold">
                Skor Komposit
              </span>
              <span className="font-mono text-4xl sm:text-5xl font-extrabold text-white print:text-primary-navy mt-1">
                {compositeScore}
              </span>
              <span className="text-xs text-emerald-200 print:text-slate-500 mt-1 font-medium">Ambang Kelulusan: 75.0</span>
            </div>
          </div>
        </div>

        {/* ─── Scorecard Breakdown: Bars + Radar Chart ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Bars (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-heading font-bold text-base sm:text-lg text-ink">
                  Rincian Nilai Per Dimensi Kompetensi
                </h2>
                <p className="text-xs text-muted-slate mt-0.5">
                  Berdasarkan penilaian CAT 40 soal & evaluasi rubrik asesor
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-primary-navy bg-soft-blue px-3 py-1 rounded-lg border border-accent-border">
                Bobot Terstandar
              </span>
            </div>

            <div className="space-y-4">
              {competencyScores.map((c, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-ink">{c.label}</span>
                    <div className="flex items-center gap-2.5">
                      <span className="text-muted-slate text-xs">Bobot: {c.weight}</span>
                      <span className="font-mono font-bold text-primary-navy">{c.score} / {c.max}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                    <div
                      className="bg-primary-navy h-full rounded-full transition-all duration-500"
                      style={{ width: `${(c.score / c.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 text-xs sm:text-sm text-muted-slate flex flex-wrap items-center justify-between gap-3">
              <span>Keandalan Ujian (Reliability Alpha): <strong className="text-ink font-mono">0.92</strong></span>
              <span>Integritas Pengawasan: <strong className="text-emerald-700">98 / 100 (Sangat Bersih)</strong></span>
            </div>
          </div>

          {/* Right Radar Chart (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-ink mb-1">
                Visualisasi Radar Profil
              </h3>
              <p className="text-xs text-muted-slate mb-4">
                Distribusi kompetensi relatif terhadap baseline kebutuhan peran jabatan.
              </p>
              <div className="flex items-center justify-center py-2">
                <RadarChart
                  axes={[
                    { label: 'System Arch', value: 88 },
                    { label: 'Database', value: 82 },
                    { label: 'Problem Solving', value: 90 },
                    { label: 'Communication', value: 85 },
                    { label: 'Integrity', value: 98 }
                  ]}
                  fillColor="rgba(37, 99, 235, 0.2)"
                  strokeColor="#1E3A8A"
                  dotColor="#1E3A8A"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-center">
              <span className="text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200 inline-flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                Peringkat #3 dari 124 Peserta Teruji
              </span>
            </div>
          </div>
        </div>

        {/* ─── Catatan Dewan Asesor ─── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-soft-blue text-primary-navy flex items-center justify-center font-bold text-sm shrink-0 border border-accent-border">
              DH
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-ink">
                Catatan Kualitatif Asesor Independen
              </h3>
              <p className="text-xs text-muted-slate">
                Oleh: Dr. Ir. Dwi Hartanto, M.Kom • Lead Assessor Arsitektur Cloud
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 text-sm text-slate-700 leading-relaxed italic">
            "Kandidat Farhan Pratama menunjukkan penguasaan yang sangat matang pada penyelesaian 40 soal teknis CAT, khususnya pada konsep isolasi database concurrent dan strategi mitigasi cache stampede. Artikulasi saat live interview sangat sistematis, tenang, dan berbasis arsitektur teruji. Sangat direkomendasikan untuk posisi Software Engineer Specialist."
          </div>
        </div>

        {/* ─── Actions: Unduh PDF & Dashboard ─── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 print:hidden">
          <button
            onClick={() => navigate('/peserta')}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-primary-navy hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard Peserta</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => navigate('/peserta/asesmen')}
              className="text-xs sm:text-sm py-2.5 px-4 rounded-xl cursor-pointer"
            >
              Lihat Program Lain
            </Button>
            <Button
              variant="primary"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="text-xs sm:text-sm py-2.5 px-5 rounded-xl flex items-center gap-2 font-bold shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Membuka dialog cetak / PDF...' : 'Cetak & Simpan PDF'}</span>
            </Button>
          </div>
        </div>
      </div>
    </PesertaLayout>
  );
}
