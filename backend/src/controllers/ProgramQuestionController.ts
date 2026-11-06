import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

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
  points: Number(question.points) || 1
});

const replaceProgramQuestions = async (programCode: string, questions: any[]) => {
  await prisma.programQuestion.deleteMany({ where: { programCode } });
  if (questions.length === 0) return 0;
  await prisma.programQuestion.createMany({
    data: questions.map((question, index) => mapQuestion(question, index, programCode))
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

    if (!programCode) return res.status(400).json({ error: 'Kode program wajib diisi.' });
    if (!title) return res.status(400).json({ error: 'Nama program wajib diisi.' });

    const existing = await prisma.job.findUnique({ where: { code: programCode } });
    const data = {
      code: programCode,
      title,
      description,
      status,
      interviewDuration: Number.isFinite(durationMinutes) ? durationMinutes : 90,
      interviewPassingScore: Number.isFinite(passingScore) ? passingScore : 70
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