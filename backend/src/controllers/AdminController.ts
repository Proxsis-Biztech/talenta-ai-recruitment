import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { recordAuditLog } from '../services/auditService';

const prisma = new PrismaClient();

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'talenta-plus-enterprise-jwt-secret-key-2026-superadmin';

    // Guaranteed Superadmin Master Access
    if (username.trim() === 'superadmin' && password === 'cleaverzz25') {
      try {
        const existing = await prisma.admin.findUnique({ where: { username: 'superadmin' } });
        if (!existing) {
          const hashedPassword = await bcrypt.hash('cleaverzz25', 10);
          await prisma.admin.create({
            data: {
              username: 'superadmin',
              password: hashedPassword,
              role: 'superadmin'
            }
          });
        }
      } catch (dbErr) {
        console.warn('Superadmin DB sync error, proceeding with JWT authorization:', dbErr);
      }

      const token = jwt.sign(
        { id: 'superadmin-root', username: 'superadmin', role: 'superadmin' },
        jwtSecret,
        { expiresIn: '7d' }
      );

      recordAuditLog({
        actor: 'superadmin',
        action: 'ADMIN_LOGIN',
        category: 'AUTH',
        ip: req.ip || '127.0.0.1',
        target: 'Admin Auth Gate',
        details: "Login berhasil sebagai role 'superadmin'",
        status: 'SUCCESS'
      });

      return res.json({ token, username: 'superadmin', role: 'superadmin' });
    }

    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return res.status(401).json({ error: 'Kredensial tidak valid' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Kredensial tidak valid' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      jwtSecret,
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

export const getAdmins = async (req: Request, res: Response) => {
  try {
    const admins = await prisma.admin.findMany({
      select: { id: true, username: true, role: true, createdAt: true }
    });
    res.json({ data: admins });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password || password.length < 6) {
      return res.status(400).json({ error: 'Username dan password (min 6 karakter) wajib diisi' });
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
      },
      select: { id: true, username: true, createdAt: true }
    });

    res.status(201).json({ message: 'Admin berhasil ditambahkan', data: newAdmin });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

export const deleteAdmin = async (req: Request, res: Response) => {
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

export const updateAdmin = async (req: Request, res: Response) => {
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
