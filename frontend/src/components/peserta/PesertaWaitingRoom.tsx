import React, { useState, useEffect } from 'react';
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
  Info
} from 'lucide-react';
import { PesertaLayout } from './PesertaLayout';
import { Button, Badge } from '../ui';

export default function PesertaWaitingRoom() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(245); // ~4 minutes
  const [isReady, setIsReady] = useState(false);

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
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-7 antialiased">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="font-mono text-xs font-bold text-primary-navy bg-soft-blue px-3.5 py-1.5 rounded-full border border-accent-border uppercase tracking-wider">
            RUANG TUNGGU WAWANCARA
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-ink tracking-tight mt-3">
            Sesi Live Interview Asesor
          </h1>
          <p className="text-xs sm:text-sm text-muted-slate leading-relaxed">
            Asesor sedang menyelesaikan sesi kandidat sebelumnya. Harap tetap berada di halaman ini. Sesi Anda akan otomatis dimulai saat giliran Anda tiba.
          </p>
        </div>

        {/* Queue & Countdown Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 shadow-xs text-center space-y-6">
          <div className="inline-flex flex-col items-center">
            <span className="text-xs sm:text-sm text-muted-slate font-medium mb-1.5">
              Estimasi Waktu Menuju Giliran Anda:
            </span>
            <div className="font-mono text-4xl sm:text-5xl font-extrabold text-primary-navy bg-soft-blue px-8 py-3 rounded-2xl border border-accent-border shadow-xs">
              {formatTime(countdown)}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-600 pt-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-accent" />
              <span>Posisi Antrean: <strong className="text-ink">#2 dari 4 peserta</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Room Asesor: <strong className="text-ink">Dr. Ir. Dwi Hartanto</strong></span>
            </div>
          </div>

          {/* Camera Pre-flight check preview */}
          <div className="max-w-md mx-auto bg-slate-900 rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center border border-slate-800 shadow-inner">
            <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-300 font-heading font-extrabold text-xl">
              FP
            </div>
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-xs text-emerald-400 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Kamera & Mic Terhubung</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              onClick={() => navigate('/peserta/interview')}
              className="w-full sm:w-auto px-8 py-3.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm rounded-xl cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>Masuk Ruang Sesi Sekarang</span>
            </Button>
          </div>
        </div>
      </div>
    </PesertaLayout>
  );
}
