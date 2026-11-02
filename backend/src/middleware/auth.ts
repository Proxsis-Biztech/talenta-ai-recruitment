import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; username: string; role: string };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'talenta-plus-enterprise-jwt-secret-key-2026-superadmin';

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token tidak valid atau sudah kadaluarsa.' });
    }
    const payload = decoded as JwtPayload;
    req.user = { id: payload.id as string, username: payload.username as string, role: payload.role as string };
    next();
  });
};

export const requireSuperadmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Akses ditolak. Hanya superadmin yang memiliki akses.' });
  }
  next();
};
