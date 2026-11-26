import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';
import { normalizeCompanyName, resolveAdminTenantId } from '../middleware/tenant';

const prisma = new PrismaClient();

const buildUniqueTenantCode = async (rawName: string, preferredCode?: string): Promise<string> => {
  const baseCode = (
    preferredCode?.trim() ||
    rawName
      .replace(/^PT\.?\s+/i, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 16) ||
    'TENANT'
  ).toUpperCase();
  const exists = await prisma.tenant.findUnique({ where: { code: baseCode }, select: { id: true } });
  return exists ? `${baseCode}-${Date.now().toString().slice(-4)}` : baseCode;
};

const syncMasterCompaniesToTenants = async () => {
  try {
    const matrixRec = await prisma.masterRecord.findUnique({
      where: { scope_key: { scope: 'company', key: 'matrix' } }
    });
    if (!matrixRec?.value) return;
    const list = JSON.parse(matrixRec.value);
    if (!Array.isArray(list)) return;

    const existing = await prisma.tenant.findMany({ select: { id: true, code: true, name: true } });
    for (const item of list) {
      const name = String(item?.name || '').trim();
      if (!name) continue;
      const norm = normalizeCompanyName(name);
      const matched = existing.find(
        (t) => normalizeCompanyName(t.name) === norm || (item?.id && t.code === String(item.id).toUpperCase())
      );
      if (matched) continue;
      const code = await buildUniqueTenantCode(name, item?.id ? String(item.id) : undefined);
      const created = await prisma.tenant.create({
        data: {
          code,
          name,
          industry: item?.industry ? String(item.industry) : null
        },
        select: { id: true, code: true, name: true }
      });
      existing.push(created);
    }
  } catch (err) {
    console.warn('Sync master companies to tenants skipped:', err);
  }
};

export const listTenants = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'superadmin') {
      await syncMasterCompaniesToTenants();
      const tenants = await prisma.tenant.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, code: true, name: true, industry: true }
      });
      return res.json({ data: tenants });
    }

    const tenantId = resolveAdminTenantId(req);
    const tenants = await prisma.tenant.findMany({
      where: tenantId ? { id: tenantId } : {},
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, industry: true }
    });
    return res.json({ data: tenants });
  } catch (error) {
    console.error('List tenants error:', error);
    return res.status(500).json({ error: 'Gagal memuat daftar tenant.' });
  }
};

export const createOrSyncTenant = async (req: AuthRequest, res: Response) => {
  try {
    const name = String(req.body.name || '').trim();
    const industry = req.body.industry ? String(req.body.industry).trim() : null;
    const preferredCode = req.body.code ? String(req.body.code).trim().toUpperCase() : undefined;
    if (!name || name.length < 2) {
      return res.status(400).json({ error: 'Nama perusahaan/tenant wajib diisi.' });
    }

    const all = await prisma.tenant.findMany();
    const normTarget = normalizeCompanyName(name);
    const existing = all.find(
      (t) =>
        normalizeCompanyName(t.name) === normTarget ||
        (preferredCode && t.code.toUpperCase() === preferredCode)
    );
    if (existing) {
      const updated = await prisma.tenant.update({
        where: { id: existing.id },
        data: {
          ...(industry ? { industry } : {})
        },
        select: { id: true, code: true, name: true, industry: true }
      });
      return res.json({ data: updated });
    }

    const code = await buildUniqueTenantCode(name, preferredCode);
    const created = await prisma.tenant.create({
      data: { code, name, industry },
      select: { id: true, code: true, name: true, industry: true }
    });
    return res.status(201).json({ data: created });
  } catch (error) {
    console.error('Create/sync tenant error:', error);
    return res.status(500).json({ error: 'Gagal menyinkronkan tenant.' });
  }
};
