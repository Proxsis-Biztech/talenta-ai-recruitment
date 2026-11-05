import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { type AuthRequest } from '../middleware/auth';
import { resolveAdminTenantId } from '../middleware/tenant';

const prisma = new PrismaClient();

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const serializeScore = (score: {
  id: string;
  candidateCode: string;
  candidateName: string;
  programCode: string | null;
  programTitle: string;
  assessorId: string;
  competencies: string;
  interviewScore: number;
  compositeScore: number;
  recommendation: string;
  notes: string | null;
  status: string;
  lhaHash: string | null;
  lhaNumber: string | null;
  signedAt: Date | null;
  updatedAt: Date;
}) => ({
  ...score,
  competencies: parseJson(score.competencies, []),
  signedAt: score.signedAt
});

const candidateCodesForTenant = async (tenantId: string | null) => {
  if (!tenantId) return null;
  const users = await prisma.portalUser.findMany({
    where: { tenantId, candidateCode: { not: null } },
    select: { candidateCode: true }
  });
  return users.map((user) => user.candidateCode).filter(Boolean) as string[];
};

const tenantForRequest = (req: AuthRequest) => req.portalUser?.tenantId || resolveAdminTenantId(req);

export const upsertAssessorScore = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi asesor tidak valid.' });

    const candidateCode = String(req.body.candidateCode || '').trim();
    const candidateName = String(req.body.candidateName || '').trim();
    const programTitle = String(req.body.programTitle || req.body.program || '').trim();
    const programCode = req.body.programCode ? String(req.body.programCode).trim().toUpperCase() : null;
    const competencies = Array.isArray(req.body.competencies) ? req.body.competencies : [];
    const interviewScore = Number(req.body.interviewScore);
    const compositeScore = Number(req.body.compositeScore);
    const recommendation = String(req.body.recommendation || '').trim().toUpperCase();
    const notes = req.body.notes ? String(req.body.notes) : null;
    const status = req.body.status === 'signed' ? 'signed' : 'draft';

    if (!candidateCode || !candidateName || !programTitle) {
      return res.status(400).json({ error: 'Kandidat dan program wajib diisi.' });
    }
    if (!Number.isFinite(interviewScore) || !Number.isFinite(compositeScore)) {
      return res.status(400).json({ error: 'Skor wawancara dan komposit tidak valid.' });
    }
    if (!['LANJUT', 'DIPERTIMBANGKAN', 'TIDAK'].includes(recommendation)) {
      return res.status(400).json({ error: 'Rekomendasi tidak valid.' });
    }
    if (competencies.length === 0) {
      return res.status(400).json({ error: 'Rubrik kompetensi wajib diisi.' });
    }

    const tenantId = tenantForRequest(req);
    const candidate = await prisma.portalUser.findFirst({
      where: { candidateCode, role: 'peserta' },
      select: { tenantId: true }
    });
    if (tenantId && candidate?.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Kandidat bukan milik tenant Anda.' });
    }

    const signedAt = status === 'signed' ? new Date() : null;
    let lhaHash: string | null = null;
    let lhaNumber: string | null = null;

    if (status === 'signed') {
      const canonical = JSON.stringify({
        candidateCode,
        candidateName,
        programTitle,
        competencies,
        interviewScore,
        compositeScore,
        recommendation,
        assessorId: req.portalUser.id,
        signedAt: signedAt?.toISOString()
      });
      lhaHash = crypto.createHash('sha256').update(canonical).digest('hex');
      const suffix = candidateCode.replace(/\D/g, '').slice(-4) || Date.now().toString().slice(-4);
      lhaNumber = `LHA/SAI-PTF/${new Date().getFullYear()}/${suffix}-${lhaHash.slice(0, 6).toUpperCase()}`;
    }

    const existing = await prisma.assessorScore.findUnique({
      where: { candidateCode_programTitle: { candidateCode, programTitle } }
    });

    const data = {
      candidateName,
      programCode,
      assessorId: req.portalUser.id,
      competencies: JSON.stringify(competencies),
      interviewScore,
      compositeScore,
      recommendation,
      notes,
      status,
      ...(status === 'signed'
        ? { lhaHash, lhaNumber, signedAt }
        : { lhaHash: existing?.lhaHash ?? null, lhaNumber: existing?.lhaNumber ?? null, signedAt: existing?.signedAt ?? null })
    };

    const score = existing
      ? await prisma.assessorScore.update({ where: { id: existing.id }, data })
      : await prisma.assessorScore.create({
          data: {
            candidateCode,
            programTitle,
            ...data
          }
        });

    const candidateUser = await prisma.portalUser.findFirst({
      where: { candidateCode, role: 'peserta' },
      select: { id: true, email: true }
    });
    if (candidateUser) {
      await prisma.portalUser.update({
        where: { id: candidateUser.id },
        data: {
          interviewScore: compositeScore,
          interviewStatus: 'completed',
          interviewCompletedAt: new Date()
        }
      });
      await prisma.applicant.updateMany({
        where: { email: candidateUser.email },
        data: {
          interviewScore: Math.round(compositeScore),
          interviewStatus: 'scored',
          interviewResult: `Rekomendasi asesor: ${recommendation}`
        }
      });
    }

    return res.status(existing ? 200 : 201).json({ data: serializeScore(score) });
  } catch (error) {
    console.error('Upsert assessor score error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan penilaian asesor.' });
  }
};

export const listAssessorScores = async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = Boolean(req.user);
    const tenantId = tenantForRequest(req);
    const candidateCodes = await candidateCodesForTenant(tenantId);
    const scores = await prisma.assessorScore.findMany({
      where: {
        ...(isAdmin ? {} : { assessorId: req.portalUser?.id }),
        ...(candidateCodes ? { candidateCode: { in: candidateCodes } } : {})
      },
      orderBy: { updatedAt: 'desc' }
    });
    return res.json({ data: scores.map(serializeScore) });
  } catch (error) {
    console.error('List assessor scores error:', error);
    return res.status(500).json({ error: 'Gagal memuat daftar penilaian.' });
  }
};

export const getAssessorScore = async (req: AuthRequest, res: Response) => {
  try {
    const candidateCode = String(req.params.candidateCode).trim();
    const programTitle = req.query.programTitle ? String(req.query.programTitle) : undefined;
    const tenantId = tenantForRequest(req);
    const candidateCodes = await candidateCodesForTenant(tenantId);
    const score = await prisma.assessorScore.findFirst({
      where: {
        candidateCode,
        ...(programTitle ? { programTitle } : {}),
        ...(req.user ? {} : { assessorId: req.portalUser?.id }),
        ...(candidateCodes ? { candidateCode: { in: candidateCodes } } : {})
      },
      orderBy: { updatedAt: 'desc' }
    });
    if (!score) return res.status(404).json({ error: 'Penilaian belum tersedia.' });
    return res.json({ data: serializeScore(score) });
  } catch (error) {
    console.error('Get assessor score error:', error);
    return res.status(500).json({ error: 'Gagal memuat penilaian.' });
  }
};

export const getSignedLha = async (req: AuthRequest, res: Response) => {
  try {
    if (req.portalUser && req.portalUser.role !== 'asesor') {
      return res.status(403).json({ error: 'Akses LHA hanya untuk asesor dan administrator.' });
    }
    const candidateCode = String(req.params.candidateCode).trim();
    const tenantId = tenantForRequest(req);
    const candidateCodes = await candidateCodesForTenant(tenantId);
    const score = await prisma.assessorScore.findFirst({
      where: {
        candidateCode,
        status: 'signed',
        ...(candidateCodes ? { candidateCode: { in: candidateCodes } } : {})
      },
      orderBy: { signedAt: 'desc' }
    });
    if (!score) return res.status(404).json({ error: 'LHA bertanda tangan belum tersedia.' });
    return res.json({ data: serializeScore(score) });
  } catch (error) {
    console.error('Get signed LHA error:', error);
    return res.status(500).json({ error: 'Gagal memuat LHA.' });
  }
};