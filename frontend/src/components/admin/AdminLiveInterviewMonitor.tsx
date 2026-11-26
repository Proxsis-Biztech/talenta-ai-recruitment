import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
  Video,
  Users,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  UserCheck,
  RotateCcw,
  XCircle,
  Building2,
  Award
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '../ui';
import { AdminStatCard, AdminEmptyState } from './AdminStatCard';

interface LiveSessionRow {
  userId: string;
  candidateCode: string;
  name: string;
  email: string;
  companyName: string;
  programCode: string;
  programCodes: string[];
  programTitle: string;
  interviewStatus: string;
  interviewScheduledAt: string | null;
  interviewCalledAt: string | null;
  interviewEnteredAt: string | null;
  interviewCompletedAt: string | null;
  assessorName: string | null;
  assignedAssessors: Array<{ id: string; name: string }>;
  catStatus: 'selesai' | 'sedang' | 'belum';
  catScore: number | null;
  liveCodingStatus: 'selesai' | 'sedang' | 'belum';
  lhaStatus: string | null;
  compositeScore: number | null;
  recommendation: string | null;
}

interface TrainerLoadRow {
  id: string;
  name: string;
  email: string;
  username: string | null;
  specialization: string;
  companyName: string;
  assignedPrograms: string[];
  status: string;
  candidatePoolCount: number;
  waitingCount: number;
  inProgressCount: number;
  scoredCount: number;
  draftCount: number;
}

const statusMeta = (status: string, lhaStatus: string | null) => {
  if (lhaStatus === 'signed' || status === 'scored') {
    return { label: 'Selesai & LHA Terbit', variant: 'success' as const };
  }
  if (status === 'in_progress') {
    return { label: 'Sedang Wawancara', variant: 'info' as const };
  }
  if (status === 'called') {
    return { label: 'Dipanggil Asesor', variant: 'warning' as const };
  }
  if (status === 'scheduled' || status === 'waiting') {
    return { label: 'Menunggu Antrean', variant: 'navy' as const };
  }
  if (status === 'completed') {
    return { label: 'Selesai (Perlu BARS)', variant: 'teal' as const };
  }
  return { label: 'Belum Wawancara', variant: 'neutral' as const };
};

export default function AdminLiveInterviewMonitor() {
  const [sessions, setSessions] = useState<LiveSessionRow[]>([]);
  const [trainers, setTrainers] = useState<TrainerLoadRow[]>([]);
  const [summary, setSummary] = useState({
    totalCandidates: 0,
    inProgress: 0,
    waitingOrCalled: 0,
    completedOrScored: 0,
    activeTrainers: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actingUserId, setActingUserId] = useState<string | null>(null);

  const loadSessions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      const response = await axios.get('/api/admin/live-sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data?.data;
      if (data) {
        setSessions(Array.isArray(data.sessions) ? data.sessions : []);
        setTrainers(Array.isArray(data.trainers) ? data.trainers : []);
        if (data.summary) setSummary(data.summary);
      }
    } catch {
      // keep existing state on transient error
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
    const timer = window.setInterval(() => void loadSessions(true), 10000);
    return () => window.clearInterval(timer);
  }, [loadSessions]);

  const handleSessionAction = async (
    row: LiveSessionRow,
    action: 'close' | 'requeue' | 'assign_assessor',
    assessorName?: string | null
  ) => {
    setActingUserId(row.userId);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `/api/admin/live-sessions/${row.userId}/action`,
        { action, assessorName: assessorName ?? null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadSessions(true);
      Swal.fire({
        icon: 'success',
        title: 'Status Sesi Diperbarui',
        text:
          action === 'close'
            ? `Sesi ${row.name} ditutup sebagai selesai.`
            : action === 'requeue'
              ? `${row.name} dikembalikan ke antrean waiting room.`
              : `Trainer untuk ${row.name} diperbarui.`,
        timer: 1800,
        showConfirmButton: false
      });
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : undefined;
      Swal.fire('Gagal', msg || 'Tidak dapat memperbarui sesi.', 'error');
    } finally {
      setActingUserId(null);
    }
  };

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      if (statusFilter === 'ACTIVE' && !['in_progress', 'called'].includes(s.interviewStatus)) return false;
      if (statusFilter === 'WAITING' && !['scheduled', 'waiting'].includes(s.interviewStatus)) return false;
      if (statusFilter === 'DONE' && !['completed', 'scored'].includes(s.interviewStatus) && s.lhaStatus !== 'signed') {
        return false;
      }
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.candidateCode.toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q) ||
        s.programTitle.toLowerCase().includes(q) ||
        (s.assessorName || '').toLowerCase().includes(q)
      );
    });
  }, [sessions, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <AdminStatCard
          label="Sedang Wawancara"
          value={summary.inProgress}
          subtext="Sesi aktif berlangsung"
          badge="Live"
          badgeVariant="info"
          icon={Video}
        />
        <AdminStatCard
          label="Antrean & Dipanggil"
          value={summary.waitingOrCalled}
          subtext="Waiting room peserta"
          badge="Antrean"
          badgeVariant="warning"
          icon={Clock}
        />
        <AdminStatCard
          label="Selesai / Dinilai"
          value={summary.completedOrScored}
          subtext="Siap / terbit LHA"
          badge="Tersinkron"
          badgeVariant="success"
          icon={CheckCircle2}
        />
        <AdminStatCard
          label="Trainer / Asesor Aktif"
          value={summary.activeTrainers}
          subtext={`Dari ${trainers.length} terdaftar`}
          badge="Evaluator"
          badgeVariant="neutral"
          icon={UserCheck}
        />
      </div>

      {/* Trainer / Assessor Workload Matrix */}
      <Card elevation="flat" className="p-5 border-[#E2E8F0] rounded-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] font-heading flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#1E3A8A]" />
              Sinkronisasi Beban &amp; Penugasan Trainer / Asesor
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Menampilkan cakupan perusahaan (PT), program yang ditugaskan, dan jumlah peserta aktif per trainer.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadSessions()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Segarkan Data
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {trainers.length === 0 ? (
            <div className="col-span-full py-6 text-center text-xs text-slate-400">
              Belum ada akun Trainer / Asesor yang terdaftar.
            </div>
          ) : (
            trainers.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0F172A] truncate">{t.name}</p>
                    <p className="text-[11px] text-[#64748B] truncate">{t.specialization}</p>
                  </div>
                  <Badge variant={t.status === 'Aktif' ? 'success' : 'neutral'} format="soft" hasDot>
                    {t.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[#475569]">
                  <Building2 className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                  <span className="truncate font-medium">{t.companyName}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {t.assignedPrograms.length > 0 ? (
                    t.assignedPrograms.map((code) => (
                      <span
                        key={code}
                        className="text-[10px] font-mono bg-white border border-slate-200 text-[#1E3A8A] px-1.5 py-0.5 rounded"
                      >
                        {code}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                      Semua Program PT
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-center">
                  <div className="bg-white rounded-lg p-1.5 border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Peserta</span>
                    <span className="text-xs font-mono font-bold text-slate-900">{t.candidatePoolCount}</span>
                  </div>
                  <div className="bg-white rounded-lg p-1.5 border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Antrean</span>
                    <span className="text-xs font-mono font-bold text-amber-700">{t.waitingCount + t.inProgressCount}</span>
                  </div>
                  <div className="bg-white rounded-lg p-1.5 border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">LHA Terbit</span>
                    <span className="text-xs font-mono font-bold text-emerald-700">{t.scoredCount}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Live Queue & Session Control Table */}
      <Card elevation="flat" className="p-5 border-[#E2E8F0] rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="w-full sm:w-[260px]">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari peserta, kode, PT, atau trainer..."
                leftIcon={<Search className="w-4 h-4 text-[#94A3B8]" />}
                className="h-10 rounded-lg"
              />
            </div>
            <div className="inline-flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg text-xs">
              {[
                { key: 'ALL', label: `Semua (${sessions.length})` },
                { key: 'ACTIVE', label: 'Berlangsung / Dipanggil' },
                { key: 'WAITING', label: 'Antrean' },
                { key: 'DONE', label: 'Selesai' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`h-8 px-3 rounded-md transition-colors cursor-pointer ${
                    statusFilter === tab.key
                      ? 'bg-[#1E3A8A] text-white font-semibold'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <span className="text-[11px] text-[#64748B] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sinkronisasi otomatis tiap 10 dtk
          </span>
        </div>

        <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow className="bg-[#F8FAFC]">
                <TableHead>Peserta &amp; Kode</TableHead>
                <TableHead>PT &amp; Program</TableHead>
                <TableHead>CAT &amp; Coding</TableHead>
                <TableHead>Status Wawancara</TableHead>
                <TableHead>Trainer / Asesor</TableHead>
                <TableHead className="text-right">Kontrol Sesi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-xs text-slate-400">
                    Memuat pemantauan sesi langsung...
                  </TableCell>
                </TableRow>
              ) : filteredSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <AdminEmptyState
                      icon={Video}
                      title="Belum ada sesi yang sesuai"
                      description="Tidak ada data antrean atau wawancara peserta pada filter ini."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredSessions.map((row) => {
                  const meta = statusMeta(row.interviewStatus, row.lhaStatus);
                  const isBusy = actingUserId === row.userId;
                  return (
                    <TableRow key={row.userId} className="hover:bg-[#F8FAFC]">
                      <TableCell>
                        <div className="text-xs font-bold text-[#0F172A]">{row.name}</div>
                        <div className="text-[11px] font-mono text-[#64748B]">{row.candidateCode}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium text-[#0F172A]">{row.companyName}</div>
                        <div className="text-[11px] text-[#64748B] truncate max-w-[220px]" title={row.programTitle}>
                          [{row.programCode}] {row.programTitle}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-[11px]">
                          <span>
                            CAT:{' '}
                            <strong className="font-mono">
                              {row.catScore != null ? `${row.catScore}/100` : row.catStatus}
                            </strong>
                          </span>
                          <span className="text-slate-500">
                            Coding: <strong>{row.liveCodingStatus}</strong>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={meta.variant} format="soft" hasDot>
                            {meta.label}
                          </Badge>
                          {row.compositeScore != null && (
                            <div className="text-[11px] font-mono text-slate-600 flex items-center gap-1">
                              <Award className="w-3 h-3 text-emerald-600" />
                              Skor: {row.compositeScore} ({row.recommendation || 'Dinilai'})
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.assessorName || ''}
                          disabled={isBusy}
                          onChange={(e) =>
                            void handleSessionAction(row, 'assign_assessor', e.target.value || null)
                          }
                          className="h-8 text-xs min-w-[160px]"
                        >
                          <option value="">Otomatis ({row.assignedAssessors[0]?.name || 'Pool PT'})</option>
                          {trainers.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name}
                            </option>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={isBusy}
                            onClick={() => void handleSessionAction(row, 'requeue')}
                            leftIcon={<RotateCcw className="w-3 h-3" />}
                            title="Masukkan kembali ke antrean waiting room"
                          >
                            Antre Ulang
                          </Button>
                          {['in_progress', 'called', 'scheduled', 'waiting'].includes(row.interviewStatus) && (
                            <Button
                              variant="outline"
                              size="xs"
                              disabled={isBusy}
                              onClick={() => void handleSessionAction(row, 'close')}
                              className="text-rose-600 border-rose-200 hover:bg-rose-50"
                              leftIcon={<XCircle className="w-3 h-3" />}
                              title="Tutup sesi wawancara yang macet"
                            >
                              Tutup Sesi
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
