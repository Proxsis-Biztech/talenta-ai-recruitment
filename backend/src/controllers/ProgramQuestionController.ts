import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const typeMap: Record<string, string> = {
  single: 'single',
  multi: 'multi',
  short: 'short',
  essay: 'essay',
  matching: 'matching'
};

export const syncProgramQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const programCode = String(req.params.programCode || '').trim().toUpperCase();
    const questions = Array.isArray(req.body.questions) ? req.body.questions : [];
    if (!programCode) return res.status(400).json({ error: 'Kode program wajib diisi.' });

    await prisma.programQuestion.deleteMany({ where: { programCode } });
    if (questions.length > 0) {
      await prisma.programQuestion.createMany({
        data: questions.map((question: any, index: number) => ({
          programCode,
          orderNo: index + 1,
          type: typeMap[question.type] || 'single',
          competency: String(question.competency || 'General'),
          difficulty: String(question.difficulty || 'Sedang'),
          text: String(question.text || ''),
          codeSnippet: question.codeSnippet ? String(question.codeSnippet) : null,
          options: JSON.stringify(question.options || []),
          matchingPairs: JSON.stringify(question.matchingPairs || []),
          correctAnswer: question.correctAnswer === undefined ? null : JSON.stringify(question.correctAnswer),
          points: Number(question.points) || 1
        }))
      });
    }
    return res.json({ message: 'Bank soal program berhasil disinkronkan.', count: questions.length });
  } catch (error) {
    console.error('Sync program questions error:', error);
    return res.status(500).json({ error: 'Gagal menyinkronkan bank soal program.' });
  }
};
