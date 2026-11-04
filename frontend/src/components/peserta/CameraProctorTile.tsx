import React, { useEffect, useRef, useState } from 'react';
import { CameraOff, ShieldCheck } from 'lucide-react';

type ProctorStatus = 'loading' | 'ok' | 'warning' | 'error' | 'inactive';

export function CameraProctorTile({
  active = true,
  compact = false,
  floating = false,
  className = ''
}: {
  active?: boolean;
  compact?: boolean;
  floating?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<ProctorStatus>(active ? 'loading' : 'inactive');
  const [message, setMessage] = useState(active ? 'Menyiapkan kamera...' : 'Kamera belum aktif');

  useEffect(() => {
    if (!active) {
      setStatus('inactive');
      setMessage('Kamera belum aktif');
      return;
    }

    let cancelled = false;
    let detector: any = null;
    let detectTimer: number | undefined;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus('warning');
        setMessage('Posisikan wajah di tengah');

        const Detector = (window as any).FaceDetector;
        if (Detector && videoRef.current) {
          detector = new Detector({ fastMode: true, maxDetectedFaces: 3 });
          detectTimer = window.setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const faces = await detector.detect(videoRef.current);
              if (faces.length === 1) {
                setStatus('ok');
                setMessage('1 wajah terverifikasi');
              } else if (faces.length === 0) {
                setStatus('warning');
                setMessage('Wajah tidak terdeteksi');
              } else {
                setStatus('error');
                setMessage(`${faces.length} wajah terdeteksi`);
              }
            } catch {
              setStatus('warning');
              setMessage('Status wajah tidak tersedia');
            }
          }, 2000);
        } else {
          setStatus('ok');
          setMessage('Kamera aktif');
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
          setMessage('Izin kamera ditolak');
        }
      }
    };

    void start();
    return () => {
      cancelled = true;
      if (detectTimer) window.clearInterval(detectTimer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [active]);

  const border =
    status === 'ok' ? 'border-emerald-400' :
    status === 'warning' ? 'border-amber-400' :
    status === 'error' ? 'border-rose-500' : 'border-slate-300';

  const dot =
    status === 'ok' ? 'bg-emerald-500' :
    status === 'warning' ? 'bg-amber-500' :
    status === 'error' ? 'bg-rose-500' : 'bg-slate-400';

  const size = compact ? 'w-32 h-24' : 'w-40 h-28';

  return (
    <div
      className={`${floating ? 'fixed left-4 top-24 z-40' : 'relative'} ${size} rounded-xl overflow-hidden border-2 ${border} bg-slate-900 shadow-lg ${className}`}
    >
      {active ? (
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-300">
          <CameraOff className="w-5 h-5" />
          <span className="text-[10px] font-medium text-center px-1">Kamera belum aktif</span>
        </div>
      )}
      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white">
        <span className={`w-1.5 h-1.5 rounded-full ${dot} ${active ? 'animate-pulse' : ''}`} />
        Proctoring
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-black/65 px-2 py-1 text-[9px] font-medium text-white flex items-center gap-1">
        <ShieldCheck className="w-3 h-3 text-emerald-300 shrink-0" />
        <span className="truncate">{message}</span>
      </div>
    </div>
  );
}
