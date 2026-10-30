import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Video,
  FileText,
  Lock,
  Download,
  Share2,
  Calendar,
  X,
  Award,
  ChevronRight,
  Eye,
  LogOut,
  UserCheck
} from 'lucide-react';
import { Button, Badge, Modal } from '../ui';

interface TimelineStep {
  time: string;
  duration?: string;
  icon: any;
  title: string;
  description: string;
  badge: string;
  badgeVariant: 'teal' | 'navy' | 'warning' | 'danger' | 'neutral';
  notes?: string;
}

export function AdminVerticalTimeline({
  isOpen,
  onClose,
  candidate
}: {
  isOpen: boolean;
  onClose: () => void;
  candidate?: {
    name: string;
    email: string;
    program: string;
    pt: string;
    compositeScore?: number;
    integrityScore?: number;
  };
}) {
  const [isLocked, setIsLocked] = useState(false);

  const steps: TimelineStep[] = [
    {
      time: '28 Okt 2026, 13:50 WIB',
      duration: '3 menit',
      icon: UserCheck,
      title: 'Otorisasi & Device Check Kandidat Berhasil',
      description: 'Kandidat Farhan Pratama login melalui token program SE-402. Kamera 720p, Mic, dan koneksi internet 38 Mbps lolos verifikasi mandatori.',
      badge: 'Terverifikasi',
      badgeVariant: 'teal',
      notes: 'IP: 180.252.12.8 • User-Agent: Chrome 124.0.0 Win11'
    },
    {
      time: '28 Okt 2026, 14:00 WIB',
      duration: '0 menit',
      icon: Clock,
      title: 'Mulai Pengerjaan Tes Kemampuan Teknis (CAT)',
      description: 'Kandidat mengaktifkan mode Layar Penuh (Fullscreen Lockdown). OpenCV Face Tracking diinisialisasi pada 30 FPS.',
      badge: 'Tes Dimulai',
      badgeVariant: 'navy'
    },
    {
      time: '28 Okt 2026, 14:14 WIB',
      duration: '3.8 detik',
      icon: AlertTriangle,
      title: 'Event Integritas AI: Tab Switching Terdeteksi',
      description: 'Browser kehilangan fokus selama 3.8 detik (Page Visibility API hidden). Sistem mengeluarkan Strike #1 Peringatan kepada kandidat.',
      badge: 'Flag Sedang',
      badgeVariant: 'warning',
      notes: 'Snapshot bukti kamera terlampir: kandidat tetap di depan layar.'
    },
    {
      time: '28 Okt 2026, 15:28 WIB',
      duration: '88 menit',
      icon: CheckCircle2,
      title: 'Kandidat Menyelesaikan & Mengumpulkan Lembar Ujian',
      description: 'Seluruh 40 nomor soal terisi. Sistem scoring otomatis mencatat Skor Tes CAT Teknis sebesar 88 / 100.',
      badge: 'CAT Selesai',
      badgeVariant: 'teal',
      notes: 'Jawaban tersimpan dengan cryptographic checksum sha256.'
    },
    {
      time: '28 Okt 2026, 16:00 WIB',
      duration: '45 menit',
      icon: Video,
      title: 'Sesi Live Interview Bersama Asesor Independen',
      description: 'Dr. Ir. Dwi Hartanto memimpin sesi wawancara berbasis rubrik 4 dimensi kompetensi. Sesi direkam penuh.',
      badge: 'Interview Selesai',
      badgeVariant: 'teal',
      notes: 'Skor Wawancara: 86.25 / 100 • Rekomendasi: Lulus (Lanjut)'
    },
    {
      time: '28 Okt 2026, 16:55 WIB',
      duration: 'Final',
      icon: Award,
      title: 'Kalkulasi Skor Komposit & Penerbitan Rekomendasi',
      description: 'Skor Akhir: 87.8 / 100. Asesor menetapkan kandidat LULUS dengan kualifikasi Sangat Direkomendasikan.',
      badge: 'Hasil Ditetapkan',
      badgeVariant: 'teal'
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detail Audit Trail & Timeline Vertikal Asesmen">
      <div className="space-y-6">
        {/* Candidate Banner */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-soft-blue text-primary-navy font-bold text-base flex items-center justify-center font-heading shrink-0">
              FP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-extrabold text-base text-ink">
                  {candidate?.name || 'Farhan Pratama'}
                </h3>
                {isLocked && <Badge variant="neutral">Status: Terkunci (Locked)</Badge>}
              </div>
              <p className="text-xs text-muted-slate">
                {candidate?.pt || 'PT Telkom Indonesia'} • {candidate?.program || 'Software Engineer Batch IV'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] text-muted-slate uppercase font-bold">Skor Akhir</span>
              <p className="font-mono text-xl font-extrabold text-primary-navy">
                {candidate?.compositeScore || 87.8}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-slate uppercase font-bold">Integritas AI</span>
              <p className="font-mono text-xl font-extrabold text-emerald-600">
                {candidate?.integrityScore || 98}%
              </p>
            </div>
          </div>
        </div>

        {/* ─── The Vertical Audit Timeline ─── */}
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            return (
              <div key={idx} className="relative flex items-start gap-4 text-xs">
                {/* Node icon bullet */}
                <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-white border-2 border-primary-navy text-primary-navy flex items-center justify-center shadow-xs">
                  <Icon className="w-3 h-3" />
                </div>

                <div className="flex-1 bg-white p-4 rounded-xl border border-border-slate shadow-xs space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-primary-navy">
                      {st.time} {st.duration && `(${st.duration})`}
                    </span>
                    <Badge variant={st.badgeVariant}>{st.badge}</Badge>
                  </div>

                  <h4 className="font-bold text-sm text-ink">{st.title}</h4>
                  <p className="text-slate-600 leading-relaxed">{st.description}</p>

                  {st.notes && (
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-mono text-slate-500">
                      {st.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <Button
            variant={isLocked ? 'outline' : 'secondary'}
            size="sm"
            onClick={() => {
              setIsLocked(!isLocked);
            }}
            className="text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <span>{isLocked ? 'Buka Kunci (Status Terkunci)' : 'Finalisasi & Kunci (Lock)'}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const printWin = window.open('', '_blank');
                if (!printWin) return;
                const eventsList = steps
                  .map(
                    (e: TimelineStep) => `
                  <div style="border-bottom: 1px solid #e2e8f0; padding: 12px 0;">
                    <div style="display:flex; justify-content:space-between;">
                      <strong>${e.title}</strong>
                      <span style="font-family:monospace; color:#64748b;">${e.time}</span>
                    </div>
                    <p style="font-size:13px; color:#334155; margin: 4px 0;">${e.description}</p>
                    <span style="font-size:11px; background:#f1f5f9; padding:2px 6px; border-radius:4px;">Status: ${e.badge} | Catatan: ${e.notes || '-'}</span>
                  </div>
                `
                  )
                  .join('');

                printWin.document.write(`
                  <html>
                    <head>
                      <title>DOSSIER AUDIT TRAIL - ${candidate?.name || 'Kandidat'}</title>
                      <style>body { font-family: sans-serif; padding: 40px; color: #1e293b; }</style>
                    </head>
                    <body>
                      <h2>DOSSIER AUDIT TRAIL & REKAM JEJAK SELEKSI RESMI</h2>
                      <p>Kandidat: <strong>${candidate?.name || 'Farhan Pratama'}</strong> (${candidate?.email || 'kandidat@talenta.id'})</p>
                      <p>Status: ${isLocked ? 'TERKUNCI / FINAL' : 'AKTIF / ON-GOING'} | UU PDP No. 27/2022 Compliant</p>
                      <hr style="margin: 20px 0;"/>
                      ${eventsList}
                      <script>window.print();</script>
                    </body>
                  </html>
                `);
                printWin.document.close();
              }}
              className="text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Dossier PDF</span>
            </Button>
            <Button variant="primary" size="sm" onClick={onClose} className="text-xs cursor-pointer">
              Tutup
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
