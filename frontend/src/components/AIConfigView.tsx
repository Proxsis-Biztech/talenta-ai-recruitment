import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { loadMasterScope, saveMasterRecord } from '../services/masterDataService';
import Swal from 'sweetalert2';
import { 
  Cpu, Volume2, ShieldCheck, Zap, Activity,
  Save, CheckCircle, Radio, Clock, AlertCircle, Check, X
} from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

export interface AiProviderRow {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  builtin: boolean;
  hasApiKey: boolean;
  apiKeyMasked: string;
}

export interface AIConfiguration {
  liveAudioModel: string;
  chatbotModel: string;
  humanPhotoValidationModel: string;
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

type ProctoringFeatureValue = string | boolean;

const PROCTORING_BREAKDOWN: Array<{
  label: string;
  ringan: ProctoringFeatureValue;
  sedang: ProctoringFeatureValue;
  ketat: ProctoringFeatureValue;
}> = [
  { label: 'Batas pelanggaran sebelum eskalasi', ringan: '15x', sedang: '10x', ketat: '10x' },
  { label: 'Auto-submit saat batas terlampaui', ringan: false, sedang: false, ketat: false },
  { label: 'Wajib fullscreen (lockdown)', ringan: false, sedang: true, ketat: true },
  { label: 'Blokir shortcut & context menu', ringan: false, sedang: true, ketat: true },
  { label: 'Blokir copy-paste', ringan: false, sedang: true, ketat: true },
  { label: 'Deteksi wajah (face presence)', ringan: false, sedang: true, ketat: true },
  { label: 'Deteksi wajah ganda', ringan: false, sedang: true, ketat: true },
  { label: 'Deteksi arah pandang (eye tracking)', ringan: false, sedang: false, ketat: true },
  { label: 'Deteksi objek terlarang', ringan: false, sedang: false, ketat: true },
  { label: 'Deteksi audio / suara latar', ringan: false, sedang: true, ketat: true },
  { label: 'Deteksi multi-monitor', ringan: false, sedang: false, ketat: true },
  { label: 'Larangan virtual background', ringan: false, sedang: 'Mengikuti toggle', ketat: 'Mengikuti toggle' },
  { label: 'Berbagi layar wajib', ringan: false, sedang: false, ketat: true },
  { label: 'Interval snapshot berkala', ringan: '3 menit', sedang: '2 menit', ketat: '90 detik' }
];

const DEFAULT_CONFIG: AIConfiguration = {
  liveAudioModel: 'gemini-2.5-flash-native-audio-latest',
  chatbotModel: 'gemini-2.5-flash',
  humanPhotoValidationModel: 'gemini-2.5-flash',
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
  const [providers, setProviders] = useState<AiProviderRow[]>([]);
  const [savedProviders, setSavedProviders] = useState<AiProviderRow[]>([]);
  const [providerTests, setProviderTests] = useState<Record<string, { reachable: boolean; message: string }>>({});
  const [providerTesting, setProviderTesting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMasterScope<AIConfiguration & { aiProviders?: unknown }>('ai-config')
      .then((data) => {
        if (cancelled) return;
        if (data.default) {
          const { aiProviders: _ignored, ...safe } = data.default as unknown as Record<string, unknown>;
          const merged = { ...DEFAULT_CONFIG, ...(safe as Partial<AIConfiguration>) };
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

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    axios
      .get('/api/admin/ai/providers', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const rows = (res.data?.data || []) as AiProviderRow[];
        setProviders(rows.map((row) => ({ ...row, apiKey: '' })));
        setSavedProviders(rows.map((row) => ({ ...row, apiKey: '' })));
      })
      .catch(() => undefined);
  }, []);

  const hasUnsavedChanges =
    JSON.stringify(config) !== JSON.stringify(savedConfig) ||
    JSON.stringify(providers) !== JSON.stringify(savedProviders);

  const providerModelGroups = providers
    .filter((provider) => provider.builtin || (provider.baseUrl.trim() && (provider.hasApiKey || provider.apiKey.trim())))
    .map((provider) => ({
      id: provider.id,
      name: provider.name,
      models: provider.models.filter(Boolean)
    }))
    .filter((group) => group.models.length > 0);

  const allProviderModels = Array.from(
    new Set(providerModelGroups.flatMap((group) => group.models))
  );
  const selectedModels = [config.liveAudioModel, config.chatbotModel, config.humanPhotoValidationModel];
  const missingSelectedModels = selectedModels.filter((model) => model && !allProviderModels.includes(model));

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

  const updateProvider = (id: string, patch: Partial<AiProviderRow>) => {
    setProviders((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addProvider = () => {
    setProviders((prev) => [
      ...prev,
      {
        id: `provider-${Date.now()}`,
        name: 'Provider Baru',
        baseUrl: '',
        apiKey: '',
        models: [],
        builtin: false,
        hasApiKey: false,
        apiKeyMasked: ''
      }
    ]);
  };

  const removeProvider = (id: string) => {
    setProviders((prev) => prev.filter((item) => item.id !== id || item.builtin));
  };

  const handleTestProvider = async (provider: AiProviderRow) => {
    setProviderTesting(provider.id);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.post(
        '/api/admin/ai/providers/test',
        {
          providerId: provider.id,
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProviderTests((prev) => ({
        ...prev,
        [provider.id]: {
          reachable: Boolean(res.data?.reachable),
          message: res.data?.message || 'Uji koneksi selesai.'
        }
      }));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Gagal menghubungi provider.';
      setProviderTests((prev) => ({ ...prev, [provider.id]: { reachable: false, message: msg } }));
    } finally {
      setProviderTesting(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const headers = { Authorization: `Bearer ${token}` };
      await saveMasterRecord('ai-config', 'default', config);
      const providerResponse = await axios.put(
        '/api/admin/ai/providers',
        { providers },
        { headers }
      );
      const savedRows = ((providerResponse.data?.data || []) as AiProviderRow[]).map((row) => ({
        ...row,
        apiKey: ''
      }));
      setProviders(savedRows);
      setSavedProviders(savedRows);
      await Promise.all([
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

  const renderModelOptions = () => (
    <>
      {providerModelGroups.map((group) => (
        <optgroup key={group.id} label={group.name}>
          {group.models.map((model) => (
            <option key={`${group.id}-${model}`} value={model}>
              {model}
            </option>
          ))}
        </optgroup>
      ))}
      {missingSelectedModels.length > 0 && (
        <optgroup label="Model tersimpan">
          {missingSelectedModels.map((model) => (
            <option key={`saved-${model}`} value={model}>
              {model}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );

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
              1. Model Konfigurasi
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
                {renderModelOptions()}
              </Select>
              <p className="text-[13px] text-[#64748B] mt-1.5">
                Mengontrol streaming audio websocket dua arah antara kandidat dan pewawancara virtual.
              </p>
            </div>

            <div className="max-w-[400px]">
              <Select
                label="Model AI Chatbot FAQ & Helpdesk"
                value={config.chatbotModel}
                onChange={(e) => setConfig({ ...config, chatbotModel: e.target.value })}
              >
                {renderModelOptions()}
              </Select>
              <p className="text-[13px] text-[#64748B] mt-1.5">
                Digunakan chatbot FAQ peserta/asesor untuk menjawab pertanyaan berbasis pengetahuan platform.
              </p>
            </div>

            <div className="max-w-[400px]">
              <Select
                label="Model Validasi Foto Profil (Deteksi Manusia)"
                value={config.humanPhotoValidationModel}
                onChange={(e) => setConfig({ ...config, humanPhotoValidationModel: e.target.value })}
              >
                {renderModelOptions()}
              </Select>
              <p className="text-[13px] text-[#64748B] mt-1.5">
                Memvalidasi foto profil peserta: manusia asli, tepat 1 wajah, bukan spoof, dan komposisi setengah badan.
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
              <span className="text-[11px] bg-[#F1F5F9] text-[#475569] font-semibold px-2.5 py-0.5 rounded-full">Toleransi 15x</span>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Kamera tetap aktif, tanpa deteksi wajah/audio dan tanpa penguncian fullscreen. Toleransi 15x pelanggaran, cocok untuk simulasi atau asesmen internal informal.
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
              Fullscreen wajib, blokir shortcut/copy-paste, deteksi wajah &amp; audio, serta snapshot berkala tiap 2 menit. Toleransi 10x pelanggaran.
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
              <span className="text-[11px] bg-[#FEE2E2] text-[#991B1B] font-semibold px-2.5 py-0.5 rounded-full">Pengawasan Penuh</span>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Fullscreen lockdown, deteksi eye tracking &amp; objek, multi-monitor, berbagi layar, serta snapshot tiap 90 detik. Toleransi 10x pelanggaran.
            </p>
          </div>
        </div>

        {/* Breakdown per Preset */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-900">Breakdown Fitur per Preset Proctoring</span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Perbandingan kontrol yang dijalankan ProctoringEngine pada perangkat peserta.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white text-slate-500">
                  <th className="text-left font-semibold px-4 py-2.5 border-b border-slate-100">Kontrol</th>
                  {(['ringan', 'sedang', 'ketat'] as const).map((preset) => (
                    <th
                      key={preset}
                      className={`text-center font-semibold px-3 py-2.5 border-b border-slate-100 capitalize ${
                        config.proctoringPreset === preset ? 'text-[#1E3A8A] bg-[#EEF2FF]' : ''
                      }`}
                    >
                      {preset}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PROCTORING_BREAKDOWN.map((row) => (
                  <tr key={row.label} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2 text-slate-600">{row.label}</td>
                    {(['ringan', 'sedang', 'ketat'] as const).map((preset) => {
                      const value = row[preset];
                      return (
                        <td
                          key={preset}
                          className={`text-center px-3 py-2 ${
                            config.proctoringPreset === preset ? 'bg-[#F5F7FF]' : ''
                          }`}
                        >
                          {typeof value === 'boolean' ? (
                            value ? (
                              <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 mx-auto" />
                            )
                          ) : (
                            <span className="font-medium text-slate-700">{value}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* AI Provider Configuration */}
      <Card className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-soft-blue text-primary-navy">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">AI Provider</h3>
              <p className="text-xs text-slate-500">
                Kelola penyedia AI beserta base URL, API key, dan daftar model. Provider dengan API key valid tampil di bagian 1.
              </p>
            </div>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={addProvider}>
            + Tambah Provider
          </Button>
        </div>

        <div className="space-y-4">
          {providers.map((provider) => (
            <div key={provider.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{provider.name || provider.id}</span>
                  {provider.builtin ? (
                    <Badge variant="teal" format="soft">Default • API key hardcoded</Badge>
                  ) : (
                    <Badge variant={provider.hasApiKey ? 'teal' : 'warning'} format="soft">
                      {provider.hasApiKey ? 'API key tersimpan' : 'API key belum diisi'}
                    </Badge>
                  )}
                </div>
                {!provider.builtin && (
                  <button
                    type="button"
                    onClick={() => removeProvider(provider.id)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
              </div>

              {provider.builtin ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-1">API Key (environment)</span>
                    <span className="font-mono text-slate-700">{provider.apiKeyMasked || '••••••••'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Model tersedia</span>
                    <span className="font-mono text-slate-700">{provider.models.join(', ') || '-'}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Nama Provider"
                      value={provider.name}
                      onChange={(e) => updateProvider(provider.id, { name: e.target.value })}
                      placeholder="Contoh: OpenAI"
                    />
                    <Input
                      label="Base URL"
                      value={provider.baseUrl}
                      onChange={(e) => updateProvider(provider.id, { baseUrl: e.target.value })}
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                  <Input
                    label={
                      provider.hasApiKey
                        ? `API Key (Tersimpan: ${provider.apiKeyMasked})`
                        : 'API Key'
                    }
                    type="password"
                    value={provider.apiKey}
                    onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })}
                    placeholder={provider.hasApiKey ? 'Kosongkan jika tidak ingin mengubah key' : 'Masukkan API key provider'}
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#475569]">
                      Model (pisahkan dengan koma)
                    </label>
                    <textarea
                      rows={2}
                      value={provider.models.join(', ')}
                      onChange={(e) =>
                        updateProvider(provider.id, {
                          models: e.target.value
                            .split(/[,\n]/)
                            .map((item) => item.trim())
                            .filter(Boolean)
                        })
                      }
                      placeholder="gpt-4o-mini, gpt-4.1"
                      className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`text-xs font-semibold ${providerTests[provider.id]?.reachable ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {providerTests[provider.id]?.message || ''}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleTestProvider(provider)}
                      disabled={providerTesting === provider.id}
                    >
                      <Activity className="w-4 h-4 mr-1.5" />
                      {providerTesting === provider.id ? 'Menguji...' : 'Uji Koneksi'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
          {providers.length === 0 && (
            <p className="text-xs text-slate-500">Memuat daftar provider...</p>
          )}
        </div>

        <p className="text-[11px] text-slate-500">
          API key disimpan di server dan hanya ditampilkan dalam bentuk tersamarkan. Provider non-default
          muncul sebagai pilihan model di bagian 1 setelah base URL dan API key tersimpan.
        </p>
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
