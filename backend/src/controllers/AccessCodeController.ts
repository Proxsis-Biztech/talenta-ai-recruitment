import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { type AuthRequest } from '../middleware/auth';
import { recordAuditLog } from '../services/auditService';

const prisma = new PrismaClient();

const accessCodeSchema = z.object({
  code: z.string().trim().min(3).max(40).transform((value) => value.toUpperCase()),
  programCode: z.string().trim().min(1),
  maxUses: z.coerce.number().int().min(1).max(1000000).default(1000),
  expiresAt: z.string().datetime().nullable().optional(),
  active: z.boolean().optional().default(true)
});

const serialize = (record: {
  code: string;
  programCode: string;
  maxUses: number;
  uses: number;
  expiresAt: Date | null;
  active: boolean;
  createdAt: Date;
}, programTitle?: string) => ({
  ...record,
  programTitle: programTitle || record.programCode,
  remainingUses: Math.max(0, record.maxUses - record.uses)
});

export const listAccessCodes = async (_req: AuthRequest, res: Response) => {
  try {
    const [codes, jobs] = await Promise.all([
      prisma.programAccessCode.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.job.findMany({ select: { code: true, title: true } })
    ]);
    const titles = new Map(jobs.filter((job) => job.code).map((job) => [job.code as string, job.title]));
    return res.json({ data: codes.map((code) => serialize(code, titles.get(code.programCode))) });
  } catch (error) {
    console.error('List access codes error:', error);
    return res.status(500).json({ error: 'Gagal memuat kode akses.' });
  }
};

export const createAccessCode = async (req: AuthRequest, res: Response) => {
  try {
    const payload = accessCodeSchema.parse(req.body);
    const job = await prisma.job.findFirst({ where: { code: payload.programCode } });
    if (!job) return res.status(400).json({ error: 'Program asesmen tidak ditemukan.' });
    const existing = await prisma.programAccessCode.findUnique({ where: { code: payload.code } });
    if (existing) return res.status(409).json({ error: 'Kode akses sudah digunakan.' });

    const record = await prisma.programAccessCode.create({
      data: {
        code: payload.code,
        programCode: payload.programCode,
        maxUses: payload.maxUses,
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
        active: payload.active
      }
    });
    recordAuditLog({
      actor: req.user?.username || 'admin',
      action: 'ACCESS_CODE_CREATE',
      category: 'DATA_MUTATION',
      ip: req.ip || '127.0.0.1',
      target: payload.code,
      details: `Kode akses untuk ${job.title} dibuat.`,
      status: 'SUCCESS'
    });
    return res.status(201).json({ data: serialize(record, job.title) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || 'Data kode akses tidak valid.' });
    }
    console.error('Create access code error:', error);
    return res.status(500).json({ error: 'Gagal membuat kode akses.' });
  }
};

export const updateAccessCode = async (req: AuthRequest, res: Response) => {
  try {
    const code = String(req.params.code).toUpperCase();
    const existing = await prisma.programAccessCode.findUnique({ where: { code } });
    if (!existing) return res.status(404).json({ error: 'Kode akses tidak ditemukan.' });

    const data: Record<string, unknown> = {};
    if (req.body.maxUses !== undefined) {
      const maxUses = Number(req.body.maxUses);
      if (!Number.isFinite(maxUses)) return res.status(400).json({ error: 'Kuota penggunaan tidak valid.' });
      data.maxUses = Math.max(1, Math.floor(maxUses));
    }
    if (req.body.active !== undefined) data.active = Boolean(req.body.active);
    if (req.body.expiresAt !== undefined) {
      data.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
    }
    if (req.body.programCode) {
      const job = await prisma.job.findFirst({ where: { code: String(req.body.programCode) } });
      if (!job) return res.status(400).json({ error: 'Program asesmen tidak ditemukan.' });
      data.programCode = job.code;
    }

    const record = await prisma.programAccessCode.update({ where: { code }, data });
    recordAuditLog({
      actor: req.user?.username || 'admin',
      action: 'ACCESS_CODE_UPDATE',
      category: 'DATA_MUTATION',
      ip: req.ip || '127.0.0.1',
      target: code,
      details: 'Pengaturan kode akses diperbarui.',
      status: 'SUCCESS'
    });
    return res.json({ data: serialize(record) });
  } catch (error) {
    console.error('Update access code error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui kode akses.' });
  }
};