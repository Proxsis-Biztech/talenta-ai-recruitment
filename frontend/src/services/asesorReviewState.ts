import type { AssessorCandidate } from './assessorService';

export type UnifiedReviewStage =
  | 'BELUM_INTERVIEW'
  | 'PERLU_TINDAKAN'
  | 'MENUNGGU_REVIEW'
  | 'DIREVIEW'
  | 'FINALISASI'
  | 'TERBIT';

export interface ReviewStageMeta {
  stage: UnifiedReviewStage;
  label: string;
  badgeVariant: 'teal' | 'navy' | 'success' | 'warning' | 'danger' | 'neutral' | 'outline';
  sortOrder: number;
}

export const UNIFIED_STAGE_META: Record<UnifiedReviewStage, ReviewStageMeta> = {
  PERLU_TINDAKAN: {
    stage: 'PERLU_TINDAKAN',
    label: 'Perlu Tindakan',
    badgeVariant: 'danger',
    sortOrder: 0
  },
  MENUNGGU_REVIEW: {
    stage: 'MENUNGGU_REVIEW',
    label: 'Menunggu Review',
    badgeVariant: 'warning',
    sortOrder: 1
  },
  DIREVIEW: {
    stage: 'DIREVIEW',
    label: 'Direview',
    badgeVariant: 'navy',
    sortOrder: 2
  },
  FINALISASI: {
    stage: 'FINALISASI',
    label: 'Finalisasi',
    badgeVariant: 'teal',
    sortOrder: 3
  },
  TERBIT: {
    stage: 'TERBIT',
    label: 'Terbit (E-Sign)',
    badgeVariant: 'success',
    sortOrder: 4
  },
  BELUM_INTERVIEW: {
    stage: 'BELUM_INTERVIEW',
    label: 'Belum Interview AI',
    badgeVariant: 'neutral',
    sortOrder: 5
  }
};

export function resolveCandidateReviewStage(c?: Partial<AssessorCandidate> | null): ReviewStageMeta {
  if (!c) return UNIFIED_STAGE_META.BELUM_INTERVIEW;
  if (c.reviewStage && UNIFIED_STAGE_META[c.reviewStage]) {
    return UNIFIED_STAGE_META[c.reviewStage];
  }
  if (c.lhaStatus === 'signed') return UNIFIED_STAGE_META.TERBIT;
  if (c.needsAction) return UNIFIED_STAGE_META.PERLU_TINDAKAN;
  if (c.finalized && c.recommendation) return UNIFIED_STAGE_META.FINALISASI;
  if (c.recommendation) return UNIFIED_STAGE_META.DIREVIEW;
  if (c.interviewStatus === 'completed' || c.hasTranscript || c.hasAudioRecording || c.interviewScore != null) {
    return UNIFIED_STAGE_META.MENUNGGU_REVIEW;
  }
  return UNIFIED_STAGE_META.BELUM_INTERVIEW;
}
