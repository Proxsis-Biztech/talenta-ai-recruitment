import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
  Scale,
  FileEdit,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Users
} from 'lucide-react';
import { Card, Button, Badge } from '../ui';

interface CorrectionItem {
  id: string;
  scoreId: string;
  candidateCode: string;
  candidateName: string;
  programTitle: string;
  requestedByName: string;
  requestedAt: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  currentVersion: number;
  currentSnapshot: {
    lhaNumber: string | null;
    interviewScore: number;
    compositeScore: number | null;
    recommendation: string;
    notes: string | null;
    competencies: Array<{ name: string; score: number; weight?: number }>;
  };
  proposed: {
    interviewScore: number;
    compositeScore: number | null;
    recommendation: 'LANJUT' | 'DIPERTIMBANGKAN' | 'TIDAK';
    notes: string;
    competencies: Array<{ name: string; score: number; weight?: number }>;
  };
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  resultingVersion?: number;
  resultingLhaNumber?: string;
}

interface CalibrationRow {
  candidateCode: string;
  candidateName: string;
  programTitle: string;
  lhaStatus: string;
  primary: {
    assessorName: string | null;
    interviewScore: number;
    compositeScore: number | null;
    recommendation: string;
  } | null;
  secondary: {
    assessorName: string;
    interviewScore: number;
    compositeScore: number | null;
    recommendation: string;
    submittedAt: string;
  } | null;
  consensus: {
    mode: string;
    calibratedBy: string;
    interviewScore: number;
    recommendation: string;
  } | null;
  metrics: {
    status: 'belum_dinilai' | 'menunggu_penilai_1' | 'menunggu_penilai_2' | 'perlu_kalibrasi' | 'selaras';
    maxCompetencyDelta: number;
    interviewDelta: number;
    compositeDelta: number;
    recommendationMatch: boolean;
    competencyComparison: Array<{
      name: string;
      primaryScore: number | null;
      secondaryScore: number | null;
      delta: number | null;
    }>;
  };
}

export default function AdminLhaGovernanceView() {
  const [tab, setTab] = useState<'corrections' | 'calibration'>('corrections');
  const [corrections, setCorrections] = useState<CorrectionItem[]>([]);
  const [calibrations, setCalibrations] = useState<CalibrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotesById, setReviewNotesById] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedCalCode, setExpandedCalCode] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const headers = { Authorization: `Bearer ${token}` };
      const [corrRes, calRes] = await Promise.all([
        axios.get('/api/admin/lha/corrections', { headers }),
        axios.get('/api/asesor/calibration', { headers })
      ]);
      setCorrections(Array.isArray(corrRes.data?.data) ? corrRes.data.data : []);
      setCalibrations(Array.isArray(calRes.data?.data) ? calRes.data.data : []);
    } catch {
      // Keep UI responsive on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleReviewCorrection = async (item: CorrectionItem, action: 'approve' | 'reject') => {
    const confirmed = await Swal.fire({
      title: action === 'approve' ? 'Setujui Koreksi & Terbitkan Versi Baru?' : 'Tolak Permintaan Koreksi?',
      text:
        action === 'approve'
          ? `LHA ${item.candidateName} (${item.candidateCode}) akan diarsipkan sebagai v${item.currentVersion} dan diterbitkan versi resmi v${item.currentVersion + 1}.`
          : `Permintaan koreksi dari ${item.requestedByName} akan ditandai ditolak.`,
      icon: action === 'approve' ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: action === 'approve' ? '#0B4686' : '#DC2626',
      confirmButtonText: action === 'approve' ? 'Ya, Setujui & Terbitkan' : 'Ya, Tolak',
      cancelButtonText: 'Batal'
    });
    if (!confirmed.isConfirmed) return;

    setProcessingId(item.id);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `/api/admin/lha/corrections/${item.id}/review`,
        { action, reviewNotes: reviewNotesById[item.id] || '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadData();
      Swal.fire({
        icon: 'success',
        title: action === 'approve' ? `LHA Versi v${item.currentVersion + 1} Terbit` : 'Permintaan Ditolak',
        timer: 2200,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memproses',
        text: err?.response?.data?.error || 'Tidak dapat memproses persetujuan koreksi.'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = corrections.filter((c) => c.status === 'pending').length;
  const discrepancyCount = calibrations.filter((c) => c.metrics.status === 'perlu_kalibrasi').length;

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('corrections')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              tab === 'corrections'
                ? 'bg-primary-navy text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileEdit className="w-4 h-4" />
            <span>Persetujuan Koreksi LHA</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-400 text-slate-900 font-extrabold">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('calibration')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              tab === 'calibration'
                ? 'bg-primary-navy text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Kalibrasi &amp; Penilaian Ganda</span>
            {discrepancyCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-rose-500 text-white font-extrabold">
                {discrepancyCount}
              </span>
            )}
          </button>
        </div>

        <Button variant="outline" size="sm" onClick={() => void loadData()} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Muat Ulang Data
        </Button>
      </div>

      {loading ? (
        <Card className="p-10 text-center text-sm text-slate-500">Memuat data tata kelola LHA &amp; kalibrasi...</Card>
      ) : tab === 'corrections' ? (
        <div className="space-y-4">
          {corrections.length === 0 ? (
            <Card className="p-10 text-center space-y-2 border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Belum Ada Permintaan Koreksi LHA</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                LHA yang sudah terbit terkunci secara kriptografis. Jika asesor mengajukan revisi resmi pasca-publikasi, antrean persetujuan akan tampil di sini.
              </p>
            </Card>
          ) : (
            corrections.map((item) => (
              <Card key={item.id} className="p-5 border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary-navy bg-soft-blue px-2 py-0.5 rounded">
                        {item.candidateCode}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{item.candidateName}</span>
                      <Badge
                        variant={
                          item.status === 'pending' ? 'warning' : item.status === 'approved' ? 'success' : 'danger'
                        }
                        format="soft"
                      >
                        {item.status === 'pending'
                          ? 'Menunggu Persetujuan'
                          : item.status === 'approved'
                            ? `Disetujui -> v${item.resultingVersion || item.currentVersion + 1}`
                            : 'Ditolak'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {item.programTitle} • Diajukan oleh <strong>{item.requestedByName}</strong> pada{' '}
                      {new Date(item.requestedAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    LHA Asal: {item.currentSnapshot.lhaNumber || `v${item.currentVersion}`}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950">
                  <span className="font-bold block mb-0.5">Alasan Koreksi Resmi:</span>
                  {item.reason}
                </div>

                {/* Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase text-slate-500">
                      LHA Terbit Saat Ini (v{item.currentVersion})
                    </span>
                    <div className="flex items-center justify-between">
                      <span>Skor Wawancara / Komposit:</span>
                      <span className="font-mono font-bold">
                        {item.currentSnapshot.interviewScore} / {item.currentSnapshot.compositeScore ?? '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Rekomendasi:</span>
                      <span className="font-bold">{item.currentSnapshot.recommendation}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase text-primary-navy flex items-center gap-1">
                      <ArrowRight className="w-3.5 h-3.5" />
                      Usulan Koreksi (v{item.currentVersion + 1})
                    </span>
                    <div className="flex items-center justify-between">
                      <span>Skor Wawancara / Komposit:</span>
                      <span className="font-mono font-bold text-primary-navy">
                        {item.proposed.interviewScore} / {item.proposed.compositeScore ?? '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Rekomendasi:</span>
                      <span className="font-bold text-primary-navy">{item.proposed.recommendation}</span>
                    </div>
                  </div>
                </div>

                {item.status === 'pending' ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-slate-100">
                    <input
                      type="text"
                      value={reviewNotesById[item.id] || ''}
                      onChange={(e) => setReviewNotesById((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="Catatan reviewer / dasar keputusan persetujuan..."
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-primary-navy outline-none"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={processingId === item.id}
                        onClick={() => void handleReviewCorrection(item, 'reject')}
                        leftIcon={<XCircle className="w-3.5 h-3.5" />}
                      >
                        Tolak
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={processingId === item.id}
                        onClick={() => void handleReviewCorrection(item, 'approve')}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Setujui &amp; Terbitkan v{item.currentVersion + 1}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <span>
                      Direview oleh <strong>{item.reviewedBy || '-'}</strong> ({item.reviewedAt ? new Date(item.reviewedAt).toLocaleString('id-ID') : '-'})
                    </span>
                    {item.resultingLhaNumber && (
                      <span className="font-mono text-emerald-700 font-semibold">Nomor Baru: {item.resultingLhaNumber}</span>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {calibrations.length === 0 ? (
            <Card className="p-10 text-center text-sm text-slate-500">
              Belum ada data penilaian asesor untuk dikalibrasi.
            </Card>
          ) : (
            calibrations.map((row) => {
              const key = `${row.candidateCode}::${row.programTitle}`;
              const expanded = expandedCalCode === key;
              return (
                <Card key={key} className="p-5 border-slate-200 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary-navy bg-soft-blue px-2 py-0.5 rounded">
                          {row.candidateCode}
                        </span>
                        <span className="font-bold text-sm text-slate-900">{row.candidateName}</span>
                        <Badge
                          variant={
                            row.metrics.status === 'selaras'
                              ? 'success'
                              : row.metrics.status === 'perlu_kalibrasi'
                                ? 'danger'
                                : 'warning'
                          }
                          format="soft"
                        >
                          {row.metrics.status === 'selaras'
                            ? 'Selaras'
                            : row.metrics.status === 'perlu_kalibrasi'
                              ? 'Perlu Kalibrasi'
                              : row.metrics.status === 'menunggu_penilai_2'
                                ? 'Menunggu Penilai Ke-2'
                                : 'Menunggu Penilai Ke-1'}
                        </Badge>
                        {row.consensus && (
                          <Badge variant="teal" format="soft">
                            Konsensus ({row.consensus.mode})
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{row.programTitle}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Penilai 1</span>
                        <span className="font-mono font-bold text-slate-800">
                          {row.primary ? `${row.primary.interviewScore} (${row.primary.recommendation})` : 'Belum ada'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Penilai 2</span>
                        <span className="font-mono font-bold text-slate-800">
                          {row.secondary ? `${row.secondary.interviewScore} (${row.secondary.recommendation})` : 'Belum ada'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Selisih Max</span>
                        <span
                          className={`font-mono font-bold ${
                            row.metrics.status === 'perlu_kalibrasi' ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {row.secondary && row.primary
                            ? `${row.metrics.maxCompetencyDelta} BARS / ${row.metrics.interviewDelta} pt`
                            : '-'}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setExpandedCalCode(expanded ? null : key)}
                      >
                        {expanded ? 'Tutup Detail' : 'Lihat Matriks'}
                      </Button>
                    </div>
                  </div>

                  {expanded && row.metrics.competencyComparison.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 overflow-x-auto">
                      <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="p-2 text-left border-b border-slate-200">Kompetensi BARS</th>
                            <th className="p-2 text-center border-b border-slate-200">Penilai 1</th>
                            <th className="p-2 text-center border-b border-slate-200">Penilai 2</th>
                            <th className="p-2 text-center border-b border-slate-200">Selisih</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.metrics.competencyComparison.map((comp) => (
                            <tr key={comp.name} className="border-b border-slate-100">
                              <td className="p-2 font-medium text-slate-800">{comp.name}</td>
                              <td className="p-2 text-center font-mono">{comp.primaryScore?.toFixed(1) ?? '-'}</td>
                              <td className="p-2 text-center font-mono">{comp.secondaryScore?.toFixed(1) ?? '-'}</td>
                              <td
                                className={`p-2 text-center font-mono font-bold ${
                                  (comp.delta ?? 0) >= 1 ? 'text-rose-600' : 'text-emerald-700'
                                }`}
                              >
                                {comp.delta != null ? comp.delta.toFixed(1) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
