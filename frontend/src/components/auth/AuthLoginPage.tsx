import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
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
import { Button, Badge, Modal } from '../ui';
import { setActiveSessionUser } from '../../services/userRegistryService';
import {
  clearPortalSession,
  getAuthenticatedHomeRoute,
  loginPortal,
  savePortalSession,
  requestPasswordReset,
  resetPasswordWithToken
} from '../../services/portalAuthService';

const SHOW_DEMO_ACCESS = false;

export default function AuthLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successRole, setSuccessRole] = useState<'admin' | 'asesor' | 'peserta' | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  // Password reset flow
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetNotice, setResetNotice] = useState('');
  const [resetError, setResetError] = useState('');

  // Two-factor (TOTP) challenge for admin accounts
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');

  useEffect(() => {
    const homeRoute = getAuthenticatedHomeRoute();
    if (homeRoute) {
      navigate(homeRoute, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('reset');
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setResetOpen(true);
    }
  }, [searchParams]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetNotice('');
    setResetLoading(true);
    try {
      const result = await requestPasswordReset(resetEmail.trim());
      setResetNotice(result.message);
      if (result.devResetToken) setResetToken(result.devResetToken);
    } catch (err) {
      setResetError(axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal mengirim tautan reset.' : 'Gagal mengirim tautan reset.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetNotice('');
    setResetLoading(true);
    try {
      const result = await resetPasswordWithToken(resetToken.trim(), resetPassword);
      setResetNotice(result.message);
      setResetPassword('');
      setResetToken('');
      setTimeout(() => setResetOpen(false), 1200);
    } catch (err) {
      setResetError(axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal mengatur ulang kata sandi.' : 'Gagal mengatur ulang kata sandi.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleLogin = async (credential: string) => {
    setError('');
    setGoogleLoading(true);
    try {
      const response = await axios.post('/api/portal/auth/google', { credential });
      const session = {
        token: response.data.token,
        refreshToken: response.data.refreshToken,
        user: response.data.user,
        requiresOnboarding: response.data.requiresOnboarding
      };
      clearPortalSession();
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRole');
      localStorage.removeItem('adminUsername');
      savePortalSession(session);

      const isPlaceholder = (n?: string | null) => {
        if (!n) return true;
        const s = n.trim().toLowerCase();
        return s === '' || s === 'kandidat ujian cat' || s === 'kandidat baru' || s.startsWith('token-') || s.startsWith('kandidat ');
      };
      const isProfileComplete = Boolean(
        session.user.name &&
        !isPlaceholder(session.user.name) &&
        session.user.phone &&
        session.user.nik &&
        session.user.education &&
        session.user.university &&
        session.user.city
      );
      const nextUrl = session.requiresOnboarding || !isProfileComplete
        ? '/peserta/profile'
        : '/peserta/device-check';
      navigate(nextUrl, { replace: true });
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
  const handleFillDemo = (type: 'superadmin' | 'asesor' | 'peserta-telkom' | 'peserta-mandiri') => {
    setError('');
    setSuccessRole(null);
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
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessRole(null);

    try {
      const cleanId = identifier.trim().toLowerCase();
      const isAdminAccount =
        cleanId === 'superadmin' ||
        cleanId === 'admin' ||
        cleanId.includes('admin@') ||
        cleanId.startsWith('admin');

      if (isAdminAccount) {
        clearPortalSession();
        await completeAdminLogin();
        return;
      }

      clearPortalSession();
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRole');
      localStorage.removeItem('adminUsername');
      const session = await loginPortal(identifier.trim(), password);
      savePortalSession(session);
      setSuccessRole(session.user.role === 'asesor' ? 'asesor' : 'peserta');
      if (session.user.role === 'asesor') {
        setTimeout(() => navigate('/asesor', { replace: true }), 300);
      } else {
        const isPlaceholder = (n?: string | null) => {
          if (!n) return true;
          const s = n.trim().toLowerCase();
          return s === '' || s === 'kandidat ujian cat' || s === 'kandidat baru' || s.startsWith('token-') || s.startsWith('kandidat ');
        };
        const isProfileComplete = Boolean(
          session.user.name &&
          !isPlaceholder(session.user.name) &&
          session.user.phone &&
          session.user.nik &&
          session.user.education &&
          session.user.university &&
          session.user.city
        );
        const nextUrl = session.requiresOnboarding || !isProfileComplete
          ? '/peserta/profile'
          : '/peserta/device-check';
        setTimeout(() => navigate(nextUrl, { replace: true }), 300);
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error ||
          (err.code === 'ERR_NETWORK'
            ? 'Tidak dapat terhubung ke server. Pastikan backend berjalan dan alamat API benar.'
            : 'Kredensial tidak valid. Periksa kembali username/email dan kata sandi Anda.')
        : err instanceof Error
          ? err.message
          : 'Gagal masuk. Silakan coba lagi.';
      if (axios.isAxiosError(err) && err.response?.data?.twoFactorRequired) {
        setTwoFactorRequired(true);
        setError('');
        return;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const completeAdminLogin = async (totp?: string) => {
    const res = await axios.post('/api/admin/login', {
      username: identifier.trim(),
      password,
      ...(totp ? { totp } : {})
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
    setTwoFactorRequired(false);
    setTimeout(() => navigate('/admin/dashboard', { replace: true }), 300);
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError('');
    setTwoFactorLoading(true);
    try {
      await completeAdminLogin(totpCode.trim());
    } catch (err) {
      setTwoFactorError(
        axios.isAxiosError(err)
          ? err.response?.data?.error || 'Kode verifikasi tidak valid.'
          : 'Kode verifikasi tidak valid.'
      );
    } finally {
      setTwoFactorLoading(false);
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
            className="inline-flex items-center gap-3 cursor-pointer mb-8 group"
          >
            <img
              src="/img/logoRIght.jpeg"
              alt="RIGHT Assessment Platform"
              className="h-11 sm:h-12 w-auto max-w-[260px] object-contain group-hover:opacity-90 transition-opacity"
            />
          </div>

          <div className="max-w-md">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-heading tracking-tight">
              Masuk ke Portal
            </h1>
            <p className="text-xs sm:text-sm text-muted-slate mt-1.5 leading-relaxed">
              Akses terpadu untuk Peserta Seleksi, Dewan Asesor, dan Administrator.
            </p>



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
                    onClick={() => {
                      setResetOpen(true);
                      setResetError('');
                      setResetNotice('');
                      setResetEmail(identifier.includes('@') ? identifier.trim() : '');
                    }}
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
              </div>
            </div>

            )}

            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-muted-slate">
              Akun peserta dibuat oleh admin melalui email undangan.
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
      <Modal
        isOpen={twoFactorRequired}
        onClose={() => setTwoFactorRequired(false)}
        title="Verifikasi Dua Langkah"
        description="Masukkan kode 6 digit dari aplikasi authenticator Anda untuk melanjutkan."
        size="sm"
      >
        <form onSubmit={handleTwoFactorSubmit} className="space-y-4 p-1">
          <input
            value={totpCode}
            onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoFocus
            placeholder="000000"
            className="w-full text-center tracking-[0.5em] font-mono text-lg px-3.5 py-3 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 outline-none"
          />
          {twoFactorError && (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{twoFactorError}</p>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={twoFactorLoading || totpCode.length !== 6}
            className="w-full py-2.5 text-xs font-bold rounded-xl"
          >
            {twoFactorLoading ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Pemulihan Akun"
        description="Minta tautan reset melalui email terdaftar, atau tempel kode reset yang Anda terima."
        size="md"
      >
        <div className="space-y-5 p-1">
          <form onSubmit={handleRequestReset} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">Email terdaftar</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                placeholder="nama@email.com"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm outline-none"
              />
              <Button type="submit" variant="primary" disabled={resetLoading || !resetEmail.trim()} className="px-4 py-2.5 text-xs font-bold rounded-xl">
                {resetLoading ? 'Memproses...' : 'Kirim Tautan'}
              </Button>
            </div>
          </form>

          <div className="border-t border-slate-200 pt-4 space-y-3">
            <form onSubmit={handleSubmitNewPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kode reset</label>
                <input
                  value={resetToken}
                  onChange={(event) => setResetToken(event.target.value)}
                  placeholder="Tempel kode dari email"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs font-mono outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kata sandi baru</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm outline-none"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={resetLoading || !resetToken.trim() || resetPassword.length < 8}
                className="w-full py-2.5 text-xs font-bold rounded-xl"
              >
                {resetLoading ? 'Menyimpan...' : 'Atur Kata Sandi Baru'}
              </Button>
            </form>
          </div>

          {resetNotice && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{resetNotice}</p>
          )}
          {resetError && (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{resetError}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
