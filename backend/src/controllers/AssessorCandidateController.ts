import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';
import { isCandidateInAssessorScope, resolveAssessorScopeContext } from '../middleware/tenant';
import { recordAuditLog, resolveRequestIp } from '../services/auditService';
import {
  deriveUnifiedReviewState,
  getAiReviewRecord,
  isDeterministicCalibrationSample,
  loadAiReviewRecordsMap,
  parseTimestampedTranscript,
  resolveAiCompetenciesWithTranscript,
  saveAiReviewRecord,
  type AiInterviewReviewRecord
} from '../services/reviewWorkflowService';

const prisma = new PrismaClient();

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const candidateSelect = {
  id: true,
  name: true,
  email: true,
  candidateCode: true,
  companyId: true,
  companyName: true,
  tenantId: true,
  tenant: { select: { name: true } },
  assessmentId: true,
  assessmentTitle: true,
  interviewStatus: true,
  interviewScheduledAt: true,
  interviewCalledAt: true,
  interviewCompletedAt: true,
  interviewScore: true,
  assessorName: true,
  examAttempts: {
    select: {
      programCode: true,
      status: true,
      score: true,
      integrityScore: true,
      startedAt: true,
      submittedAt: true,
      competencyScores: true,
      answers: true,
      violations: true
    }
  }
} as const;

interface CandidateAssessorScoreRow {
  candidateCode: string;
  candidateName: string;
  programCode: string | null;
  programTitle: string;
  competencies?: string;
  interviewScore: number;
  compositeScore: number;
  recommendation: string;
  notes: string | null;
  status: string;
  lhaHash: string | null;
  lhaNumber: string | null;
  signedAt: Date | null;
  updatedAt: Date;
  assessor?: { name: string } | null;
}

const pickBestScore = (scores: CandidateAssessorScoreRow[]): CandidateAssessorScoreRow | null => {
  if (!scores || scores.length === 0) return null;
  return [...scores].sort((a, b) => {
    if (a.status === 'signed' && b.status !== 'signed') return -1;
    if (b.status === 'signed' && a.status !== 'signed') return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  })[0];
};

const latestAttempt = (
  attempts: Array<{
    programCode: string;
    status: string;
    score: number | null;
    integrityScore: number | null;
    startedAt?: Date | null;
    submittedAt: Date | null;
    competencyScores?: string | null;
    answers?: string;
    violations?: string | null;
  }>,
  preferredProgramCode?: string | null
) => {
  const pref = String(preferredProgramCode || '').trim().toUpperCase();
  const isDone = (item: { status: string; submittedAt: Date | null }) =>
    ['submitted', 'graded', 'completed'].includes(item.status) || Boolean(item.submittedAt);

  return [...attempts].sort((a, b) => {
    const aPref = pref && String(a.programCode || '').toUpperCase() === pref ? 1 : 0;
    const bPref = pref && String(b.programCode || '').toUpperCase() === pref ? 1 : 0;
    const aDone = isDone(a) ? 1 : 0;
    const bDone = isDone(b) ? 1 : 0;
    if (aDone !== bDone) return bDone - aDone;
    if (aPref !== bPref) return bPref - aPref;
    const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return bTime - aTime;
  })[0];
};

const isTestAccountUser = (user: { email?: string | null; candidateCode?: string | null; name?: string | null }) => {
  const email = String(user.email || '').toLowerCase().trim();
  const localPart = email.split('@')[0] || '';
  const code = String(user.candidateCode || '').toUpperCase().trim();
  const name = String(user.name || '').trim();
  return (
    email.endsWith('@right.id') ||
    email.endsWith('@kandidat.id') ||
    code.startsWith('KND-UAT-') ||
    /\b(uji|qc|test|uat|dummy|demo|sandbox|akunsatu|akun\s*satu|akundua|akun\s*dua)\b/i.test(name) ||
    /^(akunsatu|akundua|akuntiga|akun\d+|peserta\s*\d+|test\d*|uat[-_\d]*)$/i.test(name) ||
    /^(akunsatu|akundua|akuntiga|akun\d+|peserta\d+|test\d*|uat[-_\d]*)$/i.test(localPart)
  );
};

const countNonPeriodicEvents = (jsonStr: string | null | undefined): number => {
  const parsed = parseJson<unknown[]>(jsonStr, []);
  if (!Array.isArray(parsed)) return 0;
  return parsed.filter((item: any) => {
    const type = String(item?.type || '');
    return type !== 'PERIODIC_SNAPSHOT' && type !== 'face_verified' && type !== 'VERIFIKASI_BERKALA';
  }).length;
};

interface RecordingMeta {
  id: string;
  kind: string;
  fileName: string | null;
  mimeType: string | null;
  durationSec: number | null;
  transcript: string | null;
  createdAt: Date;
}

interface LiveCodingMeta {
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

const computeBarsAndGpa = (rawCompetencies: string | any[] | null | undefined) => {
  const list =
    typeof rawCompetencies === 'string'
      ? parseJson<any[]>(rawCompetencies, [])
      : Array.isArray(rawCompetencies)
        ? rawCompetencies
        : [];
  const scored = list.filter((c) => typeof c?.score === 'number' && c.score > 0);
  if (scored.length === 0) return { barsAverage: null as number | null, gpaScore: null as number | null };
  const totalWeight = list.reduce((sum, c) => sum + (Number(c?.weight) || 0), 0);
  const barsAvg =
    totalWeight > 0
      ? list.reduce((sum, c) => sum + ((Number(c?.score) || 0) * (Number(c?.weight) || 0)) / totalWeight, 0)
      : scored.reduce((sum, c) => sum + (Number(c?.score) || 0), 0) / scored.length;
  const roundedBars = Math.round(barsAvg * 100) / 100;
  const gpaScore = Math.round((roundedBars / 5) * 4 * 100) / 100;
  return { barsAverage: roundedBars, gpaScore };
};

const countAnsweredItems = (answersJson: string | null | undefined): number => {
  const parsed = parseJson<Record<string, unknown>>(answersJson, {});
  return Object.values(parsed || {}).filter((value) => {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(Boolean);
    return true;
  }).length;
};

const serializeCandidate = (
  user: any,
  score: CandidateAssessorScoreRow | null = null,
  applicantData: {
    proctorFlags?: string | null;
    interviewTranscript?: string | null;
    interviewResult?: string | null;
    interviewScore?: number | null;
  } | null = null,
  recordings: RecordingMeta[] = [],
  reviewRecord: AiInterviewReviewRecord | null = null,
  liveCoding: LiveCodingMeta | null = null,
  questionCountMap: Map<string, number> = new Map()
) => {
  const attempt = latestAttempt(user.examAttempts || [], user.assessmentId);
  const violationCount =
    countNonPeriodicEvents(attempt?.violations) +
    countNonPeriodicEvents(applicantData?.proctorFlags);
  const proctoringFlagCount =
    violationCount > 0
      ? violationCount
      : attempt?.integrityScore != null && attempt.integrityScore < 100
        ? 1
        : 0;

  const audioRecording = recordings.find((r) => r.kind === 'audio' && r.fileName) || null;
  const transcriptRecord =
    recordings.find((r) => r.kind === 'transcript' && r.transcript && r.transcript.trim()) ||
    recordings.find((r) => Boolean(r.transcript && r.transcript.trim())) ||
    null;
  const transcriptText = transcriptRecord?.transcript || applicantData?.interviewTranscript || null;
  const transcriptSegments = parseTimestampedTranscript(transcriptText);
  const hasAudio = Boolean(audioRecording);
  const hasTranscript = Boolean(transcriptText && transcriptText.trim().length > 0);
  const codeKey = String(user.candidateCode || user.id.slice(0, 8)).toUpperCase();
  const programKey = String(attempt?.programCode || user.assessmentId || '').trim().toUpperCase();

  const catStatus: 'selesai' | 'sedang' | 'belum' =
    attempt && (['submitted', 'graded', 'completed'].includes(attempt.status) || Boolean(attempt.submittedAt))
      ? 'selesai'
      : attempt?.status === 'in_progress'
        ? 'sedang'
        : 'belum';
  const catAnsweredCount = attempt ? countAnsweredItems(attempt.answers) : 0;
  const catTotalQuestions = programKey ? questionCountMap.get(programKey) ?? null : null;

  const liveCodingStatus: 'selesai' | 'sedang' | 'belum' = liveCoding
    ? liveCoding.completed
      ? 'selesai'
      : 'sedang'
    : 'belum';
  const interviewDone = Boolean(
    user.interviewStatus === 'completed' ||
      user.interviewStatus === 'scored' ||
      hasTranscript ||
      hasAudio ||
      user.interviewScore != null ||
      applicantData?.interviewScore != null
  );
  const { barsAverage, gpaScore } = computeBarsAndGpa(score?.competencies);

  const unified = deriveUnifiedReviewState({
    interviewStatus: user.interviewStatus,
    hasTranscript,
    hasAudio,
    integrityScore: attempt?.integrityScore ?? null,
    proctoringFlagCount,
    assessorScoreStatus: score?.status ?? null,
    reviewRecord,
    transcriptSegmentCount: transcriptSegments.length
  });

  const aiCompetencies =
    reviewRecord?.aiCompetencies?.length ||
    hasTranscript ||
    applicantData?.interviewResult ||
    user.interviewScore != null
      ? resolveAiCompetenciesWithTranscript({
          existing: reviewRecord?.aiCompetencies ?? null,
          transcript: transcriptText,
          applicantInterviewResult: applicantData?.interviewResult,
          overallScore: user.interviewScore ?? applicantData?.interviewScore ?? null
        })
      : [];

  return {
    id: user.id,
    code: user.candidateCode || user.id.slice(0, 8),
    candidateCode: user.candidateCode,
    name: user.name,
    email: user.email,
    company: user.companyName || '-',
    program: user.assessmentTitle || attempt?.programCode || '-',
    programCode: user.assessmentId || attempt?.programCode || null,
    catScore: attempt?.score ?? null,
    catStatus,
    catStartedAt: (attempt as any)?.startedAt ?? null,
    catSubmittedAt: attempt?.submittedAt ?? null,
    catAnsweredCount,
    catTotalQuestions,
    liveCodingStatus,
    liveCodingScore: liveCoding?.score ?? null,
    liveCodingProblemTitle: liveCoding?.problemTitle ?? null,
    liveCodingLanguage: liveCoding?.language ?? null,
    liveCodingSubmittedAt: liveCoding?.submittedAt ?? null,
    interviewDone,
    barsAverage,
    gpaScore,
    integrityScore: attempt?.integrityScore ?? null,
    proctoringFlagCount,
    examStatus: attempt?.status || 'not_started',
    submittedAt: attempt?.submittedAt || null,
    interviewStatus: user.interviewStatus,
    interviewScore: score?.interviewScore ?? user.interviewScore ?? null,
    compositeScore: score?.compositeScore ?? null,
    scheduledAt: user.interviewScheduledAt,
    calledAt: user.interviewCalledAt,
    completedAt: user.interviewCompletedAt,
    assessorName: score?.assessor?.name || user.assessorName || null,
    recommendation: score?.recommendation ?? null,
    lhaStatus: score?.status ?? null,
    lhaNumber: score?.lhaNumber ?? null,
    lhaHash: score?.lhaHash ?? null,
    signedAt: score?.signedAt ?? null,
    assessorNotes: score?.notes ?? null,
    isTestAccount: isTestAccountUser(user),
    reviewStage: unified.stage,
    reviewStageLabel: unified.label,
    needsAction: unified.needsAction,
    actionReason: unified.actionReason,
    hasAudioRecording: hasAudio,
    audioRecordingId: audioRecording?.id ?? null,
    hasTranscript,
    interviewDurationSec: audioRecording?.durationSec ?? transcriptRecord?.durationSec ?? null,
    isCalibrationSample:
      reviewRecord?.isCalibrationSample ?? isDeterministicCalibrationSample(codeKey),
    aiCompetencies,
    aiSummary: reviewRecord?.aiSummary || null,
    aiOverrideReason: reviewRecord?.aiOverrideReason || null,
    finalized: Boolean(reviewRecord?.finalized)
  };
};

const severityFor = (type: string): 'high' | 'medium' | 'low' => {
  const normalized = String(type || '').toLowerCase();
  if (
    normalized.includes('face_verified') ||
    normalized.includes('face verified') ||
    normalized.includes('verifikasi wajah') ||
    normalized.includes('periodic_snapshot') ||
    normalized.includes('uniform_cadence')
  ) {
    return 'low';
  }
  if (
    ['face_missing', 'multi_face', 'identity_mismatch', 'second_voice', 'multi', 'tab', 'fullscreen', 'devtools', 'blur', 'hidden', 'leave', 'virtual_camera'].some((key) =>
      normalized.includes(key)
    )
  ) {
    return 'high';
  }
  if (['noise', 'voice', 'looking', 'gaze', 'copy', 'paste', 'rapid_response'].some((key) => normalized.includes(key))) {
    return 'medium';
  }
  return 'low';
};

const formatEventTime = (value: unknown): string => {
  if (!value) return '-';
  const date = new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const listAssessorCandidates = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi asesor tidak valid.' });
    const scopeCtx = await resolveAssessorScopeContext(req.portalUser, prisma);
    const search = String(req.query.search || '').trim();
    const programCode = String(req.query.programCode || '').trim().toUpperCase();

    const allUsers = await prisma.portalUser.findMany({
      where: {
        role: 'peserta',
        status: 'Aktif',
        ...(programCode ? { assessmentId: programCode } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { candidateCode: { contains: search, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      orderBy: [
        { interviewScheduledAt: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' }
      ],
      select: candidateSelect
    });

    const users = allUsers.filter((u) => isCandidateInAssessorScope(scopeCtx, u));

    const userIds = users.map((u) => u.id).filter(Boolean);
    const codes = users
      .map((u) => u.candidateCode || u.id.slice(0, 8))
      .filter(Boolean);
    const emails = users.map((u) => u.email).filter(Boolean);
    const [scoreRows, applicantRows, recordingRows, reviewRecordsMap, liveCodingRows, questionCounts] = await Promise.all([
      codes.length > 0
        ? prisma.assessorScore.findMany({
            where: { candidateCode: { in: codes } },
            include: { assessor: { select: { name: true } } },
            orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }]
          })
        : Promise.resolve([]),
      emails.length > 0
        ? prisma.applicant.findMany({
            where: {
              OR: Array.from(new Set(emails.map((e) => e.toLowerCase().trim()))).map((email) => ({
                email: { equals: email, mode: 'insensitive' as const }
              }))
            },
            select: {
              email: true,
              proctorFlags: true,
              interviewTranscript: true,
              interviewResult: true,
              interviewScore: true
            }
          })
        : Promise.resolve([]),
      userIds.length > 0
        ? prisma.interviewRecording.findMany({
            where: { userId: { in: userIds } },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              userId: true,
              kind: true,
              fileName: true,
              mimeType: true,
              durationSec: true,
              transcript: true,
              createdAt: true
            }
          })
        : Promise.resolve([]),
      loadAiReviewRecordsMap(),
      prisma.masterRecord.findMany({ where: { scope: 'live-coding-submissions' } }),
      prisma.programQuestion.groupBy({ by: ['programCode'], _count: { id: true } })
    ]);

    const questionCountMap = new Map<string, number>();
    for (const grp of questionCounts) {
      questionCountMap.set(String(grp.programCode || '').toUpperCase(), grp._count.id);
    }

    const liveCodingByUserProgram = new Map<string, LiveCodingMeta>();
    const liveCodingLatestByUser = new Map<string, LiveCodingMeta>();
    const liveCodingByCode = new Map<string, LiveCodingMeta>();
    for (const row of liveCodingRows) {
      const parsed = parseJson<LiveCodingMeta | null>(row.value, null);
      if (!parsed) continue;
      if (parsed.userId) {
        liveCodingByUserProgram.set(`${parsed.userId}::${String(parsed.programCode || '').toUpperCase()}`, parsed);
        const prev = liveCodingLatestByUser.get(parsed.userId);
        if (!prev || new Date(parsed.submittedAt).getTime() > new Date(prev.submittedAt).getTime()) {
          liveCodingLatestByUser.set(parsed.userId, parsed);
        }
      }
      if (parsed.candidateCode) {
        const cKey = String(parsed.candidateCode).toUpperCase();
        const prevCode = liveCodingByCode.get(cKey);
        if (!prevCode || new Date(parsed.submittedAt).getTime() > new Date(prevCode.submittedAt).getTime()) {
          liveCodingByCode.set(cKey, parsed);
        }
      }
    }

    const applicantByEmail = new Map(
      applicantRows.map((a) => [a.email.toLowerCase(), a])
    );
    const recordingsByUserId = new Map<string, RecordingMeta[]>();
    for (const rec of recordingRows) {
      const list = recordingsByUserId.get(rec.userId) || [];
      list.push(rec);
      recordingsByUserId.set(rec.userId, list);
    }

    const scoresByCode = new Map<string, CandidateAssessorScoreRow[]>();
    for (const row of scoreRows) {
      const list = scoresByCode.get(row.candidateCode) || [];
      list.push(row);
      scoresByCode.set(row.candidateCode, list);
    }

    return res.json({
      data: users.map((u) => {
        const key = u.candidateCode || u.id.slice(0, 8);
        const bestScore = pickBestScore(scoresByCode.get(key) || []);
        const applicantData = applicantByEmail.get(u.email.toLowerCase()) || null;
        const recordings = recordingsByUserId.get(u.id) || [];
        const reviewRec = reviewRecordsMap.get(key.toUpperCase()) || null;
        const pCode = String(u.assessmentId || '').trim().toUpperCase();
        const liveCoding =
          (pCode ? liveCodingByUserProgram.get(`${u.id}::${pCode}`) : null) ||
          liveCodingLatestByUser.get(u.id) ||
          liveCodingByCode.get(key.toUpperCase()) ||
          null;
        return serializeCandidate(u, bestScore, applicantData, recordings, reviewRec, liveCoding, questionCountMap);
      })
    });
  } catch (error) {
    console.error('List assessor candidates error:', error);
    return res.status(500).json({ error: 'Gagal memuat daftar kandidat asesor.' });
  }
};

export const getAssessorCandidate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi asesor tidak valid.' });
    const identifier = String(req.params.candidateCode || '').trim();
    const user = await prisma.portalUser.findFirst({
      where: {
        role: 'peserta',
        OR: [
          { candidateCode: identifier },
          { id: identifier },
          ...(identifier.length >= 6 ? [{ id: { startsWith: identifier } }] : [])
        ]
      },
      select: candidateSelect
    });
    if (!user) return res.status(404).json({ error: 'Kandidat tidak ditemukan.' });
    const scopeCtx = await resolveAssessorScopeContext(req.portalUser, prisma);
    if (!isCandidateInAssessorScope(scopeCtx, user)) {
      return res.status(403).json({ error: 'Kandidat bukan milik tenant PT Anda.' });
    }

    const codeKey = user.candidateCode || user.id.slice(0, 8);
    const [scores, applicant, recordings, reviewRecord, liveCodingRecords] = await Promise.all([
      prisma.assessorScore.findMany({
        where: {
          OR: [{ candidateCode: codeKey }, { candidateCode: identifier }]
        },
        include: { assessor: { select: { name: true } } },
        orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }]
      }),
      prisma.applicant.findFirst({
        where: { email: { equals: user.email, mode: 'insensitive' } },
        select: {
          proctorFlags: true,
          interviewTranscript: true,
          interviewResult: true,
          interviewScore: true
        }
      }),
      prisma.interviewRecording.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          kind: true,
          fileName: true,
          mimeType: true,
          durationSec: true,
          transcript: true,
          createdAt: true
        }
      }),
      getAiReviewRecord(codeKey),
      prisma.masterRecord.findMany({
        where: {
          scope: 'live-coding-submissions',
          OR: [
            { key: { startsWith: `${user.id}::` } },
            ...(user.candidateCode ? [{ value: { contains: user.candidateCode } }] : [])
          ]
        }
      })
    ]);
    const bestScore = pickBestScore(scores);

    const attempt = latestAttempt(user.examAttempts || [], user.assessmentId);
    const activeProgramCode = String(attempt?.programCode || user.assessmentId || '').trim().toUpperCase();
    let programQuestions: any[] = activeProgramCode
      ? await prisma.programQuestion.findMany({
          where: { programCode: activeProgramCode },
          orderBy: { orderNo: 'asc' }
        })
      : [];

    if (programQuestions.length === 0 && activeProgramCode) {
      const bankRecord = await prisma.masterRecord.findUnique({
        where: { scope_key: { scope: 'bank-soal', key: 'questions' } }
      });
      const parsedBank = bankRecord ? parseJson<any[]>(bankRecord.value, []) : [];
      if (Array.isArray(parsedBank)) {
        const matched = parsedBank.filter(
          (q) => String(q?.programCode || '').trim().toUpperCase() === activeProgramCode
        );
        if (matched.length > 0) {
          programQuestions = matched.map((q, idx) => ({
            id: String(q.id || `bank-${idx + 1}`),
            orderNo: Number(q.orderNo || idx + 1),
            type: String(q.type || 'single'),
            competency: String(q.competency || 'Teknis'),
            difficulty: String(q.difficulty || 'medium'),
            text: String(q.text || ''),
            codeSnippet: q.codeSnippet || null,
            options: JSON.stringify(Array.isArray(q.options) ? q.options : []),
            correctAnswer: q.correctAnswer === undefined || q.correctAnswer === null ? null : JSON.stringify(q.correctAnswer)
          }));
        }
      }
    }

    const answersObj = attempt?.answers ? parseJson<Record<string, unknown>>(attempt.answers, {}) : {};
    const essayAnswers: Array<{ questionId: string; orderNo: number; prompt: string; answer: string }> = [];
    let catQuestions: Array<{
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
    }> = programQuestions.map((q) => {
      const candidateAnswer = answersObj[String(q.orderNo)] ?? answersObj[q.id] ?? null;
      const expectedKey = parseJson<unknown>(q.correctAnswer, null);
      const rawOptions = parseJson<any[]>(q.options, []);
      const options = Array.isArray(rawOptions)
        ? rawOptions.map((opt, idx) =>
            typeof opt === 'string'
              ? { key: String.fromCharCode(65 + idx), label: opt }
              : {
                  key: String(opt?.key ?? opt?.id ?? String.fromCharCode(65 + idx)),
                  label: String(opt?.label ?? opt?.text ?? opt?.value ?? '')
                }
          )
        : [];

      let isCorrect: boolean | null = null;
      if (q.type === 'single' && candidateAnswer != null && expectedKey != null) {
        isCorrect = String(candidateAnswer) === String(expectedKey);
      } else if (q.type === 'multi' && Array.isArray(candidateAnswer) && Array.isArray(expectedKey)) {
        const a = [...candidateAnswer].map(String).sort();
        const b = [...expectedKey].map(String).sort();
        isCorrect = a.length > 0 && JSON.stringify(a) === JSON.stringify(b);
      } else if (q.type === 'short' && typeof candidateAnswer === 'string' && expectedKey != null) {
        isCorrect = candidateAnswer.trim().toLowerCase() === String(expectedKey).trim().toLowerCase();
      } else if (q.type === 'matching' && candidateAnswer && typeof candidateAnswer === 'object' && Array.isArray(expectedKey)) {
        const submitted = candidateAnswer as Record<string, string>;
        const pairs = expectedKey as Array<{ left: string; correctRight: string }>;
        isCorrect = pairs.length > 0 && pairs.every((pair) => submitted[pair.left] === pair.correctRight);
      }

      if (q.type === 'essay') {
        essayAnswers.push({
          questionId: q.id,
          orderNo: q.orderNo,
          prompt: q.text,
          answer:
            typeof candidateAnswer === 'string'
              ? candidateAnswer
              : candidateAnswer != null
                ? JSON.stringify(candidateAnswer)
                : ''
        });
      }

      return {
        id: q.id,
        orderNo: q.orderNo,
        type: q.type,
        competency: q.competency,
        difficulty: q.difficulty,
        text: q.text,
        codeSnippet: q.codeSnippet || null,
        options,
        candidateAnswer,
        correctAnswer: expectedKey,
        isCorrect
      };
    });

    if (catQuestions.length === 0 && Object.keys(answersObj).length > 0) {
      catQuestions = Object.entries(answersObj).map(([key, val], idx) => ({
        id: `ans-${key}`,
        orderNo: Number(key) || idx + 1,
        type: typeof val === 'string' && val.length > 60 ? 'essay' : 'single',
        competency: activeProgramCode || 'CAT',
        difficulty: 'medium',
        text: `Butir Soal #${key}`,
        codeSnippet: null,
        options: [] as Array<{ key: string; label: string }>,
        candidateAnswer: val ?? null,
        correctAnswer: null,
        isCorrect: null
      }));
    }

    if (essayAnswers.length === 0 && attempt?.answers) {
      Object.entries(answersObj).forEach(([k, val], idx) => {
        if (typeof val === 'string' && val.trim().length > 25) {
          essayAnswers.push({
            questionId: k,
            orderNo: Number(k) || idx + 1,
            prompt: `Butir Uraian #${k}`,
            answer: val
          });
        }
      });
    }

    const parsedLiveCodings = liveCodingRecords
      .map((r) => parseJson<LiveCodingMeta | null>(r.value, null))
      .filter((item): item is LiveCodingMeta => Boolean(item));
    const liveCodingSubmission =
      parsedLiveCodings.find((s) => String(s.programCode || '').toUpperCase() === activeProgramCode) ||
      parsedLiveCodings[0] ||
      null;

    const questionCountMap = new Map<string, number>();
    if (activeProgramCode) questionCountMap.set(activeProgramCode, programQuestions.length);

    const transcriptText =
      recordings.find((r) => r.kind === 'transcript' && r.transcript && r.transcript.trim())?.transcript ||
      recordings.find((r) => Boolean(r.transcript && r.transcript.trim()))?.transcript ||
      applicant?.interviewTranscript ||
      null;
    const transcriptSegments = parseTimestampedTranscript(transcriptText);

    return res.json({
      data: {
        ...serializeCandidate(
          user,
          bestScore,
          applicant || null,
          recordings,
          reviewRecord,
          liveCodingSubmission,
          questionCountMap
        ),
        competencies: bestScore?.competencies ? parseJson<any[]>(bestScore.competencies, []) : [],
        essayAnswers,
        catDetails: attempt
          ? {
              programCode: attempt.programCode,
              status: attempt.status,
              score: attempt.score,
              integrityScore: attempt.integrityScore,
              startedAt: (attempt as any).startedAt || null,
              submittedAt: attempt.submittedAt,
              competencyScores: parseJson<any[]>(attempt.competencyScores, []),
              questions: catQuestions
            }
          : null,
        liveCodingSubmission,
        transcriptText,
        transcriptSegments,
        recordings: recordings.map((r) => ({
          id: r.id,
          kind: r.kind,
          fileName: r.fileName,
          mimeType: r.mimeType,
          durationSec: r.durationSec,
          createdAt: r.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Get assessor candidate error:', error);
    return res.status(500).json({ error: 'Gagal memuat detail kandidat.' });
  }
};

export const getAssessorCandidateProctoring = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi asesor tidak valid.' });
    const identifier = String(req.params.candidateCode || '').trim();
    const user = await prisma.portalUser.findFirst({
      where: {
        role: 'peserta',
        OR: [
          { candidateCode: identifier },
          { id: identifier },
          ...(identifier.length >= 6 ? [{ id: { startsWith: identifier } }] : [])
        ]
      },
      select: {
        id: true,
        email: true,
        candidateCode: true,
        tenantId: true,
        companyId: true,
        companyName: true,
        tenant: { select: { name: true } },
        examAttempts: {
          select: { violations: true, submittedAt: true, programCode: true, integrityScore: true }
        }
      }
    });
    if (!user) return res.status(404).json({ error: 'Kandidat tidak ditemukan.' });
    const scopeCtx = await resolveAssessorScopeContext(req.portalUser, prisma);
    if (!isCandidateInAssessorScope(scopeCtx, user)) {
      return res.status(403).json({ error: 'Kandidat bukan milik tenant PT Anda.' });
    }

    const candidateCode = user.candidateCode || user.id;
    const [applicant, reviews] = await Promise.all([
      prisma.applicant.findFirst({
        where: { email: { equals: user.email, mode: 'insensitive' } },
        select: { proctorFlags: true }
      }),
      prisma.proctoringReview.findMany({ where: { candidateCode } })
    ]);
    const reviewMap = new Map(reviews.map((review) => [review.eventId, review]));
    const events: Array<{
      id: string;
      time: string;
      type: string;
      severity: 'high' | 'medium' | 'low';
      description: string;
      status: string;
      assessorNotes: string;
      snapshotUrl: string | null;
    }> = [];

    const attempt = [...user.examAttempts].sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return bTime - aTime;
    })[0];
    const violations = parseJson<any[]>(attempt?.violations, []);
    violations.forEach((violation, index) => {
      const eventId = `EXAM-${index + 1}`;
      const review = reviewMap.get(eventId);
      const rawType = String(violation.type || 'Catatan Aktivitas');
      const isInfoAudit =
        rawType === 'PERIODIC_SNAPSHOT' ||
        rawType === 'face_verified' ||
        rawType === 'VERIFIKASI_BERKALA';
      events.push({
        id: eventId,
        time: formatEventTime(violation.timestamp || violation.time || attempt?.submittedAt),
        type: isInfoAudit ? 'VERIFIKASI_BERKALA' : rawType,
        severity: isInfoAudit ? 'low' : severityFor(rawType),
        description: String(
          violation.detail ||
            violation.description ||
            (isInfoAudit
              ? 'Verifikasi kehadiran wajah rutin selama sesi asesmen.'
              : 'Aktivitas mencurigakan terdeteksi selama pengerjaan ujian CAT.')
        ),
        status: review?.status || (isInfoAudit ? 'info' : 'pending'),
        assessorNotes: review?.notes || '',
        snapshotUrl:
          typeof violation.snapshot === 'string'
            ? violation.snapshot
            : typeof violation.evidenceSnapshot === 'string'
              ? violation.evidenceSnapshot
              : typeof violation.imageUrl === 'string'
                ? violation.imageUrl
                : null
      });
    });

    const interviewFlags = parseJson<any[]>(applicant?.proctorFlags, []);
    interviewFlags.forEach((flag, index) => {
      const eventId = `INT-${index + 1}`;
      const review = reviewMap.get(eventId);
      const rawType = String(flag.type || 'Catatan Wawancara');
      const isInfoAudit =
        rawType === 'PERIODIC_SNAPSHOT' ||
        rawType === 'face_verified' ||
        rawType === 'VERIFIKASI_BERKALA';
      events.push({
        id: eventId,
        time: formatEventTime(flag.timestamp || flag.time),
        type: isInfoAudit ? 'VERIFIKASI_BERKALA' : rawType,
        severity: isInfoAudit ? 'low' : severityFor(rawType),
        description: String(
          flag.detail ||
            flag.description ||
            (isInfoAudit
              ? 'Verifikasi kehadiran wajah rutin selama sesi wawancara.'
              : 'Kejadian integritas tercatat selama sesi wawancara.')
        ),
        status: review?.status || (isInfoAudit ? 'info' : 'pending'),
        assessorNotes: review?.notes || '',
        snapshotUrl:
          typeof flag.snapshot === 'string'
            ? flag.snapshot
            : typeof flag.evidenceSnapshot === 'string'
              ? flag.evidenceSnapshot
              : typeof flag.imageUrl === 'string'
                ? flag.imageUrl
                : null
      });
    });

    return res.json({
      data: events,
      integrityScore: attempt?.integrityScore ?? null
    });
  } catch (error) {
    console.error('Get assessor proctoring error:', error);
    return res.status(500).json({ error: 'Gagal memuat event proctoring kandidat.' });
  }
};

export const listAllAssessorProctoringEvents = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi asesor tidak valid.' });
    const scopeCtx = await resolveAssessorScopeContext(req.portalUser, prisma);

    const allUsers = await prisma.portalUser.findMany({
      where: {
        role: 'peserta',
        status: 'Aktif'
      },
      select: {
        id: true,
        name: true,
        email: true,
        candidateCode: true,
        assessmentId: true,
        tenantId: true,
        companyId: true,
        companyName: true,
        tenant: { select: { name: true } },
        examAttempts: {
          select: { violations: true, submittedAt: true, integrityScore: true }
        }
      }
    });
    const users = allUsers.filter((u) => isCandidateInAssessorScope(scopeCtx, u));

    const emails = users.map((u) => u.email).filter(Boolean);
    const candidateKeys = users.map((u) => u.candidateCode || u.id).filter(Boolean);
    const [applicants, reviews] = await Promise.all([
      emails.length > 0
        ? prisma.applicant.findMany({ where: { email: { in: emails } }, select: { email: true, proctorFlags: true } })
        : Promise.resolve([]),
      candidateKeys.length > 0
        ? prisma.proctoringReview.findMany({ where: { candidateCode: { in: candidateKeys } } })
        : Promise.resolve([])
    ]);

    const flagsByEmail = new Map(applicants.map((a) => [a.email.toLowerCase(), a.proctorFlags]));
    const reviewByKey = new Map(reviews.map((r) => [`${r.candidateCode}:${r.eventId}`, r]));

    const aggregated: Array<Record<string, unknown>> = [];
    for (const user of users) {
      const code = user.candidateCode || user.id.slice(0, 8);
      const key = user.candidateCode || user.id;
      const attempt = [...user.examAttempts].sort((a, b) => {
        const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return bTime - aTime;
      })[0];

      const examFlags = parseJson<any[]>(attempt?.violations, []);
      const interviewFlags = parseJson<any[]>(flagsByEmail.get(user.email.toLowerCase()), []);

      const collect = (items: any[], prefix: 'EXAM' | 'INT') => {
        items.forEach((item, idx) => {
          const rawType = String(item?.type || 'Catatan Aktivitas');
          const isInfoAudit =
            rawType === 'PERIODIC_SNAPSHOT' ||
            rawType === 'face_verified' ||
            rawType === 'VERIFIKASI_BERKALA';
          if (isInfoAudit) return;
          const eventId = `${prefix}-${idx + 1}`;
          const review = reviewByKey.get(`${key}:${eventId}`);
          aggregated.push({
            id: `${code}-${eventId}`,
            eventId,
            candidateCode: code,
            candidateName: user.name,
            programCode: user.assessmentId || null,
            integrityScore: attempt?.integrityScore ?? null,
            time: formatEventTime(item?.timestamp || item?.time || attempt?.submittedAt),
            type: rawType,
            severity: severityFor(rawType),
            description: String(item?.detail || item?.description || 'Aktivitas perlu peninjauan asesor.'),
            status: review?.status || 'pending'
          });
        });
      };

      collect(examFlags, 'EXAM');
      collect(interviewFlags, 'INT');
    }

    return res.json({
      data: aggregated,
      totalEvents: aggregated.length,
      pendingEvents: aggregated.filter((e) => e.status === 'pending').length
    });
  } catch (error) {
    console.error('List aggregate assessor proctoring error:', error);
    return res.status(500).json({ error: 'Gagal memuat agregat event proctoring.' });
  }
};

export const handleAssessorSessionAction = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi asesor tidak valid.' });
    const identifier = String(req.params.candidateCode || '').trim();
    const action = String(req.body.action || '').trim();
    const reason = String(req.body.reason || '').trim();
    const scheduledAtRaw = req.body.scheduledAt ? String(req.body.scheduledAt) : null;

    if (!['reschedule', 'resolve_manual', 'flag_issue', 'toggle_calibration'].includes(action)) {
      return res.status(400).json({ error: 'Aksi sesi tidak valid.' });
    }

    const user = await prisma.portalUser.findFirst({
      where: {
        role: 'peserta',
        OR: [
          { candidateCode: identifier },
          { id: identifier },
          ...(identifier.length >= 6 ? [{ id: { startsWith: identifier } }] : [])
        ]
      },
      select: {
        id: true,
        name: true,
        candidateCode: true,
        tenantId: true,
        companyId: true,
        companyName: true,
        tenant: { select: { name: true } }
      }
    });
    if (!user) return res.status(404).json({ error: 'Kandidat tidak ditemukan.' });

    const scopeCtx = await resolveAssessorScopeContext(req.portalUser, prisma);
    if (!isCandidateInAssessorScope(scopeCtx, user)) {
      return res.status(403).json({ error: 'Kandidat bukan milik tenant PT Anda.' });
    }

    const codeKey = (user.candidateCode || user.id.slice(0, 8)).toUpperCase();
    const existing = await getAiReviewRecord(codeKey);
    const baseRecord: AiInterviewReviewRecord = existing || {
      candidateCode: codeKey,
      aiCompetencies: [],
      aiOverallScore: null,
      aiSummary: null,
      isCalibrationSample: isDeterministicCalibrationSample(codeKey),
      needsAction: false,
      actionReason: null,
      actionType: null,
      finalized: false,
      aiOverrideReason: null,
      manualDecisionNote: null,
      updatedAt: new Date().toISOString()
    };

    const actor = req.portalUser.name || req.portalUser.email || 'Asesor';

    if (action === 'reschedule') {
      const nextScheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : new Date();
      await prisma.portalUser.update({
        where: { id: user.id },
        data: {
          interviewStatus: 'scheduled',
          interviewScheduledAt: nextScheduledAt,
          interviewCalledAt: null,
          interviewCompletedAt: null
        }
      });
      const saved = await saveAiReviewRecord({
        ...baseRecord,
        needsAction: false,
        actionReason: null,
        actionType: 'rescheduled',
        manualDecisionNote: reason || 'Dijadwalkan ulang wawancara AI oleh asesor.'
      });
      recordAuditLog({
        actor,
        action: 'ASSESSOR_SESSION_RESCHEDULED',
        category: 'DATA_MUTATION',
        ip: resolveRequestIp(req),
        target: codeKey,
        details: `Asesor menjadwalkan ulang sesi wawancara AI (${user.name}). Alasan: ${reason || '-'}`,
        status: 'SUCCESS'
      });
      return res.json({ data: saved });
    }

    if (action === 'resolve_manual') {
      if (reason.length < 5) {
        return res.status(400).json({ error: 'Catatan keputusan manual wajib diisi minimal 5 karakter.' });
      }
      const saved = await saveAiReviewRecord({
        ...baseRecord,
        needsAction: false,
        actionReason: null,
        actionType: 'resolved_manual',
        manualDecisionNote: reason
      });
      recordAuditLog({
        actor,
        action: 'ASSESSOR_SESSION_MANUAL_DECISION',
        category: 'DECISION',
        ip: resolveRequestIp(req),
        target: codeKey,
        details: `Asesor menyelesaikan status Perlu Tindakan secara manual (${user.name}). Catatan: ${reason}`,
        status: 'SUCCESS'
      });
      return res.json({ data: saved });
    }

    if (action === 'toggle_calibration') {
      const saved = await saveAiReviewRecord({
        ...baseRecord,
        isCalibrationSample: !baseRecord.isCalibrationSample
      });
      return res.json({ data: saved });
    }

    // flag_issue
    if (reason.length < 5) {
      return res.status(400).json({ error: 'Alasan kendala sesi wajib diisi minimal 5 karakter.' });
    }
    const saved = await saveAiReviewRecord({
      ...baseRecord,
      needsAction: true,
      actionReason: reason,
      actionType: 'flagged_by_assessor'
    });
    recordAuditLog({
      actor,
      action: 'ASSESSOR_SESSION_FLAGGED_ISSUE',
      category: 'DATA_MUTATION',
      ip: resolveRequestIp(req),
      target: codeKey,
      details: `Asesor menandai sesi perlu tindakan (${user.name}): ${reason}`,
      status: 'WARNING'
    });
    return res.json({ data: saved });
  } catch (error) {
    console.error('Assessor session action error:', error);
    return res.status(500).json({ error: 'Gagal memproses tindakan sesi.' });
  }
};
