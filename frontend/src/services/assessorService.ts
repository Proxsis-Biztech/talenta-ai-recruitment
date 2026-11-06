import axios from 'axios';
import { getPortalToken } from './portalAuthService';

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
  examStatus: string;
  submittedAt: string | null;
  interviewStatus: string;
  interviewScore: number | null;
  scheduledAt: string | null;
  calledAt: string | null;
  completedAt: string | null;
  assessorName: string | null;
  recommendation: string | null;
  lhaStatus: string | null;
  lhaNumber: string | null;
  signedAt: string | null;
}

export interface AssessorProctoringEvent {
  id: string;
  time: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  status: 'pending' | 'valid' | 'false_positive';
  assessorNotes: string;
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