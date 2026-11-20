import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { recordAuditLog } from '../services/auditService';
import { type AuthRequest, getJwtSecret } from '../middleware/auth';
import { buildOtpAuthUrl, generateTotpSecret, verifyTotp } from '../services/totpService';

const prisma = new PrismaClient();

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    const admin = await prisma.admin.findUnique({
      where: { username: String(username).trim() },
    });

    if (!admin) {
      return res.status(401).json({ error: 'Kredensial tidak valid' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Kredensial tidak valid' });
    }

    if (admin.twoFactorEnabled) {
      const code = String(req.body.totp || req.body.code || '').trim();
      if (!code) {
        return res.status(401).json({ error: 'Kode verifikasi dua langkah wajib diisi.', twoFactorRequired: true });
      }
      if (!admin.twoFactorSecret || !verifyTotp(admin.twoFactorSecret, code)) {
        recordAuditLog({
          actor: admin.username,
          action: 'ADMIN_LOGIN_2FA_FAILED',
          category: 'AUTH',
          ip: req.ip || '127.0.0.1',
          target: 'Admin Auth Gate',
          details: 'Kode TOTP tidak valid',
          status: 'FAILED'
        });
        return res.status(401).json({ error: 'Kode verifikasi dua langkah tidak valid.', twoFactorRequired: true });
      }
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role, tenantId: admin.tenantId, type: 'admin' },
      getJwtSecret(),
      { expiresIn: '1d' }
    );

    recordAuditLog({
      actor: admin.username,
      action: 'ADMIN_LOGIN',
      category: 'AUTH',
      ip: req.ip || '127.0.0.1',
      target: 'Admin Auth Gate',
      details: `Login berhasil sebagai role '${admin.role}'`,
      status: 'SUCCESS'
    });

    res.json({ token, username: admin.username, role: admin.role });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Sesi tidak valid' });
    }
    const admin = await prisma.admin.findFirst({
      where: { username: req.user.username },
      select: { id: true, username: true, role: true, tenantId: true, twoFactorEnabled: true, tenant: { select: { id: true, code: true, name: true } }, createdAt: true }
    });
    if (!admin) {
      return res.status(404).json({ error: 'Akun admin tidak ditemukan' });
    }
    return res.json({ data: admin });
  } catch (error) {
    console.error('Get current admin error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

export const getAdmins = async (req: AuthRequest, res: Response) => {
  try {
    const admins = await prisma.admin.findMany({
      select: { id: true, username: true, role: true, tenantId: true, twoFactorEnabled: true, tenant: { select: { id: true, code: true, name: true } }, createdAt: true }
    });
    res.json({ data: admins });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

const resolveOrCreateTenantId = async (input: {
  tenantId?: string | null;
  companyName?: string | null;
  companyCode?: string | null;
}): Promise<string | null> => {
  const rawTenantId = typeof input.tenantId === 'string' ? input.tenantId.trim() : '';
  if (rawTenantId) {
    const found = await prisma.tenant.findUnique({ where: { id: rawTenantId }, select: { id: true } });
    if (found) return found.id;
  }
  const companyName = typeof input.companyName === 'string' ? input.companyName.trim() : '';
  const companyCode = typeof input.companyCode === 'string' ? input.companyCode.trim().toUpperCase() : '';
  if (!companyName && !companyCode) return null;

  const existing = await prisma.tenant.findFirst({
    where: {
      OR: [
        ...(companyName ? [{ name: companyName }] : []),
        ...(companyCode ? [{ code: companyCode }] : [])
      ]
    },
    select: { id: true }
  });
  if (existing) return existing.id;

  const baseCode = (
    companyCode ||
    companyName
      .replace(/^PT\.?\s+/i, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 16) ||
    'TENANT'
  ).toUpperCase();
  const uniqueCode = await prisma.tenant.findUnique({ where: { code: baseCode } })
    ? `${baseCode}-${Date.now().toString().slice(-4)}`
    : baseCode;
  const created = await prisma.tenant.create({
    data: {
      code: uniqueCode,
      name: companyName || baseCode
    },
    select: { id: true }
  });
  return created.id;
};

export const createAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, role, tenantId, companyName, companyCode } = req.body;

    if (!username || !password || password.length < 8) {
      return res.status(400).json({ error: 'Username dan password (min 8 karakter) wajib diisi' });
    }
    if (role && !['admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: 'Role tidak valid.' });
    }

    const existingAdmin = await prisma.admin.findUnique({ where: { username } });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Username sudah digunakan' });
    }

    const resolvedTenantId = await resolveOrCreateTenantId({ tenantId, companyName, companyCode });
    if ((role || 'admin') === 'admin' && !resolvedTenantId) {
      return res.status(400).json({ error: 'Perusahaan (PT) wajib dipilih untuk akun Administrator.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
        role: role || 'admin',
        tenantId: resolvedTenantId
      },
      select: {
        id: true,
        username: true,
        role: true,
        tenantId: true,
        tenant: { select: { id: true, code: true, name: true } },
        createdAt: true
      }
    });

    res.status(201).json({ message: 'Admin berhasil ditambahkan', data: newAdmin });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

export const deleteAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const currentAdminId = (req as any).user?.id; // Set by authenticateToken

    if (id === currentAdminId) {
      return res.status(400).json({ error: 'Tidak dapat menghapus akun Anda sendiri' });
    }

    await prisma.admin.delete({ where: { id } });
    res.json({ message: 'Admin berhasil dihapus' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

export const updateAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { username, password, role, tenantId, companyName, companyCode } = req.body;

    const existing = await prisma.admin.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Admin tidak ditemukan' });
    }

    if (username && username !== existing.username) {
      const duplicate = await prisma.admin.findUnique({ where: { username } });
      if (duplicate) {
        return res.status(400).json({ error: 'Username sudah digunakan' });
      }
    }

    const data: any = {};
    if (username) data.username = username;
    if (password) data.password = await bcrypt.hash(password, 10);
    const nextRole = role || existing.role;
    if (role) {
      const validRoles = ['admin', 'superadmin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Role tidak valid. Hanya "admin" atau "superadmin" yang diizinkan.' });
      }
      data.role = role;
    }

    if (tenantId !== undefined || companyName !== undefined || companyCode !== undefined) {
      const resolvedTenantId = await resolveOrCreateTenantId({ tenantId, companyName, companyCode });
      if (nextRole === 'admin' && !resolvedTenantId) {
        return res.status(400).json({ error: 'Perusahaan (PT) wajib dipilih untuk akun Administrator.' });
      }
      data.tenantId = resolvedTenantId;
    }

    const updated = await prisma.admin.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        role: true,
        tenantId: true,
        tenant: { select: { id: true, code: true, name: true } },
        createdAt: true
      },
    });

    res.json({ message: 'Admin berhasil diperbarui', data: updated });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

export const setupTwoFactor = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Sesi tidak valid' });
    const admin = await prisma.admin.findUnique({ where: { id: req.user.id } });
    if (!admin) return res.status(404).json({ error: 'Akun admin tidak ditemukan' });

    if (admin.twoFactorEnabled) {
      return res.status(409).json({ error: 'Verifikasi dua langkah sudah aktif. Nonaktifkan terlebih dahulu untuk membuat kunci baru.' });
    }

    const secret = admin.twoFactorSecret || generateTotpSecret();
    if (!admin.twoFactorSecret) {
      await prisma.admin.update({ where: { id: admin.id }, data: { twoFactorSecret: secret } });
    }

    return res.json({
      secret,
      otpauthUrl: buildOtpAuthUrl(secret, admin.username),
      enabled: admin.twoFactorEnabled
    });
  } catch (error) {
    console.error('Setup 2FA error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

export const enableTwoFactor = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Sesi tidak valid' });
    const code = String(req.body.code || req.body.totp || '').trim();
    const admin = await prisma.admin.findUnique({ where: { id: req.user.id } });
    if (!admin) return res.status(404).json({ error: 'Akun admin tidak ditemukan' });
    if (!admin.twoFactorSecret) {
      return res.status(400).json({ error: 'Jalankan penyiapan kunci 2FA terlebih dahulu.' });
    }
    if (!verifyTotp(admin.twoFactorSecret, code)) {
      return res.status(400).json({ error: 'Kode verifikasi tidak valid. Pastikan jam perangkat akurat.' });
    }

    await prisma.admin.update({ where: { id: admin.id }, data: { twoFactorEnabled: true } });
    recordAuditLog({
      actor: admin.username,
      action: 'ADMIN_2FA_ENABLED',
      category: 'AUTH',
      ip: req.ip || '127.0.0.1',
      target: 'Admin Auth Gate',
      details: 'Verifikasi dua langkah diaktifkan',
      status: 'SUCCESS'
    });
    return res.json({ message: 'Verifikasi dua langkah berhasil diaktifkan.' });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

export const disableTwoFactor = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Sesi tidak valid' });
    const code = String(req.body.code || req.body.totp || '').trim();
    const password = String(req.body.password || '');
    const admin = await prisma.admin.findUnique({ where: { id: req.user.id } });
    if (!admin) return res.status(404).json({ error: 'Akun admin tidak ditemukan' });

    if (admin.twoFactorEnabled) {
      if (!admin.twoFactorSecret || !verifyTotp(admin.twoFactorSecret, code)) {
        return res.status(400).json({ error: 'Kode verifikasi tidak valid.' });
      }
    }
    if (password && !(await bcrypt.compare(password, admin.password))) {
      return res.status(400).json({ error: 'Kata sandi tidak sesuai.' });
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null }
    });
    recordAuditLog({
      actor: admin.username,
      action: 'ADMIN_2FA_DISABLED',
      category: 'AUTH',
      ip: req.ip || '127.0.0.1',
      target: 'Admin Auth Gate',
      details: 'Verifikasi dua langkah dinonaktifkan',
      status: 'SUCCESS'
    });
    return res.json({ message: 'Verifikasi dua langkah dinonaktifkan.' });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};
