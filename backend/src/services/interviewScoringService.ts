import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SkillMatrixItem {
  skill: string;
  score: number; // 0-100
  notes: string;
}

interface InterviewScoreResult {
  overallScore: number;
  skillMatrix: SkillMatrixItem[];
  recommendation: string;
  summary: string;
  phases?: { name: string; score: number; questions: { question: string; score: number; note: string }[] }[];
}

export async function runInterviewScoring(applicantId: string): Promise<any> {
  const applicant = await prisma.applicant.findUnique({
    where: { id: applicantId },
    include: { job: true }
  });

  if (!applicant) {
    throw new Error('Pelamar tidak ditemukan');
  }

  if (!applicant.interviewTranscript) {
    throw new Error('Belum ada transkrip wawancara untuk dinilai');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi di .env');
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const jobTitle = applicant.job?.title || applicant.appliedPosition || 'General';
    const jobDescription = applicant.job?.description || '';

    const prompt = `You are an expert HR interviewer and skills assessor. Your task is to evaluate a job interview transcript.

Job Position: "${jobTitle}"
Job Description: "${jobDescription}"

Interview Transcript:
"""
${applicant.interviewTranscript}
"""

Based on the transcript, evaluate the candidate on the following dimensions:
1. Technical Skills / Role Competency — How well does the candidate's knowledge and experience match the role?
2. Communication Skills — Clarity, articulation, listening, and responsiveness.
3. Problem Solving & Critical Thinking — Ability to analyze, reason, and provide structured answers.
4. Cultural Fit & Soft Skills — Attitude, teamwork, adaptability, motivation.
5. Overall Impression — General suitability for the role.

For each dimension, provide:
- A score from 0–100
- Brief notes explaining the score

Also provide:
- An overall score (weighted average, 0–100)
- A final recommendation: "strong_reject", "reject", "consider", "accept", or "strong_accept"
- A one-paragraph summary of the interview assessment in Indonesian
- Per-phase scores: split the interview into phases using the question flow (Pengenalan & Profil, Kompetensi Teknis, Soft Skill & Perilaku, Penutup). For each phase present, give a score and score EVERY question asked in that phase.

Return ONLY valid JSON with this structure (no markdown formatting):
{
  "skillMatrix": [
    { "skill": "Technical Skills / Role Competency", "score": <0-100>, "notes": "..." },
    { "skill": "Communication Skills", "score": <0-100>, "notes": "..." },
    { "skill": "Problem Solving & Critical Thinking", "score": <0-100>, "notes": "..." },
    { "skill": "Cultural Fit & Soft Skills", "score": <0-100>, "notes": "..." },
    { "skill": "Overall Impression", "score": <0-100>, "notes": "..." }
  ],
  "overallScore": <0-100>,
  "recommendation": "<strong_reject|reject|consider|accept|strong_accept>",
  "summary": "<one paragraph assessment in Indonesian>",
  "phases": [
    { "name": "...", "score": <0-100>, "questions": [ { "question": "...", "score": <0-100>, "note": "..." } ] }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ text: prompt }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            skillMatrix: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  skill: { type: 'string' },
                  score: { type: 'integer' },
                  notes: { type: 'string' }
                },
                required: ['skill', 'score', 'notes']
              }
            },
            overallScore: { type: 'integer' },
            recommendation: { type: 'string' },
            summary: { type: 'string' },
            phases: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  score: { type: 'integer' },
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question: { type: 'string' },
                        score: { type: 'integer' },
                        note: { type: 'string' }
                      },
                      required: ['question', 'score', 'note']
                    }
                  }
                },
                required: ['name', 'score', 'questions']
              }
            }
          },
          required: ['skillMatrix', 'overallScore', 'recommendation', 'summary']
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Tidak mendapat respon dari Gemini API');
    }

    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    const result: InterviewScoreResult = JSON.parse(cleanJson);

    // Validate and cap scores
    const overallScore = Math.min(100, Math.max(0, result.overallScore || 0));
    const skillMatrixJson = JSON.stringify(result.skillMatrix || []);
    const recommendation = ['strong_reject', 'reject', 'consider', 'accept', 'strong_accept'].includes(result.recommendation)
      ? result.recommendation
      : 'consider';

    // Build a summary string from the evaluation
    const interviewResult = `Skor Akhir: ${overallScore}/100 | Rekomendasi: ${recommendation}\n\n${result.summary || ''}\n\nSkill Matrix:\n${(result.skillMatrix || []).map((s: SkillMatrixItem) => `- ${s.skill}: ${s.score}/100 — ${s.notes}`).join('\n')}`;

    // Check passing threshold from job config
    // If passing score is set and candidate meets/exceeds it → 'scored'
    // If passing score is set but candidate is below → 'completed' (HR can review)
    // If no passing score set → 'scored' anyway
    const passingThreshold = applicant.job?.interviewPassingScore || 0;
    const isPassed = passingThreshold > 0 ? overallScore >= passingThreshold : true;
    const finalStatus = 'scored';

    const updatedApplicant = await prisma.applicant.update({
      where: { id: applicantId },
      data: {
        interviewStatus: finalStatus,
        interviewScore: overallScore,
        interviewSkillMatrix: skillMatrixJson,
        interviewPhaseScores: JSON.stringify(result.phases || []),
        interviewResult: interviewResult
      }
    });

    console.log(`[Interview Scoring] Completed for ${applicant.fullName}: Score=${overallScore}/100, Recommendation=${recommendation}`);
    return updatedApplicant;
  } catch (error: any) {
    console.error(`[Interview Scoring] Error scoring applicant ${applicantId}:`, error);
    await prisma.applicant.update({
      where: { id: applicantId },
      data: {
        interviewStatus: 'completed',
        interviewResult: `Gagal menilai wawancara otomatis: ${error.message || error}`
      }
    });
    throw error;
  }
}
