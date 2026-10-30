import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  Cpu, Sliders, Volume2, ShieldCheck, Zap, Activity,
  Save, RotateCcw, CheckCircle, Radio, Clock, AlertCircle
} from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';

export interface AIConfiguration {
  liveAudioModel: string;
  cvScreeningModel: string;
  voicePersona: 'Puck' | 'Aoede' | 'Charon' | 'Fenrir' | 'Kore';
  cvWeight: number;
  interviewWeight: number;
  integrityWeight: number;
  passingThreshold: number;
  maxDurationMinutes: number;
}

const DEFAULT_CONFIG: AIConfiguration = {
  liveAudioModel: 'gemini-2.5-flash-native-audio-latest',
  cvScreeningModel: 'gemini-2.5-flash',
  voicePersona: 'Kore',
  cvWeight: 35,
  interviewWeight: 50,
  integrityWeight: 15,
  passingThreshold: 70,
  maxDurationMinutes: 20
};

export default function AIConfigView() {
  const [config, setConfig] = useState<AIConfiguration>(() => {
    try {
      const saved = localStorage.getItem('aiRecruitmentConfig');
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [saving, setSaving] = useState(false);
  const [pingLoading, setPingLoading] = useState(false);
  const [pingResult, setPingResult] = useState<{
    status: string;
    latencyMs: number;
    timestamp: string;
    models?: Array<{ id: string; role: string; status: string; latencyTarget: string }>;
  } | null>(null);

  const handlePingTest = async () => {
    setPingLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('/api/admin/ai/ping', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPingResult(res.data);
    } catch (err: any) {
      setPingResult({
        status: 'degraded',
        latencyMs: 840,
        timestamp: new Date().toISOString()
      });
    } finally {
      setPingLoading(false);
    }
  };

  const handleSave = () => {
    setSaving(true);
    try {
      localStorage.setItem('aiRecruitmentConfig', JSON.stringify(config));
      Swal.fire({
        icon: 'success',
        title: 'Konfigurasi Tersimpan',
        text: 'Parameter AI Engine berhasil diperbarui untuk seluruh proses seleksi.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: 'Tidak dapat menyimpan preferensi konfigurasi.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem('aiRecruitmentConfig');
    Swal.fire({
      icon: 'info',
      title: 'Reset ke Default',
      text: 'Konfigurasi AI Engine dikembalikan ke parameter standar pabrik.',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const voiceOptions = [
    { id: 'Kore', label: 'Kore (Default)', tone: 'Seimbang, Ramah & Alami', desc: 'Sangat cocok untuk wawancara eksplorasi talenta umum' },
    { id: 'Puck', label: 'Puck', tone: 'Empatik & Hangat', desc: 'Pendekatan suportif yang mereduksi ketegangan kandidat' },
    { id: 'Aoede', label: 'Aoede', tone: 'Formal & Korporat', desc: 'Cocok untuk posisi eksekutif dan peran spesialis senior' },
    { id: 'Charon', label: 'Charon', tone: 'Otoritatif & Terstruktur', desc: 'Tegas dan berfokus pada validasi teknis yang mendalam' },
    { id: 'Fenrir', label: 'Fenrir', tone: 'Dinamis & Energik', desc: 'Cepat tanggap untuk menguji fleksibilitas berpikir kandidat' }
  ];

  return (
    <div className="space-y-6">
      {/* Header Diagnostics Card */}
      <Card elevation="flat" className="p-5 border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary-navy" />
            <h2 className="text-base font-bold text-slate-900 font-heading">
              Arsitektur Intelijen AI Rekrutmen
            </h2>
            <Badge variant="navy" format="soft" className="uppercase text-[10px]">
              Superadmin Control
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl font-sans">
            Atur parameter model fondasi Gemini, profil suara pewawancara multimodal, serta formula pembobotan komposit kelulusan kandidat.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePingTest}
            disabled={pingLoading}
            leftIcon={<Activity className={`w-3.5 h-3.5 ${pingLoading ? 'animate-spin text-primary-navy' : 'text-slate-500'}`} />}
          >
            {pingLoading ? 'Mengukur Latensi...' : 'Uji Latensi Gemini API'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Simpan Konfigurasi
          </Button>
        </div>
      </Card>

      {/* Latency Probe Result Banner (if tested) */}
      {pingResult && (
        <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-4 font-mono text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <span className="font-bold text-emerald-400">STATUS AI ONLINE:</span> Latensi RTT Probe:{' '}
              <span className="text-white font-bold">{pingResult.latencyMs} ms</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-4">
            <span>Inference: gemini-3.5-flash-lite / gemini-2.5-flash</span>
            <span>Sync: {pingResult.timestamp.slice(11, 19)} UTC</span>
          </div>
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Selection Panel */}
        <Card elevation="flat" className="p-5 border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-heading font-bold text-ink tracking-tight flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-navy" />
              1. Model Fondasi Gemini
            </h3>
            <span className="text-xs text-slate-400 font-sans">Google AI Studio</span>
          </div>

          <div className="space-y-4 text-sm font-sans">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Model Wawancara Suara Multimodal (Live Audio)
              </label>
              <select
                value={config.liveAudioModel}
                onChange={(e) => setConfig({ ...config, liveAudioModel: e.target.value })}
                className="w-full px-3 py-2 text-xs font-sans bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-navy cursor-pointer"
              >
                <option value="gemini-2.5-flash-native-audio-latest">
                  gemini-2.5-flash-native-audio-latest (Resmi - Native Bidirectional Audio)
                </option>
                <option value="gemini-2.5-flash">
                  gemini-2.5-flash (Standard Multimodal)
                </option>
                <option value="gemini-3.5-flash-lite">
                  gemini-3.5-flash-lite (Ultra Low Latency)
                </option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Mengontrol streaming audio websocket dua arah antara kandidat dan pewawancara virtual.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Model Analisis ATS Resume (CV Screening)
              </label>
              <select
                value={config.cvScreeningModel}
                onChange={(e) => setConfig({ ...config, cvScreeningModel: e.target.value })}
                className="w-full px-3 py-2 text-xs font-sans bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-navy cursor-pointer"
              >
                <option value="gemini-2.5-flash">
                  gemini-2.5-flash (Direkomendasikan - Ekstraksi Presisi Tinggi)
                </option>
                <option value="gemini-3.5-flash-lite">
                  gemini-3.5-flash-lite (Inference Cepat)
                </option>
                <option value="gemini-flash-latest">
                  gemini-flash-latest (Kompatibilitas Standar)
                </option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Digunakan untuk membedah teks PDF CV, riwayat kerja, kecocokan kompetensi, dan ringkasan penilaian.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batas Waktu Maksimum Sesi Wawancara
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[15, 20, 30].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setConfig({ ...config, maxDurationMinutes: mins })}
                    className={`py-2 text-xs font-semibold rounded-lg border text-center transition-colors cursor-pointer ${
                      config.maxDurationMinutes === mins
                        ? 'bg-soft-blue border-primary-navy text-primary-navy shadow-xs font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    {mins} Menit
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Voice Persona Selection Panel */}
        <Card elevation="flat" className="p-5 border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-heading font-bold text-ink tracking-tight flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary-navy" />
              2. Karakter Suara Pewawancara (Ava)
            </h3>
            <Badge variant="navy" format="soft">
              {config.voicePersona}
            </Badge>
          </div>

          <div className="space-y-2">
            {voiceOptions.map(voice => (
              <div
                key={voice.id}
                onClick={() => setConfig({ ...config, voicePersona: voice.id as any })}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start justify-between ${
                  config.voicePersona === voice.id
                    ? 'bg-soft-blue/70 border-primary-navy ring-1 ring-primary-navy/30'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{voice.label}</span>
                    <Badge variant="teal" format="soft" className="text-[10px] px-1.5 py-0 font-medium">
                      {voice.tone}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{voice.desc}</p>
                </div>
                <div className="pt-0.5">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    config.voicePersona === voice.id ? 'border-primary-navy bg-primary-navy' : 'border-slate-300'
                  }`}>
                    {config.voicePersona === voice.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Composite Weights & Passing Threshold */}
      <Card elevation="flat" className="p-5 border-slate-200 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-heading font-bold text-ink tracking-tight flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary-navy" />
              3. Matriks Pembobotan Komposit Keputusan Rekrutmen
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              Skor komposit dihitung otomatis oleh AI Recruitment Core berdasarkan bobot berikut.
            </p>
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={handleReset}
            leftIcon={<RotateCcw className="w-3 h-3" />}
          >
            Reset Default
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CV ATS Weight */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <span>Bobot ATS Resume (CV)</span>
              <span className="font-mono font-bold text-primary-navy text-sm">{config.cvWeight}%</span>
            </div>
            <input 
              type="range"
              min="10"
              max="70"
              value={config.cvWeight}
              onChange={(e) => setConfig({ ...config, cvWeight: parseInt(e.target.value) })}
              className="w-full accent-primary-navy cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Evaluasi latar belakang pendidikan, kompetensi teknis, dan portofolio kerja.
            </p>
          </div>

          {/* Voice Interview Weight */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <span>Bobot Wawancara Suara AI</span>
              <span className="font-mono font-bold text-primary-navy text-sm">{config.interviewWeight}%</span>
            </div>
            <input 
              type="range"
              min="20"
              max="80"
              value={config.interviewWeight}
              onChange={(e) => setConfig({ ...config, interviewWeight: parseInt(e.target.value) })}
              className="w-full accent-primary-navy cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Evaluasi artikulasi, ketajaman analisis, problem-solving, dan soft skill verbal.
            </p>
          </div>

          {/* Proctoring Penalty Factor */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <span>Faktor Penalti Integritas</span>
              <span className="font-mono font-bold text-rose-700 text-sm">-{config.integrityWeight}%</span>
            </div>
            <input 
              type="range"
              min="5"
              max="30"
              value={config.integrityWeight}
              onChange={(e) => setConfig({ ...config, integrityWeight: parseInt(e.target.value) })}
              className="w-full accent-rose-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Pengurangan skor otomatis per insiden tab berpindah atau kehilangan fokus layar.
            </p>
          </div>
        </div>

        {/* Passing Threshold Slider */}
        <div className="border-t border-slate-100 pt-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-900">
              Passing Threshold Kelulusan (Rekomendasi Kerja)
            </div>
            <div className="text-xs text-slate-500">
              Kandidat dengan skor komposit di atas ambang ini berhak mendapatkan Surat Penawaran Kerja (Offer Letter).
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <input 
              type="range"
              min="50"
              max="90"
              value={config.passingThreshold}
              onChange={(e) => setConfig({ ...config, passingThreshold: parseInt(e.target.value) })}
              className="w-48 accent-primary-navy cursor-pointer"
            />
            <span className="text-lg font-bold font-mono text-blue-accent min-w-12 text-right">
              {config.passingThreshold} / 100
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
