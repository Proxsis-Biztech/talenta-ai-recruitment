import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Video,
  ShieldAlert,
  ClipboardCheck,
  Calendar,
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  Scale,
  Building2
} from 'lucide-react';
import { AsesorLayout } from './AsesorLayout';
import { Button, Badge, Card, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui';
import { getActiveSessionUser } from '../../services/userRegistryService';
import { fetchAssessorCandidates, type AssessorCandidate } from '../../services/assessorService';

export default function AsesorDashboard() {
  const navigate = useNavigate();

  const activeAsesor = useMemo(() => getActiveSessionUser(), []);
  const [candidates, setCandidates] = useState<AssessorCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAssessorCandidates()
      .then((data) => {
        if (!cancelled) setCandidates(data);
      })
      .catch(() => {
        if (!cancelled) setCandidates([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCandidates(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCandidates = candidates;
  const todaySlots = useMemo(() => {
    return visibleCandidates.slice(0, 5).map((c) => ({
      id: c.id,
      candidate: c.name,
      code: c.code,
      program: c.program,
      company: c.company,
      time: c.scheduledAt
        ? `${new Date(c.scheduledAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
        : 'Belum dijadwalkan',
      status:
        c.interviewStatus === 'called'
          ? 'Dipanggil'
          : c.interviewStatus === 'completed'
            ? 'Selesai Dinilai'
            : c.interviewStatus === 'scheduled'
              ? 'Terjadwal'
              : 'Menunggu',
      statusVariant: (c.interviewStatus === 'called'
        ? 'teal'
        : c.interviewStatus === 'completed'
          ? 'neutral'
          : 'navy') as any,
      catScore: c.catScore != null ? `${c.catScore}/100` : '-',
      action: c.interviewStatus === 'called' ? 'Masuk Live Console' : 'Buka Dossier'
    }));
  }, [visibleCandidates]);

  const primaryCode = todaySlots[0]?.code;
  const openConsole = () => {
    if (primaryCode) navigate(`/asesor/live-console/${primaryCode}`);
  };
  const pendingLha = candidates.filter(
    (candidate) => candidate.interviewStatus === 'completed' && candidate.lhaStatus !== 'signed'
  ).length;
  const proctoringFindings = candidates.filter(
    (candidate) => candidate.integrityScore != null && candidate.integrityScore < 100
  ).length;

  return (
    <AsesorLayout activeTab="dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8 antialiased">
        {/* ─── Hero Assessor Header: Asymmetric 8 / 4 Split ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Sisi Kiri (8 kolom): Profil Asesor & Sesi Aktif */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-blue text-primary-navy border border-accent-border text-xs font-bold">
                  <Scale className="w-3.5 h-3.5 text-blue-accent" />
                  Dewan Asesor Penguji Independen
                </span>
                <span className="font-mono text-xs text-muted-slate bg-exam-bg px-2.5 py-1 rounded-md border border-slate-200">
                  ID: AS-8821
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight text-ink">
                Panel Penilaian: {activeAsesor.name || 'Dr. Ir. Dwi Hartanto'}
              </h1>
              <p className="text-xs sm:text-sm text-muted-slate mt-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>Instansi Pengujian: <strong className="text-ink font-semibold">{activeAsesor.companyName || 'PT Telkom Indonesia Tbk'}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Program: <strong className="text-primary-navy font-semibold">Lead Cloud Architect (SE-402)</strong></span>
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-muted-slate">
                  <Calendar className="w-4 h-4 text-primary-navy" />
                  <span>Jadwal Hari Ini: <strong className="text-ink">{candidates.length} Kandidat</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-slate">
                  <Clock className="w-4 h-4 text-blue-accent" />
                  <span>Antrean Dipanggil: <strong className="text-emerald-600">{candidates.filter((candidate) => candidate.interviewStatus === 'called').length} Kandidat</strong></span>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={openConsole}
                className="py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Video className="w-4 h-4 text-blue-100" />
                <span>Masuk Konsol Sesi 1 Sekarang</span>
              </Button>
            </div>
          </div>

          {/* Sisi Kanan (4 kolom): Kandidat Segera Diuji (Quick Dossier) */}
          <div className="lg:col-span-4 bg-exam-bg rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary-navy bg-white px-2.5 py-0.5 rounded border border-slate-200">
                  KANDIDAT BERIKUTNYA
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Siap di Room
                </span>
              </div>

              <h3 className="font-heading font-bold text-base text-ink">
                {todaySlots[0]?.candidate || (loadingCandidates ? 'Memuat kandidat...' : 'Belum ada kandidat')}
              </h3>
              <p className="font-mono text-xs text-muted-slate mt-0.5">
                {todaySlots[0]?.code || '-'}
              </p>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-muted-slate">Skor CAT Teknis</span>
                  <span className="font-mono font-bold text-emerald-700">{todaySlots[0]?.catScore || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-muted-slate">Proctoring AI</span>
                  <span className="font-semibold text-emerald-700">100% Bersih (0 Flag)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-slate">Alokasi Waktu</span>
                  <span className="font-mono font-semibold text-ink">45 Menit</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="xs"
                onClick={openConsole}
                className="w-full py-2 rounded-xl text-primary-navy font-bold flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border-slate-200 cursor-pointer"
              >
                <span>Buka Lembar Penilaian BARS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Asymmetric 8 / 4 Split: Interview Queue & Audit Action Center ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri (8 kolom): Tabel Antrean Wawancara Hari Ini */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-heading font-extrabold text-lg text-ink">
                  Daftar Antrean Wawancara Hari Ini
                </h2>
                <p className="text-xs text-muted-slate mt-0.5">
                  Slot waktu, hasil ujian CAT mandatori, dan tautan langsung ke ruang pengujian
                </p>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => navigate('/asesor/interview-queue')}
                className="text-xs py-1.5 px-3 rounded-lg font-semibold cursor-pointer"
              >
                Lihat Semua Antrean ({todaySlots.length})
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KANDIDAT</TableHead>
                  <TableHead>WAKTU</TableHead>
                  <TableHead>CAT TEKNIS</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead className="text-right">AKSI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todaySlots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell>
                      <div>
                        <p className="font-bold text-xs sm:text-sm text-ink">{slot.candidate}</p>
                        <p className="font-mono text-[11px] text-muted-slate">{slot.code}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium text-primary-navy">{slot.time}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-emerald-700">{slot.catScore}</TableCell>
                    <TableCell>
                      <Badge variant={slot.statusVariant} format="soft">{slot.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => navigate(`/asesor/live-console/${slot.code}`)}
                        className="text-xs py-1 px-3"
                      >
                        {slot.action}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Kolom Kanan (4 kolom): Task Action Ledger & Quick Tools ─── */}
          <div className="lg:col-span-4 space-y-4">
            {/* Card 1: Penilaian Tertunda */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-slate uppercase tracking-wider">
                  TUGAS PENILAIAN
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-ink">{pendingLha} Berkas LHA</p>
                <p className="text-xs text-muted-slate mt-0.5">Memerlukan finalisasi rekomendasi &amp; e-sign</p>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => { if (primaryCode) navigate(`/asesor/scoring/${primaryCode}`); }}
                className="w-full text-xs py-2 rounded-lg font-semibold text-amber-800 bg-amber-50/60 hover:bg-amber-100/70 border-amber-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Selesaikan Penilaian</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Card 2: AI Proctoring Review */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-slate uppercase tracking-wider">
                  AUDIT PROCTORING
                </span>
                <div className="w-8 h-8 rounded-lg bg-red-50 text-error-red flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-ink">{proctoringFindings} Temuan AI</p>
                <p className="text-xs text-muted-slate mt-0.5">Perlu konfirmasi status valid vs false positive</p>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => navigate('/asesor/proctoring')}
                className="w-full text-xs py-2 rounded-lg font-semibold text-red-800 bg-red-50/60 hover:bg-red-100/70 border-red-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Tinjau Snapshot Rekaman</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Card 3: Metodologi Rubrik BARS */}
            <div className="bg-exam-bg rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-primary-navy">
                <Scale className="w-4 h-4 text-blue-accent" />
                <span>Pedoman Penilaian BARS (1-5)</span>
              </div>
              <p className="text-xs text-muted-slate leading-relaxed">
                Penilaian menggunakan indikator perilaku teramati (*Behaviorally Anchored Rating Scales*) untuk menjamin objektivitas seleksi.
              </p>
              <div className="pt-1">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => navigate('/asesor/rekap')}
                  className="w-full text-xs py-1.5 rounded-lg bg-white border-slate-200 text-slate-700"
                >
                  Buka Matriks Rekapitulasi Nilai
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AsesorLayout>
  );
}
