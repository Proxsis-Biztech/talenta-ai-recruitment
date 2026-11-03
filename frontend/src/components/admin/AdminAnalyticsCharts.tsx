import React, { useMemo } from 'react';
import { PieChart, TrendingUp } from 'lucide-react';

interface Applicant {
  id: string;
  createdAt?: string;
  appliedPosition: string;
  job?: { title: string } | null;
  screeningStatus: string;
  interviewStatus: string;
  interviewScore: number | null;
  compositeEvaluation?: {
    recommendation: 'STRONG HIRE' | 'RECOMMENDED HIRE' | 'CONSIDER' | 'NOT RECOMMENDED';
  };
}

const smoothPath = (points: Array<{ x: number; y: number }>) => {
  if (points.length < 2) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] || points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
};

interface AdminAnalyticsChartsProps {
  applicants: Applicant[];
}

const COLORS = ['#1E3A8A', '#2563EB', '#0EA5E9', '#10B981'];

export function AdminAnalyticsCharts({ applicants }: AdminAnalyticsChartsProps) {
  const total = applicants.length;

  const pipeline = useMemo(() => {
    const screened = applicants.filter((a) => a.screeningStatus === 'success').length;
    const interviewed = applicants.filter((a) => ['completed', 'scored'].includes(a.interviewStatus)).length;
    const recommended = applicants.filter((a) =>
      ['STRONG HIRE', 'RECOMMENDED HIRE'].includes(a.compositeEvaluation?.recommendation || '')
    ).length;
    return [
      { label: 'Terdaftar', value: total, color: COLORS[0] },
      { label: 'Lolos Screening', value: screened, color: COLORS[1] },
      { label: 'Wawancara Selesai', value: interviewed, color: COLORS[2] },
      { label: 'Direkomendasikan', value: recommended, color: COLORS[3] }
    ];
  }, [applicants, total]);

  const donutSegments = useMemo(() => {
    const denominator = Math.max(total, 1);
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    return pipeline.map((item) => {
      const fraction = item.value / denominator;
      const dash = fraction * circumference;
      const segment = { ...item, dash, circumference, offset, radius };
      offset += dash;
      return segment;
    });
  }, [pipeline, total]);

  const monthlyTrend = useMemo(() => {
    const months: Array<{ key: string; label: string; value: number }> = [];
    const now = new Date();
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      months.push({
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString('id-ID', { month: 'short' }),
        value: 0
      });
    }
    for (const applicant of applicants) {
      if (!applicant.createdAt) continue;
      const date = new Date(applicant.createdAt);
      if (Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const bucket = months.find((month) => month.key === key);
      if (bucket) bucket.value += 1;
    }
    return months;
  }, [applicants]);

  const trendMax = Math.max(1, ...monthlyTrend.map((month) => month.value));
  const chartWidth = 420;
  const chartHeight = 150;
  const paddingX = 18;
  const paddingY = 18;
  const stepX = monthlyTrend.length > 1 ? (chartWidth - paddingX * 2) / (monthlyTrend.length - 1) : 0;
  const points = monthlyTrend.map((month, index) => {
    const x = paddingX + index * stepX;
    const y = chartHeight - paddingY - (month.value / trendMax) * (chartHeight - paddingY * 2);
    return { x, y, ...month };
  });
  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1]?.x || paddingX} ${chartHeight - paddingY} L ${paddingX} ${chartHeight - paddingY} Z`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-4 h-4 text-primary-navy" />
          <h3 className="text-sm font-heading font-bold text-ink">Komposisi Pipeline</h3>
        </div>
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <svg viewBox="0 0 140 140" className="w-32 h-32 -rotate-90">
              <circle cx="70" cy="70" r="54" fill="none" stroke="#F1F5F9" strokeWidth="16" />
              {donutSegments.map((segment) => (
                <circle
                  key={segment.label}
                  className="chart-donut-segment"
                  cx="70"
                  cy="70"
                  r={segment.radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.max(0, segment.dash - 4)} ${segment.circumference}`}
                  strokeDashoffset={-segment.offset}
                  style={{ animationDelay: `${pipeline.indexOf(segment) * 90}ms` }}
                >
                  <title>{`${segment.label}: ${segment.value} kandidat`}</title>
                </circle>
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold font-mono text-ink">{total}</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Kandidat</span>
            </div>
          </div>
          <div className="space-y-2 min-w-0">
            {pipeline.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 truncate">{item.label}</span>
                <span className="ml-auto font-mono font-bold text-ink">{item.value}</span>
                <span className="text-[10px] text-slate-400 font-mono w-8 text-right">
                  {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-heading font-bold text-ink">Tren Pendaftaran</h3>
        </div>
        <p className="text-[11px] text-slate-400 mb-2">6 bulan terakhir</p>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-36" role="img" aria-label="Tren pendaftaran enam bulan terakhir">
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={paddingX}
              x2={chartWidth - paddingX}
              y1={paddingY + ratio * (chartHeight - paddingY * 2)}
              y2={paddingY + ratio * (chartHeight - paddingY * 2)}
              stroke="#F1F5F9"
              strokeWidth="1"
            />
          ))}
          <path className="chart-area" d={areaPath} fill="#2563EB" fillOpacity="0.10" />
          <path className="chart-line" d={linePath} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point) => (
            <g key={point.key}>
              <circle className="chart-dot" cx={point.x} cy={point.y} r="4.5" fill="#fff" stroke="#2563EB" strokeWidth="2.5" style={{ animationDelay: `${points.indexOf(point) * 100}ms` }} />
              <text x={point.x} y={chartHeight - 2} textAnchor="middle" fontSize="9" fill="#94A3B8">
                {point.label}
              </text>
              <text x={point.x} y={point.y - 9} textAnchor="middle" fontSize="9" fill="#1E3A8A" fontWeight="700">
                {point.value}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}