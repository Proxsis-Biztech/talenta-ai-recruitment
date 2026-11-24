import React, { useEffect, useRef, useState } from 'react';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successRole, setSuccessRole] = useState<'admin' | 'asesor' | 'peserta' | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  // Password reset & self-activation flow
  const [resetOpen, setResetOpen] = useState(false);
  const [activationMode, setActivationMode] = useState(false);
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

  const closeTimerRef = useRef<number | null>(null);

  const clearRecoveryParams = () => {
    if (!searchParams.has('activate') && !searchParams.has('reset')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('activate');
    next.delete('reset');
    setSearchParams(next, { replace: true });
  };

  const closeResetModal = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setResetOpen(false);
    setActivationMode(false);
    clearRecoveryParams();
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const hasRecoveryParam = Boolean(searchParams.get('activate') || searchParams.get('reset'));
    if (hasRecoveryParam || resetOpen) return;
    const homeRoute = getAuthenticatedHomeRoute();
    if (homeRoute) {
      navigate(homeRoute, { replace: true });
    }
  }, [navigate, searchParams, resetOpen]);

  useEffect(() => {
    const activateFromUrl = searchParams.get('activate');
    const resetFromUrl = searchParams.get('reset');
    if (activateFromUrl) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setActivationMode(true);
      setResetToken(activateFromUrl);
      setResetPassword('');
      setResetError('');
      setResetNotice('');
      setResetOpen(true);
      return;
    }
    if (resetFromUrl) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setActivationMode(false);
      setResetToken(resetFromUrl);
      setResetPassword('');
      setResetError('');
      setResetNotice('');
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
      clearPortalSession();
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRole');
      localStorage.removeItem('adminUsername');
      setResetNotice(result.message);
      setResetPassword('');
      setResetToken('');
      closeTimerRef.current = window.setTimeout(() => {
        closeResetModal();
      }, 1200);
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

      const resolvePesertaNextUrl = (user: any, requiresOnboarding?: boolean) => {
        const isPlaceholder = (n?: string | null) => {
          if (!n) return true;
          const s = n.trim().toLowerCase();
          return s === '' || s === 'kandidat ujian cat' || s === 'kandidat baru' || s.startsWith('token-') || s.startsWith('kandidat ');
        };
        const biodataComplete = Boolean(
          user?.name &&
          !isPlaceholder(user.name) &&
          user?.phone &&
          user?.nik &&
          user?.education &&
          user?.university &&
          user?.city
        );
        if (requiresOnboarding || !biodataComplete) return '/peserta/profile';
        if (!user?.faceVerifiedAt) return '/peserta/live-scan';
        if (!user?.deviceCheckCompletedAt) return '/peserta/device-check';
        return '/peserta';
      };

      navigate(resolvePesertaNextUrl(session.user, session.requiresOnboarding), { replace: true });
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
        const biodataComplete = Boolean(
          session.user.name &&
          !isPlaceholder(session.user.name) &&
          session.user.phone &&
          session.user.nik &&
          session.user.education &&
          session.user.university &&
          session.user.city
        );
        const nextUrl = session.requiresOnboarding || !biodataComplete
          ? '/peserta/profile'
          : !session.user.faceVerifiedAt
            ? '/peserta/live-scan'
            : !session.user.deviceCheckCompletedAt
              ? '/peserta/device-check'
              : '/peserta';
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
        {/* Top-left compact multi-line topographic ridge */}
        <g stroke="#C8D5E6" strokeWidth="1.05" opacity="0.82">
          <path d="M-20 285 C 25 275, 58 242, 74 205 C 90 168, 86 128, 128 108 C 170 88, 224 102, 266 72 C 304 45, 318 10, 342 -20" />
          <path d="M-20 264 C 20 255, 50 225, 65 190 C 79 156, 76 118, 114 100 C 153 82, 203 94, 242 66 C 276 41, 290 8, 312 -20" />
          <path d="M-20 243 C 15 235, 42 208, 56 175 C 68 144, 66 108, 100 92 C 136 75, 182 86, 218 60 C 249 37, 262 6, 282 -20" />
          <path d="M-20 222 C 10 215, 34 191, 47 160 C 58 132, 56 98, 86 84 C 119 69, 161 78, 194 54 C 222 33, 234 4, 252 -20" />
          <path d="M-20 201 C 6 195, 26 174, 38 146 C 48 120, 46 89, 73 76 C 102 62, 140 70, 170 48 C 195 29, 206 2, 222 -20" />
          <path d="M-20 180 C 2 175, 18 157, 29 132 C 38 108, 36 80, 60 68 C 85 56, 119 62, 146 42 C 168 25, 178 0, 192 -20" />
          <path d="M-20 159 C -2 155, 11 140, 20 118 C 28 96, 27 71, 47 60 C 68 50, 98 54, 122 36 C 141 21, 150 -2, 162 -20" />
          <path d="M-20 138 C -5 135, 5 122, 12 103 C 18 85, 18 62, 35 52 C 52 43, 77 46, 98 30 C 114 18, 122 -4, 132 -20" />
          <path d="M-20 117 C -8 114, 0 104, 5 88 C 10 73, 10 53, 23 44 C 37 36, 56 38, 74 24 C 87 14, 94 -6, 102 -20" />
        </g>

        {/* Top-right compact multi-line topographic ridge */}
        <g stroke="#C8D5E6" strokeWidth="1.05" opacity="0.82">
          <path d="M1110 -20 C 1134 20, 1142 62, 1172 95 C 1202 128, 1184 176, 1208 214 C 1235 256, 1296 254, 1352 276 C 1396 293, 1425 316, 1460 338" />
          <path d="M1134 -20 C 1156 17, 1164 56, 1192 86 C 1220 117, 1203 161, 1226 196 C 1251 235, 1308 234, 1360 254 C 1400 269, 1428 290, 1460 310" />
          <path d="M1158 -20 C 1178 14, 1186 50, 1212 77 C 1238 106, 1222 146, 1244 178 C 1267 214, 1320 214, 1368 232 C 1405 246, 1431 264, 1460 282" />
          <path d="M1182 -20 C 1200 11, 1208 44, 1232 68 C 1256 95, 1241 131, 1262 160 C 1283 193, 1332 194, 1376 210 C 1410 223, 1434 238, 1460 254" />
          <path d="M1206 -20 C 1222 8, 1230 38, 1252 60 C 1274 84, 1260 116, 1280 142 C 1299 172, 1344 174, 1384 188 C 1415 200, 1437 212, 1460 226" />
          <path d="M1230 -20 C 1244 5, 1252 32, 1272 52 C 1292 73, 1279 101, 1298 124 C 1315 151, 1356 154, 1392 166 C 1420 176, 1440 186, 1460 198" />
          <path d="M1254 -20 C 1266 2, 1274 26, 1292 44 C 1310 62, 1298 86, 1316 106 C 1331 130, 1368 134, 1400 144 C 1425 152, 1443 160, 1460 170" />
          <path d="M1278 -20 C 1288 -1, 1296 20, 1312 36 C 1328 51, 1317 71, 1334 88 C 1347 109, 1380 114, 1408 122 C 1430 128, 1446 134, 1460 142" />
          <path d="M1302 -20 C 1310 -4, 1318 14, 1332 28 C 1346 40, 1336 56, 1352 70 C 1363 88, 1392 94, 1416 100 C 1435 104, 1449 108, 1460 114" />
        </g>

        {/* Bottom-left compact multi-line topographic ridge */}
        <g stroke="#C8D5E6" strokeWidth="1.05" opacity="0.82">
          <path d="M-20 590 C 26 602, 72 606, 108 632 C 144 658, 132 704, 162 742 C 192 780, 248 792, 274 834 C 292 864, 298 892, 314 920" />
          <path d="M-20 612 C 22 623, 64 626, 97 650 C 130 674, 119 716, 146 751 C 173 786, 224 798, 248 836 C 264 864, 270 892, 284 920" />
          <path d="M-20 634 C 18 644, 56 646, 86 668 C 116 690, 106 728, 130 760 C 154 792, 200 804, 222 838 C 236 864, 242 892, 254 920" />
          <path d="M-20 656 C 14 665, 48 666, 75 686 C 102 706, 93 740, 114 769 C 135 798, 176 810, 196 840 C 208 864, 214 892, 224 920" />
          <path d="M-20 678 C 10 686, 40 686, 64 704 C 88 722, 80 752, 98 778 C 116 804, 152 816, 170 842 C 180 864, 186 892, 194 920" />
          <path d="M-20 700 C 6 707, 32 706, 53 722 C 74 738, 67 764, 82 787 C 97 810, 128 822, 144 844 C 152 864, 158 892, 164 920" />
          <path d="M-20 722 C 2 728, 24 726, 42 740 C 60 754, 54 776, 66 796 C 78 816, 104 828, 118 846 C 124 864, 130 892, 134 920" />
          <path d="M-20 744 C -2 749, 16 746, 31 758 C 46 770, 41 788, 50 805 C 59 822, 80 834, 92 848 C 96 864, 102 892, 104 920" />
          <path d="M-20 766 C -6 770, 8 766, 20 776 C 32 786, 28 800, 34 814 C 40 828, 56 840, 66 850 C 68 864, 74 892, 74 920" />
        </g>

        {/* Bottom-right compact multi-line topographic ridge */}
        <g stroke="#C8D5E6" strokeWidth="1.05" opacity="0.82">
          <path d="M1070 920 C 1094 878, 1114 834, 1156 806 C 1198 778, 1252 788, 1290 754 C 1326 722, 1320 668, 1358 632 C 1390 602, 1426 594, 1460 578" />
          <path d="M1100 920 C 1122 882, 1140 842, 1178 817 C 1216 792, 1266 800, 1301 769 C 1334 740, 1329 690, 1364 657 C 1394 629, 1428 621, 1460 606" />
          <path d="M1130 920 C 1150 886, 1166 850, 1200 828 C 1234 806, 1280 812, 1312 784 C 1342 758, 1338 712, 1370 682 C 1398 656, 1430 648, 1460 634" />
          <path d="M1160 920 C 1178 890, 1192 858, 1222 839 C 1252 820, 1294 824, 1323 799 C 1350 776, 1347 734, 1376 707 C 1402 683, 1432 675, 1460 662" />
          <path d="M1190 920 C 1206 894, 1218 866, 1244 850 C 1270 834, 1308 836, 1334 814 C 1358 794, 1356 756, 1382 732 C 1406 710, 1434 702, 1460 690" />
          <path d="M1220 920 C 1234 898, 1244 874, 1266 861 C 1288 848, 1322 848, 1345 829 C 1366 812, 1365 778, 1388 757 C 1410 737, 1436 729, 1460 718" />
          <path d="M1250 920 C 1262 902, 1270 882, 1288 872 C 1306 862, 1336 860, 1356 844 C 1374 830, 1374 800, 1394 782 C 1414 764, 1438 756, 1460 746" />
          <path d="M1280 920 C 1290 906, 1296 890, 1310 883 C 1324 876, 1350 872, 1367 859 C 1382 848, 1383 822, 1400 807 C 1418 791, 1440 783, 1460 774" />
          <path d="M1310 920 C 1318 910, 1322 898, 1332 894 C 1342 890, 1364 884, 1378 874 C 1390 866, 1392 844, 1406 832 C 1422 818, 1442 810, 1460 802" />
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
        onClose={closeResetModal}
        closeOnOutsideClick={false}
        title={activationMode ? 'Aktivasi Akun & Buat Kata Sandi' : 'Pemulihan Akun'}
        description={
          activationMode
            ? 'Masukkan kata sandi baru minimal 8 karakter untuk mengaktifkan akun peserta Anda.'
            : 'Minta tautan reset melalui email terdaftar, atau tempel kode reset yang Anda terima.'
        }
        size="md"
      >
        <div className="space-y-5 p-1">
          {!activationMode && (
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
          )}

          <div className={activationMode ? 'space-y-3' : 'border-t border-slate-200 pt-4 space-y-3'}>
            <form onSubmit={handleSubmitNewPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {activationMode ? 'Kode aktivasi' : 'Kode reset'}
                </label>
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
                {resetLoading
                  ? 'Menyimpan...'
                  : activationMode
                    ? 'Aktifkan Akun & Simpan Kata Sandi'
                    : 'Atur Kata Sandi Baru'}
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
