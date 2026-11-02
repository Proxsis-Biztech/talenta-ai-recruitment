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
    const queryLanguage = parsedUrl.searchParams.get('language') || 'Indonesian';
    const queryJobTitle = parsedUrl.searchParams.get('jobTitle') || '';
    const queryJobDescription = parsedUrl.searchParams.get('jobDescription') || '';
    const queryEmail = parsedUrl.searchParams.get('email') || '';
    const queryCandidateName = parsedUrl.searchParams.get('candidateName') || '';

    let session: any = null;
    let transcript = '';
    let candidateName = queryCandidateName || 'Kandidat';
    let isLiveReady = false;
    const messageQueue: any[] = [];

    const processMessage = (message: any) => {
      try {
        if (!session) return;

        if (message.type === 'text' && typeof message.text === 'string') {
          console.log('[GeminiLiveGateway] Sending text turn to Gemini:', message.text);
          transcript += `Candidate: ${message.text}\n`;
          session.sendClientContent({
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
          session.sendRealtimeInput({
            audio: {
              data: message.data,
              mimeType: message.mimeType || 'audio/pcm;rate=16000'
            }
          });
        }

        if (message.type === 'audioEnd') {
          session.sendRealtimeInput({ audioStreamEnd: true });
        }

        if (message.type === 'pause') {
          session.sendRealtimeInput({ audioStreamEnd: true });
        }

        if (message.type === 'resume') {
          session.sendClientContent({
            turns: [
              {
                role: 'user',
                parts: [{ text: '(Wawancara dilanjutkan kembali setelah jeda singkat. Lanjutkan wawancara secara alami.)' }]
              }
            ],
            turnComplete: true
          });
        }
      } catch (err) {
        console.error('[GeminiLiveGateway] Error processing message:', err);
      }
    };

    // Attach message handler immediately so no client packets are lost during connection
    socket.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        if (!isLiveReady || !session) {
          console.log('[GeminiLiveGateway] Queuing message until session ready:', message.type);
          messageQueue.push(message);
        } else {
          processMessage(message);
        }
      } catch {
        sendJson(socket, { type: 'error', message: 'Format pesan tidak valid' });
      }
    });

    socket.on('close', () => {
      session?.close();
    });

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
          systemInstruction: `Anda adalah pewawancara AI profesional bernama Ava dari platform asesmen Talenta+.
Format Wawancara: Wawancara interaktif tatap muka 1-on-1 bersama kandidat bernama ${candidateName}.
- Berbicaralah dalam Bahasa Indonesia yang alami, santun, hangat, dan profesional.
- Selalu berbicara sebagai orang pertama tunggal "saya", dan sapa kandidat dengan namanya (${candidateName}).
${screeningContext}${jobContext}

ALUR WAWANCARA:
1. Perkenalan hangat dan tanyakan profil/latar belakang teknis ${candidateName}.
2. Eksplorasi kompetensi teknis, arsitektur, dan pemecahan masalah sesuai posisi ${queryJobTitle || 'yang dilamar'}.
3. Tanya studi kasus nyata saat menghadapi tantangan atau insiden teknis.
4. Kesimpulan dan penutup sesi wawancara.

ATURAN PERCAKAPAN:
1. JANGAN PERNAH mengeluarkan pemikiran internal seperti "**Reading the Question**", tanda markdown, atau instruksi sistem.
2. Ajukan tepat SATU pertanyaan per giliran dalam 1-2 kalimat agar percakapan mengalir alami seperti manusia.
3. Setelah bertanya, SEGERA BERHENTI BERBICARA dan dengarkan jawaban ${candidateName}.
4. Ketika ${candidateName} selesai menjawab, berikan apresiasi singkat atau tanggapan positif 1 kalimat, lalu lanjutkan dengan pertanyaan berikutnya.
5. Jika ucapan kandidat kurang terdengar jelas, katakan dengan ramah: "Maaf ${candidateName}, suara Anda sempat terputus. Boleh tolong diulangi kembali penjelasan Anda?"`,
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            console.log('[GeminiLiveGateway] Live session opened successfully for:', candidateName);
          },
          onmessage: (message) => {
            const text = getTextParts(message);
            const inputText = message.serverContent?.inputTranscription?.text;
            const outputText = message.serverContent?.outputTranscription?.text;

            if (inputText) {
              console.log('[GeminiLiveGateway] Input transcription:', inputText);
              transcript += `Candidate: ${inputText}\n`;
              sendJson(socket, { type: 'candidateText', text: inputText });
            }
            if (outputText) {
              console.log('[GeminiLiveGateway] Output transcription:', outputText);
              transcript += `HR AI: ${outputText}\n`;
              sendJson(socket, { type: 'aiText', text: outputText });
            } else if (text && !text.includes('**') && !text.toLowerCase().includes('interview process') && !text.toLowerCase().includes('initiating')) {
              console.log('[GeminiLiveGateway] Model text:', text);
              sendJson(socket, { type: 'aiText', text });
            }

            for (const audio of getAudioParts(message)) {
              sendJson(socket, { type: 'audio', data: audio.data, mimeType: audio.mimeType || 'audio/pcm' });
            }

            if (message.serverContent?.turnComplete) {
              console.log('[GeminiLiveGateway] Turn complete');
              sendJson(socket, { type: 'turnComplete' });
            }
          },
          onerror: (event) => {
            console.error('[GeminiLiveGateway] Session error:', event);
            sendJson(socket, { type: 'error', message: event.message || 'Gemini Live error' });
          },
          onclose: () => {
            console.log('[GeminiLiveGateway] Session closed');
            sendJson(socket, { type: 'closed' });
          }
        }
      });

      isLiveReady = true;
      sendJson(socket, { type: 'ready' });
      console.log('[GeminiLiveGateway] Session ready, flushing queue of size:', messageQueue.length);
      while (messageQueue.length > 0) {
        processMessage(messageQueue.shift());
      }
    } catch (error: any) {
      console.error('[GeminiLiveGateway] Connect error:', error);
      sendJson(socket, { type: 'error', message: error.message || 'Gagal terhubung ke Gemini Live' });
      socket.close();
    }
  });
};
