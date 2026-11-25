import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  bootstrapDatabaseSeed,
  cleanDoubledCompanyTitle,
  deduplicateJobsInDb,
  normalizeProgramDedupeKey
} from '../services/bootstrapSeedService';
import { type AuthRequest } from '../middleware/auth';
import { resolveAdminTenantId, requireAdminTenantId, UNASSIGNED_TENANT } from '../middleware/tenant';

const prisma = new PrismaClient();

const jobSchema = z.object({
  code: z.string().trim().toUpperCase().optional().nullable(),
  title: z.string().min(1, "Judul lowongan wajib diisi"),
  description: z.string().min(1, "Job deskripsi wajib diisi"),
  status: z.enum(["active", "inactive"]).default("active"),
  interviewDuration: z.coerce.number().int().min(1).max(180).optional().nullable(),
  interviewPassingScore: z.coerce.number().int().min(0).max(100).optional().nullable(),
  assessmentDate: z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return null;
      const date = new Date(String(value));
      return Number.isNaN(date.getTime()) ? null : date;
    },
    z.date().nullable().optional()
  ),
  assessmentEndDate: z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return null;
      const date = new Date(String(value));
      return Number.isNaN(date.getTime()) ? null : date;
    },
    z.date().nullable().optional()
  )
});

const validateDateRange = (start?: Date | null, end?: Date | null): string | null => {
  if (start && end && end.getTime() < start.getTime()) {
    return 'Tanggal selesai asesmen tidak boleh lebih awal dari tanggal mulai.';
  }
  return null;
};

const isPublicTestJob = (job: { code?: string | null; title?: string | null }) => {
  const code = String(job.code || '').trim();
  const title = String(job.title || '').trim();
  return (
    /^(test|uji|qc|uat|dummy|demo|sandbox)(\b|[-_\s])/i.test(code) ||
    /^(test|uji|qc|uat|dummy|demo|sandbox)(\b|[-_\s])/i.test(title) ||
    title.toLowerCase() === 'test'
  );
};

// Public: Get all active jobs
export const getActiveJobs = async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.job.count();
    if (count === 0) {
      await bootstrapDatabaseSeed();
    } else {
      await deduplicateJobsInDb();
    }

    const jobs = await prisma.job.findMany({
      where: { status: "active" },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: jobs.filter((job) => !isPublicTestJob(job)) });
  } catch (error) {
    console.error("Get active jobs error:", error);
    res.status(500).json({ error: "Gagal mengambil data lowongan pekerjaan" });
  }
};

// Admin: Get all jobs
export const getAdminJobs = async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.job.count();
    if (count === 0) {
      await bootstrapDatabaseSeed();
    } else {
      await deduplicateJobsInDb();
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string || "";
    
    const skip = (page - 1) * limit;
    
    const tenantId = resolveAdminTenantId(req);
    const whereClause: any = {
      ...(tenantId === UNASSIGNED_TENANT ? { tenantId: null } : tenantId ? { tenantId } : {}),
      OR: [
        { title: { contains: search } },
        { description: { contains: search } }
      ]
    };
    
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.job.count({ where: whereClause })
    ]);
    
    res.json({
      data: jobs,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get admin jobs error:", error);
    res.status(500).json({ error: "Gagal mengambil data lowongan" });
  }
};

// Admin: Create job
export const createJob = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = jobSchema.parse(req.body);
    const rangeError = validateDateRange(validatedData.assessmentDate, validatedData.assessmentEndDate);
    if (rangeError) return res.status(400).json({ error: rangeError });

    const resolvedTenant = resolveAdminTenantId(req);
    const tenantId =
      resolvedTenant === UNASSIGNED_TENANT
        ? null
        : resolvedTenant || (req.body.tenantId ? String(req.body.tenantId) : null);

    const cleanedTitle = cleanDoubledCompanyTitle(validatedData.title);
    const candidateKey = normalizeProgramDedupeKey(cleanedTitle);
    const sameTenantJobs = await prisma.job.findMany({
      where: { tenantId },
      include: { tenant: { select: { name: true } } }
    });

    const existingJob = sameTenantJobs.find(
      (j) =>
        j.title.toLowerCase() === cleanedTitle.toLowerCase() ||
        normalizeProgramDedupeKey(j.title, j.tenant?.name) === candidateKey
    );

    if (existingJob) {
      return res.status(400).json({ error: "Program atau course yang sama sudah terdaftar (tidak boleh ganda)" });
    }
    if (validatedData.code) {
      const existingCode = await prisma.job.findUnique({ where: { code: validatedData.code } });
      if (existingCode) {
        return res.status(400).json({ error: "Kode program sudah digunakan" });
      }
    }
    
    const job = await prisma.job.create({
      data: {
        ...validatedData,
        title: cleanedTitle,
        tenantId
      }
    });
    
    res.status(201).json({ message: "Lowongan berhasil dibuat", data: job });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      return res.status(400).json({
        error: firstIssue?.message || 'Validasi gagal',
        details: error.issues
      });
    }
    console.error("Create job error:", error);
    res.status(500).json({ error: "Gagal membuat lowongan baru" });
  }
};

// Admin: Update job
export const updateJob = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const validatedData = jobSchema.parse(req.body);
    const rangeError = validateDateRange(validatedData.assessmentDate, validatedData.assessmentEndDate);
    if (rangeError) return res.status(400).json({ error: rangeError });

    const resolvedTenant = resolveAdminTenantId(req);
    const tenantId = resolvedTenant === UNASSIGNED_TENANT ? null : resolvedTenant;

    const cleanedTitle = cleanDoubledCompanyTitle(validatedData.title);
    const candidateKey = normalizeProgramDedupeKey(cleanedTitle);
    const sameTenantJobs = await prisma.job.findMany({
      where: { tenantId, NOT: { id } },
      include: { tenant: { select: { name: true } } }
    });

    const existingJob = sameTenantJobs.find(
      (j) =>
        j.title.toLowerCase() === cleanedTitle.toLowerCase() ||
        normalizeProgramDedupeKey(j.title, j.tenant?.name) === candidateKey
    );
    
    if (existingJob) {
      return res.status(400).json({ error: "Program atau course yang sama sudah terdaftar (tidak boleh ganda)" });
    }
    if (validatedData.code) {
      const existingCode = await prisma.job.findFirst({
        where: { code: validatedData.code, NOT: { id } }
      });
      if (existingCode) {
        return res.status(400).json({ error: "Kode program sudah digunakan" });
      }
    }
    
    if (req.user?.role !== 'superadmin') {
      const owned = await prisma.job.findFirst({ where: { id, tenantId } });
      if (!owned) return res.status(403).json({ error: 'Program bukan milik tenant Anda.' });
    }
    const job = await prisma.job.update({
      where: { id },
      data: {
        ...validatedData,
        title: cleanedTitle
      }
    });
    
    res.json({ message: "Lowongan berhasil diperbarui", data: job });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      return res.status(400).json({
        error: firstIssue?.message || 'Validasi gagal',
        details: error.issues
      });
    }
    console.error("Update job error:", error);
    res.status(500).json({ error: "Gagal memperbarui lowongan" });
  }
};

// Admin: Delete job
export const deleteJob = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (req.user?.role !== 'superadmin') {
      const resolvedTenant = resolveAdminTenantId(req);
      const scopedTenantId = resolvedTenant === UNASSIGNED_TENANT ? null : resolvedTenant;
      const owned = await prisma.job.findFirst({ where: { id, tenantId: scopedTenantId } });
      if (!owned) return res.status(403).json({ error: 'Program bukan milik tenant Anda.' });
    }
    
    // Check if there are applicants linked to this job
    const applicantsCount = await prisma.applicant.count({
      where: { jobId: id }
    });
    
    if (applicantsCount > 0) {
      return res.status(400).json({ error: "Lowongan tidak bisa dihapus karena memiliki pelamar terdaftar" });
    }
    
    await prisma.job.delete({
      where: { id }
    });
    
    res.json({ message: "Lowongan berhasil dihapus" });
  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({ error: "Gagal menghapus lowongan" });
  }
};
