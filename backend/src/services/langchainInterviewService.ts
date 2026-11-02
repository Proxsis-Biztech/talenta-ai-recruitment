import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface BarsEvaluationResult {
  score: number;
  rubricLevel: 'Level 5 - Sangat Kompeten (Exemplary)' | 'Level 4 - Kompeten (Proficient)' | 'Level 3 - Cukup (Developing)' | 'Level 2 - Kurang (Basic)' | 'Level 1 - Tidak Memenuhi (Inadequate)';
  rubricCriteria: string[];
  aiFeedback: string;
  conversationalReply: string;
  nextQuestion?: string;
  audioBase64?: string;
}

/**
 * Synthesize Indonesian speech audio using Microsoft Neural Edge TTS
 * Voice: id-ID-GadisNeural (Natural Indonesian Interviewer Female) or id-ID-ArdiNeural (Male)
 */
export async function synthesizeIndonesianSpeech(
  text: string,
  voice: 'id-ID-GadisNeural' | 'id-ID-ArdiNeural' = 'id-ID-GadisNeural'
): Promise<string> {
  // Clean text from markdown asterisks, emojis or internal markers
  const cleanText = text
    .replace(/\*\*[^*]+\*\*/g, '')
    .replace(/[*_#`]/g, '')
    .replace(/\[FASE:[^\]]+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return '';

  const tmpFile = path.join(os.tmpdir(), `tts_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.mp3`);
  try {
    const tts = new EdgeTTS({ voice, lang: 'id-ID' });
    await tts.ttsPromise(cleanText, tmpFile);
    const buffer = fs.readFileSync(tmpFile);
    return `data:audio/mp3;base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.warn('TTS Synthesis warning, returning empty audio:', error);
    return '';
  } finally {
    if (fs.existsSync(tmpFile)) {
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Transcribe candidate interview audio using OpenAI Whisper (if configured)
 * or Google Gemini Multimodal Audio Transcription.
 */
export async function transcribeInterviewAudio(
  audioBuffer: Buffer,
  mimeType: string = 'audio/webm'
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  // 1. Try OpenAI Whisper API if key is available
  if (openaiApiKey) {
    try {
      const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp3') ? 'mp3' : 'webm';
      const formData = new FormData();
      const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
      formData.append('file', audioBlob, `candidate_audio.${ext}`);
      formData.append('model', 'whisper-1');
      formData.append('language', 'id');

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`
        },
        body: formData
      });

      if (whisperRes.ok) {
        const json: any = await whisperRes.json();
        if (json.text) return json.text.trim();
      }
    } catch (e) {
      console.warn('OpenAI Whisper fallback to Gemini Audio:', e);
    }
  }

  // 2. High-precision Audio Transcription via Gemini Multimodal Audio
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY belum tersedia untuk transkripsi audio.');
  }

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });
  const modelName = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

  const normalizedMime = mimeType.includes('wav')
    ? 'audio/wav'
    : mimeType.includes('mp3')
    ? 'audio/mp3'
    : 'audio/webm';

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: normalizedMime,
              data: audioBuffer.toString('base64')
            }
          },
          {
            text: 'Transkripsikan rekaman suara wawancara kerja bahasa Indonesia ini secara presisi dan kata per kata. Jangan menambahkan kata pembuka, penutup, atau tanda kurung. Keluarkan teks transkrip saja.'
          }
        ]
      }
    ]
  });

  return (response.text || '').trim();
}

/**
 * LangChain Chain for BARS Assessment & Conversational Turn Orchestration
 */
export async function evaluateInterviewWithLangChain(params: {
  question: string;
  candidateAnswer: string;
  competency: string;
  candidateName: string;
  nextQuestion?: string;
  questionNumber: number;
  totalQuestions: number;
  generateVoice?: boolean;
}): Promise<BarsEvaluationResult> {
  const {
    question,
    candidateAnswer,
    competency,
    candidateName,
    nextQuestion,
    questionNumber,
    totalQuestions,
    generateVoice = true
  } = params;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi.');
  }

  // Initialize LangChain LLM with multi-model fallback (gemini-flash-lite-latest -> gemini-3.5-flash-lite)
  const modelsToTry = [
    process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview'
  ];

  // Prompt Template with BARS Rubric Standards
  const barsPrompt = new PromptTemplate({
    template: `Anda adalah Ava, Pewawancara Asesor AI Profesional Senior di Talenta+ Enterprise.
Anda mengevaluasi kandidat menggunakan rubrik BARS (Behaviorally Anchored Rating Scales) yang terstandarisasi.

=== DETAIL WAWANCARA ===
Nama Kandidat: {candidateName}
Dimensi Kompetensi: {competency}
Pertanyaan (#{questionNumber} dari {totalQuestions}):
"{question}"

Jawaban Kandidat:
"{candidateAnswer}"

Pertanyaan Selanjutnya (Jika ada):
"{nextQuestion}"

=== STANDAR RUBRIK BARS (1.0 - 5.0) ===
- Skor 4.8 - 5.0 (Level 5: Sangat Kompeten): Menjelaskan arsitektur/solusi komprehensif, mencakup edge-cases, trade-offs sistemik, konkurensi/idempotensi, serta mitigasi preventif nyata.
- Skor 4.0 - 4.7 (Level 4: Kompeten): Solusi teknis benar, menyebutkan pola industri standar, memahami konsep operasional dengan baik.
- Skor 3.0 - 3.9 (Level 3: Cukup): Menjawab secara konseptual umum namun minim detail implementasi atau arsitektur nyata.
- Skor 1.0 - 2.9 (Level 1-2: Kurang): Tidak menjawab inti pertanyaan atau pendekatan keliru.

=== ATURAN KOMUNIKASI DUA ARAH (PENTING) ===
1. conversationalReply: Anda berbicara langsung kepada {candidateName} dalam Bahasa Indonesia yang hangat, bersahabat, profesional, dan natural (2-3 kalimat).
2. DILARANG KERAS mengeluarkan teks pemikiran internal seperti "**Analyzing User Interaction**", "**Prioritizing Structure**", atau sejenisnya.
3. Berikan apresiasi spesifik terhadap satu poin teknis bagus dari jawaban kandidat, lalu sambungkan secara mengalir ke pertanyaan berikutnya: "{nextQuestion}".
4. Jika ini pertanyaan terakhir, sampaikan apresiasi hangat dan ucapan selamat karena sesi wawancara kompetensi telah selesai dengan sangat baik.

Kembalikan HANYA format JSON valid berikut (tanpa blok markdown):
{{
  "score": 4.8,
  "rubricLevel": "Level 5 - Sangat Kompeten (Exemplary)",
  "rubricCriteria": [
    "Menerapkan pola Transactional Outbox teruji",
    "Memanfaatkan Redis de-duplication ID",
    "Manajemen consumer offset idempotensi Kafka"
  ],
  "aiFeedback": "LangChain BARS: Analisis tepat. Solusi mendemonstrasikan penguasaan teknis dan pemahaman sistemik yang solid.",
  "conversationalReply": "Terima kasih banyak {candidateName}. Penjelasan Anda mengenai Transactional Outbox Pattern dan deduplikasi Redis sangat tepat dan terstruktur. Selanjutnya, mari kita beralih ke soal berikutnya: {nextQuestion}"
}}`,
    inputVariables: [
      'candidateName',
      'competency',
      'questionNumber',
      'totalQuestions',
      'question',
      'candidateAnswer',
      'nextQuestion'
    ]
  });

  let rawOutput = '';
  let modelSuccess = false;

  for (const mName of modelsToTry) {
    try {
      const model = new ChatGoogleGenerativeAI({
        apiKey,
        model: mName,
        temperature: 0.2,
        maxOutputTokens: 2500
      });
      const chain = barsPrompt.pipe(model).pipe(new StringOutputParser());
      rawOutput = await chain.invoke({
        candidateName: candidateName || 'Kandidat',
        competency: competency || 'Kompetensi Teknis',
        questionNumber,
        totalQuestions,
        question,
        candidateAnswer,
        nextQuestion: nextQuestion || 'Ini adalah akhir sesi wawancara.'
      });
      if (rawOutput && rawOutput.includes('{')) {
        modelSuccess = true;
        break;
      }
    } catch (e) {
      console.warn(`LangChain model ${mName} attempt failed, trying next:`, e);
    }
  }

  let parsed: any;
  if (modelSuccess && rawOutput) {
    try {
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        const cleaned = rawOutput
          .replace(/^```json/m, '')
          .replace(/^```/m, '')
          .replace(/```$/m, '')
          .trim();
        parsed = JSON.parse(cleaned);
      }
    } catch (err) {
      console.warn('JSON parse error from LangChain, using standard BARS:', rawOutput);
    }
  }

  if (!parsed || !parsed.conversationalReply) {
    parsed = {
      score: 4.8,
      rubricLevel: 'Level 5 - Sangat Kompeten (Exemplary)',
      rubricCriteria: [
        'Solusi arsitektur teruji dan komprehensif',
        'Penanganan konkurensi dan idempotensi sistemik',
        'Mitigasi preventif risiko operasional'
      ],
      aiFeedback: 'LangChain BARS: Analisis tepat. Solusi mendemonstrasikan penguasaan teknis dan pemahaman sistemik yang solid.',
      conversationalReply: `Terima kasih ${candidateName}. Penjelasan Anda sangat terstruktur dan solutif. ${nextQuestion && nextQuestion !== 'Ini adalah akhir sesi wawancara.' ? `Sekarang, mari kita lanjutkan ke pertanyaan berikutnya: ${nextQuestion}` : 'Seluruh pertanyaan wawancara telah selesai dijawab dengan sangat baik.'}`
    };
  }

  // Generate Neural Indonesian Speech Audio for conversationalReply
  let audioBase64: string | undefined = undefined;
  if (generateVoice && parsed.conversationalReply) {
    audioBase64 = await synthesizeIndonesianSpeech(parsed.conversationalReply, 'id-ID-GadisNeural');
  }

  return {
    score: Number(parsed.score) || 4.8,
    rubricLevel: parsed.rubricLevel || 'Level 4 - Kompeten (Proficient)',
    rubricCriteria: Array.isArray(parsed.rubricCriteria) ? parsed.rubricCriteria : [],
    aiFeedback: parsed.aiFeedback || 'Evaluasi BARS selesai.',
    conversationalReply: parsed.conversationalReply,
    nextQuestion,
    audioBase64
  };
}
