import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middleware/auth';
import { getAiConfig } from './aiConfigService';

export interface HumanPhotoAnalysis {
  isHuman: boolean;
  isLivePhoto: boolean;
  faceCount: number;
  faceClear: boolean;
  isHalfBody: boolean;
  spoofReason?: string;
  summary?: string;
}

export interface HumanPhotoVerificationResult {
  approved: boolean;
  isHuman: boolean;
  isLivePhoto: boolean;
  faceCount: number;
  faceClear: boolean;
  isHalfBody: boolean;
  reason: string;
  imageSha256: string;
  verifiedAt: string;
}

export class FaceVerificationError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'FaceVerificationError';
    this.statusCode = statusCode;
  }
}

export interface ParsedImageData {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  base64Data: string;
  byteLength: number;
  imageSha256: string;
}

export interface VisionContentResponse {
  text?: string;
}

export interface VisionModelClient {
  models: {
    generateContent: (params: {
      model: string;
      contents: Array<unknown>;
      config?: Record<string, unknown>;
    }) => Promise<VisionContentResponse>;
  };
}

const MIN_IMAGE_BYTES = 1_500;
const MAX_IMAGE_BYTES = 2_500_000;
const TOKEN_TTL = '15m';
const DATA_URL_REGEX = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/i;

const HUMAN_VERIFICATION_PROMPT = `Anda adalah sistem verifikasi identitas biometrik KYC untuk platform asesmen online.
Analisis gambar yang dilampirkan untuk menentukan apakah gambar tersebut menampilkan SATU orang manusia asli secara langsung di depan kamera.

Kriteria penilaian ketat:
1. isHuman (boolean): bernilai true HANYA jika subjek adalah manusia nyata/asli. Bernilai false jika gambar kosong, ruangan tanpa orang, objek benda mati, hewan, ilustrasi/kartun/anime, patung/manekin, avatar 3D/AI, atau topeng.
2. isLivePhoto (boolean): bernilai false jika terlihat jelas bahwa gambar adalah foto yang diarahkan ke layar HP/monitor lain, foto KTP/ijazah, atau foto kertas yang difoto ulang (spoofing). Bernilai true jika tampak seperti tangkapan kamera langsung terhadap seseorang.
3. faceCount (integer): jumlah wajah manusia yang terdeteksi dalam gambar (0, 1, 2, dst).
4. faceClear (boolean): bernilai true jika satu wajah utama terlihat cukup jelas, pencahayaan memadai, tidak terlalu buram/gelap, dan tidak tertutup masker penuh, helm, atau kacamata hitam gelap.
5. isHalfBody (boolean): bernilai true HANYA jika komposisi foto setengah badan, yaitu kepala, kedua bahu, dan area dada terlihat utuh di dalam bingkai. Bernilai false jika foto hanya wajah (close-up), hanya kepala, atau terlalu jauh sehingga seluruh tubuh terlihat.
6. spoofReason (string): jika salah satu kriteria gagal, tulis alasan spesifik yang sopan dan jelas dalam Bahasa Indonesia (maksimal 1 kalimat). Jika semua lolos, isi string kosong "".
7. summary (string): ringkasan singkat hasil pemeriksaan dalam Bahasa Indonesia.

Kembalikan HANYA JSON valid sesuai skema tanpa markdown tambahan.`;

const normalizeMimeType = (rawMime: string): ParsedImageData['mimeType'] => {
  const lower = rawMime.toLowerCase();
  if (lower === 'image/jpg' || lower === 'image/jpeg') return 'image/jpeg';
  if (lower === 'image/png') return 'image/png';
  return 'image/webp';
};

export function hashImageBase64(base64Data: string): string {
  return crypto.createHash('sha256').update(base64Data).digest('hex');
}

export function parseImageDataUrl(photoDataUrl: unknown): ParsedImageData {
  if (typeof photoDataUrl !== 'string' || !photoDataUrl.trim()) {
    throw new FaceVerificationError('Foto tangkapan kamera wajib dikirim untuk verifikasi wajah.', 400);
  }

  const trimmed = photoDataUrl.trim();
  const match = DATA_URL_REGEX.exec(trimmed);
  if (!match) {
    throw new FaceVerificationError('Format foto tidak valid. Gunakan tangkapan kamera JPEG, PNG, atau WEBP.', 400);
  }

  const mimeType = normalizeMimeType(match[1]);
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.byteLength < MIN_IMAGE_BYTES) {
    throw new FaceVerificationError('Gambar terlalu kecil atau rusak. Silakan ambil foto ulang.', 400);
  }
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new FaceVerificationError('Ukuran foto melebihi batas maksimal 2,5 MB.', 413);
  }

  return {
    mimeType,
    base64Data,
    byteLength: buffer.byteLength,
    imageSha256: hashImageBase64(base64Data)
  };
}

export function evaluateHumanVerificationAnalysis(
  analysis: HumanPhotoAnalysis,
  imageSha256: string
): HumanPhotoVerificationResult {
  const isHuman = Boolean(analysis.isHuman);
  const isLivePhoto = Boolean(analysis.isLivePhoto);
  const faceCount = Number.isFinite(Number(analysis.faceCount)) ? Math.max(0, Math.trunc(Number(analysis.faceCount))) : 0;
  const faceClear = Boolean(analysis.faceClear);
  const isHalfBody = Boolean(analysis.isHalfBody);
  const detail = typeof analysis.spoofReason === 'string' ? analysis.spoofReason.trim() : '';

  let reason = '';
  if (!isHuman) {
    reason =
      detail ||
      'Foto tidak menampilkan manusia asli. Pastikan Anda berada langsung di depan kamera (bukan benda, kartun, boneka, atau hewan).';
  } else if (!isLivePhoto) {
    reason =
      detail ||
      'Terdeteksi foto dari layar atau media cetak. Ambil foto wajah Anda secara langsung menggunakan kamera.';
  } else if (faceCount === 0) {
    reason =
      detail ||
      'Wajah manusia tidak terlihat di dalam foto. Posisikan wajah Anda menghadap kamera di dalam bingkai.';
  } else if (faceCount > 1) {
    reason =
      detail ||
      `Terdeteksi ${faceCount} wajah di dalam frame. Pastikan hanya Anda sendiri yang berada di depan kamera.`;
  } else if (!faceClear) {
    reason =
      detail ||
      'Wajah kurang jelas (terlalu gelap, buram, atau tertutup masker/kacamata hitam). Perbaiki pencahayaan lalu ambil foto ulang.';
  } else if (!isHalfBody) {
    reason =
      detail ||
      'Foto harus setengah badan: pastikan kepala, kedua bahu, dan area dada terlihat utuh di dalam bingkai (bukan hanya wajah/close-up).';
  } else {
    reason = analysis.summary?.trim() || 'Terverifikasi manusia asli dengan foto setengah badan (1 wajah jelas).';
  }

  return {
    approved: isHuman && isLivePhoto && faceCount === 1 && faceClear && isHalfBody,
    isHuman,
    isLivePhoto,
    faceCount,
    faceClear,
    isHalfBody,
    reason,
    imageSha256,
    verifiedAt: new Date().toISOString()
  };
}

function parseJsonResponseText(rawText: string | undefined): HumanPhotoAnalysis {
  if (!rawText || !rawText.trim()) {
    throw new FaceVerificationError('Layanan AI tidak mengembalikan hasil verifikasi foto.', 502);
  }
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  }
  try {
    return JSON.parse(cleaned) as HumanPhotoAnalysis;
  } catch {
    throw new FaceVerificationError('Format respons verifikasi AI tidak valid. Silakan coba ambil foto ulang.', 502);
  }
}

async function createDefaultVisionClient(): Promise<VisionModelClient> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new FaceVerificationError(
      'Layanan AI verifikasi wajah belum dikonfigurasi di server (GEMINI_API_KEY tidak tersedia).',
      503
    );
  }
  const { GoogleGenAI } = await import('@google/genai');
  return new GoogleGenAI({ apiKey }) as unknown as VisionModelClient;
}

export async function verifyHumanFacePhoto(
  photoDataUrl: unknown,
  deps?: { aiClient?: VisionModelClient; modelOverride?: string }
): Promise<HumanPhotoVerificationResult> {
  const parsedImage = parseImageDataUrl(photoDataUrl);
  const aiClient = deps?.aiClient ?? (await createDefaultVisionClient());

  let candidateModels: string[] = [];
  if (deps?.modelOverride) {
    candidateModels = [deps.modelOverride];
  } else {
    const aiConfig = await getAiConfig().catch(() => null);
    const configured = aiConfig?.cvScreeningModel || 'gemini-2.5-flash';
    candidateModels = Array.from(new Set([configured, 'gemini-2.5-flash', 'gemini-flash-lite-latest']));
  }

  let response: VisionContentResponse | null = null;
  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      response = await aiClient.models.generateContent({
        model,
        contents: [
          {
            inlineData: {
              data: parsedImage.base64Data,
              mimeType: parsedImage.mimeType
            }
          },
          HUMAN_VERIFICATION_PROMPT
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              isHuman: { type: 'boolean' },
              isLivePhoto: { type: 'boolean' },
              faceCount: { type: 'integer' },
              faceClear: { type: 'boolean' },
              isHalfBody: { type: 'boolean' },
              spoofReason: { type: 'string' },
              summary: { type: 'string' }
            },
            required: ['isHuman', 'isLivePhoto', 'faceCount', 'faceClear', 'isHalfBody', 'spoofReason', 'summary']
          }
        }
      });
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!response) {
    const message = lastError instanceof Error ? lastError.message : 'Koneksi AI gagal';
    console.error('Human face AI verification error:', message);
    throw new FaceVerificationError(
      'Gagal menghubungi layanan AI verifikasi wajah. Silakan coba beberapa saat lagi.',
      503
    );
  }

  const analysis = parseJsonResponseText(response.text);
  return evaluateHumanVerificationAnalysis(analysis, parsedImage.imageSha256);
}

export function createFaceVerificationToken(userId: string, imageSha256: string): string {
  return jwt.sign(
    {
      purpose: 'portal-face-verified',
      sub: userId,
      imageSha256
    },
    getJwtSecret(),
    { expiresIn: TOKEN_TTL }
  );
}

export function verifyFaceVerificationToken(
  token: unknown,
  expectedUserId: string,
  photoDataUrl?: unknown
): boolean {
  if (typeof token !== 'string' || !token.trim()) return false;
  try {
    const payload = jwt.verify(token.trim(), getJwtSecret()) as {
      purpose?: string;
      sub?: string;
      imageSha256?: string;
    };
    if (payload?.purpose !== 'portal-face-verified') return false;
    if (payload?.sub !== expectedUserId) return false;
    if (!payload?.imageSha256) return false;

    if (photoDataUrl !== undefined) {
      const parsed = parseImageDataUrl(photoDataUrl);
      if (payload.imageSha256 !== parsed.imageSha256) return false;
    }
    return true;
  } catch {
    return false;
  }
}
