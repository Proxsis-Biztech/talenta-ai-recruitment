import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  ShieldAlert,
  ShieldCheck,
  X
} from 'lucide-react';
import { Badge } from '../ui';
import {
  fetchAssessorProctoring,
  updateAssessorProctoringReview,
  type AssessorProctoringEvent
} from '../../services/assessorService';

interface AsesorProctoringCardProps {
  candidateCode: string;
  integrityScore?: number | null;
  stageFilter?: 'all' | 'cat' | 'interview';
  title?: string;
  subtitle?: string;
}

const SEVERITY_LABEL: Record<
  AssessorProctoringEvent['severity'],
  { label: string; variant: 'danger' | 'warning' | 'neutral' }
> = {
  high: { label: 'Tinggi', variant: 'danger' },
  medium: { label: 'Sedang', variant: 'warning' },
  low: { label: 'Rendah', variant: 'neutral' }
};

const STATUS_LABEL: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  valid: { label: 'Pelanggaran Terkonfirmasi', variant: 'danger' },
  false_positive: { label: 'Diabaikan (False Positive)', variant: 'neutral' },
  pending: { label: 'Tercatat Sistem', variant: 'warning' },
  info: { label: 'Verifikasi Rutin', variant: 'success' }
};

export function AsesorProctoringCard({
  candidateCode,
  integrityScore,
  stageFilter = 'all',
  title,
  subtitle
}: AsesorProctoringCardProps) {
  const [events, setEvents] = useState<AssessorProctoringEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoutineLogs, setShowRoutineLogs] = useState(false);
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);
  const [previewSnapshot, setPreviewSnapshot] = useState<{ url: string; label: string } | null>(null);

  useEffect(() => {
    if (!candidateCode) return;
    let cancelled = false;
    setLoading(true);
    setShowRoutineLogs(false);
    fetchAssessorProctoring(candidateCode)
      .then((list) => {
        if (!cancelled) setEvents(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [candidateCode]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (stageFilter === 'cat') return ev.id.startsWith('EXAM-');
      if (stageFilter === 'interview') return ev.id.startsWith('INT-');
      return true;
    });
  }, [events, stageFilter]);

  const alertEvents = useMemo(
    () =>
      filteredEvents.filter(
        (ev) => ev.status !== 'info' && ev.type !== 'VERIFIKASI_BERKALA'
      ),
    [filteredEvents]
  );

  const routineEvents = useMemo(
    () =>
      filteredEvents.filter(
        (ev) => ev.status === 'info' || ev.type === 'VERIFIKASI_BERKALA'
      ),
    [filteredEvents]
  );

  const handleReviewStatus = async (eventId: string, status: 'valid' | 'false_positive') => {
    setUpdatingEventId(eventId);
    try {
      await updateAssessorProctoringReview(candidateCode, eventId, status);
      setEvents((prev) =>
        prev.map((ev) => (ev.id === eventId ? { ...ev, status } : ev))
      );
    } catch {
      // keep previous state on failure
    } finally {
      setUpdatingEventId(null);
    }
  };

  const hasAlerts = alertEvents.length > 0;
  const resolvedTitle =
    title ||
    (stageFilter === 'cat'
      ? 'Keterangan Proctoring Ujian CAT'
      : stageFilter === 'interview'
        ? 'Keterangan Proctoring Interview AI'
        : 'Keterangan Proctoring (Ujian CAT & Interview AI)');
  const resolvedSubtitle =
    subtitle ||
    (stageFilter === 'cat'
      ? 'Catatan integritas, perpindahan tab, dan kamera selama pengerjaan soal CAT.'
      : stageFilter === 'interview'
        ? 'Catatan integritas, fokus layar, dan deteksi kamera selama wawancara Ava AI.'
        : 'Rekam jejak pengawasan otomatis selama pengerjaan soal CAT dan wawancara Ava AI.');

  const renderEventRow = (ev: AssessorProctoringEvent, allowReview: boolean) => {
    const sev = SEVERITY_LABEL[ev.severity] || SEVERITY_LABEL.low;
    const st = STATUS_LABEL[ev.status] || STATUS_LABEL.pending;
    const stageTag = ev.id.startsWith('EXAM-') ? 'Ujian CAT' : 'Interview AI';
    const isBusy = updatingEventId === ev.id;

    return (
      <div
        key={ev.id}
        className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
      >
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-[10px] text-slate-700">
              {stageTag}
            </span>
            <Badge variant={sev.variant} format="soft">
              {sev.label}
            </Badge>
            <span className="font-semibold text-ink">{ev.type}</span>
            <span className="text-[11px] font-mono text-slate-400">{ev.time}</span>
          </div>
          <p className="text-slate-600 leading-relaxed">{ev.description}</p>
          {ev.assessorNotes && (
            <p className="text-[11px] text-slate-500 italic">Catatan: {ev.assessorNotes}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <Badge variant={st.variant} format="outline">
            {st.label}
          </Badge>
          {allowReview && (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                disabled={isBusy || ev.status === 'valid'}
                onClick={() => void handleReviewStatus(ev.id, 'valid')}
                className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                  ev.status === 'valid'
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                }`}
              >
                Valid
              </button>
              <button
                type="button"
                disabled={isBusy || ev.status === 'false_positive'}
                onClick={() => void handleReviewStatus(ev.id, 'false_positive')}
                className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                  ev.status === 'false_positive'
                    ? 'bg-slate-200 border-slate-300 text-slate-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Abaikan
              </button>
            </div>
          )}
          {ev.snapshotUrl && (
            <button
              type="button"
              onClick={() =>
                setPreviewSnapshot({
                  url: ev.snapshotUrl || '',
                  label: `${stageTag} • ${ev.type} (${ev.time})`
                })
              }
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer"
            >
              <Camera className="w-3 h-3" />
              <span>Bukti</span>
              <Eye className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              hasAlerts ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {hasAlerts ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="font-heading text-sm sm:text-base font-bold text-ink">{resolvedTitle}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{resolvedSubtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {integrityScore != null && (
            <Badge
              variant={integrityScore >= 85 ? 'success' : integrityScore >= 70 ? 'warning' : 'danger'}
              format="soft"
            >
              Skor Integritas: {Math.round(integrityScore)}%
            </Badge>
          )}
          <Badge variant={hasAlerts ? 'warning' : 'success'} format="soft" hasDot>
            {hasAlerts ? `${alertEvents.length} Catatan Pelanggaran` : 'Aman • 0 Pelanggaran'}
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="py-5 text-center text-xs text-slate-500">Memuat catatan proctoring...</div>
      ) : (
        <div className="space-y-3">
          {alertEvents.length === 0 ? (
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-2.5 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Tidak ada pelanggaran atau anomali proctoring yang tercatat pada tahap{' '}
                {stageFilter === 'cat' ? 'Soal CAT' : stageFilter === 'interview' ? 'Interview AI' : 'CAT maupun Interview AI'}.
              </span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {alertEvents.map((ev) => renderEventRow(ev, true))}
            </div>
          )}

          {routineEvents.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowRoutineLogs((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-ink cursor-pointer"
              >
                {showRoutineLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>
                  {showRoutineLogs ? 'Sembunyikan' : 'Tampilkan'} {routineEvents.length} log verifikasi berkala
                </span>
              </button>
              {showRoutineLogs && (
                <div className="space-y-2 mt-2 max-h-[200px] overflow-y-auto pr-1">
                  {routineEvents.map((ev) => renderEventRow(ev, false))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {previewSnapshot && (
        <div
          onClick={() => setPreviewSnapshot(null)}
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-xl border border-slate-200"
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-ink truncate">{previewSnapshot.label}</span>
              <button
                type="button"
                onClick={() => setPreviewSnapshot(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-50 flex justify-center">
              <img
                src={previewSnapshot.url}
                alt={previewSnapshot.label}
                className="max-h-[60vh] rounded-xl border border-slate-200 object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
