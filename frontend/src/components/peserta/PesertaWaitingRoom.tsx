import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function PesertaWaitingRoom() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(180); // 3 minutes
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'tips' | 'rubrik' | 'perangkat'>('tips');

  const activeUser = getActiveSessionUser();
  const activeProgram = getProgramById(activeUser.assessmentId || 'BMRI-DATA-02') || getProgramById('SE-402')!;
  const savedPhoto = typeof window !== 'undefined' ? localStorage.getItem('candidate_face_photo') : null;

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
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-7 antialiased">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
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
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-100 pb-6">
            <div className="flex flex-col items-center md:items-start">
              <span className="text-xs sm:text-sm text-muted-slate font-medium mb-1">
                Estimasi Waktu Menuju Giliran Anda:
              </span>
              <div className="flex items-center gap-3">
                <div className="font-mono text-3xl sm:text-4xl font-extrabold text-primary-navy bg-soft-blue px-6 py-2 rounded-2xl border border-accent-border shadow-2xs">
                  {formatTime(countdown)}
                </div>
                {countdown > 0 && (
                  <button
                    onClick={() => { setCountdown(0); setIsReady(true); }}
                    className="text-[11px] text-blue-accent hover:underline font-semibold cursor-pointer"
                  >
                    Lewati Tunggu (Uji Coba)
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600">
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <Users className="w-4 h-4 text-blue-accent" />
                <span>Posisi Antrean: <strong className="text-ink">#1 Peserta Berikutnya</strong></span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Lead Assessor: <strong className="text-ink">Dr. Ir. Dwi Hartanto / Ava AI</strong></span>
              </div>
            </div>
          </div>

          {/* Video Preview & Pre-flight Diagnostics */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Video Box (5 cols) */}
            <div className="md:col-span-5 bg-slate-900 rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center border border-slate-800 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${mediaActive ? 'block' : 'hidden'}`}
              />
              {!mediaActive && (
                savedPhoto ? (
                  <img
                    src={savedPhoto}
                    alt="Foto Profil Terverifikasi"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4 space-y-2">
                    <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-300 font-heading font-extrabold text-xl mx-auto">
                      {activeUser.name.charAt(0)}
                    </div>
                    <p className="text-xs text-slate-400">Pratinjau Kamera Aktif Saat Memasuki Sesi</p>
                  </div>
                )
              )}

              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg text-[11px] text-emerald-400 font-mono flex items-center gap-2 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Kamera &amp; Mic Terhubung</span>
              </div>

              <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-xs px-3 py-1.5 rounded-lg text-[11px] text-slate-300 flex items-center justify-between">
                <span>{activeUser.name}</span>
                <span className="font-mono text-emerald-400">Audio 100% OK</span>
              </div>
            </div>

            {/* Preparation Tips & Checklist Tabs (7 cols) */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-4">
              {/* Tab Selector */}
              <div className="flex border-b border-slate-200 text-xs">
                <button
                  onClick={() => setActiveTab('tips')}
                  className={`pb-2.5 px-3 font-semibold transition-colors cursor-pointer ${
                    activeTab === 'tips'
                      ? 'text-primary-navy border-b-2 border-primary-navy'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Tips Wawancara AI
                </button>
                <button
                  onClick={() => setActiveTab('rubrik')}
                  className={`pb-2.5 px-3 font-semibold transition-colors cursor-pointer ${
                    activeTab === 'rubrik'
                      ? 'text-primary-navy border-b-2 border-primary-navy'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Kriteria Penilaian BARS
                </button>
                <button
                  onClick={() => setActiveTab('perangkat')}
                  className={`pb-2.5 px-3 font-semibold transition-colors cursor-pointer ${
                    activeTab === 'perangkat'
                      ? 'text-primary-navy border-b-2 border-primary-navy'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Ceklist Kesiapan
                </button>
              </div>

              {/* Tab Content */}
              <div className="text-xs text-slate-600 space-y-2.5 flex-1">
                {activeTab === 'tips' && (
                  <div className="space-y-2 bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
                    <p className="font-bold text-ink">3 Tips Utama Menjawab Pertanyaan:</p>
                    <ul className="space-y-1.5 text-muted-slate list-disc pl-4 leading-relaxed">
                      <li><strong>Gunakan Metode STAR:</strong> Jelaskan <em>Situation</em>, <em>Task</em>, <em>Action</em> yang Anda ambil, dan <em>Result</em> yang terukur.</li>
                      <li><strong>Artikulasi Jelas:</strong> Bicara dengan tenang menghadap mikrofon. Ava AI akan menyimak ucapan Anda secara real-time.</li>
                      <li><strong>Validasi Jawaban CAT:</strong> Asesor dapat menanyakan kembali alasan mengapa Anda memilih solusi tertentu pada soal teknis tadi.</li>
                    </ul>
                  </div>
                )}

                {activeTab === 'rubrik' && (
                  <div className="space-y-2 bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
                    <p className="font-bold text-ink">Dimensi Evaluasi BARS (1 - 5):</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-primary-navy block">Kompetensi Teknis (35%)</span>
                        <span className="text-muted-slate">Kedalaman arsitektur &amp; penalaran sistem.</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-primary-navy block">Problem Solving (25%)</span>
                        <span className="text-muted-slate">Struktur solusi pada studi kasus industri.</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-primary-navy block">Artikulasi &amp; Komunikasi (20%)</span>
                        <span className="text-muted-slate">Kejelasan penyampaian argumen.</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-primary-navy block">Etika &amp; Integritas (20%)</span>
                        <span className="text-muted-slate">Kejujuran dan kepatuhan standar profesional.</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'perangkat' && (
                  <div className="space-y-2 bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
                    <p className="font-bold text-ink">Ceklist Sebelum Masuk Sesi:</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-800">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kamera menghadap wajah dengan pencahayaan terang</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-800">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mikrofon tidak berdengung dan tidak berada di ruangan bising</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-800">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Koneksi internet minimal 5 Mbps stabil</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => navigate('/peserta/interview')}
                  className="w-full py-3.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs rounded-xl cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>{isReady || countdown === 0 ? 'Giliran Anda Tiba • Masuk Sesi Wawancara' : 'Masuk ke Ruang Sesi Sekarang'}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/peserta/device-check')}
                  className="w-full sm:w-auto py-3.5 px-4 text-xs font-semibold rounded-xl text-slate-700 cursor-pointer"
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
