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
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleCardTilt = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -py * 8, y: px * 8 });
  };
  const resetCardTilt = () => setTilt({ x: 0, y: 0 });

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
    <div className="relative min-h-screen overflow-hidden bg-[#060A18] flex items-center justify-center px-4 py-14 font-sans antialiased">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full bg-blue-600/30 blur-[130px]" />
        <div className="absolute -bottom-40 -right-24 h-[460px] w-[460px] rounded-full bg-cyan-400/20 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '56px 56px'
          }}
        />
      </div>

      <div className="relative w-full max-w-[430px]" style={{ perspective: '1200px' }}>
        <div className="absolute inset-0 translate-x-3 translate-y-4 rotate-2 rounded-[34px] border border-white/10 bg-white/[0.04]" />
        <div className="absolute inset-0 -translate-x-2 -translate-y-2 -rotate-1 rounded-[34px] border border-white/[0.06] bg-white/[0.02]" />

        <div
          onMouseMove={handleCardTilt}
          onMouseLeave={resetCardTilt}
          className="relative rounded-[34px] border border-white/15 bg-white/[0.07] p-6 sm:p-8 backdrop-blur-2xl shadow-[0_50px_100px_-30px_rgba(0,0,0,0.9)] transition-transform duration-200 ease-out"
          style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transformStyle: 'preserve-3d' }}
        >
          <div className="flex justify-center -mt-16 mb-5" style={{ transform: 'translateZ(60px)' }}>
            <div className="h-20 w-20 rounded-[22px] bg-white p-2 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.8)] border border-white/40 flex items-center justify-center">
              <img
                src="/img/logoRIght.jpeg"
                alt="RIGHT Assessment Platform"
                className="h-12 w-auto max-w-[64px] object-contain"
              />
            </div>
          </div>

          <div className="text-center mb-6" style={{ transform: 'translateZ(30px)' }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              RIGHT Assessment Platform
            </span>
            <h1 className="mt-3 text-2xl font-extrabold text-white font-heading tracking-tight">
              Masuk ke Portal
            </h1>
            <p className="text-xs text-slate-300/80 mt-1.5 leading-relaxed">
              Akses terpadu Peserta, Dewan Asesor, dan Administrator.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-400/30 rounded-xl text-xs text-rose-200 flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successRole && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-400/30 rounded-xl text-xs text-emerald-100 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <div>
                <p className="font-bold">
                  Terverifikasi:{' '}
                  {successRole === 'admin'
                    ? 'Administrator / Superadmin'
                    : successRole === 'asesor'
                      ? 'Dewan Asesor Independen'
                      : 'Peserta Ujian (Kandidat)'}
                </p>
                <p className="text-[11px] text-emerald-200/80">Mengalihkan ke portal...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" style={{ transform: 'translateZ(20px)' }}>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
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
                  placeholder="superadmin / asesor / nama@kandidat.id"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/15 bg-white/[0.08] text-xs sm:text-sm font-medium text-white placeholder:text-slate-500 outline-none transition-all focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/15"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300">
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
                  className="text-[11px] text-cyan-300 hover:text-cyan-200 hover:underline font-semibold cursor-pointer"
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
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-white/15 bg-white/[0.08] text-xs sm:text-sm font-medium text-white placeholder:text-slate-500 outline-none transition-all focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F95B2B] to-[#ff8a5c] border-0 shadow-[0_18px_30px_-12px_rgba(249,91,43,0.8)] hover:brightness-105 cursor-pointer"
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

          <div className="mt-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <span className="h-px flex-1 bg-white/10" />
            Aman &amp; Terenkripsi
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2">
              <ShieldCheck className="mx-auto h-4 w-4 text-emerald-300" />
              <p className="mt-1 text-[10px] font-semibold text-slate-300">SSL 256-bit</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2">
              <Sparkles className="mx-auto h-4 w-4 text-cyan-300" />
              <p className="mt-1 text-[10px] font-semibold text-slate-300">Proctoring AI</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2">
              <Award className="mx-auto h-4 w-4 text-amber-300" />
              <p className="mt-1 text-[10px] font-semibold text-slate-300">LHA Resmi</p>
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] text-slate-400">
            Akun peserta dibuat oleh admin melalui email undangan.
          </p>
        </div>
      </div>

      <p className="absolute bottom-5 left-0 right-0 text-center text-[10px] text-slate-500">
        © 2026 Right • Dilindungi enkripsi SSL 256-bit dan Sistem Anti-Cheat AI.
      </p>

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
