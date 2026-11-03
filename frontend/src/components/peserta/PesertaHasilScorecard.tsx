import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Award,
  CheckCircle2,
  Download,
  ShieldCheck,
  Calendar,
  TrendingUp,
  ArrowLeft,
  Clock,
  AlertCircle
} from 'lucide-react';
import { PesertaLayout } from './PesertaLayout';
import { Button } from '../ui';
import RadarChart from '../RadarChart';
import { getActiveSessionUser } from '../../services/userRegistryService';
import { getPortalToken } from '../../services/portalAuthService';
import { DEFAULT_ASSESSMENT_PROGRAMS, getProgramById } from '../../services/assessmentCatalog';

interface CompetencyScore {
  name: string;
  score: number;
  max: number;
  weight: string;
}

interface ExamResult {
  score: number;
  integrityScore: number;
  status: string;
  submittedAt?: string;
  manualReviewCount?: number;
  autoGradedCount?: number;
  competencyScores?: CompetencyScore[];
}

export default function PesertaHasilScorecard() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activeUser = useMemo(() => getActiveSessionUser(), []);
  const activeProgram = useMemo(
    () => getProgramById(activeUser.assessmentId || 'SE-402') || DEFAULT_ASSESSMENT_PROGRAMS[0],
    [activeUser.assessmentId]
  );

  useEffect(() => {
    let cancelled = false;
    const loadResult = async () => {
      setLoading(true);
      setError('');
      const token = getPortalToken();
      if (!token) {
        setError('Sesi Anda tidak ditemukan. Silakan masuk kembali.');
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(`/api/exam/${activeProgram.id}/result`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!cancelled) setResult(response.data);
      } catch (err) {
        if (cancelled) return;
        setError(
          axios.isAxiosError(err) && err.response?.status === 404
            ? 'Belum ada hasil ujian untuk program ini.'
            : axios.isAxiosError(err)
              ? err.response?.data?.error || 'Gagal memuat hasil ujian.'
              : 'Gagal memuat hasil ujian.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadResult();
    return () => {
      cancelled = true;
    };
  }, [activeProgram.id]);

  const handleDownloadPDF = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      window.print();
    }, 300);
  };

  const score = Number(result?.score ?? 0);
  const integrityScore = Number(result?.integrityScore ?? 0);
  const competencies = Array.isArray(result?.competencyScores) ? result.competencyScores : [];
  const meetsThreshold = score >= activeProgram.passingScore;

  if (loading) {
    return (
      <PesertaLayout activeTab="hasil">
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-navy border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-muted-slate">Memuat hasil ujian dari server asesmen...</p>
        </div>
      </PesertaLayout>
    );
  }

  if (error || !result) {
    return (
      <PesertaLayout activeTab="hasil">
        <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-extrabold text-ink font-heading">Hasil Ujian Belum Tersedia</h1>
          <p className="text-sm text-muted-slate">{error}</p>
          <Button variant="primary" onClick={() => navigate(`/peserta/exam/${activeProgram.id}`)} className="text-xs">
            Masuk ke Lembar Ujian
          </Button>
        </div>
      </PesertaLayout>
    );
  }

  return (
    <PesertaLayout activeTab="hasil">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-7 antialiased print:p-0 print:max-w-none">
        <div className="bg-primary-navy rounded-3xl p-6 sm:p-10 text-white shadow-sm relative overflow-hidden print:bg-white print:text-slate-900 print:border print:border-slate-300">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 text-blue-100 text-xs sm:text-sm font-semibold backdrop-blur-xs border border-white/10 print:border-slate-300 print:text-blue-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 print:text-emerald-600" />
                <span>Hasil CAT Tersimpan di Server</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold font-heading tracking-tight text-white print:text-slate-900 leading-tight">
                Skor CAT Anda Telah Tersimpan
              </h1>
              <p className="text-sm sm:text-base text-blue-100 print:text-slate-600 max-w-xl leading-relaxed">
                {activeProgram.title} • {activeProgram.companyName}
              </p>
              <p className="text-xs text-blue-200 print:text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Menunggu verifikasi asesor dan penilaian jawaban esai.</span>
              </p>
            </div>

            <div className="bg-white/15 border border-white/20 p-5 sm:p-6 rounded-3xl backdrop-blur-md flex flex-col items-center justify-center shrink-0 w-full md:w-auto md:min-w-[170px] shadow-sm print:bg-slate-100 print:border-slate-300">
              <span className="text-xs uppercase tracking-wider text-blue-200 print:text-slate-600 font-bold">
                Skor CAT Otomatis
              </span>
              <span className="font-mono text-4xl sm:text-5xl font-extrabold text-white print:text-primary-navy mt-1">
                {score.toFixed(1)}
              </span>
              <span className="text-xs text-blue-200 print:text-slate-500 mt-1 font-medium">
                Ambang CAT: {activeProgram.passingScore}
              </span>
              <span className={`mt-2 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${meetsThreshold ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'}`}>
                {meetsThreshold ? 'Memenuhi ambang CAT' : 'Di bawah ambang CAT'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 w-full min-w-0 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="min-w-0">
                <h2 className="font-heading font-bold text-base sm:text-lg text-ink">
                  Rincian Skor Per Kompetensi
                </h2>
                <p className="text-xs text-muted-slate mt-0.5">
                  Dihitung server dari {result.autoGradedCount ?? 0} butir objektif. Jawaban esai dinilai asesor.
                </p>
              </div>
              <span className="shrink-0 text-xs font-mono font-bold text-primary-navy bg-soft-blue px-3 py-1 rounded-lg border border-accent-border">
                Server-Scored
              </span>
            </div>

            {competencies.length === 0 ? (
              <p className="text-sm text-muted-slate">Belum ada rincian kompetensi untuk sesi ini.</p>
            ) : (
              <div className="space-y-4">
                {competencies.map((competency, idx) => (
                  <div key={`${competency.name}-${idx}`} className="space-y-2">
                    <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between sm:text-sm">
                      <span className="font-semibold text-ink break-words">{competency.name}</span>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-muted-slate text-xs">Bobot: {competency.weight}</span>
                        <span className="font-mono font-bold text-primary-navy">
                          {Number(competency.score).toFixed(1)} / {competency.max}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                      <div
                        className="bg-primary-navy h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (Number(competency.score) / (competency.max || 100)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-slate-100 text-xs sm:text-sm text-muted-slate flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Integritas Pengawasan: <strong className="text-emerald-700">{integrityScore} / 100</strong>
              </span>
              <span className="flex items-center gap-1.5 min-w-0">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="break-words">
                  Dikumpulkan: <strong className="text-ink">{result.submittedAt ? new Date(result.submittedAt).toLocaleString('id-ID') : '-'}</strong>
                </span>
              </span>
            </div>
          </div>

          <div className="lg:col-span-5 w-full min-w-0 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-ink mb-1">
                Visualisasi Profil Kompetensi
              </h3>
              <p className="text-xs text-muted-slate mb-4">
                Distribusi skor objektif dari bank soal server.
              </p>
              <div className="flex items-center justify-center py-2">
                <RadarChart
                  axes={
                    competencies.length > 0
                      ? competencies.slice(0, 5).map((competency) => ({
                          label: competency.name.split(' ')[0],
                          value: Number(competency.score)
                        }))
                      : [{ label: 'CAT', value: score }]
                  }
                  fillColor="rgba(37, 99, 235, 0.2)"
                  strokeColor="#1E3A8A"
                  dotColor="#1E3A8A"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-center">
              <span className="text-xs sm:text-sm font-bold text-blue-800 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200 inline-flex items-center gap-1.5">
                <Award className="w-4 h-4 text-blue-600" />
                Menunggu Verifikasi Asesor
              </span>
            </div>
          </div>
        </div>

        {(result.manualReviewCount ?? 0) > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-950">
                {result.manualReviewCount} jawaban esai menunggu penilaian asesor
              </p>
              <p className="text-xs text-amber-800 mt-1">
                Skor CAT di atas hanya mencakup butir objektif (pilihan ganda, multi-select, isian singkat, dan matching). Nilai akhir dan LHA akan diterbitkan setelah asesor menyelesaikan review.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-soft-blue text-primary-navy flex items-center justify-center font-bold text-sm shrink-0 border border-accent-border">
              AI
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-ink">
                Catatan Penilaian Asesor
              </h3>
              <p className="text-xs text-muted-slate">
                Rubrik BARS, wawancara, dan LHA resmi akan muncul setelah asesor menyelesaikan penilaian.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 text-sm text-slate-600 leading-relaxed">
            Belum ada catatan asesor untuk sesi ini. Anda dapat melanjutkan ke ruang wawancara atau memantau status penilaian dari dashboard peserta.
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 print:hidden">
          <button
            onClick={() => navigate('/peserta')}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-primary-navy hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard Peserta</span>
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => navigate('/peserta/asesmen')}
              className="w-full sm:w-auto justify-center text-xs sm:text-sm py-2.5 px-4 rounded-xl cursor-pointer"
            >
              Lihat Program Lain
            </Button>
            <Button
              variant="primary"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="w-full sm:w-auto justify-center text-xs sm:text-sm py-2.5 px-5 rounded-xl flex items-center gap-2 font-bold shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Membuka dialog cetak...' : 'Cetak / Simpan PDF'}</span>
            </Button>
          </div>
        </div>
      </div>
    </PesertaLayout>
  );
}