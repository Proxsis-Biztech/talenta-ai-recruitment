import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const buildQuestion = (competency: string, index: number) => {
  const prompts = [
    `Ceritakan pengalaman nyata Anda dalam menerapkan ${competency}. Apa tantangan utama dan bagaimana Anda mengatasinya?`,
    `Bagaimana Anda mengambil keputusan teknis terkait ${competency} ketika menghadapi keterbatasan waktu dan sumber daya?`,
    `Berikan contoh kasus di mana pendekatan ${competency} Anda gagal atau perlu direvisi. Apa pembelajaran utamanya?`,
    `Jika Anda harus menjelaskan ${competency} kepada tim lintas fungsi, bagaimana Anda menyusun penjelasan dan mengukur keberhasilannya?`
  ];
  return {
    id: index + 1,
    question: prompts[index % prompts.length],
    competency,
    weight: '25%',
    sampleAnswer: ''
  };
};

export const getInterviewQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const programCode = String(req.query.programCode || '').trim().toUpperCase();
    if (!programCode) return res.status(400).json({ error: 'Kode program wajib diisi.' });

    const job = await prisma.job.findFirst({ where: { code: programCode } });
    if (!job) return res.status(404).json({ error: 'Program asesmen tidak ditemukan.' });

    const questionRows = await prisma.programQuestion.findMany({
      where: { programCode },
      select: { competency: true },
      distinct: ['competency']
    });
    const competencies = questionRows.map((row) => row.competency).filter(Boolean);
    const selected = (competencies.length > 0 ? competencies : [
      'Problem Solving',
      'Komunikasi Teknis',
      'Kolaborasi Tim',
      'Pengambilan Keputusan'
    ]).slice(0, 4);

    return res.json({
      data: selected.map((competency, index) => buildQuestion(competency, index))
    });
  } catch (error) {
    console.error('Get interview questions error:', error);
    return res.status(500).json({ error: 'Gagal memuat pertanyaan wawancara.' });
  }
};
