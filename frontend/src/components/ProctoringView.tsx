import React, { useState, useMemo, useDeferredValue } from 'react';
import { 
  ShieldAlert, ShieldCheck, AlertTriangle, Eye, Download, 
  Search, Filter, Clock, CheckCircle2, X
} from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/Table';
import { downloadCsvFile } from '../utils/csvExport';
import { AdminStatCard, AdminEmptyState } from './admin/AdminStatCard';

const formatIncidentLabel = (type: string) => {
  const normalized = (type || '').toLowerCase();
  if (normalized === 'face_verified') return 'Wajah terverifikasi';
  if (normalized === 'tab_switch' || normalized === 'visibility_change') return 'Pindah tab';
  if (normalized === 'window_blur' || normalized === 'blur') return 'Kehilangan fokus jendela';
  if (normalized === 'multiple_faces') return 'Terdeteksi lebih dari 1 wajah';
  if (normalized === 'no_face' || normalized === 'face_missing') return 'Wajah tidak terlihat';
  if (normalized === 'fullscreen_exit') return 'Keluar layar penuh';
  return (type || 'Anomali').replace(/_/g, ' ');
};

interface Applicant {
  id: string;
  fullName: string;
  email: string;
  appliedPosition: string;
  job?: { title: string } | null;
  interviewStatus: string;
  interviewScore: number | null;
  interviewTranscript: string | null;
  proctorFlags: string | null;
  proctoringSummary?: {
    totalEvents: number;
    validCount: number;
    falsePositiveCount: number;
    pendingCount: number;
  } | null;
  examAttempt?: {
    programCode?: string;
    status?: string;
    score?: number | null;
    integrityScore?: number | null;
    submittedAt?: string | null;
  } | null;
  createdAt: string;
}

interface ProctoringViewProps {
  applicants: Applicant[];
  onViewApplicant: (applicant: Applicant) => void;
}

interface ProctorViolationEvent {
  eventId?: string;
  source?: 'exam' | 'interview';
  type: string;
  timestamp?: string;
  time?: string;
  message?: string;
  reviewStatus?: 'valid' | 'false_positive' | 'pending' | 'info';
  assessorNotes?: string;
}

const isBenignEvent = (type?: string) =>
  ['face_verified', 'PERIODIC_SNAPSHOT', 'VERIFIKASI_BERKALA'].includes(String(type || ''));

export default function ProctoringView({ applicants, onViewApplicant }: ProctoringViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'CLEAN' | 'WARNING' | 'HIGH_RISK' | 'REVIEWED' | 'UNINTERVIEWED'>('ALL');
  const [inspectingApplicant, setInspectingApplicant] = useState<Applicant | null>(null);

  // Parse proctor flags (excluding benign periodic face check snapshots from violations)
  const parseFlags = (flags: string | null, includeBenign = false): ProctorViolationEvent[] => {
    if (!flags) return [];
    try {
      const parsed = JSON.parse(flags);
      const arr: ProctorViolationEvent[] = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray(parsed.violations)
          ? parsed.violations
          : [];
      return includeBenign ? arr : arr.filter((ev) => !isBenignEvent(ev?.type));
    } catch {
      return [];
    }
  };

  // Helper to check if candidate has completed CAT exam or interview session
  const isSessionActiveOrDone = (applicant: Applicant): boolean => {
    return (
      applicant.interviewStatus === 'completed' ||
      applicant.interviewStatus === 'scored' ||
      applicant.interviewStatus === 'in_progress' ||
      Boolean(applicant.examAttempt) ||
      Boolean(applicant.interviewTranscript && applicant.interviewTranscript.length > 0) ||
      (applicant.interviewScore !== null && applicant.interviewScore !== undefined && applicant.interviewScore > 0)
    );
  };

  const isInterviewDone = (applicant: Applicant): boolean => {
    return (
      applicant.interviewStatus === 'completed' ||
      applicant.interviewStatus === 'scored' ||
      ['submitted', 'graded', 'completed'].includes(String(applicant.examAttempt?.status || '')) ||
      (applicant.interviewScore !== null && applicant.interviewScore !== undefined && applicant.interviewScore > 0)
    );
  };

  // Monitored sessions list (includes CAT exam + Interview sessions)
  const interviewSessions = useMemo(() => {
    return applicants.filter((a) => isSessionActiveOrDone(a));
  }, [applicants]);

  // Telemetry Metrics
  const telemetry = useMemo(() => {
    let totalViolations = 0;
    let cleanSessions = 0;
    let highRiskSessions = 0;
    let completedCount = 0;

    interviewSessions.forEach(a => {
      if (!isInterviewDone(a)) return;
      completedCount++;
      const flags = parseFlags(a.proctorFlags).filter((f) => f.reviewStatus !== 'false_positive');
      totalViolations += flags.length;
      if (flags.length === 0) cleanSessions++;
      if (flags.length >= 3) highRiskSessions++;
    });

    const complianceRate = completedCount > 0
      ? Math.round((cleanSessions / completedCount) * 100)
      : 100;

    return {
      totalSessions: interviewSessions.length,
      complianceRate,
      totalViolations,
      highRiskSessions
    };
  }, [interviewSessions]);

  const filteredSessions = useMemo(() => {
    const q = deferredSearchQuery.toLowerCase();
    return interviewSessions.filter(a => {
      const isDone = isInterviewDone(a);
      const rawFlags = parseFlags(a.proctorFlags);
      const effectiveFlags = rawFlags.filter((f) => f.reviewStatus !== 'false_positive');
      const hasTrainerReview = rawFlags.some(
        (f) => f.reviewStatus === 'valid' || f.reviewStatus === 'false_positive'
      );
      const matchesSearch =
        !q ||
        a.fullName.toLowerCase().includes(q) ||
        (a.job?.title || a.appliedPosition).toLowerCase().includes(q);
      
      let matchesRisk = true;
      if (filterRisk === 'CLEAN') matchesRisk = isDone && effectiveFlags.length === 0;
      if (filterRisk === 'WARNING') matchesRisk = isDone && effectiveFlags.length >= 1 && effectiveFlags.length <= 2;
      if (filterRisk === 'HIGH_RISK') matchesRisk = isDone && effectiveFlags.length >= 3;
      if (filterRisk === 'REVIEWED') matchesRisk = hasTrainerReview;
      if (filterRisk === 'UNINTERVIEWED') matchesRisk = !isDone;

      return matchesSearch && matchesRisk;
    });
  }, [interviewSessions, deferredSearchQuery, filterRisk]);

  const getRiskBadge = (count: number, isDone: boolean = true) => {
    if (!isDone) {
      return {
        label: 'BELUM WAWANCARA',
        className: 'bg-slate-100 text-slate-700 border-slate-200'
      };
    }
    if (count === 0) {
      return {
        label: 'INTEGRITAS BERSIH',
        className: 'bg-emerald-50 text-emerald-800 border-emerald-200'
      };
    }
    if (count <= 2) {
      return {
        label: `PERINGATAN (${count} INSIDEN)`,
        className: 'bg-amber-50 text-amber-800 border-amber-200'
      };
    }
    return {
      label: `RISIKO TINGGI (${count} INSIDEN)`,
      className: 'bg-rose-50 text-rose-800 border-rose-200'
    };
  };

  const handleExportProctorLog = () => {
    const headers = ['Nama Kandidat', 'Posisi', 'Status Sesi', 'Status Integritas', 'Jumlah Pelanggaran', 'Skor Wawancara', 'Log Rincian'];
    const rows = filteredSessions.map(s => {
      const isDone = isInterviewDone(s);
      const flags = parseFlags(s.proctorFlags);
      const integrityStatus = !isDone ? 'BELUM WAWANCARA' : flags.length === 0 ? 'INTEGRITAS BERSIH' : flags.length >= 3 ? 'RISIKO TINGGI' : 'PERINGATAN';
      const flagCount = !isDone ? '-' : flags.length;
      return [
        `"${s.fullName}"`,
        `"${s.job?.title || s.appliedPosition}"`,
        `"${s.interviewStatus}"`,
        `"${integrityStatus}"`,
        flagCount,
        s.interviewScore ? `${s.interviewScore}/100` : (!isDone ? 'Belum Wawancara' : 'Belum Dinilai'),
        `"${flags.map(f => f.type).join('; ')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    downloadCsvFile(csvContent, `audit_proctoring_${Date.now()}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Telemetry Metric Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <AdminStatCard
          label="Total Sesi Terpantau"
          value={telemetry.totalSessions}
          subtext="Kandidat wawancara"
          badge="Real-time"
          badgeVariant="info"
          icon={Eye}
        />
        <AdminStatCard
          label="Kepatuhan Integritas"
          value={`${telemetry.complianceRate}%`}
          subtext="Bebas pelanggaran"
          badge="Audit AI"
          badgeVariant="success"
          icon={ShieldCheck}
        />
        <AdminStatCard
          label="Total Pelanggaran"
          value={telemetry.totalViolations}
          subtext="Event tab switch / blur"
          badge="Anomali"
          badgeVariant="warning"
          icon={AlertTriangle}
          valueColorClass={telemetry.totalViolations > 0 ? 'text-[#D97706]' : undefined}
        />
        <AdminStatCard
          label="Sesi Risiko Tinggi"
          value={telemetry.highRiskSessions}
          subtext="Kandidat dengan flag ≥ 3x"
          badge="Prioritas"
          badgeVariant="danger"
          icon={ShieldAlert}
          valueColorClass={telemetry.highRiskSessions > 0 ? 'text-[#DC2626]' : undefined}
        />
      </div>

      {/* Control Bar */}
      <Card elevation="flat" className="p-4 border-[#E2E8F0] rounded-xl flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        <div className="flex flex-wrap flex-1 items-center gap-3 min-w-0">
          <div className="relative w-full sm:w-[220px] shrink-0">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari sesi audit kandidat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:bg-white focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-colors font-sans"
            />
          </div>
          <div className="inline-flex flex-wrap items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg text-xs font-sans">
            <button
              type="button"
              onClick={() => setFilterRisk('ALL')}
              className={`h-8 px-3 rounded-md transition-colors cursor-pointer ${filterRisk === 'ALL' ? 'bg-[#1E3A8A] text-white font-semibold' : 'text-[#475569] hover:text-[#0F172A]'}`}
            >
              Semua ({interviewSessions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterRisk('CLEAN')}
              className={`h-8 px-3 rounded-md transition-colors cursor-pointer ${filterRisk === 'CLEAN' ? 'bg-[#1E3A8A] text-white font-semibold' : 'text-[#475569] hover:text-[#0F172A]'}`}
            >
              Bersih
            </button>
            <button
              type="button"
              onClick={() => setFilterRisk('WARNING')}
              className={`h-8 px-3 rounded-md transition-colors cursor-pointer ${filterRisk === 'WARNING' ? 'bg-[#1E3A8A] text-white font-semibold' : 'text-[#475569] hover:text-[#0F172A]'}`}
            >
              Peringatan
            </button>
            <button
              type="button"
              onClick={() => setFilterRisk('HIGH_RISK')}
              className={`h-8 px-3 rounded-md transition-colors cursor-pointer ${filterRisk === 'HIGH_RISK' ? 'bg-[#1E3A8A] text-white font-semibold' : 'text-[#475569] hover:text-[#0F172A]'}`}
            >
              Risiko Tinggi
            </button>
            <button
              type="button"
              onClick={() => setFilterRisk('REVIEWED')}
              className={`h-8 px-3 rounded-md transition-colors cursor-pointer ${filterRisk === 'REVIEWED' ? 'bg-[#1E3A8A] text-white font-semibold' : 'text-[#475569] hover:text-[#0F172A]'}`}
            >
              Direview Trainer
            </button>
            <button
              type="button"
              onClick={() => setFilterRisk('UNINTERVIEWED')}
              className={`h-8 px-3 rounded-md transition-colors cursor-pointer ${filterRisk === 'UNINTERVIEWED' ? 'bg-[#1E3A8A] text-white font-semibold' : 'text-[#475569] hover:text-[#0F172A]'}`}
            >
              Belum Selesai
            </button>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleExportProctorLog}
          className="h-10 px-4 rounded-lg border-[#E2E8F0] text-[#475569] shrink-0"
          leftIcon={<Download className="w-4 h-4" />}
        >
          Ekspor Log CSV
        </Button>
      </Card>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.08)] overflow-x-auto">
      <Table className="w-full min-w-[880px]">
        <TableHeader className="sticky top-0 z-10 bg-white">
          <TableRow className="border-b border-[#E2E8F0]">
            <TableHead className="w-[260px] text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Kandidat &amp; Posisi</TableHead>
            <TableHead className="w-[150px] text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Status Integritas</TableHead>
            <TableHead className="w-[90px] text-center text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Flag</TableHead>
            <TableHead className="min-w-[220px] text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Rincian Insiden</TableHead>
            <TableHead className="w-[110px] text-right text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Skor</TableHead>
            <TableHead className="w-[130px] text-center text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>
                <AdminEmptyState
                  icon={ShieldCheck}
                  title="Belum ada sesi audit"
                  description="Tidak ada sesi audit integritas yang sesuai dengan kriteria filter."
                />
              </TableCell>
            </TableRow>
          ) : (
            filteredSessions.map(session => {
              const isDone = isInterviewDone(session);
              const allNonBenignFlags = parseFlags(session.proctorFlags);
              const flags = allNonBenignFlags.filter((f) => f.reviewStatus !== 'false_positive');
              const validReviews = allNonBenignFlags.filter((f) => f.reviewStatus === 'valid').length;
              const falsePosReviews = allNonBenignFlags.filter((f) => f.reviewStatus === 'false_positive').length;
              const statusClass = !isDone
                ? 'bg-[#F1F5F9] text-[#475569]'
                : flags.length === 0
                  ? 'bg-[#DCFCE7] text-[#166534]'
                  : flags.length >= 3
                    ? 'bg-[#FEE2E2] text-[#991B1B]'
                    : 'bg-[#FEF3C7] text-[#92400E]';
              const badgeLabel = !isDone
                ? 'Belum Selesai'
                : flags.length === 0
                  ? 'Integritas Bersih'
                  : flags.length >= 3
                    ? 'Risiko Tinggi'
                    : 'Peringatan';

              return (
                <TableRow key={session.id} className="h-16 hover:bg-[#F8FAFC] transition-colors">
                  <TableCell className="w-[260px] max-w-[260px] font-sans">
                    <div className="font-semibold text-sm text-[#0F172A] truncate" title={session.fullName}>
                      {session.fullName}
                    </div>
                    <div className="text-xs text-[#64748B] font-sans line-clamp-2 mt-0.5" title={session.job?.title || session.appliedPosition}>
                      {session.job?.title || session.appliedPosition}
                    </div>
                    {session.examAttempt?.integrityScore != null && (
                      <div className="text-[11px] font-mono text-[#1E3A8A] mt-0.5">
                        Integritas CAT: {session.examAttempt.integrityScore}/100
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="w-[150px]">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${statusClass}`}>
                        {badgeLabel}
                      </span>
                      {(validReviews > 0 || falsePosReviews > 0) && (
                        <div className="text-[10px] text-slate-600 font-medium">
                          Trainer: {validReviews} valid • {falsePosReviews} false+
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="w-[90px] text-center font-semibold font-mono text-sm text-[#0F172A] tabular-nums">
                    {!isDone ? <span className="text-[#64748B] font-normal">-</span> : flags.length}
                  </TableCell>
                  <TableCell className="font-sans text-xs text-[#475569]">
                    {!isDone ? (
                      <span className="text-[#64748B]">Sesi CAT / wawancara sedang berjalan</span>
                    ) : allNonBenignFlags.length === 0 ? (
                      <span className="text-[#166534] font-medium">Kandidat fokus penuh selama asesmen</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {allNonBenignFlags.slice(0, 2).map((f, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${
                              f.reviewStatus === 'false_positive'
                                ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                                : f.reviewStatus === 'valid'
                                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                                  : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A]'
                            }`}
                          >
                            <span className="text-[10px] font-mono uppercase text-slate-400">
                              {f.source === 'exam' ? 'CAT' : 'INT'}
                            </span>
                            <span>{formatIncidentLabel(f.type)}</span>
                            {f.timestamp && (
                              <span className="font-mono text-[#64748B]">• {f.timestamp.slice(11, 19)}</span>
                            )}
                          </span>
                        ))}
                        {allNonBenignFlags.length > 2 && (
                          <span className="text-xs text-[#64748B] font-mono self-center">
                            +{allNonBenignFlags.length - 2} lainnya
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="w-[110px] text-right">
                    {session.interviewScore ? (
                      <span className="font-semibold font-mono text-sm text-[#0F172A] tabular-nums">
                        {session.interviewScore}/100
                      </span>
                    ) : (
                      <span className="text-[#64748B] text-xs">
                        {session.interviewStatus === 'completed' ? 'Belum Dinilai' : '-'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="w-[130px] text-center">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setInspectingApplicant(session)}
                      className="h-8 px-3 rounded-lg border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]"
                    >
                      Inspeksi Log
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>

      {/* Inspecting Modal */}
      {inspectingApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary-navy" />
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  Rincian Telemetri Integritas Sesi
                </h3>
              </div>
              <button
                onClick={() => setInspectingApplicant(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-base font-bold text-slate-900">{inspectingApplicant.fullName}</h4>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  {inspectingApplicant.job?.title || inspectingApplicant.appliedPosition} &bull; {inspectingApplicant.email}
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Status Wawancara:</span>
                  <span className="font-semibold text-slate-800 font-mono uppercase">
                    {!isInterviewDone(inspectingApplicant) ? 'BELUM WAWANCARA' : inspectingApplicant.interviewStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Skor AI:</span>
                  <span className="font-semibold text-slate-800 font-mono">{inspectingApplicant.interviewScore ? `${inspectingApplicant.interviewScore} / 100` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Total Pelanggaran:</span>
                  <span className={`font-semibold font-mono ${!isInterviewDone(inspectingApplicant) ? 'text-slate-500' : parseFlags(inspectingApplicant.proctorFlags).length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {!isInterviewDone(inspectingApplicant) 
                      ? 'Belum ada rekaman (Belum Wawancara)' 
                      : `${parseFlags(inspectingApplicant.proctorFlags).length} insiden tercatat`}
                  </span>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2 font-sans">
                  Timeline Insiden Browser
                </h5>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto bg-white">
                  {!isInterviewDone(inspectingApplicant) ? (
                    <div className="py-4 text-center text-xs text-slate-400 font-sans">
                      Kandidat belum melaksanakan sesi wawancara. Belum ada telemetri browser yang terekam.
                    </div>
                  ) : parseFlags(inspectingApplicant.proctorFlags).length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400 font-sans">
                      Sesi 100% patuh, tidak ada insiden pelanggaran tercatat.
                    </div>
                  ) : (
                    parseFlags(inspectingApplicant.proctorFlags).map((ev, idx) => (
                      <div key={idx} className="p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                              {ev.source === 'exam' ? 'Ujian CAT' : 'Wawancara'}
                            </span>
                            <span className="font-medium text-slate-800 font-sans truncate">
                              {formatIncidentLabel(ev.type)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {ev.reviewStatus === 'valid' && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                Valid (Trainer)
                              </span>
                            )}
                            {ev.reviewStatus === 'false_positive' && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                False Positive
                              </span>
                            )}
                            {(!ev.reviewStatus || ev.reviewStatus === 'pending') && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                Pending Review
                              </span>
                            )}
                            <span className="text-[11px] font-mono text-slate-400">
                              {ev.timestamp || ev.time || '-'}
                            </span>
                          </div>
                        </div>
                        {ev.assessorNotes && (
                          <p className="text-[11px] text-slate-500 pl-5 italic">
                            Catatan Trainer: {ev.assessorNotes}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setInspectingApplicant(null)}
                >
                  Tutup
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const target = inspectingApplicant;
                    setInspectingApplicant(null);
                    onViewApplicant(target);
                  }}
                >
                  Buka Transkrip Lengkap
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
