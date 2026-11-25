import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { type AuthRequest } from '../middleware/auth';
import { isCandidateInAssessorScope, resolveAssessorScopeContext } from '../middleware/tenant';
import {
  buildAiCompetenciesFromData,
  getAiReviewRecord,
  isDeterministicCalibrationSample,
  parseTimestampedTranscript,
  saveAiReviewRecord
} from '../services/reviewWorkflowService';

const prisma = new PrismaClient();
const RECORDING_DIR = path.join(__dirname, '../../uploads/recordings');

const ensureRecordingDir = () => {
  if (!fs.existsSync(RECORDING_DIR)) fs.mkdirSync(RECORDING_DIR, { recursive: true });
};

const safeExtension = (mime: string | undefined, originalName: string | undefined): string => {
  if (mime?.includes('webm')) return '.webm';
  if (mime?.includes('ogg')) return '.ogg';
  if (mime?.includes('mp4')) return '.m4a';
  if (mime?.includes('mpeg')) return '.mp3';
  if (mime?.includes('wav')) return '.wav';
  const ext = path.extname(originalName || '').toLowerCase();
  return /^\.(webm|ogg|mp4|m4a|mp3|wav)$/.test(ext) ? ext : '.webm';
};

export const uploadInterviewRecording = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const file = req.file;
    if (!file || !file.buffer || file.size === 0) {
      return res.status(400).json({ error: 'Berkas rekaman tidak ditemukan atau kosong.' });
    }
    if (file.size > 25 * 1024 * 1024) {
      return res.status(413).json({ error: 'Ukuran rekaman maksimal 25MB.' });
    }

    ensureRecordingDir();
    const fileName = `${req.portalUser.id}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExtension(file.mimetype, file.originalname)}`;
    fs.writeFileSync(path.join(RECORDING_DIR, fileName), file.buffer);

    const durationSec = Number.isFinite(Number(req.body.durationSec)) ? Math.round(Number(req.body.durationSec)) : null;
    const record = await prisma.interviewRecording.create({
      data: {
        userId: req.portalUser.id,
        candidateCode: req.portalUser.candidateCode || null,
        programCode: req.body.programCode ? String(req.body.programCode).toUpperCase() : req.portalUser.assessmentId || null,
        kind: 'audio',
        fileName,
        mimeType: file.mimetype || 'audio/webm',
        sizeBytes: file.size,
        durationSec
      }
    });

    return res.status(201).json({
      data: { id: record.id, fileName: record.fileName, sizeBytes: record.sizeBytes, createdAt: record.createdAt }
    });
  } catch (error) {
    console.error('Upload interview recording error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan rekaman wawancara.' });
  }
};

export const saveInterviewTranscript = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const transcript = String(req.body.transcript || '').trim();
    if (!transcript) return res.status(400).json({ error: 'Transkrip wawancara kosong.' });
    if (transcript.length > 400_000) return res.status(413).json({ error: 'Transkrip terlalu panjang.' });

    const record = await prisma.interviewRecording.create({
      data: {
        userId: req.portalUser.id,
        candidateCode: req.portalUser.candidateCode || null,
        programCode: req.body.programCode ? String(req.body.programCode).toUpperCase() : req.portalUser.assessmentId || null,
        kind: 'transcript',
        mimeType: 'text/plain',
        sizeBytes: Buffer.byteLength(transcript, 'utf8'),
        transcript,
        durationSec: Number.isFinite(Number(req.body.durationSec)) ? Math.round(Number(req.body.durationSec)) : null
      }
    });

    if (req.portalUser.candidateCode) {
      const applicant = await prisma.applicant.findFirst({ where: { email: req.portalUser.email } });
      if (applicant) {
        await prisma.applicant.update({
          where: { id: applicant.id },
          data: {
            interviewTranscript: transcript,
            interviewStatus: applicant.interviewStatus === 'scored' ? 'scored' : 'completed'
          }
        });
      }
    }

    const aiScoreNum = Number.isFinite(Number(req.body.aiScore)) ? Number(req.body.aiScore) : null;
    await prisma.portalUser.update({
      where: { id: req.portalUser.id },
      data: {
        interviewStatus: 'completed',
        interviewCompletedAt: new Date(),
        ...(aiScoreNum != null ? { interviewScore: aiScoreNum } : {})
      }
    });

    const candidateKey = (req.portalUser.candidateCode || req.portalUser.id).toUpperCase();
    const existingReview = await getAiReviewRecord(candidateKey);
    const segments = parseTimestampedTranscript(transcript);
    const candidateTurnCount = segments.filter((s) => s.speaker === 'Kandidat').length;
    const micFailed = Boolean(req.body.micFailed);
    const connectionLost = Boolean(req.body.connectionLost);
    const issueReason = micFailed
      ? 'Mikrofon peserta gagal / tidak terdeteksi selama wawancara AI.'
      : connectionLost
        ? 'Koneksi terputus sebelum sesi wawancara AI selesai.'
        : candidateTurnCount < 2
          ? 'Jumlah respons kandidat pada transkrip sangat minim (< 2 giliran bicara).'
          : null;

    const aiCompetencies =
      Array.isArray(req.body.aiCompetencies) && req.body.aiCompetencies.length > 0
        ? req.body.aiCompetencies
        : buildAiCompetenciesFromData({
            transcript,
            overallScore: aiScoreNum
          });

    await saveAiReviewRecord({
      candidateCode: candidateKey,
      aiCompetencies,
      aiOverallScore: aiScoreNum ?? existingReview?.aiOverallScore ?? null,
      aiSummary:
        (typeof req.body.aiSummary === 'string' && req.body.aiSummary.trim()) ||
        existingReview?.aiSummary ||
        null,
      isCalibrationSample: existingReview?.isCalibrationSample ?? isDeterministicCalibrationSample(candidateKey),
      needsAction: Boolean(issueReason) || Boolean(existingReview?.needsAction),
      actionReason: issueReason || existingReview?.actionReason || null,
      actionType: issueReason ? 'auto_detected' : existingReview?.actionType || null,
      finalized: existingReview?.finalized ?? false,
      aiOverrideReason: existingReview?.aiOverrideReason ?? null,
      manualDecisionNote: existingReview?.manualDecisionNote ?? null,
      updatedAt: new Date().toISOString()
    });

    return res.status(201).json({ data: { id: record.id, createdAt: record.createdAt } });
  } catch (error) {
    console.error('Save interview transcript error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan transkrip wawancara.' });
  }
};

export const listMyRecordings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const records = await prisma.interviewRecording.findMany({
      where: { userId: req.portalUser.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    return res.json({ data: records });
  } catch (error) {
    console.error('List recordings error:', error);
    return res.status(500).json({ error: 'Gagal memuat rekaman wawancara.' });
  }
};

export const listCandidateRecordings = async (req: AuthRequest, res: Response) => {
  try {
    const candidateCode = String(req.params.candidateCode || '').trim();
    if (!candidateCode) return res.status(400).json({ error: 'Kode kandidat wajib diisi.' });

    const user = await prisma.portalUser.findFirst({
      where: { candidateCode },
      select: {
        id: true,
        tenantId: true,
        companyId: true,
        companyName: true,
        tenant: { select: { name: true } }
      }
    });
    if (!user) return res.status(404).json({ error: 'Kandidat tidak ditemukan.' });

    if (req.portalUser) {
      const scopeCtx = await resolveAssessorScopeContext(req.portalUser, prisma);
      if (!isCandidateInAssessorScope(scopeCtx, user)) {
        return res.status(403).json({ error: 'Kandidat bukan milik tenant PT Anda.' });
      }
    }

    const records = await prisma.interviewRecording.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ data: records });
  } catch (error) {
    console.error('List candidate recordings error:', error);
    return res.status(500).json({ error: 'Gagal memuat rekaman kandidat.' });
  }
};

export const downloadRecording = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const id = String(req.params.id);
    const record = await prisma.interviewRecording.findUnique({ where: { id } });
    if (!record || record.kind !== 'audio' || !record.fileName) {
      return res.status(404).json({ error: 'Rekaman tidak ditemukan.' });
    }
    if (req.portalUser.role === 'peserta' && record.userId !== req.portalUser.id) {
      return res.status(403).json({ error: 'Anda tidak berhak mengakses rekaman ini.' });
    }
    if (req.portalUser.role === 'asesor') {
      const owner = await prisma.portalUser.findUnique({
        where: { id: record.userId },
        select: {
          tenantId: true,
          companyId: true,
          companyName: true,
          tenant: { select: { name: true } }
        }
      });
      const scopeCtx = await resolveAssessorScopeContext(req.portalUser, prisma);
      if (!isCandidateInAssessorScope(scopeCtx, owner)) {
        return res.status(403).json({ error: 'Rekaman ini bukan milik tenant PT Anda.' });
      }
    }
    const filePath = path.join(RECORDING_DIR, path.basename(record.fileName));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Berkas rekaman tidak tersedia.' });

    res.setHeader('Content-Type', record.mimeType || 'audio/webm');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(record.fileName)}"`);
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Download recording error:', error);
    return res.status(500).json({ error: 'Gagal mengunduh rekaman.' });
  }
};
