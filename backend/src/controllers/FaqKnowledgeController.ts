import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import { type AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const FAQ_UPLOAD_DIR = path.join(__dirname, '../../uploads/faq-knowledge');

const ensureFaqUploadDir = () => {
  if (!fs.existsSync(FAQ_UPLOAD_DIR)) fs.mkdirSync(FAQ_UPLOAD_DIR, { recursive: true });
};

export interface FaqChunkItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  sourceFile: string;
  tenantKey: string;
  createdAt: string;
}

export interface FaqDocumentMeta {
  id: string;
  fileName: string;
  tenantKey: string;
  companyName: string;
  chunkCount: number;
  mcpSyncStatus: 'synced_local' | 'synced_mcp';
  uploadedBy: string;
  uploadedAt: string;
}

export interface FaqKnowledgeStore {
  tenantKey: string;
  companyName: string;
  documents: FaqDocumentMeta[];
  chunks: FaqChunkItem[];
  updatedAt: string;
}

export interface HelpdeskMessageItem {
  id: string;
  senderRole: 'peserta' | 'admin' | 'bot';
  senderName: string;
  text: string;
  createdAt: string;
}

export interface HelpdeskTicket {
  id: string;
  ticketCode: string;
  tenantKey: string;
  companyName: string;
  programCode: string;
  candidateName: string;
  candidateEmail: string;
  candidateCode: string;
  subject: string;
  source: 'chatbot-faq' | 'exam-player' | 'portal';
  status: 'open' | 'in_progress' | 'resolved';
  messages: HelpdeskMessageItem[];
  createdAt: string;
  updatedAt: string;
}

const normalizeKey = (raw: string): string =>
  String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '-')
    .replace(/^-|-$/g, '') || 'DEFAULT';

const DEFAULT_FAQ_CHUNKS: FaqChunkItem[] = [
  {
    id: 'default-faq-1',
    question: 'Bagaimana aturan kamera web dan larangan Virtual Background?',
    answer:
      'Kamera web wajib aktif sepanjang ujian dan wawancara. Dilarang keras menggunakan Virtual Background, filter kamera, atau green screen buatan. Sistem proctoring AI memerlukan latar belakang ruangan asli dan pencahayaan yang cukup untuk memvalidasi integritas pengawasan Anda.',
    category: 'Perangkat & Kamera',
    keywords: ['kamera', 'webcam', 'virtual background', 'filter', 'green screen', 'pencahayaan'],
    sourceFile: 'FAQ_Standar_Platform_RIGHT.docx',
    tenantKey: 'DEFAULT',
    createdAt: new Date('2026-11-01T00:00:00Z').toISOString()
  },
  {
    id: 'default-faq-2',
    question: 'Apa saja aturan anti-kecurangan (Proctoring AI)?',
    answer:
      'Sistem AI mendeteksi anomali secara waktu-nyata: perpindahan jendela/tab peramban (maksimal toleransi 3x peringatan), deteksi wajah ganda atau tidak ada wajah di frame, serta suara pihak ketiga. Setiap pelanggaran dicatat otomatis ke dalam audit trail asesor.',
    category: 'Proctoring & Integritas',
    keywords: ['proctoring', 'curang', 'kecurangan', 'tab', 'pindah tab', 'wajah', 'pelanggaran', 'peringatan'],
    sourceFile: 'FAQ_Standar_Platform_RIGHT.docx',
    tenantKey: 'DEFAULT',
    createdAt: new Date('2026-11-01T00:00:00Z').toISOString()
  },
  {
    id: 'default-faq-3',
    question: 'Bagaimana mengetahui giliran masuk wawancara (Live Interview)?',
    answer:
      'Setelah ujian teknis selesai, Anda akan masuk ke Ruang Tunggu (Waiting Room). Di sana tertera nomor urut antrean Anda dan estimasi waktu tunggu. Ketika asesor memanggil nomor Anda, banner notifikasi dan nada panggil akan muncul otomatis di layar.',
    category: 'Wawancara',
    keywords: ['wawancara', 'interview', 'antrean', 'ruang tunggu', 'waiting room', 'giliran', 'asesor'],
    sourceFile: 'FAQ_Standar_Platform_RIGHT.docx',
    tenantKey: 'DEFAULT',
    createdAt: new Date('2026-11-01T00:00:00Z').toISOString()
  },
  {
    id: 'default-faq-4',
    question: 'Kapan Laporan Hasil Asesmen (LHA) dapat diunduh?',
    answer:
      'LHA resmi diterbitkan setelah Dewan Asesor menyelesaikan rekap nilai komposit (CAT + Interview) dan mempublikasikan hasil. Anda dapat melihat status dan mengunduh berkas LHA di menu Hasil Nilai & LHA pada portal peserta.',
    category: 'Hasil & LHA',
    keywords: ['lha', 'laporan', 'hasil', 'nilai', 'unduh', 'download', 'pdf', 'skor'],
    sourceFile: 'FAQ_Standar_Platform_RIGHT.docx',
    tenantKey: 'DEFAULT',
    createdAt: new Date('2026-11-01T00:00:00Z').toISOString()
  },
  {
    id: 'default-faq-5',
    question: 'Apa yang harus dilakukan jika sambungan internet terputus saat ujian?',
    answer:
      'Jawaban Anda disimpan otomatis (autosave) ke server secara berkala. Jika jaringan terputus, pastikan koneksi kembali stabil lalu muat ulang (refresh) halaman peramban Anda. Anda akan langsung kembali ke soal terakhir tanpa kehilangan progres jawaban.',
    category: 'Kendala Teknis',
    keywords: ['internet', 'putus', 'koneksi', 'jaringan', 'offline', 'refresh', 'autosave', 'hilang'],
    sourceFile: 'FAQ_Standar_Platform_RIGHT.docx',
    tenantKey: 'DEFAULT',
    createdAt: new Date('2026-11-01T00:00:00Z').toISOString()
  },
  {
    id: 'default-faq-6',
    question: 'Bagaimana jika saya lupa kata sandi atau mengalami kendala login / token ujian?',
    answer:
      'Pastikan Anda menggunakan email undangan resmi dan kode/token program sesuai instruksi panitia. Jika masih gagal masuk atau token tidak valid, segera hubungi Helpdesk Internal melalui tombol Hubungkan ke Helpdesk di chatbot ini.',
    category: 'Akun & Login',
    keywords: ['login', 'password', 'kata sandi', 'lupa', 'token', 'kode', 'akun', 'email'],
    sourceFile: 'FAQ_Standar_Platform_RIGHT.docx',
    tenantKey: 'DEFAULT',
    createdAt: new Date('2026-11-01T00:00:00Z').toISOString()
  }
];

const STOPWORDS_ID = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan', 'adalah', 'ini', 'itu',
  'atau', 'jika', 'bila', 'kalau', 'apa', 'apakah', 'bagaimana', 'kapan', 'dimana', 'siapa',
  'saya', 'aku', 'kami', 'kita', 'anda', 'kamu', 'tidak', 'bukan', 'ya', 'sudah', 'belum',
  'bisa', 'dapat', 'harus', 'wajib', 'mau', 'ingin', 'tolong', 'mohon', 'tentang', 'soal',
  'the', 'is', 'are', 'how', 'what', 'when', 'where', 'can', 'to', 'in', 'of', 'for', 'a'
]);

const tokenize = (text: string): string[] => {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS_ID.has(t));
};

const extractKeywords = (question: string, answer: string): string[] => {
  const counts = new Map<string, number>();
  for (const tok of [...tokenize(question), ...tokenize(question), ...tokenize(answer)]) {
    counts.set(tok, (counts.get(tok) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k]) => k);
};

export const parseFaqTextToChunks = (
  rawText: string,
  sourceFile: string,
  tenantKey: string
): FaqChunkItem[] => {
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const chunks: FaqChunkItem[] = [];
  let currentCategory = 'Umum';
  let currentQuestion = '';
  let currentAnswerLines: string[] = [];

  const flushCurrent = () => {
    if (currentQuestion && currentAnswerLines.length > 0) {
      const answer = currentAnswerLines.join(' ').trim();
      chunks.push({
        id: `faq-${crypto.randomUUID().slice(0, 8)}`,
        question: currentQuestion.trim(),
        answer,
        category: currentCategory,
        keywords: extractKeywords(currentQuestion, answer),
        sourceFile,
        tenantKey,
        createdAt: new Date().toISOString()
      });
    }
    currentQuestion = '';
    currentAnswerLines = [];
  };

  for (const line of lines) {
    const catMatch = line.match(/^(?:\[?Kategori\]?|Category)\s*[:\-]\s*(.+)$/i);
    if (catMatch) {
      flushCurrent();
      currentCategory = catMatch[1].trim();
      continue;
    }

    const qMatch = line.match(/^(?:Q\d*|Tanya|Pertanyaan|Question)\s*[:\.\-]\s*(.+)$/i);
    if (qMatch) {
      flushCurrent();
      currentQuestion = qMatch[1].trim();
      continue;
    }

    const aMatch = line.match(/^(?:A\d*|Jawab|Jawaban|Answer)\s*[:\.\-]\s*(.+)$/i);
    if (aMatch) {
      if (currentQuestion) {
        currentAnswerLines.push(aMatch[1].trim());
      }
      continue;
    }

    // Also support numbered/question-mark headings if no explicit Q: prefix
    if (!currentQuestion && (line.endsWith('?') || /^\d+[\.\)]\s+.+\?$/.test(line))) {
      currentQuestion = line.replace(/^\d+[\.\)]\s+/, '').trim();
      continue;
    }

    if (currentQuestion) {
      if (line.endsWith('?') && currentAnswerLines.length > 0) {
        flushCurrent();
        currentQuestion = line.replace(/^\d+[\.\)]\s+/, '').trim();
      } else {
        currentAnswerLines.push(line);
      }
    }
  }
  flushCurrent();

  // Fallback: if document has plain paragraphs without Q/A format, chunk by paragraphs
  if (chunks.length === 0 && lines.length > 0) {
    for (let i = 0; i < lines.length; i += 2) {
      const title = lines[i];
      const body = lines[i + 1] || lines[i];
      if (title.length < 4) continue;
      chunks.push({
        id: `faq-${crypto.randomUUID().slice(0, 8)}`,
        question: title,
        answer: body,
        category: 'Dokumen FAQ',
        keywords: extractKeywords(title, body),
        sourceFile,
        tenantKey,
        createdAt: new Date().toISOString()
      });
    }
  }

  return chunks;
};

const getStoreForKey = async (tenantKey: string): Promise<FaqKnowledgeStore> => {
  const norm = normalizeKey(tenantKey);
  const rec = await prisma.masterRecord.findUnique({
    where: { scope_key: { scope: 'faq-knowledge', key: norm } }
  });
  if (rec) {
    try {
      const parsed = JSON.parse(rec.value) as Partial<FaqKnowledgeStore>;
      return {
        tenantKey: norm,
        companyName: parsed.companyName || (norm === 'DEFAULT' ? 'Platform RIGHT (Global)' : norm),
        documents: Array.isArray(parsed.documents) ? parsed.documents : [],
        chunks: Array.isArray(parsed.chunks) ? parsed.chunks : [],
        updatedAt: parsed.updatedAt || rec.updatedAt.toISOString()
      };
    } catch {
      // fall through
    }
  }
  return {
    tenantKey: norm,
    companyName: norm === 'DEFAULT' ? 'Platform RIGHT (Global)' : norm,
    documents: [],
    chunks: norm === 'DEFAULT' ? [...DEFAULT_FAQ_CHUNKS] : [],
    updatedAt: new Date().toISOString()
  };
};

const saveStoreForKey = async (store: FaqKnowledgeStore): Promise<FaqKnowledgeStore> => {
  const updated: FaqKnowledgeStore = {
    ...store,
    updatedAt: new Date().toISOString()
  };
  await prisma.masterRecord.upsert({
    where: { scope_key: { scope: 'faq-knowledge', key: store.tenantKey } },
    create: {
      scope: 'faq-knowledge',
      key: store.tenantKey,
      value: JSON.stringify(updated)
    },
    update: {
      value: JSON.stringify(updated)
    }
  });
  return updated;
};

const syncToProksisMcpKnowledge = async (
  store: FaqKnowledgeStore,
  newChunks: FaqChunkItem[],
  fileName: string
): Promise<'synced_local' | 'synced_mcp'> => {
  const mcpUrl = process.env.PROKSIS_MCP_KNOWLEDGE_URL;
  if (!mcpUrl) return 'synced_local';
  try {
    const resp = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.PROKSIS_MCP_KNOWLEDGE_KEY
          ? { Authorization: `Bearer ${process.env.PROKSIS_MCP_KNOWLEDGE_KEY}` }
          : {})
      },
      body: JSON.stringify({
        tenantKey: store.tenantKey,
        companyName: store.companyName,
        sourceFile: fileName,
        chunks: newChunks
      })
    });
    return resp.ok ? 'synced_mcp' : 'synced_local';
  } catch {
    return 'synced_local';
  }
};

export const retrieveGroundedFaq = async (
  query: string,
  tenantHints: Array<string | null | undefined>
): Promise<{
  matched: boolean;
  confidence: number;
  bestChunk: FaqChunkItem | null;
  relatedChunks: FaqChunkItem[];
}> => {
  const allChunks: FaqChunkItem[] = [];
  const seenKeys = new Set<string>();

  for (const hint of tenantHints) {
    if (!hint) continue;
    const key = normalizeKey(hint);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    const store = await getStoreForKey(key);
    allChunks.push(...store.chunks);
  }
  if (!seenKeys.has('DEFAULT')) {
    const defStore = await getStoreForKey('DEFAULT');
    allChunks.push(...defStore.chunks);
  }

  const queryLower = query.toLowerCase().trim();
  const qTokens = tokenize(queryLower);

  if (qTokens.length === 0 && queryLower.length < 3) {
    return { matched: false, confidence: 0, bestChunk: null, relatedChunks: [] };
  }

  const scored = allChunks
    .map((chunk) => {
      const targetQuestion = chunk.question.toLowerCase();
      const targetAnswer = chunk.answer.toLowerCase();
      const targetKeywords = chunk.keywords.map((k) => k.toLowerCase());

      let hitScore = 0;
      let matchedTokenCount = 0;

      for (const tok of qTokens) {
        let matchedThis = false;
        if (targetQuestion.includes(tok)) {
          hitScore += 2.2;
          matchedThis = true;
        }
        if (targetKeywords.some((k) => k.includes(tok) || tok.includes(k))) {
          hitScore += 1.6;
          matchedThis = true;
        }
        if (targetAnswer.includes(tok)) {
          hitScore += 0.9;
          matchedThis = true;
        }
        if (matchedThis) matchedTokenCount++;
      }

      // Exact/substring phrase boost
      if (queryLower.length >= 6 && (targetQuestion.includes(queryLower) || targetAnswer.includes(queryLower))) {
        hitScore += 3.5;
      }

      const denom = Math.max(qTokens.length * 2.4, 2.4);
      const coverage = qTokens.length > 0 ? matchedTokenCount / qTokens.length : 0;
      const normalized = Math.min(1, (hitScore / denom) * 0.7 + coverage * 0.3);

      return { chunk, score: normalized };
    })
    .filter((item) => item.score > 0.05)
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const matched = Boolean(best && best.score >= 0.22);

  return {
    matched,
    confidence: best ? Number(best.score.toFixed(2)) : 0,
    bestChunk: matched ? best.chunk : null,
    relatedChunks: scored.slice(matched ? 1 : 0, 4).map((s) => s.chunk)
  };
};

// ─── ADMIN KNOWLEDGE BASE CONTROLLERS ───────────────────────────────────────

export const downloadFaqWordTemplate = async (_req: AuthRequest, res: Response) => {
  try {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'TEMPLATE KONTEN FAQ KNOWLEDGE BASE (RAG)',
              heading: HeadingLevel.HEADING_1
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Panduan Pengisian: Gunakan format "Kategori:", "Q:", dan "A:" agar sistem RAG memetakan pertanyaan dan jawaban secara akurat.',
                  italics: true
                })
              ]
            }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'Kategori: Perangkat & Kamera' }),
            new Paragraph({ text: 'Q: Bagaimana aturan kamera web dan larangan Virtual Background?' }),
            new Paragraph({
              text: 'A: Kamera web wajib aktif sepanjang ujian dan wawancara. Dilarang keras menggunakan Virtual Background, filter kamera, atau green screen buatan.'
            }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'Kategori: Proctoring & Integritas' }),
            new Paragraph({ text: 'Q: Apa saja aturan anti-kecurangan (Proctoring AI)?' }),
            new Paragraph({
              text: 'A: Sistem mendeteksi perpindahan tab peramban (maksimal 3x peringatan), deteksi wajah ganda atau tanpa wajah, dan suara pihak ketiga.'
            }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'Kategori: Wawancara' }),
            new Paragraph({ text: 'Q: Bagaimana mengetahui giliran masuk wawancara?' }),
            new Paragraph({
              text: 'A: Setelah ujian selesai, masuk ke Ruang Tunggu (Waiting Room) untuk melihat nomor antrean. Notifikasi dan nada panggil akan berbunyi saat asesor memanggil Anda.'
            }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'Kategori: Hasil & LHA' }),
            new Paragraph({ text: 'Q: Kapan Laporan Hasil Asesmen (LHA) dapat diunduh?' }),
            new Paragraph({
              text: 'A: LHA resmi dapat diunduh pada menu Hasil Nilai & LHA setelah Dewan Asesor menyelesaikan penilaian dan mempublikasikan laporan.'
            })
          ]
        }
      ]
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="Template_FAQ_Knowledge_RIGHT.docx"');
    return res.send(buffer);
  } catch (err) {
    console.error('downloadFaqWordTemplate error:', err);
    return res.status(500).json({ error: 'Gagal membuat template Word FAQ.' });
  }
};

export const getFaqKnowledge = async (req: AuthRequest, res: Response) => {
  try {
    const requestedKey = String(req.query.companyKey || 'DEFAULT');
    const normKey = normalizeKey(requestedKey);
    const store = await getStoreForKey(normKey);
    return res.json(store);
  } catch (err) {
    console.error('getFaqKnowledge error:', err);
    return res.status(500).json({ error: 'Gagal mengambil basis pengetahuan FAQ.' });
  }
};

export const uploadFaqKnowledgeFile = async (req: AuthRequest, res: Response) => {
  try {
    const file = (req as unknown as { file?: Express.Multer.File }).file;
    if (!file) {
      return res.status(400).json({ error: 'File Word (.docx) atau teks (.txt/.md) wajib diunggah.' });
    }

    const companyKey = normalizeKey(String(req.body.companyKey || 'DEFAULT'));
    const companyName = String(req.body.companyName || (companyKey === 'DEFAULT' ? 'Platform RIGHT (Global)' : companyKey));
    const ext = path.extname(file.originalname).toLowerCase();

    if (!['.docx', '.txt', '.md'].includes(ext)) {
      return res.status(400).json({ error: 'Format file harus .docx, .txt, atau .md.' });
    }

    let rawText = '';
    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      rawText = result.value || '';
    } else {
      rawText = file.buffer.toString('utf-8');
    }

    const parsedChunks = parseFaqTextToChunks(rawText, file.originalname, companyKey);
    if (parsedChunks.length === 0) {
      return res.status(400).json({
        error: 'Tidak ditemukan pasangan Tanya/Jawab (Q:/A:) yang valid di dalam dokumen.'
      });
    }

    ensureFaqUploadDir();
    const savedName = `${companyKey}_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    fs.writeFileSync(path.join(FAQ_UPLOAD_DIR, savedName), file.buffer);

    const store = await getStoreForKey(companyKey);
    const mcpSyncStatus = await syncToProksisMcpKnowledge(store, parsedChunks, file.originalname);

    const docMeta: FaqDocumentMeta = {
      id: `doc-${crypto.randomUUID().slice(0, 8)}`,
      fileName: file.originalname,
      tenantKey: companyKey,
      companyName,
      chunkCount: parsedChunks.length,
      mcpSyncStatus,
      uploadedBy: req.user?.username || 'Admin',
      uploadedAt: new Date().toISOString()
    };

    const replaceExisting = String(req.body.replaceExisting || 'false') === 'true';
    const nextChunks = replaceExisting ? parsedChunks : [...parsedChunks, ...store.chunks];

    const updated = await saveStoreForKey({
      tenantKey: companyKey,
      companyName,
      documents: [docMeta, ...store.documents],
      chunks: nextChunks,
      updatedAt: new Date().toISOString()
    });

    return res.json({
      message: `${parsedChunks.length} konten FAQ berhasil diekstrak dari ${file.originalname} dan diindeks ke Sistem RAG.`,
      document: docMeta,
      store: updated
    });
  } catch (err) {
    console.error('uploadFaqKnowledgeFile error:', err);
    return res.status(500).json({ error: 'Gagal memproses file FAQ Word.' });
  }
};

export const addFaqKnowledgeItem = async (req: AuthRequest, res: Response) => {
  try {
    const companyKey = normalizeKey(String(req.body.companyKey || 'DEFAULT'));
    const companyName = String(req.body.companyName || (companyKey === 'DEFAULT' ? 'Platform RIGHT (Global)' : companyKey));
    const question = String(req.body.question || '').trim();
    const answer = String(req.body.answer || '').trim();
    const category = String(req.body.category || 'Umum').trim();

    if (!question || !answer) {
      return res.status(400).json({ error: 'Pertanyaan dan jawaban FAQ wajib diisi.' });
    }

    const store = await getStoreForKey(companyKey);
    const newItem: FaqChunkItem = {
      id: `faq-${crypto.randomUUID().slice(0, 8)}`,
      question,
      answer,
      category,
      keywords: extractKeywords(question, answer),
      sourceFile: 'Input Manual Admin',
      tenantKey: companyKey,
      createdAt: new Date().toISOString()
    };

    await syncToProksisMcpKnowledge(store, [newItem], 'Input Manual Admin');
    const updated = await saveStoreForKey({
      ...store,
      companyName,
      chunks: [newItem, ...store.chunks]
    });

    return res.json({ item: newItem, store: updated });
  } catch (err) {
    console.error('addFaqKnowledgeItem error:', err);
    return res.status(500).json({ error: 'Gagal menambahkan item FAQ.' });
  }
};

export const deleteFaqKnowledgeItem = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id || '');
    const companyKey = normalizeKey(String(req.query.companyKey || 'DEFAULT'));
    const store = await getStoreForKey(companyKey);
    const updated = await saveStoreForKey({
      ...store,
      chunks: store.chunks.filter((c) => c.id !== id)
    });
    return res.json({ store: updated });
  } catch (err) {
    console.error('deleteFaqKnowledgeItem error:', err);
    return res.status(500).json({ error: 'Gagal menghapus item FAQ.' });
  }
};

export const testFaqRagSearch = async (req: AuthRequest, res: Response) => {
  try {
    const query = String(req.body.query || '').trim();
    const companyKey = String(req.body.companyKey || 'DEFAULT');
    if (!query) return res.status(400).json({ error: 'Pertanyaan uji wajib diisi.' });

    const result = await retrieveGroundedFaq(query, [companyKey, 'DEFAULT']);
    return res.json(result);
  } catch (err) {
    console.error('testFaqRagSearch error:', err);
    return res.status(500).json({ error: 'Gagal menguji pencarian RAG FAQ.' });
  }
};

// ─── CANDIDATE CHATBOT FAQ (NON-FREE-AI GROUNDED RAG) ───────────────────────

export const listPesertaFaqItems = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    let companyKey = 'DEFAULT';
    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant) companyKey = normalizeKey(tenant.name);
    }

    const defStore = await getStoreForKey('DEFAULT');
    const tenantStore = companyKey !== 'DEFAULT' ? await getStoreForKey(companyKey) : null;
    const items = [...(tenantStore?.chunks || []), ...defStore.chunks];

    return res.json({ items });
  } catch (err) {
    console.error('listPesertaFaqItems error:', err);
    return res.status(500).json({ error: 'Gagal memuat daftar FAQ.' });
  }
};

export const askPesertaFaqChatbot = async (req: AuthRequest, res: Response) => {
  try {
    const message = String(req.body.message || '').trim();
    if (!message) {
      return res.status(400).json({ error: 'Pertanyaan tidak boleh kosong.' });
    }

    const hints: Array<string | null | undefined> = [];
    if (req.body.companyName) hints.push(String(req.body.companyName));
    if (req.user?.tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
      if (tenant) hints.push(tenant.name, tenant.id);
    }
    hints.push('DEFAULT');

    const rag = await retrieveGroundedFaq(message, hints);

    if (rag.matched && rag.bestChunk) {
      return res.json({
        matched: true,
        confidence: rag.confidence,
        reply: rag.bestChunk.answer,
        matchedQuestion: rag.bestChunk.question,
        category: rag.bestChunk.category,
        sourceFile: rag.bestChunk.sourceFile,
        relatedQuestions: rag.relatedChunks.map((c) => c.question),
        canEscalate: true
      });
    }

    return res.json({
      matched: false,
      confidence: rag.confidence,
      reply:
        'Maaf, pertanyaan Anda belum tercakup di Basis Pengetahuan FAQ resmi kami. Chatbot ini hanya menjawab berdasarkan dokumen FAQ terverifikasi. Silakan klik tombol "Hubungkan ke Helpdesk Internal" agar tim Pengawas/Admin dapat membantu Anda langsung.',
      matchedQuestion: null,
      category: null,
      sourceFile: null,
      relatedQuestions: rag.relatedChunks.map((c) => c.question),
      canEscalate: true
    });
  } catch (err) {
    console.error('askPesertaFaqChatbot error:', err);
    return res.status(500).json({ error: 'Gagal memproses pertanyaan Chatbot FAQ.' });
  }
};

// ─── HELPDESK INTERNAL TICKETS ──────────────────────────────────────────────

const loadAllTickets = async (): Promise<HelpdeskTicket[]> => {
  const records = await prisma.masterRecord.findMany({
    where: { scope: 'helpdesk-tickets' },
    orderBy: { updatedAt: 'desc' }
  });
  const tickets: HelpdeskTicket[] = [];
  for (const r of records) {
    try {
      tickets.push(JSON.parse(r.value) as HelpdeskTicket);
    } catch {
      // skip malformed
    }
  }
  return tickets;
};

const saveTicket = async (ticket: HelpdeskTicket): Promise<HelpdeskTicket> => {
  const updated = { ...ticket, updatedAt: new Date().toISOString() };
  await prisma.masterRecord.upsert({
    where: { scope_key: { scope: 'helpdesk-tickets', key: ticket.id } },
    create: {
      scope: 'helpdesk-tickets',
      key: ticket.id,
      value: JSON.stringify(updated)
    },
    update: {
      value: JSON.stringify(updated)
    }
  });
  return updated;
};

export const createHelpdeskTicket = async (req: AuthRequest, res: Response) => {
  try {
    const subject = String(req.body.subject || req.body.message || '').trim();
    const message = String(req.body.message || subject).trim();
    if (!message) {
      return res.status(400).json({ error: 'Pesan untuk Helpdesk Internal wajib diisi.' });
    }

    let companyName = String(req.body.companyName || '').trim();
    let tenantKey = companyName ? normalizeKey(companyName) : 'DEFAULT';
    let candidateName = String(req.body.candidateName || req.user?.username || 'Kandidat').trim();
    let candidateEmail = String(req.body.candidateEmail || req.user?.username || '').trim();

    if (req.user?.id) {
      const portalUser = await prisma.portalUser.findUnique({
        where: { id: req.user.id },
        include: { tenant: true }
      });
      if (portalUser) {
        candidateName = portalUser.name || candidateName;
        candidateEmail = portalUser.email || candidateEmail;
        if (portalUser.tenant) {
          companyName = portalUser.tenant.name;
          tenantKey = normalizeKey(portalUser.tenant.name);
        } else if (portalUser.companyName) {
          companyName = portalUser.companyName;
          tenantKey = normalizeKey(portalUser.companyName);
        }
      }
    }

    const id = `tkt-${crypto.randomUUID().slice(0, 8)}`;
    const ticketCode = `HD-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${id.slice(-4).toUpperCase()}`;
    const now = new Date().toISOString();

    const ticket: HelpdeskTicket = {
      id,
      ticketCode,
      tenantKey,
      companyName: companyName || 'Umum',
      programCode: String(req.body.programCode || '-'),
      candidateName,
      candidateEmail,
      candidateCode: String(req.body.candidateCode || req.user?.username || '-'),
      subject: subject.slice(0, 120),
      source: (req.body.source as HelpdeskTicket['source']) || 'chatbot-faq',
      status: 'open',
      messages: [
        {
          id: `msg-${crypto.randomUUID().slice(0, 8)}`,
          senderRole: 'peserta',
          senderName: candidateName,
          text: message,
          createdAt: now
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    const saved = await saveTicket(ticket);
    return res.status(201).json({ ticket: saved });
  } catch (err) {
    console.error('createHelpdeskTicket error:', err);
    return res.status(500).json({ error: 'Gagal membuat tiket Helpdesk Internal.' });
  }
};

export const listPesertaHelpdeskTickets = async (req: AuthRequest, res: Response) => {
  try {
    const email = (req.user?.username || '').toLowerCase();
    const all = await loadAllTickets();
    const mine = all.filter(
      (t) =>
        t.candidateEmail.toLowerCase() === email ||
        t.candidateCode.toLowerCase() === email
    );
    return res.json({ tickets: mine });
  } catch (err) {
    console.error('listPesertaHelpdeskTickets error:', err);
    return res.status(500).json({ error: 'Gagal memuat tiket Helpdesk.' });
  }
};

export const replyPesertaHelpdeskTicket = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id || '');
    const text = String(req.body.message || '').trim();
    if (!text) return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });

    const rec = await prisma.masterRecord.findUnique({
      where: { scope_key: { scope: 'helpdesk-tickets', key: id } }
    });
    if (!rec) return res.status(404).json({ error: 'Tiket tidak ditemukan.' });

    const ticket = JSON.parse(rec.value) as HelpdeskTicket;
    ticket.messages.push({
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      senderRole: 'peserta',
      senderName: ticket.candidateName,
      text,
      createdAt: new Date().toISOString()
    });
    if (ticket.status === 'resolved') ticket.status = 'open';

    const saved = await saveTicket(ticket);
    return res.json({ ticket: saved });
  } catch (err) {
    console.error('replyPesertaHelpdeskTicket error:', err);
    return res.status(500).json({ error: 'Gagal mengirim balasan tiket.' });
  }
};

export const listAdminHelpdeskTickets = async (req: AuthRequest, res: Response) => {
  try {
    const all = await loadAllTickets();
    const role = (req.user?.role || '').toLowerCase();
    if (role === 'superadmin') {
      return res.json({ tickets: all });
    }

    // Tenant admin scoping
    let allowedCompany = '';
    if (req.user?.tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
      if (tenant) allowedCompany = normalizeKey(tenant.name);
    }
    const filtered = allowedCompany
      ? all.filter((t) => t.tenantKey === allowedCompany || t.tenantKey === 'DEFAULT')
      : all;
    return res.json({ tickets: filtered });
  } catch (err) {
    console.error('listAdminHelpdeskTickets error:', err);
    return res.status(500).json({ error: 'Gagal memuat daftar tiket Helpdesk Internal.' });
  }
};

export const replyAdminHelpdeskTicket = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id || '');
    const text = String(req.body.message || '').trim();
    if (!text) return res.status(400).json({ error: 'Balasan tidak boleh kosong.' });

    const rec = await prisma.masterRecord.findUnique({
      where: { scope_key: { scope: 'helpdesk-tickets', key: id } }
    });
    if (!rec) return res.status(404).json({ error: 'Tiket tidak ditemukan.' });

    const ticket = JSON.parse(rec.value) as HelpdeskTicket;
    ticket.messages.push({
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      senderRole: 'admin',
      senderName: req.user?.username || 'Helpdesk Admin',
      text,
      createdAt: new Date().toISOString()
    });
    if (req.body.status && ['open', 'in_progress', 'resolved'].includes(req.body.status)) {
      ticket.status = req.body.status;
    } else if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    const saved = await saveTicket(ticket);
    return res.json({ ticket: saved });
  } catch (err) {
    console.error('replyAdminHelpdeskTicket error:', err);
    return res.status(500).json({ error: 'Gagal mengirim balasan Helpdesk.' });
  }
};

export const updateHelpdeskTicketStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id || '');
    const status = String(req.body.status || '');
    if (!['open', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Status tiket tidak valid.' });
    }

    const rec = await prisma.masterRecord.findUnique({
      where: { scope_key: { scope: 'helpdesk-tickets', key: id } }
    });
    if (!rec) return res.status(404).json({ error: 'Tiket tidak ditemukan.' });

    const ticket = JSON.parse(rec.value) as HelpdeskTicket;
    ticket.status = status as HelpdeskTicket['status'];
    const saved = await saveTicket(ticket);
    return res.json({ ticket: saved });
  } catch (err) {
    console.error('updateHelpdeskTicketStatus error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui status tiket.' });
  }
};
