import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  Lock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Scale,
  Award,
  Crown,
  Building2,
  Check
} from 'lucide-react';
import { Button, Badge } from '../ui';
import { setActiveSessionUser } from '../../services/userRegistryService';
import { clearPortalSession, loginPortal, savePortalSession, tokenLogin } from '../../services/portalAuthService';

const SHOW_DEMO_ACCESS = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true';

export default function AuthLoginPage() {
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState<'account' | 'code'>('account');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [programCode, setProgramCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successRole, setSuccessRole] = useState<'admin' | 'asesor' | 'peserta' | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const handleGoogleLogin = async (credential: string) => {
    setError('');
    setGoogleLoading(true);
    try {
      const response = await axios.post('/api/portal/auth/google', { credential });
      const session = {
        token: response.data.token,
        user: response.data.user,
        requiresOnboarding: response.data.requiresOnboarding
      };
      clearPortalSession();
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRole');
      localStorage.removeItem('adminUsername');
      savePortalSession(session);
      navigate(session.requiresOnboarding ? '/peserta/onboarding' : '/peserta');
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal masuk dengan Google.' : 'Gagal masuk dengan Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId) return;
    const existing = document.querySelector('script[data-google-identity]');
    const script = (existing as HTMLScriptElement) || document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-identity', 'true');
    script.onload = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) return;
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response: any) => {
          if (response?.credential) void handleGoogleLogin(response.credential);
        }
      });
      setGoogleReady(true);
    };
    if (!existing) document.body.appendChild(script);
    return () => {
      if (!existing) script.remove();
    };
  }, [googleClientId]);

  // Quick fill demo helper
  const handleFillDemo = (type: 'superadmin' | 'asesor' | 'peserta-telkom' | 'peserta-mandiri' | 'code') => {
    setError('');
    setSuccessRole(null);
    if (type === 'code') {
      setLoginMode('code');
      setProgramCode('SE-402');
    } else {
      setLoginMode('account');
      if (type === 'superadmin') {
        setIdentifier('superadmin');
        setPassword('cleaverzz25');
      } else if (type === 'asesor') {
        setIdentifier('asesor');
        setPassword('asesor123');
      } else if (type === 'peserta-telkom') {
        setIdentifier('farhan@kandidat.id');
        setPassword('peserta123');
      } else if (type === 'peserta-mandiri') {
        setIdentifier('amanda@kandidat.id');
        setPassword('peserta123');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessRole(null);

    try {
      if (loginMode === 'code') {
        if (!programCode.trim()) {
          throw new Error('Silakan masukkan kode asesmen program Anda.');
        }
        clearPortalSession();
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRole');
        localStorage.removeItem('adminUsername');
        const session = await tokenLogin({ programCode: programCode.trim().toUpperCase() });
        savePortalSession(session);
        setSuccessRole('peserta');
        setTimeout(() => navigate(session.requiresOnboarding ? '/peserta/onboarding' : !session.user.faceVerifiedAt ? '/peserta/profile?tab=biometrik' : '/peserta'), 300);
        return;
      }

      const cleanId = identifier.trim().toLowerCase();
      const isAdminAccount =
        cleanId === 'superadmin' ||
        cleanId === 'admin' ||
        cleanId.includes('admin@') ||
        cleanId.startsWith('admin');

      if (isAdminAccount) {
        clearPortalSession();
        const res = await axios.post('/api/admin/login', {
          username: identifier.trim(),
          password
        });
        localStorage.setItem('adminToken', res.data.token);
        localStorage.setItem('adminRole', res.data.role || 'admin');
        localStorage.setItem('adminUsername', res.data.username);
        localStorage.setItem('authRole', res.data.role || 'admin');
        setActiveSessionUser({
          id: 'ADM-01',
          name: res.data.username,
          username: res.data.username,
          role: res.data.role || 'admin'
        });
        setSuccessRole('admin');
        setTimeout(() => navigate('/admin/dashboard'), 300);
        return;
      }

      clearPortalSession();
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRole');
      localStorage.removeItem('adminUsername');
      const session = await loginPortal(identifier.trim(), password);
      savePortalSession(session);
      setSuccessRole(session.user.role === 'asesor' ? 'asesor' : 'peserta');
      setTimeout(() => navigate(session.user.role === 'asesor' ? '/asesor' : session.requiresOnboarding ? '/peserta/onboarding' : !session.user.faceVerifiedAt ? '/peserta/profile?tab=biometrik' : '/peserta'), 300);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error ||
          (err.code === 'ERR_NETWORK'
            ? 'Tidak dapat terhubung ke server. Pastikan backend berjalan dan alamat API benar.'
            : 'Kredensial tidak valid. Periksa kembali username/email dan kata sandi Anda.')
        : err instanceof Error
          ? err.message
          : 'Gagal masuk. Silakan coba lagi.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row font-sans antialiased">
      {/* ─── Left Panel: Clean, Focused, & Simple Access Controls ─── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 xl:p-20 bg-white border-r border-slate-100">
        <div>
          {/* Brand header */}
          <div
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-3 cursor-pointer mb-10 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-navy via-navy-dark to-blue-accent flex items-center justify-center text-white font-bold text-lg shadow-sm font-heading group-hover:scale-105 transition-transform">R</div>
            <div>
              <div className="flex items-center gap-1 leading-none">
                <span className="font-heading font-extrabold text-xl text-ink tracking-tight">Right</span>
              </div>
              <p className="text-[11px] text-muted-slate font-medium mt-1">Assessment &amp; Hiring Platform</p>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-heading tracking-tight">
              Masuk ke Portal
            </h1>
            <p className="text-xs sm:text-sm text-muted-slate mt-1.5 leading-relaxed">
              Akses terpadu untuk Peserta Seleksi, Dewan Asesor, dan Administrator.
            </p>

            {/* Login Mode Toggle Tabs (Clean Apple-style Segmented Control) */}
            <div className="mt-6 p-1 bg-slate-100 rounded-2xl flex gap-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('account');
                  setError('');
                  setSuccessRole(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  loginMode === 'account'
                    ? 'bg-white text-primary-navy shadow-xs font-bold'
                    : 'text-slate-600 hover:text-ink'
                }`}
              >
                Masuk dengan Akun
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode('code');
                  setError('');
                  setSuccessRole(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginMode === 'code'
                    ? 'bg-white text-primary-navy shadow-xs font-bold'
                    : 'text-slate-600 hover:text-ink'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-accent" />
                <span>Kode Program Ujian</span>
              </button>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Validation Notification */}
            {successRole && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">
                    Terverifikasi:{' '}
                    {successRole === 'admin'
                      ? 'Administrator / Superadmin'
                      : successRole === 'asesor'
                      ? 'Dewan Asesor Independen'
                      : 'Peserta Ujian (Kandidat)'}
                  </p>
                  <p className="text-[11px] text-emerald-700">Mengalihkan ke portal...</p>
                </div>
              </div>
            )}

            {/* Main Login Form */}
            <form onSubmit={handleLogin} className="mt-5 space-y-4">
              {loginMode === 'account' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Username / Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="superadmin / asesor / budi@kandidat.id"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none transition-all bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Kata Sandi
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setError('Reset kata sandi ditangani oleh panitia. Hubungi admin institusi untuk pemulihan akun.')
                        }
                        className="text-[11px] text-blue-accent hover:underline font-semibold cursor-pointer"
                      >
                        Lupa sandi?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none transition-all bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Kode Token Program Asesmen
                  </label>
                  <input
                    type="text"
                    value={programCode}
                    onChange={(e) => setProgramCode(e.target.value.toUpperCase())}
                    placeholder="SE-402 / TLN-2026-XXXX"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 font-mono text-sm sm:text-base font-bold tracking-wider text-primary-navy uppercase outline-none transition-all bg-white text-center"
                  />
                  <p className="text-[11px] text-muted-slate mt-1.5 text-center">
                    Kode asesmen tertera di email undangan seleksi dari institusi penguji.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 rounded-xl shadow-sm cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Masuk ke Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            {googleClientId && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">atau</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <button
                  type="button"
                  disabled={!googleReady || googleLoading}
                  onClick={() => {
                    const google = (window as any).google;
                    google?.accounts?.id?.prompt?.();
                  }}
                  className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center text-[11px] font-bold text-[#4285F4]">G</span>
                  <span>{googleLoading ? 'Menghubungkan...' : googleReady ? 'Lanjutkan dengan Google' : 'Memuat Google...'}</span>
                </button>
              </div>
            )}

            {SHOW_DEMO_ACCESS && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2.5">
                <span className="font-semibold flex items-center gap-1.5 text-slate-700 text-[11px] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Uji Coba 1-Klik Peran:
                </span>
                <span className="text-[10px] text-slate-400">Pilih salah satu</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleFillDemo('peserta-telkom')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                    identifier === 'farhan@kandidat.id'
                      ? 'bg-blue-50 border-blue-400 text-primary-navy font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>Peserta Telkom</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFillDemo('peserta-mandiri')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                    identifier === 'budi.mandiri@kandidat.id'
                      ? 'bg-blue-50 border-blue-400 text-primary-navy font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>Peserta Mandiri</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFillDemo('asesor')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                    identifier === 'asesor'
                      ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5 text-amber-600" />
                  <span>Asesor</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFillDemo('superadmin')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                    identifier === 'superadmin'
                      ? 'bg-purple-50 border-purple-400 text-purple-900 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-purple-600" />
                  <span>Superadmin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFillDemo('code')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                    loginMode === 'code'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Token SE-402</span>
                </button>
              </div>
            </div>

            )}

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-muted-slate">
              <span>Belum memiliki akun peserta?</span>
              <button
                onClick={() => navigate('/register')}
                className="font-bold text-primary-navy hover:underline cursor-pointer"
              >
                Daftar Program Baru →
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-[11px] text-slate-400">
          © 2026 Right • Dilindungi enkripsi SSL 256-bit dan Sistem Anti-Cheat AI.
        </div>
      </div>

      {/* ─── Right Panel: Premium Interactive Feature Showcase ─── */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#0A192F] via-[#0F2756] to-[#1E3A8A] text-white p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative glowing mesh orbs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />

        {/* Top Header Tags */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-medium text-blue-100 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Enterprise Assessment Engine</span>
          </div>
          <span className="text-xs text-blue-200/80 font-mono tracking-wide">
            ISO 27001 • Anti-Cheat AI v2.4
          </span>
        </div>

        {/* Center Showcase: Glassmorphism Live Exam Simulator Card */}
        <div className="relative z-10 my-auto py-8 space-y-6">
          <div className="space-y-3">
            <h2 className="text-3xl xl:text-4xl font-extrabold font-heading leading-tight tracking-tight text-white">
              Platform Asesmen &amp; Seleksi Right Berbasis AI
            </h2>
            <p className="text-blue-100/90 text-sm xl:text-base leading-relaxed max-w-lg">
              Solusi asesmen terpadu: tes adaptif, pengawasan kamera, dan penilaian asesor dengan LHA terverifikasi.
            </p>
          </div>

          {/* Interactive Floating Glass Card */}
          <div className="p-5 xl:p-6 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl space-y-4 max-w-lg">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/15 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/30 border border-blue-400/40 flex items-center justify-center text-white font-bold text-xs">
                  CAT
                </div>
                <div>
                  <span className="font-bold text-white block text-xs">Simulasi Ujian Adaptif</span>
                  <span className="text-blue-200 text-[11px]">PT Telkom • Software Engineer</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sesi
              </span>
            </div>

            {/* Simulated Live Question Sneak-Peek */}
            <div className="p-3.5 rounded-2xl bg-black/20 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] text-blue-200 font-mono">
                <span>SOAL #04 (Grade B - Specialist)</span>
                <span className="text-amber-300 font-semibold">Tersisa: 01:24:18</span>
              </div>
              <p className="text-white/95 text-xs leading-relaxed font-medium">
                Penerapan asynchronous event-driven queue dengan backpressure handling pada transaksi berskala tinggi.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30 text-white font-medium text-[11px] flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-400 text-slate-900 font-bold text-[10px] flex items-center justify-center">A</span>
                  <span className="truncate">Distributed Outbox</span>
                </div>
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-[11px] flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-white/20 text-white font-bold text-[10px] flex items-center justify-center">B</span>
                  <span className="truncate">Synchronous Lock</span>
                </div>
              </div>
            </div>

            {/* Proctoring telemetry footer */}
            <div className="flex items-center justify-between text-xs pt-1 text-blue-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px]">Proctoring: kamera & tab dipantau</span>
              </div>
              <span className="text-[11px] font-mono text-cyan-300">Status real-time</span>
            </div>
          </div>

          {/* Key Metrics Ribbon */}
          <div className="grid grid-cols-3 gap-3 max-w-lg">
            <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
              <span className="font-mono text-xl xl:text-2xl font-black text-white block">LHA</span>
              <span className="text-[11px] text-blue-200">Terverifikasi</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
              <span className="font-mono text-xl xl:text-2xl font-black text-cyan-300 block">Adaptif</span>
              <span className="text-[11px] text-blue-200">Paket soal</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
              <span className="font-mono text-xl xl:text-2xl font-black text-emerald-300 block">5 PT</span>
              <span className="text-[11px] text-blue-200">Multi-Company</span>
            </div>
          </div>
        </div>

        {/* Bottom Partner Trust Bar */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-blue-200/70">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white/80">Dipercaya oleh:</span>
            <span className="text-white/60">Telkom • Mandiri • CIMB • Astra • Pertamina</span>
          </div>
          <span className="font-mono text-white/50">Right v2.0</span>
        </div>
      </div>
    </div>
  );
}
