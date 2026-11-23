import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Users,
  Scale,
  FileEdit,
  History,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw
} from 'lucide-react';
import { Button, Badge, Modal } from '../ui';
import { calculateCompositeScore } from '../../services/asesorScoreService';
import { getPortalToken } from '../../services/portalAuthService';

export interface GovernanceCompetencyItem {
  id: string;
  name: string;
  weight: number;
  score: number;
  notes: string;
}

interface Props {
  candidateCode: string;
  candidateName: string;
  programCode?: string;
  programTitle: string;
  catScore: number | null;
  competencies: GovernanceCompetencyItem[];
  recommendation: 'LANJUT' | 'DIPERTIMBANGKAN' | 'TIDAK';
  assessorNotes: string;
  isSigned: boolean;
  lhaNumber: string;
  onApplyConsensusToDraft: (consensus: {
    competencies: GovernanceCompetencyItem[];
    recommendation: 'LANJUT' | 'DIPERTIMBANGKAN' | 'TIDAK';
    notes: string;
  }) => void;
}

export default function AsesorGovernancePanels({
  candidateCode,
  candidateName,
  programCode,
  programTitle,
  catScore,
  competencies,
  recommendation,
  assessorNotes,
  isSigned,
  lhaNumber,
  onApplyConsensusToDraft
}: Props) {
  const [calibration, setCalibration] = useState<any>(null);
  const [versionsData, setVersionsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Secondary assessor modal
  const [secModalOpen, setSecModalOpen] = useState(false);
  const [secCompetencies, setSecCompetencies] = useState<GovernanceCompetencyItem[]>([]);
  const [secRec, setSecRec] = useState<'LANJUT' | 'DIPERTIMBANGKAN' | 'TIDAK'>('LANJUT');
  const [secNotes, setSecNotes] = useState('');
  const [secSaving, setSecSaving] = useState(false);
  const [secFeedback, setSecFeedback] = useState('');

  // Official Correction modal
  const [corrModalOpen, setCorrModalOpen] = useState(false);
  const [corrReason, setCorrReason] = useState('');
  const [corrCompetencies, setCorrCompetencies] = useState<GovernanceCompetencyItem[]>([]);
  const [corrRec, setCorrRec] = useState<'LANJUT' | 'DIPERTIMBANGKAN' | 'TIDAK'>(recommendation);
  const [corrNotes, setCorrNotes] = useState('');
  const [corrSaving, setCorrSaving] = useState(false);
  const [corrFeedback, setCorrFeedback] = useState('');

  const loadGovernance = useCallback(async () => {
    if (!candidateCode) return;
    const token = getPortalToken();
    if (!token) return;
    setLoading(true);
    try {
      const [calRes, verRes] = await Promise.allSettled([
        axios.get(`/api/asesor/calibration/${encodeURIComponent(candidateCode)}`, {
          params: { programTitle },
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`/api/asesor/lha/${encodeURIComponent(candidateCode)}/versions`, {
          params: { programTitle },
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      if (calRes.status === 'fulfilled') {
        setCalibration(calRes.value.data?.data || null);
      }
      if (verRes.status === 'fulfilled') {
        setVersionsData(verRes.value.data?.data || null);
      }
    } finally {
      setLoading(false);
    }
  }, [candidateCode, programTitle]);

  useEffect(() => {
    void loadGovernance();
  }, [loadGovernance]);

  const computeWeightedInterview100 = (list: GovernanceCompetencyItem[]) => {
    const weighted = list.reduce((sum, item) => sum + (item.score * item.weight) / 100, 0);
    return Math.round(weighted * 20 * 10) / 10;
  };

  const openSecondaryModal = () => {
    const existingSec = calibration?.secondary;
    if (existingSec && Array.isArray(existingSec.competencies) && existingSec.competencies.length > 0) {
      setSecCompetencies(
        competencies.map((c, idx) => {
          const match = existingSec.competencies.find((s: any) => s.name === c.name) || existingSec.competencies[idx];
          return {
            ...c,
            score: typeof match?.score === 'number' ? match.score : 3,
            notes: String(match?.notes || '')
          };
        })
      );
      setSecRec(existingSec.recommendation || 'DIPERTIMBANGKAN');
      setSecNotes(existingSec.notes || '');
    } else {
      setSecCompetencies(competencies.map((c) => ({ ...c, score: c.score >= 1 ? c.score : 3, notes: '' })));
      setSecRec(recommendation);
      setSecNotes('');
    }
    setSecFeedback('');
    setSecModalOpen(true);
  };

  const handleSaveSecondary = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getPortalToken();
    if (!token) return;
    setSecSaving(true);
    setSecFeedback('');
    try {
      const interviewScore = computeWeightedInterview100(secCompetencies);
      const compositeScore = calculateCompositeScore(catScore ?? 0, interviewScore);
      await axios.post(
        `/api/asesor/scores/${encodeURIComponent(candidateCode)}/secondary`,
        {
          candidateName,
          programTitle,
          competencies: secCompetencies,
          interviewScore,
          compositeScore,
          recommendation: secRec,
          notes: secNotes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadGovernance();
      setSecModalOpen(false);
    } catch (err: any) {
      setSecFeedback(err?.response?.data?.error || 'Gagal menyimpan penilaian penilai ke-2.');
    } finally {
      setSecSaving(false);
    }
  };

  const handleApplyConsensus = async () => {
    const token = getPortalToken();
    if (!token || !calibration?.primary || !calibration?.secondary) return;
    setSecSaving(true);
    try {
      const averaged = competencies.map((c) => {
        const pComp = calibration.primary.competencies?.find((x: any) => x.name === c.name);
        const sComp = calibration.secondary.competencies?.find((x: any) => x.name === c.name);
        const pVal = typeof pComp?.score === 'number' ? pComp.score : c.score;
        const sVal = typeof sComp?.score === 'number' ? sComp.score : pVal;
        return {
          ...c,
          score: Math.round(((pVal + sVal) / 2) * 10) / 10
        };
      });
      const interviewScore = computeWeightedInterview100(averaged);
      const compositeScore = calculateCompositeScore(catScore ?? 0, interviewScore);
      const consensusRec =
        calibration.primary.recommendation === calibration.secondary.recommendation
          ? calibration.primary.recommendation
          : compositeScore >= 75
            ? 'LANJUT'
            : compositeScore >= 60
              ? 'DIPERTIMBANGKAN'
              : 'TIDAK';

      await axios.post(
        `/api/asesor/calibration/${encodeURIComponent(candidateCode)}/finalize`,
        {
          programCode,
          programTitle,
          mode: 'average',
          competencies: averaged,
          interviewScore,
          compositeScore,
          recommendation: consensusRec,
          notes: `${assessorNotes ? `${assessorNotes}\n` : ''}[Konsensus Kalibrasi 2 Asesor diterapkan]`.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onApplyConsensusToDraft({
        competencies: averaged,
        recommendation: consensusRec,
        notes: `${assessorNotes ? `${assessorNotes}\n` : ''}[Konsensus Kalibrasi 2 Asesor diterapkan]`.trim()
      });
      await loadGovernance();
    } finally {
      setSecSaving(false);
    }
  };

  const openCorrectionModal = () => {
    setCorrReason('');
    setCorrCompetencies(competencies.map((c) => ({ ...c })));
    setCorrRec(recommendation);
    setCorrNotes(assessorNotes);
    setCorrFeedback('');
    setCorrModalOpen(true);
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getPortalToken();
    if (!token) return;
    if (corrReason.trim().length < 10) {
      setCorrFeedback('Tuliskan alasan resmi koreksi minimal 10 karakter.');
      return;
    }
    setCorrSaving(true);
    setCorrFeedback('');
    try {
      const interviewScore = computeWeightedInterview100(corrCompetencies);
      const compositeScore = calculateCompositeScore(catScore ?? 0, interviewScore);
      await axios.post(
        `/api/asesor/lha/${encodeURIComponent(candidateCode)}/correction-request`,
        {
          programTitle,
          reason: corrReason.trim(),
          competencies: corrCompetencies,
          interviewScore,
          compositeScore,
          recommendation: corrRec,
          notes: corrNotes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadGovernance();
      setCorrModalOpen(false);
    } catch (err: any) {
      setCorrFeedback(err?.response?.data?.error || 'Gagal mengajukan permintaan koreksi.');
    } finally {
      setCorrSaving(false);
    }
  };

  const metrics = calibration?.metrics;
  const secondary = calibration?.secondary;
  const currentVersion = versionsData?.currentVersion || 1;
  const historyList: any[] = versionsData?.history || [];
  const correctionRequests: any[] = versionsData?.correctionRequests || [];

  return (
    <div className="space-y-6 mt-6">
      {/* ─── PANEL 1: PENILAIAN GANDA & KALIBRASI ANTAR ASESOR ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-soft-blue text-primary-navy flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                <span>Penilaian Ganda (Penilai Ke-2) &amp; Kalibrasi Antar Asesor</span>
                {metrics && (
                  <Badge
                    variant={
                      metrics.status === 'selaras'
                        ? 'success'
                        : metrics.status === 'perlu_kalibrasi'
                          ? 'danger'
                          : 'warning'
                    }
                    format="soft"
                  >
                    {metrics.status === 'selaras'
                      ? 'Nilai Selaras'
                      : metrics.status === 'perlu_kalibrasi'
                        ? 'Selisih Tinggi — Perlu Kalibrasi'
                        : secondary
                          ? 'Penilai 2 Tercatat'
                          : 'Belum Ada Penilai Ke-2'}
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rekam evaluasi independen penilai ke-2 untuk membandingkan konsistensi rubrik BARS dan menerapkan skor konsensus.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="xs" onClick={() => void loadGovernance()} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
            <Button variant="primary" size="xs" onClick={openSecondaryModal} leftIcon={<Users className="w-3.5 h-3.5" />}>
              {secondary ? 'Ubah Penilaian Penilai Ke-2' : 'Isi Penilaian Penilai Ke-2'}
            </Button>
          </div>
        </div>

        {secondary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Penilai Ke-2</span>
                <span className="font-bold text-slate-900 block mt-0.5">{secondary.assessorName}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(secondary.submittedAt).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Skor Wawancara &amp; Rekomendasi (P2)</span>
                <span className="font-mono font-bold text-primary-navy text-sm block mt-0.5">
                  {secondary.interviewScore} / 100 • {secondary.recommendation}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] text-slate-500 block">Selisih Antar Penilai</span>
                  <span
                    className={`font-mono font-bold text-sm block mt-0.5 ${
                      metrics?.status === 'perlu_kalibrasi' ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    Max {metrics?.maxCompetencyDelta ?? 0} BARS ({metrics?.interviewDelta ?? 0} pt)
                  </span>
                </div>
                {!isSigned && calibration?.primary && (
                  <Button variant="outline" size="xs" onClick={() => void handleApplyConsensus()} disabled={secSaving}>
                    Kalibrasi 50:50
                  </Button>
                )}
              </div>
            </div>

            {metrics?.competencyComparison?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-2 text-left border-b border-slate-200">Indikator Kompetensi</th>
                      <th className="p-2 text-center border-b border-slate-200">Penilai 1</th>
                      <th className="p-2 text-center border-b border-slate-200">Penilai 2</th>
                      <th className="p-2 text-center border-b border-slate-200">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.competencyComparison.map((row: any) => (
                      <tr key={row.name} className="border-b border-slate-100">
                        <td className="p-2 font-medium text-slate-800">{row.name}</td>
                        <td className="p-2 text-center font-mono">{row.primaryScore != null ? row.primaryScore.toFixed(1) : '-'}</td>
                        <td className="p-2 text-center font-mono">{row.secondaryScore != null ? row.secondaryScore.toFixed(1) : '-'}</td>
                        <td
                          className={`p-2 text-center font-mono font-bold ${
                            (row.delta ?? 0) >= 1 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {row.delta != null ? row.delta.toFixed(1) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-xl border border-dashed border-slate-200">
            Belum ada penilai ke-2 yang memasukkan evaluasi untuk kandidat ini. Klik <strong>Isi Penilaian Penilai Ke-2</strong> untuk melakukan penilaian ganda / blind second review.
          </p>
        )}
      </div>

      {/* ─── PANEL 2: KOREKSI RESMI PASCA-PUBLIKASI & VERSI LHA ─── */}
      {isSigned && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                  <span>Versi LHA &amp; Koreksi Resmi Pasca-Publikasi</span>
                  <Badge variant="teal" format="soft">
                    Versi Aktif: v{currentVersion}
                  </Badge>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  LHA ({lhaNumber || 'CERTIFIED'}) terkunci permanen. Perubahan resmi wajib melalui pengajuan koreksi dan persetujuan Admin.
                </p>
              </div>
            </div>

            <Button variant="primary" size="xs" onClick={openCorrectionModal} leftIcon={<FileEdit className="w-3.5 h-3.5" />}>
              Ajukan Koreksi Resmi LHA
            </Button>
          </div>

          {correctionRequests.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700">Status Permintaan Koreksi LHA:</p>
              {correctionRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {req.reason}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Diajukan {new Date(req.requestedAt).toLocaleString('id-ID')} • Usulan: {req.proposed?.interviewScore}/100 ({req.proposed?.recommendation})
                    </span>
                  </div>
                  <Badge
                    variant={req.status === 'pending' ? 'warning' : req.status === 'approved' ? 'success' : 'danger'}
                    format="soft"
                  >
                    {req.status === 'pending'
                      ? 'Menunggu Persetujuan Admin'
                      : req.status === 'approved'
                        ? `Disetujui (v${req.resultingVersion})`
                        : 'Ditolak'}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {historyList.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700">Arsip Versi LHA Sebelumnya:</p>
              {historyList.map((snap) => (
                <div key={snap.version} className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-primary-navy">v{snap.version}</span>{' '}
                    <span className="text-slate-600 font-mono">({snap.lhaNumber || '-'})</span>
                    <span className="block text-[11px] text-slate-500">
                      Skor Komposit {snap.compositeScore ?? '-'} • {snap.recommendation} • Diarsipkan {new Date(snap.archivedAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Alasan: {snap.reason || '-'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Input Penilai Ke-2 */}
      <Modal
        isOpen={secModalOpen}
        onClose={() => setSecModalOpen(false)}
        title={`Evaluasi Penilai Ke-2 — ${candidateName}`}
        description="Penilaian independen untuk perbandingan antar asesor dan kalibrasi skor."
        size="lg"
      >
        <form onSubmit={handleSaveSecondary} className="space-y-4 p-1 max-h-[75vh] overflow-y-auto">
          <div className="space-y-2.5">
            {secCompetencies.map((comp, idx) => (
              <div key={comp.id || comp.name} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {comp.name} ({comp.weight}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() =>
                        setSecCompetencies((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, score: val } : item))
                        )
                      }
                      className={`w-8 h-8 rounded-lg font-mono text-xs font-bold cursor-pointer border ${
                        Math.round(comp.score) === val
                          ? 'bg-primary-navy text-white border-primary-navy'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-primary-navy'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Rekomendasi Penilai Ke-2</label>
              <select
                value={secRec}
                onChange={(e) => setSecRec(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none"
              >
                <option value="LANJUT">LANJUT (Direkomendasikan)</option>
                <option value="DIPERTIMBANGKAN">DIPERTIMBANGKAN</option>
                <option value="TIDAK">TIDAK DIREKOMENDASIKAN</option>
              </select>
            </div>
            <div className="p-3 rounded-xl bg-soft-blue border border-accent-border flex items-center justify-between">
              <span className="font-semibold text-primary-navy">Proyeksi Skor Wawancara P2:</span>
              <span className="font-mono font-extrabold text-primary-navy text-sm">
                {computeWeightedInterview100(secCompetencies)} / 100
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Penilai Ke-2</label>
            <textarea
              rows={2}
              value={secNotes}
              onChange={(e) => setSecNotes(e.target.value)}
              placeholder="Catatan observasi independen penilai ke-2..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none"
            />
          </div>

          {secFeedback && <p className="text-xs text-rose-600 font-medium">{secFeedback}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setSecModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={secSaving}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {secSaving ? 'Menyimpan...' : 'Simpan Evaluasi Penilai Ke-2'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Pengajuan Koreksi Resmi LHA */}
      <Modal
        isOpen={corrModalOpen}
        onClose={() => setCorrModalOpen(false)}
        title={`Ajukan Koreksi Resmi LHA v${currentVersion}`}
        description="Perubahan akan masuk antrean persetujuan Admin dan menerbitkan versi baru jika disetujui."
        size="lg"
      >
        <form onSubmit={handleSubmitCorrection} className="space-y-4 p-1 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Alasan Koreksi Resmi * (min. 10 karakter)
            </label>
            <textarea
              rows={2}
              required
              value={corrReason}
              onChange={(e) => setCorrReason(e.target.value)}
              placeholder="Contoh: Penyesuaian skor Decision Making berdasarkan tinjauan ulang rekaman studi kasus dan kalibrasi panel asesor."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none"
            />
          </div>

          <div className="space-y-2">
            {corrCompetencies.map((comp, idx) => (
              <div key={comp.id || comp.name} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-800">{comp.name}</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() =>
                        setCorrCompetencies((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, score: val } : item))
                        )
                      }
                      className={`w-7 h-7 rounded-lg font-mono text-xs font-bold cursor-pointer border ${
                        Math.round(comp.score) === val
                          ? 'bg-primary-navy text-white border-primary-navy'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Rekomendasi Usulan</label>
              <select
                value={corrRec}
                onChange={(e) => setCorrRec(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none"
              >
                <option value="LANJUT">LANJUT</option>
                <option value="DIPERTIMBANGKAN">DIPERTIMBANGKAN</option>
                <option value="TIDAK">TIDAK</option>
              </select>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
              <span className="font-semibold text-amber-900">Proyeksi Komposit Baru:</span>
              <span className="font-mono font-extrabold text-amber-950 text-sm">
                {calculateCompositeScore(catScore ?? 0, computeWeightedInterview100(corrCompetencies))} / 100
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Catatan LHA Diperbarui</label>
            <textarea
              rows={2}
              value={corrNotes}
              onChange={(e) => setCorrNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none"
            />
          </div>

          {corrFeedback && (
            <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {corrFeedback}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setCorrModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={corrSaving}>
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {corrSaving ? 'Mengirim...' : 'Kirim Permintaan Koreksi ke Admin'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
