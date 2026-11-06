import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Calendar,
  Clock,
  Video,
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AsesorLayout } from './AsesorLayout';
import { Button, Badge, Input, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui';
import { fetchAssessorCandidates, type AssessorCandidate } from '../../services/assessorService';

export default function AsesorQueueTable() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const [candidates, setCandidates] = useState<AssessorCandidate[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchAssessorCandidates()
      .then((data) => {
        if (!cancelled) setCandidates(data);
      })
      .catch(() => {
        if (!cancelled) setCandidates([]);
      })
    return () => {
      cancelled = true;
    };
  }, []);

  const slots = useMemo(
    () =>
      candidates.map((candidate, index) => ({
        id: `SLOT-${String(index + 1).padStart(2, '0')}`,
        candidate: candidate.name,
        email: candidate.email,
        code: candidate.code,
        program: candidate.program,
        time: candidate.scheduledAt
          ? `${new Date(candidate.scheduledAt).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit'
            })} WIB`
          : 'Belum dijadwalkan',
        room: 'Room-A1',
        status:
          candidate.interviewStatus === 'called'
            ? 'Sedang Berlangsung'
            : candidate.interviewStatus === 'completed'
              ? 'Selesai Dinilai'
              : candidate.interviewStatus === 'scheduled'
                ? 'Terjadwal'
                : 'Di Ruang Tunggu',
        statusVariant: (candidate.interviewStatus === 'called'
          ? 'teal'
          : candidate.interviewStatus === 'completed'
            ? 'neutral'
            : 'navy') as 'teal' | 'neutral' | 'navy',
        catScore: candidate.catScore
      })),
    [candidates]
  );

  const filtered = slots.filter((s) =>
    s.candidate.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    s.program.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AsesorLayout activeTab="queue">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-ink tracking-tight">
              Antrean Live Interview Asesor
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Daftar slot wawancara kompetensi yang ditugaskan kepada Anda hari ini.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kandidat atau program..."
                className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-primary-navy outline-none shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SLOT</TableHead>
                <TableHead>KANDIDAT</TableHead>
                <TableHead>PROGRAM</TableHead>
                <TableHead>WAKTU WAWANCARA</TableHead>
                <TableHead>RUANG</TableHead>
                <TableHead>SKOR TES CAT</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead className="text-right">AKSI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono font-bold text-primary-navy">{s.id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-bold text-ink">{s.candidate}</p>
                      <p className="text-[11px] text-muted-slate font-mono">{s.code} • {s.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600 font-sans">{s.program}</TableCell>
                  <TableCell className="font-mono font-medium text-primary-navy">{s.time}</TableCell>
                  <TableCell className="font-mono text-slate-500">{s.room}</TableCell>
                  <TableCell className="font-mono font-bold text-emerald-700">{s.catScore != null ? `${s.catScore}/100` : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={s.statusVariant} format="soft">{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {s.status === 'Selesai Dinilai' ? (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => navigate(`/asesor/scoring/${s.code}`)}
                      >
                        Lihat Skor
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => navigate(`/asesor/live-console/${s.code}`)}
                        leftIcon={<Video className="w-3.5 h-3.5" />}
                      >
                        Buka Console
                      </Button>
                    )}
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
