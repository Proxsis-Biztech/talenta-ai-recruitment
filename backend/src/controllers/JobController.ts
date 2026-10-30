import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const jobSchema = z.object({
  title: z.string().min(1, "Judul lowongan wajib diisi"),
  description: z.string().min(1, "Job deskripsi wajib diisi"),
  status: z.enum(["active", "inactive"]).default("active"),
  interviewDuration: z.coerce.number().int().min(1).max(180).optional().nullable(),
  interviewPassingScore: z.coerce.number().int().min(0).max(100).optional().nullable()
});

// Public: Get all active jobs
export const getActiveJobs = async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { status: "active" },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: jobs });
  } catch (error) {
    console.error("Get active jobs error:", error);
    res.status(500).json({ error: "Gagal mengambil data lowongan pekerjaan" });
  }
};

// Admin: Get all jobs
export const getAdminJobs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || "";
    
    const skip = (page - 1) * limit;
    
    const whereClause: any = {
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
export const createJob = async (req: Request, res: Response) => {
  try {
    const validatedData = jobSchema.parse(req.body);
    
    const existingJob = await prisma.job.findUnique({
      where: { title: validatedData.title }
    });
    
    if (existingJob) {
      return res.status(400).json({ error: "Judul lowongan sudah ada" });
    }
    
    const job = await prisma.job.create({
      data: validatedData
    });
    
    res.status(201).json({ message: "Lowongan berhasil dibuat", data: job });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validasi gagal", details: (error as any).errors });
    }
    console.error("Create job error:", error);
    res.status(500).json({ error: "Gagal membuat lowongan baru" });
  }
};

// Admin: Update job
export const updateJob = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const validatedData = jobSchema.parse(req.body);
    
    const existingJob = await prisma.job.findFirst({
      where: { 
        title: validatedData.title,
        NOT: { id }
      }
    });
    
    if (existingJob) {
      return res.status(400).json({ error: "Judul lowongan sudah ada" });
    }
    
    const job = await prisma.job.update({
      where: { id },
      data: validatedData
    });
    
    res.json({ message: "Lowongan berhasil diperbarui", data: job });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validasi gagal", details: (error as any).errors });
    }
    console.error("Update job error:", error);
    res.status(500).json({ error: "Gagal memperbarui lowongan" });
  }
};

// Admin: Delete job
export const deleteJob = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
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
