import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type UnifiedReviewStage =
  | 'BELUM_INTERVIEW'
  | 'PERLU_TINDAKAN'
  | 'MENUNGGU_REVIEW'
  | 'DIREVIEW'
  | 'FINALISASI'
  | 'TERBIT';

export interface AiCompetencyEvidence {
  name: string;
  weight: number;
  aiScore: number; // BARS 1-5
  rationale: string;
  quote: string;
  timestamp: string;
}

export interface AiInterviewReviewRecord {
  candidateCode: string;
  aiCompetencies: AiCompetencyEvidence[];
  aiOverallScore: number | null;
  aiSummary: string | null;
  isCalibrationSample: boolean;
  needsAction: boolean;
  actionReason: string | null;
  actionType: string | null;
  finalized: boolean;
  aiOverrideReason: string | null;
  manualDecisionNote: string | null;
  updatedAt: string;
}

export interface TranscriptSegment {
  timestamp: string;
  speaker: 'Ava AI' | 'Kandidat' | 'Sistem';
  text: string;
}

export const DEFAULT_BARS_COMPETENCIES: Array<{ name: string; weight: number; keywords: string[] }> = [
  {
    name: 'System Architecture & Scalability',
    weight: 30,
    keywords: ['arsitektur', 'microservice', 'scalab', 'cache', 'redis', 'circuit', 'queue', 'fault', 'latensi', 'timeout', 'load']
  },
  {
    name: 'Database Optimization & Tuning',
    weight: 25,
    keywords: ['database', 'sql', 'postgres', 'index', 'query', 'lock', 'pool', 'transak', 'acid', 'partisi', 'storage']
  },
  {
    name: 'Problem Solving & Algorithmic Thinking',
    weight: 25,
    keywords: ['solusi', 'analisis', 'masalah', 'prioritas', 'risiko', 'mitigasi', 'strategi', 'kompleksitas', 'evaluasi', 'langkah']
  },
  {
    name: 'Komunikasi & Artikulasi Teknis',
    weight: 20,
    keywords: ['tim', 'komunikasi', 'koordinasi', 'jelas', 'jelaskan', 'menurut', 'pengalaman', 'proyek', 'klien', 'presentasi']
  }
];

const detectTranscriptSpeaker = (rawSpeaker: string): TranscriptSegment['speaker'] | null => {
  const clean = rawSpeaker.toLowerCase().trim();
  if (!clean || clean.length > 40) return null;
  if (
    clean.includes('kandidat') ||
    clean.includes('candidate') ||
    clean.includes('peserta') ||
    clean.includes('(anda)') ||
    clean === 'anda' ||
    clean === 'user'
  ) {
    return 'Kandidat';
  }
  if (
    clean.includes('ava') ||
    clean.includes('gemini') ||
    clean.includes('interviewer') ||
    clean.includes('pewawancara') ||
    clean === 'ai' ||
    clean === 'model' ||
    clean === 'assistant' ||
    clean.includes(' ai') ||
    clean.includes('hr')
  ) {
    return 'Ava AI';
  }
  if (clean.includes('system') || clean.includes('sistem')) {
    return 'Sistem';
  }
  return null;
};

export const parseTimestampedTranscript = (raw: string | null | undefined): TranscriptSegment[] => {
  if (!raw || !raw.trim()) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const jsonSegs: TranscriptSegment[] = [];
        for (const item of parsed) {
          const text = String(item?.text ?? item?.message ?? '').trim();
          if (!text) continue;
          const speaker =
            detectTranscriptSpeaker(String(item?.speaker ?? item?.sender ?? item?.role ?? '')) ||
            'Kandidat';
          jsonSegs.push({
            timestamp: String(item?.timestamp ?? item?.time ?? '--:--').trim() || '--:--',
            speaker,
            text
          });
        }
        if (jsonSegs.length > 0) return jsonSegs;
      }
    } catch {
      // Not JSON — fall through to timestamped text parser
    }
  }

  const lines = trimmed
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const segments: TranscriptSegment[] = [];
  for (const line of lines) {
    // Match "[10:22] Candidate: ..." or "[10:22] Ava (AI): ..."
    const tsMatch = line.match(/^\[([^\]]+)\]\s*(.+)$/);
    const timestamp = tsMatch ? tsMatch[1].trim() : '--:--';
    const body = tsMatch ? tsMatch[2].trim() : line;
    const colonIdx = body.indexOf(':');
    const detected =
      colonIdx > 0 && colonIdx < 40
        ? detectTranscriptSpeaker(body.slice(0, colonIdx))
        : null;

    if (tsMatch || detected) {
      const speaker: TranscriptSegment['speaker'] = detected || 'Kandidat';
      const text = (colonIdx > 0 && colonIdx < 40 ? body.slice(colonIdx + 1) : body).trim();
      if (text) {
        segments.push({ timestamp, speaker, text });
      }
    } else if (segments.length > 0) {
      // Continuation line of a multi-line message keeps the previous speaker instead of flipping to Kandidat
      segments[segments.length - 1].text = `${segments[segments.length - 1].text}\n${body}`.trim();
    } else if (body) {
      segments.push({ timestamp: '--:--', speaker: 'Kandidat', text: body });
    }
  }
  return segments;
};

export const isDeterministicCalibrationSample = (candidateCode: string): boolean => {
  if (!candidateCode) return false;
  const digest = crypto.createHash('sha256').update(candidateCode.toUpperCase()).digest();
  // ~25% random-like deterministic sample rate across cohorts
  return digest[0] % 4 === 0;
};

export const buildAiCompetenciesFromData = (params: {
  transcript?: string | null;
  applicantInterviewResult?: string | null;
  overallScore?: number | null;
}): AiCompetencyEvidence[] => {
  const segments = parseTimestampedTranscript(params.transcript);
  const candidateTurns = segments.filter((s) => s.speaker === 'Kandidat');

  let parsedResult: any = null;
  if (params.applicantInterviewResult) {
    try {
      parsedResult = JSON.parse(params.applicantInterviewResult);
    } catch {
      parsedResult = null;
    }
  }

  const skillMatrix: Array<{ skill?: string; score?: number; notes?: string }> = Array.isArray(parsedResult?.skillMatrix)
    ? parsedResult.skillMatrix
    : [];

  const baseOverall100 =
    typeof parsedResult?.overallScore === 'number'
      ? parsedResult.overallScore
      : typeof params.overallScore === 'number'
        ? params.overallScore
        : null;

  const toBarsScale = (score100: number | null | undefined, fallbackIdx: number): number => {
    if (typeof score100 === 'number' && Number.isFinite(score100)) {
      return Math.min(5, Math.max(1, Math.round((score100 / 20) * 10) / 10 >= 4.5 ? 5 : Math.max(1, Math.round(score100 / 20))));
    }
    if (candidateTurns.length >= 4) return fallbackIdx % 2 === 0 ? 4 : 3;
    if (candidateTurns.length >= 2) return 3;
    return 2;
  };

  return DEFAULT_BARS_COMPETENCIES.map((comp, idx) => {
    const matchedTurn =
      candidateTurns.find((turn) =>
        comp.keywords.some((kw) => turn.text.toLowerCase().includes(kw))
      ) || candidateTurns[idx % Math.max(1, candidateTurns.length)];

    const matchedSkill = skillMatrix[idx] || skillMatrix[0];
    const aiScore = toBarsScale(matchedSkill?.score ?? baseOverall100, idx);
    const quoteText = matchedTurn
      ? matchedTurn.text.length > 210
        ? `${matchedTurn.text.slice(0, 207)}...`
        : matchedTurn.text
      : 'Belum ada jawaban kandidat (suara maupun teks) yang terekam pada transkrip.';

    return {
      name: comp.name,
      weight: comp.weight,
      aiScore,
      rationale:
        matchedSkill?.notes ||
        (matchedTurn
          ? `Ava AI menilai penguasaan ${comp.name} pada level ${aiScore}/5 berdasarkan respons kandidat pada sesi wawancara.`
          : `Belum ada respons kandidat yang dapat dinilai untuk ${comp.name}.`),
      quote: quoteText,
      timestamp: matchedTurn?.timestamp || '--:--'
    };
  });
};

const PLACEHOLDER_QUOTE_SNIPPETS = [
  'jawaban kandidat terekam pada sesi wawancara ava ai',
  'belum ditemukan kutipan jawaban kandidat',
  'belum ada jawaban kandidat'
];

export const resolveAiCompetenciesWithTranscript = (params: {
  existing?: AiCompetencyEvidence[] | null;
  transcript?: string | null;
  applicantInterviewResult?: string | null;
  overallScore?: number | null;
}): AiCompetencyEvidence[] => {
  const rebuilt = buildAiCompetenciesFromData({
    transcript: params.transcript,
    applicantInterviewResult: params.applicantInterviewResult,
    overallScore: params.overallScore
  });

  if (!Array.isArray(params.existing) || params.existing.length === 0) {
    return rebuilt;
  }

  const segments = parseTimestampedTranscript(params.transcript);
  const candidateTurns = segments.filter((s) => s.speaker === 'Kandidat');
  const avaTexts = new Set(segments.filter((s) => s.speaker === 'Ava AI').map((s) => s.text.toLowerCase()));

  return params.existing.map((item, idx) => {
    const rawQuote = String(item?.quote || '').trim();
    const lowerQuote = rawQuote.toLowerCase();
    const isPlaceholder =
      !rawQuote ||
      PLACEHOLDER_QUOTE_SNIPPETS.some((p) => lowerQuote.includes(p)) ||
      (avaTexts.has(lowerQuote) && candidateTurns.length > 0);

    if (!isPlaceholder) {
      return item;
    }

    const replacement = rebuilt[idx] || rebuilt[0];
    return {
      ...item,
      quote: replacement?.quote || rawQuote,
      timestamp:
        replacement?.timestamp && replacement.timestamp !== '--:--'
          ? replacement.timestamp
          : item.timestamp || '--:--'
    };
  });
};

export const loadAiReviewRecordsMap = async (): Promise<Map<string, AiInterviewReviewRecord>> => {
  const rows = await prisma.masterRecord.findMany({
    where: { scope: 'ai-interview-review' }
  });
  const map = new Map<string, AiInterviewReviewRecord>();
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.value) as AiInterviewReviewRecord;
      map.set(row.key.toUpperCase(), parsed);
    } catch {
      // ignore malformed record
    }
  }
  return map;
};

export const getAiReviewRecord = async (candidateCode: string): Promise<AiInterviewReviewRecord | null> => {
  if (!candidateCode) return null;
  const row = await prisma.masterRecord.findUnique({
    where: { scope_key: { scope: 'ai-interview-review', key: candidateCode.toUpperCase() } }
  });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as AiInterviewReviewRecord;
  } catch {
    return null;
  }
};

export const saveAiReviewRecord = async (record: AiInterviewReviewRecord): Promise<AiInterviewReviewRecord> => {
  const key = record.candidateCode.toUpperCase();
  const next: AiInterviewReviewRecord = {
    ...record,
    candidateCode: key,
    updatedAt: new Date().toISOString()
  };
  await prisma.masterRecord.upsert({
    where: { scope_key: { scope: 'ai-interview-review', key } },
    update: { value: JSON.stringify(next) },
    create: { scope: 'ai-interview-review', key, value: JSON.stringify(next) }
  });
  return next;
};

export const REVIEW_STAGE_LABEL: Record<UnifiedReviewStage, string> = {
  BELUM_INTERVIEW: 'Belum Interview AI',
  PERLU_TINDAKAN: 'Perlu Tindakan',
  MENUNGGU_REVIEW: 'Menunggu Review',
  DIREVIEW: 'Direview',
  FINALISASI: 'Finalisasi',
  TERBIT: 'Terbit (E-Sign)'
};

export const deriveUnifiedReviewState = (params: {
  interviewStatus?: string | null;
  hasTranscript: boolean;
  hasAudio: boolean;
  integrityScore?: number | null;
  proctoringFlagCount?: number;
  assessorScoreStatus?: string | null; // 'draft' | 'signed' | null
  reviewRecord?: AiInterviewReviewRecord | null;
  transcriptSegmentCount?: number;
}): {
  stage: UnifiedReviewStage;
  label: string;
  needsAction: boolean;
  actionReason: string | null;
} => {
  const {
    interviewStatus,
    hasTranscript,
    hasAudio,
    integrityScore,
    proctoringFlagCount = 0,
    assessorScoreStatus,
    reviewRecord,
    transcriptSegmentCount = 0
  } = params;

  if (assessorScoreStatus === 'signed') {
    return {
      stage: 'TERBIT',
      label: REVIEW_STAGE_LABEL.TERBIT,
      needsAction: false,
      actionReason: null
    };
  }

  // Detect automatic issue conditions unless manually resolved
  let autoIssueReason: string | null = null;
  if (reviewRecord?.needsAction) {
    autoIssueReason = reviewRecord.actionReason || 'Sesi ditandai perlu tindakan manual.';
  } else if (!reviewRecord?.manualDecisionNote) {
    if (integrityScore != null && integrityScore < 70) {
      autoIssueReason = `Risiko proctoring tinggi (skor integritas ${integrityScore}%).`;
    } else if (proctoringFlagCount >= 3 && (integrityScore == null || integrityScore < 85)) {
      autoIssueReason = `Terdapat ${proctoringFlagCount} flag proctoring yang perlu verifikasi manual.`;
    } else if (interviewStatus === 'completed' && !hasTranscript && !hasAudio) {
      autoIssueReason = 'Sesi AI berakhir tanpa transkrip maupun rekaman audio (dugaan koneksi putus / mic gagal).';
    } else if (interviewStatus === 'completed' && hasTranscript && transcriptSegmentCount > 0 && transcriptSegmentCount < 2 && !hasAudio) {
      autoIssueReason = 'Transkrip terlalu singkat dan rekaman audio tidak tersedia.';
    }
  }

  if (autoIssueReason) {
    return {
      stage: 'PERLU_TINDAKAN',
      label: REVIEW_STAGE_LABEL.PERLU_TINDAKAN,
      needsAction: true,
      actionReason: autoIssueReason
    };
  }

  if (reviewRecord?.finalized && assessorScoreStatus === 'draft') {
    return {
      stage: 'FINALISASI',
      label: REVIEW_STAGE_LABEL.FINALISASI,
      needsAction: false,
      actionReason: null
    };
  }

  if (assessorScoreStatus === 'draft') {
    return {
      stage: 'DIREVIEW',
      label: REVIEW_STAGE_LABEL.DIREVIEW,
      needsAction: false,
      actionReason: null
    };
  }

  if (interviewStatus === 'completed' || hasTranscript || hasAudio) {
    return {
      stage: 'MENUNGGU_REVIEW',
      label: REVIEW_STAGE_LABEL.MENUNGGU_REVIEW,
      needsAction: false,
      actionReason: null
    };
  }

  return {
    stage: 'BELUM_INTERVIEW',
    label: REVIEW_STAGE_LABEL.BELUM_INTERVIEW,
    needsAction: false,
    actionReason: null
  };
};
