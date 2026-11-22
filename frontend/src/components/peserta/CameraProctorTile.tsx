import React, { useEffect, useRef, useState } from 'react';
import { CameraOff, ShieldCheck } from 'lucide-react';

export type ProctorStatus = 'loading' | 'ok' | 'warning' | 'error' | 'inactive';

export function CameraProctorTile({
  active = true,
  compact = false,
  floating = false,
  captureAudio = false,
  className = '',
  captureRef,
  onStreamReady,
  onFaceAnomaly,
  onStatusChange
}: {
  active?: boolean;
  compact?: boolean;
  floating?: boolean;
  captureAudio?: boolean;
  className?: string;
  captureRef?: React.MutableRefObject<(() => string | null) | null>;
  onStreamReady?: (stream: MediaStream) => void;
  onFaceAnomaly?: (kind: 'FACE_MISSING' | 'MULTI_FACE', snapshot: string | null) => void;
  onStatusChange?: (status: ProctorStatus) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onFaceAnomalyRef = useRef(onFaceAnomaly);
  const onStreamReadyRef = useRef(onStreamReady);
  onFaceAnomalyRef.current = onFaceAnomaly;
  onStreamReadyRef.current = onStreamReady;

  const [status, setStatus] = useState<ProctorStatus>(active ? 'loading' : 'inactive');
  const [message, setMessage] = useState(active ? 'Menyiapkan kamera...' : 'Kamera belum aktif');

  const captureFrame = (): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return null;
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    const canvas = canvasRef.current;
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.55);
  };

  useEffect(() => {
    if (captureRef) {
      captureRef.current = captureFrame;
      return () => {
        captureRef.current = null;
      };
    }
  }, [captureRef]);

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  useEffect(() => {
    if (!active) {
      setStatus('inactive');
      setMessage('Kamera belum aktif');
      return;
    }

    let cancelled = false;
    let detector: any = null;
    let detectTimer: number | undefined;
    let missingStreak = 0;
    let multiStreak = 0;

    const start = async () => {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: captureAudio
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false
          });
        }
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        onStreamReadyRef.current?.(stream);
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
                missingStreak = 0;
                multiStreak = 0;
                setStatus('ok');
                setMessage('1 wajah terverifikasi');
              } else if (faces.length === 0) {
                multiStreak = 0;
                missingStreak++;
                setStatus('warning');
                setMessage('Wajah tidak terdeteksi');
                if (missingStreak >= 3) {
                  missingStreak = 0;
                  onFaceAnomalyRef.current?.('FACE_MISSING', captureFrame());
                }
              } else {
                missingStreak = 0;
                multiStreak++;
                setStatus('error');
                setMessage(`${faces.length} wajah terdeteksi`);
                if (multiStreak >= 2) {
                  multiStreak = 0;
                  onFaceAnomalyRef.current?.('MULTI_FACE', captureFrame());
                }
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
  }, [active, captureAudio]);

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
