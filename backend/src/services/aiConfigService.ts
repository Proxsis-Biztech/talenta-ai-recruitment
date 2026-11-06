import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  maxDurationMinutes: 20
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