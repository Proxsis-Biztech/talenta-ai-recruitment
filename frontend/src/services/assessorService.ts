import axios from 'axios';
import { getPortalToken } from './portalAuthService';

export interface AssessorEssayAnswer {
  questionId: string;
  orderNo: number;
  prompt: string;
  answer: string;
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
