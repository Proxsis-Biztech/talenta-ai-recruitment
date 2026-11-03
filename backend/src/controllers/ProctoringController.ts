import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getProctoringReviews = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const candidateCode = String(req.params.candidateCode);
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
