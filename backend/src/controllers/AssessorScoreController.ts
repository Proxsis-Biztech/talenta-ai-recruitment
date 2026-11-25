import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { type AuthRequest } from '../middleware/auth';
import {
  isCandidateInAssessorScope,
  normalizeCompanyName,
  resolveAdminTenantId,
  resolveAssessorScopeContext
} from '../middleware/tenant';
import { buildPdf, formatDateId, type PdfBlock } from '../services/pdfService';
import { findReportTemplateForCompany } from './ReportTemplateController';
import { recordAuditLog, resolveRequestIp } from '../services/auditService';
import {
  computeCalibrationMetrics,
  createLhaCorrectionRequest,
  getCalibrationRecord,
  getLhaCorrectionRequestById,
  getLhaVersionMeta,
  listCalibrationRecords,
  listLhaCorrectionRequests,
  saveCalibrationRecord,
  saveLhaCorrectionRequest,
  saveLhaVersionMeta,
  type CompetencyScoreItem,
  type LhaVersionSnapshot
} from '../services/lhaGovernanceService';
import {
  getAiReviewRecord,
  isDeterministicCalibrationSample,
  saveAiReviewRecord
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
  if (req.portalUser?.role === 'asesor') {
    const scopeCtx = await resolveAssessorScopeContext(req.portalUser, prisma);
    const users = await prisma.portalUser.findMany({
      where: { role: 'peserta' },
      select: {
        id: true,
        candidateCode: true,
        tenantId: true,
        companyId: true,
        companyName: true,
        tenant: { select: { name: true } }
      }
    });
    const keys = new Set<string>();
    for (const user of users) {
      if (!isCandidateInAssessorScope(scopeCtx, user)) continue;
      if (user.candidateCode) keys.add(user.candidateCode);
      keys.add(user.id);
      keys.add(user.id.slice(0, 8));
    }
    return Array.from(keys);
  }
  if (!tenantId) return null;
  let companyName: string | null = req.portalUser?.companyName || null;
  if (!companyName) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    companyName = tenant?.name || null;
  }
  const normalizedTargetCompany = normalizeCompanyName(companyName);
  const users = await prisma.portalUser.findMany({
    where: {
      role: 'peserta',
      OR: [
        { tenantId },
        ...(companyName ? [{ companyName }, { tenantId: null }] : [])
      ]
    },
    select: { id: true, candidateCode: true, tenantId: true, companyName: true }
  });
  const keys = new Set<string>();
  for (const user of users) {
    const matchesTenant =
      user.tenantId === tenantId ||
      (normalizedTargetCompany && normalizeCompanyName(user.companyName) === normalizedTargetCompany);
    if (!matchesTenant) continue;
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

const syncCandidateFinalScores = async (params: {
  candidateCode: string;
  compositeScore: number;
  recommendation: string;
}) => {
  const candidateUser = await prisma.portalUser.findFirst({
    where: {
      role: 'peserta',
      OR: [{ candidateCode: params.candidateCode }, { id: params.candidateCode }]
    },
    select: { id: true, email: true }
  });
  if (candidateUser) {
    await prisma.portalUser.update({
      where: { id: candidateUser.id },
      data: {
        interviewScore: params.compositeScore,
        interviewStatus: 'completed',
        interviewCompletedAt: new Date()
      }
    });
    await prisma.applicant.updateMany({
      where: { email: candidateUser.email },
      data: {
        interviewScore: Math.round(params.compositeScore),
        interviewStatus: 'scored',
        interviewResult: `Rekomendasi asesor: ${params.recommendation}`
      }
    });
  }
};

const signCanonicalLha = (params: {
  candidateCode: string;
  programTitle: string;
  interviewScore: number;
  compositeScore: number;
  recommendation: string;
  assessorId: string;
  version?: number;
}) => {
  const signedAt = new Date();
  const version = params.version ?? 1;
  const canonical = JSON.stringify({
    candidateCode: params.candidateCode,
    programTitle: params.programTitle,
    interviewScore: params.interviewScore,
    compositeScore: params.compositeScore,
    recommendation: params.recommendation,
    assessorId: params.assessorId,
    version,
    signedAt: signedAt.toISOString()
  });
  const lhaHash = crypto.createHash('sha256').update(canonical).digest('hex');
  const suffix = params.candidateCode.replace(/\D/g, '').slice(-4) || Date.now().toString().slice(-4);
  const revTag = version > 1 ? `-REV${version}` : '';
  const lhaNumber = `LHA/SAI-PTF/${new Date().getFullYear()}/${suffix}${revTag}-${lhaHash.slice(0, 6).toUpperCase()}`;
  return { signedAt, lhaHash, lhaNumber };
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
    const finalized = Boolean(req.body.finalized) || status === 'signed';
    const aiOverrideReason = typeof req.body.aiOverrideReason === 'string' ? req.body.aiOverrideReason.trim() : '';

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
    const allowedCodes = await candidateCodesForTenant(req, tenantId);
    const targetKeys = await resolveCandidateScoreKeys(candidateCode);
    if (allowedCodes && !targetKeys.some((k) => allowedCodes.includes(k))) {
      return res.status(403).json({
        error: 'Kandidat ini terdaftar pada tenant PT lain. Pastikan akun asesor dan kandidat berada pada tenant PT yang sama.'
      });
    }

    // Quality control: require written reason if any AI competency score was modified by the assessor
    const existingAiReview = await getAiReviewRecord(candidateCode);
    const aiBaseline = existingAiReview?.aiCompetencies || [];
    const overriddenItems: Array<{ name: string; aiScore: number; newScore: number }> = [];
    for (const comp of competencies) {
      const compName = String(comp?.name || '');
      const submittedRating = Number(comp?.score ?? comp?.rating ?? 0);
      const aiMatch = aiBaseline.find(
        (ai) => ai.name.toLowerCase() === compName.toLowerCase()
      );
      if (aiMatch && submittedRating > 0 && submittedRating !== aiMatch.aiScore) {
        overriddenItems.push({
          name: compName,
          aiScore: aiMatch.aiScore,
          newScore: submittedRating
        });
      }
    }
    if (overriddenItems.length > 0 && aiOverrideReason.length < 5) {
      return res.status(400).json({
        error: 'Anda mengubah skor rekomendasi AI. Wajib mengisi alasan perubahan skor minimal 5 karakter.'
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

    await syncCandidateFinalScores({
      candidateCode,
      compositeScore,
      recommendation
    });

    const codeKey = candidateCode.toUpperCase();
    await saveAiReviewRecord({
      candidateCode: codeKey,
      aiCompetencies: existingAiReview?.aiCompetencies || [],
      aiOverallScore: existingAiReview?.aiOverallScore ?? null,
      aiSummary: existingAiReview?.aiSummary ?? null,
      isCalibrationSample: existingAiReview?.isCalibrationSample ?? isDeterministicCalibrationSample(codeKey),
      needsAction: existingAiReview?.needsAction ?? false,
      actionReason: existingAiReview?.actionReason ?? null,
      actionType: existingAiReview?.actionType ?? null,
      finalized: finalized || Boolean(existingAiReview?.finalized),
      aiOverrideReason: aiOverrideReason || existingAiReview?.aiOverrideReason || null,
      manualDecisionNote: existingAiReview?.manualDecisionNote ?? null,
      updatedAt: new Date().toISOString()
    });

    if (overriddenItems.length > 0) {
      const diffSummary = overriddenItems
        .map((o) => `${o.name}: AI ${o.aiScore}/5 -> Asesor ${o.newScore}/5`)
        .join('; ');
      recordAuditLog({
        actor: req.portalUser.name || req.portalUser.email || 'asesor',
        action: 'AI_SCORE_OVERRIDE',
        category: 'DATA_MUTATION',
        ip: resolveRequestIp(req),
        target: `${candidateCode} (${programTitle})`,
        details: `Asesor mengubah skor AI [${diffSummary}]. Alasan: ${aiOverrideReason}`,
        status: 'SUCCESS'
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
    const versionMeta = await getLhaVersionMeta(score.candidateCode, score.programTitle);
    return res.json({ data: { ...serializeScore(score), version: versionMeta.currentVersion } });
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

    const versionMeta = await getLhaVersionMeta(score.candidateCode, score.programTitle);
    const competencies = parseJson<Array<Record<string, unknown>>>(score.competencies, []);
    const blocks: PdfBlock[] = [
      { type: 'heading', text: reportTpl?.headerTitle || 'LAPORAN HASIL ASESMEN (LHA)' },
      ...(reportTpl?.introText ? [{ type: 'text' as const, text: reportTpl.introText }, { type: 'spacer' as const, height: 4 }] : []),
      { type: 'kv', label: 'Nomor LHA', value: score.lhaNumber || '-' },
      {
        type: 'kv',
        label: 'Versi Laporan',
        value: `v${versionMeta.currentVersion}${versionMeta.currentVersion > 1 ? ' (Koreksi Resmi Disetujui)' : ' (Terbitan Awal)'}`
      },
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
      ...(versionMeta.history.length > 0
        ? [
            {
              type: 'text' as const,
              text: `Catatan Versi: Dokumen ini adalah versi v${versionMeta.currentVersion} hasil koreksi resmi yang menggantikan ${versionMeta.history.length} versi sebelumnya (${versionMeta.history.map((h) => `v${h.version}: ${h.lhaNumber || '-'}`).join(', ')}).`,
              size: 9
            }
          ]
        : []),
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

// ─────────────────────────────────────────────────────────────────────────────
// Dual-Assessor Scoring & Score Calibration
// ─────────────────────────────────────────────────────────────────────────────

const resolveCandidatePrimaryScore = async (candidateCode: string, programTitle?: string) => {
  const keys = await resolveCandidateScoreKeys(candidateCode);
  if (keys.length === 0) return null;
  let primary = await prisma.assessorScore.findFirst({
    where: {
      candidateCode: { in: keys },
      ...(programTitle ? { programTitle } : {})
    },
    include: { assessor: { select: { name: true } } },
    orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }]
  });
  if (!primary && programTitle) {
    primary = await prisma.assessorScore.findFirst({
      where: { candidateCode: { in: keys } },
      include: { assessor: { select: { name: true } } },
      orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }]
    });
  }
  return primary;
};

export const upsertSecondaryScore = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi asesor tidak valid.' });
    const candidateCode = String(req.params.candidateCode || '').trim();
    const candidateName = String(req.body.candidateName || candidateCode).trim();
    const programTitle = String(req.body.programTitle || 'Program Asesmen').trim();
    if (!candidateCode) return res.status(400).json({ error: 'Kode kandidat wajib diisi.' });

    const allowedCodes = await candidateCodesForTenant(req, tenantForRequest(req));
    const keys = await resolveCandidateScoreKeys(candidateCode);
    if (allowedCodes && !keys.some((k) => allowedCodes.includes(k))) {
      return res.status(403).json({ error: 'Kandidat bukan milik tenant Anda.' });
    }

    const competencies = Array.isArray(req.body.competencies) ? (req.body.competencies as CompetencyScoreItem[]) : [];
    const interviewScore = Number(req.body.interviewScore);
    const compositeScore = req.body.compositeScore != null ? Number(req.body.compositeScore) : null;
    const recommendation = String(req.body.recommendation || 'DIPERTIMBANGKAN').toUpperCase();
    const notes = String(req.body.notes || '');

    if (!Number.isFinite(interviewScore) || interviewScore < 0 || interviewScore > 100) {
      return res.status(400).json({ error: 'Skor wawancara penilai ke-2 harus antara 0 dan 100.' });
    }
    if (!['LANJUT', 'DIPERTIMBANGKAN', 'TIDAK'].includes(recommendation)) {
      return res.status(400).json({ error: 'Rekomendasi harus LANJUT, DIPERTIMBANGKAN, atau TIDAK.' });
    }

    const existing = await getCalibrationRecord(candidateCode, programTitle);
    const updated = await saveCalibrationRecord({
      candidateCode,
      candidateName: existing?.candidateName || candidateName,
      programTitle: existing?.programTitle || programTitle,
      tenantId: existing?.tenantId ?? tenantForRequest(req) ?? null,
      secondary: {
        assessorId: req.portalUser.id,
        assessorName: req.portalUser.name || req.portalUser.email || 'Penilai Ke-2',
        competencies,
        interviewScore,
        compositeScore: compositeScore !== null && Number.isFinite(compositeScore) ? compositeScore : null,
        recommendation: recommendation as 'LANJUT' | 'DIPERTIMBANGKAN' | 'TIDAK',
        notes,
        submittedAt: new Date().toISOString()
      },
      consensus: existing?.consensus || null
    });

    const primary = await resolveCandidatePrimaryScore(candidateCode, programTitle);
    const metrics = computeCalibrationMetrics(
      primary
        ? {
            competencies: parseJson<CompetencyScoreItem[]>(primary.competencies, []),
            interviewScore: primary.interviewScore,
            compositeScore: primary.compositeScore,
            recommendation: primary.recommendation
          }
        : null,
      updated.secondary
    );

    recordAuditLog({
      actor: req.portalUser.name || req.portalUser.email || 'asesor',
      action: 'SECONDARY_ASSESSOR_SCORE',
      category: 'DATA_MUTATION',
      ip: resolveRequestIp(req),
      target: `${candidateCode} (${programTitle})`,
      details: `Penilai ke-2 menyimpan evaluasi (${interviewScore}/100, ${recommendation}). Status kalibrasi: ${metrics.status}.`,
      status: 'SUCCESS'
    });

    return res.json({ data: { calibration: updated, metrics } });
  } catch (error) {
    console.error('Upsert secondary score error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan evaluasi penilai ke-2.' });
  }
};

export const getCandidateCalibration = async (req: AuthRequest, res: Response) => {
  try {
    const candidateCode = String(req.params.candidateCode || '').trim();
    const programTitle = req.query.programTitle ? String(req.query.programTitle).trim() : undefined;
    if (!candidateCode) return res.status(400).json({ error: 'Kode kandidat wajib diisi.' });

    const allowedCodes = await candidateCodesForTenant(req, tenantForRequest(req));
    const keys = await resolveCandidateScoreKeys(candidateCode);
    if (allowedCodes && !keys.some((k) => allowedCodes.includes(k))) {
      return res.status(403).json({ error: 'Kandidat bukan milik tenant Anda.' });
    }

    const primary = await resolveCandidatePrimaryScore(candidateCode, programTitle);
    const calibration = await getCalibrationRecord(
      primary?.candidateCode || candidateCode,
      primary?.programTitle || programTitle
    );

    const primarySerialized = primary ? serializeScore(primary) : null;
    const metrics = computeCalibrationMetrics(
      primarySerialized
        ? {
            competencies: primarySerialized.competencies,
            interviewScore: primarySerialized.interviewScore,
            compositeScore: primarySerialized.compositeScore,
            recommendation: primarySerialized.recommendation
          }
        : null,
      calibration?.secondary || null
    );

    return res.json({
      data: {
        primary: primarySerialized,
        secondary: calibration?.secondary || null,
        consensus: calibration?.consensus || null,
        metrics
      }
    });
  } catch (error) {
    console.error('Get candidate calibration error:', error);
    return res.status(500).json({ error: 'Gagal memuat data kalibrasi.' });
  }
};

export const getCalibrationOverview = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = tenantForRequest(req);
    const allowedCodes = await candidateCodesForTenant(req, tenantId);
    const [scores, calibrations] = await Promise.all([
      prisma.assessorScore.findMany({
        where: allowedCodes ? { candidateCode: { in: allowedCodes } } : {},
        include: { assessor: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' }
      }),
      listCalibrationRecords()
    ]);

    const seenKeys = new Set<string>();
    const rows: Array<Record<string, unknown>> = [];

    for (const score of scores) {
      const cal =
        calibrations.find(
          (c) =>
            c.candidateCode.toUpperCase() === score.candidateCode.toUpperCase() &&
            c.programTitle.toUpperCase() === score.programTitle.toUpperCase()
        ) ||
        calibrations.find((c) => c.candidateCode.toUpperCase() === score.candidateCode.toUpperCase()) ||
        null;
      seenKeys.add(`${score.candidateCode.toUpperCase()}::${score.programTitle.toUpperCase()}`);
      const primarySerialized = serializeScore(score);
      const metrics = computeCalibrationMetrics(
        {
          competencies: primarySerialized.competencies,
          interviewScore: primarySerialized.interviewScore,
          compositeScore: primarySerialized.compositeScore,
          recommendation: primarySerialized.recommendation
        },
        cal?.secondary || null
      );
      rows.push({
        candidateCode: score.candidateCode,
        candidateName: score.candidateName,
        programTitle: score.programTitle,
        lhaStatus: score.status,
        primary: primarySerialized,
        secondary: cal?.secondary || null,
        consensus: cal?.consensus || null,
        metrics
      });
    }

    for (const cal of calibrations) {
      const key = `${cal.candidateCode.toUpperCase()}::${cal.programTitle.toUpperCase()}`;
      if (seenKeys.has(key)) continue;
      if (allowedCodes && !allowedCodes.includes(cal.candidateCode)) continue;
      const metrics = computeCalibrationMetrics(null, cal.secondary);
      rows.push({
        candidateCode: cal.candidateCode,
        candidateName: cal.candidateName,
        programTitle: cal.programTitle,
        lhaStatus: 'secondary_only',
        primary: null,
        secondary: cal.secondary,
        consensus: cal.consensus || null,
        metrics
      });
    }

    return res.json({ data: rows });
  } catch (error) {
    console.error('Get calibration overview error:', error);
    return res.status(500).json({ error: 'Gagal memuat matriks kalibrasi.' });
  }
};

export const finalizeCalibrationConsensus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi asesor tidak valid.' });
    const candidateCode = String(req.params.candidateCode || '').trim();
    const allowedCodes = await candidateCodesForTenant(req, tenantForRequest(req));
    const keys = await resolveCandidateScoreKeys(candidateCode);
    if (allowedCodes && !keys.some((k) => allowedCodes.includes(k))) {
      return res.status(403).json({ error: 'Kandidat bukan milik tenant PT Anda.' });
    }
    const programTitle = String(req.body.programTitle || '').trim();
    const mode = (['average', 'primary', 'secondary', 'custom'].includes(String(req.body.mode))
      ? req.body.mode
      : 'average') as 'average' | 'primary' | 'secondary' | 'custom';

    const primary = await resolveCandidatePrimaryScore(candidateCode, programTitle || undefined);
    const effectiveProgramTitle = primary?.programTitle || programTitle || 'Program Asesmen';
    const calibration = await getCalibrationRecord(primary?.candidateCode || candidateCode, effectiveProgramTitle);

    const competencies = Array.isArray(req.body.competencies)
      ? (req.body.competencies as CompetencyScoreItem[])
      : calibration?.secondary?.competencies ||
        (primary ? parseJson<CompetencyScoreItem[]>(primary.competencies, []) : []);
    const interviewScore = Number(req.body.interviewScore);
    const compositeScore = req.body.compositeScore != null ? Number(req.body.compositeScore) : null;
    const recommendation = String(req.body.recommendation || 'DIPERTIMBANGKAN').toUpperCase() as
      | 'LANJUT'
      | 'DIPERTIMBANGKAN'
      | 'TIDAK';
    const notes = String(req.body.notes || '');

    if (!Number.isFinite(interviewScore) || interviewScore < 0 || interviewScore > 100) {
      return res.status(400).json({ error: 'Skor wawancara konsensus tidak valid.' });
    }

    const updatedCal = await saveCalibrationRecord({
      candidateCode: primary?.candidateCode || candidateCode,
      candidateName: primary?.candidateName || calibration?.candidateName || candidateCode,
      programTitle: effectiveProgramTitle,
      tenantId: calibration?.tenantId ?? tenantForRequest(req) ?? null,
      secondary: calibration?.secondary || null,
      consensus: {
        mode,
        calibratedBy: req.portalUser.name || req.portalUser.email || 'Panel Kalibrasi',
        calibratedById: req.portalUser.id,
        calibratedAt: new Date().toISOString(),
        competencies,
        interviewScore,
        compositeScore,
        recommendation,
        notes
      }
    });

    // If primary is absent or still draft, automatically apply consensus into draft AssessorScore
    let updatedPrimary = primary;
    if (!primary) {
      updatedPrimary = await prisma.assessorScore.create({
        data: {
          candidateCode,
          candidateName: calibration?.candidateName || candidateCode,
          programCode: req.body.programCode ? String(req.body.programCode) : null,
          programTitle: effectiveProgramTitle,
          assessorId: req.portalUser.id,
          competencies: JSON.stringify(competencies),
          interviewScore,
          compositeScore: compositeScore ?? interviewScore,
          recommendation,
          notes: notes || null,
          status: 'draft'
        },
        include: { assessor: { select: { name: true } } }
      });
    } else if (primary.status !== 'signed') {
      updatedPrimary = await prisma.assessorScore.update({
        where: { id: primary.id },
        data: {
          competencies: JSON.stringify(competencies),
          interviewScore,
          compositeScore: compositeScore ?? primary.compositeScore,
          recommendation,
          notes: notes || primary.notes
        },
        include: { assessor: { select: { name: true } } }
      });
    }

    recordAuditLog({
      actor: req.portalUser.name || req.portalUser.email || 'asesor',
      action: 'ASSESSOR_CALIBRATION_CONSENSUS',
      category: 'DATA_MUTATION',
      ip: resolveRequestIp(req),
      target: `${candidateCode} (${effectiveProgramTitle})`,
      details: `Kalibrasi konsensus (${mode}) diterapkan: Interview ${interviewScore}/100, Rekomendasi ${recommendation}.`,
      status: 'SUCCESS'
    });

    return res.json({
      data: {
        calibration: updatedCal,
        primary: updatedPrimary ? serializeScore(updatedPrimary) : null,
        appliedToDraft: !primary || primary.status !== 'signed'
      }
    });
  } catch (error) {
    console.error('Finalize calibration consensus error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan konsensus kalibrasi.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Post-Publication Official LHA Correction, Approval & Versioning
// ─────────────────────────────────────────────────────────────────────────────

export const submitLhaCorrectionRequest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi asesor tidak valid.' });
    const candidateCode = String(req.params.candidateCode || '').trim();
    const allowedCodes = await candidateCodesForTenant(req, tenantForRequest(req));
    const keys = await resolveCandidateScoreKeys(candidateCode);
    if (allowedCodes && !keys.some((k) => allowedCodes.includes(k))) {
      return res.status(403).json({ error: 'Kandidat bukan milik tenant PT Anda.' });
    }
    const programTitle = req.body.programTitle ? String(req.body.programTitle).trim() : undefined;
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 10) {
      return res.status(400).json({ error: 'Alasan koreksi resmi wajib diisi minimal 10 karakter.' });
    }

    const score = await resolveCandidatePrimaryScore(candidateCode, programTitle);
    if (!score || score.status !== 'signed') {
      return res.status(404).json({ error: 'Hanya LHA yang sudah terbit (signed) yang dapat diajukan koreksi resmi.' });
    }

    const competencies = Array.isArray(req.body.competencies)
      ? (req.body.competencies as CompetencyScoreItem[])
      : parseJson<CompetencyScoreItem[]>(score.competencies, []);
    const interviewScore = Number(req.body.interviewScore);
    const compositeScore = Number(req.body.compositeScore);
    const recommendation = String(req.body.recommendation || score.recommendation).toUpperCase() as
      | 'LANJUT'
      | 'DIPERTIMBANGKAN'
      | 'TIDAK';
    const notes = String(req.body.notes ?? score.notes ?? '');

    if (!Number.isFinite(interviewScore) || !Number.isFinite(compositeScore)) {
      return res.status(400).json({ error: 'Skor wawancara dan komposit usulan tidak valid.' });
    }
    if (!['LANJUT', 'DIPERTIMBANGKAN', 'TIDAK'].includes(recommendation)) {
      return res.status(400).json({ error: 'Rekomendasi tidak valid.' });
    }

    const versionMeta = await getLhaVersionMeta(score.candidateCode, score.programTitle);
    const candidateUser = await prisma.portalUser.findFirst({
      where: {
        OR: [{ candidateCode: score.candidateCode }, { id: score.candidateCode }]
      },
      select: { tenantId: true }
    });

    const created = await createLhaCorrectionRequest({
      scoreId: score.id,
      candidateCode: score.candidateCode,
      candidateName: score.candidateName,
      programTitle: score.programTitle,
      programCode: score.programCode,
      tenantId: candidateUser?.tenantId || tenantForRequest(req) || null,
      requestedById: req.portalUser.id,
      requestedByName: req.portalUser.name || req.portalUser.email || 'Asesor',
      reason,
      currentVersion: versionMeta.currentVersion,
      currentSnapshot: {
        lhaNumber: score.lhaNumber,
        lhaHash: score.lhaHash,
        signedAt: score.signedAt ? score.signedAt.toISOString() : null,
        competencies: parseJson<CompetencyScoreItem[]>(score.competencies, []),
        interviewScore: score.interviewScore,
        compositeScore: score.compositeScore,
        recommendation: score.recommendation,
        notes: score.notes
      },
      proposed: {
        competencies,
        interviewScore,
        compositeScore,
        recommendation,
        notes
      }
    });

    recordAuditLog({
      actor: req.portalUser.name || req.portalUser.email || 'asesor',
      action: 'LHA_CORRECTION_REQUESTED',
      category: 'DATA_MUTATION',
      ip: resolveRequestIp(req),
      target: `${score.candidateCode} (${score.lhaNumber || 'LHA'})`,
      details: `Permintaan koreksi LHA v${versionMeta.currentVersion} diajukan: ${reason}`,
      status: 'SUCCESS'
    });

    return res.status(201).json({ data: created });
  } catch (error) {
    console.error('Submit LHA correction error:', error);
    return res.status(500).json({ error: 'Gagal mengajukan permintaan koreksi LHA.' });
  }
};

export const getLhaVersionHistory = async (req: AuthRequest, res: Response) => {
  try {
    const candidateCode = String(req.params.candidateCode || '').trim();
    const programTitle = req.query.programTitle ? String(req.query.programTitle).trim() : undefined;
    const score = await resolveCandidatePrimaryScore(candidateCode, programTitle);
    if (!score) {
      return res.json({ data: { currentVersion: 1, current: null, history: [], correctionRequests: [] } });
    }

    const [versionMeta, correctionRequests] = await Promise.all([
      getLhaVersionMeta(score.candidateCode, score.programTitle),
      listLhaCorrectionRequests({ candidateCode: score.candidateCode })
    ]);

    return res.json({
      data: {
        currentVersion: versionMeta.currentVersion,
        current: serializeScore(score),
        history: versionMeta.history,
        correctionRequests: correctionRequests.filter((c) => c.programTitle === score.programTitle)
      }
    });
  } catch (error) {
    console.error('Get LHA version history error:', error);
    return res.status(500).json({ error: 'Gagal memuat riwayat versi LHA.' });
  }
};

export const listAdminLhaCorrections = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveAdminTenantId(req);
    const items = await listLhaCorrectionRequests({ tenantId });
    return res.json({ data: items });
  } catch (error) {
    console.error('List LHA corrections error:', error);
    return res.status(500).json({ error: 'Gagal memuat daftar permintaan koreksi LHA.' });
  }
};

export const reviewAdminLhaCorrection = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    const action = String(req.body.action || '').toLowerCase();
    const reviewNotes = String(req.body.reviewNotes || '').trim();
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Aksi review harus approve atau reject.' });
    }

    const request = await getLhaCorrectionRequestById(id);
    if (!request) {
      return res.status(404).json({ error: 'Permintaan koreksi LHA tidak ditemukan.' });
    }
    if (request.status !== 'pending') {
      return res.status(409).json({ error: `Permintaan koreksi sudah diproses (${request.status}).` });
    }

    const reviewerName = req.user?.username || req.portalUser?.name || 'Administrator';
    if (action === 'reject') {
      const rejected = await saveLhaCorrectionRequest({
        ...request,
        status: 'rejected',
        reviewedBy: reviewerName,
        reviewedAt: new Date().toISOString(),
        reviewNotes: reviewNotes || 'Permintaan koreksi ditolak oleh reviewer.'
      });
      recordAuditLog({
        actor: reviewerName,
        action: 'LHA_CORRECTION_REJECTED',
        category: 'DECISION',
        ip: resolveRequestIp(req),
        target: `${request.candidateCode} (${request.id})`,
        details: `Koreksi LHA ditolak: ${reviewNotes || '-'}`,
        status: 'WARNING'
      });
      return res.json({ data: rejected });
    }

    const existingScore = await prisma.assessorScore.findUnique({
      where: { id: request.scoreId },
      include: { assessor: { select: { name: true } } }
    });
    if (!existingScore) {
      return res.status(404).json({ error: 'Record LHA asal tidak ditemukan.' });
    }

    const versionMeta = await getLhaVersionMeta(existingScore.candidateCode, existingScore.programTitle);
    const prevVersion = versionMeta.currentVersion;
    const nextVersion = prevVersion + 1;

    const snapshot: LhaVersionSnapshot = {
      version: prevVersion,
      lhaNumber: existingScore.lhaNumber,
      lhaHash: existingScore.lhaHash,
      signedAt: existingScore.signedAt ? existingScore.signedAt.toISOString() : null,
      competencies: parseJson<CompetencyScoreItem[]>(existingScore.competencies, []),
      interviewScore: existingScore.interviewScore,
      compositeScore: existingScore.compositeScore,
      recommendation: existingScore.recommendation,
      notes: existingScore.notes,
      assessorName: existingScore.assessor?.name || request.requestedByName,
      archivedAt: new Date().toISOString(),
      reason: request.reason,
      approvedBy: reviewerName
    };

    const { signedAt, lhaHash, lhaNumber } = signCanonicalLha({
      candidateCode: existingScore.candidateCode,
      programTitle: existingScore.programTitle,
      interviewScore: request.proposed.interviewScore,
      compositeScore: request.proposed.compositeScore ?? existingScore.compositeScore,
      recommendation: request.proposed.recommendation,
      assessorId: existingScore.assessorId,
      version: nextVersion
    });

    const updatedScore = await prisma.assessorScore.update({
      where: { id: existingScore.id },
      data: {
        competencies: JSON.stringify(request.proposed.competencies),
        interviewScore: request.proposed.interviewScore,
        compositeScore: request.proposed.compositeScore ?? existingScore.compositeScore,
        recommendation: request.proposed.recommendation,
        notes: request.proposed.notes || existingScore.notes,
        lhaHash,
        lhaNumber,
        signedAt
      },
      include: { assessor: { select: { name: true } } }
    });

    await saveLhaVersionMeta({
      candidateCode: existingScore.candidateCode,
      programTitle: existingScore.programTitle,
      currentVersion: nextVersion,
      history: [...versionMeta.history, snapshot]
    });

    await syncCandidateFinalScores({
      candidateCode: existingScore.candidateCode,
      compositeScore: updatedScore.compositeScore,
      recommendation: updatedScore.recommendation
    });

    const approvedRequest = await saveLhaCorrectionRequest({
      ...request,
      status: 'approved',
      reviewedBy: reviewerName,
      reviewedAt: new Date().toISOString(),
      reviewNotes: reviewNotes || `Disetujui & diterbitkan sebagai versi v${nextVersion}.`,
      resultingVersion: nextVersion,
      resultingLhaNumber: lhaNumber
    });

    recordAuditLog({
      actor: reviewerName,
      action: 'LHA_CORRECTION_APPROVED',
      category: 'DECISION',
      ip: resolveRequestIp(req),
      target: `${existingScore.candidateCode} (${lhaNumber})`,
      details: `Koreksi LHA v${prevVersion} -> v${nextVersion} disetujui. Alasan: ${request.reason}`,
      status: 'SUCCESS'
    });

    return res.json({
      data: {
        request: approvedRequest,
        score: { ...serializeScore(updatedScore), version: nextVersion },
        version: nextVersion
      }
    });
  } catch (error) {
    console.error('Review LHA correction error:', error);
    return res.status(500).json({ error: 'Gagal memproses persetujuan koreksi LHA.' });
  }
};
