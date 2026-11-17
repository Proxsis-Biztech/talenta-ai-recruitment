import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
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
    if (programQuestions.length === 0) {
      return res.status(400).json({
        error: 'Bank soal masih kosong. Tambahkan soal asli sebelum mengaktifkan program asesmen.'
      });
    }
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

const IMPORT_HEADERS = [
  'No',
  'Tipe Soal',
  'Kategori',
  'Kompetensi',
  'Tingkat',
  'Pertanyaan',
  'Opsi A',
  'Opsi B',
  'Opsi C',
  'Opsi D',
  'Opsi E',
  'Jawaban Benar',
  'Pasangan Kiri',
  'Pasangan Kanan',
  'Poin',
  'Penjelasan'
];

const IMPORT_EXAMPLES: Array<Array<string | number>> = [
  [1, 'Pilihan Ganda', 'kompetensi', 'Software Design', 'Sedang', 'Prinsip SOLID yang memastikan kelas hanya memiliki satu alasan untuk berubah adalah?', 'Single Responsibility', 'Open Closed', 'Liskov Substitution', 'Interface Segregation', 'Dependency Inversion', 'A', '', '', 1, 'SRP: satu kelas satu tanggung jawab.'],
  [2, 'Multi-Select', 'kompetensi', 'Cloud Architecture', 'Sulit', 'Pilih komponen yang termasuk layanan terkelola pada cloud publik.', 'Object Storage', 'Virtual Machine', 'Managed Database', 'Bare Metal Server', '', 'A,C', '', '', 1, 'Object storage dan managed database dikelola penyedia.'],
  [3, 'Isian Singkat', 'kompetensi', 'Networking', 'Mudah', 'Protokol yang digunakan untuk menerjemahkan nama domain menjadi alamat IP adalah?', '', '', '', '', '', 'DNS', '', '', 1, 'DNS = Domain Name System.'],
  [4, 'Esai', 'kompetensi', 'System Design', 'Sulit', 'Jelaskan strategi mitigasi single point of failure pada arsitektur microservices.', '', '', '', '', '', '', '', '', 2, 'Dinilai manual oleh asesor.'],
  [5, 'Matching', 'kompetensi', 'Networking', 'Sedang', 'Pasangkan protokol dengan karakteristiknya.', '', '', '', '', '', '', 'HTTP|TCP|DNS', 'Port 80|Handshake tiga arah|Resolusi nama domain', 1, 'Gunakan pemisah | untuk setiap pasangan.']
];

const normalizeImportType = (value: string): string | null => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (['pilihan ganda', 'single', 'pg'].includes(raw)) return 'single';
  if (['multi-select', 'multi select', 'multi jawaban', 'multi', 'multi-select'].includes(raw)) return 'multi';
  if (['isian singkat', 'short', 'isian'].includes(raw)) return 'short';
  if (['esai', 'essay', 'uraian'].includes(raw)) return 'essay';
  if (['matching', 'menjodohkan', 'pasangan'].includes(raw)) return 'matching';
  return null;
};

const typeLabel: Record<string, string> = {
  single: 'Pilihan Ganda',
  multi: 'Multi-Select',
  short: 'Isian Singkat',
  essay: 'Esai',
  matching: 'Matching'
};

const normalizeDifficulty = (value: string): string => {
  const raw = String(value || '').trim().toLowerCase();
  if (['mudah', 'easy'].includes(raw)) return 'Mudah';
  if (['sulit', 'susah', 'hard', 'tinggi'].includes(raw)) return 'Sulit';
  return 'Sedang';
};

export const downloadQuestionTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const programCode = String(req.params.programCode || '').trim().toUpperCase() || 'PROGRAM';
    const worksheet = XLSX.utils.aoa_to_sheet([IMPORT_HEADERS, ...IMPORT_EXAMPLES]);
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 16 }, { wch: 12 }, { wch: 22 }, { wch: 10 },
      { wch: 60 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
      { wch: 20 }, { wch: 16 }, { wch: 28 }, { wch: 32 }, { wch: 7 }, { wch: 40 }
    ];

    const guide = XLSX.utils.aoa_to_sheet([
      ['PETUNJUK IMPORT BANK SOAL'],
      [''],
      ['1. Isi sheet "Soal" sesuai header. Jangan mengubah urutan kolom.'],
      ['2. Tipe Soal yang didukung: Pilihan Ganda, Multi-Select, Isian Singkat, Esai, Matching.'],
      ['3. Pilihan Ganda: isi Opsi A-E, lalu Jawaban Benar dengan huruf opsi (contoh: B).'],
      ['4. Multi-Select: Jawaban Benar dipisah koma (contoh: A,C).'],
      ['5. Isian Singkat: tulis jawaban pada kolom Jawaban Benar.'],
      ['6. Esai: kolom Jawaban Benar boleh kosong (dinilai manual).'],
      ['7. Matching: Pasangan Kiri dan Pasangan Kanan dipisah tanda | dan jumlahnya harus sama.'],
      ['8. Kolom Poin default 1 bila kosong. Kategori: psikotes atau kompetensi.'],
      ['9. Baris tanpa Pertanyaan akan dilewati otomatis.'],
      [''],
      [`Kode Program: ${programCode}`]
    ]);
    guide['!cols'] = [{ wch: 110 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Soal');
    XLSX.utils.book_append_sheet(workbook, guide, 'Petunjuk');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Template_Bank_Soal_${programCode}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Download question template error:', error);
    return res.status(500).json({ error: 'Gagal membuat template Excel.' });
  }
};

export const importProgramQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const programCode = String(req.params.programCode || '').trim().toUpperCase();
    if (!programCode) return res.status(400).json({ error: 'Kode program wajib diisi.' });
    const file = req.file;
    if (!file || !file.buffer) return res.status(400).json({ error: 'Berkas Excel/CSV tidak ditemukan.' });
    if (file.size > 10 * 1024 * 1024) return res.status(413).json({ error: 'Ukuran berkas maksimal 10MB.' });

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.includes('Soal') ? 'Soal' : workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return res.status(400).json({ error: 'Sheet soal tidak ditemukan pada berkas.' });

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
    const parsed: Array<Record<string, unknown>> = [];
    const errors: Array<{ row: number; message: string }> = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const text = String(row['Pertanyaan'] ?? row['Question'] ?? '').trim();
      if (!text) return;

      const type = normalizeImportType(String(row['Tipe Soal'] ?? row['Type'] ?? 'Pilihan Ganda'));
      if (!type) {
        errors.push({ row: rowNumber, message: 'Tipe soal tidak dikenali.' });
        return;
      }

      const category = String(row['Kategori'] ?? 'kompetensi').trim().toLowerCase() === 'psikotes'
        ? 'psikotes'
        : 'kompetensi';
      const competency = String(row['Kompetensi'] ?? 'General').trim() || 'General';
      const difficulty = normalizeDifficulty(String(row['Tingkat'] ?? 'Sedang'));
      const points = Number(row['Poin'] ?? 1) || 1;
      const explanation = String(row['Penjelasan'] ?? '').trim();
      const answerRaw = String(row['Jawaban Benar'] ?? '').trim();

      const optionColumns = [
        ['A', String(row['Opsi A'] ?? '').trim()],
        ['B', String(row['Opsi B'] ?? '').trim()],
        ['C', String(row['Opsi C'] ?? '').trim()],
        ['D', String(row['Opsi D'] ?? '').trim()],
        ['E', String(row['Opsi E'] ?? '').trim()]
      ].filter(([, value]) => value);

      const options = optionColumns.map(([key, value]) => ({
        key,
        text: value,
        isCorrect: false
      }));

      if (['single', 'multi'].includes(type) && options.length < 2) {
        errors.push({ row: rowNumber, message: 'Minimal dua opsi untuk soal pilihan.' });
        return;
      }

      if (type === 'single') {
        const key = answerRaw.replace(/[^A-Ea-e]/g, '').toUpperCase().slice(0, 1);
        if (!key || !options.some((option) => option.key === key)) {
          errors.push({ row: rowNumber, message: 'Jawaban benar pilihan ganda harus A-E dan sesuai opsi.' });
          return;
        }
        options.forEach((option) => {
          option.isCorrect = option.key === key;
        });
      } else if (type === 'multi') {
        const keys = answerRaw
          .split(/[,;\/\s]+/)
          .map((item) => item.trim().toUpperCase())
          .filter((item) => /^[A-E]$/.test(item));
        if (keys.length === 0) {
          errors.push({ row: rowNumber, message: 'Jawaban multi-select minimal satu huruf (contoh: A,C).' });
          return;
        }
        options.forEach((option) => {
          option.isCorrect = keys.includes(option.key);
        });
      }

      let matchingPairs: Array<{ left: string; rightOptions: string[]; correctRight: string }> = [];
      if (type === 'matching') {
        const lefts = String(row['Pasangan Kiri'] ?? '').split('|').map((item) => item.trim()).filter(Boolean);
        const rights = String(row['Pasangan Kanan'] ?? '').split('|').map((item) => item.trim()).filter(Boolean);
        if (lefts.length === 0 || lefts.length !== rights.length) {
          errors.push({ row: rowNumber, message: 'Pasangan Kiri dan Kanan harus sama jumlahnya (pemisah |).' });
          return;
        }
        const uniqueRights = Array.from(new Set(rights));
        matchingPairs = lefts.map((left, pairIndex) => ({
          left,
          rightOptions: uniqueRights,
          correctRight: rights[pairIndex]
        }));
      }

      if (type === 'short' && !answerRaw) {
        errors.push({ row: rowNumber, message: 'Soal isian singkat wajib memiliki Jawaban Benar.' });
        return;
      }

      parsed.push({
        type: typeLabel[type],
        rawType: type,
        category,
        competency,
        difficulty,
        text,
        options,
        matchingPairs,
        correctAnswer:
          type === 'single'
            ? options.find((option) => option.isCorrect)?.key || null
            : type === 'multi'
              ? options.filter((option) => option.isCorrect).map((option) => option.key)
              : type === 'short'
                ? answerRaw
                : type === 'matching'
                  ? matchingPairs.map((pair) => ({ left: pair.left, correctRight: pair.correctRight }))
                  : null,
        points,
        explanation
      });
    });

    if (parsed.length === 0) {
      return res.status(400).json({
        error: 'Tidak ada soal valid yang dapat diimpor.',
        errors,
        count: 0
      });
    }

    return res.json({
      message: `${parsed.length} soal berhasil dibaca dari template.`,
      count: parsed.length,
      skipped: errors.length,
      errors,
      data: parsed
    });
  } catch (error) {
    console.error('Import program questions error:', error);
    return res.status(500).json({ error: 'Gagal membaca berkas import soal.' });
  }
};
