import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Clock,
  Video,
  Camera,
  Mic,
  ShieldCheck,
  AlertCircle,
  PlayCircle,
  Volume2,
  Users,
  CheckCircle2,
  ArrowLeft,
  Info,
  Sparkles,
  Award,
  BookOpen,
  HelpCircle,
  Check
} from 'lucide-react';
import { PesertaLayout } from './PesertaLayout';
import { Button, Badge } from '../ui';
import { getActiveSessionUser } from '../../services/userRegistryService';
import { getProgramById } from '../../services/assessmentCatalog';
import { getPortalToken, getPortalUser, savePortalSession } from '../../services/portalAuthService';
import { CameraProctorTile } from './CameraProctorTile';

export default function PesertaWaitingRoom() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(0);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [assessorName, setAssessorName] = useState('Tim Asesor Right');
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'tips' | 'rubrik' | 'perangkat'>('tips');
  const [catEligible, setCatEligible] = useState(false);
  const [catChecked, setCatChecked] = useState(false);
  const [queueState, setQueueState] = useState<any>(null);
  const [toastDismissed, setToastDismissed] = useState(false);
  const [toastSeconds, setToastSeconds] = useState(0);

  const activeUser = getActiveSessionUser();
  const activeProgram = getProgramById(activeUser.assessmentId || 'BMRI-DATA-02') || getProgramById('SE-402')!;

  useEffect(() => {
    let cancelled = false;
    const checkCatStatus = async () => {
      const token = getPortalToken();
      if (!token) {
        setCatChecked(true);
        return;
      }
      try {
        const response = await axios.get(`/api/exam/${activeProgram.id}/result`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!cancelled) setCatEligible(['submitted', 'graded'].includes(response.data.status));
        try {
          const dashboardResponse = await axios.get('/api/portal/dashboard', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!cancelled) {
            const interview = dashboardResponse.data?.interview;
            setScheduledAt(interview?.scheduledAt || null);
            setQueuePosition(interview?.queuePosition || null);
            setAssessorName(interview?.assessorName || 'Tim Asesor Right');
          }
        } catch {
          if (!cancelled) setScheduledAt(null);
        }
      } catch {
        if (!cancelled) setCatEligible(false);
      } finally {
        if (!cancelled) setCatChecked(true);
      }
    };
    void checkCatStatus();
    return () => {
      cancelled = true;
    };
  }, [activeProgram.id]);

  useEffect(() => {
    if (!scheduledAt) {
      setCountdown(0);
      setIsReady(false);
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(scheduledAt).getTime() - Date.now()) / 1000));
      setCountdown(diff);
      setIsReady(diff === 0);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [scheduledAt]);

  useEffect(() => {
    let cancelled = false;
    const token = getPortalToken();
    if (!token) return;
    const loadQueue = async () => {
      try {
        const response = await axios.get('/api/portal/waiting-room', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!cancelled) {
          setQueueState(response.data);
          if (response.data?.status !== 'called') {
            localStorage.removeItem('peserta_interview_called');
            window.dispatchEvent(new Event('interview-called'));
          }
        }
      } catch {
        if (!cancelled) setQueueState(null);
      }
    };
    void loadQueue();
    const timer = setInterval(loadQueue, 10000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (queueState?.status !== 'called') return;
    setToastDismissed(false);
    document.title = 'Giliran Anda!';
    const user = getPortalUser();
    const token = getPortalToken();
    localStorage.setItem('peserta_interview_called', 'true');
    if (user && token && user.interviewStatus !== 'called') {
      savePortalSession({ token, user: { ...user, interviewStatus: 'called' } });
    }
    window.dispatchEvent(new Event('interview-called'));
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
    return () => {
      document.title = 'Ruang Tunggu Wawancara | Right';
    };
  }, [queueState?.status]);

  useEffect(() => {
    if (queueState?.status !== 'called' || !queueState?.deadline) return;
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(queueState.deadline).getTime() - Date.now()) / 1000));
      setToastSeconds(diff);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [queueState?.status, queueState?.deadline]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaActive, setMediaActive] = useState(false);

  useEffect(() => {
    // Attempt local webcam preview for candidate comfort
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 640, height: 360 }, audio: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setMediaActive(true);
          }
        })
        .catch(() => {
          setMediaActive(false);
        });
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsReady(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <PesertaLayout activeTab="waiting-room">
      {queueState?.status === 'called' && !toastDismissed && (
        <div role="alert" aria-live="assertive" className="fixed right-4 top-20 z-50 w-[min(360px,calc(100vw-2rem))] rounded-xl bg-emerald-600 text-white shadow-xl p-4 space-y-3">
          <p className="font-bold text-sm">Giliran Anda tiba</p>
          <p className="text-xs text-emerald-50">Sesi peserta sebelumnya sudah selesai. Asesor siap. Masuk dalam {formatTime(toastSeconds)}.</p>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/peserta/interview')} className="flex-1 rounded-lg bg-white text-emerald-700 text-xs font-bold py-2 px-3">Masuk Sekarang</button>
            <button onClick={() => setToastDismissed(true)} className="rounded-lg border border-white/40 text-white text-xs font-semibold py-2 px-3">Nanti</button>
          </div>
        </div>
      )}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-10 antialiased">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-primary-navy bg-soft-blue px-3.5 py-1.5 rounded-full border border-accent-border uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-accent" />
            <span>RUANG TUNGGU WAWANCARA RESMI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-ink tracking-tight mt-2">
            Sesi Live Interview Asesor
          </h1>
          <p className="text-xs sm:text-sm text-muted-slate leading-relaxed">
            Asesor sedang mempersiapkan docket penilaian Anda untuk program{' '}
            <strong className="text-ink">{activeProgram.title}</strong> di{' '}
            <strong className="text-primary-navy">{activeProgram.companyName}</strong>. Harap tetap berada di halaman ini.
          </p>
        </div>

        {/* Queue & Countdown Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-8 lg:p-10 shadow-xs space-y-8 relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -top-24 right-10 w-64 h-64 rounded-full bg-blue-accent/10 blur-3xl" />
          
          {/* Top row: Countdown + Queue status */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 border-b border-slate-100 pb-6 relative">
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
              <span className="text-xs sm:text-sm text-muted-slate font-medium mb-1.5">
                Nomor Antrean Anda:
              </span>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <div className="font-mono text-3xl sm:text-4xl font-extrabold text-primary-navy bg-soft-blue px-6 py-2.5 rounded-2xl border border-accent-border shadow-2xs tabular-nums ring-1 ring-white/60">
                  {queueState?.status === 'called'
                    ? 'GILIRAN'
                    : queueState?.position
                      ? `#${queueState.position}`
                      : '--'}
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-slate">
                    Estimasi Waktu Tunggu
                  </p>
                  <p className="text-sm font-bold text-primary-navy">
                    {queueState?.status === 'called'
                      ? `Masuk dalam ${formatTime(toastSeconds)}`
                      : typeof queueState?.estimatedWaitMinutes === 'number'
                        ? `± ${queueState.estimatedWaitMinutes} menit`
                        : scheduledAt
                          ? formatTime(countdown)
                          : 'Belum dijadwalkan'}
                  </p>
                  {queueState?.queueLength ? (
                    <p className="text-[11px] text-muted-slate">
                      Posisi {queueState.position} dari {queueState.queueLength} peserta
                    </p>
                  ) : null}
                </div>
              </div>
              {countdown > 0 && (
                <button
                  onClick={() => { setCountdown(0); setIsReady(true); }}
                  className="text-xs text-blue-accent hover:underline font-semibold cursor-pointer py-1 px-2"
                >
                  Lewati Tunggu (Uji Coba)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto text-xs sm:text-sm text-slate-600">
              <div className="flex items-center gap-3 p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200/80 transition-colors hover:border-accent-border hover:bg-white">
                <Users className="w-4 h-4 text-blue-accent shrink-0" />
                <span className="truncate">Nomor Antrean: <strong className="text-ink">{queueState?.status === 'called' ? 'Giliran Anda' : queueState?.position ? `#${queueState.position}` : queuePosition ? `#${queuePosition}` : '-'}</strong></span>
              </div>
              <div className="flex items-center gap-3 p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200/80 transition-colors hover:border-accent-border hover:bg-white">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">Estimasi Tunggu: <strong className="text-ink">{queueState?.status === 'called' ? 'Sekarang' : typeof queueState?.estimatedWaitMinutes === 'number' ? `± ${queueState.estimatedWaitMinutes} menit` : '-'}</strong></span>
              </div>
              <div className="flex items-center gap-3 p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200/80 transition-colors hover:border-accent-border hover:bg-white">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Lead Assessor: <strong className="text-ink">{assessorName}</strong></span>
              </div>
            </div>
          </div>

          {/* Video Preview & Pre-flight Diagnostics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Video Box (5 cols on desktop, full width on mobile/tablet) */}
            <div className="lg:col-span-5 w-full min-w-0">
              <div className="w-full bg-slate-900 rounded-3xl overflow-hidden aspect-video relative flex items-center justify-center border border-slate-800 shadow-tinted-lg ring-1 ring-slate-900/10">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${mediaActive ? 'block' : 'hidden'}`}
                />
                {!mediaActive && <CameraProctorTile compact active={false} />}

                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg text-[11px] text-emerald-400 font-mono flex items-center gap-2 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Kamera &amp; Mic Terhubung</span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-xs px-3 py-1.5 rounded-lg text-[11px] text-slate-300 flex items-center justify-between">
                  <span className="truncate mr-2">{activeUser.name}</span>
                  <span className="font-mono text-emerald-400 shrink-0">Audio 100% OK</span>
                </div>
              </div>
            </div>

            {/* Preparation Tips & Checklist Tabs (7 cols on desktop, full width on mobile/tablet) */}
            <div className="lg:col-span-7 w-full min-w-0 flex flex-col justify-between space-y-4">
              {/* Tab Selector */}
              <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 text-xs">
                <button
                  onClick={() => setActiveTab('tips')}
                  className={`py-2 px-2 sm:px-3 text-center rounded-xl font-semibold transition-all duration-200 cursor-pointer truncate ${
                    activeTab === 'tips'
                      ? 'bg-white text-primary-navy shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Tips Wawancara AI"
                >
                  Tips Wawancara
                </button>
                <button
                  onClick={() => setActiveTab('rubrik')}
                  className={`py-2 px-2 sm:px-3 text-center rounded-xl font-semibold transition-all duration-200 cursor-pointer truncate ${
                    activeTab === 'rubrik'
                      ? 'bg-white text-primary-navy shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Kriteria Penilaian BARS"
                >
                  Kriteria BARS
                </button>
                <button
                  onClick={() => setActiveTab('perangkat')}
                  className={`py-2 px-2 sm:px-3 text-center rounded-xl font-semibold transition-all duration-200 cursor-pointer truncate ${
                    activeTab === 'perangkat'
                      ? 'bg-white text-primary-navy shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Ceklist Kesiapan"
                >
                  Cek Kesiapan
                </button>
              </div>

              {/* Tab Content */}
              <div className="text-xs text-slate-600 space-y-2.5 flex-1 min-w-0">
                {activeTab === 'tips' && (
                  <div className="space-y-2.5 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/70">
                    <p className="font-bold text-ink">3 Tips Utama Menjawab Pertanyaan:</p>
                    <ul className="space-y-1.5 text-muted-slate list-disc pl-4 leading-relaxed">
                      <li><strong>Gunakan Metode STAR:</strong> Jelaskan <em>Situation</em>, <em>Task</em>, <em>Action</em> yang Anda ambil, dan <em>Result</em> yang terukur.</li>
                      <li><strong>Artikulasi Jelas:</strong> Bicara dengan tenang menghadap mikrofon. Ava AI akan menyimak ucapan Anda secara real-time.</li>
                      <li><strong>Validasi Jawaban CAT:</strong> Asesor dapat menanyakan kembali alasan mengapa Anda memilih solusi tertentu pada soal teknis tadi.</li>
                    </ul>
                  </div>
                )}

                {activeTab === 'rubrik' && (
                  <div className="space-y-2.5 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/70">
                    <p className="font-bold text-ink">Dimensi Evaluasi BARS (1 - 5):</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-primary-navy block">Kompetensi Teknis (35%)</span>
                        <span className="text-muted-slate">Kedalaman arsitektur &amp; penalaran sistem.</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-primary-navy block">Problem Solving (25%)</span>
                        <span className="text-muted-slate">Struktur solusi pada studi kasus industri.</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-primary-navy block">Artikulasi &amp; Komunikasi (20%)</span>
                        <span className="text-muted-slate">Kejelasan penyampaian argumen.</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-primary-navy block">Etika &amp; Integritas (20%)</span>
                        <span className="text-muted-slate">Kejujuran dan kepatuhan standar profesional.</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'perangkat' && (
                  <div className="space-y-2.5 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/70">
                    <p className="font-bold text-ink">Ceklist Sebelum Masuk Sesi:</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-emerald-800">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Kamera menghadap wajah dengan pencahayaan terang</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-800">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Mikrofon tidak berdengung dan tidak berada di ruangan bising</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-800">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Koneksi internet minimal 5 Mbps stabil</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-3 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                <div className="w-full space-y-2">
                  {catChecked && !catEligible && (
                    <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Selesaikan dan kumpulkan ujian CAT terlebih dahulu sebelum memasuki sesi wawancara.
                    </p>
                  )}
                  <Button
                    variant="primary"
                    disabled={!catEligible || !scheduledAt || (queueState && !queueState.canEnter)}
                    onClick={() => navigate('/peserta/interview')}
                    className="w-full py-3 sm:py-3.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs rounded-xl cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Video className="w-4 h-4 shrink-0" />
                    <span>{!catEligible ? 'Selesaikan CAT Terlebih Dahulu' : !scheduledAt ? 'Menunggu Jadwal dari Admin' : queueState?.status === 'called' ? 'Giliran Anda Tiba • Masuk Sesi Wawancara' : queueState?.status === 'waiting' || queueState?.status === 'next' ? 'Menunggu Sesi Sebelumnya Selesai' : 'Masuk ke Ruang Sesi Sekarang'}</span>
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate('/peserta/device-check')}
                  className="w-full sm:w-auto py-3 sm:py-3.5 px-4 text-xs font-semibold rounded-xl text-slate-700 cursor-pointer whitespace-nowrap"
                >
                  Uji Kamera/Mic Ulang
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PesertaLayout>
  );
}
