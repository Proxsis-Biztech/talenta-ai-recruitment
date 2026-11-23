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
    <div className="min-h-[100dvh] w-full relative overflow-hidden bg-[#F8FAFD] flex items-center justify-center p-4 sm:p-8 lg:p-10 font-sans antialiased">
      {/* Subtle Topographic Contour Line Waves on Crisp Off-White Canvas */}
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        aria-hidden="true"
      >
        {/* Top-left topographic contour cluster */}
        <g stroke="#CBD8EA" strokeWidth="1.25" opacity="0.85">
          <path d="M-40 260 C 90 250, 175 180, 215 100 C 245 40, 285 -15, 360 -40" />
          <path d="M-40 220 C 72 212, 145 152, 180 82 C 206 30, 240 -15, 305 -40" />
          <path d="M-40 182 C 55 174, 118 124, 148 64 C 170 20, 198 -16, 252 -40" />
          <path d="M-40 144 C 38 136, 90 96, 115 48 C 133 12, 156 -18, 200 -40" />
          <path d="M-40 106 C 22 98, 64 68, 84 30 C 98 4, 115 -20, 150 -40" />
          <path d="M-40 300 C 110 288, 208 210, 252 120 C 288 48, 336 -10, 420 -40" />
          <path d="M-40 342 C 132 328, 242 242, 290 142 C 330 58, 388 -6, 482 -40" />
        </g>

        {/* Top-right topographic contour cluster */}
        <g stroke="#CBD8EA" strokeWidth="1.25" opacity="0.85">
          <path d="M1110 -40 C 1135 55, 1105 140, 1175 210 C 1238 272, 1345 278, 1480 315" />
          <path d="M1155 -40 C 1175 45, 1150 120, 1212 182 C 1266 236, 1362 242, 1480 274" />
          <path d="M1200 -40 C 1216 35, 1196 100, 1250 154 C 1296 200, 1378 206, 1480 232" />
          <path d="M1246 -40 C 1258 25, 1242 80, 1288 126 C 1326 164, 1396 170, 1480 190" />
          <path d="M1292 -40 C 1300 15, 1288 60, 1326 98 C 1356 128, 1412 134, 1480 148" />
          <path d="M1065 -40 C 1094 68, 1062 162, 1138 238 C 1210 310, 1328 316, 1480 356" />
          <path d="M1020 -40 C 1052 80, 1018 184, 1102 268 C 1180 346, 1310 354, 1480 398" />
        </g>

        {/* Bottom-left topographic contour cluster */}
        <g stroke="#CBD8EA" strokeWidth="1.25" opacity="0.85">
          <path d="M-40 520 C 75 555, 185 552, 232 628 C 278 702, 250 810, 325 940" />
          <path d="M-40 562 C 62 592, 156 590, 198 656 C 238 720, 214 818, 278 940" />
          <path d="M-40 604 C 48 630, 128 628, 164 685 C 198 738, 178 826, 232 940" />
          <path d="M-40 646 C 35 668, 100 666, 130 714 C 158 758, 142 834, 186 940" />
          <path d="M-40 688 C 22 706, 72 704, 96 742 C 118 776, 106 842, 140 940" />
          <path d="M-40 478 C 88 518, 214 514, 266 600 C 318 686, 286 802, 372 940" />
          <path d="M-40 436 C 102 480, 242 476, 300 572 C 358 668, 322 794, 420 940" />
        </g>

        {/* Bottom-right topographic contour cluster */}
        <g stroke="#CBD8EA" strokeWidth="1.25" opacity="0.85">
          <path d="M980 940 C 1025 835, 1095 790, 1185 758 C 1278 725, 1335 640, 1480 575" />
          <path d="M1030 940 C 1070 848, 1132 808, 1212 780 C 1294 750, 1346 675, 1480 618" />
          <path d="M1080 940 C 1115 860, 1170 826, 1240 802 C 1312 776, 1358 712, 1480 662" />
          <path d="M1130 940 C 1160 874, 1208 844, 1268 824 C 1330 802, 1370 748, 1480 706" />
          <path d="M1180 940 C 1205 888, 1246 862, 1296 846 C 1348 828, 1384 785, 1480 750" />
          <path d="M930 940 C 980 822, 1058 770, 1158 734 C 1260 698, 1322 604, 1480 532" />
          <path d="M880 940 C 935 808, 1020 750, 1130 710 C 1242 670, 1308 568, 1480 488" />
        </g>
      </svg>

      {/* Centered Two-Column Card */}
      <div className="relative z-10 w-full max-w-[1040px] bg-white rounded-[24px] border border-blue-100/90 shadow-[0_28px_72px_-16px_rgba(11,70,134,0.18)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 lg:min-h-[610px]">
        {/* Left Column: Layered 3D Rounded Diamond/Squircle Geometry & Welcome Copy (No Circles) */}
        <div className="hidden lg:block lg:col-span-6 relative bg-white overflow-hidden select-none">
          {/* Main sweeping top-left tilted rounded-square blue block */}
          <div className="pointer-events-none absolute -top-[105px] -left-[95px] w-[545px] h-[545px] rounded-[96px] rotate-[16deg] bg-[linear-gradient(145deg,#2E8DEE_0%,#1465C3_56%,#0A4595_100%)] shadow-[0_26px_55px_-12px_rgba(9,57,128,0.42)] border border-white/15" />
          {/* Bottom-left overlapping 3D tilted rounded cube */}
          <div className="pointer-events-none absolute -bottom-[85px] -left-[45px] w-[235px] h-[235px] rounded-[52px] rotate-[24deg] bg-[linear-gradient(135deg,#419DF7_0%,#176AC9_58%,#0B4797_100%)] shadow-[0_-10px_35px_rgba(5,32,80,0.28)] border border-white/20">
            <div className="absolute top-6 left-7 w-16 h-6 rounded-xl bg-white/20 blur-[4px] -rotate-12" />
          </div>
          {/* Floating mid-lower 3D tilted diamond prism */}
          <div className="pointer-events-none absolute bottom-[36px] left-[220px] w-[168px] h-[168px] rounded-[40px] rotate-[38deg] bg-[linear-gradient(145deg,#3895F4_0%,#1564C0_58%,#0B428F_100%)] shadow-[0_22px_40px_-8px_rgba(6,38,94,0.44)] border border-white/25">
            <div className="absolute top-4 left-5 w-12 h-5 rounded-lg bg-white/25 blur-[3px] -rotate-12" />
          </div>

          <div className="relative z-10 px-12 xl:px-14 pt-20 pb-48 max-w-[420px]">
            <h2 className="text-[32px] xl:text-[36px] font-extrabold text-white tracking-tight uppercase leading-none">
              SELAMAT DATANG
            </h2>
            <p className="text-sm font-bold text-blue-100 uppercase tracking-wider mt-2.5">
              RIGHT ASSESSMENT PLATFORM
            </p>
            <p className="text-xs sm:text-[13px] text-blue-100/95 mt-4 leading-relaxed max-w-[295px]">
              Platform asesmen digital, seleksi talenta, dan evaluasi kompetensi terstandar dalam satu portal terpadu untuk keputusan rekrutmen yang objektif.
            </p>
          </div>
        </div>

        {/* Mobile Compact Blue Header */}
        <div className="lg:hidden relative bg-gradient-to-br from-[#2381E3] via-[#1363C1] to-[#0A4595] px-6 py-7 text-white overflow-hidden">
          <div className="pointer-events-none -right-8 -bottom-10 absolute w-36 h-36 rounded-3xl rotate-[24deg] bg-white/10 border border-white/15" />
          <div className="pointer-events-none right-16 -bottom-14 absolute w-24 h-24 rounded-2xl -rotate-[14deg] bg-white/10" />
          <div className="relative z-10">
            <h2 className="text-xl font-extrabold tracking-tight uppercase">SELAMAT DATANG</h2>
            <p className="text-[11px] font-bold text-blue-100 uppercase tracking-wider mt-1">
              RIGHT ASSESSMENT PLATFORM
            </p>
            <p className="text-xs text-blue-100/90 mt-2 leading-relaxed">
              Portal asesmen digital dan evaluasi kompetensi terpadu.
            </p>
          </div>
        </div>

        {/* Bottom-right corner matching 3D tilted diamond accent (No Circles) */}
        <div className="hidden sm:block pointer-events-none absolute -bottom-[70px] -right-[58px] w-[155px] h-[155px] rounded-[38px] rotate-[28deg] bg-[linear-gradient(135deg,#3893F0_0%,#1564C0_62%,#0B4493_100%)] shadow-[0_12px_30px_rgba(8,46,105,0.28)] border border-white/25" />

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
                  className="w-full py-3.5 text-sm sm:text-[15px] font-bold flex items-center justify-center gap-2 rounded-full bg-[#0B4686] hover:bg-[#08376B] border-0 shadow-sm cursor-pointer"
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
