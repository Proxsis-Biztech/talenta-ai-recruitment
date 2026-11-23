import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const SCOPE_CALIBRATION = 'assessor-calibration';
export const SCOPE_LHA_VERSIONS = 'lha-versions';
export const SCOPE_LHA_CORRECTIONS = 'lha-corrections';

export interface CompetencyScoreItem {
  id?: string;
  name: string;
  weight: number;
  score: number;
  notes: string;
}

export interface SecondaryEvaluation {
  assessorId: string;
  assessorName: string;
  competencies: CompetencyScoreItem[];
  interviewScore: number;
  compositeScore: number | null;
  recommendation: 'LANJUT' | 'DIPERTIMBANGKAN' | 'TIDAK';
  notes: string;
  submittedAt: string;
}

export interface CalibrationConsensus {
  mode: 'average' | 'primary' | 'secondary' | 'custom';
  calibratedBy: string;
  calibratedById: string;
  calibratedAt: string;
  competencies: CompetencyScoreItem[];
  interviewScore: number;
  compositeScore: number | null;
  recommendation: 'LANJUT' | 'DIPERTIMBANGKAN' | 'TIDAK';
  notes: string;
}

export interface CalibrationRecord {
  candidateCode: string;
  candidateName: string;
  programTitle: string;
  tenantId?: string | null;
  secondary: SecondaryEvaluation | null;
  consensus: CalibrationConsensus | null;
}

export interface LhaVersionSnapshot {
  version: number;
  lhaNumber: string | null;
  lhaHash: string | null;
  signedAt: string | null;
  competencies: CompetencyScoreItem[];
  interviewScore: number;
  compositeScore: number | null;
  recommendation: string;
  notes: string | null;
  assessorName: string | null;
  archivedAt: string;
  reason?: string;
  approvedBy?: string;
}

export interface LhaVersionHistoryRecord {
  candidateCode: string;
  programTitle: string;
  currentVersion: number;
  history: LhaVersionSnapshot[];
}

export interface LhaCorrectionRequest {
  id: string;
  scoreId: string;
  candidateCode: string;
  candidateName: string;
  programTitle: string;
  programCode?: string | null;
  tenantId?: string | null;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  currentVersion: number;
  currentSnapshot: {
    lhaNumber: string | null;
    lhaHash: string | null;
    signedAt: string | null;
    competencies: CompetencyScoreItem[];
    interviewScore: number;
    compositeScore: number | null;
    recommendation: string;
    notes: string | null;
  };
  proposed: {
    competencies: CompetencyScoreItem[];
    interviewScore: number;
    compositeScore: number | null;
    recommendation: 'LANJUT' | 'DIPERTIMBANGKAN' | 'TIDAK';
    notes: string;
  };
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  resultingVersion?: number;
  resultingLhaNumber?: string;
}

export const normalizeGovernanceKey = (candidateCode: string, programTitle?: string | null): string =>
  `${candidateCode.trim().toUpperCase()}::${String(programTitle || 'DEFAULT').trim().toUpperCase()}`;

export const parseGovernanceJson = <T>(raw: string | null | undefined, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export async function getCalibrationRecord(
  candidateCode: string,
  programTitle?: string | null
): Promise<CalibrationRecord | null> {
  const exactKey = normalizeGovernanceKey(candidateCode, programTitle);
  const exact = await prisma.masterRecord.findUnique({
    where: { scope_key: { scope: SCOPE_CALIBRATION, key: exactKey } }
  });
  if (exact) return parseGovernanceJson<CalibrationRecord | null>(exact.value, null);

  const prefix = `${candidateCode.trim().toUpperCase()}::`;
  const all = await prisma.masterRecord.findMany({ where: { scope: SCOPE_CALIBRATION } });
  const matched = all.find((r) => r.key.startsWith(prefix));
  return matched ? parseGovernanceJson<CalibrationRecord | null>(matched.value, null) : null;
}

export async function saveCalibrationRecord(record: CalibrationRecord): Promise<CalibrationRecord> {
  const key = normalizeGovernanceKey(record.candidateCode, record.programTitle);
  await prisma.masterRecord.upsert({
    where: { scope_key: { scope: SCOPE_CALIBRATION, key } },
    update: { value: JSON.stringify(record) },
    create: { scope: SCOPE_CALIBRATION, key, value: JSON.stringify(record) }
  });
  return record;
}

export async function listCalibrationRecords(): Promise<CalibrationRecord[]> {
  const records = await prisma.masterRecord.findMany({ where: { scope: SCOPE_CALIBRATION } });
  return records
    .map((r) => parseGovernanceJson<CalibrationRecord | null>(r.value, null))
    .filter((item): item is CalibrationRecord => Boolean(item));
}

export function computeCalibrationMetrics(
  primary: {
    competencies: CompetencyScoreItem[];
    interviewScore: number;
    compositeScore: number | null;
    recommendation: string;
  } | null,
  secondary: SecondaryEvaluation | null
) {
  if (!primary && !secondary) {
    return {
      status: 'belum_dinilai' as const,
      maxCompetencyDelta: 0,
      interviewDelta: 0,
      compositeDelta: 0,
      recommendationMatch: true,
      competencyComparison: [] as Array<{
        name: string;
        primaryScore: number | null;
        secondaryScore: number | null;
        delta: number | null;
      }>
    };
  }
  if (!primary || !secondary) {
    return {
      status: secondary ? ('menunggu_penilai_1' as const) : ('menunggu_penilai_2' as const),
      maxCompetencyDelta: 0,
      interviewDelta: 0,
      compositeDelta: 0,
      recommendationMatch: true,
      competencyComparison: (primary?.competencies || secondary?.competencies || []).map((c) => ({
        name: c.name,
        primaryScore: primary ? c.score : null,
        secondaryScore: secondary ? c.score : null,
        delta: null
      }))
    };
  }

  const pComps = primary.competencies || [];
  const sComps = secondary.competencies || [];
  const names = Array.from(new Set([...pComps.map((c) => c.name), ...sComps.map((c) => c.name)]));
  const competencyComparison = names.map((name) => {
    const p = pComps.find((c) => c.name.toLowerCase() === name.toLowerCase());
    const s = sComps.find((c) => c.name.toLowerCase() === name.toLowerCase());
    const pScore = typeof p?.score === 'number' ? p.score : null;
    const sScore = typeof s?.score === 'number' ? s.score : null;
    const delta =
      pScore !== null && sScore !== null ? Math.round(Math.abs(pScore - sScore) * 10) / 10 : null;
    return { name, primaryScore: pScore, secondaryScore: sScore, delta };
  });

  const maxCompetencyDelta = competencyComparison.reduce(
    (max, item) => (item.delta !== null && item.delta > max ? item.delta : max),
    0
  );
  const interviewDelta = Math.round(Math.abs(primary.interviewScore - secondary.interviewScore) * 10) / 10;
  const compositeDelta =
    primary.compositeScore !== null && secondary.compositeScore !== null
      ? Math.round(Math.abs(primary.compositeScore - secondary.compositeScore) * 10) / 10
      : 0;
  const recommendationMatch = primary.recommendation === secondary.recommendation;
  const needsCalibration = maxCompetencyDelta >= 1.0 || interviewDelta >= 12 || !recommendationMatch;

  return {
    status: needsCalibration ? ('perlu_kalibrasi' as const) : ('selaras' as const),
    maxCompetencyDelta,
    interviewDelta,
    compositeDelta,
    recommendationMatch,
    competencyComparison
  };
}

export async function getLhaVersionMeta(
  candidateCode: string,
  programTitle?: string | null
): Promise<LhaVersionHistoryRecord> {
  const exactKey = normalizeGovernanceKey(candidateCode, programTitle);
  const exact = await prisma.masterRecord.findUnique({
    where: { scope_key: { scope: SCOPE_LHA_VERSIONS, key: exactKey } }
  });
  if (exact) {
    return parseGovernanceJson<LhaVersionHistoryRecord>(exact.value, {
      candidateCode,
      programTitle: programTitle || '',
      currentVersion: 1,
      history: []
    });
  }
  const prefix = `${candidateCode.trim().toUpperCase()}::`;
  const all = await prisma.masterRecord.findMany({ where: { scope: SCOPE_LHA_VERSIONS } });
  const matched = all.find((r) => r.key.startsWith(prefix));
  if (matched) {
    return parseGovernanceJson<LhaVersionHistoryRecord>(matched.value, {
      candidateCode,
      programTitle: programTitle || '',
      currentVersion: 1,
      history: []
    });
  }
  return {
    candidateCode,
    programTitle: programTitle || '',
    currentVersion: 1,
    history: []
  };
}

export async function saveLhaVersionMeta(meta: LhaVersionHistoryRecord): Promise<LhaVersionHistoryRecord> {
  const key = normalizeGovernanceKey(meta.candidateCode, meta.programTitle);
  await prisma.masterRecord.upsert({
    where: { scope_key: { scope: SCOPE_LHA_VERSIONS, key } },
    update: { value: JSON.stringify(meta) },
    create: { scope: SCOPE_LHA_VERSIONS, key, value: JSON.stringify(meta) }
  });
  return meta;
}

export async function createLhaCorrectionRequest(
  reqData: Omit<LhaCorrectionRequest, 'id' | 'requestedAt' | 'status'>
): Promise<LhaCorrectionRequest> {
  const id = `corr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const full: LhaCorrectionRequest = {
    ...reqData,
    id,
    requestedAt: new Date().toISOString(),
    status: 'pending'
  };
  await prisma.masterRecord.upsert({
    where: { scope_key: { scope: SCOPE_LHA_CORRECTIONS, key: id } },
    update: { value: JSON.stringify(full) },
    create: { scope: SCOPE_LHA_CORRECTIONS, key: id, value: JSON.stringify(full) }
  });
  return full;
}

export async function listLhaCorrectionRequests(filter?: {
  tenantId?: string | null;
  candidateCode?: string;
}): Promise<LhaCorrectionRequest[]> {
  const records = await prisma.masterRecord.findMany({ where: { scope: SCOPE_LHA_CORRECTIONS } });
  return records
    .map((r) => parseGovernanceJson<LhaCorrectionRequest | null>(r.value, null))
    .filter((item): item is LhaCorrectionRequest => Boolean(item))
    .filter((item) => {
      if (filter?.tenantId && item.tenantId && item.tenantId !== filter.tenantId) return false;
      if (filter?.candidateCode && item.candidateCode !== filter.candidateCode) return false;
      return true;
    })
    .sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt));
}

export async function getLhaCorrectionRequestById(id: string): Promise<LhaCorrectionRequest | null> {
  const record = await prisma.masterRecord.findUnique({
    where: { scope_key: { scope: SCOPE_LHA_CORRECTIONS, key: id } }
  });
  return record ? parseGovernanceJson<LhaCorrectionRequest | null>(record.value, null) : null;
}

export async function saveLhaCorrectionRequest(reqData: LhaCorrectionRequest): Promise<LhaCorrectionRequest> {
  await prisma.masterRecord.upsert({
    where: { scope_key: { scope: SCOPE_LHA_CORRECTIONS, key: reqData.id } },
    update: { value: JSON.stringify(reqData) },
    create: { scope: SCOPE_LHA_CORRECTIONS, key: reqData.id, value: JSON.stringify(reqData) }
  });
  return reqData;
}
