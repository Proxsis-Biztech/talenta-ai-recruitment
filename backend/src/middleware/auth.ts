import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: { id: string; username: string; role: string; tenantId?: string | null };
  portalUser?: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId?: string | null;
    tenant?: { id: string; code: string; name: string } | null;
    companyId?: string | null;
    companyName?: string | null;
    assessmentId?: string | null;
    assessmentTitle?: string | null;
    gradeLevel?: string | null;
    specialization?: string | null;
  };
}

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET wajib diisi minimal 32 karakter pada environment production.');
  }
  return 'talenta-plus-local-development-secret-key-2026';
};

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
};

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    if (decoded.type === 'portal') {
      return res.status(403).json({ error: 'Token portal tidak dapat digunakan pada endpoint admin.' });
    }
    req.user = {
      id: payloadString(decoded.id),
      username: payloadString(decoded.username),
      role: payloadString(decoded.role),
      tenantId: typeof decoded.tenantId === 'string' ? decoded.tenantId : null
    };
    return next();
  } catch {
    return res.status(403).json({ error: 'Token tidak valid atau sudah kadaluarsa.' });
  }
};

export const authenticatePortal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak. Silakan masuk terlebih dahulu.' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    if (decoded.type !== 'portal') {
      return res.status(403).json({ error: 'Token tidak valid untuk portal peserta/asesor.' });
    }
    const user = await prisma.portalUser.findUnique({
      where: { id: payloadString(decoded.id) },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        tenantId: true,
        tenant: { select: { id: true, code: true, name: true } },
        companyId: true,
        companyName: true,
        assessmentId: true,
        assessmentTitle: true,
        gradeLevel: true,
        specialization: true
      }
    });
    if (!user || user.status !== 'Aktif') {
      return res.status(401).json({ error: 'Akun tidak ditemukan atau sudah dinonaktifkan.' });
    }
    req.portalUser = user;
    return next();
  } catch {
    return res.status(403).json({ error: 'Sesi portal tidak valid atau sudah kadaluarsa.' });
  }
};

export const authenticateAny = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    if (decoded.type === 'portal') return authenticatePortal(req, res, next);
    return authenticateToken(req, res, next);
  } catch {
    return res.status(403).json({ error: 'Token tidak valid atau sudah kadaluarsa.' });
  }
};

export const requireSuperadmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Akses ditolak. Hanya superadmin yang memiliki akses.' });
  }
  next();
};

export const requirePortalRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.portalUser || !roles.includes(req.portalUser.role)) {
      return res.status(403).json({ error: 'Akses ditolak untuk peran ini.' });
    }
    next();
  };
};

const payloadString = (value: unknown): string => (typeof value === 'string' ? value : '');