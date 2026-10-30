import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const model = process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-latest';
const voices = ['Kore', 'Puck', 'Charon', 'Fenrir'];

const sendJson = (socket: WebSocket, payload: unknown) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
};

const getTextParts = (message: any) => {
  const parts = message.serverContent?.modelTurn?.parts || [];
  return parts.map((part: any) => part.text).filter(Boolean).join('');
};

const getAudioParts = (message: any) => {
  const parts = message.serverContent?.modelTurn?.parts || [];
  return parts
    .map((part: any) => part.inlineData)
    .filter((inlineData: any) => Boolean(inlineData?.data));
};

/**
 * Fetch screening context for an applicant by email to inject into the AI interviewer prompt.
 */
async function getScreeningContext(email: string | null): Promise<string> {
  if (!email) return '';
  try {
    const applicant = await prisma.applicant.findUnique({
      where: { email },
      include: { job: true }
    });
    if (!applicant || applicant.screeningStatus !== 'success') return '';

    const score = applicant.screeningScore;
    const summary = applicant.screeningSummary || 'Tidak ada ringkasan.';
    const position = applicant.job?.title || applicant.appliedPosition || 'posisi yang dilamar';

    return `
=== AI SCREENING CONTEXT ===
The candidate (${applicant.fullName}) applied for: "${position}".
CV Screening Score: ${score}/100.
CV Screening Summary: ${summary}
Use this screening context to inform your interview. Probe deeper into any weak areas mentioned in the screening and verify the candidate's claimed strengths.
============================
`;
  } catch {
    return '';
  }
}

export const registerGeminiLiveGateway = (server: HttpServer) => {
  const wss = new WebSocketServer({ server, path: '/api/interview/live' });

  wss.on('connection', async (socket, req) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      sendJson(socket, { type: 'error', message: 'GEMINI_API_KEY belum tersedia di .env' });
      socket.close();
      return;
    }

    const parsedUrl = new URL(req.url || '', 'http://localhost');
    const queryVoice = parsedUrl.searchParams.get('voice') || voices[0];
    const queryLanguage = parsedUrl.searchParams.get('language') || 'English';
    const queryJobTitle = parsedUrl.searchParams.get('jobTitle') || '';
    const queryJobDescription = parsedUrl.searchParams.get('jobDescription') || '';
    const queryEmail = parsedUrl.searchParams.get('email') || '';

    let session: any = null;
    let transcript = '';
    let candidateName = 'Kandidat';

    // Update interview status to in_progress and fetch candidate name
    if (queryEmail) {
      try {
        const applicant = await prisma.applicant.findUnique({
          where: { email: queryEmail },
          select: { fullName: true, interviewStatus: true }
        });
        if (applicant?.fullName) {
          candidateName = applicant.fullName;
        }
        if (applicant && applicant.interviewStatus === 'not_started') {
          await prisma.applicant.update({
            where: { email: queryEmail },
            data: { interviewStatus: 'in_progress' }
          });
        }
      } catch { /* ignore */ }
    }

    try {
      const { GoogleGenAI, Modality } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      // Inject CV screening context into the system prompt
      const screeningContext = await getScreeningContext(queryEmail || null);

      const jobContext = queryJobTitle
        ? `\nKandidat (${candidateName}) melamar posisi: "${queryJobTitle}". Deskripsi posisi: ${queryJobDescription || 'Tidak ada deskripsi'}. Sesuaikan pertanyaan dengan persyaratan posisi ini.\n`
        : '';

      session = await ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: queryVoice
              }
            }
          },
          systemInstruction: `Anda adalah satu-satunya pewawancara HR profesional bernama Ava dari Kinesta HR.
Format Wawancara: Wawancara kerja eksklusif 1-on-1 (hanya ada 1 orang pewawancara yaitu Anda sendiri, dan hanya ada 1 orang kandidat yang diwawancarai yaitu ${candidateName}).
- Selalu berbicara sebagai orang pertama tunggal "saya" (JANGAN PERNAH gunakan kata "kami" atau bertindak seolah-olah Anda adalah panel/tim).
- Seluruh sesi wawancara ini dipimpin dan dilakukan oleh Anda seorang diri bersama ${candidateName}.
${screeningContext}${jobContext}

Jalankan wawancara dalam 4 fase secara berurutan:
1. Pengenalan & Profil (Perkenalan diri ${candidateName}, latar belakang pendidikan & karier)
2. Kompetensi Teknis (Pendalaman skill teknis dan problem solving sesuai posisi yang dilamar)
3. Soft Skill & Perilaku (Komunikasi, kerja tim, etos kerja, dan penanganan tantangan)
4. Penutup (Apresiasi, kesempatan bertanya bagi kandidat, dan penutupan hangat)

ATURAN MUTLAK WAWANCARA:
1. Format 1-on-1 Tunggal: Anda adalah satu-satunya pewawancara di sesi ini. Selalu berbicara menggunakan kata ganti "saya" dan sebut nama kandidat (${candidateName}).
2. DILARANG MENJAWAB SENDIRI: Anda HANYA bertugas sebagai penanya dan penilai. DILARANG KERAS menjawab pertanyaan Anda sendiri atau membuat monolog. DILARANG KERAS berpura-pura menjadi kandidat.
3. Satu Pertanyaan per Giliran: Ajukan tepat SATU pertanyaan yang jelas, lengkap, dan terstruktur dalam 1-3 kalimat dalam ${queryLanguage}. Setelah pertanyaan Anda selesai diajukan, SEGERA BERHENTI BERBICARA dan tunggu jawaban dari ${candidateName}. JANGAN berbicara lagi sebelum ${candidateName} merespons.
4. Jangan Keluarkan Kata Terpotong: Jangan pernah mengeluarkan respons hanya 1 kata terpotong (seperti "komunikasi?", "terkait?", atau "produktif?").
5. Respons yang Menghargai: Saat kandidat selesai menjawab, berikan apresiasi singkat yang relevan, lalu ajukan pertanyaan berikutnya.
6. Penanganan Audio Kurang Jelas: Jika ucapan kandidat sempat tidak jelas atau terputus oleh suara sekitar, jangan menebak dengan satu kata. Tanyakan dengan ramah: "Maaf ${candidateName}, suara Anda sempat terputus. Bisa tolong diulangi kembali penjelasan Anda?"
7. Token Fase: Saat Anda beralih ke fase baru, awali pesan Anda dengan token [FASE:2], [FASE:3], atau [FASE:4] persis di awal kalimat pertama fase tersebut.`,
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => sendJson(socket, { type: 'ready' }),
          onmessage: (message) => {
            const text = getTextParts(message);
            const inputText = message.serverContent?.inputTranscription?.text;
            const outputText = message.serverContent?.outputTranscription?.text;

            if (inputText) {
              transcript += `Candidate: ${inputText}\n`;
              sendJson(socket, { type: 'candidateText', text: inputText });
            }
            if (outputText) {
              transcript += `HR AI: ${outputText}\n`;
              sendJson(socket, { type: 'aiText', text: outputText });
            } else if (text) {
              sendJson(socket, { type: 'aiText', text });
            }

            for (const audio of getAudioParts(message)) {
              sendJson(socket, { type: 'audio', data: audio.data, mimeType: audio.mimeType || 'audio/pcm' });
            }

            if (message.serverContent?.turnComplete) {
              sendJson(socket, { type: 'turnComplete' });
            }
          },
          onerror: (event) => sendJson(socket, { type: 'error', message: event.message || 'Gemini Live error' }),
          onclose: () => sendJson(socket, { type: 'closed' })
        }
      });

      socket.on('message', (raw) => {
        try {
          const message = JSON.parse(raw.toString());

          if (message.type === 'text' && typeof message.text === 'string') {
            transcript += `Candidate: ${message.text}\n`;
            session?.sendClientContent({
              turns: [
                {
                  role: 'user',
                  parts: [{ text: message.text }]
                }
              ],
              turnComplete: true
            });
          }

          if (message.type === 'audio' && typeof message.data === 'string') {
            session?.sendRealtimeInput({
              audio: {
                data: message.data,
                mimeType: message.mimeType || 'audio/webm'
              }
            });
          }

          if (message.type === 'audioEnd') {
            session?.sendRealtimeInput({ audioStreamEnd: true });
          }

          // Pause — finalize candidate's audio turn so AI responds to what was said, then pauses
          if (message.type === 'pause') {
            session?.sendRealtimeInput({ audioStreamEnd: true });
          }

          // Resume from pause — prompt AI gently to acknowledge and continue
          if (message.type === 'resume') {
            session?.sendClientContent({
              turns: [
                {
                  role: 'user',
                  parts: [{ text: '(Wawancara dilanjutkan kembali setelah jeda singkat. Lanjutkan wawancara secara alami.)' }]
                }
              ],
              turnComplete: true
            });
          }
        } catch {
          sendJson(socket, { type: 'error', message: 'Format pesan tidak valid' });
        }
      });

      socket.on('close', () => {
        session?.close();
      });
    } catch (error: any) {
      sendJson(socket, { type: 'error', message: error.message || 'Gagal terhubung ke Gemini Live' });
      socket.close();
    }
  });
};
