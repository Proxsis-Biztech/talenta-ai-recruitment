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
  Loader2,
  ScanFace,
  ShieldAlert,
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
import { isVirtualCameraLabel } from '../../utils/proctoringEngine';

const MAX_CAPTURE_SIDE = 960;

interface AiVerificationState {
  status: 'idle' | 'checking' | 'verified' | 'rejected' | 'error';
  message: string;
  token?: string;
  faceCount?: number;
}

function assessCanvasFrameQuality(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 64;
  sampleCanvas.height = 48;
  const sCtx = sampleCanvas.getContext('2d');
  if (!sCtx) return { ok: true };

  sCtx.drawImage(ctx.canvas, 0, 0, width, height, 0, 0, 64, 48);
  const { data } = sCtx.getImageData(0, 0, 64, 48);
  const totalPixels = 64 * 48;
  let sum = 0;
  let sqSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += luma;
    sqSum += luma * luma;
  }

  const mean = sum / totalPixels;
  const variance = Math.max(0, sqSum / totalPixels - mean * mean);
  const stdDev = Math.sqrt(variance);

  if (mean < 16) {
    return {
      ok: false,
      reason: 'Hasil kamera terlalu gelap atau lensa tertutup. Pastikan pencahayaan ruangan cukup terang.'
    };
  }
  if (stdDev < 5) {
    return {
      ok: false,
      reason: 'Frame kamera tampak kosong atau seragam. Arahkan wajah Anda ke kamera lalu coba lagi.'
    };
  }
  return { ok: true };
}

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
    () => (portalUser?.faceVerifiedAt ? localStorage.getItem('candidate_face_photo') || null : null)
  );
  const [isNewCapture, setIsNewCapture] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liveFaceCount, setLiveFaceCount] = useState<number | null>(null);
  const [aiVerification, setAiVerification] = useState<AiVerificationState>({
    status: 'idle',
    message: ''
  });

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setLiveFaceCount(null);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraLoading(true);
    setCameraError('');
    setIsNewCapture(false);
    setAiVerification({ status: 'idle', message: '' });

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

      const primaryTrack = stream.getVideoTracks()[0];
      if (primaryTrack && isVirtualCameraLabel(primaryTrack.label)) {
        stream.getTracks().forEach((track) => track.stop());
        setCameraError(
          `Kamera virtual (${primaryTrack.label}) terdeteksi. Gunakan kamera fisik perangkat asli agar foto dapat diverifikasi.`
        );
        return;
      }

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

  useEffect(() => {
    if (!cameraActive || isNewCapture) {
      setLiveFaceCount(null);
      return;
    }

    const Detector = (window as unknown as { FaceDetector?: new (opts?: unknown) => { detect: (img: HTMLVideoElement) => Promise<Array<unknown>> } }).FaceDetector;
    if (!Detector) return;

    let cancelled = false;
    const detector = new Detector({ fastMode: true, maxDetectedFaces: 3 });

    const intervalId = window.setInterval(async () => {
      if (cancelled || !videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const faces = await detector.detect(videoRef.current);
        if (!cancelled) {
          setLiveFaceCount(faces.length);
        }
      } catch {
        // Browser FaceDetector unsupported or frame not ready
      }
    }, 750);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [cameraActive, isNewCapture]);

  const verifyPhotoWithServer = useCallback(async (photoDataUrl: string) => {
    const token = getPortalToken();
    if (!token) {
      setAiVerification({
        status: 'error',
        message: 'Sesi login peserta tidak ditemukan. Silakan masuk ulang.'
      });
      return;
    }

    setAiVerification({
      status: 'checking',
      message: 'Menganalisis keaslian wajah manusia melalui AI Vision...'
    });

    try {
      const response = await axios.post(
        '/api/portal/verify-face',
        { photoDataUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data?.verified) {
        setAiVerification({
          status: 'verified',
          message: response.data?.verification?.reason || 'Terverifikasi manusia asli dengan foto setengah badan (1 wajah jelas).',
          token: response.data?.verificationToken,
          faceCount: response.data?.verification?.faceCount ?? 1
        });
      } else {
        setAiVerification({
          status: 'rejected',
          message: response.data?.error || 'Foto ditolak: manusia asli dengan komposisi setengah badan tidak terdeteksi.',
          faceCount: response.data?.verification?.faceCount
        });
      }
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const errMsg = axios.isAxiosError(err)
        ? err.response?.data?.error || 'Verifikasi wajah gagal diproses.'
        : 'Verifikasi wajah gagal diproses.';
      setAiVerification({
        status: status === 422 || status === 400 ? 'rejected' : 'error',
        message: errMsg
      });
    }
  }, []);

  const handleCapturePhoto = () => {
    setCameraError('');
    if (!videoRef.current || videoRef.current.videoWidth === 0) {
      setCameraError('Stream kamera belum siap. Tunggu sesaat lalu coba lagi.');
      return;
    }

    const canvas = canvasRef.current || document.createElement('canvas');
    const rawW = videoRef.current.videoWidth || 1280;
    const rawH = videoRef.current.videoHeight || 960;
    const scale = Math.min(1, MAX_CAPTURE_SIDE / Math.max(rawW, rawH));
    const vw = Math.round(rawW * scale);
    const vh = Math.round(rawH * scale);

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

    const qualityCheck = assessCanvasFrameQuality(ctx, vw, vh);
    if (!qualityCheck.ok) {
      setCameraError(qualityCheck.reason || 'Kualitas gambar kamera tidak memenuhi syarat.');
      return;
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPreviewPhoto(dataUrl);
    setIsNewCapture(true);
    stopCamera();
    void verifyPhotoWithServer(dataUrl);
  };

  const handleRetake = () => {
    setIsNewCapture(false);
    setAiVerification({ status: 'idle', message: '' });
    void startCamera();
  };

  const handleSaveAndContinue = async () => {
    const activePhoto = previewPhoto;
    if (!activePhoto) {
      setCameraError('Ambil foto identitas setengah badan terlebih dahulu.');
      return;
    }
    if (isNewCapture && aiVerification.status !== 'verified') {
      setCameraError(
        aiVerification.status === 'checking'
          ? 'Tunggu hingga proses verifikasi AI wajah manusia selesai.'
          : aiVerification.message || 'Foto belum lulus verifikasi manusia asli & setengah badan. Ambil ulang foto terlebih dahulu.'
      );
      return;
    }

    setSaving(true);
    setCameraError('');
    try {
      const token = getPortalToken();
      let latestUser = getPortalUser();

      if (token) {
        const response = await axios.post(
          '/api/portal/device-check',
          {
            photoDataUrl: activePhoto,
            verificationToken: aiVerification.token
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data?.user) {
          latestUser = response.data.user;
          savePortalSession({ token, user: response.data.user });
        }
      }

      // Persist preview in localStorage only after server AI verification succeeds
      localStorage.setItem('candidate_face_photo', activePhoto);
      window.dispatchEvent(new Event('portal-event-updated'));

      if (!hasCompleteBiodata(latestUser)) {
        navigate('/peserta/profile', { replace: true });
      } else if (!latestUser?.deviceCheckCompletedAt) {
        navigate('/peserta/device-check', { replace: true });
      } else {
        navigate('/peserta/profile', { replace: true });
      }
    } catch (err) {
      const errMsg = axios.isAxiosError(err)
        ? err.response?.data?.error || 'Gagal menyimpan foto identitas ke server.'
        : 'Gagal menyimpan foto identitas.';
      setCameraError(errMsg);
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        setAiVerification({ status: 'rejected', message: errMsg });
      }
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

              {/* Status pill top-left + live browser pre-check badge */}
              <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[11px] font-semibold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isNewCapture
                        ? aiVerification.status === 'verified'
                          ? 'bg-emerald-400'
                          : aiVerification.status === 'rejected' || aiVerification.status === 'error'
                            ? 'bg-rose-400'
                            : 'bg-sky-400 animate-pulse'
                        : cameraActive
                          ? 'bg-sky-400 animate-pulse'
                          : 'bg-amber-400'
                    }`}
                  />
                  {isNewCapture
                    ? aiVerification.status === 'verified'
                      ? 'Terverifikasi Manusia Asli'
                      : aiVerification.status === 'checking'
                        ? 'Memeriksa Keaslian Wajah (AI)...'
                        : aiVerification.status === 'rejected' || aiVerification.status === 'error'
                          ? 'Verifikasi Wajah Ditolak — Foto Ulang'
                          : 'Hasil Foto Baru'
                    : cameraActive
                      ? 'Kamera Live Aktif — Sejajarkan Kepala & Bahu'
                      : 'Pratinjau Foto Tersimpan'}
                </span>

                {cameraActive && !isNewCapture && liveFaceCount !== null && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md text-[11px] font-bold border ${
                      liveFaceCount === 1
                        ? 'bg-emerald-500/85 text-white border-emerald-300/60'
                        : 'bg-amber-500/85 text-white border-amber-300/60'
                    }`}
                  >
                    <ScanFace className="w-3.5 h-3.5" />
                    {liveFaceCount === 1
                      ? '1 Wajah Terdeteksi'
                      : liveFaceCount === 0
                        ? 'Wajah Belum Terlihat'
                        : `${liveFaceCount} Wajah Terdeteksi`}
                  </span>
                )}
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

            {/* AI Vision Human Verification Status Banner */}
            {isNewCapture && aiVerification.status !== 'idle' && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2.5 ${
                  aiVerification.status === 'checking'
                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                    : aiVerification.status === 'verified'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {aiVerification.status === 'checking' ? (
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0 mt-0.5" />
                  ) : aiVerification.status === 'verified' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <p className="font-bold">
                      {aiVerification.status === 'checking'
                        ? 'Pemeriksaan AI Human Verification'
                        : aiVerification.status === 'verified'
                          ? 'Lolos Verifikasi Manusia Asli & Foto Setengah Badan'
                          : 'Foto Belum Memenuhi Syarat (Manusia Asli & Setengah Badan)'}
                    </p>
                    <p className="opacity-90 leading-relaxed">{aiVerification.message}</p>
                  </div>
                </div>

                {aiVerification.status === 'error' && previewPhoto && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void verifyPhotoWithServer(previewPhoto)}
                    className="h-8 px-3 text-xs font-semibold border-rose-300 text-rose-800 hover:bg-rose-100 shrink-0 cursor-pointer"
                  >
                    Coba Verifikasi Lagi
                  </Button>
                )}
              </div>
            )}

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

              {previewPhoto &&
                (!cameraActive || isNewCapture) &&
                ((!isNewCapture && Boolean(portalUser?.faceVerifiedAt)) ||
                  (aiVerification.status === 'verified' && Boolean(aiVerification.token))) && (
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
