import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';
import { isCandidateInAssessorScope, resolveAssessorScopeContext } from '../middleware/tenant';

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
      submittedAt: true,
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
    submittedAt: Date | null;
    answers?: string;
    violations?: string | null;
  }>
) =>
  [...attempts].sort((a, b) => {
    const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return bTime - aTime;
  })[0];

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

const serializeCandidate = (
  user: any,
  score: CandidateAssessorScoreRow | null = null,
  applicantProctorFlagsJson: string | null = null
) => {
  const attempt = latestAttempt(user.examAttempts || []);
  const violationCount =
    countNonPeriodicEvents(attempt?.violations) +
    countNonPeriodicEvents(applicantProctorFlagsJson);
  const proctoringFlagCount =
    violationCount > 0
      ? violationCount
      : attempt?.integrityScore != null && attempt.integrityScore < 100
        ? 1
        : 0;
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
    isTestAccount: isTestAccountUser(user)
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

    const codes = users
      .map((u) => u.candidateCode || u.id.slice(0, 8))
      .filter(Boolean);
    const emails = users.map((u) => u.email).filter(Boolean);
    const [scoreRows, applicantRows] = await Promise.all([
      codes.length > 0
        ? prisma.assessorScore.findMany({
            where: { candidateCode: { in: codes } },
            include: { assessor: { select: { name: true } } },
            orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }]
          })
        : Promise.resolve([]),
      emails.length > 0
        ? prisma.applicant.findMany({
            where: { email: { in: emails } },
            select: { email: true, proctorFlags: true }
          })
        : Promise.resolve([])
    ]);

    const flagsByEmail = new Map(
      applicantRows.map((a) => [a.email.toLowerCase(), a.proctorFlags])
    );

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
        const applicantFlags = flagsByEmail.get(u.email.toLowerCase()) || null;
        return serializeCandidate(u, bestScore, applicantFlags);
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
    const [scores, applicant] = await Promise.all([
      prisma.assessorScore.findMany({
        where: {
          OR: [{ candidateCode: codeKey }, { candidateCode: identifier }]
        },
        include: { assessor: { select: { name: true } } },
        orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }]
      }),
      prisma.applicant.findUnique({
        where: { email: user.email },
        select: { proctorFlags: true }
      })
    ]);
    const bestScore = pickBestScore(scores);

    const attempt = latestAttempt(user.examAttempts || []);
    const essayAnswers: Array<{ questionId: string; orderNo: number; prompt: string; answer: string }> = [];
    if (attempt && attempt.answers) {
      const answersObj = parseJson<Record<string, unknown>>(attempt.answers, {});
      const essayQuestions = attempt.programCode
        ? await prisma.programQuestion.findMany({
            where: { programCode: attempt.programCode, type: 'essay' },
            orderBy: { orderNo: 'asc' },
            select: { id: true, orderNo: true, text: true }
          })
        : [];

      if (essayQuestions.length > 0) {
        for (const q of essayQuestions) {
          const rawAns = answersObj[String(q.orderNo)] ?? answersObj[q.id];
          essayAnswers.push({
            questionId: q.id,
            orderNo: q.orderNo,
            prompt: q.text,
            answer: typeof rawAns === 'string' ? rawAns : rawAns != null ? JSON.stringify(rawAns) : ''
          });
        }
      } else {
        // Fallback: include any non-empty long-text answers directly from attempt.answers
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
    }

    return res.json({
      data: {
        ...serializeCandidate(user, bestScore, applicant?.proctorFlags || null),
        competencies: bestScore?.competencies ? parseJson<any[]>(bestScore.competencies, []) : [],
        essayAnswers
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
      prisma.applicant.findUnique({ where: { email: user.email }, select: { proctorFlags: true } }),
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
