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
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'CLEAN' | 'WARNING' | 'HIGH_RISK'>('ALL');
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

  // Interview sessions list
  const interviewSessions = useMemo(() => {
    return applicants.filter(a => a.interviewStatus === 'completed' || a.interviewStatus === 'in_progress' || (a.interviewTranscript && a.interviewTranscript.length > 0));
  }, [applicants]);

  // Telemetry Metrics
  const telemetry = useMemo(() => {
    let totalViolations = 0;
    let cleanSessions = 0;
    let highRiskSessions = 0;

    interviewSessions.forEach(a => {
      const flags = parseFlags(a.proctorFlags);
      totalViolations += flags.length;
      if (flags.length === 0) cleanSessions++;
      if (flags.length >= 3) highRiskSessions++;
    });

    const complianceRate = interviewSessions.length > 0
      ? Math.round((cleanSessions / interviewSessions.length) * 100)
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
      const flags = parseFlags(a.proctorFlags);
      const matchesSearch = 
        a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.job?.title || a.appliedPosition).toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesRisk = true;
      if (filterRisk === 'CLEAN') matchesRisk = flags.length === 0;
      if (filterRisk === 'WARNING') matchesRisk = flags.length >= 1 && flags.length <= 2;
      if (filterRisk === 'HIGH_RISK') matchesRisk = flags.length >= 3;

      return matchesSearch && matchesRisk;
    });
  }, [interviewSessions, searchQuery, filterRisk]);

  const getRiskBadge = (count: number) => {
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
    const headers = ['Nama Kandidat', 'Posisi', 'Status Sesi', 'Jumlah Pelanggaran', 'Skor Wawancara', 'Log Rincian'];
    const rows = filteredSessions.map(s => {
      const flags = parseFlags(s.proctorFlags);
      const details = flags.map(f => `${f.type} (${f.timestamp || f.time || '-'})`).join('; ');
      return [
        `"${s.fullName}"`,
        `"${s.job?.title || s.appliedPosition}"`,
        `"${s.interviewStatus}"`,
        `"${flags.length}"`,
        `"${s.interviewScore || '-'}"`,
        `"${details.replace(/"/g, '""')}"`
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
        <Card elevation="flat" className="p-4 border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">
            Total Sesi Terpantau
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {telemetry.totalSessions}
            </span>
            <span className="text-xs text-slate-500">Kandidat Wawancara</span>
          </div>
        </Card>

        <Card elevation="flat" className="p-4 border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">
            Tingkat Kepatuhan Integritas
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-primary-navy">
              {telemetry.complianceRate}%
            </span>
            <span className="text-xs text-emerald-600 font-semibold">
              Bebas Pelanggaran
            </span>
          </div>
        </Card>

        <Card elevation="flat" className="p-4 border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">
            Total Pelanggaran Deteksi
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-amber-600">
              {telemetry.totalViolations}
            </span>
            <span className="text-xs text-slate-500">Tab Switch / Blur</span>
          </div>
        </Card>

        <Card elevation="flat" className="p-4 border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">
            Sesi Risiko Tinggi
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-rose-600">
              {telemetry.highRiskSessions}
            </span>
            <span className="text-xs text-rose-600 font-semibold">
              Flag &gt;= 3x
            </span>
          </div>
        </Card>
      </div>

      {/* Control Bar */}
      <Card elevation="flat" className="p-4 border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Cari sesi audit kandidat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-navy transition-colors font-sans"
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-sans">
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
              const flags = parseFlags(session.proctorFlags);
              const badgeVariant = flags.length === 0 ? 'success' : flags.length >= 3 ? 'danger' : 'warning';
              const badgeLabel = flags.length === 0 ? 'INTEGRITAS BERSIH' : flags.length >= 3 ? 'RISIKO TINGGI' : 'PERINGATAN';
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
                    {flags.length}
                  </TableCell>
                  <TableCell className="font-sans text-xs text-slate-600 max-w-xs">
                    {flags.length === 0 ? (
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
                        Belum Dinilai
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
                  <span className="font-semibold text-slate-800 font-mono uppercase">{inspectingApplicant.interviewStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Skor AI:</span>
                  <span className="font-semibold text-slate-800 font-mono">{inspectingApplicant.interviewScore || '-'} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Total Pelanggaran:</span>
                  <span className="font-semibold text-rose-600 font-mono">
                    {parseFlags(inspectingApplicant.proctorFlags).length} insiden tercatat
                  </span>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2 font-sans">
                  Timeline Insiden Browser
                </h5>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto bg-white">
                  {parseFlags(inspectingApplicant.proctorFlags).length === 0 ? (
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
