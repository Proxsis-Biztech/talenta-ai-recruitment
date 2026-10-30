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
    | 'AUTO_SUBMIT_LEAVE';
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidenceSnapshot?: string;
}

export type ProctoringPreset = 'Ringan' | 'Sedang' | 'Ketat';

export interface ProctoringConfig {
  preset?: ProctoringPreset;
  maxViolations?: number;
  enforceFullscreen?: boolean;
  blockShortcuts?: boolean;
  blockContextMenu?: boolean;
  blockCopyPaste?: boolean;
  detectFace?: boolean;
  detectGaze?: boolean;
  detectObject?: boolean;
  forbidVirtualBg?: boolean;
  checkShareScreen?: boolean;
  onViolation?: (event: ProctoringViolationEvent) => void;
  onMaxViolationsReached?: () => void;
}

export class ProctoringEngine {
  private config: ProctoringConfig;
  private violationCount: number = 0;
  private isListening: boolean = false;
  private events: ProctoringViolationEvent[] = [];
  private faceCheckInterval: any = null;
  private blurTimeout: any = null;

  constructor(config: ProctoringConfig = {}) {
    const preset = config.preset || 'Sedang';

    let defaults: Partial<ProctoringConfig> = {
      preset,
      maxViolations: 3,
      enforceFullscreen: true,
      blockShortcuts: true,
      blockContextMenu: true,
      blockCopyPaste: true,
      detectFace: true,
      detectGaze: false,
      detectObject: false,
      forbidVirtualBg: false,
      checkShareScreen: false,
    };

    if (preset === 'Ringan') {
      defaults = {
        ...defaults,
        maxViolations: 5,
        detectFace: false,
        detectGaze: false,
        detectObject: false,
        forbidVirtualBg: false,
      };
    } else if (preset === 'Ketat') {
      defaults = {
        ...defaults,
        maxViolations: 3,
        detectFace: true,
        detectGaze: true,
        detectObject: true,
        forbidVirtualBg: true,
        checkShareScreen: true,
      };
    }

    this.config = {
      ...defaults,
      ...config,
    };
  }

  public start(): void {
    if (this.isListening) return;
    this.isListening = true;

    // 1. Page Visibility API
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // 2. Window Blur / Focus
    window.addEventListener('blur', this.handleWindowBlur);

    // 3. Keydown Shortcut Interception
    if (this.config.blockShortcuts) {
      document.addEventListener('keydown', this.handleKeyDown, true);
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

    // 7. Periodic Face & Gaze Check simulation (every 15s per BRD 4.4)
    if (this.config.detectFace) {
      this.startFaceCheckLoop();
    }
  }

  public stop(): void {
    if (!this.isListening) return;
    this.isListening = false;

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    document.removeEventListener('contextmenu', this.handleContextMenu, true);
    document.removeEventListener('copy', this.handleCopyPaste, true);
    document.removeEventListener('cut', this.handleCopyPaste, true);
    document.removeEventListener('paste', this.handleCopyPaste, true);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);

    if (this.faceCheckInterval) {
      clearInterval(this.faceCheckInterval);
      this.faceCheckInterval = null;
    }
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
  }

  public recordManualViolation(
    type: ProctoringViolationEvent['type'],
    description: string,
    severity: ProctoringViolationEvent['severity']
  ): void {
    const event: ProctoringViolationEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      severity,
      description,
    };

    this.events.unshift(event);
    this.violationCount++;

    if (this.config.onViolation) {
      this.config.onViolation(event);
    }

    if (this.config.maxViolations && this.violationCount >= this.config.maxViolations) {
      if (this.config.onMaxViolationsReached) {
        this.config.onMaxViolationsReached();
      }
    }
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.recordManualViolation(
        'TAB_SWITCH',
        'Kandidat berpindah tab atau meminimalkan browser ujian (Page Visibility API)',
        'high'
      );
    }
  };

  private handleWindowBlur = (): void => {
    // 3 second tolerance before logging window blur as anomaly (BRD Section 4.4)
    this.blurTimeout = setTimeout(() => {
      this.recordManualViolation(
        'BLUR_WINDOW',
        'Kandidat kehilangan fokus kursor dari area pengerjaan ujian > 3 detik',
        'medium'
      );
    }, 3000);

    const onFocus = () => {
      if (this.blurTimeout) {
        clearTimeout(this.blurTimeout);
        this.blurTimeout = null;
      }
      window.removeEventListener('focus', onFocus);
    };
    window.addEventListener('focus', onFocus);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Detect PrintScreen
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      e.preventDefault();
      e.stopPropagation();
      this.recordManualViolation(
        'SCREENSHOT_ATTEMPT',
        'Kandidat menekan tombol PrintScreen untuk mengambil cuplikan layar',
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

  // Automated 15-second visual presence check (BRD 4.4: Constant Face Check)
  private startFaceCheckLoop(): void {
    this.faceCheckInterval = setInterval(() => {
      // In production with camera stream, this is hooked to MediaPipe / OpenCV.js
      // Here we maintain listener telemetry integrity
    }, 15000);
  }

  // Simulated triggers for automated / camera inference callbacks
  public triggerGazeAway(seconds: number = 6): void {
    if (this.config.detectGaze) {
      this.recordManualViolation(
        'GAZE_AWAY',
        `Pandangan mata peserta berpaling dari layar monitor selama ${seconds}s (> 5 detik)`,
        'medium'
      );
    }
  }

  public triggerObjectDetection(objectName: string = 'Smartphone'): void {
    if (this.config.detectObject) {
      this.recordManualViolation(
        'OBJECT_DETECTED',
        `AI mendeteksi keberadaan objek mencurigakan di area ujian: ${objectName}`,
        'high'
      );
    }
  }

  public triggerMultiFace(): void {
    this.recordManualViolation(
      'MULTI_FACE',
      'AI mendeteksi keberadaan lebih dari 1 orang di dalam bingkai webcam',
      'high'
    );
  }

  public triggerFaceMissing(): void {
    this.recordManualViolation(
      'FACE_MISSING',
      'Wajah peserta tidak terdeteksi di webcam lebih dari 10 detik',
      'high'
    );
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
