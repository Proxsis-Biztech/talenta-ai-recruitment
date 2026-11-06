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
      submittedAt: true
    }
  },
  assessorScores: {
    select: {
      interviewScore: true,
      compositeScore: true,
      recommendation: true,
      status: true,
      lhaNumber: true,
      signedAt: true,
      updatedAt: true
    },
    orderBy: { updatedAt: 'desc' as const },
    take: 1
  }
} as const;

const latestAttempt = (attempts: Array<{ programCode: string; status: string; score: number | null; integrityScore: number | null; submittedAt: Date | null }>) =>
  [...attempts].sort((a, b) => {
    const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return bTime - aTime;
  })[0];

const serializeCandidate = (user: any) => {
  const attempt = latestAttempt(user.examAttempts || []);
  const score = user.assessorScores?.[0] || null;
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
    interviewScore: user.interviewScore ?? score?.compositeScore ?? null,
    scheduledAt: user.interviewScheduledAt,
    calledAt: user.interviewCalledAt,
    completedAt: user.interviewCompletedAt,
    assessorName: user.assessorName,
    recommendation: score?.recommendation ?? null,
    lhaStatus: score?.status ?? null,
    lhaNumber: score?.lhaNumber ?? null,
    signedAt: score?.signedAt ?? null
  };
};

const severityFor = (type: string): 'high' | 'medium' | 'low' => {
  const normalized = String(type || '').toLowerCase();
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

    const users = await prisma.portalUser.findMany({
      where: {
        role: 'peserta',
        status: 'Aktif',
        ...(tenantId ? { AND: [{ OR: [{ tenantId }, { tenantId: null }] }] } : {}),
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

    return res.json({ data: users.map(serializeCandidate) });
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
    return res.json({ data: serializeCandidate(user) });
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
          select: { violations: true, submittedAt: true, programCode: true }
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
        assessorNotes: review?.notes || ''
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
        assessorNotes: review?.notes || ''
      });
    });

    return res.json({ data: events });
  } catch (error) {
    console.error('Get assessor proctoring error:', error);
    return res.status(500).json({ error: 'Gagal memuat event proctoring kandidat.' });
  }
};