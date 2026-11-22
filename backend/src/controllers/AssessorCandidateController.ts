import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';

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
  companyName: true,
  tenantId: true,
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
      answers: true
    }
  }
} as const;

interface CandidateAssessorScoreRow {
  candidateCode: string;
  candidateName: string;
  programCode: string | null;
  programTitle: string;
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
  }>
) =>
  [...attempts].sort((a, b) => {
    const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return bTime - aTime;
  })[0];

const isTestAccountUser = (user: { email?: string | null; candidateCode?: string | null; name?: string | null }) => {
  const email = String(user.email || '').toLowerCase();
  const code = String(user.candidateCode || '').toUpperCase();
  const name = String(user.name || '');
  return (
    email.endsWith('@right.id') ||
    email.endsWith('@kandidat.id') ||
    code.startsWith('KND-UAT-') ||
    /\b(uji|qc|test)\b/i.test(name)
  );
};

const serializeCandidate = (user: any, score: CandidateAssessorScoreRow | null = null) => {
  const attempt = latestAttempt(user.examAttempts || []);
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
  if (normalized.includes('face_verified') || normalized.includes('face verified') || normalized.includes('verifikasi wajah')) {
    return 'low';
  }
  if (
    ['face', 'multiple', 'tab', 'fullscreen', 'devtools', 'blur', 'hidden', 'leave'].some((key) =>
      normalized.includes(key)
    )
  ) {
    return 'high';
  }
  if (['noise', 'voice', 'looking', 'gaze', 'copy', 'paste'].some((key) => normalized.includes(key))) {
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
    const tenantId = req.portalUser.tenantId || null;
    const search = String(req.query.search || '').trim();
    const programCode = String(req.query.programCode || '').trim().toUpperCase();

    let tenantCompanyName: string | null = req.portalUser.companyName || null;
    if (tenantId && !tenantCompanyName) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
      tenantCompanyName = tenant?.name || null;
    }

    const users = await prisma.portalUser.findMany({
      where: {
        role: 'peserta',
        status: 'Aktif',
        ...(tenantId
          ? {
              OR: [
                { tenantId },
                ...(tenantCompanyName ? [{ companyName: tenantCompanyName }] : [])
              ]
            }
          : tenantCompanyName
            ? { companyName: tenantCompanyName }
            : {}),
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

    const codes = users
      .map((u) => u.candidateCode || u.id.slice(0, 8))
      .filter(Boolean);
    const scoreRows =
      codes.length > 0
        ? await prisma.assessorScore.findMany({
            where: { candidateCode: { in: codes } },
            include: { assessor: { select: { name: true } } },
            orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }]
          })
        : [];

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
        return serializeCandidate(u, bestScore);
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
        OR: [{ candidateCode: identifier }, { id: identifier }]
      },
      select: candidateSelect
    });
    if (!user) return res.status(404).json({ error: 'Kandidat tidak ditemukan.' });
    if (req.portalUser.tenantId && user.tenantId && user.tenantId !== req.portalUser.tenantId) {
      return res.status(403).json({ error: 'Kandidat bukan milik tenant Anda.' });
    }

    const codeKey = user.candidateCode || user.id.slice(0, 8);
    const scores = await prisma.assessorScore.findMany({
      where: {
        OR: [{ candidateCode: codeKey }, { candidateCode: identifier }]
      },
      include: { assessor: { select: { name: true } } },
      orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }]
    });
    const bestScore = pickBestScore(scores);

    const attempt = latestAttempt(user.examAttempts || []);
    const essayAnswers: Array<{ questionId: string; orderNo: number; prompt: string; answer: string }> = [];
    if (attempt && attempt.answers) {
      const answersObj = parseJson<Record<string, unknown>>(attempt.answers, {});
      const essayQuestions = await prisma.programQuestion.findMany({
        where: { programCode: attempt.programCode, type: 'essay' },
        orderBy: { orderNo: 'asc' },
        select: { id: true, orderNo: true, prompt: true }
      });

      if (essayQuestions.length > 0) {
        for (const q of essayQuestions) {
          const rawAns = answersObj[String(q.orderNo)] ?? answersObj[q.id];
          essayAnswers.push({
            questionId: q.id,
            orderNo: q.orderNo,
            prompt: q.prompt,
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
        ...serializeCandidate(user, bestScore),
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
        OR: [{ candidateCode: identifier }, { id: identifier }]
      },
      select: {
        id: true,
        email: true,
        candidateCode: true,
        tenantId: true,
        examAttempts: {
          select: { violations: true, submittedAt: true, programCode: true, integrityScore: true }
        }
      }
    });
    if (!user) return res.status(404).json({ error: 'Kandidat tidak ditemukan.' });
    if (req.portalUser.tenantId && user.tenantId && user.tenantId !== req.portalUser.tenantId) {
      return res.status(403).json({ error: 'Kandidat bukan milik tenant Anda.' });
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
      events.push({
        id: eventId,
        time: formatEventTime(violation.timestamp || violation.time || attempt?.submittedAt),
        type: String(violation.type || 'Pelanggaran Ujian'),
        severity: severityFor(String(violation.type || '')),
        description: String(
          violation.detail ||
            violation.description ||
            'Aktivitas mencurigakan terdeteksi selama pengerjaan ujian CAT.'
        ),
        status: review?.status || 'pending',
        assessorNotes: review?.notes || '',
        snapshotUrl: typeof violation.snapshot === 'string' ? violation.snapshot : typeof violation.imageUrl === 'string' ? violation.imageUrl : null
      });
    });

    const interviewFlags = parseJson<any[]>(applicant?.proctorFlags, []);
    interviewFlags.forEach((flag, index) => {
      const eventId = `INT-${index + 1}`;
      const review = reviewMap.get(eventId);
      events.push({
        id: eventId,
        time: formatEventTime(flag.timestamp || flag.time),
        type: String(flag.type || 'Catatan Wawancara'),
        severity: severityFor(String(flag.type || '')),
        description: String(
          flag.detail ||
            flag.description ||
            'Kejadian integritas tercatat selama sesi wawancara.'
        ),
        status: review?.status || 'pending',
        assessorNotes: review?.notes || '',
        snapshotUrl: typeof flag.snapshot === 'string' ? flag.snapshot : typeof flag.imageUrl === 'string' ? flag.imageUrl : null
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
