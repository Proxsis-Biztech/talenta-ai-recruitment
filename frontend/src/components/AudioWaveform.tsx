import { useRef, useEffect, useCallback } from 'react';

interface AudioWaveformProps {
  /** Whether audio is currently playing (AI speaking) */
  isPlaying: boolean;
  /** Whether the user is currently recording (mic active) */
  isRecording: boolean;
  /** Height of the waveform display */
  height?: number;
  /** Number of bars to display */
  barCount?: number;
  /** Primary color for the bars */
  color?: string;
  /** Secondary color for inactive bars */
  inactiveColor?: string;
  /** Optional AnalyserNode for analyzing audio */
  analyserNode?: AnalyserNode | null;
}

export default function AudioWaveform({
  isPlaying,
  isRecording,
  height = 80,
  barCount = 32,
  color = '#14b8a6',
  inactiveColor = '#e2e8f0',
  analyserNode = null,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const barsRef = useRef<number[]>(Array.from({ length: barCount }, () => 0));
  const targetBarsRef = useRef<number[]>(Array.from({ length: barCount }, () => 0));
  const lastFrameTime = useRef<number>(0);

  const generateSimulatedBars = useCallback((time: number, isActivelySpeaking: boolean): number[] => {
    const bars: number[] = [];
    for (let i = 0; i < barCount; i++) {
      if (isActivelySpeaking) {
        // Simulate speech-like pattern with varying amplitudes
        const baseFreq = 0.003 + (i / barCount) * 0.005;
        const amplitude = 0.3 + Math.sin(time * baseFreq + i * 0.5) * 0.2;
        const noise = Math.random() * 0.3;
        // Create a speech-like envelope with center emphasis
        const centerWeight = 1 - Math.abs((i - barCount / 2) / (barCount / 2)) * 0.4;
        bars.push(Math.max(0.05, Math.min(1, (amplitude + noise) * centerWeight)));
      } else {
        // Idle state - gentle ambient waves
        const wave = Math.sin(time * 0.001 + i * 0.3) * 0.05 + 0.05;
        bars.push(wave);
      }
    }
    return bars;
  }, [barCount]);

  const drawWaveform = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Set canvas size for high DPI
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    const width = rect.width;
    const canvasHeight = rect.height;

    // Get real audio data if available
    let realData: Uint8Array<ArrayBuffer> | null = null;
    if (analyserNode && (isPlaying || isRecording)) {
      const bufferLength = analyserNode.frequencyBinCount;
      realData = new Uint8Array(new ArrayBuffer(bufferLength));
      analyserNode.getByteFrequencyData(realData);
    }

    // Generate or use real bar heights
    if (analyserNode && realData && (isPlaying || isRecording)) {
      // Map real audio data to bars
      const step = Math.floor(realData.length / barCount);
      for (let i = 0; i < barCount; i++) {
        const index = Math.min(i * step, realData.length - 1);
        targetBarsRef.current[i] = realData[index] / 255;
      }
    } else {
      // Use simulated data
      targetBarsRef.current = generateSimulatedBars(time, isPlaying || isRecording);
    }

    // Smooth interpolation towards target
    const smoothing = 0.15;
    for (let i = 0; i < barCount; i++) {
      barsRef.current[i] += (targetBarsRef.current[i] - barsRef.current[i]) * smoothing;
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, canvasHeight);

    const barWidth = Math.max(2, (width / barCount) * 0.6);
    const barGap = (width - barWidth * barCount) / (barCount - 1);
    const maxBarHeight = canvasHeight * 0.85;

    // Draw bars
    for (let i = 0; i < barCount; i++) {
      const barHeight = Math.max(2, barsRef.current[i] * maxBarHeight);
      const x = i * (barWidth + barGap);
      const y = (canvasHeight - barHeight) / 2;

      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);

      const isActive = isPlaying || isRecording;
      if (isActive) {
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, color + 'cc');
        gradient.addColorStop(1, color + '88');
      } else {
        gradient.addColorStop(0, inactiveColor);
        gradient.addColorStop(1, inactiveColor + '88');
      }

      ctx.fillStyle = gradient;

      // Draw rounded rectangle
      const radius = barWidth / 2;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, radius);
      ctx.fill();

      // Add glow effect when active
      if (isActive && barsRef.current[i] > 0.3) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 8 * barsRef.current[i];
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    lastFrameTime.current = time;
    animationRef.current = requestAnimationFrame(drawWaveform);
  }, [barCount, color, inactiveColor, isPlaying, isRecording, analyserNode, generateSimulatedBars]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(drawWaveform);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawWaveform]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: `${height}px` }}
    />
  );
}
