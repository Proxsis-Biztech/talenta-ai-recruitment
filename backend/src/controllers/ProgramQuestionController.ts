import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { type AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const CASE_DIR = path.join(__dirname, '../../uploads/case-files');

const ensureCaseDir = () => {
  if (!fs.existsSync(CASE_DIR)) fs.mkdirSync(CASE_DIR, { recursive: true });
};

const allowedMime = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/png',
  'image/jpeg',
  'text/plain'
]);

const extensionFor = (mime: string, originalName: string): string => {
  if (mime === 'application/pdf') return '.pdf';
  if (mime.includes('wordprocessingml')) return '.docx';
  if (mime === 'application/msword') return '.doc';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'text/plain') return '.txt';
  const ext = path.extname(originalName || '').toLowerCase();
  return ['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.txt'].includes(ext) ? ext : '.bin';
};

const persistCaseFile = (file: Express.Multer.File): { url: string; name: string; mime: string; size: number } => {
  ensureCaseDir();
  const extension = extensionFor(file.mimetype, file.originalname);
  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
  fs.writeFileSync(path.join(CASE_DIR, fileName), file.buffer);
  return {
    url: `/api/case-files/${fileName}`,
    name: file.originalname,
    mime: file.mimetype,
    size: file.size
  };
};

const typeMap: Record<string, string> = {
  single: 'single',
  multi: 'multi',
  short: 'short',
  essay: 'essay',
  matching: 'matching',
  'Pilihan Ganda': 'single',
  'Multi Jawaban': 'multi',
  'Multi-Select': 'multi',
  'Isian Singkat': 'short',
  Esai: 'essay',
  Matching: 'matching'
};

const deriveCorrectAnswer = (question: any): unknown => {
  if (question.correctAnswer !== undefined) return question.correctAnswer;
  const options = Array.isArray(question.options) ? question.options : [];
  if (['multi', 'Multi Jawaban', 'Multi-Select'].includes(question.type)) {
    return options.filter((option: any) => option.isCorrect).map((option: any) => option.key);
  }
  if (question.type === 'matching' || question.type === 'Matching') {
    return question.matchingPairs || [];
  }
  if (question.type === 'short' || question.type === 'Isian Singkat') {
    return options[0]?.text || options[0]?.label || question.explanation || null;
  }
  return options.find((option: any) => option.isCorrect)?.key ?? null;
};

const mapQuestion = (question: any, index: number, programCode: string) => ({
  programCode,
  orderNo: index + 1,
  type: typeMap[String(question.type || 'single')] || 'single',
  competency: String(question.competency || 'General'),
  difficulty: String(question.difficulty || 'Sedang'),
  text: String(question.text || question.question || ''),
  codeSnippet: question.codeSnippet ? String(question.codeSnippet) : null,
  options: JSON.stringify(question.options || []),
  matchingPairs: JSON.stringify(question.matchingPairs || []),
  correctAnswer: (() => {
    const answer = deriveCorrectAnswer(question);
    return answer === undefined || answer === null ? null : JSON.stringify(answer);
  })(),
  points: Number(question.points) || 1,
  attachmentUrl: question.attachmentUrl ? String(question.attachmentUrl) : null,
  attachmentName: question.attachmentName ? String(question.attachmentName) : null,
  attachmentMime: question.attachmentMime ? String(question.attachmentMime) : null
});

const replaceProgramQuestions = async (programCode: string, questions: any[]) => {
  // Attachments live on the DB row keyed by orderNo; keep them when the admin
  // re-syncs question text so uploaded study-case files are not lost.
  const existing = await prisma.programQuestion.findMany({
    where: { programCode },
    select: { orderNo: true, attachmentUrl: true, attachmentName: true, attachmentMime: true }
  });
  const attachmentByOrder = new Map(existing.map((item) => [item.orderNo, item]));

  await prisma.programQuestion.deleteMany({ where: { programCode } });
  if (questions.length === 0) return 0;
  await prisma.programQuestion.createMany({
    data: questions.map((question, index) => {
      const mapped = mapQuestion(question, index, programCode);
      const previous = attachmentByOrder.get(mapped.orderNo);
      return {
        ...mapped,
        attachmentUrl: mapped.attachmentUrl || previous?.attachmentUrl || null,
        attachmentName: mapped.attachmentName || previous?.attachmentName || null,
        attachmentMime: mapped.attachmentMime || previous?.attachmentMime || null
      };
    })
  });
  return questions.length;
};

export const syncProgramQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const programCode = String(req.params.programCode || '').trim().toUpperCase();
    const questions = Array.isArray(req.body.questions) ? req.body.questions : [];
    if (!programCode) return res.status(400).json({ error: 'Kode program wajib diisi.' });

    const count = await replaceProgramQuestions(programCode, questions);
    return res.json({ message: 'Bank soal program berhasil disinkronkan.', count });
  } catch (error) {
    console.error('Sync program questions error:', error);
    return res.status(500).json({ error: 'Gagal menyinkronkan bank soal program.' });
  }
};

export const publishProgram = async (req: AuthRequest, res: Response) => {
  try {
    const programCode = String(req.params.programCode || '').trim().toUpperCase();
    const title = String(req.body.title || req.body.name || '').trim();
    const description = String(req.body.description || title).trim();
    const durationMinutes = Number(req.body.durationMinutes || req.body.duration || 90);
    const passingScore = Number(req.body.passingScore || req.body.passingGrade || 70);
    const status = req.body.status === 'inactive' ? 'inactive' : 'active';
    const rawAssessmentDate = req.body.assessmentDate || req.body.startDate;
    const assessmentDate = rawAssessmentDate && !Number.isNaN(new Date(String(rawAssessmentDate)).getTime())
      ? new Date(String(rawAssessmentDate))
      : undefined;
    const rawAssessmentEndDate = req.body.assessmentEndDate || req.body.endDate;
    const assessmentEndDate = rawAssessmentEndDate && !Number.isNaN(new Date(String(rawAssessmentEndDate)).getTime())
      ? new Date(String(rawAssessmentEndDate))
      : undefined;
    if (assessmentDate && assessmentEndDate && assessmentEndDate.getTime() < assessmentDate.getTime()) {
      return res.status(400).json({ error: 'Tanggal selesai asesmen tidak boleh lebih awal dari tanggal mulai.' });
    }

    if (!programCode) return res.status(400).json({ error: 'Kode program wajib diisi.' });
    if (!title) return res.status(400).json({ error: 'Nama program wajib diisi.' });

    const existing = await prisma.job.findUnique({ where: { code: programCode } });
    const data = {
      code: programCode,
      title,
      description,
      status,
      interviewDuration: Number.isFinite(durationMinutes) ? durationMinutes : 90,
      interviewPassingScore: Number.isFinite(passingScore) ? passingScore : 70,
      ...(assessmentDate ? { assessmentDate } : {}),
      ...(assessmentEndDate ? { assessmentEndDate } : {})
    };
    const job = existing
      ? await prisma.job.update({ where: { id: existing.id }, data })
      : await prisma.job.create({ data });

    const bankRecord = await prisma.masterRecord.findUnique({
      where: { scope_key: { scope: 'bank-soal', key: 'questions' } }
    });
    let bankQuestions: any[] = [];
    if (bankRecord) {
      try {
        const parsed = JSON.parse(bankRecord.value);
        if (Array.isArray(parsed)) bankQuestions = parsed;
      } catch {
        bankQuestions = [];
      }
    }
    const programQuestions = bankQuestions.filter(
      (question) => (question.programCode || programCode) === programCode
    );
    let questionCount = await replaceProgramQuestions(programCode, programQuestions);
    if (questionCount === 0) {
      const templateQuestions = await prisma.programQuestion.findMany({
        where: { programCode: 'SE-402' },
        orderBy: { orderNo: 'asc' }
      });
      if (templateQuestions.length > 0) {
        await prisma.programQuestion.createMany({
          data: templateQuestions.map((question) => ({
            programCode,
            orderNo: question.orderNo,
            type: question.type,
            competency: question.competency,
            difficulty: question.difficulty,
            text: question.text,
            codeSnippet: question.codeSnippet,
            options: question.options,
            matchingPairs: question.matchingPairs,
            correctAnswer: question.correctAnswer,
            points: question.points
          }))
        });
        questionCount = templateQuestions.length;
      }
    }

    await prisma.programAccessCode.upsert({
      where: { code: programCode },
      update: { programCode, active: true },
      create: {
        code: programCode,
        programCode,
        maxUses: 10000,
        expiresAt: new Date('2027-12-31T23:59:59Z'),
        active: true
      }
    });

    return res.json({
      message: 'Program asesmen berhasil dipublikasikan.',
      data: { job, questionCount, accessCode: programCode }
    });
  } catch (error) {
    console.error('Publish program error:', error);
    return res.status(500).json({ error: 'Gagal mempublikasikan program asesmen.' });
  }
};

export const uploadQuestionAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Berkas lampiran tidak ditemukan.' });
    if (!allowedMime.has(file.mimetype)) {
      return res.status(400).json({ error: 'Format lampiran harus PDF, DOCX, TXT, PNG, atau JPG.' });
    }
    if (file.size > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'Ukuran lampiran maksimal 10MB.' });
    }
    const stored = persistCaseFile(file);

    const programCode = String(req.body.programCode || '').trim().toUpperCase();
    const orderNo = Number(req.body.orderNo);
    if (programCode && Number.isFinite(orderNo) && orderNo > 0) {
      const existing = await prisma.programQuestion.findUnique({
        where: { programCode_orderNo: { programCode, orderNo } }
      });
      if (!existing) return res.status(404).json({ error: 'Butir soal tidak ditemukan.' });
      await prisma.programQuestion.update({
        where: { id: existing.id },
        data: { attachmentUrl: stored.url, attachmentName: stored.name, attachmentMime: stored.mime }
      });
    }

    return res.status(201).json({ data: stored });
  } catch (error) {
    console.error('Upload question attachment error:', error);
    return res.status(500).json({ error: 'Gagal mengunggah lampiran soal.' });
  }
};

export const uploadProgramCaseFile = async (req: AuthRequest, res: Response) => {
  try {
    const programCode = String(req.params.programCode || '').trim().toUpperCase();
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Berkas tidak ditemukan.' });
    if (!allowedMime.has(file.mimetype)) {
      return res.status(400).json({ error: 'Format berkas harus PDF, DOCX, TXT, PNG, atau JPG.' });
    }
    if (file.size > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'Ukuran berkas maksimal 10MB.' });
    }

    const job = await prisma.job.findUnique({ where: { code: programCode } });
    if (!job) return res.status(404).json({ error: 'Program asesmen tidak ditemukan.' });

    const stored = persistCaseFile(file);
    const existing: Array<{ name: string; url: string; mime?: string; size?: number }> = (() => {
      try {
        const parsed = JSON.parse(job.caseFiles || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();
    const next = [...existing, stored];
    await prisma.job.update({ where: { id: job.id }, data: { caseFiles: JSON.stringify(next) } });

    return res.status(201).json({ data: stored, caseFiles: next });
  } catch (error) {
    console.error('Upload program case file error:', error);
    return res.status(500).json({ error: 'Gagal mengunggah dokumen studi kasus.' });
  }
};

export const deleteProgramCaseFile = async (req: AuthRequest, res: Response) => {
  try {
    const programCode = String(req.params.programCode || '').trim().toUpperCase();
    const fileName = path.basename(String(req.params.fileName || ''));
    const job = await prisma.job.findUnique({ where: { code: programCode } });
    if (!job) return res.status(404).json({ error: 'Program asesmen tidak ditemukan.' });

    const existing: Array<{ name: string; url: string; mime?: string }> = (() => {
      try {
        const parsed = JSON.parse(job.caseFiles || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();
    const next = existing.filter((file) => !file.url.endsWith(fileName));
    await prisma.job.update({ where: { id: job.id }, data: { caseFiles: JSON.stringify(next) } });

    const target = path.join(CASE_DIR, fileName);
    if (fs.existsSync(target)) fs.unlinkSync(target);
    return res.json({ message: 'Dokumen studi kasus dihapus.', caseFiles: next });
  } catch (error) {
    console.error('Delete program case file error:', error);
    return res.status(500).json({ error: 'Gagal menghapus dokumen studi kasus.' });
  }
};

export const getCaseFile = async (req: AuthRequest, res: Response) => {
  try {
    const fileName = path.basename(String(req.params.fileName || ''));
    const filePath = path.join(CASE_DIR, fileName);
    if (!fileName || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Berkas tidak ditemukan.' });
    }
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Get case file error:', error);
    return res.status(500).json({ error: 'Gagal memuat berkas.' });
  }
};
