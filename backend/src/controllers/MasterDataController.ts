import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';
import { recordAuditLog } from '../services/auditService';
import { invalidateAiConfigCache } from '../services/aiConfigService';

const prisma = new PrismaClient();

const parseValue = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const getMasterScope = async (req: AuthRequest, res: Response) => {
  try {
    const scope = String(req.params.scope);
    const records = await prisma.masterRecord.findMany({ where: { scope } });
    const data: Record<string, unknown> = {};
    for (const record of records) {
      data[record.key] = parseValue(record.value);
    }
    return res.json({ data });
  } catch (error) {
    console.error('Get master scope error:', error);
    return res.status(500).json({ error: 'Gagal memuat data master.' });
  }
};

export const putMasterRecord = async (req: AuthRequest, res: Response) => {
  try {
    const scope = String(req.params.scope);
    const key = String(req.params.key);
    const value = JSON.stringify(req.body.value ?? null);
    const record = await prisma.masterRecord.upsert({
      where: { scope_key: { scope, key } },
      update: { value },
      create: { scope, key, value }
    });
    if (scope === 'ai-config') invalidateAiConfigCache();
    recordAuditLog({
      actor: req.user?.username || 'admin',
      action: 'MASTER_DATA_UPDATE',
      category: 'DATA_MUTATION',
      ip: req.ip || '127.0.0.1',
      target: `${scope}/${key}`,
      details: `Data master ${scope}/${key} diperbarui.`,
      status: 'SUCCESS'
    });
    return res.json({ data: { key: record.key, value: parseValue(record.value) } });
  } catch (error) {
    console.error('Put master record error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan data master.' });
  }
};

export const deleteMasterRecord = async (req: AuthRequest, res: Response) => {
  try {
    const scope = String(req.params.scope);
    const key = String(req.params.key);
    await prisma.masterRecord.deleteMany({ where: { scope, key } });
    if (scope === 'ai-config') invalidateAiConfigCache();
    recordAuditLog({
      actor: req.user?.username || 'admin',
      action: 'MASTER_DATA_DELETE',
      category: 'DATA_MUTATION',
      ip: req.ip || '127.0.0.1',
      target: `${scope}/${key}`,
      details: `Data master ${scope}/${key} dihapus.`,
      status: 'SUCCESS'
    });
    return res.json({ message: 'Data master berhasil dihapus.' });
  } catch (error) {
    console.error('Delete master record error:', error);
    return res.status(500).json({ error: 'Gagal menghapus data master.' });
  }
};