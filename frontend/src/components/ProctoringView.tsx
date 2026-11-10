import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, ShieldCheck, AlertTriangle, Eye, Download, 
  Search, Filter, ExternalLink, Clock, CheckCircle2, X
} from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/Table';

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
  createdAt: string;
}

interface ProctoringViewProps {
  applicants: Applicant[];
  onViewApplicant: (applicant: Applicant) => void;
}

interface ProctorViolationEvent {
  type: string;
  timestamp?: string;
  time?: string;
  message?: string;
}

export default function ProctoringView({ applicants, onViewApplicant }: ProctoringViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'CLEAN' | 'WARNING' | 'HIGH_RISK' | 'UNINTERVIEWED'>('ALL');
  const [inspectingApplicant, setInspectingApplicant] = useState<Applicant | null>(null);

  // Parse proctor flags
  const parseFlags = (flags: string | null): ProctorViolationEvent[] => {
    if (!flags) return [];
    try {
      const parsed = JSON.parse(flags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Helper to check if interview was actually completed/scored
  const isInterviewDone = (applicant: Applicant): boolean => {
    return applicant.interviewStatus === 'completed' || 
           applicant.interviewStatus === 'scored' || 
           (applicant.interviewScore !== null && applicant.interviewScore !== undefined && applicant.interviewScore > 0);
  };

  // Interview sessions list
  const interviewSessions = useMemo(() => {
    return applicants.filter(a => a.interviewStatus === 'completed' || a.interviewStatus === 'in_progress' || (a.interviewTranscript && a.interviewTranscript.length > 0));
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
      const flags = parseFlags(a.proctorFlags);
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
    return interviewSessions.filter(a => {
      const isDone = isInterviewDone(a);
      const flags = parseFlags(a.proctorFlags);
      const matchesSearch = 
        a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.job?.title || a.appliedPosition).toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesRisk = true;
      if (filterRisk === 'CLEAN') matchesRisk = isDone && flags.length === 0;
      if (filterRisk === 'WARNING') matchesRisk = isDone && flags.length >= 1 && flags.length <= 2;
      if (filterRisk === 'HIGH_RISK') matchesRisk = isDone && flags.length >= 3;
      if (filterRisk === 'UNINTERVIEWED') matchesRisk = !isDone;

      return matchesSearch && matchesRisk;
    });
  }, [interviewSessions, searchQuery, filterRisk]);

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

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit_proctoring_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      {/* Telemetry Metric Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card elevation="flat" className="admin-card-accent-blue p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl admin-icon-blue text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-semibold border border-blue-200/60">
              Real-time
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans mt-3">
            Total Sesi Terpantau
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {telemetry.totalSessions} <span className="text-xs font-bold text-slate-400 font-sans">Sesi</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Kandidat Wawancara</span>
          </div>
        </Card>

        <Card elevation="flat" className="admin-card-accent-emerald p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl admin-icon-emerald text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200/60">
              Audit AI
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans mt-3">
            Tingkat Kepatuhan Integritas
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
              {telemetry.complianceRate}%
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold">Bebas Pelanggaran</span>
          </div>
        </Card>

        <Card elevation="flat" className="admin-card-accent-amber p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl admin-icon-amber text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-semibold border border-amber-200/60">
              Minor Anomaly
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans mt-3">
            Total Pelanggaran Deteksi
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-amber-700 tracking-tight">
              {telemetry.totalViolations} <span className="text-xs font-bold text-slate-400 font-sans">Event</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Tab Switch / Blur</span>
          </div>
        </Card>

        <Card elevation="flat" className="admin-card-accent-rose p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl admin-icon-rose text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-semibold border border-rose-200/60">
              Prioritas Investigasi
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans mt-3">
            Sesi Risiko Tinggi
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-rose-700 tracking-tight">
              {telemetry.highRiskSessions} <span className="text-xs font-bold text-slate-400 font-sans">Kandidat</span>
            </span>
            <span className="text-[11px] text-rose-600 font-semibold font-mono">Flag &gt;= 3x</span>
          </div>
        </Card>
      </div>

      {/* Control Bar */}
      <Card elevation="flat" className="p-4 border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-none sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Cari sesi audit kandidat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-navy transition-colors font-sans"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-sans">
            <button
              onClick={() => setFilterRisk('ALL')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${filterRisk === 'ALL' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Semua ({interviewSessions.length})
            </button>
            <button
              onClick={() => setFilterRisk('CLEAN')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${filterRisk === 'CLEAN' ? 'bg-white text-emerald-800 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Bersih
            </button>
            <button
              onClick={() => setFilterRisk('WARNING')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${filterRisk === 'WARNING' ? 'bg-white text-amber-800 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Peringatan (1-2)
            </button>
            <button
              onClick={() => setFilterRisk('HIGH_RISK')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${filterRisk === 'HIGH_RISK' ? 'bg-white text-rose-800 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Risiko Tinggi (3+)
            </button>
            <button
              onClick={() => setFilterRisk('UNINTERVIEWED')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${filterRisk === 'UNINTERVIEWED' ? 'bg-white text-slate-800 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Belum Wawancara
            </button>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportProctorLog}
          leftIcon={<Download className="w-3.5 h-3.5 text-slate-500" />}
        >
          Ekspor Log Proctoring CSV
        </Button>
      </Card>

      {/* Audit Log Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kandidat & Posisi</TableHead>
            <TableHead>Status Integritas</TableHead>
            <TableHead className="text-center">Total Flag</TableHead>
            <TableHead>Rincian Insiden</TableHead>
            <TableHead className="text-right">Skor Wawancara</TableHead>
            <TableHead className="text-center">Aksi Audit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-14 text-center">
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-11 h-11 rounded-full bg-exam-bg text-muted-slate flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-heading font-semibold text-ink">Belum ada sesi audit</p>
                  <p className="text-xs text-muted-slate">Tidak ada sesi audit integritas yang sesuai kriteria.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredSessions.map(session => {
              const isDone = isInterviewDone(session);
              const flags = parseFlags(session.proctorFlags);
              const badgeVariant = !isDone 
                ? 'neutral' 
                : flags.length === 0 
                  ? 'success' 
                  : flags.length >= 3 
                    ? 'danger' 
                    : 'warning';
              const badgeLabel = !isDone 
                ? 'BELUM WAWANCARA' 
                : flags.length === 0 
                  ? 'INTEGRITAS BERSIH' 
                  : flags.length >= 3 
                    ? 'RISIKO TINGGI' 
                    : 'PERINGATAN';

              return (
                <TableRow key={session.id}>
                  <TableCell className="font-sans">
                    <div className="font-semibold text-slate-900">{session.fullName}</div>
                    <div className="text-xs text-slate-500 font-sans mt-0.5">
                      {session.job?.title || session.appliedPosition}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={badgeVariant} format="soft" hasDot>
                      {badgeLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-bold font-mono text-slate-900">
                    {!isDone ? (
                      <span className="text-slate-400 font-mono font-normal">-</span>
                    ) : (
                      flags.length
                    )}
                  </TableCell>
                  <TableCell className="font-sans text-xs text-slate-600 max-w-xs">
                    {!isDone ? (
                      <span className="text-slate-400 font-sans italic text-xs">
                        Belum melaksanakan sesi wawancara
                      </span>
                    ) : flags.length === 0 ? (
                      <span className="text-emerald-700 font-medium">
                        Kandidat fokus penuh selama wawancara
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        {flags.slice(0, 2).map((f, i) => (
                          <div key={i} className="text-[11px] text-slate-600 truncate">
                            - {f.type} {f.timestamp ? `(${f.timestamp.slice(11, 19)})` : ''}
                          </div>
                        ))}
                        {flags.length > 2 && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            +{flags.length - 2} insiden lainnya...
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {session.interviewScore ? (
                      <span className="font-bold font-mono text-slate-900">
                        {session.interviewScore}/100
                      </span>
                    ) : (
                      <span className="text-slate-400 font-sans italic text-xs">
                        {session.interviewStatus === 'completed' ? 'Belum Dinilai' : 'Belum Wawancara'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <Button
                        variant="accentSubtle"
                        size="xs"
                        onClick={() => setInspectingApplicant(session)}
                      >
                        Inspeksi Log
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewApplicant(session)}
                        title="Buka Dossier"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

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
                      Sesi 100% patuh, tidak ada insiden tercatat.
                    </div>
                  ) : (
                    parseFlags(inspectingApplicant.proctorFlags).map((ev, idx) => (
                      <div key={idx} className="p-2.5 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="font-medium text-slate-800 font-sans">{ev.type}</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {ev.timestamp || ev.time || 'Waktu tidak tercatat'}
                        </span>
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
