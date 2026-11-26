import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type ProctoringPresetKey = 'ringan' | 'sedang' | 'ketat';

export interface ProctoringPolicy {
  preset: ProctoringPresetKey;
  maxViolations: number;
  autoSubmitOnMaxViolations: boolean;
  enforceFullscreen: boolean;
  blockShortcuts: boolean;
  blockContextMenu: boolean;
  blockCopyPaste: boolean;
  detectFace: boolean;
  detectGaze: boolean;
  detectObject: boolean;
  detectAudio: boolean;
  blockMultiMonitor: boolean;
  forbidVirtualBg: boolean;
  checkShareScreen: boolean;
  snapshotIntervalMs: number;
}

export interface AiRuntimeConfig {
  liveAudioModel: string;
  cvScreeningModel: string;
  interviewScoringModel: string;
  factSheetModel: string;
  transcriptionModel: string;
  voicePersona: string;
  cvWeight: number;
  interviewWeight: number;
  integrityWeight: number;
  passingThreshold: number;
  maxDurationMinutes: number;
  examExpiryPolicy: 'auto_submit' | 'expired';
  proctoringPreset: ProctoringPresetKey;
  blockVirtualBackground: boolean;
}

const DEFAULT_CONFIG: AiRuntimeConfig = {
  liveAudioModel: 'gemini-2.5-flash-native-audio-latest',
  cvScreeningModel: 'gemini-2.5-flash',
  interviewScoringModel: 'gemini-2.5-flash',
  factSheetModel: 'gemini-2.5-flash',
  transcriptionModel: 'gemini-flash-lite-latest',
  voicePersona: 'Kore',
  cvWeight: 35,
  interviewWeight: 50,
  integrityWeight: 15,
  passingThreshold: 70,
  maxDurationMinutes: 20,
  examExpiryPolicy: 'auto_submit',
  proctoringPreset: 'sedang',
  blockVirtualBackground: true
};

let cached: { value: AiRuntimeConfig; expiresAt: number } | null = null;

export async function getAiConfig(): Promise<AiRuntimeConfig> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  let value = DEFAULT_CONFIG;
  try {
    const record = await prisma.masterRecord.findUnique({
      where: { scope_key: { scope: 'ai-config', key: 'default' } }
    });
    if (record) {
      const parsed = JSON.parse(record.value);
      value = { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    value = DEFAULT_CONFIG;
  }
  cached = { value, expiresAt: Date.now() + 30_000 };
  return value;
}

export function invalidateAiConfigCache() {
  cached = null;
}

const PROCTORING_PRESETS: Record<ProctoringPresetKey, Omit<ProctoringPolicy, 'preset' | 'forbidVirtualBg'>> = {
  ringan: {
    maxViolations: 15,
    autoSubmitOnMaxViolations: false,
    enforceFullscreen: false,
    blockShortcuts: false,
    blockContextMenu: false,
    blockCopyPaste: false,
    detectFace: false,
    detectGaze: false,
    detectObject: false,
    detectAudio: false,
    blockMultiMonitor: false,
    checkShareScreen: false,
    snapshotIntervalMs: 180000
  },
  sedang: {
    maxViolations: 10,
    autoSubmitOnMaxViolations: false,
    enforceFullscreen: true,
    blockShortcuts: true,
    blockContextMenu: true,
    blockCopyPaste: true,
    detectFace: true,
    detectGaze: false,
    detectObject: false,
    detectAudio: true,
    blockMultiMonitor: false,
    checkShareScreen: false,
    snapshotIntervalMs: 120000
  },
  ketat: {
    maxViolations: 10,
    autoSubmitOnMaxViolations: false,
    enforceFullscreen: true,
    blockShortcuts: true,
    blockContextMenu: true,
    blockCopyPaste: true,
    detectFace: true,
    detectGaze: true,
    detectObject: true,
    detectAudio: true,
    blockMultiMonitor: true,
    checkShareScreen: true,
    snapshotIntervalMs: 90000
  }
};

export function resolveProctoringPolicy(config: AiRuntimeConfig): ProctoringPolicy {
  const preset: ProctoringPresetKey =
    config.proctoringPreset === 'ringan' || config.proctoringPreset === 'ketat'
      ? config.proctoringPreset
      : 'sedang';
  const base = PROCTORING_PRESETS[preset];
  return {
    ...base,
    preset,
    forbidVirtualBg: preset !== 'ringan' && config.blockVirtualBackground !== false
  };
}