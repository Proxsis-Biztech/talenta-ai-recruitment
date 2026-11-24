import React, { useMemo } from 'react';
import { Printer } from 'lucide-react';
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
    return applicants.filter(a => ['completed', 'scored'].includes(a.interviewStatus)).length;
  }, [applicants]);

  const scoredCount = useMemo(() => {
    return applicants.filter(
      a => ['completed', 'scored'].includes(a.interviewStatus) || (a.interviewScore != null && a.interviewScore > 0)
    ).length;
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
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] font-heading tracking-tight">
            Analitika &amp; Metrik
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Visualisasi funnel konversi rekrutmen, komposisi pipeline, dan tren pendaftaran kandidat.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handlePrint}
          className="h-10 px-4 rounded-lg border-[#E2E8F0] text-[#475569] min-w-fit whitespace-nowrap"
          leftIcon={<Printer className="w-4 h-4" />}
        >
          Cetak Ringkasan
        </Button>
      </div>

      {/* Funnel Conversion Ribbon (4 uniform white cards + conversion ratio arrows) */}
      <Card elevation="flat" className="p-6 border-[#E2E8F0] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
        <h3 className="text-base font-heading font-semibold text-[#0F172A] tracking-tight mb-4">
          Funnel Konversi Bakat
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: '1. Pendaftaran Masuk',
              value: totalApplicants,
              pct: '100% total pelamar',
              conv: totalApplicants > 0 ? `${Math.round((interviewedCount / totalApplicants) * 100)}% →` : null,
            },
            {
              step: '2. Sesi Wawancara AI',
              value: interviewedCount,
              pct: `${totalApplicants > 0 ? Math.round((interviewedCount / totalApplicants) * 100) : 0}% selesai sesi`,
              conv: interviewedCount > 0 ? `${Math.round((scoredCount / interviewedCount) * 100)}% →` : null,
            },
            {
              step: '3. Sudah Dinilai',
              value: scoredCount,
              pct: `${totalApplicants > 0 ? Math.round((scoredCount / totalApplicants) * 100) : 0}% terhitung AI`,
              conv: scoredCount > 0 ? `${Math.round((strongHireCount / scoredCount) * 100)}% →` : null,
            },
            {
              step: '4. Direkomendasikan',
              value: strongHireCount,
              pct: `${totalApplicants > 0 ? Math.round((strongHireCount / totalApplicants) * 100) : 0}% siap offer`,
              conv: null,
            },
          ].map((item) => (
            <div key={item.step} className="relative p-5 rounded-xl border border-[#E2E8F0] bg-white space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase font-semibold tracking-wider text-[#64748B] truncate">
                  {item.step}
                </span>
                {item.conv && (
                  <span className="text-[11px] font-mono font-semibold text-[#2563EB] bg-[#EEF2FF] px-2 py-0.5 rounded-full shrink-0">
                    {item.conv}
                  </span>
                )}
              </div>
              <div className="text-[30px] leading-tight font-bold text-[#0F172A] tabular-nums font-heading">
                {item.value.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-[#64748B]">{item.pct}</p>
            </div>
          ))}
        </div>
      </Card>

      <AdminAnalyticsCharts applicants={applicants} />

    </div>
  );
}
