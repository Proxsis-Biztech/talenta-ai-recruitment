import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Sparkles,
  ChevronDown,
  Search,
  Check,
  Video
} from 'lucide-react';
import { AsesorLayout } from './AsesorLayout';
import { Button, Badge } from '../ui';
import { getPortalToken } from '../../services/portalAuthService';
import {
  fetchAssessorCandidates,
  fetchAssessorProctoringSummary,
  type AssessorCandidate,
  type AssessorProctoringEvent
} from '../../services/assessorService';

type ProctoringEvent = AssessorProctoringEvent;

const getInterviewStatusMeta = (candidate?: AssessorCandidate | null) => {
  if (!candidate) {
    return {
      hasJoined: false,
      label: 'Belum Interview',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
    };
  }
  if (
    candidate.interviewStatus === 'completed' ||
    Boolean(candidate.completedAt) ||
    candidate.interviewScore != null
  ) {
    return {
      hasJoined: true,
      label: 'Sudah Interview',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }
  if (candidate.interviewStatus === 'called' || candidate.interviewStatus === 'in_progress') {
    return {
      hasJoined: false,
      label: 'Sedang / Dipanggil Interview',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
    };
  }
  return {
    hasJoined: false,
    label: 'Belum Interview',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
  };
};

export default function AsesorProctoringReview() {
  const navigate = useNavigate();
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [apiIntegrityScore, setApiIntegrityScore] = useState<number | null>(null);
  const [integrityScore, setIntegrityScore] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<AssessorCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [selectedCode, setSelectedCode] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [interviewFilter, setInterviewFilter] = useState<'all' | 'done' | 'pending'>('all');
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [events, setEvents] = useState<ProctoringEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingCandidates(true);
    fetchAssessorCandidates()
      .then((data) => {
        if (cancelled) return;
        setCandidates(data);
        if (data.length > 0) {
          const flaggedCandidate =
            data.find(
              (c) =>
                (c.proctoringFlagCount ?? 0) > 0 ||
                (c.integrityScore != null && c.integrityScore < 100)
            ) || data[0];
          setSelectedCode(flaggedCandidate.candidateCode || flaggedCandidate.id);
        }
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

  useEffect(() => {
    let cancelled = false;
    if (!selectedCode) {
      setEvents([]);
      setApiIntegrityScore(null);
      return;
    }
    setLoadingEvents(true);
    fetchAssessorProctoringSummary(selectedCode)
      .then(({ events: evts, integrityScore: score }) => {
        if (!cancelled) {
          setEvents(evts);
          setApiIntegrityScore(score);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEvents([]);
          setApiIntegrityScore(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingEvents(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCode]);

  const selectedCandidate = candidates.find(
    (candidate) => (candidate.candidateCode || candidate.id) === selectedCode
  );
  const selectedInterviewMeta = getInterviewStatusMeta(selectedCandidate);

  const interviewCounts = useMemo(() => {
    let done = 0;
    let pending = 0;
    for (const c of candidates) {
      if (getInterviewStatusMeta(c).hasJoined) done += 1;
      else pending += 1;
    }
    return { all: candidates.length, done, pending };
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const q = candidateSearch.trim().toLowerCase();
    return candidates.filter((c) => {
      const meta = getInterviewStatusMeta(c);
      if (interviewFilter === 'done' && !meta.hasJoined) return false;
      if (interviewFilter === 'pending' && meta.hasJoined) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.code || '').toLowerCase().includes(q) ||
        (c.programCode || '').toLowerCase().includes(q)
      );
    });
  }, [candidates, candidateSearch, interviewFilter]);

  useEffect(() => {
    const baseScore = apiIntegrityScore ?? selectedCandidate?.integrityScore ?? null;
    if (baseScore == null && events.length === 0) {
      setIntegrityScore(null);
      return;
    }
    const nonVerified = events.filter(
      (event) =>
        event.status !== 'info' &&
        !String(event.type).toLowerCase().includes('face_verified') &&
        !String(event.type).toLowerCase().includes('verifikasi_berkala')
    );
    const validCount = nonVerified.filter((event) => event.status === 'valid').length;
    const falsePositiveCount = nonVerified.filter((event) => event.status === 'false_positive').length;
    const pendingCount = nonVerified.filter((event) => event.status === 'pending').length;

    const initialScore = baseScore ?? 100;
    const recovery =
      nonVerified.length > 0 && initialScore < 100
        ? Math.round((falsePositiveCount / nonVerified.length) * (100 - initialScore))
        : 0;
    const computed = Math.min(
      100,
      Math.max(
        0,
        Math.min(initialScore + recovery, 100 - validCount * 6 - (baseScore === 100 ? pendingCount * 4 : 0))
      )
    );
    setIntegrityScore(computed);
  }, [events, apiIntegrityScore, selectedCandidate?.integrityScore]);

  const pendingReviewCount = events.filter(
    (event) => !['valid', 'false_positive', 'info'].includes(event.status)
  ).length;
  const validFlagCount = events.filter((event) => event.status === 'valid').length;
  const falsePositiveFlagCount = events.filter(
    (event) => event.status === 'false_positive'
  ).length;
  const severityCounts = {
    high: events.filter((event) => event.severity === 'high').length,
    medium: events.filter((event) => event.severity === 'medium').length,
    low: events.filter((event) => event.severity === 'low').length
  };

  const persistReview = async (id: string, status: 'pending' | 'valid' | 'false_positive' | 'info', notes: string) => {
    if (status === 'pending' || status === 'info') return;
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
    if (!current || current.status === 'pending' || current.status === 'info') return;
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
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Badge variant="danger" format="soft" className="uppercase font-semibold text-xs">
              PROCTORING AUDIT
            </Badge>
            <Badge variant="navy" className="text-xs">{`Kandidat: ${selectedCandidate?.name || '-'} (${selectedCandidate?.programCode || '-'})`}</Badge>
            {selectedCandidate && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${selectedInterviewMeta.badgeClass}`}
              >
                {selectedInterviewMeta.hasJoined ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <Clock className="w-3 h-3" />
                )}
                {selectedInterviewMeta.label}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-ink tracking-tight">
            Review Temuan Integritas & Flag Proctoring AI
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Audit rekaman snapshot kejadian mencurigakan yang ditangkap otomatis oleh mesin OpenCV & Browser Integrity Guard.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-xs font-semibold text-slate-700 shrink-0">Pilih Kandidat</label>
            <div ref={dropdownRef} className="relative w-full sm:w-[460px]">
              <button
                type="button"
                disabled={loadingCandidates || candidates.length === 0}
                onClick={() => setDropdownOpen((open) => !open)}
                className="w-full px-3.5 py-2.5 text-left bg-white border border-slate-200 hover:border-primary-navy/60 focus:outline-none focus:ring-2 focus:ring-primary-navy/15 rounded-xl shadow-2xs flex items-center justify-between gap-3 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingCandidates ? (
                  <span className="text-xs text-slate-500">Memuat daftar kandidat...</span>
                ) : candidates.length === 0 ? (
                  <span className="text-xs text-slate-500">Belum ada kandidat pada tenant PT Anda</span>
                ) : selectedCandidate ? (
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-primary-navy font-bold text-xs flex items-center justify-center shrink-0">
                      {selectedCandidate.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-ink truncate">
                          {selectedCandidate.name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 shrink-0">
                          ({selectedCandidate.code})
                        </span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${selectedInterviewMeta.badgeClass}`}
                    >
                      {selectedInterviewMeta.label}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">Pilih kandidat...</span>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {dropdownOpen && candidates.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                  <div className="p-3 bg-slate-50/80 border-b border-slate-200 space-y-2.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={candidateSearch}
                        onChange={(e) => setCandidateSearch(e.target.value)}
                        placeholder="Cari nama, kode kandidat, atau program..."
                        autoFocus
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary-navy"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          { key: 'all', label: `Semua (${interviewCounts.all})` },
                          { key: 'done', label: `Sudah Interview (${interviewCounts.done})` },
                          { key: 'pending', label: `Belum Interview (${interviewCounts.pending})` }
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setInterviewFilter(tab.key)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                            interviewFilter === tab.key
                              ? 'bg-primary-navy text-white'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {filteredCandidates.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-slate-500">
                        Tidak ada kandidat yang sesuai filter.
                      </div>
                    ) : (
                      filteredCandidates.map((candidate) => {
                        const codeVal = candidate.candidateCode || candidate.id;
                        const isSelected = codeVal === selectedCode;
                        const interviewMeta = getInterviewStatusMeta(candidate);
                        const flagCount = candidate.proctoringFlagCount ?? 0;
                        return (
                          <button
                            key={candidate.id}
                            type="button"
                            onClick={() => {
                              setSelectedCode(codeVal);
                              setDropdownOpen(false);
                            }}
                            className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                              isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span
                                className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-primary-navy text-white'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {candidate.name.charAt(0).toUpperCase()}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-ink truncate">
                                    {candidate.name}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                    {candidate.code}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span className="truncate">{candidate.programCode || '-'}</span>
                                  {flagCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold shrink-0">
                                      {flagCount} Flag
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${interviewMeta.badgeClass}`}
                              >
                                {interviewMeta.hasJoined ? (
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                ) : (
                                  <Video className="w-2.5 h-2.5" />
                                )}
                                {interviewMeta.label}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-primary-navy" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
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
                  stroke={
                    integrityScore == null
                      ? '#94A3B8'
                      : integrityScore > 80 && pendingReviewCount === 0
                        ? '#16A34A'
                        : integrityScore > 60
                          ? '#F59E0B'
                          : '#DC2626'
                  }
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray="351"
                  strokeDashoffset={integrityScore == null ? 351 : 351 - (351 * integrityScore) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-3xl font-extrabold text-ink">
                  {integrityScore == null ? '-' : integrityScore}
                </span>
                <span className="text-[10px] text-muted-slate">/ 100</span>
              </div>
            </div>
            <p
              className={`text-xs font-bold mt-2 ${
                integrityScore == null
                  ? 'text-slate-500'
                  : integrityScore <= 60
                    ? 'text-red-600'
                    : integrityScore <= 80 || pendingReviewCount > 0
                      ? 'text-amber-600'
                      : 'text-emerald-600'
              }`}
            >
              {integrityScore == null
                ? 'Status: Belum Ada Data CAT'
                : integrityScore <= 80
                  ? 'Status: Perlu Pemeriksaan'
                  : pendingReviewCount > 0
                    ? 'Status: Menunggu Verifikasi Flag'
                    : 'Status: Bersih & Valid'}
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

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-slate">
              <span>Status Verifikasi: {pendingReviewCount} Pending • {validFlagCount} Valid • {falsePositiveFlagCount} False Positive</span>
              <span>Skor Sistem Awal: {apiIntegrityScore ?? selectedCandidate?.integrityScore ?? '-'}</span>
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
              {/* Snapshot Evidence or Honest Event Log Badge */}
              {evt.snapshotUrl ? (
                <div className="w-full lg:w-48 aspect-video bg-slate-900 rounded-xl border border-slate-800 shrink-0 relative overflow-hidden">
                  <img
                    src={evt.snapshotUrl}
                    alt={`Bukti ${evt.type}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 right-2 bg-black/75 text-white font-mono text-[9px] px-1.5 py-0.5 rounded">
                    {evt.time}
                  </span>
                </div>
              ) : (
                <div className="w-full lg:w-48 aspect-video bg-slate-100 rounded-xl border border-slate-200 shrink-0 relative overflow-hidden flex flex-col items-center justify-center p-3 text-center">
                  <Camera className="w-6 h-6 text-slate-400 mb-1.5" />
                  <span className="text-[11px] font-semibold text-slate-600">Tanpa Snapshot Visual</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Log sistem (perlu review)</span>
                  <span className="absolute bottom-2 right-2 bg-slate-700 text-white font-mono text-[9px] px-1.5 py-0.5 rounded">
                    {evt.time}
                  </span>
                </div>
              )}

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
                    {evt.status === 'info' && (
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
                        ℹ Foto Verifikasi Berkala (Audit Kehadiran)
                      </span>
                    )}
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

                {/* Validation Action Buttons (disembunyikan pada event audit verifikasi rutin) */}
                {evt.status === 'info' ? (
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>Audit kehadiran rutin (bukan catatan pelanggaran dan tidak mengurangi skor integritas).</span>
                    <button
                      onClick={() => handleStatusChange(evt.id, 'valid')}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Tandai Anomali
                    </button>
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AsesorLayout>
  );
}
