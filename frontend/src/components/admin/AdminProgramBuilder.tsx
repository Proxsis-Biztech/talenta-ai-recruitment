import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  GripVertical,
  Layers,
  Sparkles,
  Save,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Video,
  FileCheck2,
  Sliders,
  ChevronDown,
  Building
} from 'lucide-react';
import { Button, Badge, Input, Card } from '../ui';

interface StageItem {
  id: string;
  name: string;
  type: 'CAT_TEST' | 'PROCTORING' | 'INTERVIEW' | 'REVIEW' | 'DECISION';
  weight: number; // %
  passingScore: number;
  durationMin: number;
  description: string;
}

export function AdminProgramBuilder({ onBack }: { onBack?: () => void }) {
  const [programInfo, setProgramInfo] = useState({
    name: 'Asesmen Software Engineer Specialist Batch IV',
    code: 'TLN-SE-2026',
    pt: 'PT Telkom Indonesia Tbk',
    quota: 120,
    passingGrade: 75,
    startDate: '2026-11-01',
    endDate: '2026-11-15',
    status: 'Draft'
  });

  const [stages, setStages] = useState<StageItem[]>([
    {
      id: 'stg-1',
      name: 'Tes Kemampuan Teknis (CAT 40 Soal)',
      type: 'CAT_TEST',
      weight: 35,
      passingScore: 75,
      durationMin: 90,
      description: 'Pengujian algoritma, database indexing, dan system architecture terdistribusi.'
    },
    {
      id: 'stg-2',
      name: 'Pengawasan Integritas AI (OpenCV Proctoring)',
      type: 'PROCTORING',
      weight: 15,
      passingScore: 80,
      durationMin: 90,
      description: 'Pemantauan fokus tab, face tracking OpenCV, dan pencegahan shortcut screenshot.'
    },
    {
      id: 'stg-3',
      name: 'Live Interview Asesor Independen',
      type: 'INTERVIEW',
      weight: 30,
      passingScore: 70,
      durationMin: 45,
      description: 'Wawancara kompetensi mendalam dengan rubrik terstandar skala 1-5.'
    },
    {
      id: 'stg-4',
      name: 'Review Portofolio & Audit Rekaman',
      type: 'REVIEW',
      weight: 10,
      passingScore: 70,
      durationMin: 30,
      description: 'Verifikasi kode repositori GitHub dan audit snapshot flag integritas.'
    },
    {
      id: 'stg-5',
      name: 'Penetapan Keputusan Akhir (Final Judgement)',
      type: 'DECISION',
      weight: 10,
      passingScore: 75,
      durationMin: 15,
      description: 'Kalkulasi skor komposit dan penerbitan Surat Keputusan Hasil Asesmen.'
    }
  ]);

  const [selectedStageId, setSelectedStageId] = useState<string>('stg-1');

  const totalWeight = stages.reduce((acc, s) => acc + s.weight, 0);

  const handleUpdateStage = (id: string, updates: Partial<StageItem>) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= stages.length) return;
    const newStages = [...stages];
    const temp = newStages[index];
    newStages[index] = newStages[targetIdx];
    newStages[targetIdx] = temp;
    setStages(newStages);
  };

  const handleAddStage = () => {
    const newId = `stg-${Date.now()}`;
    const newStage: StageItem = {
      id: newId,
      name: 'Tahap Asesmen Baru',
      type: 'CAT_TEST',
      weight: 10,
      passingScore: 70,
      durationMin: 60,
      description: 'Deskripsi pengujian tahap asesmen.'
    };
    setStages([...stages, newStage]);
    setSelectedStageId(newId);
  };

  const handleDeleteStage = (id: string) => {
    if (stages.length <= 1) return;
    setStages((prev) => prev.filter((s) => s.id !== id));
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePublish = () => {
    if (totalWeight !== 100) {
      alert(`Peringatan: Total bobot tahapan adalah ${totalWeight}%. Harus bernilai tepat 100% sebelum dipublish.`);
      return;
    }
    const updated = { ...programInfo, status: 'Published' };
    setProgramInfo(updated);
    try {
      const saved = JSON.parse(localStorage.getItem('talenta_custom_programs_v1') || '[]');
      saved.push({ ...updated, stages, id: updated.code });
      localStorage.setItem('talenta_custom_programs_v1', JSON.stringify(saved));
    } catch (e) {
      console.warn(e);
    }
    showToast(`Program Asesmen "${programInfo.name}" (${programInfo.code}) berhasil dipublikasikan dan aktif!`);
  };

  const handleSaveDraft = () => {
    const updated = { ...programInfo, status: 'Draft' };
    setProgramInfo(updated);
    try {
      const saved = JSON.parse(localStorage.getItem('talenta_custom_programs_v1') || '[]');
      saved.push({ ...updated, stages, id: updated.code });
      localStorage.setItem('talenta_custom_programs_v1', JSON.stringify(saved));
    } catch (e) {
      console.warn(e);
    }
    showToast(`Draf program "${programInfo.name}" berhasil disimpan.`);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-slate">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-primary-navy bg-soft-blue px-2.5 py-0.5 rounded border border-accent-border">
              PROGRAM BUILDER
            </span>
            <Badge variant={programInfo.status === 'Published' ? 'success' : 'neutral'}>
              {programInfo.status}
            </Badge>
          </div>
          <h2 className="text-xl font-extrabold font-heading text-ink tracking-tight mt-1">
            Perancang Program & Arsitektur Pipeline Seleksi
          </h2>
          <p className="text-xs text-muted-slate">
            Rancang informasi program, susun urutan tahapan asesmen, dan tentukan bobot kelulusan secara dinamis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack} className="text-xs">
              Kembali
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSaveDraft}
            className="text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Draft</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePublish}
            className="text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Publish Program</span>
          </Button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ─── 3-Column Studio Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ─── Column 1 (3 cols): Info Program ─── */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-border-slate p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-ink">
              1. Info Program
            </h3>
            <span className="text-[10px] text-muted-slate font-mono">ID: {programInfo.code}</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-ink mb-1">Nama Program</label>
              <input
                type="text"
                value={programInfo.name}
                onChange={(e) => setProgramInfo({ ...programInfo, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border-slate focus:border-primary-navy text-xs outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-ink mb-1">Kode Asesmen</label>
              <input
                type="text"
                value={programInfo.code}
                onChange={(e) => setProgramInfo({ ...programInfo, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-lg border border-border-slate focus:border-primary-navy font-mono font-bold text-primary-navy text-xs outline-none uppercase"
              />
            </div>

            <div>
              <label className="block font-bold text-ink mb-1">PT / Perusahaan Terkait</label>
              <select
                value={programInfo.pt}
                onChange={(e) => setProgramInfo({ ...programInfo, pt: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border-slate focus:border-primary-navy text-xs outline-none bg-white"
              >
                <option value="PT Telkom Indonesia Tbk">PT Telkom Indonesia Tbk</option>
                <option value="Astra International Tbk">Astra International Tbk</option>
                <option value="Bank Mandiri Tbk">Bank Mandiri Tbk</option>
                <option value="Pertamina Hulu Energi">Pertamina Hulu Energi</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-ink mb-1">Kuota Peserta</label>
                <input
                  type="number"
                  value={programInfo.quota}
                  onChange={(e) => setProgramInfo({ ...programInfo, quota: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-border-slate font-mono text-xs outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-ink mb-1">Passing Grade</label>
                <input
                  type="number"
                  value={programInfo.passingGrade}
                  onChange={(e) => setProgramInfo({ ...programInfo, passingGrade: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-border-slate font-mono font-bold text-emerald-700 text-xs outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-ink mb-1">Mulai</label>
                <input
                  type="date"
                  value={programInfo.startDate}
                  onChange={(e) => setProgramInfo({ ...programInfo, startDate: e.target.value })}
                  className="w-full px-2 py-2 rounded-lg border border-border-slate font-mono text-[11px] outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-ink mb-1">Selesai</label>
                <input
                  type="date"
                  value={programInfo.endDate}
                  onChange={(e) => setProgramInfo({ ...programInfo, endDate: e.target.value })}
                  className="w-full px-2 py-2 rounded-lg border border-border-slate font-mono text-[11px] outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Column 2 (5 cols): PIPELINE BUILDER Drag-List ─── */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-border-slate p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-ink">
                2. Pipeline Builder Tahapan ({stages.length})
              </h3>
              <p className="text-[11px] text-muted-slate">Urutan tahapan asesmen yang dilalui peserta</p>
            </div>
            <button
              onClick={handleAddStage}
              className="px-2.5 py-1 rounded-lg bg-soft-blue text-primary-navy hover:bg-accent-border/40 text-xs font-bold transition-colors flex items-center gap-1 border border-accent-border cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Tahap</span>
            </button>
          </div>

          {/* Total Weight Indicator Bar */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <span className="font-medium text-ink">Akumulasi Bobot Pipeline:</span>
            <span
              className={`font-mono font-extrabold text-sm ${
                totalWeight === 100 ? 'text-success-green' : 'text-error-red'
              }`}
            >
              {totalWeight}% / 100% {totalWeight === 100 ? '✓' : '(Belum Seimbang)'}
            </span>
          </div>

          {/* List of Stages */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {stages.map((stg, idx) => {
              const isSelected = selectedStageId === stg.id;
              return (
                <div
                  key={stg.id}
                  onClick={() => setSelectedStageId(stg.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-primary-navy bg-soft-blue/60 shadow-xs ring-1 ring-primary-navy'
                      : 'border-border-slate hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-primary-navy font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-ink truncate">{stg.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-slate mt-0.5">
                        <span className="font-mono text-blue-accent font-bold">Bobot: {stg.weight}%</span>
                        <span>•</span>
                        <span>Ambang: {stg.passingScore}</span>
                        <span>•</span>
                        <span>{stg.durationMin} mnt</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMoveStage(idx, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer text-xs"
                      title="Geser Naik"
                    >
                      ▲
                    </button>
                    <button
                      disabled={idx === stages.length - 1}
                      onClick={() => handleMoveStage(idx, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer text-xs"
                      title="Geser Turun"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => handleDeleteStage(stg.id)}
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                      title="Hapus Tahap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Column 3 (4 cols): Stage Inspector & Live Preview ─── */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-border-slate p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-ink">
              3. Detail Tahap Terpilih
            </h3>
            <span className="text-[10px] text-blue-accent font-mono font-bold">Inspector</span>
          </div>

          {(() => {
            const current = stages.find((s) => s.id === selectedStageId) || stages[0];
            if (!current) return null;
            return (
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-ink mb-1">Nama Tahapan</label>
                  <input
                    type="text"
                    value={current.name}
                    onChange={(e) => handleUpdateStage(current.id, { name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border-slate focus:border-primary-navy text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">Tipe Evaluasi</label>
                  <select
                    value={current.type}
                    onChange={(e) => handleUpdateStage(current.id, { type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-border-slate text-xs outline-none bg-white"
                  >
                    <option value="CAT_TEST">Tes Soal (CAT Computer-Adaptive)</option>
                    <option value="PROCTORING">AI Proctoring & Integritas</option>
                    <option value="INTERVIEW">Live Interview Asesor</option>
                    <option value="REVIEW">Review Portofolio & Berkas</option>
                    <option value="DECISION">Keputusan Akhir</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-ink mb-1">Bobot (%)</label>
                    <input
                      type="number"
                      value={current.weight}
                      onChange={(e) => handleUpdateStage(current.id, { weight: Number(e.target.value) })}
                      className="w-full px-2 py-2 rounded-lg border border-border-slate font-mono font-bold text-primary-navy text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-ink mb-1">Ambang (0-100)</label>
                    <input
                      type="number"
                      value={current.passingScore}
                      onChange={(e) => handleUpdateStage(current.id, { passingScore: Number(e.target.value) })}
                      className="w-full px-2 py-2 rounded-lg border border-border-slate font-mono text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-ink mb-1">Durasi (Menit)</label>
                    <input
                      type="number"
                      value={current.durationMin}
                      onChange={(e) => handleUpdateStage(current.id, { durationMin: Number(e.target.value) })}
                      className="w-full px-2 py-2 rounded-lg border border-border-slate font-mono text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">Deskripsi & Syarat Lulus</label>
                  <textarea
                    rows={3}
                    value={current.description}
                    onChange={(e) => handleUpdateStage(current.id, { description: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-border-slate text-xs outline-none leading-relaxed"
                  />
                </div>

                {/* Preview Ringkas Card */}
                <div className="mt-4 pt-3 border-t border-slate-100 p-3 bg-slate-50 rounded-xl space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Preview Tampilan Kandidat:</span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">{current.name}</span>
                    <span className="text-emerald-700 font-bold font-mono">Min: {current.passingScore}</span>
                  </div>
                  <p className="text-[11px] text-muted-slate line-clamp-2">{current.description}</p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
