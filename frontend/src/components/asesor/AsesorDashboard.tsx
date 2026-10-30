import React, { useMemo } from 'react';
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
import { getAllPesertaUsers, getActiveSessionUser } from '../../services/userRegistryService';

export default function AsesorDashboard() {
  const navigate = useNavigate();

  const activeAsesor = useMemo(() => getActiveSessionUser(), []);
  const registeredCandidates = useMemo(() => getAllPesertaUsers(), []);

  const todaySlots = useMemo(() => {
    return registeredCandidates.slice(0, 5).map((c, idx) => ({
      id: `SLOT-${idx + 1}`,
      candidate: c.name,
      code: c.id,
      program: `${c.assessmentTitle}`,
      company: c.companyName,
      time: idx === 0 ? '14:00 - 14:45 WIB' : idx === 1 ? '15:00 - 15:45 WIB' : '16:00 - 16:45 WIB',
      status: idx === 0 ? 'Sedang Berlangsung' : idx === 1 ? 'Di Ruang Tunggu' : 'Terjadwal',
      statusVariant: (idx === 0 ? 'teal' : idx === 1 ? 'navy' : 'neutral') as any,
      catScore: `${c.catScore || 85}/100`,
      action: idx === 0 ? 'Masuk Live Console' : idx === 1 ? 'Siapkan Rubrik' : 'Lihat Dossier'
    }));
  }, [registeredCandidates]);

  return (
    <AsesorLayout activeTab="dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* ─── Hero Assessor Header ─── */}
        <div className="bg-white rounded-2xl border border-border-slate p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold mb-3">
              <Scale className="w-3.5 h-3.5 text-amber-600" />
              Dewan Asesor Independen
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight text-ink">
              Panel Penilaian: {activeAsesor.name || 'Dr. Ir. Dwi Hartanto'}
            </h1>
            <p className="text-xs text-muted-slate mt-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Instansi Ditugaskan: <strong>{activeAsesor.companyName || 'PT Telkom Indonesia Tbk'}</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={() => navigate('/asesor/live-console/demo')}
              className="text-xs flex items-center gap-2 shadow-sm"
            >
              <Video className="w-4 h-4" />
              <span>Buka Live Console Sesi 1</span>
            </Button>
          </div>
        </div>

        {/* ─── 3 Priority Metric Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Card 1: Jadwal Interview Hari Ini */}
          <div
            onClick={() => navigate('/asesor/interview-queue')}
            className="bg-white rounded-2xl border border-border-slate p-6 shadow-xs hover:border-primary-navy transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-muted-slate uppercase tracking-wider">
                  Jadwal Hari Ini
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-accent flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <p className="font-mono text-3xl font-extrabold text-ink">5 Sesi</p>
              <p className="text-xs text-muted-slate mt-1">1 sesi aktif, 4 sesi mendatang</p>
            </div>
            <span className="text-xs font-semibold text-primary-navy mt-4 flex items-center gap-1">
              Buka antrean interview →
            </span>
          </div>

          {/* Card 2: Antrean Penilaian Belum Selesai */}
          <div
            onClick={() => navigate('/asesor/scoring/demo')}
            className="bg-white rounded-2xl border border-border-slate p-6 shadow-xs hover:border-amber-500 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-muted-slate uppercase tracking-wider">
                  Penilaian Tertunda
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
              </div>
              <p className="font-mono text-3xl font-extrabold text-warning-amber">3 Berkas</p>
              <p className="text-xs text-muted-slate mt-1">Rubrik perlu finalisasi skor akhir</p>
            </div>
            <span className="text-xs font-semibold text-amber-700 mt-4 flex items-center gap-1">
              Selesaikan rubrik scoring →
            </span>
          </div>

          {/* Card 3: Flag Proctoring Perlu Review */}
          <div
            onClick={() => navigate('/asesor/proctoring')}
            className="bg-white rounded-2xl border border-border-slate p-6 shadow-xs hover:border-red-500 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-muted-slate uppercase tracking-wider">
                  Flag Proctoring AI
                </span>
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>
              <p className="font-mono text-3xl font-extrabold text-error-red">7 Event</p>
              <p className="text-xs text-muted-slate mt-1">Deteksi pindah tab & shortcut print</p>
            </div>
            <span className="text-xs font-semibold text-red-700 mt-4 flex items-center gap-1">
              Review bukti snapshot AI →
            </span>
          </div>
        </div>

        {/* ─── Upcoming Interview Slots Table ─── */}
        <div className="bg-white rounded-2xl border border-border-slate p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading font-bold text-base text-ink">
                Jadwal Interview Sesi Hari Ini
              </h2>
              <p className="text-xs text-muted-slate">Slot waktu dan kandidat yang telah siap diuji</p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/asesor/interview-queue')}
              className="text-xs"
            >
              Lihat Seluruh Slot
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KANDIDAT</TableHead>
                <TableHead>PROGRAM</TableHead>
                <TableHead>WAKTU</TableHead>
                <TableHead>SKOR CAT TEKNIS</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead className="text-right">AKSI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todaySlots.map((slot) => (
                <TableRow key={slot.id}>
                  <TableCell>
                    <div>
                      <p className="font-bold text-ink">{slot.candidate}</p>
                      <p className="font-mono text-[11px] text-muted-slate">{slot.code}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600 font-sans">
                    <p className="font-semibold text-xs text-ink">{slot.program}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{slot.company}</p>
                  </TableCell>
                  <TableCell className="font-mono font-medium text-primary-navy">{slot.time}</TableCell>
                  <TableCell className="font-mono font-bold text-emerald-700">{slot.catScore}</TableCell>
                  <TableCell>
                    <Badge variant={slot.statusVariant} format="soft">{slot.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => navigate('/asesor/live-console/demo')}
                    >
                      {slot.action}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AsesorLayout>
  );
}
