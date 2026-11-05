import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';
import { resolveAdminTenantId } from '../middleware/tenant';

const prisma = new PrismaClient();

export const listTenants = async (req: AuthRequest, res: Response) => {
  try {
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
