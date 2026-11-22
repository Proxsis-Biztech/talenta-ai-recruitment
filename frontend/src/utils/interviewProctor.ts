export interface InterviewProctorEvent {
  type:
    | 'face_verified'
    | 'PERIODIC_SNAPSHOT'
    | 'FACE_MISSING'
    | 'MULTI_FACE'
    | 'IDENTITY_MISMATCH'
    | 'GAZE_OFF_SCREEN'
    | 'SECOND_VOICE_DETECTED'
    | 'BEHAVIORAL_RAPID_RESPONSE'
    | 'BEHAVIORAL_UNIFORM_CADENCE'
    | 'TAB_SWITCH';
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
  detail: string;
  snapshot?: string;
  hasVisualEvidence?: boolean;
}

export interface FaceSignature {
  vector: number[];
  avgLuma: number;
}

export function captureVideoSnapshot(
  video: HTMLVideoElement | null,
  width = 320,
  height = 240,
  quality = 0.52
): string | null {
  if (!video || video.readyState < 2 || video.videoWidth === 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Computes a normalized 16x16 grayscale perceptual vector from a face crop
 * (or centered frame fallback) for continuous lightweight identity checks.
 */
export function computeFaceSignatureFromSource(
  source: HTMLVideoElement | HTMLImageElement,
  box?: { x: number; y: number; width: number; height: number }
): FaceSignature | null {
  const srcWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const srcHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!srcWidth || !srcHeight) return null;

  const cropX = box ? Math.max(0, box.x) : srcWidth * 0.25;
  const cropY = box ? Math.max(0, box.y) : srcHeight * 0.2;
  const cropW = box ? Math.max(16, Math.min(srcWidth - cropX, box.width)) : srcWidth * 0.5;
  const cropH = box ? Math.max(16, Math.min(srcHeight - cropY, box.height)) : srcHeight * 0.6;

  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const luma: number[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    luma.push(g);
    sum += g;
  }

  const mean = sum / luma.length;
  let normSq = 0;
  const centered = luma.map((v) => {
    const d = v - mean;
    normSq += d * d;
    return d;
  });
  const norm = Math.sqrt(normSq) || 1;

  return {
    vector: centered.map((d) => d / norm),
    avgLuma: mean
  };
}

export async function computeFaceSignatureFromDataUrl(
  dataUrl: string
): Promise<FaceSignature | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        resolve(computeFaceSignatureFromSource(img));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 1;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export interface BehavioralTurnMetrics {
  answerText: string;
  questionActivatedAt: number;
  firstResponseAt: number | null;
  submittedAt: number;
  chunkTimestamps: number[];
  wasTypedInput: boolean;
}

/**
 * Evaluates answer timing and pacing anomalies during an interview turn.
 * All outputs are neutral behavioral signals for human assessor review (never auto-fail).
 */
export function evaluateTurnBehavior(
  metrics: BehavioralTurnMetrics
): Omit<InterviewProctorEvent, 'timestamp'>[] {
  const signals: Omit<InterviewProctorEvent, 'timestamp'>[] = [];
  const words = metrics.answerText.trim().split(/\s+/).filter(Boolean).length;
  if (words < 20) return signals;

  const startRef = metrics.firstResponseAt ?? metrics.submittedAt;
  const latencyMs = Math.max(0, startRef - metrics.questionActivatedAt);
  const totalMs = Math.max(0, metrics.submittedAt - metrics.questionActivatedAt);

  if (
    words >= 40 &&
    ((latencyMs > 0 && latencyMs < 1000) ||
      (metrics.wasTypedInput && totalMs < 5000) ||
      totalMs < 4000)
  ) {
    signals.push({
      type: 'BEHAVIORAL_RAPID_RESPONSE',
      severity: 'medium',
      detail: `Sinyal perilaku: jawaban kompleks (${words} kata) muncul cepat (latensi ${(latencyMs / 1000).toFixed(1)} dtk, total ${(totalMs / 1000).toFixed(1)} dtk) — untuk ditinjau asesor.`,
      hasVisualEvidence: false
    });
  }

  if (metrics.chunkTimestamps.length >= 6 && words >= 35) {
    const gaps: number[] = [];
    for (let i = 1; i < metrics.chunkTimestamps.length; i++) {
      const gap = metrics.chunkTimestamps[i] - metrics.chunkTimestamps[i - 1];
      if (gap >= 250 && gap <= 8000) gaps.push(gap);
    }
    if (gaps.length >= 5) {
      const mean = gaps.reduce((s, v) => s + v, 0) / gaps.length;
      const variance = gaps.reduce((s, v) => s + (v - mean) ** 2, 0) / gaps.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
      if (cv < 0.14) {
        signals.push({
          type: 'BEHAVIORAL_UNIFORM_CADENCE',
          severity: 'low',
          detail: `Sinyal perilaku: ritme jeda bicara sangat seragam (CV=${cv.toFixed(2)}, pola membaca teks) — untuk ditinjau asesor.`,
          hasVisualEvidence: false
        });
      }
    }
  }

  return signals;
}
