import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';
import { isCandidateInAssessorScope, resolveAssessorScopeContext } from '../middleware/tenant';

const prisma = new PrismaClient();

const verifyAssessorCandidateAccess = async (
  req: AuthRequest,
  candidateCode: string
): Promise<'ok' | 'not_found' | 'forbidden'> => {
  if (!req.portalUser) return 'forbidden';
  const candidate = await prisma.portalUser.findFirst({
    where: {
      role: 'peserta',
      OR: [
        { candidateCode },
        { id: candidateCode },
        ...(candidateCode.length >= 6 ? [{ id: { startsWith: candidateCode } }] : [])
      ]
    },
    select: {
      tenantId: true,
      companyId: true,
      companyName: true,
      assessmentId: true,
      assessmentIds: true,
      tenant: { select: { name: true } }
    }
  });
  if (!candidate) return 'not_found';
  const scopeCtx = await resolveAssessorScopeContext(req.portalUser, prisma);
  return isCandidateInAssessorScope(scopeCtx, candidate) ? 'ok' : 'forbidden';
};

export const getProctoringReviews = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const candidateCode = String(req.params.candidateCode);
    const access = await verifyAssessorCandidateAccess(req, candidateCode);
    if (access === 'forbidden') {
      return res.status(403).json({ error: 'Kandidat bukan milik tenant PT Anda.' });
    }
    const reviews = await prisma.proctoringReview.findMany({
      where: { candidateCode },
      orderBy: { updatedAt: 'desc' }
    });
    return res.json({ data: reviews });
  } catch (error) {
    console.error('Get proctoring reviews error:', error);
    return res.status(500).json({ error: 'Gagal memuat review proctoring.' });
  }
};

export const upsertProctoringReview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const candidateCode = String(req.params.candidateCode);
    const access = await verifyAssessorCandidateAccess(req, candidateCode);
    if (access === 'forbidden') {
      return res.status(403).json({ error: 'Kandidat bukan milik tenant PT Anda.' });
    }
    const eventId = String(req.params.eventId);
    const status = String(req.body.status);
    const notes = req.body.notes !== undefined ? String(req.body.notes) : undefined;
    if (!['valid', 'false_positive'].includes(status)) {
      return res.status(400).json({ error: 'Status review tidak valid.' });
    }
    const review = await prisma.proctoringReview.upsert({
      where: { candidateCode_eventId: { candidateCode, eventId } },
      update: { status, notes, reviewedBy: req.portalUser.id },
      create: { candidateCode, eventId, status, notes, reviewedBy: req.portalUser.id }
    });
    return res.json({ data: review });
  } catch (error) {
    console.error('Upsert proctoring review error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan review proctoring.' });
  }
};
