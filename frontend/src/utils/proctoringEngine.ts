export interface ProctoringViolationEvent {
  id: string;
  type:
    | 'TAB_SWITCH'
    | 'BLUR_WINDOW'
    | 'SCREENSHOT_ATTEMPT'
    | 'PRINT_ATTEMPT'
    | 'CONTEXT_MENU'
    | 'COPY_PASTE'
    | 'FULLSCREEN_EXIT'
    | 'FACE_MISSING'
    | 'MULTI_FACE'
    | 'GAZE_AWAY'
    | 'OBJECT_DETECTED'
    | 'SHARE_SCREEN_STOPPED'
    | 'VIRTUAL_BG_DETECTED'
    | 'VIRTUAL_CAMERA'
    | 'MULTI_MONITOR'
    | 'BACKGROUND_VOICE'
    | 'PERIODIC_SNAPSHOT'
    | 'AUTO_SUBMIT_LEAVE';
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  snapshot?: string;
  evidenceSnapshot?: string;
  durationSec?: number;
  hasVisualEvidence?: boolean;
}

export type ProctoringPreset = 'Ringan' | 'Sedang' | 'Ketat';

export interface ProctoringConfig {
  preset?: ProctoringPreset;
  maxViolations?: number;
  autoSubmitOnMaxViolations?: boolean;
  enforceFullscreen?: boolean;
  blockShortcuts?: boolean;
  blockContextMenu?: boolean;
  blockCopyPaste?: boolean;
  detectFace?: boolean;
  detectGaze?: boolean;
  detectObject?: boolean;
  detectAudio?: boolean;
  blockMultiMonitor?: boolean;
  forbidVirtualBg?: boolean;
  checkShareScreen?: boolean;
  snapshotIntervalMs?: number;
  onViolation?: (event: ProctoringViolationEvent) => void;
  onPeriodicSnapshot?: (event: ProctoringViolationEvent) => void;
  onMaxViolationsReached?: () => void;
}

export const isMultiMonitorScreen = (): boolean => {
  try {
    return Boolean((window.screen as unknown as { isExtended?: boolean })?.isExtended);
  } catch {
    return false;
  }
};

const VIRTUAL_CAMERA_PATTERNS = [
  'virtual',
  'obs',
  'manycam',
  'xsplit',
  'snap camera',
  'snapcamera',
  'droidcam',
  'ivcam',
  'epoccam',
  'camo',
  'youcam',
  'splitcam',
  'vcam',
  'screen capture',
  'ndi',
  'fake',
  'dummy',
  'avatar',
  'prism',
  'mmhmm',
];

export const isVirtualCameraLabel = (label: string | undefined | null): boolean => {
  const normalized = String(label || '').toLowerCase();
  if (!normalized) return false;
  return VIRTUAL_CAMERA_PATTERNS.some((pattern) => normalized.includes(pattern));
};

export interface CameraAuditResult {
  ok: boolean;
  label: string;
  deviceId?: string;
  virtual: boolean;
  videoInputs: number;
  reason?: string;
}

export class ProctoringEngine {
  private config: ProctoringConfig;
  private violationCount: number = 0;
  private isListening: boolean = false;
  private events: ProctoringViolationEvent[] = [];
  private faceCheckInterval: any = null;
  private deviceWatchInterval: any = null;
  private multiMonitorInterval: any = null;
  private randomSnapshotTimeout: any = null;
  private audioMonitorTimer: any = null;
  private audioContext: AudioContext | null = null;
  private blurTimeout: any = null;
  private awayStartedAt: number | null = null;
  private lastCameraLabel: string | null = null;
  private lastEventTimestamps: Record<string, number> = {};
  private webcamSnapshotProvider: (() => string | null) | null = null;
  private screenSnapshotProvider: (() => string | null) | null = null;

  constructor(config: ProctoringConfig = {}) {
    const preset = config.preset || 'Sedang';

    let defaults: Partial<ProctoringConfig> = {
      preset,
      maxViolations: 10,
      autoSubmitOnMaxViolations: false,
      enforceFullscreen: true,
      blockShortcuts: true,
      blockContextMenu: true,
      blockCopyPaste: true,
      detectFace: true,
      detectGaze: false,
      detectObject: false,
      detectAudio: false,
      blockMultiMonitor: false,
      forbidVirtualBg: false,
      checkShareScreen: false,
      snapshotIntervalMs: 120000,
    };

    if (preset === 'Ringan') {
      defaults = {
        ...defaults,
        maxViolations: 15,
        enforceFullscreen: false,
        blockShortcuts: false,
        blockContextMenu: false,
        blockCopyPaste: false,
        detectFace: false,
        detectGaze: false,
        detectObject: false,
        detectAudio: false,
        blockMultiMonitor: false,
        forbidVirtualBg: false,
      };
    } else if (preset === 'Ketat') {
      defaults = {
        ...defaults,
        maxViolations: 10,
        detectFace: true,
        detectGaze: true,
        detectObject: true,
        detectAudio: true,
        blockMultiMonitor: true,
        forbidVirtualBg: true,
        checkShareScreen: true,
        snapshotIntervalMs: 90000,
      };
    }

    this.config = {
      ...defaults,
      ...config,
    };
  }

  public setWebcamSnapshotProvider(provider: (() => string | null) | null): void {
    this.webcamSnapshotProvider = provider;
  }

  public setScreenSnapshotProvider(provider: (() => string | null) | null): void {
    this.screenSnapshotProvider = provider;
  }

  public start(): void {
    if (this.isListening) return;
    this.isListening = true;

    // 1. Page Visibility API
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // 2. Window Blur / Focus
    window.addEventListener('blur', this.handleWindowBlur);

    // 3. Keydown & Keyup Shortcut Interception (PrintScreen often fires only on keyup)
    if (this.config.blockShortcuts) {
      document.addEventListener('keydown', this.handleKeyDown, true);
      document.addEventListener('keyup', this.handleKeyUp, true);
    }

    // 4. Context Menu / Right Click
    if (this.config.blockContextMenu) {
      document.addEventListener('contextmenu', this.handleContextMenu, true);
    }

    // 5. Copy & Paste
    if (this.config.blockCopyPaste) {
      document.addEventListener('copy', this.handleCopyPaste, true);
      document.addEventListener('cut', this.handleCopyPaste, true);
      document.addEventListener('paste', this.handleCopyPaste, true);
    }

    // 6. Fullscreen Change
    if (this.config.enforceFullscreen) {
      document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    }

    // 7. Multi-monitor guard (high-stakes timed exams)
    if (this.config.blockMultiMonitor) {
      this.checkMultiMonitor();
      this.multiMonitorInterval = setInterval(() => this.checkMultiMonitor(), 15000);
    }

    // 8. Randomized periodic webcam verification photos
    if (this.config.detectFace || this.config.onPeriodicSnapshot) {
      this.scheduleNextRandomSnapshot();
    }
  }

  public stop(): void {
    if (!this.isListening) return;
    this.isListening = false;

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    document.removeEventListener('keyup', this.handleKeyUp, true);
    document.removeEventListener('contextmenu', this.handleContextMenu, true);
    document.removeEventListener('copy', this.handleCopyPaste, true);
    document.removeEventListener('cut', this.handleCopyPaste, true);
    document.removeEventListener('paste', this.handleCopyPaste, true);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);

    if (this.faceCheckInterval) {
      clearInterval(this.faceCheckInterval);
      this.faceCheckInterval = null;
    }
    if (this.deviceWatchInterval) {
      clearInterval(this.deviceWatchInterval);
      this.deviceWatchInterval = null;
    }
    if (this.multiMonitorInterval) {
      clearInterval(this.multiMonitorInterval);
      this.multiMonitorInterval = null;
    }
    if (this.randomSnapshotTimeout) {
      clearTimeout(this.randomSnapshotTimeout);
      this.randomSnapshotTimeout = null;
    }
    if (this.audioMonitorTimer) {
      clearInterval(this.audioMonitorTimer);
      this.audioMonitorTimer = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
  }

  public recordManualViolation(
    type: ProctoringViolationEvent['type'],
    description: string,
    severity: ProctoringViolationEvent['severity'],
    explicitSnapshot?: string | null,
    durationSec?: number
  ): void {
    let snapshot: string | undefined = explicitSnapshot || undefined;
    if (!snapshot) {
      if (type === 'TAB_SWITCH' || type === 'BLUR_WINDOW' || type === 'SCREENSHOT_ATTEMPT') {
        snapshot = this.screenSnapshotProvider?.() || this.webcamSnapshotProvider?.() || undefined;
      } else if (
        type === 'FACE_MISSING' ||
        type === 'MULTI_FACE' ||
        type === 'BACKGROUND_VOICE' ||
        type === 'GAZE_AWAY' ||
        type === 'OBJECT_DETECTED' ||
        type === 'PERIODIC_SNAPSHOT'
      ) {
        snapshot = this.webcamSnapshotProvider?.() || undefined;
      }
    }

    const event: ProctoringViolationEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      severity,
      description,
      ...(snapshot ? { snapshot, evidenceSnapshot: snapshot, hasVisualEvidence: true } : { hasVisualEvidence: false }),
      ...(typeof durationSec === 'number' ? { durationSec } : {}),
    };

    this.events.unshift(event);
    if (type === 'PERIODIC_SNAPSHOT') {
      this.config.onPeriodicSnapshot?.(event);
      return;
    }

    this.violationCount++;

    if (this.config.onViolation) {
      this.config.onViolation(event);
    }

    if (
      this.config.autoSubmitOnMaxViolations &&
      this.config.maxViolations &&
      this.violationCount >= this.config.maxViolations
    ) {
      if (this.config.onMaxViolationsReached) {
        this.config.onMaxViolationsReached();
      }
    }
  }

  private canEmitWithCooldown(type: string, cooldownMs: number): boolean {
    const now = Date.now();
    const prev = this.lastEventTimestamps[type] || 0;
    if (now - prev < cooldownMs) return false;
    this.lastEventTimestamps[type] = now;
    return true;
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.awayStartedAt = Date.now();
      const screenSnap = this.screenSnapshotProvider?.() || this.webcamSnapshotProvider?.() || null;
      this.recordManualViolation(
        'TAB_SWITCH',
        screenSnap
          ? 'Kandidat berpindah tab atau meminimalkan browser ujian (cuplikan layar/kamera tersimpan)'
          : 'Kandidat berpindah tab atau meminimalkan browser ujian (Page Visibility API)',
        'high',
        screenSnap
      );
    } else if (this.awayStartedAt) {
      const durationSec = Math.max(1, Math.round((Date.now() - this.awayStartedAt) / 1000));
      this.awayStartedAt = null;
      const latest = this.events.find((evt) => evt.type === 'TAB_SWITCH');
      if (latest && latest.durationSec === undefined) {
        latest.durationSec = durationSec;
        latest.description = `${latest.description} • Durasi keluar: ${durationSec} detik`;
      }
    }
  };

  private handleWindowBlur = (): void => {
    // 1.5 second tolerance before logging window blur (catches OS snipping/screenshot tools too)
    this.blurTimeout = setTimeout(() => {
      const screenSnap = this.screenSnapshotProvider?.() || this.webcamSnapshotProvider?.() || null;
      this.recordManualViolation(
        'BLUR_WINDOW',
        'Kandidat kehilangan fokus dari layar ujian > 1.5 detik (kemungkinan pindah aplikasi atau tool screenshot)',
        'medium',
        screenSnap
      );
    }, 1500);

    const onFocus = () => {
      if (this.blurTimeout) {
        clearTimeout(this.blurTimeout);
        this.blurTimeout = null;
      }
      window.removeEventListener('focus', onFocus);
    };
    window.addEventListener('focus', onFocus);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
      e.preventDefault();
      e.stopPropagation();
      try {
        navigator.clipboard?.writeText('').catch(() => {});
      } catch {
        // ignore clipboard errors
      }
      this.recordManualViolation(
        'SCREENSHOT_ATTEMPT',
        'Kandidat menekan tombol PrintScreen untuk mengambil cuplikan layar',
        'critical'
      );
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Detect PrintScreen / OS Screenshot shortcuts (Win+Shift+S, Cmd+Shift+3/4/5, Ctrl+Shift+S)
    if (
      e.key === 'PrintScreen' ||
      e.code === 'PrintScreen' ||
      e.keyCode === 44 ||
      ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) ||
      (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key))
    ) {
      e.preventDefault();
      e.stopPropagation();
      this.recordManualViolation(
        'SCREENSHOT_ATTEMPT',
        'Kandidat mencoba mengambil tangkapan layar (PrintScreen / Shortcut Screenshot)',
        'critical'
      );
      return;
    }

    // Detect Ctrl+P or Cmd+P (Print)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      e.stopPropagation();
      this.recordManualViolation(
        'PRINT_ATTEMPT',
        'Kandidat mencoba mencetak halaman soal (Ctrl+P / Cmd+P)',
        'high'
      );
      return;
    }

    // Detect DevTools shortcuts (F12, Ctrl+Shift+I, Cmd+Opt+I, Ctrl+Shift+C, Ctrl+U)
    if (
      e.key === 'F12' ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j')) ||
      ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U'))
    ) {
      e.preventDefault();
      e.stopPropagation();
      this.recordManualViolation(
        'SCREENSHOT_ATTEMPT',
        'Kandidat mencoba membuka Developer Tools atau inspect element',
        'high'
      );
      return;
    }

    // Detect Alt+Tab
    if (e.altKey && e.key === 'Tab') {
      this.recordManualViolation(
        'TAB_SWITCH',
        'Kombinasi Alt+Tab terdeteksi (berpindah aplikasi)',
        'medium'
      );
    }
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    this.recordManualViolation(
      'CONTEXT_MENU',
      'Kandidat melakukan klik kanan pada lembar ujian (diblokir secara native)',
      'low'
    );
  };

  private handleCopyPaste = (e: ClipboardEvent): void => {
    e.preventDefault();
    this.recordManualViolation(
      'COPY_PASTE',
      `Kandidat mencoba aksi ${e.type.toUpperCase()} pada lembar ujian`,
      'high'
    );
  };

  private handleFullscreenChange = (): void => {
    if (!document.fullscreenElement) {
      this.recordManualViolation(
        'FULLSCREEN_EXIT',
        'Kandidat keluar dari mode layar penuh (Full Screen)',
        'high'
      );
    }
  };

  private scheduleNextRandomSnapshot(): void {
    if (!this.isListening) return;
    const baseMs = this.config.snapshotIntervalMs || 120000;
    const jitterMs = Math.round(baseMs * (0.75 + Math.random() * 0.5));
    this.randomSnapshotTimeout = setTimeout(() => {
      if (!this.isListening) return;
      const snap = this.webcamSnapshotProvider?.();
      if (snap) {
        this.recordManualViolation(
          'PERIODIC_SNAPSHOT',
          'Foto verifikasi berkala acak selama sesi CAT (audit kehadiran peserta)',
          'low',
          snap
        );
      }
      this.scheduleNextRandomSnapshot();
    }, jitterMs);
  }

  private checkMultiMonitor(): void {
    if (!isMultiMonitorScreen()) return;
    if (!this.canEmitWithCooldown('MULTI_MONITOR', 60000)) return;
    this.recordManualViolation(
      'MULTI_MONITOR',
      'Terdeteksi lebih dari 1 monitor terhubung (Extended Display). Gunakan satu layar untuk ujian berisiko tinggi.',
      'high'
    );
  }

  /**
   * Monitors microphone vocal-band energy during silent CAT sessions to detect
   * sustained nearby speech (potential live coaching / whispering).
   */
  public startAudioMonitor(stream: MediaStream): void {
    if (!this.config.detectAudio) return;
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
      }
      const ctx = new AudioCtx();
      this.audioContext = ctx;
      const source = ctx.createMediaStreamSource(new MediaStream([audioTracks[0]]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      let consecutiveSpeechTicks = 0;

      if (this.audioMonitorTimer) clearInterval(this.audioMonitorTimer);
      this.audioMonitorTimer = setInterval(() => {
        if (!this.isListening) return;
        analyser.getByteFrequencyData(data);
        // Roughly 300Hz-3000Hz voice energy bins
        const startBin = 4;
        const endBin = Math.min(data.length - 1, 40);
        let sum = 0;
        for (let i = startBin; i <= endBin; i++) sum += data[i];
        const avg = sum / Math.max(1, endBin - startBin + 1);

        if (avg > 42) {
          consecutiveSpeechTicks++;
          // Require >= 4 seconds (8 * 500ms) sustained speech to avoid coughing/noise false positives
          if (consecutiveSpeechTicks >= 8 && this.canEmitWithCooldown('BACKGROUND_VOICE', 45000)) {
            consecutiveSpeechTicks = 0;
            const snap = this.webcamSnapshotProvider?.() || null;
            this.recordManualViolation(
              'BACKGROUND_VOICE',
              'Terdeteksi percakapan/suara vokal berkelanjutan di sekitar peserta saat sesi CAT hening (perlu verifikasi asesor)',
              'medium',
              snap
            );
          }
        } else {
          consecutiveSpeechTicks = Math.max(0, consecutiveSpeechTicks - 1);
        }
      }, 500);
    } catch {
      // Audio monitoring optional fallback when Web Audio API restricted
    }
  }

  public triggerMultiFace(snapshot?: string | null): void {
    if (!this.canEmitWithCooldown('MULTI_FACE', 30000)) return;
    this.recordManualViolation(
      'MULTI_FACE',
      'AI mendeteksi keberadaan lebih dari 1 wajah di dalam bingkai webcam',
      'high',
      snapshot
    );
  }

  public triggerFaceMissing(snapshot?: string | null): void {
    if (!this.canEmitWithCooldown('FACE_MISSING', 30000)) return;
    this.recordManualViolation(
      'FACE_MISSING',
      'Wajah peserta tidak terdeteksi di webcam selama beberapa detik berturut-turut',
      'high',
      snapshot
    );
  }

  /**
   * Audits the active camera track and the enumerated video inputs for virtual
   * camera devices (OBS, ManyCam, DroidCam, Snap Camera, etc.).
   * Must run after camera permission has been granted, otherwise labels are empty.
   */
  public async auditCamera(stream?: MediaStream | null): Promise<CameraAuditResult> {
    let label = '';
    let deviceId: string | undefined;
    let videoInputs = 0;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === 'videoinput');
      videoInputs = cameras.length;
      const activeTrack = stream?.getVideoTracks?.()[0];
      const settings = activeTrack?.getSettings?.();
      deviceId = settings?.deviceId;
      label = activeTrack?.label || cameras.find((device) => device.deviceId === deviceId)?.label || cameras[0]?.label || '';
    } catch {
      label = '';
    }

    const virtual = isVirtualCameraLabel(label);
    this.lastCameraLabel = label;

    if (virtual && this.config.forbidVirtualBg) {
      this.recordManualViolation(
        'VIRTUAL_CAMERA',
        `Kamera virtual terdeteksi: "${label}". Gunakan kamera fisik perangkat tanpa virtual camera, background, atau blur.`,
        'critical'
      );
    }

    return {
      ok: !virtual,
      label,
      deviceId,
      virtual,
      videoInputs,
      reason: virtual ? 'virtual-camera' : videoInputs === 0 ? 'no-camera' : undefined,
    };
  }

  /**
   * Re-audits the camera every `intervalMs` and raises a violation when the
   * device label changes mid-session (candidate switching to a virtual device).
   */
  public startDeviceWatch(streamProvider: () => MediaStream | null, intervalMs = 20000): void {
    if (this.deviceWatchInterval) clearInterval(this.deviceWatchInterval);
    this.deviceWatchInterval = setInterval(async () => {
      const previousLabel = this.lastCameraLabel;
      const result = await this.auditCamera(streamProvider());
      if (previousLabel && result.label && result.label !== previousLabel && !result.virtual) {
        this.recordManualViolation(
          'VIRTUAL_CAMERA',
          `Perangkat kamera berubah dari "${previousLabel}" menjadi "${result.label}" saat sesi berlangsung.`,
          'high'
        );
      }
      this.lastCameraLabel = result.label;
    }, intervalMs);
  }

  public triggerVirtualBgViolation(): void {
    if (this.config.forbidVirtualBg) {
      this.recordManualViolation(
        'VIRTUAL_BG_DETECTED',
        'Pelanggaran Virtual Background: Kamera wajib menampilkan latar belakang asli ruangan',
        'medium'
      );
    }
  }

  public triggerShareScreenStopped(): void {
    if (this.config.checkShareScreen) {
      this.recordManualViolation(
        'SHARE_SCREEN_STOPPED',
        'Peserta menghentikan share screen monitor; sesi ujian dijeda otomatis',
        'high'
      );
    }
  }

  public getViolations(): ProctoringViolationEvent[] {
    return this.events;
  }

  public getViolationCount(): number {
    return this.violationCount;
  }

  public getPreset(): ProctoringPreset {
    return this.config.preset || 'Sedang';
  }

  public requestFullscreen(): Promise<void> {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      return elem.requestFullscreen();
    }
    return Promise.resolve();
  }
}
