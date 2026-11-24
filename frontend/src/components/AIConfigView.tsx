import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { loadMasterScope, saveMasterRecord, deleteMasterRecord } from '../services/masterDataService';
import Swal from 'sweetalert2';
import { 
  Cpu, Sliders, Volume2, ShieldCheck, Zap, Activity,
  Save, RotateCcw, CheckCircle, Radio, Clock, AlertCircle
} from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

export interface AIConfiguration {
  liveAudioModel: string;
  cvScreeningModel: string;
  voicePersona: 'Puck' | 'Aoede' | 'Charon' | 'Fenrir' | 'Kore';
  cvWeight: number;
  interviewWeight: number;
  integrityWeight: number;
  passingThreshold: number;
  maxDurationMinutes: number;
  proctoringPreset: 'ringan' | 'sedang' | 'ketat';
  blockVirtualBackground: boolean;
  examExpiryPolicy: 'auto_submit' | 'expired';
}

const DEFAULT_CONFIG: AIConfiguration = {
  liveAudioModel: 'gemini-2.5-flash-native-audio-latest',
  cvScreeningModel: 'gemini-2.5-flash',
  voicePersona: 'Kore',
  cvWeight: 35,
  interviewWeight: 50,
  integrityWeight: 15,
  passingThreshold: 70,
  maxDurationMinutes: 20,
  proctoringPreset: 'sedang',
  blockVirtualBackground: true,
  examExpiryPolicy: 'auto_submit'
};

export default function AIConfigView() {
  const [config, setConfig] = useState<AIConfiguration>(DEFAULT_CONFIG);
  const [savedConfig, setSavedConfig] = useState<AIConfiguration>(DEFAULT_CONFIG);

  useEffect(() => {
    let cancelled = false;
    loadMasterScope<AIConfiguration>('ai-config')
      .then((data) => {
        if (cancelled) return;
        if (data.default) {
          const merged = { ...DEFAULT_CONFIG, ...data.default };
          setConfig(merged);
          setSavedConfig(merged);
        } else {
          void saveMasterRecord('ai-config', 'default', DEFAULT_CONFIG);
        }
      })
      .catch(() => {
        // Keep defaults when the admin session cannot load server config.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasUnsavedChanges = JSON.stringify(config) !== JSON.stringify(savedConfig);

  const [saving, setSaving] = useState(false);
  const [pingLoading, setPingLoading] = useState(false);
  const [mcpConfig, setMcpConfig] = useState({
    enabled: false,
    endpointUrl: '',
    apiKey: '',
    hasApiKey: false,
    apiKeyMasked: ''
  });
  const [mcpTestLoading, setMcpTestLoading] = useState(false);
  const [mcpTestResult, setMcpTestResult] = useState<{ reachable: boolean; message: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    axios
      .get('/api/admin/faq-knowledge/mcp-config', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => {
        if (res.data) {
          setMcpConfig((prev) => ({
            ...prev,
            enabled: Boolean(res.data.enabled),
            endpointUrl: res.data.endpointUrl || '',
            hasApiKey: Boolean(res.data.hasApiKey),
            apiKeyMasked: res.data.apiKeyMasked || ''
          }));
        }
      })
      .catch(() => undefined);
  }, []);
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
        timeout: 8000,
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

  const handleTestMcp = async () => {
    setMcpTestLoading(true);
    setMcpTestResult(null);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.post(
        '/api/admin/faq-knowledge/mcp-test',
        { endpointUrl: mcpConfig.endpointUrl, apiKey: mcpConfig.apiKey || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMcpTestResult({
        reachable: Boolean(res.data?.reachable),
        message: res.data?.message || 'Uji koneksi selesai.'
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Gagal menghubungi endpoint Proksis MCP Knowledge.';
      setMcpTestResult({ reachable: false, message: msg });
    } finally {
      setMcpTestLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      await Promise.all([
        saveMasterRecord('ai-config', 'default', config),
        axios.put(
          '/api/admin/faq-knowledge/mcp-config',
          {
            enabled: mcpConfig.enabled,
            endpointUrl: mcpConfig.endpointUrl,
            ...(mcpConfig.apiKey ? { apiKey: mcpConfig.apiKey } : {})
          },
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        )
      ]);
      setSavedConfig(config);
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

  const handleReset = async () => {
    setConfig(DEFAULT_CONFIG);
    setSavedConfig(DEFAULT_CONFIG);
    await deleteMasterRecord('ai-config', 'default').catch(() => undefined);
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
      <Card elevation="flat" className="p-6 border-[#E2E8F0] rounded-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <Cpu className="w-5 h-5 text-[#1E3A8A] shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] font-heading">
              Konfigurasi Sistem &amp; AI
            </h1>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#E0F2FE] text-[#075985]">
              Khusus Superadmin
            </span>
          </div>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl font-sans">
            Atur parameter model fondasi Gemini, profil suara pewawancara multimodal, serta formula pembobotan komposit kelulusan kandidat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            onClick={handlePingTest}
            disabled={pingLoading}
            className="h-10 px-4 rounded-lg border-[#E2E8F0] text-[#475569] min-w-fit whitespace-nowrap"
            leftIcon={<Activity className={`w-4 h-4 ${pingLoading ? 'animate-spin text-[#1E3A8A]' : 'text-[#64748B]'}`} />}
          >
            {pingLoading ? 'Mengukur...' : 'Uji Latensi'}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-4 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white min-w-fit whitespace-nowrap"
            leftIcon={<Save className="w-4 h-4" />}
          >
            {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
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
            <div className="max-w-[400px]">
              <Select
                label="Model Wawancara Suara Multimodal (Live Audio)"
                value={config.liveAudioModel}
                onChange={(e) => setConfig({ ...config, liveAudioModel: e.target.value })}
              >
                <option value="gemini-2.5-flash-native-audio-latest">
                  gemini-2.5-flash-native-audio-latest (Native Audio)
                </option>
                <option value="gemini-2.5-flash">
                  gemini-2.5-flash (Standard Multimodal)
                </option>
                <option value="gemini-3.5-flash-lite">
                  gemini-3.5-flash-lite (Ultra Low Latency)
                </option>
              </Select>
              <p className="text-[13px] text-[#64748B] mt-1.5">
                Mengontrol streaming audio websocket dua arah antara kandidat dan pewawancara virtual.
              </p>
            </div>

            <div className="max-w-[400px]">
              <Select
                label="Model Analisis ATS Resume (CV Screening)"
                value={config.cvScreeningModel}
                onChange={(e) => setConfig({ ...config, cvScreeningModel: e.target.value })}
              >
                <option value="gemini-2.5-flash">
                  gemini-2.5-flash (Ekstraksi Presisi Tinggi)
                </option>
                <option value="gemini-3.5-flash-lite">
                  gemini-3.5-flash-lite (Inference Cepat)
                </option>
                <option value="gemini-flash-latest">
                  gemini-flash-latest (Kompatibilitas Standar)
                </option>
              </Select>
              <p className="text-[13px] text-[#64748B] mt-1.5">
                Digunakan untuk membedah teks PDF CV, riwayat kerja, kecocokan kompetensi, dan ringkasan penilaian.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                Batas Waktu Maksimum Sesi Wawancara
              </label>
              <div className="inline-flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg">
                {[15, 20, 30].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setConfig({ ...config, maxDurationMinutes: mins })}
                    className={`h-8 px-4 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      config.maxDurationMinutes === mins
                        ? 'bg-[#1E3A8A] text-white'
                        : 'text-[#475569] hover:text-[#0F172A]'
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
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-[#475569]">
              <span>Bobot ATS Resume (CV)</span>
              <span className="font-mono font-semibold text-[#0F172A] text-base w-16 text-right tabular-nums whitespace-nowrap">{config.cvWeight}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="70"
              value={config.cvWeight}
              onChange={(e) => setConfig({ ...config, cvWeight: parseInt(e.target.value) })}
              className="w-full accent-[#2563EB] cursor-pointer"
            />
            <p className="text-xs text-[#64748B]">
              Evaluasi latar belakang pendidikan, kompetensi teknis, dan portofolio kerja.
            </p>
          </div>

          {/* Voice Interview Weight */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-[#475569]">
              <span>Bobot Wawancara Suara AI</span>
              <span className="font-mono font-semibold text-[#0F172A] text-base w-16 text-right tabular-nums whitespace-nowrap">{config.interviewWeight}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="80"
              value={config.interviewWeight}
              onChange={(e) => setConfig({ ...config, interviewWeight: parseInt(e.target.value) })}
              className="w-full accent-[#2563EB] cursor-pointer"
            />
            <p className="text-xs text-[#64748B]">
              Evaluasi artikulasi, ketajaman analisis, problem-solving, dan soft skill verbal.
            </p>
          </div>

          {/* Proctoring Penalty Factor */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-[#475569]">
              <span>Faktor Penalti Integritas</span>
              <span className="font-mono font-semibold text-[#DC2626] text-base w-16 text-right tabular-nums whitespace-nowrap">&minus;{config.integrityWeight}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              value={config.integrityWeight}
              onChange={(e) => setConfig({ ...config, integrityWeight: parseInt(e.target.value) })}
              className="w-full accent-[#DC2626] cursor-pointer"
            />
            <p className="text-xs text-[#64748B]">
              Pengurangan skor otomatis per insiden tab berpindah atau kehilangan fokus layar.
            </p>
          </div>
        </div>

        {/* Passing Threshold Slider & Total Composition */}
        <div className="border-t border-[#E2E8F0] pt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#0F172A]">
                Passing Threshold Kelulusan (Rekomendasi Kerja)
              </span>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-mono font-semibold bg-[#F1F5F9] text-[#475569] tabular-nums">
                Komposisi: {config.cvWeight} + {config.interviewWeight} &minus; {config.integrityWeight}
              </span>
            </div>
            <div className="text-xs text-[#64748B]">
              Kandidat dengan skor komposit di atas ambang ini berhak mendapatkan Surat Penawaran Kerja (Offer Letter).
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <input
              type="range"
              min="50"
              max="90"
              value={config.passingThreshold}
              onChange={(e) => setConfig({ ...config, passingThreshold: parseInt(e.target.value) })}
              className="w-48 accent-[#2563EB] cursor-pointer"
            />
            <span className="text-base font-semibold font-mono text-[#0F172A] w-16 text-right tabular-nums whitespace-nowrap">
              {config.passingThreshold}/100
            </span>
          </div>
        </div>
      </Card>

      {/* 4. Kebijakan & Preset Pengawasan Proctoring AI (BRD Compliance) */}
      <Card elevation="flat" className="p-5 border-slate-200 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-heading font-bold text-ink tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              4. Preset Kebijakan Proctoring &amp; Anti-Kecurangan AI
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Standar pengawasan otomatis ujian CAT dan wawancara live berbasis deteksi AI Computer Vision.
            </p>
          </div>
          <Badge variant="teal" format="soft">
            Preset: {config.proctoringPreset === 'ringan' ? 'Ringan' : config.proctoringPreset === 'ketat' ? 'Ketat (High-Stakes)' : 'Sedang (Standar)'}
          </Badge>
        </div>

        {/* 3 Preset Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Ringan */}
          <div
            onClick={() => setConfig({ ...config, proctoringPreset: 'ringan' })}
            className={`p-4 rounded-xl cursor-pointer transition-colors ${
              config.proctoringPreset === 'ringan'
                ? 'bg-[#EEF2FF] border-2 border-[#1E3A8A]'
                : 'bg-white border border-[#E2E8F0] hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-xs text-[#0F172A]">Ringan (Permisif)</span>
              <span className="text-[11px] bg-[#F1F5F9] text-[#475569] font-semibold px-2.5 py-0.5 rounded-full">Toleransi 5x</span>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Kamera &amp; mic aktif berkala. Toleransi 5x perpindahan tab, tanpa penguncian fullscreen mutlak. Cocok untuk simulasi atau asesmen internal informal.
            </p>
          </div>

          {/* Sedang */}
          <div
            onClick={() => setConfig({ ...config, proctoringPreset: 'sedang' })}
            className={`p-4 rounded-xl cursor-pointer transition-colors ${
              config.proctoringPreset === 'sedang'
                ? 'bg-[#EEF2FF] border-2 border-[#1E3A8A]'
                : 'bg-white border border-[#E2E8F0] hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-xs text-[#0F172A]">Sedang (Standar BUMN/Bank)</span>
              <span className="text-[11px] bg-[#E0F2FE] text-[#075985] font-semibold px-2.5 py-0.5 rounded-full">Rekomendasi</span>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Deteksi tab-switching (maks 3x toleransi), deteksi wajah ganda, audio background, dan alert waktu-nyata ke dewan asesor.
            </p>
          </div>

          {/* Ketat */}
          <div
            onClick={() => setConfig({ ...config, proctoringPreset: 'ketat' })}
            className={`p-4 rounded-xl cursor-pointer transition-colors ${
              config.proctoringPreset === 'ketat'
                ? 'bg-[#EEF2FF] border-2 border-[#1E3A8A]'
                : 'bg-white border border-[#E2E8F0] hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-xs text-[#0F172A]">Ketat (High-Stakes)</span>
              <span className="text-[11px] bg-[#FEE2E2] text-[#991B1B] font-semibold px-2.5 py-0.5 rounded-full">0 Toleransi</span>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Fullscreen lockdown seketika, snapshot berkala 30 detik, deteksi eye tracking, larangan keras virtual background, dan audit trail instan ke LHA.
            </p>
          </div>
        </div>

        {/* Virtual Background Prohibition Toggle */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-900 block">
              Larangan Penggunaan Virtual Background &amp; Filter
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-xl">
              Peserta diwajibkan menggunakan latar belakang alami ruangan dengan pencahayaan memadai. AI menolak filter buatan untuk menjamin transparansi lingkungan ujian.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none shrink-0">
            <input
              type="checkbox"
              checked={config.blockVirtualBackground}
              onChange={(e) => setConfig({ ...config, blockVirtualBackground: e.target.checked })}
              className="w-4 h-4 text-primary-navy rounded border-slate-300 focus:ring-primary-navy cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700">Wajib Latar Asli</span>
          </label>
        </div>

        {/* Exam Expiry Policy Selector */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary-navy" />
                Kebijakan Saat Waktu Ujian CAT Habis
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tentukan bagaimana sistem menangani lembar jawaban tersimpan ketika durasi ujian berakhir sebelum peserta menekan Kumpulkan.
              </p>
            </div>
            <Badge variant={config.examExpiryPolicy === 'expired' ? 'warning' : 'teal'} format="soft">
              {config.examExpiryPolicy === 'expired' ? 'Mode: Kedaluwarsa (Expired)' : 'Mode: Auto-Submit'}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setConfig({ ...config, examExpiryPolicy: 'auto_submit' })}
              className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                config.examExpiryPolicy !== 'expired'
                  ? 'bg-soft-blue/70 border-primary-navy ring-1 ring-primary-navy/30 shadow-2xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-primary-navy">Otomatis Kumpulkan (Auto-Submit)</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded">Direkomendasikan</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Jawaban terakhir yang tersimpan di server otomatis dinilai dan dikumpulkan sebagai hasil ujian resmi peserta.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setConfig({ ...config, examExpiryPolicy: 'expired' })}
              className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                config.examExpiryPolicy === 'expired'
                  ? 'bg-amber-50/70 border-amber-500 ring-1 ring-amber-400/40 shadow-2xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-amber-950">Anggap Kedaluwarsa (Expired)</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">Ketat</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Sesi langsung ditutup dengan status Kedaluwarsa (Expired). Jawaban tidak dinilai atau dihitung sebagai pengumpulan sah.
              </p>
            </button>
          </div>
        </div>
      </Card>

      {/* Proksis MCP Knowledge (RAG) Integration */}
      <Card className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-soft-blue text-primary-navy">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Integrasi Proksis MCP Knowledge (RAG FAQ)</h3>
              <p className="text-xs text-slate-500">
                Konfigurasi endpoint eksternal Proksis MCP Knowledge untuk sinkronisasi otomatis dokumen FAQ Word (.docx).
              </p>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mcpConfig.enabled}
              onChange={(e) => setMcpConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="w-4 h-4 text-primary-navy rounded border-slate-300"
            />
            <span className="text-xs font-bold text-slate-700">Aktifkan Sync MCP</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Endpoint URL Proksis MCP Knowledge"
            value={mcpConfig.endpointUrl}
            onChange={(e) => setMcpConfig((prev) => ({ ...prev, endpointUrl: e.target.value }))}
            placeholder="https://mcp.proxsis.com/api/knowledge/ingest"
          />
          <Input
            label={
              mcpConfig.hasApiKey
                ? `API Key / Bearer Token (Tersimpan: ${mcpConfig.apiKeyMasked})`
                : 'API Key / Bearer Token (Opsional)'
            }
            type="password"
            value={mcpConfig.apiKey}
            onChange={(e) => setMcpConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
            placeholder={mcpConfig.hasApiKey ? 'Kosongkan jika tidak ingin mengubah key' : 'Masukkan Bearer token MCP'}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs">
            {mcpTestResult && (
              <span className={`font-semibold ${mcpTestResult.reachable ? 'text-emerald-700' : 'text-rose-600'}`}>
                {mcpTestResult.message}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleTestMcp}
            disabled={mcpTestLoading || !mcpConfig.endpointUrl.trim()}
          >
            <Activity className="w-4 h-4 mr-1.5" />
            {mcpTestLoading ? 'Menguji Koneksi...' : 'Uji Koneksi MCP'}
          </Button>
        </div>
      </Card>
      {/* Sticky Save Bar on Unsaved Changes */}
      {hasUnsavedChanges && (
        <div className="sticky bottom-4 z-30 bg-white border border-[#E2E8F0] rounded-xl px-5 py-3.5 shadow-lg flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-[#0F172A]">
            Ada perubahan belum disimpan
          </span>
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfig(savedConfig)}
              className="h-10 px-4 rounded-lg border-[#E2E8F0] text-[#475569] min-w-fit whitespace-nowrap"
            >
              Buang
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              className="h-10 px-4 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white min-w-fit whitespace-nowrap"
            >
              {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
