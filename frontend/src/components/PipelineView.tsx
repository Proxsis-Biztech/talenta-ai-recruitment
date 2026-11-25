import React, { useState, useMemo, useDeferredValue } from 'react';
import { 
  Search, Filter, Sparkles, Brain, Award, ShieldAlert,
  ArrowRight, FileText, ChevronRight, User, CheckCircle2,
  Clock, AlertCircle, RefreshCw
} from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { AdminStatCard } from './admin/AdminStatCard';

interface Applicant {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  education: string;
  university: string | null;
  major: string | null;
  gpa: number | null;
  cvFileName: string;
  appliedPosition: string;
  screeningStatus: string;
  screeningScore: number | null;
  screeningSummary: string | null;
  job?: { id: string; title: string; description: string } | null;
  interviewResult: string | null;
  interviewTranscript: string | null;
  interviewStatus: string;
  interviewScore: number | null;
  proctorFlags: string | null;
  compositeEvaluation?: {
    compositeScore: number;
    recommendation: 'STRONG HIRE' | 'RECOMMENDED HIRE' | 'CONSIDER' | 'NOT RECOMMENDED' | 'BELUM DINILAI';
  };
}

interface PipelineViewProps {
  applicants: Applicant[];
  onViewApplicant: (applicant: Applicant) => void;
  onScoreInterview: (applicantId: string) => Promise<void>;
  onOpenDecision: (applicant: Applicant) => void;
  onRefresh: () => void;
  screeningLoading?: boolean;
  scoringLoading?: boolean;
}

export default function PipelineView({
  applicants,
  onViewApplicant,
  onScoreInterview,
  onOpenDecision,
  onRefresh,
  scoringLoading = false
}: PipelineViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedRole, setSelectedRole] = useState('ALL');

  // Filter positions
  const availablePositions = useMemo(() => {
    const set = new Set<string>();
    applicants.forEach(a => {
      const pos = a.job?.title || a.appliedPosition;
      if (pos) set.add(pos);
    });
    return Array.from(set);
  }, [applicants]);

  const filtered = useMemo(() => {
    const q = deferredSearchQuery.toLowerCase();
    return applicants.filter(a => {
      const matchesSearch =
        !q ||
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.job?.title || a.appliedPosition).toLowerCase().includes(q);
      const pos = a.job?.title || a.appliedPosition;
      const matchesRole = selectedRole === 'ALL' || pos === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [applicants, deferredSearchQuery, selectedRole]);

  const hasCompletedAiScoring = (a: Applicant) =>
    a.interviewStatus === 'scored' ||
    (a.interviewScore != null && a.interviewScore > 0) ||
    Boolean(a.interviewResult && a.interviewResult.includes('Skor Akhir:'));

  // Stage 1: Interview In Progress / Scheduled (eksklusif)
  const stageInterview = useMemo(() => {
    return filtered.filter(
      (a) =>
        !hasCompletedAiScoring(a) &&
        (a.interviewStatus === 'in_progress' || a.interviewStatus === 'not_started')
    );
  }, [filtered]);

  // Stage 3: Interview Completed (Needs Scoring — belum ada hasil skoring AI)
  const stageNeedsScoring = useMemo(() => {
    return filtered.filter(
      (a) => a.interviewStatus === 'completed' && !hasCompletedAiScoring(a)
    );
  }, [filtered]);

  // Stage 4: Scored / Decision Ready (hanya kandidat yang skoring AI-nya sudah selesai)
  const stageDecisionReady = useMemo(() => {
    return filtered.filter((a) => hasCompletedAiScoring(a));
  }, [filtered]);

  const getRecommendationVariant = (rec?: string): 'teal' | 'success' | 'warning' | 'danger' | 'neutral' => {
    switch (rec) {
      case 'STRONG HIRE':
        return 'teal';
      case 'RECOMMENDED HIRE':
        return 'success';
      case 'CONSIDER':
        return 'warning';
      case 'NOT RECOMMENDED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const getProctorViolations = (flags: string | null) => {
    if (!flags) return 0;
    try {
      const parsed = JSON.parse(flags);
      if (!Array.isArray(parsed)) return 0;
      return parsed.filter(
        (item: any) => !['face_verified', 'PERIODIC_SNAPSHOT', 'VERIFIKASI_BERKALA'].includes(String(item?.type || ''))
      ).length;
    } catch {
      return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Telemetry Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <AdminStatCard
          label="Total di Pipeline"
          value={filtered.length}
          subtext="Kandidat aktif"
          badge="Pipeline"
          badgeVariant="neutral"
          icon={User}
        />
        <AdminStatCard
          label="Wawancara Berjalan / Siap"
          value={stageInterview.length + stageNeedsScoring.length}
          subtext="Fase wawancara & skoring"
          badge="Live Gateway"
          badgeVariant="info"
          icon={Brain}
        />
        <AdminStatCard
          label="Keputusan Siap Rilis"
          value={stageDecisionReady.length}
          subtext="Evaluasi final siap terbit"
          badge="BARS Evaluated"
          badgeVariant="success"
          icon={Award}
        />
      </div>

      {/* Top Filter Bar */}
      <Card elevation="flat" className="px-4 py-3 border-[#E2E8F0] rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap flex-1 items-center gap-3 min-w-0">
          <div className="w-full sm:w-[280px]">
            <Input
              type="text"
              placeholder="Cari pelamar atau posisi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-[#94A3B8]" />}
              className="h-10 rounded-lg"
            />
          </div>
          <div className="w-full sm:w-[200px]">
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="h-10 rounded-lg"
            >
              <option value="ALL">Semua Lowongan</option>
              {availablePositions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </Select>
          </div>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          title="Muat Ulang Pipeline"
          aria-label="Muat Ulang Pipeline"
          className="h-10 w-10 rounded-lg border-[#E2E8F0] text-[#475569] shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </Card>

      {/* Kanban Board Grid */}
      <div className="flex gap-4 overflow-x-auto pb-2 items-start">
        {/* Column 1: Interview In Progress / Scheduled */}
        <div className="min-w-[300px] flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-col max-h-[calc(100vh-240px)]">
          <div className="px-4 py-3 border-b border-[#E2E8F0] bg-white rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] shrink-0" />
              <h3 className="text-[13px] font-semibold text-[#0F172A] truncate">
                Sesi Wawancara AI
              </h3>
            </div>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#F1F5F9] text-[#475569] tabular-nums">
              {stageInterview.length}
            </span>
          </div>

          <div className="p-3 overflow-y-auto space-y-3 flex-1">
            {stageInterview.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                Tidak ada kandidat di tahap ini
              </div>
            ) : (
              stageInterview.map(applicant => (
                <div
                  key={applicant.id}
                  className="bg-white border border-[#E2E8F0] rounded-xl p-4 hover:border-[#2563EB]/60 transition-colors space-y-2.5"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-[#0F172A] truncate" title={applicant.fullName}>
                      {applicant.fullName}
                    </h4>
                    <p className="text-xs text-[#64748B] line-clamp-2 mt-0.5" title={applicant.job?.title || applicant.appliedPosition}>
                      {applicant.job?.title || applicant.appliedPosition}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#E0F2FE] text-[#075985]">
                      <Clock className="w-3 h-3" />
                      {applicant.interviewStatus === 'in_progress' ? 'Sedang Berlangsung' : 'Terjadwal'}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewApplicant(applicant)}
                    className="w-full h-9 rounded-lg border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]"
                  >
                    Buka Profil
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Interview Completed (Needs Scoring) */}
        <div className="min-w-[300px] flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-col max-h-[calc(100vh-240px)]">
          <div className="px-4 py-3 border-b border-[#E2E8F0] bg-white rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] shrink-0" />
              <h3 className="text-[13px] font-semibold text-[#0F172A] truncate">
                Perlu Skoring AI
              </h3>
            </div>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#F1F5F9] text-[#475569] tabular-nums">
              {stageNeedsScoring.length}
            </span>
          </div>

          <div className="p-3 overflow-y-auto space-y-3 flex-1">
            {stageNeedsScoring.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                Semua wawancara sudah dinilai
              </div>
            ) : (
              stageNeedsScoring.map(applicant => (
                <div
                  key={applicant.id}
                  className="bg-white border border-[#E2E8F0] rounded-xl p-4 hover:border-[#2563EB]/60 transition-colors space-y-2.5"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-[#0F172A] truncate" title={applicant.fullName}>
                      {applicant.fullName}
                    </h4>
                    <p className="text-xs text-[#64748B] line-clamp-2 mt-0.5" title={applicant.job?.title || applicant.appliedPosition}>
                      {applicant.job?.title || applicant.appliedPosition}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {applicant.screeningScore && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#F1F5F9] text-[#475569] font-mono tabular-nums">
                        Skor CV {applicant.screeningScore}
                      </span>
                    )}
                    {getProctorViolations(applicant.proctorFlags) > 0 && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#FEE2E2] text-[#991B1B] font-mono tabular-nums">
                        {getProctorViolations(applicant.proctorFlags)}x Flag
                      </span>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onScoreInterview(applicant.id)}
                    disabled={scoringLoading}
                    leftIcon={<Brain className="w-3.5 h-3.5" />}
                    className="w-full h-9 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white"
                  >
                    Hitung Nilai AI
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Scored / Decision Ready */}
        <div className="min-w-[300px] flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-col max-h-[calc(100vh-240px)]">
          <div className="px-4 py-3 border-b border-[#E2E8F0] bg-white rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] shrink-0" />
              <h3 className="text-[13px] font-semibold text-[#0F172A] truncate">
                Keputusan Rekrutmen
              </h3>
            </div>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#F1F5F9] text-[#475569] tabular-nums">
              {stageDecisionReady.length}
            </span>
          </div>

          <div className="p-3 overflow-y-auto space-y-3 flex-1">
            {stageDecisionReady.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                Belum ada kandidat di tahap final
              </div>
            ) : (
              stageDecisionReady.map(applicant => {
                const rec = applicant.compositeEvaluation?.recommendation;
                const compScore = applicant.compositeEvaluation?.compositeScore;
                const recPillClass =
                  rec === 'STRONG HIRE' || rec === 'RECOMMENDED HIRE'
                    ? 'bg-[#DCFCE7] text-[#166534]'
                    : rec === 'CONSIDER'
                      ? 'bg-[#FEF3C7] text-[#92400E]'
                      : 'bg-[#FEE2E2] text-[#991B1B]';

                return (
                  <div
                    key={applicant.id}
                    className="bg-white border border-[#E2E8F0] rounded-xl p-4 hover:border-[#2563EB]/60 transition-colors space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-[#0F172A] truncate" title={applicant.fullName}>
                          {applicant.fullName}
                        </h4>
                        <p className="text-xs text-[#64748B] line-clamp-2 mt-0.5" title={applicant.job?.title || applicant.appliedPosition}>
                          {applicant.job?.title || applicant.appliedPosition}
                        </p>
                      </div>
                      {compScore !== undefined && (
                        <span className="text-sm font-semibold font-mono text-[#0F172A] tabular-nums shrink-0">
                          {compScore}/100
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {rec && (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${recPillClass}`}>
                          {rec}
                        </span>
                      )}
                      {applicant.interviewScore != null && (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#F1F5F9] text-[#475569] tabular-nums">
                          Skor WCR {applicant.interviewScore}
                        </span>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenDecision(applicant)}
                      leftIcon={<FileText className="w-3.5 h-3.5" />}
                      className="w-full h-9 rounded-lg border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]"
                    >
                      Surat Keputusan
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
