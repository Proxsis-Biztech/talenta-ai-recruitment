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
    <div className="min-h-[100dvh] w-full relative overflow-x-hidden bg-white flex items-center justify-center p-4 sm:p-8 lg:p-10 font-sans antialiased">
      {/* Centered Two-Column Card */}
      <div className="relative z-10 w-full max-w-[1040px] bg-white rounded-[24px] border border-slate-200/80 shadow-[0_24px_64px_-16px_rgba(15,39,92,0.16)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 lg:min-h-[610px]">
        {/* Left Column: Architectural Blue Panel with Diagonal Glass Prisms & Assessment Preview Cards (Desktop) */}
        <div className="hidden lg:flex lg:col-span-6 relative bg-white overflow-hidden select-none">
          {/* Smooth curved blue architectural backdrop (no spheres) */}
          <div className="absolute inset-y-0 left-0 right-6 bg-gradient-to-br from-[#1673D6] via-[#0E51AD] to-[#082E6F] rounded-br-[110px] shadow-[14px_0_40px_-15px_rgba(8,46,111,0.32)] overflow-hidden">
            {/* Subtle dot-grid texture */}
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            />
            {/* Sleek diagonal translucent prism ribbons */}
            <div className="pointer-events-none absolute -top-20 -right-14 w-72 h-72 rounded-[44px] rotate-[24deg] bg-gradient-to-br from-sky-300/25 via-white/10 to-transparent border border-white/15" />
            <div className="pointer-events-none absolute -bottom-24 -left-12 w-80 h-64 rounded-[48px] -rotate-[18deg] bg-gradient-to-tr from-[#38BDF8]/20 via-white/10 to-transparent border border-white/15" />
            <div className="pointer-events-none absolute bottom-12 right-10 w-44 h-44 rounded-[32px] rotate-[38deg] bg-white/5 border border-white/10" />
          </div>

          <div className="relative z-10 w-full px-11 xl:px-13 py-12 pr-14 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-bold tracking-wider uppercase text-sky-50 mb-5">
                <Sparkles className="w-3.5 h-3.5 text-sky-200" />
                <span>AI Talent Assessment</span>
              </div>
              <h2 className="text-[32px] xl:text-[36px] font-extrabold text-white tracking-tight uppercase leading-none">
                SELAMAT DATANG
              </h2>
              <p className="text-sm font-bold text-sky-100 uppercase tracking-wider mt-2.5">
                RIGHT ASSESSMENT PLATFORM
              </p>
              <p className="text-xs sm:text-[13px] text-blue-100/95 mt-3.5 leading-relaxed max-w-[340px]">
                Platform asesmen digital, seleksi talenta, dan evaluasi kompetensi terstandar dalam satu portal terpadu untuk keputusan rekrutmen yang objektif.
              </p>
            </div>

            {/* Distinct Glassmorphic Pillar Cards instead of spheres */}
            <div className="space-y-3 mt-8">
              <div className="bg-white/12 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 flex items-center gap-3.5 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white">Evaluasi Kompetensi Terstandar</p>
                  <p className="text-[11px] text-blue-100/85 truncate">Ujian CAT objektif &amp; wawancara rubrik BARS 1–5</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/12 backdrop-blur-md border border-white/20 rounded-2xl p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ShieldCheck className="w-4 h-4 text-sky-200 shrink-0" />
                    <span className="text-[11px] font-bold text-white">Proctoring AI</span>
                  </div>
                  <p className="text-[11px] text-blue-100/85 leading-snug">Verifikasi wajah &amp; pengawasan integritas sesi</p>
                </div>

                <div className="bg-white/12 backdrop-blur-md border border-white/20 rounded-2xl p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Award className="w-4 h-4 text-sky-200 shrink-0" />
                    <span className="text-[11px] font-bold text-white">LHA Digital</span>
                  </div>
                  <p className="text-[11px] text-blue-100/85 leading-snug">Laporan hasil resmi &amp; tanda tangan terverifikasi</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Compact Blue Header */}
        <div className="lg:hidden relative bg-gradient-to-br from-[#1673D6] via-[#0E51AD] to-[#082E6F] px-6 py-7 text-white overflow-hidden">
          <div className="pointer-events-none -right-8 -bottom-10 absolute w-36 h-36 rounded-3xl rotate-[24deg] bg-white/10 border border-white/15" />
          <div className="pointer-events-none right-16 -bottom-14 absolute w-24 h-24 rounded-2xl -rotate-[14deg] bg-white/10" />
          <div className="relative z-10">
            <h2 className="text-xl font-extrabold tracking-tight uppercase">SELAMAT DATANG</h2>
            <p className="text-[11px] font-bold text-sky-100 uppercase tracking-wider mt-1">
              RIGHT ASSESSMENT PLATFORM
            </p>
            <p className="text-xs text-blue-100/90 mt-2 leading-relaxed">
              Portal asesmen digital dan evaluasi kompetensi terpadu.
            </p>
          </div>
        </div>

        {/* Bottom-right corner angled geometric prism ribbons (no spheres) */}
        <div className="hidden sm:block pointer-events-none absolute -bottom-8 -right-6 w-36 h-12 rounded-2xl -rotate-[32deg] bg-gradient-to-r from-[#1A78D8]/85 to-[#0B4686]/90 shadow-md" />
        <div className="hidden sm:block pointer-events-none absolute bottom-3 -right-10 w-28 h-6 rounded-xl -rotate-[32deg] bg-[#38BDF8]/25 border border-[#1A78D8]/20" />

        {/* Right Column: Clean White Login Form with RIGHT Branding */}
        <div className="lg:col-span-6 relative z-10 px-6 py-8 sm:px-11 sm:py-12 lg:px-12 xl:px-14 flex flex-col justify-center">
          <div className="w-full max-w-[400px] mx-auto">
            <div className="mb-7">
              <img
                src="/img/logoRIght.jpeg"
                alt="RIGHT Assessment Platform"
                className="h-9 sm:h-10 w-auto max-w-[165px] object-contain mb-3.5"
              />
              <h1 className="text-2xl sm:text-[30px] font-extrabold text-slate-900 font-heading tracking-tight leading-tight">
                Masuk ke Akun
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Portal Asesmen &amp; Seleksi Terpadu RIGHT
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successRole && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">
                    Terverifikasi:{' '}
                    {successRole === 'admin'
                      ? 'Administrator / Superadmin'
                      : successRole === 'asesor'
                        ? 'Dewan Asesor Independen'
                        : 'Peserta Ujian (Kandidat)'}
                  </p>
                  <p className="text-xs text-emerald-700">Mengalihkan ke portal...</p>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="sr-only">Username atau Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-[18px] w-[18px] text-slate-700" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Masukkan username atau email"
                    required
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-transparent bg-[#F1F4F8] text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-[#1261BE] focus:ring-4 focus:ring-[#1261BE]/10"
                  />
                </div>
              </div>

              <div>
                <label className="sr-only">Kata Sandi</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-[18px] w-[18px] text-slate-700" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    required
                    className="w-full pl-11 pr-16 py-3.5 rounded-xl border border-transparent bg-[#F1F4F8] text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-[#1261BE] focus:ring-4 focus:ring-[#1261BE]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-extrabold tracking-wider uppercase text-[#0B4686] hover:text-[#08376B] cursor-pointer"
                  >
                    {showPassword ? 'TUTUP' : 'LIHAT'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-[13px] pt-0.5">
                <label className="inline-flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded border-slate-300 text-[#0B4686] focus:ring-[#0B4686]"
                  />
                  <span>Ingat saya</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetOpen(true);
                    setResetError('');
                    setResetNotice('');
                    setResetEmail(identifier.includes('@') ? identifier.trim() : '');
                  }}
                  className="text-[#1365C4] hover:underline font-semibold cursor-pointer"
                >
                  Lupa Kata Sandi?
                </button>
              </div>

              <div className="pt-1.5">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3.5 text-sm sm:text-[15px] font-bold flex items-center justify-center gap-2 rounded-xl bg-[#0B4686] hover:bg-[#08376B] border-0 shadow-sm cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Masuk</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            {googleReady && (
              <>
                <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span>Atau</span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div id="google-signin-button" className="w-full flex justify-center" />
                  {googleLoading && (
                    <p className="text-xs text-slate-500">Memverifikasi akun Google...</p>
                  )}
                </div>
              </>
            )}

            <p className="mt-7 text-center text-xs text-slate-500">
              Akun peserta dibuat oleh admin melalui email undangan.{' '}
              <button
                type="button"
                onClick={() => navigate('/')}
                className="font-bold text-[#0B4686] hover:underline cursor-pointer"
              >
                Beranda
              </button>
            </p>
          </div>
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
