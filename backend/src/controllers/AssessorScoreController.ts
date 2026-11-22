import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { type AuthRequest } from '../middleware/auth';
import { resolveAdminTenantId } from '../middleware/tenant';
import { buildPdf, formatDateId, type PdfBlock } from '../services/pdfService';
import { findReportTemplateForCompany } from './ReportTemplateController';

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
  assessor?: { name: string } | null;
}) => ({
  ...score,
  assessorName: score.assessor?.name || null,
  competencies: parseJson(score.competencies, []),
  signedAt: score.signedAt
});

const candidateCodesForTenant = async (req: AuthRequest, tenantId: string | null) => {
  if (!tenantId) return null;
  let companyName: string | null = req.portalUser?.companyName || null;
  if (!companyName) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    companyName = tenant?.name || null;
  }
  const users = await prisma.portalUser.findMany({
    where: {
      role: 'peserta',
      OR: [
        { tenantId },
        ...(companyName ? [{ companyName }] : [])
      ]
    },
    select: { id: true, candidateCode: true }
  });
  const keys = new Set<string>();
  for (const user of users) {
    if (user.candidateCode) keys.add(user.candidateCode);
    keys.add(user.id);
    keys.add(user.id.slice(0, 8));
  }
  return Array.from(keys);
};

const resolveCandidateScoreKeys = async (identifier: string): Promise<string[]> => {
  const keys = new Set<string>([identifier]);
  const user = await prisma.portalUser.findFirst({
    where: {
      role: 'peserta',
      OR: [
        { candidateCode: identifier },
        { id: identifier },
        ...(identifier.length >= 6 ? [{ id: { startsWith: identifier } }] : [])
      ]
    },
    select: { id: true, candidateCode: true }
  });
  if (user) {
    if (user.candidateCode) keys.add(user.candidateCode);
    keys.add(user.id);
    keys.add(user.id.slice(0, 8));
  }
  return Array.from(keys);
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
    if (tenantId && candidate?.tenantId && candidate.tenantId !== tenantId) {
      return res.status(403).json({
        error: 'Kandidat ini terdaftar pada tenant lain. Pastikan akun asesor dan kandidat berada pada tenant yang sama.'
      });
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

    if (existing?.status === 'signed' && status === 'signed') {
      return res.status(409).json({
        error: 'LHA untuk kandidat dan program ini sudah ditandatangani dan diterbitkan sebelumnya.'
      });
    }

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
    const tenantId = tenantForRequest(req);
    const candidateCodes = await candidateCodesForTenant(req, tenantId);
    const scores = await prisma.assessorScore.findMany({
      where: {
        ...(candidateCodes ? { candidateCode: { in: candidateCodes } } : {})
      },
      include: { assessor: { select: { name: true } } },
      orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }]
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
    const [allowedCodes, targetKeys] = await Promise.all([
      candidateCodesForTenant(req, tenantId),
      resolveCandidateScoreKeys(candidateCode)
    ]);

    const scopedKeys = allowedCodes
      ? targetKeys.filter((key) => allowedCodes.includes(key))
      : targetKeys;

    if (scopedKeys.length === 0) {
      return res.status(404).json({ error: 'Penilaian belum tersedia.' });
    }

    let score = await prisma.assessorScore.findFirst({
      where: {
        candidateCode: { in: scopedKeys },
        ...(programTitle ? { programTitle } : {})
      },
      include: { assessor: { select: { name: true } } },
      orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }]
    });
    if (!score && programTitle) {
      score = await prisma.assessorScore.findFirst({
        where: { candidateCode: { in: scopedKeys } },
        include: { assessor: { select: { name: true } } },
        orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }]
      });
    }
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
    const [allowedCodes, targetKeys] = await Promise.all([
      candidateCodesForTenant(req, tenantId),
      resolveCandidateScoreKeys(candidateCode)
    ]);
    const scopedKeys = allowedCodes
      ? targetKeys.filter((key) => allowedCodes.includes(key))
      : targetKeys;
    if (scopedKeys.length === 0) {
      return res.status(404).json({ error: 'LHA bertanda tangan belum tersedia.' });
    }
    const score = await prisma.assessorScore.findFirst({
      where: {
        candidateCode: { in: scopedKeys },
        status: 'signed'
      },
      include: { assessor: { select: { name: true } } },
      orderBy: { signedAt: 'desc' }
    });
    if (!score) return res.status(404).json({ error: 'LHA bertanda tangan belum tersedia.' });
    return res.json({ data: serializeScore(score) });
  } catch (error) {
    console.error('Get signed LHA error:', error);
    return res.status(500).json({ error: 'Gagal memuat LHA.' });
  }
};

export const downloadLhaPdf = async (req: AuthRequest, res: Response) => {
  try {
    const candidateCode = String(req.params.candidateCode).trim();
    if (!candidateCode) return res.status(400).json({ error: 'Kode kandidat wajib diisi.' });

    const isSelfPeserta = req.portalUser?.role === 'peserta';
    if (isSelfPeserta && req.portalUser?.candidateCode !== candidateCode) {
      return res.status(403).json({ error: 'Anda hanya dapat mengunduh LHA milik sendiri.' });
    }

    const tenantId = isSelfPeserta ? null : tenantForRequest(req);
    const [allowedCodes, targetKeys] = await Promise.all([
      candidateCodesForTenant(req, tenantId),
      resolveCandidateScoreKeys(candidateCode)
    ]);
    const scopedKeys = allowedCodes
      ? targetKeys.filter((key) => allowedCodes.includes(key))
      : targetKeys;
    if (scopedKeys.length === 0) {
      return res.status(404).json({ error: 'LHA bertanda tangan belum tersedia.' });
    }
    const score = await prisma.assessorScore.findFirst({
      where: {
        candidateCode: { in: scopedKeys },
        status: 'signed'
      },
      orderBy: { signedAt: 'desc' }
    });
    if (!score) return res.status(404).json({ error: 'LHA bertanda tangan belum tersedia.' });

    const candidatePortalUser = await prisma.portalUser.findFirst({
      where: { candidateCode },
      select: {
        companyId: true,
        companyName: true,
        tenant: { select: { code: true, name: true } }
      }
    });
    const reportTpl = await findReportTemplateForCompany([
      candidatePortalUser?.tenant?.code,
      candidatePortalUser?.companyId,
      candidatePortalUser?.tenant?.name,
      candidatePortalUser?.companyName
    ]);

    const competencies = parseJson<Array<Record<string, unknown>>>(score.competencies, []);
    const blocks: PdfBlock[] = [
      { type: 'heading', text: reportTpl?.headerTitle || 'LAPORAN HASIL ASESMEN (LHA)' },
      ...(reportTpl?.introText ? [{ type: 'text' as const, text: reportTpl.introText }, { type: 'spacer' as const, height: 4 }] : []),
      { type: 'kv', label: 'Nomor LHA', value: score.lhaNumber || '-' },
      { type: 'kv', label: 'Kode Kandidat', value: score.candidateCode },
      { type: 'kv', label: 'Nama Kandidat', value: score.candidateName },
      { type: 'kv', label: 'Program Asesmen', value: score.programTitle },
      { type: 'kv', label: 'Tanggal Ditandatangani', value: formatDateId(score.signedAt) },
      { type: 'rule' },
      ...(reportTpl?.showCompetencyTable !== false
        ? [
            { type: 'heading' as const, text: 'Skor Kompetensi', size: 11 },
            {
              type: 'table' as const,
              columns: ['Kompetensi', 'Rating', 'Catatan'],
              widths: [0.42, 0.14, 0.44],
              rows: competencies.length
                ? competencies.map((item) => [
                    String(item.name || item.competency || item.label || '-'),
                    String(item.rating ?? item.score ?? '-'),
                    String(item.note || item.notes || item.evidence || '-')
                  ])
                : [['Belum ada rincian kompetensi', '-', '-']]
            }
          ]
        : []),
      ...(reportTpl?.showInterviewScore !== false
        ? [{ type: 'kv' as const, label: 'Skor Wawancara', value: String(score.interviewScore) }]
        : []),
      { type: 'kv', label: 'Skor Komposit', value: String(score.compositeScore) },
      { type: 'kv', label: 'Rekomendasi Asesor', value: score.recommendation },
      ...(reportTpl?.showAssessorNotes !== false
        ? [
            { type: 'spacer' as const, height: 6 },
            { type: 'heading' as const, text: 'Catatan Asesor', size: 11 },
            { type: 'text' as const, text: score.notes || 'Tidak ada catatan tambahan.' }
          ]
        : []),
      ...(reportTpl?.signatoryName
        ? [
            { type: 'spacer' as const, height: 6 },
            { type: 'kv' as const, label: 'Penandatangan', value: `${reportTpl.signatoryName}${reportTpl.signatoryTitle ? ` (${reportTpl.signatoryTitle})` : ''}` }
          ]
        : []),
      { type: 'rule' },
      ...(reportTpl?.showIntegrityHash !== false
        ? [
            { type: 'text' as const, text: 'Dokumen ini ditandatangani secara elektronik. Verifikasi keaslian melalui hash SHA-256 berikut:' },
            { type: 'text' as const, text: score.lhaHash || '-', size: 9 }
          ]
        : []),
      {
        type: 'text',
        text:
          reportTpl?.closingNote ||
          'Hasil asesmen bersifat rekomendasi profesional asesor. Keputusan akhir mengikuti kebijakan pemberi tugas.'
      }
    ];

    const pdf = buildPdf(blocks, {
      brandName: reportTpl?.companyName || candidatePortalUser?.companyName || 'RIGHT',
      title: reportTpl?.pdfTitle || 'RIGHT - Laporan Hasil Asesmen',
      subtitle: reportTpl?.pdfSubtitle || score.lhaNumber || score.candidateCode,
      footer: reportTpl?.footerText || 'RIGHT Assessment Platform'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="LHA-${score.candidateCode}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    console.error('Download LHA PDF error:', error);
    return res.status(500).json({ error: 'Gagal membuat PDF LHA.' });
  }
};

export const downloadMyPortalLhaPdf = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) {
      return res.status(401).json({ error: 'Sesi peserta tidak valid.' });
    }
    const user = await prisma.portalUser.findUnique({
      where: { id: req.portalUser.id },
      select: { candidateCode: true }
    });
    if (!user?.candidateCode) {
      return res.status(404).json({ error: 'Kode kandidat belum tersedia pada akun ini.' });
    }
    req.params.candidateCode = user.candidateCode;
    return downloadLhaPdf(req, res);
  } catch (error) {
    console.error('Download portal LHA PDF error:', error);
    return res.status(500).json({ error: 'Gagal mengunduh PDF LHA.' });
  }
};
