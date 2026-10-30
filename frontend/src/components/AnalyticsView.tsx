import React, { useMemo } from 'react';
import { 
  BarChart3, Users, Award, TrendingUp, CheckCircle, 
  Target, GraduationCap, Clock, Download, Printer
} from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

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
  
  const screenedCount = useMemo(() => {
    return applicants.filter(a => a.screeningStatus === 'success').length;
  }, [applicants]);

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

  // Education breakdown
  const educationDist = useMemo(() => {
    const counts: Record<string, number> = { 'S1': 0, 'D4': 0, 'D3': 0, 'SMA': 0 };
    applicants.forEach(a => {
      const edu = a.education || 'Lainnya';
      counts[edu] = (counts[edu] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      pct: totalApplicants > 0 ? Math.round((count / totalApplicants) * 100) : 0
    }));
  }, [applicants, totalApplicants]);

  // Gender breakdown
  const genderDist = useMemo(() => {
    const pria = applicants.filter(a => a.gender === 'Pria').length;
    const wanita = applicants.filter(a => a.gender === 'Wanita').length;
    return {
      pria,
      wanita,
      priaPct: totalApplicants > 0 ? Math.round((pria / totalApplicants) * 100) : 0,
      wanitaPct: totalApplicants > 0 ? Math.round((wanita / totalApplicants) * 100) : 0
    };
  }, [applicants, totalApplicants]);

  // Scores by Position
  const scoresByPosition = useMemo(() => {
    const map: Record<string, { totalCv: number; countCv: number; totalWcr: number; countWcr: number }> = {};
    applicants.forEach(a => {
      const pos = a.job?.title || a.appliedPosition || 'General';
      if (!map[pos]) {
        map[pos] = { totalCv: 0, countCv: 0, totalWcr: 0, countWcr: 0 };
      }
      if (a.screeningScore) {
        map[pos].totalCv += a.screeningScore;
        map[pos].countCv += 1;
      }
      if (a.interviewScore) {
        map[pos].totalWcr += a.interviewScore;
        map[pos].countWcr += 1;
      }
    });

    return Object.entries(map).map(([position, val]) => ({
      position,
      avgCv: val.countCv > 0 ? Math.round(val.totalCv / val.countCv) : 0,
      avgWcr: val.countWcr > 0 ? Math.round(val.totalWcr / val.countWcr) : 0,
      candidates: Math.max(val.countCv, val.countWcr)
    }));
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
          Funnel Konversi Talenta (End-to-End Recruitment)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 block font-sans">
              1. Pendaftaran Masuk
            </span>
            <div className="text-xl font-bold font-mono text-slate-900">{totalApplicants}</div>
            <span className="text-[11px] text-slate-500 font-sans">100% Total Pelamar</span>
          </div>

          <div className="p-3.5 rounded-lg border border-accent-border bg-soft-blue/50 space-y-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-primary-navy block font-sans">
              2. Lolos Screening CV
            </span>
            <div className="text-xl font-bold font-mono text-blue-accent">{screenedCount}</div>
            <span className="text-[11px] text-primary-navy font-sans font-medium">
              {totalApplicants > 0 ? Math.round((screenedCount / totalApplicants) * 100) : 0}% Konversi
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 block font-sans">
              3. Sesi Wawancara AI
            </span>
            <div className="text-xl font-bold font-mono text-slate-900">{interviewedCount}</div>
            <span className="text-[11px] text-slate-500 font-sans">
              {totalApplicants > 0 ? Math.round((interviewedCount / totalApplicants) * 100) : 0}% Selesai Sesi
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 block font-sans">
              4. Lulus Nilai Komposit
            </span>
            <div className="text-xl font-bold font-mono text-slate-900">{scoredCount}</div>
            <span className="text-[11px] text-slate-500 font-sans">
              {totalApplicants > 0 ? Math.round((scoredCount / totalApplicants) * 100) : 0}% Terhitung AI
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/60 space-y-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-800 block font-sans">
              5. Rekomendasi Kerja
            </span>
            <div className="text-xl font-bold font-mono text-emerald-900">{strongHireCount}</div>
            <span className="text-[11px] text-emerald-700 font-sans font-semibold">
              {totalApplicants > 0 ? Math.round((strongHireCount / totalApplicants) * 100) : 0}% Siap Offer
            </span>
          </div>
        </div>
      </Card>

      {/* Two-Column Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Scores by Job Position */}
        <Card elevation="flat" className="p-5 border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-heading font-bold text-ink tracking-tight">
              Rata-rata Skor per Posisi Lowongan
            </h3>
            <span className="text-xs text-slate-400 font-sans">CV vs Wawancara</span>
          </div>

          <div className="space-y-4">
            {scoresByPosition.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada data skor posisi yang tercatat.
              </div>
            ) : (
              scoresByPosition.map(pos => (
                <div key={pos.position} className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-semibold text-slate-800 font-sans">{pos.position}</span>
                    <span className="text-slate-500 text-[11px] font-sans">
                      CV: <strong className="font-mono text-primary-navy">{pos.avgCv}</strong> &bull; WCR: <strong className="font-mono text-emerald-800">{pos.avgWcr}</strong>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded h-1.5 overflow-hidden">
                      <div 
                        className="bg-primary-navy h-1.5 rounded transition-all duration-500" 
                        style={{ width: `${pos.avgCv}%` }} 
                        title={`CV ATS: ${pos.avgCv}%`}
                      />
                    </div>
                    <div className="w-full bg-slate-100 rounded h-1.5 overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-1.5 rounded transition-all duration-500" 
                        style={{ width: `${pos.avgWcr}%` }} 
                        title={`Wawancara AI: ${pos.avgWcr}%`}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Demographics & Education */}
        <Card elevation="flat" className="p-5 border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-heading font-bold text-ink tracking-tight">
              Distribusi Pendidikan &amp; Demografi
            </h3>
            <Badge variant="navy" format="soft" className="text-xs">
              {totalApplicants} Pelamar
            </Badge>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-700 font-sans">Jenjang Pendidikan Terakhir</h4>
            <div className="space-y-2">
              {educationDist.map(item => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-sans">
                    <span className="text-slate-700">{item.name}</span>
                    <span className="text-slate-500 font-mono text-[11px]">{item.count} kandidat ({item.pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded h-1.5 overflow-hidden">
                    <div 
                      className="bg-primary-navy h-1.5 rounded transition-all" 
                      style={{ width: `${item.pct}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-700 mb-2 font-sans">Rasio Gender</h4>
              <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-slate-500 block text-[10px] uppercase font-sans">Pria</span>
                  <span className="text-sm font-bold font-mono text-slate-900">{genderDist.pria} ({genderDist.priaPct}%)</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-slate-500 block text-[10px] uppercase font-sans">Wanita</span>
                  <span className="text-sm font-bold font-mono text-slate-900">{genderDist.wanita} ({genderDist.wanitaPct}%)</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
