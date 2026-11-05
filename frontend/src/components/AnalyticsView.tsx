import React, { useMemo } from 'react';
import { BarChart3, Printer } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { AdminAnalyticsCharts } from './admin/AdminAnalyticsCharts';

interface Applicant {
  id: string;
  fullName: string;
  education: string;
  gender: string;
  appliedPosition: string;
  job?: { title: string } | null;
  screeningStatus: string;
  screeningScore: number | null;
  interviewStatus: string;
  interviewScore: number | null;
  compositeEvaluation?: {
    compositeScore: number;
    recommendation: 'STRONG HIRE' | 'RECOMMENDED HIRE' | 'CONSIDER' | 'NOT RECOMMENDED';
  };
}

interface AnalyticsViewProps {
  applicants: Applicant[];
}

export default function AnalyticsView({ applicants }: AnalyticsViewProps) {
  // Aggregate Metrics
  const totalApplicants = applicants.length;
  
  const interviewedCount = useMemo(() => {
    return applicants.filter(a => a.interviewStatus === 'completed').length;
  }, [applicants]);

  const scoredCount = useMemo(() => {
    return applicants.filter(a => (a.interviewScore && a.interviewScore > 0) || a.compositeEvaluation != null).length;
  }, [applicants]);

  const strongHireCount = useMemo(() => {
    return applicants.filter(a => 
      a.compositeEvaluation?.recommendation === 'STRONG HIRE' || 
      a.compositeEvaluation?.recommendation === 'RECOMMENDED HIRE'
    ).length;
  }, [applicants]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-navy" />
            <h2 className="text-lg font-bold text-ink font-heading tracking-tight">
              Laporan Analitika Eksekutif &amp; Konversi Bakat
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visualisasi efisiensi funnel rekrutmen, disparitas nilai posisi, dan demografi kandidat terintegrasi.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handlePrint}
          leftIcon={<Printer className="w-3.5 h-3.5 text-slate-500" />}
        >
          Cetak Ringkasan Eksekutif
        </Button>
      </div>

      {/* Funnel Conversion Ribbon */}
      <Card elevation="flat" className="p-5 border-slate-200">
        <h3 className="text-sm font-heading font-bold text-ink tracking-tight mb-4">
          Funnel Konversi Bakat (End-to-End Recruitment)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 block font-sans">
              1. Pendaftaran Masuk
            </span>
            <div className="text-xl font-bold font-mono text-slate-900">{totalApplicants}</div>
            <span className="text-[11px] text-slate-500 font-sans">100% Total Pelamar</span>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 block font-sans">
              2. Sesi Wawancara AI
            </span>
            <div className="text-xl font-bold font-mono text-slate-900">{interviewedCount}</div>
            <span className="text-[11px] text-slate-500 font-sans">
              {totalApplicants > 0 ? Math.round((interviewedCount / totalApplicants) * 100) : 0}% Selesai Sesi
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 block font-sans">
              3. Sudah Dinilai
            </span>
            <div className="text-xl font-bold font-mono text-slate-900">{scoredCount}</div>
            <span className="text-[11px] text-slate-500 font-sans">
              {totalApplicants > 0 ? Math.round((scoredCount / totalApplicants) * 100) : 0}% Terhitung AI
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/60 space-y-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-800 block font-sans">
              4. Direkomendasikan
            </span>
            <div className="text-xl font-bold font-mono text-emerald-900">{strongHireCount}</div>
            <span className="text-[11px] text-emerald-700 font-sans font-semibold">
              {totalApplicants > 0 ? Math.round((strongHireCount / totalApplicants) * 100) : 0}% Siap Offer
            </span>
          </div>
        </div>
      </Card>

      <AdminAnalyticsCharts applicants={applicants} />

    </div>
  );
}
