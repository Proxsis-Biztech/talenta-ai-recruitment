import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { type AuthRequest } from '../middleware/auth';
import { buildPdf, formatDateId, type PdfBlock } from '../services/pdfService';

const prisma = new PrismaClient();
const TEMPLATE_DIR = path.join(__dirname, '../../uploads/report-templates');

const ensureTemplateDir = () => {
  if (!fs.existsSync(TEMPLATE_DIR)) fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
};

export interface ReportTemplateConfig {
  companyKey: string;
  companyName: string;
  headerTitle: string;
  pdfTitle: string;
  pdfSubtitle: string;
  footerText: string;
  introText: string;
  closingNote: string;
  signatoryName: string;
  signatoryTitle: string;
  showCompetencyTable: boolean;
  showInterviewScore: boolean;
  showAssessorNotes: boolean;
  showIntegrityHash: boolean;
  templateFileUrl: string | null;
  templateFileName: string | null;
  updatedAt?: string;
}

const normalizeKey = (raw: string): string =>
  String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '-')
    .replace(/^-|-$/g, '') || 'DEFAULT';

const defaultConfig = (companyKey: string, companyName = ''): ReportTemplateConfig => ({
  companyKey,
  companyName,
  headerTitle: 'LAPORAN HASIL ASESMEN (LHA)',
  pdfTitle: companyName ? `${companyName} - Laporan Hasil Asesmen` : 'RIGHT - Laporan Hasil Asesmen',
  pdfSubtitle: '',
  footerText: companyName
    ? `${companyName} • RIGHT Assessment Platform`
    : 'RIGHT Assessment Platform • Dokumen Resmi',
  introText: '',
  closingNote:
    'Hasil asesmen bersifat rekomendasi profesional asesor. Keputusan akhir mengikuti kebijakan pemberi tugas.',
  signatoryName: '',
  signatoryTitle: 'Lead Assessor / Kepala Proyek',
  showCompetencyTable: true,
  showInterviewScore: true,
  showAssessorNotes: true,
  showIntegrityHash: true,
  templateFileUrl: null,
  templateFileName: null
});

export const findReportTemplateForCompany = async (hints: Array<string | null | undefined>): Promise<ReportTemplateConfig | null> => {
  const cleanHints = hints.map((h) => (h ? String(h).trim() : '')).filter(Boolean);
  if (cleanHints.length === 0) return null;

  const records = await prisma.masterRecord.findMany({
    where: { scope: 'report-template' }
  });
  for (const hint of cleanHints) {
    const normHint = normalizeKey(hint);
    const matched = records.find((rec) => {
      if (normalizeKey(rec.key) === normHint) return true;
      try {
        const parsed = JSON.parse(rec.value) as Partial<ReportTemplateConfig>;
        return (
          (parsed.companyName && parsed.companyName.trim().toLowerCase() === hint.toLowerCase()) ||
          (parsed.companyKey && normalizeKey(parsed.companyKey) === normHint)
        );
      } catch {
        return false;
      }
    });
    if (matched) {
      try {
        const parsed = JSON.parse(matched.value) as Partial<ReportTemplateConfig>;
        return {
          ...defaultConfig(matched.key, parsed.companyName || ''),
          ...parsed
        };
      } catch {
        // ignore malformed JSON
      }
    }
  }
  return null;
};

export const getReportTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const companyKey = normalizeKey(String(req.params.companyKey || ''));
    const companyName = req.query.companyName ? String(req.query.companyName) : '';
    const existing = await findReportTemplateForCompany([companyKey, companyName]);
    return res.json({
      data: existing || defaultConfig(companyKey, companyName)
    });
  } catch (error) {
    console.error('Get report template error:', error);
    return res.status(500).json({ error: 'Gagal memuat template laporan.' });
  }
};

export const saveReportTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const companyKey = normalizeKey(String(req.params.companyKey || ''));
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const companyName = String(body.companyName || '').trim();
    const payload: ReportTemplateConfig = {
      ...defaultConfig(companyKey, companyName),
      companyKey,
      companyName,
      headerTitle: String(body.headerTitle || 'LAPORAN HASIL ASESMEN (LHA)').trim(),
      pdfTitle: String(body.pdfTitle || '').trim() || defaultConfig(companyKey, companyName).pdfTitle,
      pdfSubtitle: String(body.pdfSubtitle || '').trim(),
      footerText: String(body.footerText || '').trim() || defaultConfig(companyKey, companyName).footerText,
      introText: String(body.introText || '').trim(),
      closingNote: String(body.closingNote || '').trim() || defaultConfig(companyKey, companyName).closingNote,
      signatoryName: String(body.signatoryName || '').trim(),
      signatoryTitle: String(body.signatoryTitle || '').trim(),
      showCompetencyTable: body.showCompetencyTable !== false,
      showInterviewScore: body.showInterviewScore !== false,
      showAssessorNotes: body.showAssessorNotes !== false,
      showIntegrityHash: body.showIntegrityHash !== false,
      templateFileUrl: body.templateFileUrl ? String(body.templateFileUrl) : null,
      templateFileName: body.templateFileName ? String(body.templateFileName) : null,
      updatedAt: new Date().toISOString()
    };

    await prisma.masterRecord.upsert({
      where: { scope_key: { scope: 'report-template', key: companyKey } },
      update: { value: JSON.stringify(payload) },
      create: { scope: 'report-template', key: companyKey, value: JSON.stringify(payload) }
    });

    return res.json({ message: 'Template laporan tenant berhasil disimpan.', data: payload });
  } catch (error) {
    console.error('Save report template error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan template laporan.' });
  }
};

export const uploadReportTemplateFile = async (req: AuthRequest, res: Response) => {
  try {
    const companyKey = normalizeKey(String(req.params.companyKey || ''));
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: 'File template tidak ditemukan.' });
    }
    ensureTemplateDir();
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg'].includes(ext) ? ext : '.bin';
    const fileName = `${companyKey}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`;
    fs.writeFileSync(path.join(TEMPLATE_DIR, fileName), file.buffer);

    const fileUrl = `/api/report-templates/files/${fileName}`;
    const existing = (await findReportTemplateForCompany([companyKey])) || defaultConfig(companyKey);
    const updated: ReportTemplateConfig = {
      ...existing,
      templateFileUrl: fileUrl,
      templateFileName: file.originalname,
      updatedAt: new Date().toISOString()
    };

    await prisma.masterRecord.upsert({
      where: { scope_key: { scope: 'report-template', key: companyKey } },
      update: { value: JSON.stringify(updated) },
      create: { scope: 'report-template', key: companyKey, value: JSON.stringify(updated) }
    });

    return res.json({
      message: 'File template laporan berhasil diunggah.',
      file: { url: fileUrl, name: file.originalname },
      data: updated
    });
  } catch (error) {
    console.error('Upload report template file error:', error);
    return res.status(500).json({ error: 'Gagal mengunggah file template laporan.' });
  }
};

export const getReportTemplateFile = async (req: AuthRequest, res: Response) => {
  try {
    const safeName = path.basename(String(req.params.fileName || ''));
    const fullPath = path.join(TEMPLATE_DIR, safeName);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File template tidak ditemukan.' });
    }
    return res.sendFile(fullPath);
  } catch {
    return res.status(500).json({ error: 'Gagal mengunduh file template.' });
  }
};

export const previewReportTemplatePdf = async (req: AuthRequest, res: Response) => {
  try {
    const companyKey = normalizeKey(String(req.params.companyKey || ''));
    const companyName = req.query.companyName ? String(req.query.companyName) : '';
    const tpl = (await findReportTemplateForCompany([companyKey, companyName])) || defaultConfig(companyKey, companyName);

    const blocks: PdfBlock[] = [
      { type: 'heading', text: tpl.headerTitle || 'LAPORAN HASIL ASESMEN (LHA)' },
      ...(tpl.introText ? [{ type: 'text' as const, text: tpl.introText }, { type: 'spacer' as const, height: 4 }] : []),
      { type: 'kv', label: 'Nomor LHA', value: `LHA-${companyKey}-PREVIEW` },
      { type: 'kv', label: 'Kode Kandidat', value: 'KND-SAMPLE-001' },
      { type: 'kv', label: 'Nama Kandidat', value: 'Contoh Nama Kandidat' },
      { type: 'kv', label: 'Program Asesmen', value: tpl.companyName ? `Program Asesmen ${tpl.companyName}` : 'Program Asesmen Standar' },
      { type: 'kv', label: 'Tanggal Ditandatangani', value: formatDateId(new Date()) },
      { type: 'rule' },
      ...(tpl.showCompetencyTable !== false
        ? [
            { type: 'heading' as const, text: 'Skor Kompetensi', size: 11 },
            {
              type: 'table' as const,
              columns: ['Kompetensi', 'Rating', 'Catatan'],
              widths: [0.42, 0.14, 0.44],
              rows: [
                ['System Architecture & Scalability', '4.5', 'Menguasai desain terdistribusi & caching dengan baik.'],
                ['Problem Solving & BARS', '4.2', 'Terstruktur dalam analisis akar masalah.']
              ]
            }
          ]
        : []),
      ...(tpl.showInterviewScore !== false
        ? [{ type: 'kv' as const, label: 'Skor Wawancara', value: '88' }]
        : []),
      { type: 'kv', label: 'Skor Komposit', value: '90' },
      { type: 'kv', label: 'Rekomendasi Asesor', value: 'Direkomendasikan (Strong Fit)' },
      ...(tpl.showAssessorNotes !== false
        ? [
            { type: 'spacer' as const, height: 6 },
            { type: 'heading' as const, text: 'Catatan Asesor', size: 11 },
            { type: 'text' as const, text: 'Ini adalah contoh pratinjau catatan asesor menggunakan template laporan dinamis.' }
          ]
        : []),
      ...(tpl.signatoryName
        ? [
            { type: 'spacer' as const, height: 6 },
            { type: 'kv' as const, label: 'Penandatangan', value: `${tpl.signatoryName}${tpl.signatoryTitle ? ` (${tpl.signatoryTitle})` : ''}` }
          ]
        : []),
      { type: 'rule' },
      ...(tpl.showIntegrityHash !== false
        ? [
            { type: 'text' as const, text: 'Dokumen ini ditandatangani secara elektronik. Verifikasi keaslian melalui hash SHA-256 berikut:' },
            { type: 'text' as const, text: 'PREVIEW-SHA256-HASH-SAMPLE-000000000000', size: 9 }
          ]
        : []),
      {
        type: 'text',
        text: tpl.closingNote || 'Hasil asesmen bersifat rekomendasi profesional asesor. Keputusan akhir mengikuti kebijakan pemberi tugas.'
      }
    ];

    const pdf = buildPdf(blocks, {
      brandName: tpl.companyName || 'RIGHT',
      title: tpl.pdfTitle || 'RIGHT - Laporan Hasil Asesmen',
      subtitle: tpl.pdfSubtitle || `LHA-${companyKey}-PREVIEW`,
      footer: tpl.footerText || 'RIGHT Assessment Platform'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Template-LHA-${companyKey}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    console.error('Preview report template PDF error:', error);
    return res.status(500).json({ error: 'Gagal membuat preview PDF template.' });
  }
};

export const downloadApplicantLhaPdf = async (req: AuthRequest, res: Response) => {
  try {
    const applicantId = String(req.params.id || '').trim();
    if (!applicantId) return res.status(400).json({ error: 'ID kandidat wajib diisi.' });

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
      include: {
        job: {
          include: { tenant: true }
        }
      }
    });
    if (!applicant) return res.status(404).json({ error: 'Data kandidat tidak ditemukan.' });

    const portalUser = await prisma.portalUser.findUnique({
      where: { email: applicant.email },
      include: { tenant: true }
    });

    const examAttempt = portalUser
      ? await prisma.examAttempt.findFirst({
          where: { userId: portalUser.id },
          orderBy: { submittedAt: 'desc' }
        })
      : null;

    const assessorScore = portalUser?.candidateCode
      ? await prisma.assessorScore.findFirst({
          where: { candidateCode: portalUser.candidateCode },
          orderBy: { updatedAt: 'desc' }
        })
      : null;

    const companyKey = normalizeKey(
      portalUser?.tenant?.code ||
        applicant.job?.tenant?.code ||
        portalUser?.companyId ||
        portalUser?.companyName ||
        applicant.job?.tenant?.name ||
        'DEFAULT'
    );
    const companyName =
      portalUser?.tenant?.name ||
      applicant.job?.tenant?.name ||
      portalUser?.companyName ||
      '';

    const tpl =
      (await findReportTemplateForCompany([
        portalUser?.tenant?.code,
        applicant.job?.tenant?.code,
        portalUser?.companyId,
        companyName
      ])) || defaultConfig(companyKey, companyName);

    const candidateCode = portalUser?.candidateCode || `KND-${applicant.id.slice(0, 6).toUpperCase()}`;
    const lhaNumber = assessorScore?.lhaNumber || `LHA-${companyKey}-${candidateCode.replace(/[^A-Z0-9]/gi, '').slice(-4)}`;
    const programTitle =
      assessorScore?.programTitle ||
      applicant.job?.title ||
      portalUser?.assessmentTitle ||
      applicant.appliedPosition ||
      '-';

    let competencies: Array<Record<string, unknown>> = [];
    if (assessorScore?.competencies) {
      try {
        const parsed = JSON.parse(assessorScore.competencies);
        if (Array.isArray(parsed)) competencies = parsed;
      } catch {
        competencies = [];
      }
    } else if (examAttempt?.competencyScores) {
      try {
        const parsed = JSON.parse(examAttempt.competencyScores);
        if (Array.isArray(parsed)) competencies = parsed;
      } catch {
        competencies = [];
      }
    }

    const interviewScore = assessorScore?.interviewScore ?? applicant.interviewScore ?? 0;
    const catScore = examAttempt?.score ?? applicant.screeningScore ?? null;
    const compositeScore =
      assessorScore?.compositeScore ??
      (catScore !== null ? Math.round((Number(catScore) + Number(interviewScore)) / 2) : interviewScore);
    const recommendation =
      assessorScore?.recommendation ||
      (compositeScore >= (applicant.job?.interviewPassingScore || 75)
        ? 'Direkomendasikan (Memenuhi Standar)'
        : 'Perlu Pertimbangan Lebih Lanjut');
    const assessorNotes =
      assessorScore?.notes ||
      applicant.interviewResult ||
      applicant.screeningSummary ||
      'Tidak ada catatan tambahan.';

    const blocks: PdfBlock[] = [
      { type: 'heading', text: tpl.headerTitle || 'LAPORAN HASIL ASESMEN (LHA)' },
      ...(tpl.introText ? [{ type: 'text' as const, text: tpl.introText }, { type: 'spacer' as const, height: 4 }] : []),
      { type: 'kv', label: 'Nomor LHA', value: lhaNumber },
      { type: 'kv', label: 'Kode Kandidat', value: candidateCode },
      { type: 'kv', label: 'Nama Kandidat', value: applicant.fullName },
      { type: 'kv', label: 'Email', value: applicant.email },
      { type: 'kv', label: 'Program Asesmen', value: programTitle },
      {
        type: 'kv',
        label: 'Tanggal Laporan',
        value: formatDateId(assessorScore?.signedAt || examAttempt?.submittedAt || applicant.createdAt)
      },
      { type: 'rule' },
      ...(tpl.showCompetencyTable !== false
        ? [
            { type: 'heading' as const, text: 'Skor Kompetensi', size: 11 },
            {
              type: 'table' as const,
              columns: ['Kompetensi', 'Rating / Skor', 'Catatan'],
              widths: [0.42, 0.16, 0.42],
              rows: competencies.length
                ? competencies.map((item) => [
                    String(item.name || item.competency || item.label || '-'),
                    String(item.rating ?? item.score ?? '-'),
                    String(item.note || item.notes || item.evidence || '-')
                  ])
                : [
                    [
                      'Hasil Ujian CAT',
                      catScore !== null ? `${catScore}/100` : '-',
                      examAttempt?.status === 'submitted' ? 'Ujian CAT selesai' : 'Belum / dalam proses'
                    ]
                  ]
            }
          ]
        : []),
      ...(tpl.showInterviewScore !== false
        ? [{ type: 'kv' as const, label: 'Skor Wawancara', value: `${interviewScore}/100` }]
        : []),
      { type: 'kv', label: 'Skor Komposit', value: `${compositeScore}/100` },
      { type: 'kv', label: 'Rekomendasi Asesor', value: recommendation },
      ...(tpl.showAssessorNotes !== false
        ? [
            { type: 'spacer' as const, height: 6 },
            { type: 'heading' as const, text: 'Catatan Asesor', size: 11 },
            { type: 'text' as const, text: assessorNotes }
          ]
        : []),
      ...(tpl.signatoryName
        ? [
            { type: 'spacer' as const, height: 6 },
            {
              type: 'kv' as const,
              label: 'Penandatangan',
              value: `${tpl.signatoryName}${tpl.signatoryTitle ? ` (${tpl.signatoryTitle})` : ''}`
            }
          ]
        : []),
      { type: 'rule' },
      ...(tpl.showIntegrityHash !== false
        ? [
            {
              type: 'text' as const,
              text: 'Dokumen ini dihasilkan oleh sistem RIGHT Assessment Platform. Verifikasi keaslian:'
            },
            { type: 'text' as const, text: assessorScore?.lhaHash || `SHA256-${applicant.id}`, size: 9 }
          ]
        : []),
      {
        type: 'text',
        text:
          tpl.closingNote ||
          'Hasil asesmen bersifat rekomendasi profesional asesor. Keputusan akhir mengikuti kebijakan pemberi tugas.'
      }
    ];

    const pdf = buildPdf(blocks, {
      brandName: tpl.companyName || companyName || 'RIGHT',
      title: tpl.pdfTitle || 'RIGHT - Laporan Hasil Asesmen',
      subtitle: tpl.pdfSubtitle || lhaNumber,
      footer: tpl.footerText || 'RIGHT Assessment Platform'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="LHA-${candidateCode}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    console.error('Download applicant LHA PDF error:', error);
    return res.status(500).json({ error: 'Gagal membuat PDF LHA kandidat.' });
  }
};
