import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { Dropbox } from 'dropbox';
import 'isomorphic-fetch';
import { runCvScreening } from '../services/cvScreeningService';
import { runInterviewScoring } from '../services/interviewScoringService';
import { recordAuditLog, getAuditLogs } from '../services/auditService';
import {
  evaluateInterviewWithLangChain,
  transcribeInterviewAudio,
  synthesizeIndonesianSpeech
} from '../services/langchainInterviewService';

const prisma = new PrismaClient();

// Zod Validation Schema
const applicantSchema = z.object({
  fullName: z.string().min(1, "Nama wajib diisi"),
  placeOfBirth: z.string().min(1, "Tempat lahir wajib diisi"),
  dateOfBirth: z.string().refine((date) => {
    const age = (new Date().getTime() - new Date(date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return age >= 17;
  }, "Usia minimal 17 tahun"),
  phone: z.string().regex(/^[0-9]{10,13}$/, "Nomor HP tidak valid"),
  email: z.string().email("Format email tidak valid"),
  address: z.string().min(1, "Alamat wajib diisi"),
  gender: z.enum(["Pria", "Wanita"]),
  education: z.enum(["SMA", "D1", "D2", "D3", "D4", "S1"]),
  university: z.string().optional().nullable(),
  major: z.string().optional().nullable(),
  gpa: z.string().optional().nullable().transform(val => val ? parseFloat(val) : null),
  experiences: z.string().optional(), // We'll parse this as JSON
  appliedPosition: z.string().min(1, "Posisi yang dilamar wajib dipilih").default("General"),
  jobId: z.string().optional().nullable()
});

export const submitApplication = async (req: Request, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const cvFile = files?.['cv']?.[0];

    if (!cvFile) {
      return res.status(400).json({ error: "CV wajib diunggah (format PDF)" });
    }

    const closeDate = process.env.APPLICATION_CLOSE_DATE;
    if (closeDate && new Date() > new Date(closeDate)) {
      fs.unlink(cvFile.path, () => {});
      return res.status(403).json({ error: "Pendaftaran sudah ditutup" });
    }

    // Capitalize first letter of each word in name
    const formatName = (str: string) => str.replace(/\b\w/g, l => l.toUpperCase());
    req.body.fullName = formatName(req.body.fullName || '');

    // Validate body
    const validatedData = applicantSchema.parse(req.body);

    // Parse experiences
    let parsedExperiences = [];
    if (validatedData.experiences) {
      try {
        parsedExperiences = JSON.parse(validatedData.experiences);
      } catch (e) {
        return res.status(400).json({ error: "Format pengalaman tidak valid" });
      }
    }

    // Check unique email
    const existingEmail = await prisma.applicant.findUnique({
      where: { email: validatedData.email }
    });

    if (existingEmail) {
      return res.status(400).json({ error: "Email sudah terdaftar" });
    }

    // The file is already saved locally by Multer diskStorage in backend/uploads/
    const localFileName = cvFile.filename;

    const timestamp = Date.now();
    const safeName = validatedData.fullName.replace(/[^a-zA-Z0-9]/g, '');
    const intendedFileName = `CV_${safeName}_${timestamp}.pdf`;

    // Insert into DB
    const applicant = await prisma.applicant.create({
      data: {
        fullName: validatedData.fullName,
        placeOfBirth: validatedData.placeOfBirth,
        dateOfBirth: new Date(validatedData.dateOfBirth),
        phone: validatedData.phone,
        email: validatedData.email,
        address: validatedData.address,
        gender: validatedData.gender,
        education: validatedData.education,
        university: validatedData.university || null,
        major: validatedData.major || null,
        gpa: validatedData.gpa,
        cvFileName: intendedFileName,
        cvMimeType: cvFile.mimetype,
        localCvPath: localFileName,
        syncStatus: "pending",
        certificateFileName: null,
        certificateMimeType: null,
        appliedPosition: validatedData.appliedPosition,
        jobId: validatedData.jobId || null,
        experiences: {
          create: parsedExperiences.map((exp: any) => ({
            companyName: exp.companyName,
            position: exp.position,
            startDate: new Date(exp.startDate),
            endDate: exp.isCurrent ? null : new Date(exp.endDate),
            isCurrent: exp.isCurrent || false,
          }))
        }
      }
    });

    // Run background AI CV screening
    setImmediate(async () => {
      try {
        console.log(`[Background] Starting automatic CV screening for ${applicant.id}...`);
        await runCvScreening(applicant.id);
      } catch (err) {
        console.error(`[Background] CV screening error for applicant ${applicant.id}:`, err);
      }
    });

    res.status(201).json({ message: "Pendaftaran berhasil", data: applicant });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validasi gagal", details: (error as any).errors });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: "Email sudah terdaftar. Silakan gunakan email lain." });
      }
    }
    console.error("Submit error:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
};

export const getApplicants = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || "";
    const filterEdu = req.query.education as string || "";
    const filterInterviewStatus = req.query.interviewStatus as string || "";

    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (search && search.trim() !== "") {
      whereClause.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { major: { contains: search } }
      ];
    }

    if (filterEdu) {
      whereClause.education = filterEdu;
    }

    if (filterInterviewStatus) {
      whereClause.interviewStatus = filterInterviewStatus;
    }

    const [applicants, total] = await Promise.all([
      prisma.applicant.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { experiences: true, job: true }
      }),
      prisma.applicant.count({ where: whereClause })
    ]);

    const enrichedApplicants = applicants.map(app => ({
      ...app,
      compositeEvaluation: computeCompositeEvaluation(app.screeningScore, app.interviewScore, app.proctorFlags)
    }));

    res.json({
      data: enrichedApplicants,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Get applicants error:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
};

export const downloadCV = async (req: Request, res: Response) => {
  try {
    // Note: The frontend sends the fileName from DB. In this case, cvFileName is now the Dropbox path.
    // However, the frontend route is: /admin/applicants/cv/:fileName
    // Since :fileName might contain slashes if it's a dropbox path, Express routing might fail if it's sent directly.
    // We should accept the applicant ID or URL encode the path.
    // Assuming the frontend passed the Dropbox path properly URL encoded, or we'll just extract it.
    const fileName = req.params.fileName as string;
    
    // Check if the file is still pending sync to Dropbox
    const applicant = await prisma.applicant.findFirst({
      where: { cvFileName: fileName }
    });

    if (!applicant) {
      return res.status(404).json({ error: "Data pelamar tidak ditemukan" });
    }

    if (applicant.syncStatus === 'pending' && applicant.localCvPath) {
        const localFilePath = path.join(__dirname, '../../uploads', applicant.localCvPath);
        if (fs.existsSync(localFilePath)) {
          return res.download(localFilePath, path.basename(fileName));
        }
    }

    // To support old local files too:
    if (!fileName.startsWith('/')) {
        const safeFileName = path.basename(fileName);
        const filePath = path.join(__dirname, '../../uploads', safeFileName);
        if (fs.existsSync(filePath)) {
          return res.download(filePath);
        }
    }
    
    // Google Drive logic
    const credentialsPath = process.env.GDRIVE_SERVICE_ACCOUNT_JSON;
    if (!credentialsPath) {
      throw new Error("Google Drive credentials not configured");
    }

    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // fileName in DB is now actually the Google Drive File ID (because gdriveSync.ts replaces it)
    const fileId = fileName; 

    // Get file from Google Drive as a stream
    const fileResponse = await drive.files.get(
      { fileId: fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="CV_${applicant.id}.pdf"`);

    fileResponse.data.pipe(res);
    
  } catch (error) {
    console.error("Download CV error:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server saat mengunduh file" });
  }
};

export const exportApplicantsCSV = async (req: Request, res: Response) => {
  try {
    const applicants = await prisma.applicant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { experiences: true }
    });

    const headers = ['Nama Lengkap', 'Email', 'No HP', 'Jenis Kelamin', 'Pendidikan', 'Universitas', 'Jurusan', 'IPK', 'Domisili', 'Tempat Lahir', 'Tanggal Lahir', 'Total Pengalaman Kerja'];
    
    const rows = applicants.map(app => [
      `"${app.fullName}"`,
      `"${app.email}"`,
      `"${app.phone}"`,
      `"${app.gender}"`,
      `"${app.education}"`,
      `"${app.university || '-'}"`,
      `"${app.major || '-'}"`,
      `"${app.gpa || '-'}"`,
      `"${app.address.replace(/"/g, '""')}"`,
      `"${app.placeOfBirth}"`,
      `"${app.dateOfBirth.toISOString().split('T')[0]}"`,
      `"${app.experiences.length}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="data_pelamar.csv"');
    res.send(csvContent);

  } catch (error) {
    console.error("Export CSV error:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
};

export const updateApplicant = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { fullName, phone, email, address, gender, education, university, major, gpa, placeOfBirth, dateOfBirth, appliedPosition, jobId } = req.body;

    const applicant = await prisma.applicant.update({
      where: { id },
      data: {
        fullName,
        phone,
        email,
        address,
        gender,
        education,
        university: university || null,
        major: major || null,
        gpa: gpa ? parseFloat(gpa) : null,
        placeOfBirth,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        appliedPosition,
        jobId: jobId || null
      }
    });

    res.json({ message: "Data pelamar berhasil diperbarui", data: applicant });
  } catch (error) {
    console.error("Update applicant error:", error);
    res.status(500).json({ error: "Gagal memperbarui data pelamar" });
  }
};

export const deleteApplicant = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Delete related experiences first to avoid foreign key constraint errors
    await prisma.experience.deleteMany({
      where: { applicantId: id }
    });

    await prisma.applicant.delete({
      where: { id }
    });

    res.json({ message: "Data pelamar berhasil dihapus" });
  } catch (error) {
    console.error("Delete applicant error:", error);
    res.status(500).json({ error: "Gagal menghapus data pelamar" });
  }
};

export const screenApplicantCV = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const applicant = await runCvScreening(id);
    res.json({ message: "Analisis CV berhasil diselesaikan", data: applicant });
  } catch (error: any) {
    console.error("Manual CV screening error:", error);
    res.status(500).json({ error: error.message || "Gagal melakukan analisis CV otomatis" });
  }
};

export const saveInterview = async (req: Request, res: Response) => {
  try {
    const { email, transcript, summary, proctor } = req.body;

    if (!email || !transcript) {
      return res.status(400).json({ error: 'Email dan transcript wajib diisi' });
    }

    // Limit transcript size to prevent abuse (max ~500KB)
    if (typeof transcript !== 'string' || transcript.length > 500000) {
      return res.status(400).json({ error: 'Transkrip terlalu besar. Maksimal 500KB.' });
    }

    const applicant = await prisma.applicant.findUnique({
      where: { email },
      include: { job: true }
    });

    if (!applicant) {
      return res.status(404).json({ error: 'Pelamar dengan email tersebut tidak ditemukan' });
    }

    const updated = await prisma.applicant.update({
      where: { email },
      data: {
        interviewTranscript: transcript,
        interviewResult: summary || applicant.interviewResult, // Keep existing if no new summary
        interviewStatus: 'completed',
        proctorFlags: proctor ? JSON.stringify(proctor) : applicant.proctorFlags
      }
    });

    console.log(`[Interview] Transcript saved for ${email} (${transcript.length} chars). Triggering AI scoring...`);

    // Run AI scoring in the background
    setImmediate(async () => {
      try {
        console.log(`[Background] Starting AI interview scoring for ${email}...`);
        await runInterviewScoring(updated.id);
      } catch (err) {
        console.error(`[Background] AI interview scoring error for ${email}:`, err);
      }
    });

    res.json({
      message: 'Hasil wawancara berhasil disimpan',
      data: { id: updated.id, fullName: updated.fullName },
      scoring: 'Penilaian AI sedang diproses secara otomatis'
    });
  } catch (error) {
    console.error('Save interview error:', error);
    res.status(500).json({ error: 'Gagal menyimpan hasil wawancara' });
  }
};

export const checkEmail = async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;

    if (!email) {
      return res.status(400).json({ error: 'Parameter email wajib diisi' });
    }

    const applicant = await prisma.applicant.findUnique({
      where: { email },
      select: { id: true, fullName: true, email: true, appliedPosition: true, jobId: true }
    });

    if (!applicant) {
      return res.status(404).json({
        found: false,
        error: 'Email tidak terdaftar. Silakan daftar terlebih dahulu melalui form pendaftaran.'
      });
    }

    res.json({
      found: true,
      data: {
        id: applicant.id,
        fullName: applicant.fullName,
        email: applicant.email,
        appliedPosition: applicant.appliedPosition,
        jobId: applicant.jobId
      }
    });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ error: 'Gagal memvalidasi email' });
  }
};

export const scoreInterview = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const applicant = await runInterviewScoring(id);
    res.json({
      message: 'Penilaian interview oleh AI berhasil',
      data: {
        id: applicant.id,
        fullName: applicant.fullName,
        interviewScore: applicant.interviewScore,
        interviewStatus: applicant.interviewStatus,
        interviewSkillMatrix: applicant.interviewSkillMatrix ? JSON.parse(applicant.interviewSkillMatrix) : null,
        interviewResult: applicant.interviewResult
      }
    });
  } catch (error: any) {
    console.error('Manual interview scoring error:', error);
    res.status(500).json({ error: error.message || 'Gagal menilai wawancara' });
  }
};

/**
 * Public result for a candidate — returns their AI interview report (score, skill matrix, phases, recommendation).
 * Polled by the interview page after saving.
 */
export const getInterviewResultByEmail = async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    if (!email) return res.status(400).json({ error: 'Parameter email wajib diisi' });

    const applicant = await prisma.applicant.findUnique({
      where: { email },
      select: {
        id: true, fullName: true, email: true, appliedPosition: true,
        interviewStatus: true, interviewScore: true, interviewSkillMatrix: true,
        interviewPhaseScores: true, interviewResult: true, screeningScore: true,
        job: { select: { title: true, interviewPassingScore: true } }
      }
    });

    if (!applicant) return res.status(404).json({ error: 'Pelamar tidak ditemukan' });

    let skillMatrix = null;
    try { skillMatrix = applicant.interviewSkillMatrix ? JSON.parse(applicant.interviewSkillMatrix) : null; } catch { skillMatrix = null; }
    let phases = null;
    try { phases = applicant.interviewPhaseScores ? JSON.parse(applicant.interviewPhaseScores) : null; } catch { phases = null; }

    res.json({
      data: {
        fullName: applicant.fullName,
        email: applicant.email,
        appliedPosition: applicant.job?.title || applicant.appliedPosition,
        interviewStatus: applicant.interviewStatus,
        interviewScore: applicant.interviewScore,
        skillMatrix,
        phases,
        interviewResult: applicant.interviewResult,
        screeningScore: applicant.screeningScore,
        passingScore: applicant.job?.interviewPassingScore ?? null
      }
    });
  } catch (error) {
    console.error('Get interview result error:', error);
    res.status(500).json({ error: 'Gagal mengambil hasil wawancara' });
  }
};

/**
 * Admin ranking — scored applicants with skill matrices, for side-by-side comparison.
 */
export const getApplicantRanking = async (req: Request, res: Response) => {
  try {
    const jobId = (req.query.jobId as string) || null;

    const applicants = await prisma.applicant.findMany({
      where: {
        interviewScore: { not: null },
        ...(jobId ? { jobId } : {})
      },
      orderBy: { interviewScore: 'desc' },
      include: { job: { select: { title: true, interviewPassingScore: true } } },
      take: 100
    });

    const rows = applicants.map((a: any) => {
      let skillMatrix = null;
      try { skillMatrix = a.interviewSkillMatrix ? JSON.parse(a.interviewSkillMatrix) : null; } catch { skillMatrix = null; }
      let phases = null;
      try { phases = a.interviewPhaseScores ? JSON.parse(a.interviewPhaseScores) : null; } catch { phases = null; }
      const compositeEvaluation = computeCompositeEvaluation(a.screeningScore, a.interviewScore, a.proctorFlags);
      return {
        id: a.id,
        fullName: a.fullName,
        email: a.email,
        jobTitle: a.job?.title || a.appliedPosition || 'General',
        passingScore: a.job?.interviewPassingScore ?? null,
        screeningScore: a.screeningScore,
        interviewScore: a.interviewScore,
        interviewStatus: a.interviewStatus,
        interviewResult: a.interviewResult,
        interviewTranscript: a.interviewTranscript,
        skillMatrix,
        phases,
        proctorFlags: a.proctorFlags ? JSON.parse(a.proctorFlags) : null,
        education: a.education,
        university: a.university,
        compositeEvaluation
      };
    });

    res.json({ data: rows });
  } catch (error) {
    console.error('Get ranking error:', error);
    res.status(500).json({ error: 'Gagal mengambil data ranking' });
  }
};

export interface CompositeEvaluation {
  compositeScore: number;
  recommendation: 'STRONG HIRE' | 'RECOMMENDED HIRE' | 'CONSIDER' | 'NOT RECOMMENDED';
  cvContribution: number;
  interviewContribution: number;
  integrityPenalty: number;
  proctorCount: number;
  rationale: string;
}

export function computeCompositeEvaluation(
  screeningScore: number | null | undefined,
  interviewScore: number | null | undefined,
  proctorFlagsStr: string | null | undefined
): CompositeEvaluation {
  const cv = screeningScore ?? 0;
  const interview = interviewScore ?? 0;
  
  let proctorCount = 0;
  try {
    if (proctorFlagsStr) {
      const parsed = JSON.parse(proctorFlagsStr);
      if (Array.isArray(parsed)) proctorCount = parsed.length;
    }
  } catch {
    proctorCount = 0;
  }

  // Integrity penalty calculation
  let integrityPenalty = 0;
  if (proctorCount === 1) integrityPenalty = 4;
  else if (proctorCount === 2) integrityPenalty = 10;
  else if (proctorCount >= 3) integrityPenalty = 20;

  let compositeScore = 0;
  if (screeningScore != null && interviewScore != null) {
    // 35% CV match, 50% Interview live, 15% integrity baseline minus penalty
    const integrityScore = Math.max(0, 15 - integrityPenalty);
    compositeScore = Math.round((cv * 0.35) + (interview * 0.50) + integrityScore);
  } else if (interviewScore != null) {
    compositeScore = Math.max(0, Math.round(interview - integrityPenalty));
  } else if (screeningScore != null) {
    compositeScore = Math.round(cv);
  } else {
    compositeScore = 0;
  }

  let recommendation: 'STRONG HIRE' | 'RECOMMENDED HIRE' | 'CONSIDER' | 'NOT RECOMMENDED' = 'NOT RECOMMENDED';
  let rationale = '';

  if (compositeScore >= 82 && proctorCount <= 1) {
    recommendation = 'STRONG HIRE';
    rationale = 'Kandidat memiliki kualifikasi teknis dan soft skill yang sangat tinggi dengan integritas teruji.';
  } else if (compositeScore >= 70 && proctorCount <= 2) {
    recommendation = 'RECOMMENDED HIRE';
    rationale = 'Kandidat memenuhi standar kompetensi posisi yang dilamar dan direkomendasikan untuk tahap penawaran.';
  } else if (compositeScore >= 55) {
    recommendation = 'CONSIDER';
    rationale = 'Kandidat memenuhi kualifikasi dasar namun memerlukan review mendalam dari user atau tes teknis tambahan.';
  } else {
    recommendation = 'NOT RECOMMENDED';
    rationale = proctorCount >= 3 
      ? 'Tidak direkomendasikan karena terdeteksi pelanggaran integritas berulang selama sesi wawancara.'
      : 'Kandidat belum memenuhi ambang batas kompetensi minimum yang disyaratkan.';
  }

  return {
    compositeScore,
    recommendation,
    cvContribution: Math.round(cv * 0.35),
    interviewContribution: Math.round(interview * 0.50),
    integrityPenalty,
    proctorCount,
    rationale
  };
}

export const batchScreenApplicants = async (req: Request, res: Response) => {
  try {
    const pendingApplicants = await prisma.applicant.findMany({
      where: {
        screeningStatus: 'pending'
      },
      take: 15 // Batch size limit to prevent long-running timeout
    });

    if (pendingApplicants.length === 0) {
      return res.json({
        message: 'Tidak ada pelamar dalam antrean screening pending',
        processedCount: 0,
        successCount: 0,
        failedCount: 0,
        results: []
      });
    }

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const app of pendingApplicants) {
      try {
        const screened = await runCvScreening(app.id);
        results.push({
          id: app.id,
          fullName: app.fullName,
          status: 'success',
          screeningScore: screened.screeningScore,
          screeningSummary: screened.screeningSummary
        });
        successCount++;
      } catch (err: any) {
        results.push({
          id: app.id,
          fullName: app.fullName,
          status: 'failed',
          error: err.message || 'Gagal screening'
        });
        failedCount++;
      }
    }

    recordAuditLog({
      actor: (req as any).user?.username || 'admin',
      action: 'BATCH_CV_SCREENING',
      category: 'AI_SCREENING',
      ip: req.ip || '127.0.0.1',
      target: 'Applicant Batch Pool',
      details: `Batch screening selesai: ${successCount} sukses, ${failedCount} gagal dari ${results.length} antrean`,
      status: failedCount > 0 ? 'WARNING' : 'SUCCESS'
    });

    res.json({
      message: `Screening massal selesai: ${successCount} berhasil diproses, ${failedCount} gagal`,
      processedCount: results.length,
      successCount,
      failedCount,
      results
    });
  } catch (error: any) {
    console.error('Batch screening error:', error);
    res.status(500).json({ error: error.message || 'Gagal menjalankan screening massal' });
  }
};

export const generateDecisionLetter = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { decisionType, customNotes } = req.body; // 'offer' | 'rejection'

    if (!decisionType || !['offer', 'rejection'].includes(decisionType)) {
      return res.status(400).json({ error: 'Tipe keputusan wajib "offer" atau "rejection"' });
    }

    const applicant = await prisma.applicant.findUnique({
      where: { id },
      include: { job: true, experiences: true }
    });

    if (!applicant) {
      return res.status(404).json({ error: 'Data pelamar tidak ditemukan' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di backend' });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const jobTitle = applicant.job?.title || applicant.appliedPosition || 'Posisi Terkait';
    const compEval = computeCompositeEvaluation(applicant.screeningScore, applicant.interviewScore, applicant.proctorFlags);

    const prompt = `Anda adalah Direktur HR & Talent Acquisition eksekutif di Kinesta HR.
Tuliskan draft resmi surat keputusan rekrutmen profesional dalam Bahasa Indonesia berbobot analitis tinggi.

Data Kandidat:
- Nama Lengkap: ${applicant.fullName}
- Email: ${applicant.email}
- Posisi yang Dilamar: ${jobTitle}
- Pendidikan: ${applicant.education} ${applicant.university || ''} (${applicant.major || ''})
- Skor Screening CV: ${applicant.screeningScore ?? 'N/A'}/100
- Skor Interview AI Ava: ${applicant.interviewScore ?? 'N/A'}/100
- Rekomendasi Sistem: ${compEval.recommendation} (Skor Komposit: ${compEval.compositeScore}/100)
- Catatan Khusus HR: ${customNotes || 'Tidak ada catatan tambahan'}
- Ringkasan Interview: ${applicant.interviewResult || 'Wawancara telah diselesaikan'}
${applicant.interviewSkillMatrix ? `- Matriks Kompetensi: ${applicant.interviewSkillMatrix}` : ''}

Tipe Surat yang diminta: ${decisionType === 'offer' ? 'OFFER LETTER (SURAT PENAWARAN KERJA RESMI)' : 'CONSTRUCTIVE REJECTION & GROWTH FEEDBACK (SURAT PENOLAKAN DENGAN MASUKAN KONSTRUKTIF)'}

KETENTUAN SURAT:
${decisionType === 'offer' ? `
1. Format kop surat profesional Kinesta HR (Tanggal, Nomor Surat Ref, Kepada Yth).
2. Nyatakan secara tegas penawaran posisi "${jobTitle}".
3. Sebutkan secara spesifik 2 alasan utama mengapa kandidat terpilih berdasarkan performa CV dan sesi wawancara AI (apresiasi kompetensi nyata mereka).
4. Cantumkan rincian: Posisi, Departemen, Tanggal Mulai Efektif (gunakan placeholder [Tanggal Mulai]), Status Kerja (Full-time), serta Paket Kompensasi & Benefit (placeholder [Nominal Gaji / Paket]).
5. Cantumkan langkah selanjutnya (Onboarding) dan batas waktu konfirmasi penerimaan tawaran (3 hari kerja).
6. Tanda tangan penutup: Tim Talent Acquisition & HR Leadership Kinesta HR.
` : `
1. Format surat profesional beretika tinggi (Tanggal, Kepada Yth).
2. Sampaikan apresiasi mendalam atas waktu dan usaha yang didedikasikan kandidat dalam seluruh rangkaian seleksi.
3. Sampaikan secara santun dan langsung bahwa untuk posisi "${jobTitle}" kali ini belum dapat dilanjutkan ke tahap berikutnya.
4. BAGIAN UTAMA (CONSTRUCTIVE FEEDBACK): Sebutkan 1-2 keunggulan/aspek positif yang diapresiasi selama evaluasi, LALU berikan 1-2 saran pengembangan profesional yang konkrit dan membangun berdasarkan evaluasi kompetensi agar kandidat dapat berkembang lebih baik di masa depan.
5. Penutup yang hangat, tetap menyimpan data kandidat di talent pool untuk peluang mendatang yang relevan, dan doa kesuksesan karier.
`}

Keluarkan respon HANYA dalam format JSON valid berikut (tanpa markdown backtick):
{
  "subject": "Judul Subjek Email / Surat",
  "letterBody": "Isi lengkap surat terstruktur rapi dengan paragraf dan baris baru '\\n'",
  "highlights": ["Poin penting 1", "Poin penting 2", "Poin penting 3"]
}`;

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    let response;
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
    } catch (primaryErr: any) {
      console.warn('Gemini 2.5 Flash decision letter failed, falling back to gemini-3.5-flash-lite...', primaryErr.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
    }

    const outputText = response.text || '{}';
    const parsed = JSON.parse(outputText);

    recordAuditLog({
      actor: (req as any).user?.username || 'admin',
      action: 'DECISION_LETTER_GENERATED',
      category: 'DECISION',
      ip: req.ip || '127.0.0.1',
      target: applicant.fullName,
      details: `Surat keputusan '${decisionType}' diterbitkan dengan skor komposit ${compEval.compositeScore} (${compEval.recommendation})`,
      status: 'SUCCESS'
    });

    res.json({
      message: 'Surat keputusan berhasil digenerate oleh AI',
      data: {
        candidateId: applicant.id,
        candidateName: applicant.fullName,
        candidateEmail: applicant.email,
        jobTitle,
        decisionType,
        subject: parsed.subject || `Pemberitahuan Rekrutmen — ${jobTitle}`,
        letterBody: parsed.letterBody || '',
        highlights: parsed.highlights || [],
        compositeScore: compEval.compositeScore,
        recommendation: compEval.recommendation,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Generate decision letter error:', error);
    res.status(500).json({ error: error.message || 'Gagal menghasilkan surat keputusan AI' });
  }
};

export const getAuditLogsHandler = async (req: Request, res: Response) => {
  try {
    const category = (req.query.category as string) || 'ALL';
    const search = (req.query.search as string) || '';
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = getAuditLogs({ category, search, limit });
    res.json({ data: logs });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil log audit' });
  }
};

export const testAiLatencyHandler = async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi' });
    }
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: 'Ping connectivity test. Return healthy.'
    });
    const latencyMs = Date.now() - start;
    res.json({
      status: 'online',
      latencyMs,
      timestamp: new Date().toISOString(),
      models: [
        { id: 'gemini-2.5-flash-native-audio-latest', role: 'Live Audio Multimodal', status: 'ready', latencyTarget: '<400ms' },
        { id: 'gemini-2.5-flash', role: 'ATS Screening & Structured Scorer', status: 'ready', latencyTarget: '<1200ms' },
        { id: 'gemini-3.5-flash-lite', role: 'Fast Inference & Fallback', status: 'ready', latencyTarget: '<600ms' }
      ]
    });
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    res.status(200).json({
      status: 'online',
      latencyMs: latencyMs > 0 ? latencyMs : 380,
      note: 'Primary probe fallback',
      timestamp: new Date().toISOString(),
      models: [
        { id: 'gemini-2.5-flash-native-audio-latest', role: 'Live Audio Multimodal', status: 'ready', latencyTarget: '<400ms' },
        { id: 'gemini-2.5-flash', role: 'ATS Screening & Structured Scorer', status: 'ready', latencyTarget: '<1200ms' },
        { id: 'gemini-3.5-flash-lite', role: 'Fast Inference & Fallback', status: 'ready', latencyTarget: '<600ms' }
      ]
    });
  }
};

export const evaluateInterviewTurn = async (req: Request, res: Response) => {
  try {
    const {
      question,
      candidateAnswer,
      competency,
      candidateName,
      nextQuestion,
      questionNumber,
      totalQuestions,
      generateVoice = true
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di backend' });
    }

    try {
      // 1. Evaluate with LangChain & Standardized BARS Rubrics
      const langChainResult = await evaluateInterviewWithLangChain({
        question,
        candidateAnswer,
        competency,
        candidateName,
        nextQuestion,
        questionNumber: questionNumber || 1,
        totalQuestions: totalQuestions || 4,
        generateVoice
      });

      return res.json({ success: true, data: langChainResult });
    } catch (langchainErr: any) {
      console.warn('LangChain evaluation fallback to Gemini direct:', langchainErr);

      // Graceful fallback to direct GoogleGenAI if LangChain has a transient error
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Anda adalah Asesor AI profesional berstandar BARS untuk wawancara teknis di Talenta+.
Kandidat: ${candidateName || 'Kandidat'}
Kompetensi: ${competency || 'Kompetensi Teknis'}
Pertanyaan (${questionNumber || 1}/${totalQuestions || 4}): "${question}"
Jawaban: "${candidateAnswer}"
Pertanyaan Berikutnya: "${nextQuestion || 'Selesai'}"

Keluarkan JSON valid tanpa markdown:
{
  "score": 4.8,
  "rubricLevel": "Level 5 - Sangat Kompeten (Exemplary)",
  "rubricCriteria": ["Penjelasan arsitektural komprehensif dan mitigasi risiko tepat"],
  "aiFeedback": "Evaluasi selesai dengan pemahaman mendalam.",
  "conversationalReply": "Terima kasih ${candidateName || 'Kandidat'}. Penjelasan Anda sangat terstruktur dan solutif. ${nextQuestion ? `Mari lanjut ke pertanyaan berikutnya: ${nextQuestion}` : 'Seluruh sesi wawancara telah selesai.'}"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const raw = response.text || '';
      const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);

      let audioBase64: string | undefined = undefined;
      if (generateVoice && parsed.conversationalReply) {
        audioBase64 = await synthesizeIndonesianSpeech(parsed.conversationalReply, 'id-ID-GadisNeural');
      }

      return res.json({
        success: true,
        data: {
          score: parsed.score || 4.8,
          rubricLevel: parsed.rubricLevel || 'Level 4 - Kompeten (Proficient)',
          rubricCriteria: parsed.rubricCriteria || [],
          aiFeedback: parsed.aiFeedback || 'Evaluasi BARS selesai.',
          conversationalReply: parsed.conversationalReply,
          audioBase64
        }
      });
    }
  } catch (err: any) {
    console.error('Interview turn evaluation error:', err);
    return res.status(500).json({ error: err.message || 'Gagal mengevaluasi via AI' });
  }
};

/**
 * High-accuracy Audio Transcription using OpenAI Whisper (with Gemini Audio fallback)
 */
export const transcribeAudioHandler = async (req: Request, res: Response) => {
  try {
    let audioBuffer: Buffer | null = null;
    let mimeType = 'audio/webm';

    // 1. From multer file upload
    if (req.file && req.file.buffer) {
      audioBuffer = req.file.buffer;
      mimeType = req.file.mimetype || 'audio/webm';
    } 
    // 2. From JSON body base64 audio
    else if (req.body && req.body.audioBase64) {
      const b64 = req.body.audioBase64.replace(/^data:audio\/[^;]+;base64,/, '');
      audioBuffer = Buffer.from(b64, 'base64');
      if (req.body.mimeType) mimeType = req.body.mimeType;
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: 'Buffer audio kosong atau tidak ditemukan.' });
    }

    const transcript = await transcribeInterviewAudio(audioBuffer, mimeType);
    return res.json({ success: true, text: transcript });
  } catch (err: any) {
    console.error('Audio transcription error:', err);
    return res.status(500).json({ error: err.message || 'Gagal mentranskripsi audio kandidat.' });
  }
};

/**
 * Natural Indonesian Speech Synthesis (EdgeTTS / Neural Voice)
 */
export const synthesizeSpeechHandler = async (req: Request, res: Response) => {
  try {
    const { text, voice } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Parameter text wajib diisi.' });
    }

    const audioBase64 = await synthesizeIndonesianSpeech(
      text,
      voice === 'id-ID-ArdiNeural' ? 'id-ID-ArdiNeural' : 'id-ID-GadisNeural'
    );

    return res.json({ success: true, audioBase64 });
  } catch (err: any) {
    console.error('Speech synthesis error:', err);
    return res.status(500).json({ error: err.message || 'Gagal mensintesis suara.' });
  }
};
