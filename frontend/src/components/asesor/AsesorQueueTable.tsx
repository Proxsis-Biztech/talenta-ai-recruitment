import React, { useState } from 'react';
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

export default function AsesorQueueTable() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const slots = [
    {
      id: 'SLOT-01',
      candidate: 'Farhan Pratama',
      email: 'farhan.pratama@gmail.com',
      code: 'KND-0891',
      program: 'Software Engineer Specialist Batch IV',
      time: '14:00 - 14:45 WIB',
      room: 'Room-A1',
      status: 'Sedang Berlangsung',
      statusVariant: 'teal' as const,
      catScore: 88
    },
    {
      id: 'SLOT-02',
      candidate: 'Amanda Nurul',
      email: 'amanda.nurul@outlook.com',
      code: 'KND-0892',
      program: 'Software Engineer Specialist Batch IV',
      time: '15:00 - 15:45 WIB',
      room: 'Room-A1',
      status: 'Di Ruang Tunggu',
      statusVariant: 'navy' as const,
      catScore: 79
    },
    {
      id: 'SLOT-03',
      candidate: 'Reza Fauzi',
      email: 'reza.fauzi@corp.id',
      code: 'KND-0893',
      program: 'Data Architecture Specialist',
      time: '16:00 - 16:45 WIB',
      room: 'Room-A1',
      status: 'Terjadwal',
      statusVariant: 'neutral' as const,
      catScore: 84
    },
    {
      id: 'SLOT-04',
      candidate: 'Dewi Lestari',
      email: 'dewi.lestari@tech.co',
      code: 'KND-0894',
      program: 'Product Management Fellow',
      time: '17:00 - 17:45 WIB',
      room: 'Room-A1',
      status: 'Terjadwal',
      statusVariant: 'neutral' as const,
      catScore: 91
    },
    {
      id: 'SLOT-05',
      candidate: 'Budi Santoso',
      email: 'budi.santoso@example.com',
      code: 'KND-0895',
      program: 'Software Engineer Specialist Batch IV',
      time: '10:00 - 10:45 WIB',
      room: 'Room-A1',
      status: 'Selesai Dinilai',
      statusVariant: 'teal' as const,
      catScore: 92
    }
  ];

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
                  <TableCell className="font-mono font-bold text-emerald-700">{s.catScore}/100</TableCell>
                  <TableCell>
                    <Badge variant={s.statusVariant} format="soft">{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {s.status === 'Selesai Dinilai' ? (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => navigate('/asesor/scoring/demo')}
                      >
                        Lihat Skor
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => navigate('/asesor/live-console/demo')}
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
