import React, { useMemo, useState } from 'react';
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
    createdAt?: string;
    screeningStatus?: string;
    screeningScore?: number | null;
    interviewStatus?: string;
    interviewScore?: number | null;
    examAttempt?: {
      score?: number | null;
      integrityScore?: number | null;
      submittedAt?: string | null;
      violations?: string | null;
    } | null;
    proctorFlags?: string | null;
  };
}) {
  const [isLocked, setIsLocked] = useState(false);

  const steps: TimelineStep[] = useMemo(() => {
    const formatDate = (value?: string | null) => {
      if (!value) return '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '-';
      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    const flags = (() => {
      try {
        const parsed = JSON.parse(candidate?.proctorFlags || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();
    const screeningVariant: TimelineStep['badgeVariant'] =
      candidate?.screeningStatus === 'success'
        ? 'teal'
        : candidate?.screeningStatus === 'failed'
          ? 'danger'
          : 'warning';
    const interviewVariant: TimelineStep['badgeVariant'] =
      candidate?.interviewStatus === 'completed'
        ? 'teal'
        : candidate?.interviewStatus === 'called'
          ? 'navy'
          : 'warning';
    const list: TimelineStep[] = [
      {
        time: formatDate(candidate?.createdAt),
        icon: UserCheck,
        title: 'Lamaran Kandidat Diterima',
        description: `Lamaran ${candidate?.name || 'kandidat'} untuk posisi ${candidate?.program || '-'} tercatat di sistem.`,
        badge: 'Terdaftar',
        badgeVariant: 'teal',
        notes: `Email: ${candidate?.email || '-'}`
      },
      {
        time: formatDate(candidate?.createdAt),
        icon: FileText,
        title: 'Screening CV & Kecocokan AI',
        description:
          candidate?.screeningStatus === 'success'
            ? `CV berhasil dianalisis AI dengan skor kecocokan ${candidate?.screeningScore ?? '-'} / 100.`
            : 'Screening CV belum selesai atau belum dijalankan.',
        badge:
          candidate?.screeningStatus === 'success'
            ? 'Screening Selesai'
            : candidate?.screeningStatus === 'failed'
              ? 'Gagal'
              : 'Menunggu',
        badgeVariant: screeningVariant
      }
    ];

    if (candidate?.examAttempt?.submittedAt) {
      list.push({
        time: formatDate(candidate.examAttempt.submittedAt),
        icon: CheckCircle2,
        title: 'Ujian CAT Diselesaikan',
        description: `Kandidat menyelesaikan ujian CAT dengan skor ${candidate.examAttempt.score ?? '-'} / 100 dan integritas ${candidate.examAttempt.integrityScore ?? '-'} / 100.`,
        badge: 'CAT Selesai',
        badgeVariant: 'teal',
        notes: flags.length > 0 ? `${flags.length} event integritas tercatat.` : 'Tidak ada event integritas tercatat.'
      });
    } else {
      list.push({
        time: '-',
        icon: Clock,
        title: 'Ujian CAT Belum Diselesaikan',
        description: 'Kandidat belum menyelesaikan ujian CAT atau belum memulai sesi.',
        badge: 'Menunggu',
        badgeVariant: 'warning'
      });
    }

    if (flags.length > 0) {
      list.push({
        time: formatDate(candidate?.examAttempt?.submittedAt || candidate?.createdAt),
        icon: AlertTriangle,
        title: 'Event Integritas AI Terdeteksi',
        description: `Sistem mencatat ${flags.length} event proctoring yang perlu ditinjau asesor.`,
        badge: 'Perlu Review',
        badgeVariant: 'warning',
        notes: flags
          .slice(0, 3)
          .map((flag: any) => flag.type || flag.description || 'Event integritas')
          .join(' • ')
      });
    }

    list.push({
      time: candidate?.interviewStatus === 'completed' ? formatDate(candidate?.createdAt) : '-',
      icon: Video,
      title: 'Live Interview Asesor',
      description:
        candidate?.interviewStatus === 'completed'
          ? `Wawancara selesai dengan skor ${candidate?.interviewScore ?? '-'} / 100.`
          : 'Sesi wawancara belum diselesaikan.',
      badge:
        candidate?.interviewStatus === 'completed'
          ? 'Interview Selesai'
          : candidate?.interviewStatus === 'called'
            ? 'Sedang Berlangsung'
            : 'Menunggu',
      badgeVariant: interviewVariant
    });

    list.push({
      time: candidate?.compositeScore ? formatDate(candidate?.createdAt) : '-',
      icon: Award,
      title: 'Kalkulasi Skor Komposit & Rekomendasi',
      description:
        candidate?.compositeScore != null
          ? `Skor akhir kandidat ${candidate.compositeScore} / 100 dengan integritas AI ${candidate.integrityScore ?? '-'}%.`
          : 'Skor komposit belum ditetapkan.',
      badge: candidate?.compositeScore != null ? 'Hasil Ditetapkan' : 'Menunggu',
      badgeVariant: candidate?.compositeScore != null ? 'teal' : 'neutral'
    });

    return list;
  }, [candidate]);

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
