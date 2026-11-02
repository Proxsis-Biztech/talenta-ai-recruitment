export interface CandidateDirectoryEntry {
  code: string;
  name: string;
  email: string;
  pt: string;
  program: string;
  catScore: number;
  defaultInterviewScore: number;
  defaultRecommendation: 'LANJUT' | 'DIPERTIMBANGKAN' | 'TIDAK';
  defaultVerifiedDate: string;
}

export interface AssessorScoreRecord {
  candidateCode: string;
  candidateName: string;
  program: string;
  interviewScore: number;
  compositeScore: number;
  recommendation: 'LANJUT' | 'DIPERTIMBANGKAN' | 'TIDAK';
  assessor: string;
  assessorTitle: string;
  verifiedDate: string;
  updatedAt: string;
  competencies: { name: string; weight: number; score: number; notes: string }[];
}

const STORAGE_KEY = 'talenta_asesor_scores_v1';
const ASSESSOR_NAME = 'Dr. Ir. Dwi Hartanto, M.T.';
const ASSESSOR_TITLE = 'Lead Assessor (SIPP No. 042/SAI-HIMPSI/2026)';

export const CANDIDATE_DIRECTORY: CandidateDirectoryEntry[] = [
  {
    code: 'KND-0891',
    name: 'Farhan Pratama',
    email: 'farhan.pratama@gmail.com',
    pt: 'PT Telkom Indonesia',
    program: 'Software Engineer Specialist Batch IV',
    catScore: 88,
    defaultInterviewScore: 86.2,
    defaultRecommendation: 'LANJUT',
    defaultVerifiedDate: '28 Okt 2026'
  },
  {
    code: 'KND-0892',
    name: 'Amanda Nurul',
    email: 'amanda.nurul@outlook.com',
    pt: 'PT Telkom Indonesia',
    program: 'Software Engineer Specialist Batch IV',
    catScore: 79,
    defaultInterviewScore: 74,
    defaultRecommendation: 'DIPERTIMBANGKAN',
    defaultVerifiedDate: '28 Okt 2026'
  },
  {
    code: 'KND-0893',
    name: 'Reza Fauzi',
    email: 'reza.fauzi@corp.id',
    pt: 'PT Astra International',
    program: 'Data Architecture Specialist',
    catScore: 84,
    defaultInterviewScore: 80.5,
    defaultRecommendation: 'LANJUT',
    defaultVerifiedDate: '27 Okt 2026'
  },
  {
    code: 'KND-0894',
    name: 'Dewi Lestari',
    email: 'dewi.lestari@tech.co',
    pt: 'PT Bank Mandiri',
    program: 'Product Management Fellow',
    catScore: 91,
    defaultInterviewScore: 88.4,
    defaultRecommendation: 'LANJUT',
    defaultVerifiedDate: '27 Okt 2026'
  },
  {
    code: 'KND-0895',
    name: 'Budi Santoso',
    email: 'budi.santoso@example.com',
    pt: 'PT Bank CIMB Niaga',
    program: 'Software Engineer Specialist Batch IV',
    catScore: 92,
    defaultInterviewScore: 90.5,
    defaultRecommendation: 'LANJUT',
    defaultVerifiedDate: '26 Okt 2026'
  }
];

export const FALLBACK_CANDIDATE: CandidateDirectoryEntry = CANDIDATE_DIRECTORY[0];

export function getCandidateByCode(code?: string): CandidateDirectoryEntry {
  if (!code) return FALLBACK_CANDIDATE;
  return CANDIDATE_DIRECTORY.find((c) => c.code.toLowerCase() === code.toLowerCase()) || FALLBACK_CANDIDATE;
}

export function loadAssessorScores(): Record<string, AssessorScoreRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveAssessorScore(record: AssessorScoreRecord): void {
  try {
    const all = loadAssessorScores();
    all[record.candidateCode] = record;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Gagal menyimpan penilaian asesor:', e);
  }
}

export function getAssessorScore(candidateCode: string): AssessorScoreRecord | undefined {
  return loadAssessorScores()[candidateCode];
}

export function calculateCompositeScore(catScore: number, interviewScore: number): number {
  return Math.round((catScore * 0.4 + interviewScore * 0.6) * 10) / 10;
}

export function formatToday(): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date());
}

export { ASSESSOR_NAME, ASSESSOR_TITLE };
