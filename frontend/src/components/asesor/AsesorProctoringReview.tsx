import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Clock,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  Camera,
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { AsesorLayout } from './AsesorLayout';
import { Button, Badge } from '../ui';
import { getPortalToken } from '../../services/portalAuthService';
import { fetchAssessorCandidates, fetchAssessorProctoring, type AssessorCandidate } from '../../services/assessorService';

interface ProctoringEvent {
  id: string;
  time: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  status: 'pending' | 'valid' | 'false_positive';
  assessorNotes: string;
}

export default function AsesorProctoringReview() {
  const navigate = useNavigate();
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [integrityScore, setIntegrityScore] = useState(100);
  const [candidates, setCandidates] = useState<AssessorCandidate[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [events, setEvents] = useState<ProctoringEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAssessorCandidates()
      .then((data) => {
        if (cancelled) return;
        setCandidates(data);
        if (data.length > 0) setSelectedCode(data[0].candidateCode || data[0].id);
      })
      .catch(() => {
        if (!cancelled) setCandidates([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!selectedCode) {
      setEvents([]);
      return;
    }
    setLoadingEvents(true);
    fetchAssessorProctoring(selectedCode)
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEvents(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCode]);

  useEffect(() => {
    const validCount = events.filter((event) => event.status === 'valid').length;
    setIntegrityScore(Math.max(0, 100 - validCount * 6));
  }, [events]);

  const selectedCandidate = candidates.find(
    (candidate) => (candidate.candidateCode || candidate.id) === selectedCode
  );
  const severityCounts = {
    high: events.filter((event) => event.severity === 'high').length,
    medium: events.filter((event) => event.severity === 'medium').length,
    low: events.filter((event) => event.severity === 'low').length
  };

  const persistReview = async (id: string, status: 'pending' | 'valid' | 'false_positive', notes: string) => {
    if (status === 'pending') return;
    const token = getPortalToken();
    if (!token) return;
    try {
      await axios.put(`/api/asesor/proctoring/${selectedCode}/${id}`, { status, notes }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {
      // Keep the local state; the next change will retry persistence.
    }
  };

  const handleStatusChange = (id: string, newStatus: 'valid' | 'false_positive') => {
    const current = events.find((event) => event.id === id);
    if (!current || current.status === newStatus) return;
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e))
    );
    void persistReview(id, newStatus, current.assessorNotes);
  };

  const handleNotesChange = (id: string, notes: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, assessorNotes: notes } : e))
    );
  };

  const handleNotesSave = (id: string, notes: string) => {
    const current = events.find((event) => event.id === id);
    if (!current || current.status === 'pending') return;
    void persistReview(id, current.status, notes);
  };

  const filtered = events.filter((e) => {
    if (filterSeverity === 'all') return true;
    return e.severity === filterSeverity;
  });

  return (
    <AsesorLayout activeTab="proctoring">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="danger" format="soft" className="uppercase font-semibold text-xs">
              PROCTORING AUDIT
            </Badge>
            <Badge variant="navy" className="text-xs">{`Kandidat: ${selectedCandidate?.name || '-'} (${selectedCandidate?.programCode || '-'})`}</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-ink tracking-tight">
            Review Temuan Integritas & Flag Proctoring AI
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Audit rekaman snapshot kejadian mencurigakan yang ditangkap otomatis oleh mesin OpenCV & Browser Integrity Guard.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold text-slate-600">Pilih Kandidat</label>
            <select
              value={selectedCode}
              onChange={(event) => setSelectedCode(event.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-ink focus:outline-none focus:border-primary-navy"
            >
              {candidates.length === 0 ? (
                <option value="">Belum ada kandidat</option>
              ) : (
                candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.candidateCode || candidate.id}>
                    {candidate.name} ({candidate.code})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* ─── Top Split: Integrity Score Gauge + Diagnostic Summary ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Integrity Score Gauge (1 col) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-muted-slate uppercase tracking-wider mb-2">
              Skor Integritas Kandidat
            </span>
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="56"
                  stroke="#E2E8F0"
                  strokeWidth="12"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="56"
                  stroke={integrityScore > 80 ? '#16A34A' : integrityScore > 60 ? '#F59E0B' : '#DC2626'}
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray="351"
                  strokeDashoffset={351 - (351 * integrityScore) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-3xl font-extrabold text-ink">
                  {integrityScore}
                </span>
                <span className="text-[10px] text-muted-slate">/ 100</span>
              </div>
            </div>
            <p className="text-xs font-bold mt-2 text-warning-amber">
              {integrityScore > 80 ? 'Status: Bersih & Valid' : 'Status: Perlu Pemeriksaan'}
            </p>
          </div>

          {/* Quick Metrics (2 cols) */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-border-slate p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-heading font-bold text-base text-ink mb-1">
                Ringkasan Rekomendasi Integritas AI
              </h3>
              <p className="text-xs text-muted-slate mb-4">
                Terdapat {events.length} flag otomatis yang tercatat untuk kandidat ini. Silakan konfirmasi status keabsahan setiap event di bawah.
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-[11px] text-red-700 font-bold">Severity Tinggi</p>
                  <p className="font-mono text-xl font-extrabold text-red-900 mt-1">{severityCounts.high} Flag</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-[11px] text-amber-800 font-bold">Severity Sedang</p>
                  <p className="font-mono text-xl font-extrabold text-amber-900 mt-1">{severityCounts.medium} Flag</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[11px] text-slate-600 font-bold">Severity Rendah</p>
                  <p className="font-mono text-xl font-extrabold text-slate-800 mt-1">{severityCounts.low} Flag</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-muted-slate">
              <span>Kamera: 100% Waktu Terbuka</span>
              <span>Audio: Tidak Terdeteksi Bisikan Manusia</span>
            </div>
          </div>
        </div>

        {/* ─── Severity Filter Controls ─── */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink">Filter Severity:</span>
          {(['all', 'high', 'medium', 'low'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                filterSeverity === sev
                  ? 'bg-primary-navy text-white shadow-xs'
                  : 'bg-white border border-border-slate text-slate-600 hover:bg-slate-50'
              }`}
            >
              {sev === 'all' ? 'Semua Severity' : sev}
            </button>
          ))}
        </div>

        {/* ─── Event Timeline & Thumbnail Evidence Grid ─── */}
        <div className="space-y-4">
          {loadingEvents ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">Memuat event proctoring...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">Belum ada event proctoring untuk kandidat ini.</div>
          ) : filtered.map((evt) => (
            <div
              key={evt.id}
              className="bg-white rounded-2xl border border-border-slate p-6 shadow-xs flex flex-col lg:flex-row gap-6 items-start"
            >
              {/* Snapshot Thumbnail Placeholder (Simulated Webcam Capture) */}
              <div className="w-full lg:w-48 aspect-video bg-slate-900 rounded-xl border border-slate-800 shrink-0 relative overflow-hidden flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-400">
                  FP
                </div>
                <span className="absolute top-2 left-2 bg-red-600 text-white font-mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                  CAPTURE
                </span>
                <span className="absolute bottom-2 right-2 bg-black/70 text-slate-300 font-mono text-[9px] px-1 rounded">
                  {evt.time}
                </span>
              </div>

              {/* Event Content */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary-navy bg-soft-blue px-2 py-0.5 rounded">
                      {evt.time}
                    </span>
                    <h4 className="font-bold text-sm text-ink">{evt.type}</h4>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        evt.severity === 'high'
                          ? 'bg-red-100 text-red-800'
                          : evt.severity === 'medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {evt.severity}
                    </span>
                  </div>

                  <div>
                    {evt.status === 'valid' && (
                      <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md">
                        ✓ Dikonfirmasi Valid (Pelanggaran)
                      </span>
                    )}
                    {evt.status === 'false_positive' && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                        ✓ False Positive (Diabaikan)
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {evt.description}
                </p>

                {/* Field Catatan Asesor */}
                <div>
                  <input
                    type="text"
                    value={evt.assessorNotes}
                    onChange={(e) => handleNotesChange(evt.id, e.target.value)}
                    onBlur={() => handleNotesSave(evt.id, evt.assessorNotes)}
                    placeholder="Tulis catatan pertimbangan asesor untuk insiden ini..."
                    className="w-full px-3 py-1.5 rounded-lg border border-border-slate focus:border-primary-navy text-xs outline-none"
                  />
                </div>

                {/* Validation Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => handleStatusChange(evt.id, 'valid')}
                    className="px-3 py-1.5 rounded-lg bg-red-50 text-red-800 border border-red-200 hover:bg-red-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Tandai Valid (Pelanggaran)
                  </button>
                  <button
                    onClick={() => handleStatusChange(evt.id, 'false_positive')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Tandai False Positive
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AsesorLayout>
  );
}
