import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { recordAuditLog } from '../services/auditService';
import { type AuthRequest, getJwtSecret } from '../middleware/auth';

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
      select: { id: true, username: true, role: true, tenantId: true, tenant: { select: { id: true, code: true, name: true } }, createdAt: true }
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
      select: { id: true, username: true, role: true, tenantId: true, tenant: { select: { id: true, code: true, name: true } }, createdAt: true }
    });
    res.json({ data: admins });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

export const createAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, role } = req.body;

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

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
        role: role || 'admin',
      },
      select: { id: true, username: true, role: true, createdAt: true }
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
    const { username, password, role } = req.body;

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
    if (role) {
      const validRoles = ['admin', 'superadmin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Role tidak valid. Hanya "admin" atau "superadmin" yang diizinkan.' });
      }
      data.role = role;
    }

    const updated = await prisma.admin.update({
      where: { id },
      data,
      select: { id: true, username: true, role: true, createdAt: true },
    });

    res.json({ message: 'Admin berhasil diperbarui', data: updated });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};
