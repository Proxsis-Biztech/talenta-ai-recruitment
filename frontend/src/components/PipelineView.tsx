import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Sparkles, Brain, Award, ShieldAlert,
  ArrowRight, FileText, ChevronRight, User, CheckCircle2,
  Clock, AlertCircle, RefreshCw
} from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';

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
    recommendation: 'STRONG HIRE' | 'RECOMMENDED HIRE' | 'CONSIDER' | 'NOT RECOMMENDED';
  };
}

interface PipelineViewProps {
  applicants: Applicant[];
  onViewApplicant: (applicant: Applicant) => void;
  onScreenCV: (applicantId: string) => Promise<void>;
  onScoreInterview: (applicantId: string) => Promise<void>;
  onOpenDecision: (applicant: Applicant) => void;
  onRefresh: () => void;
  screeningLoading?: boolean;
  scoringLoading?: boolean;
}

export default function PipelineView({
  applicants,
  onViewApplicant,
  onScreenCV,
  onScoreInterview,
  onOpenDecision,
  onRefresh,
  screeningLoading = false,
  scoringLoading = false
}: PipelineViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
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
    return applicants.filter(a => {
      const matchesSearch = 
        a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.job?.title || a.appliedPosition).toLowerCase().includes(searchQuery.toLowerCase());
      const pos = a.job?.title || a.appliedPosition;
      const matchesRole = selectedRole === 'ALL' || pos === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [applicants, searchQuery, selectedRole]);

  // Stage 1: Pending Screening
  const stagePending = useMemo(() => {
    return filtered.filter(a => a.screeningStatus === 'pending');
  }, [filtered]);

  // Stage 2: Interview In Progress / Scheduled
  const stageInterview = useMemo(() => {
    return filtered.filter(a => 
      a.screeningStatus === 'success' && 
      (a.interviewStatus === 'in_progress' || a.interviewStatus === 'not_started')
    );
  }, [filtered]);

  // Stage 3: Interview Completed (Needs Scoring)
  const stageNeedsScoring = useMemo(() => {
    return filtered.filter(a => 
      a.interviewStatus === 'completed' && (!a.interviewScore || a.interviewScore === 0)
    );
  }, [filtered]);

  // Stage 4: Scored / Decision Ready
  const stageDecisionReady = useMemo(() => {
    return filtered.filter(a => 
      (a.interviewScore && a.interviewScore > 0) || a.compositeEvaluation != null
    );
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
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Telemetry Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card elevation="flat" className="p-4 border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total di Pipeline
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">{filtered.length}</span>
            <span className="text-xs text-slate-500">Kandidat</span>
          </div>
        </Card>

        <Card elevation="flat" className="p-4 border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Antrean ATS CV
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-amber-600">{stagePending.length}</span>
            <span className="text-xs text-amber-700 font-semibold">Perlu Screening</span>
          </div>
        </Card>

        <Card elevation="flat" className="p-4 border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Wawancara Berjalan / Siap
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-blue-600">{stageInterview.length + stageNeedsScoring.length}</span>
            <span className="text-xs text-slate-500">Fase Wawancara</span>
          </div>
        </Card>

        <Card elevation="flat" className="p-4 border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Keputusan Siap Rilis
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-primary-navy">{stageDecisionReady.length}</span>
            <span className="text-xs text-primary-navy font-semibold">Evaluasi Final</span>
          </div>
        </Card>
      </div>

      {/* Top Filter Bar */}
      <Card elevation="flat" className="p-4 border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Cari pelamar atau posisi di pipeline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-navy focus:border-primary-navy transition-colors font-sans"
            />
          </div>
          <div className="relative">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-navy transition-colors font-sans cursor-pointer"
            >
              <option value="ALL">Semua Lowongan</option>
              {availablePositions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            leftIcon={<RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
          >
            Refresh Pipeline
          </Button>
        </div>
      </Card>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {/* Column 1: Screening CV Pending */}
        <div className="bg-slate-50/80 border border-slate-200 border-t-2 border-t-amber-500 rounded-xl flex flex-col max-h-[calc(100vh-240px)] shadow-xs">
          <div className="p-3.5 border-b border-slate-200 bg-white rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h3 className="text-xs font-bold tracking-wider text-slate-800 uppercase font-sans">
                1. Antrean ATS CV
              </h3>
            </div>
            <Badge variant="warning" format="soft" isMonospace>
              {stagePending.length}
            </Badge>
          </div>

          <div className="p-3 overflow-y-auto space-y-3 flex-1">
            {stagePending.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Tidak ada antrean CV pending
              </div>
            ) : (
              stagePending.map(applicant => (
                <div 
                  key={applicant.id}
                  className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs hover:border-primary-navy transition-all space-y-2 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 leading-snug group-hover:text-primary-navy transition-colors">
                        {applicant.fullName}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {applicant.job?.title || applicant.appliedPosition}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                      {applicant.education}
                    </span>
                    {applicant.gpa && (
                      <span className="font-mono text-slate-600">IPK {applicant.gpa.toFixed(2)}</span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onViewApplicant(applicant)}
                    >
                      Dossier
                    </Button>
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => onScreenCV(applicant.id)}
                      disabled={screeningLoading}
                      leftIcon={<Sparkles className="w-3 h-3" />}
                    >
                      Screen AI
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Interview In Progress / Scheduled */}
        <div className="bg-slate-50/80 border border-slate-200 border-t-2 border-t-blue-500 rounded-xl flex flex-col max-h-[calc(100vh-240px)] shadow-xs">
          <div className="p-3.5 border-b border-slate-200 bg-white rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h3 className="text-xs font-bold tracking-wider text-slate-800 uppercase font-sans">
                2. Sesi Wawancara AI
              </h3>
            </div>
            <Badge variant="info" format="soft" isMonospace>
              {stageInterview.length}
            </Badge>
          </div>

          <div className="p-3 overflow-y-auto space-y-3 flex-1">
            {stageInterview.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Tidak ada kandidat di tahap ini
              </div>
            ) : (
              stageInterview.map(applicant => (
                <div 
                  key={applicant.id}
                  className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs hover:border-primary-navy transition-all space-y-2 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 leading-snug group-hover:text-primary-navy transition-colors">
                        {applicant.fullName}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {applicant.job?.title || applicant.appliedPosition}
                      </p>
                    </div>
                    {applicant.screeningScore && (
                      <Badge variant="success" format="soft" isMonospace>
                        CV {applicant.screeningScore}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                      <Clock className="w-3 h-3" />
                      {applicant.interviewStatus === 'in_progress' ? 'Sedang Berlangsung' : 'Terjadwal / Belum Mulai'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onViewApplicant(applicant)}
                    >
                      Buka Profil
                    </Button>
                    <span className="text-[11px] text-slate-400">
                      Live Gateway
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Interview Completed (Needs Scoring) */}
        <div className="bg-slate-50/80 border border-slate-200 border-t-2 border-t-blue-accent rounded-xl flex flex-col max-h-[calc(100vh-240px)] shadow-xs">
          <div className="p-3.5 border-b border-slate-200 bg-white rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-accent" />
              <h3 className="text-xs font-bold tracking-wider text-slate-800 uppercase font-sans">
                3. Perlu Skoring AI
              </h3>
            </div>
            <Badge variant="navy" format="soft" isMonospace>
              {stageNeedsScoring.length}
            </Badge>
          </div>

          <div className="p-3 overflow-y-auto space-y-3 flex-1">
            {stageNeedsScoring.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Semua wawancara sudah dinilai
              </div>
            ) : (
              stageNeedsScoring.map(applicant => (
                <div 
                  key={applicant.id}
                  className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs hover:border-primary-navy transition-all space-y-2 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 leading-snug group-hover:text-primary-navy transition-colors">
                        {applicant.fullName}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {applicant.job?.title || applicant.appliedPosition}
                      </p>
                    </div>
                    {applicant.screeningScore && (
                      <Badge variant="neutral" format="soft" isMonospace>
                        CV {applicant.screeningScore}
                      </Badge>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Transkrip Wawancara Siap</span>
                    {getProctorViolations(applicant.proctorFlags) > 0 && (
                      <Badge variant="danger" format="soft" isMonospace hasDot>
                        <ShieldAlert className="w-3 h-3" />
                        {getProctorViolations(applicant.proctorFlags)}x flag
                      </Badge>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onViewApplicant(applicant)}
                    >
                      Transkrip
                    </Button>
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => onScoreInterview(applicant.id)}
                      disabled={scoringLoading}
                      leftIcon={<Brain className="w-3 h-3" />}
                    >
                      Hitung Nilai AI
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 4: Scored / Decision Ready */}
        <div className="bg-slate-50/80 border border-slate-200 border-t-2 border-t-primary-navy rounded-xl flex flex-col max-h-[calc(100vh-240px)] shadow-xs">
          <div className="p-3.5 border-b border-slate-200 bg-white rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-navy" />
              <h3 className="text-xs font-bold tracking-wider text-slate-800 uppercase font-sans">
                4. Keputusan Rekrutmen
              </h3>
            </div>
            <Badge variant="navy" format="soft" isMonospace>
              {stageDecisionReady.length}
            </Badge>
          </div>

          <div className="p-3 overflow-y-auto space-y-3 flex-1">
            {stageDecisionReady.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada kandidat di tahap final
              </div>
            ) : (
              stageDecisionReady.map(applicant => {
                const rec = applicant.compositeEvaluation?.recommendation;
                const compScore = applicant.compositeEvaluation?.compositeScore;
                return (
                  <div 
                    key={applicant.id}
                    className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs hover:border-primary-navy transition-all space-y-2.5 group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 leading-snug group-hover:text-primary-navy transition-colors">
                          {applicant.fullName}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {applicant.job?.title || applicant.appliedPosition}
                        </p>
                      </div>
                      {compScore !== undefined && (
                        <div className="text-right">
                          <span className="text-base font-bold font-mono text-blue-accent">
                            {compScore}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">/100</span>
                        </div>
                      )}
                    </div>

                    {rec && (
                      <div className="flex items-center justify-between">
                        <Badge variant={getRecommendationVariant(rec)} format="soft">
                          {rec}
                        </Badge>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                          <span>CV:{applicant.screeningScore || '-'}</span>
                          <span>WCR:{applicant.interviewScore || '-'}</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onViewApplicant(applicant)}
                      >
                        Dossier
                      </Button>
                      <Button
                        variant="accentSubtle"
                        size="xs"
                        onClick={() => onOpenDecision(applicant)}
                        leftIcon={<FileText className="w-3 h-3" />}
                      >
                        Surat Keputusan
                      </Button>
                    </div>
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
