import axios from 'axios';
import { getPortalToken } from './portalAuthService';

export interface AssessorEssayAnswer {
  questionId: string;
  orderNo: number;
  prompt: string;
  answer: string;
}

export interface AiCompetencyEvidence {
  name: string;
  weight: number;
  aiScore: number;
  rationale: string;
  quote: string;
  timestamp: string;
}

export interface TranscriptSegment {
  timestamp: string;
  speaker: 'Ava AI' | 'Kandidat' | 'Sistem';
  text: string;
}

export interface AssessorCandidateRecordingMeta {
  id: string;
  kind: string;
  fileName: string | null;
  mimeType: string | null;
  durationSec: number | null;
  createdAt: string;
}

export interface AssessorCatQuestionItem {
  id: string;
  orderNo: number;
  type: string;
  competency: string;
  difficulty: string;
  text: string;
  codeSnippet: string | null;
  options: Array<{ key: string; label: string }>;
  candidateAnswer: unknown;
  correctAnswer: unknown;
  isCorrect: boolean | null;
}

export interface AssessorCatDetails {
  programCode: string;
  status: string;
  score: number | null;
  integrityScore: number | null;
  startedAt: string | null;
  submittedAt: string | null;
  competencyScores: Array<{ name: string; score: number; max?: number; weight?: string }>;
  questions: AssessorCatQuestionItem[];
}

export interface AssessorLiveCodingSubmission {
  userId: string;
  candidateCode?: string | null;
  programCode: string;
  problemId: string;
  problemTitle: string;
  language: string;
  code: string;
  score: number;
  passedTests: number;
  totalTests: number;
  statusLabel: string;
  completed: boolean;
  submittedAt: string;
}

export interface AssessorCandidate {
  id: string;
  code: string;
  candidateCode: string | null;
  name: string;
  email: string;
  company: string;
  program: string;
  programCode: string | null;
  catScore: number | null;
  catStatus?: 'selesai' | 'sedang' | 'belum';
  catStartedAt?: string | null;
  catSubmittedAt?: string | null;
  catAnsweredCount?: number;
  catTotalQuestions?: number | null;
  liveCodingStatus?: 'selesai' | 'sedang' | 'belum';
  liveCodingScore?: number | null;
  liveCodingProblemTitle?: string | null;
  liveCodingLanguage?: string | null;
  liveCodingSubmittedAt?: string | null;
  interviewDone?: boolean;
  barsAverage?: number | null;
  gpaScore?: number | null;
  catDetails?: AssessorCatDetails | null;
  liveCodingSubmission?: AssessorLiveCodingSubmission | null;
  integrityScore: number | null;
  proctoringFlagCount?: number;
  examStatus: string;
  submittedAt: string | null;
  interviewStatus: string;
  interviewScore: number | null;
  compositeScore?: number | null;
  scheduledAt: string | null;
  calledAt: string | null;
  completedAt: string | null;
  assessorName: string | null;
  recommendation: string | null;
  lhaStatus: string | null;
  lhaNumber: string | null;
  lhaHash?: string | null;
  signedAt: string | null;
  assessorNotes?: string | null;
  isTestAccount?: boolean;
  reviewStage?: 'BELUM_INTERVIEW' | 'PERLU_TINDAKAN' | 'MENUNGGU_REVIEW' | 'DIREVIEW' | 'FINALISASI' | 'TERBIT';
  reviewStageLabel?: string;
  needsAction?: boolean;
  actionReason?: string | null;
  hasAudioRecording?: boolean;
  audioRecordingId?: string | null;
  hasTranscript?: boolean;
  transcriptText?: string | null;
  transcriptSegments?: TranscriptSegment[];
  recordings?: AssessorCandidateRecordingMeta[];
  interviewDurationSec?: number | null;
  isCalibrationSample?: boolean;
  aiCompetencies?: AiCompetencyEvidence[];
  aiSummary?: string | null;
  aiOverrideReason?: string | null;
  finalized?: boolean;
  competencies?: Array<{ name: string; weight: number; score: number; notes?: string }>;
  essayAnswers?: AssessorEssayAnswer[];
}

export interface AssessorProctoringEvent {
  id: string;
  time: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  status: 'pending' | 'valid' | 'false_positive' | 'info';
  assessorNotes: string;
  snapshotUrl?: string | null;
}

const authHeaders = () => {
  const token = getPortalToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchAssessorCandidates = async (params?: {
  search?: string;
  programCode?: string;
}): Promise<AssessorCandidate[]> => {
  const response = await axios.get('/api/asesor/candidates', {
    headers: authHeaders(),
    params
  });
  return response.data?.data || [];
};

export const fetchAssessorCandidate = async (
  code: string
): Promise<AssessorCandidate | null> => {
  try {
    const response = await axios.get(
      `/api/asesor/candidates/${encodeURIComponent(code)}`,
      { headers: authHeaders() }
    );
    return response.data?.data || null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
};

export const fetchAssessorProctoring = async (
  code: string
): Promise<AssessorProctoringEvent[]> => {
  const response = await axios.get(
    `/api/asesor/candidates/${encodeURIComponent(code)}/proctoring`,
    { headers: authHeaders() }
  );
  return response.data?.data || [];
};

export const fetchAssessorProctoringSummary = async (
  code: string
): Promise<{ events: AssessorProctoringEvent[]; integrityScore: number | null }> => {
  const response = await axios.get(
    `/api/asesor/candidates/${encodeURIComponent(code)}/proctoring`,
    { headers: authHeaders() }
  );
  return {
    events: response.data?.data || [],
    integrityScore:
      typeof response.data?.integrityScore === 'number'
        ? response.data.integrityScore
        : null
  };
};

export const fetchAssessorScoreByCode = async (
  code: string,
  programTitle?: string | null
): Promise<any | null> => {
  try {
    const response = await axios.get(`/api/asesor/scores/${encodeURIComponent(code)}`, {
      params: programTitle ? { programTitle } : undefined,
      headers: authHeaders()
    });
    return response.data?.data || null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
};

export const submitAssessorSessionAction = async (
  candidateCode: string,
  payload: {
    action: 'reschedule' | 'resolve_manual' | 'flag_issue' | 'toggle_calibration';
    reason?: string;
    scheduledAt?: string;
  }
) => {
  const response = await axios.post(
    `/api/asesor/candidates/${encodeURIComponent(candidateCode)}/session-action`,
    payload,
    { headers: authHeaders() }
  );
  return response.data?.data;
};

export const fetchRecordingAudioBlobUrl = async (recordingId: string): Promise<string> => {
  const response = await axios.get(`/api/portal/recordings/${encodeURIComponent(recordingId)}/file`, {
    headers: authHeaders(),
    responseType: 'blob'
  });
  return URL.createObjectURL(response.data);
};
