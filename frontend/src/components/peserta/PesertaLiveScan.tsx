import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Camera,
  Check,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  LogOut,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui';
import {
  clearPortalSession,
  getPortalToken,
  getPortalUser,
  savePortalSession,
  type PortalUser
} from '../../services/portalAuthService';

const isPlaceholderName = (name?: string | null) => {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  return (
    n === '' ||
    n === 'kandidat ujian cat' ||
    n === 'kandidat baru' ||
    n.startsWith('token-') ||
    n.startsWith('kandidat ')
  );
};

const hasCompleteBiodata = (user: PortalUser | null): boolean =>
  Boolean(
    user?.name &&
    !isPlaceholderName(user.name) &&
    user?.phone &&
    user?.nik &&
    user?.education &&
    user?.university &&
    user?.city
  );

export default function PesertaLiveScan() {
  const navigate = useNavigate();
  const portalUser = useMemo(() => getPortalUser(), []);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(
    () => localStorage.getItem('candidate_face_photo') || null
  );
  const [isNewCapture, setIsNewCapture] = useState(false);
  const [saving, setSaving] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraLoading(true);
    setCameraError('');
    setIsNewCapture(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraLoading(false);
      setCameraError('Browser Anda tidak mendukung akses kamera langsung. Gunakan browser modern seperti Chrome/Edge terbaru.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 960 },
          facingMode: 'user'
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraActive(true);
    } catch (err: any) {
      const errName = String(err?.name || '');
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError('Izin kamera ditolak. Buka ikon kamera/gembok di address bar browser, pilih Allow untuk Kamera, lalu klik "Muat Ulang Kamera".');
      } else {
        setCameraError('Kamera fisik tidak terdeteksi atau sedang dipakai aplikasi lain. Pastikan webcam aktif lalu klik "Muat Ulang Kamera".');
      }
    } finally {
      setCameraLoading(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapturePhoto = () => {
    setCameraError('');
    if (!videoRef.current || videoRef.current.videoWidth === 0) {
      setCameraError('Stream kamera belum siap. Tunggu sesaat lalu coba lagi.');
      return;
    }

    const canvas = canvasRef.current || document.createElement('canvas');
    const vw = videoRef.current.videoWidth || 1280;
    const vh = videoRef.current.videoHeight || 960;
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraError('Canvas browser tidak tersedia untuk menangkap gambar.');
      return;
    }

    // Mirror horizontally to match preview orientation naturally
    ctx.save();
    ctx.translate(vw, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, vw, vh);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreviewPhoto(dataUrl);
    setIsNewCapture(true);
    stopCamera();
  };

  const handleRetake = () => {
    setIsNewCapture(false);
    void startCamera();
  };

  const handleSaveAndContinue = async () => {
    const activePhoto = previewPhoto;
    if (!activePhoto) {
      setCameraError('Ambil foto identitas setengah badan terlebih dahulu.');
      return;
    }

    setSaving(true);
    setCameraError('');
    try {
      localStorage.setItem('candidate_face_photo', activePhoto);
      const token = getPortalToken();
      let latestUser = getPortalUser();

      if (token) {
        const response = await axios.post(
          '/api/portal/device-check',
          { faceCaptured: true },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data?.user) {
          latestUser = response.data.user;
          savePortalSession({ token, user: response.data.user });
        }
      }

      window.dispatchEvent(new Event('portal-event-updated'));

      if (!hasCompleteBiodata(latestUser)) {
        navigate('/peserta/profile', { replace: true });
      } else if (!latestUser?.deviceCheckCompletedAt) {
        navigate('/peserta/device-check', { replace: true });
      } else {
        navigate('/peserta/profile', { replace: true });
      }
    } catch (err) {
      setCameraError(
        axios.isAxiosError(err)
          ? err.response?.data?.error || 'Gagal menyimpan foto identitas ke server.'
          : 'Gagal menyimpan foto identitas.'
      );
    } finally {
      setSaving(false);
    }
  };

  const biodataReady = hasCompleteBiodata(portalUser);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans antialiased">
      <canvas ref={canvasRef} className="hidden" />

      {/* Focused Topbar */}
      <header className="h-14 shrink-0 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-navy text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              R
            </div>
            <div>
              <span className="font-heading font-black text-xs sm:text-sm tracking-tight text-primary-navy block leading-none">
                RIGHT
              </span>
              <span className="text-[9px] text-slate-400 font-medium tracking-wide uppercase">
                Assessment Platform
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-primary-navy border border-blue-200/70 text-[11px] font-bold">
            <Sparkles className="w-3 h-3" />
            Live Scan Foto Identitas Resmi
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/peserta/profile')}
            className="text-xs font-semibold gap-1.5 py-1.5 px-3 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Profil</span>
          </Button>
          <button
            type="button"
            onClick={() => {
              clearPortalSession();
              localStorage.removeItem('adminToken');
              navigate('/login');
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        {/* Stepper & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading tracking-tight">
              Ambil Foto Identitas Resmi (Setengah Badan)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Sesuaikan posisi kepala dan badan Anda di dalam garis panduan putus-putus agar hasil foto jelas dan proporsional.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold shrink-0">
            <span
              className={`px-2.5 py-1 rounded-full border ${
                biodataReady
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              1. Biodata {biodataReady ? '✓' : ''}
            </span>
            <span className="text-slate-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-primary-navy text-white border border-primary-navy">
              2. Foto Live Scan
            </span>
            <span className="text-slate-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
              3. Cek Perangkat
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Large Camera Frame with Dashed Half-Body Alignment Lines */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="relative w-full h-[380px] sm:h-[450px] rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-800 shadow-inner">
              {/* Live Webcam Feed */}
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={
                  cameraActive && !isNewCapture
                    ? 'w-full h-full object-cover scale-x-[-1]'
                    : 'hidden'
                }
              />

              {/* Captured / Existing Photo Preview */}
              {(!cameraActive || isNewCapture) && previewPhoto && (
                <img
                  src={previewPhoto}
                  alt="Preview foto identitas"
                  className="w-full h-full object-cover object-top"
                />
              )}

              {/* Fallback Placeholder when no camera and no photo */}
              {!cameraActive && !previewPhoto && (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-300">
                  <Camera className="w-12 h-12 text-slate-500 mb-3" />
                  <p className="text-sm font-semibold">
                    {cameraLoading ? 'Mengaktifkan kamera...' : 'Kamera belum aktif'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Izinkan akses kamera di browser Anda untuk melakukan live scan foto identitas setengah badan.
                  </p>
                </div>
              )}

              {/* Dashed Head + Shoulders Half-Body Alignment Guide SVG Overlay (Visible during Live Scan) */}
              {cameraActive && !isNewCapture && (
                <svg
                  className="pointer-events-none absolute inset-0 w-full h-full"
                  viewBox="0 0 640 480"
                  preserveAspectRatio="xMidYMid slice"
                  aria-hidden="true"
                >
                  <defs>
                    <mask id="half-body-cutout">
                      <rect width="640" height="480" fill="white" />
                      <ellipse cx="320" cy="155" rx="74" ry="96" fill="black" />
                      <path
                        d="M 140 480 C 145 352, 200 282, 272 270 L 368 270 C 440 282, 495 352, 500 480 Z"
                        fill="black"
                      />
                    </mask>
                  </defs>

                  {/* Soft outer framing vignette */}
                  <rect width="640" height="480" fill="rgba(2, 6, 23, 0.36)" mask="url(#half-body-cutout)" />

                  {/* Corner framing brackets */}
                  <g stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9">
                    <path d="M 28 62 L 28 28 L 62 28" />
                    <path d="M 578 28 L 612 28 L 612 62" />
                    <path d="M 28 418 L 28 452 L 62 452" />
                    <path d="M 578 452 L 612 452 L 612 418" />
                  </g>

                  {/* Center subtle vertical alignment guide */}
                  <line
                    x1="320"
                    y1="28"
                    x2="320"
                    y2="452"
                    stroke="rgba(186, 230, 253, 0.35)"
                    strokeWidth="1.5"
                    strokeDasharray="6 8"
                  />

                  {/* Eye-level horizontal dashed reference */}
                  <line
                    x1="215"
                    y1="145"
                    x2="425"
                    y2="145"
                    stroke="rgba(186, 230, 253, 0.35)"
                    strokeWidth="1.5"
                    strokeDasharray="5 6"
                  />

                  {/* Dashed Head Oval */}
                  <ellipse
                    cx="320"
                    cy="155"
                    rx="74"
                    ry="96"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    strokeDasharray="9 7"
                  />

                  {/* Dashed Shoulders & Half-Body Torso Outline */}
                  <path
                    d="M 140 472 C 145 350, 202 282, 272 270 C 294 278, 346 278, 368 270 C 438 282, 495 350, 500 472"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    strokeDasharray="10 7"
                    strokeLinecap="round"
                  />

                  {/* Subtle collar/chest reference line */}
                  <path
                    d="M 255 292 L 320 340 L 385 292"
                    fill="none"
                    stroke="rgba(56, 189, 248, 0.7)"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                  />
                </svg>
              )}

              {/* Status pill top-left */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[11px] font-semibold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isNewCapture
                        ? 'bg-emerald-400'
                        : cameraActive
                          ? 'bg-sky-400 animate-pulse'
                          : 'bg-amber-400'
                    }`}
                  />
                  {isNewCapture
                    ? 'Hasil Foto Baru Siap Disimpan'
                    : cameraActive
                      ? 'Kamera Live Aktif — Sejajarkan Kepala & Bahu'
                      : 'Pratinjau Foto Tersimpan'}
                </span>
              </div>

              {/* Framing tip bottom center */}
              {cameraActive && !isNewCapture && (
                <div className="pointer-events-none absolute bottom-3 inset-x-4 flex justify-center">
                  <span className="px-3.5 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-[11px] font-semibold text-sky-100 border border-white/15 text-center">
                    Posisikan kepala di oval atas &amp; bahu/badan setengah badan di dalam garis putus-putus
                  </span>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                {cameraActive && !isNewCapture ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleCapturePhoto}
                    className="px-5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-xl cursor-pointer shadow-sm"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Ambil Foto Identitas</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRetake}
                    className="px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-xl cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>{previewPhoto ? 'Foto Ulang Live Scan' : 'Aktifkan Kamera Live Scan'}</span>
                  </Button>
                )}

                {cameraActive && !isNewCapture && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void startCamera()}
                    className="px-3.5 py-2.5 text-xs font-semibold flex items-center gap-1.5 rounded-xl cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Muat Ulang Kamera</span>
                  </Button>
                )}
              </div>

              {previewPhoto && (!cameraActive || isNewCapture) && (
                <Button
                  type="button"
                  variant="primary"
                  disabled={saving}
                  onClick={() => void handleSaveAndContinue()}
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-sm cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {saving
                      ? 'Menyimpan...'
                      : !biodataReady
                        ? 'Simpan Foto & Lengkapi Biodata'
                        : !portalUser?.deviceCheckCompletedAt
                          ? 'Simpan Foto & Lanjut Cek Perangkat'
                          : 'Simpan Foto Identitas'}
                  </span>
                  {!saving && <ArrowRight className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>

          {/* Right 5 Cols: Half-Body Formal Shirt Reference & Guidelines */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-emerald-200/80 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 font-heading">
                  Contoh Foto Identitas yang Benar
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Acuan standar pose setengah badan &amp; pakaian resmi peserta.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold shrink-0">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Standar Resmi
              </span>
            </div>

            <div className="flex justify-center">
              <img
                src="/img/contoh-foto-identitas-right.jpg"
                alt="Contoh foto identitas setengah badan memakai kemeja rapi"
                className="w-48 h-64 rounded-2xl object-cover object-top border-2 border-emerald-200 shadow-sm"
              />
            </div>

            <div className="space-y-2.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4">
              <p className="text-xs font-bold text-slate-900">Panduan Pengambilan Foto:</p>
              <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Posisi setengah badan</strong>: atur jarak kamera agar kepala, bahu, dan bagian dada masuk penuh ke dalam garis putus-putus.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Memakai kemeja rapi</strong>: kenakan kemeja berkerah atau busana kerja formal yang sopan.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Wajah jelas &amp; menghadap lurus</strong>: pencahayaan cukup terang, tanpa masker, topi, maupun kacamata hitam.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Latar ruangan asli</strong>: dilarang menggunakan Virtual Background atau filter kamera.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
