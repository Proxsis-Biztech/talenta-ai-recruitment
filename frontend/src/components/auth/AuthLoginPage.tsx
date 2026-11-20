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
    <div className="min-h-[100dvh] lg:h-screen lg:overflow-hidden relative w-full bg-[#DCEBFE] flex flex-col lg:flex-row items-center justify-center lg:justify-end p-4 sm:p-6 lg:p-10 font-sans antialiased">
      {/* Full-bleed 3D Desk Background on Desktop */}
      <div className="hidden lg:block absolute inset-0 z-0">
        <img
          src="/img/login-scene-right.jpg"
          alt="RIGHT Assessment Platform"
          className="w-full h-full object-cover object-left"
        />
      </div>

      {/* Compact Mobile Header Illustration */}
      <div className="lg:hidden w-full max-w-[460px] h-44 rounded-3xl overflow-hidden mb-4 shadow-md border border-white/70">
        <img
          src="/img/login-scene-right.jpg"
          alt="RIGHT Assessment Platform"
          className="w-full h-full object-cover object-left"
        />
      </div>

      {/* Floating White Login Card on Right (~half width of full page) */}
      <div className="relative z-10 w-full max-w-[480px] lg:max-w-none lg:w-[46%] lg:h-[calc(100vh-3rem)] lg:mr-2 bg-white rounded-[32px] p-6 sm:p-10 lg:p-12 shadow-[0_30px_80px_-20px_rgba(15,39,92,0.32)] border border-white/90 flex flex-col justify-center">
        <div className="w-full max-w-[440px] mx-auto">
          <div className="flex flex-col items-center text-center mb-5 sm:mb-6">
            <img
              src="/img/logoRIght.jpeg"
              alt="RIGHT Assessment Platform"
              className="h-11 sm:h-12 w-auto max-w-[180px] object-contain mb-3.5"
            />
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 font-heading tracking-tight leading-tight">
              Masuk ke Akun
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              Portal Asesmen &amp; Seleksi Terpadu RIGHT
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-700 flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successRole && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-800 flex items-center gap-2.5">
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

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 pl-1">
                Username atau Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Masukkan username atau email"
                  required
                  className="w-full pl-12 pr-5 py-4 rounded-full border border-slate-200 bg-white text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[#0F275C] focus:ring-4 focus:ring-[#0F275C]/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 pl-1">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  required
                  className="w-full pl-12 pr-12 py-4 rounded-full border border-slate-200 bg-white text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[#0F275C] focus:ring-4 focus:ring-[#0F275C]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <label className="inline-flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded border-slate-300 text-[#0F275C] focus:ring-[#0F275C]"
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
                className="text-[#0F275C] hover:underline font-semibold cursor-pointer"
              >
                Lupa Kata Sandi?
              </button>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                className="w-full py-4 text-sm sm:text-base font-bold flex items-center justify-center gap-2 rounded-full bg-[#0F275C] hover:bg-[#16367d] border-0 shadow-md cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Masuk</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {googleReady && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                <span>Atau lanjutkan dengan</span>
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

          <p className="mt-7 text-center text-xs sm:text-sm text-slate-500">
            Akun peserta dibuat oleh admin melalui email undangan.{' '}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="font-semibold text-[#0F275C] hover:underline cursor-pointer"
            >
              Beranda
            </button>
          </p>
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
