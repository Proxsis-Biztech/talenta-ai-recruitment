import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const prisma = new PrismaClient();

async function getCvBuffer(applicant: any): Promise<Buffer> {
  // Scenario 1: Local file exists
  if (applicant.localCvPath) {
    const localFilePath = path.join(__dirname, '../../uploads', applicant.localCvPath);
    if (fs.existsSync(localFilePath)) {
      return fs.readFileSync(localFilePath);
    }
  }

  // Scenario 2: Google Drive file
  const credentialsPath = process.env.GDRIVE_SERVICE_ACCOUNT_JSON;
  if (credentialsPath && applicant.syncStatus === 'success') {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });
    
    // cvFileName holds the GDrive file ID after sync
    const fileId = applicant.cvFileName;
    
    const fileResponse = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );
    
    return Buffer.from(fileResponse.data as ArrayBuffer);
  }

  throw new Error("Berkas CV tidak ditemukan secara lokal maupun di Google Drive");
}

export async function runCvScreening(applicantId: string): Promise<any> {
  const applicant = await prisma.applicant.findUnique({
    where: { id: applicantId },
    include: { experiences: true, job: true }
  });

  if (!applicant) {
    throw new Error("Pelamar tidak ditemukan");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi di .env");
  }

  try {
    const pdfBuffer = await getCvBuffer(applicant);
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    
    const experiencesStr = applicant.experiences.map((exp: any) => 
      `- ${exp.position} di ${exp.companyName} (${exp.startDate.toISOString().split('T')[0]} s/d ${exp.endDate ? exp.endDate.toISOString().split('T')[0] : 'Sekarang'})`
    ).join('\n');

    let targetPositionInfo = `posisi yang dilamar: "${applicant.appliedPosition}"`;
    if (applicant.job) {
      targetPositionInfo = `posisi yang dilamar: "${applicant.job.title}" dengan deskripsi pekerjaan (jobdesk) & persyaratan berikut:\n"""\n${applicant.job.description}\n"""`;
    }

    const prompt = `Anda adalah seorang HR Expert dan ATS (Applicant Tracking System) Screener profesional. 
Tugas Anda adalah menganalisis dokumen CV pelamar yang dilampirkan dan mencocokkannya dengan ${targetPositionInfo}.

Berikut adalah data pendaftaran pelamar dari form:
- Nama Lengkap: ${applicant.fullName}
- Pendidikan: ${applicant.education} (Jurusan: ${applicant.major || '-'}, IPK: ${applicant.gpa || '-'}, Universitas: ${applicant.university || '-'})
- Pengalaman Kerja yang Diinput: 
${experiencesStr || 'Tidak ada riwayat pengalaman kerja yang diinput di form.'}

Tugas Anda:
1. Baca dan pahami dokumen CV (PDF) yang dilampirkan secara menyeluruh.
2. Bandingkan profil pelamar (keahlian, pengalaman, riwayat pendidikan) dengan ${applicant.job ? `persyaratan posisi "${applicant.job.title}"` : `posisi yang dilamar ("${applicant.appliedPosition}")`}.
3. Berikan nilai kecocokan (skor ATS) antara 0 hingga 100. Kriteria penilaian:
   - Skor 80-100: Sangat cocok, keahlian dan pengalaman relevan dengan posisi.
   - Skor 60-79: Cukup cocok, memiliki dasar yang baik tetapi ada beberapa area skill/pengalaman yang kurang relevan.
   - Skor <60: Kurang cocok, profil tidak sesuai dengan kebutuhan posisi yang dilamar.
4. Buatlah ringkasan analisis dalam Bahasa Indonesia (maksimal 3 paragraf) yang menjelaskan:
   - Kelebihan utama pelamar yang relevan dengan posisi.
   - Kekurangan atau area yang kurang sejalan/perlu dikonfirmasi.
   - Alasan objektif di balik pemberian skor tersebut.

Kembalikan jawaban Anda HANYA dalam format JSON dengan struktur berikut (jangan tambahkan markdown formatting seperti \`\`\`json):
{
  "score": <angka antara 0-100>,
  "summary": "<isi ringkasan analisis Anda dalam Bahasa Indonesia>"
}`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: pdfBuffer.toString('base64'),
              mimeType: 'application/pdf'
            }
          },
          prompt
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              score: { type: 'integer' },
              summary: { type: 'string' }
            },
            required: ['score', 'summary']
          }
        }
      });
    } catch (primaryErr: any) {
      console.warn('Gemini 2.5 Flash primary failed, attempting fallback to gemini-3.5-flash-lite...', primaryErr.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: [
          {
            inlineData: {
              data: pdfBuffer.toString('base64'),
              mimeType: 'application/pdf'
            }
          },
          prompt
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });
    }

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Tidak mendapat respon dari Gemini API");
    }

    // Clean markdown formatting if present
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    const result = JSON.parse(cleanJson);
    
    // Update applicant with screening result
    const updatedApplicant = await prisma.applicant.update({
      where: { id: applicantId },
      data: {
        screeningStatus: 'success',
        screeningScore: typeof result.score === 'number' ? result.score : parseInt(result.score) || 0,
        screeningSummary: result.summary || 'Tidak ada ringkasan analisis dari AI.'
      }
    });

    return updatedApplicant;

  } catch (error: any) {
    console.error(`[CV Screener] Error screening applicant ${applicantId}:`, error);
    await prisma.applicant.update({
      where: { id: applicantId },
      data: {
        screeningStatus: 'failed',
        screeningSummary: `Gagal menganalisis CV otomatis: ${error.message || error}`
      }
    });
    throw error;
  }
}
