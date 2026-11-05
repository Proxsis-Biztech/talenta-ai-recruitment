import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const normalizeText = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const gradeShortAnswer = (answer: unknown, key: unknown): boolean => {
  const submitted = normalizeText(answer);
  const expected = normalizeText(key);
  if (!submitted || !expected) return false;
  if (submitted === expected) return true;
  if (submitted.length >= 3 && expected.includes(submitted)) return true;
  if (expected.length >= 3 && submitted.includes(expected)) return true;
  const expectedCode = expected.match(/\b\d{3}\b/)?.[0];
  return Boolean(expectedCode && submitted.includes(expectedCode));
};

const gradeMatching = (answer: unknown, key: unknown): number => {
  const submitted = (answer && typeof answer === 'object' ? answer : {}) as Record<string, string>;
  const pairs = Array.isArray(key) ? (key as Array<{ left: string; correctRight: string }>) : [];
  if (pairs.length === 0) return 0;
  const correct = pairs.filter((pair) => submitted[pair.left] === pair.correctRight).length;
  return correct / pairs.length;
};

export const scoreAnswers = (
  questions: Array<{ orderNo: number; type: string; competency: string; correctAnswer: string | null }>,
  answers: Record<string, unknown>
) => {
  let autoGraded = 0;
  let correctPoints = 0;
  let manualReview = 0;
  const competencyMap = new Map<string, { correct: number; total: number }>();

  for (const question of questions) {
    const answer = answers[String(question.orderNo)];
    const key = parseJson<unknown>(question.correctAnswer, null);

    if (question.type === 'essay') {
      manualReview += 1;
      continue;
    }

    autoGraded += 1;
    const bucket = competencyMap.get(question.competency) || { correct: 0, total: 0 };
    bucket.total += 1;
    let earned = 0;

    if (question.type === 'single') {
      if (String(answer ?? '') === String(key ?? '')) earned = 1;
    } else if (question.type === 'multi') {
      const submitted = Array.isArray(answer) ? [...answer].map(String).sort() : [];
      const expected = Array.isArray(key) ? [...key].map(String).sort() : [];
      if (submitted.length > 0 && JSON.stringify(submitted) === JSON.stringify(expected)) earned = 1;
    } else if (question.type === 'short') {
      if (gradeShortAnswer(answer, key)) earned = 1;
    } else if (question.type === 'matching') {
      earned = gradeMatching(answer, key);
    }

    bucket.correct += earned;
    correctPoints += earned;
    competencyMap.set(question.competency, bucket);
  }

  const score = autoGraded > 0 ? Math.round((correctPoints / autoGraded) * 1000) / 10 : 0;
  const competencyScores = Array.from(competencyMap.entries()).map(([name, bucket]) => ({
    name,
    score: bucket.total > 0 ? Math.round((bucket.correct / bucket.total) * 1000) / 10 : 0,
    max: 100,
    weight: autoGraded > 0 ? `${Math.round((bucket.total / autoGraded) * 100)}%` : '0%'
  }));

  return { score, autoGraded, manualReview, competencyScores };
};

const sanitizeQuestions = (questions: Array<{
  orderNo: number;
  type: string;
  competency: string;
  difficulty: string;
  text: string;
  codeSnippet: string | null;
  options: string | null;
  matchingPairs: string | null;
}>) =>
  questions.map((question) => ({
    id: question.orderNo,
    type: question.type,
    competency: question.competency,
    difficulty: question.difficulty,
    text: question.text,
    codeSnippet: question.codeSnippet,
    options: parseJson(question.options, []),
    matchingPairs: parseJson(question.matchingPairs, [])
  }));

const isPortalProfileComplete = async (userId: string) => {
  const user = await prisma.portalUser.findUnique({
    where: { id: userId },
    select: { name: true, phone: true, nik: true, employeeNumber: true, education: true, university: true, city: true }
  });
  return Boolean(user?.name && user?.phone && user?.nik && user?.education && user?.university && user?.city);
};

const canAccessProgram = (portalUser: { assessmentId?: string | null } | undefined, programCode: string) => {
  if (!portalUser?.assessmentId) return false;
  return portalUser.assessmentId.toUpperCase() === programCode;
};

const loadProgram = async (programCode: string) => {
  const code = programCode.trim().toUpperCase();
  const job = await prisma.job.findFirst({ where: { code } });
  if (!job) return null;
  const questions = await prisma.programQuestion.findMany({
    where: { programCode: code },
    orderBy: { orderNo: 'asc' }
  });
  return { code, job, questions };
};

export const startExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    if (!(await isPortalProfileComplete(req.portalUser.id))) {
      return res.status(403).json({ error: 'Lengkapi data profil terlebih dahulu sebelum memulai ujian.' });
    }
    const identity = await prisma.portalUser.findUnique({
      where: { id: req.portalUser.id },
      select: { faceVerifiedAt: true }
    });
    if (!identity?.faceVerifiedAt) {
      return res.status(403).json({ error: 'Selesaikan verifikasi biometrik & perangkat terlebih dahulu.' });
    }
    const program = await loadProgram(String(req.params.programCode));
    if (!program) return res.status(404).json({ error: 'Program asesmen tidak ditemukan.' });
    if (!canAccessProgram(req.portalUser, program.code)) {
      return res.status(403).json({ error: 'Anda tidak terdaftar pada program asesmen ini.' });
    }
    if (program.questions.length === 0) {
      return res.status(503).json({ error: 'Bank soal untuk program ini belum tersedia. Hubungi administrator.' });
    }

    const existing = await prisma.examAttempt.findUnique({
      where: { userId_programCode: { userId: req.portalUser.id, programCode: program.code } }
    });

    if (existing && ['submitted', 'graded'].includes(existing.status)) {
      const savedAnswers = parseJson<Record<string, unknown>>(existing.answers, {});
      const totalAnswered = Object.values(savedAnswers).filter((value) => {
        if (value === null || value === undefined || value === '') return false;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(Boolean);
        return true;
      }).length;
      return res.json({
        locked: true,
        attempt: {
          id: existing.id,
          status: existing.status,
          score: existing.score,
          integrityScore: existing.integrityScore,
          submittedAt: existing.submittedAt,
          totalAnswered,
          totalQuestions: program.questions.length
        },
        program: { code: program.code, title: program.job.title },
        questions: []
      });
    }

    const attempt = existing ?? (await prisma.examAttempt.create({
      data: {
        userId: req.portalUser.id,
        programCode: program.code,
        answers: '{}',
        markedDoubt: '{}'
      }
    }));

    return res.json({
      locked: false,
      attempt: {
        id: attempt.id,
        status: attempt.status,
        answers: parseJson<Record<string, unknown>>(attempt.answers, {}),
        markedDoubt: parseJson<Record<string, boolean>>(attempt.markedDoubt, {}),
        startedAt: attempt.startedAt
      },
      program: {
        code: program.code,
        title: program.job.title,
        durationMinutes: program.job.interviewDuration || 90,
        passingScore: program.job.interviewPassingScore || 70
      },
      questions: sanitizeQuestions(program.questions)
    });
  } catch (error) {
    console.error('Start exam error:', error);
    return res.status(500).json({ error: 'Gagal memulai ujian.' });
  }
};

export const saveAnswers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const program = await loadProgram(String(req.params.programCode));
    if (!program) return res.status(404).json({ error: 'Program asesmen tidak ditemukan.' });
    if (!canAccessProgram(req.portalUser, program.code)) {
      return res.status(403).json({ error: 'Anda tidak terdaftar pada program asesmen ini.' });
    }

    const answers = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
    const markedDoubt = req.body.markedDoubt && typeof req.body.markedDoubt === 'object' ? req.body.markedDoubt : {};

    const attempt = await prisma.examAttempt.upsert({
      where: { userId_programCode: { userId: req.portalUser.id, programCode: program.code } },
      update: {
        answers: JSON.stringify(answers),
        markedDoubt: JSON.stringify(markedDoubt),
        status: 'in_progress'
      },
      create: {
        userId: req.portalUser.id,
        programCode: program.code,
        answers: JSON.stringify(answers),
        markedDoubt: JSON.stringify(markedDoubt)
      }
    });

    return res.json({ savedAt: attempt.updatedAt, status: attempt.status });
  } catch (error) {
    console.error('Save exam answers error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan jawaban.' });
  }
};

export const submitExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    if (!(await isPortalProfileComplete(req.portalUser.id))) {
      return res.status(403).json({ error: 'Lengkapi data profil terlebih dahulu sebelum mengumpulkan ujian.' });
    }
    const program = await loadProgram(String(req.params.programCode));
    if (!program) return res.status(404).json({ error: 'Program asesmen tidak ditemukan.' });
    if (!canAccessProgram(req.portalUser, program.code)) {
      return res.status(403).json({ error: 'Anda tidak terdaftar pada program asesmen ini.' });
    }

    const answers = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
    const markedDoubt = req.body.markedDoubt && typeof req.body.markedDoubt === 'object' ? req.body.markedDoubt : {};
    const violations = Array.isArray(req.body.violations) ? req.body.violations : [];
    const integrityScore = Number.isFinite(Number(req.body.integrityScore))
      ? Math.max(0, Math.min(100, Math.round(Number(req.body.integrityScore))))
      : Math.max(0, 100 - violations.length * 5);

    const result = scoreAnswers(program.questions, answers);

    const attempt = await prisma.examAttempt.upsert({
      where: { userId_programCode: { userId: req.portalUser.id, programCode: program.code } },
      update: {
        answers: JSON.stringify(answers),
        markedDoubt: JSON.stringify(markedDoubt),
        violations: JSON.stringify(violations),
        score: result.score,
        integrityScore,
        autoGradedCount: result.autoGraded,
        manualReviewCount: result.manualReview,
        competencyScores: JSON.stringify(result.competencyScores),
        status: 'submitted',
        submittedAt: new Date()
      },
      create: {
        userId: req.portalUser.id,
        programCode: program.code,
        answers: JSON.stringify(answers),
        markedDoubt: JSON.stringify(markedDoubt),
        violations: JSON.stringify(violations),
        score: result.score,
        integrityScore,
        autoGradedCount: result.autoGraded,
        manualReviewCount: result.manualReview,
        competencyScores: JSON.stringify(result.competencyScores),
        status: 'submitted',
        submittedAt: new Date()
      }
    });

    await prisma.portalUser.update({
      where: { id: req.portalUser.id },
      data: {
        interviewScheduledAt: new Date(Date.now() + 5 * 60 * 1000),
        interviewStatus: 'scheduled'
      }
    });

    return res.json({
      score: attempt.score,
      integrityScore: attempt.integrityScore,
      autoGradedCount: attempt.autoGradedCount,
      manualReviewCount: attempt.manualReviewCount,
      competencyScores: parseJson(attempt.competencyScores, []),
      totalQuestions: program.questions.length,
      status: attempt.status,
      submittedAt: attempt.submittedAt
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    return res.status(500).json({ error: 'Gagal mengumpulkan ujian.' });
  }
};

export const getExamResult = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const programCode = String(req.params.programCode).trim().toUpperCase();
    if (!canAccessProgram(req.portalUser, programCode)) {
      return res.status(403).json({ error: 'Anda tidak terdaftar pada program asesmen ini.' });
    }
    const attempt = await prisma.examAttempt.findUnique({
      where: { userId_programCode: { userId: req.portalUser.id, programCode } }
    });
    if (!attempt) return res.status(404).json({ error: 'Belum ada hasil ujian untuk program ini.' });
    return res.json({
      id: attempt.id,
      programCode: attempt.programCode,
      status: attempt.status,
      score: attempt.score,
      integrityScore: attempt.integrityScore,
      autoGradedCount: attempt.autoGradedCount,
      manualReviewCount: attempt.manualReviewCount,
      competencyScores: parseJson(attempt.competencyScores, []),
      submittedAt: attempt.submittedAt
    });
  } catch (error) {
    console.error('Get exam result error:', error);
    return res.status(500).json({ error: 'Gagal memuat hasil ujian.' });
  }
};