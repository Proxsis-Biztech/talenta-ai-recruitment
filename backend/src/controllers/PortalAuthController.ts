import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { type AuthRequest, getJwtSecret, portalTokenTtl } from '../middleware/auth';
import { resolveAdminTenantId } from '../middleware/tenant';
import { ensureApplicantForPortalUser } from '../services/portalApplicantSync';
import { sendCredentialsEmail, sendPasswordResetEmail } from '../services/mailService';

const prisma = new PrismaClient();

const emailSchema = z.string().trim().email('Format email tidak valid').toLowerCase();
const passwordSchema = z.string().min(8, 'Kata sandi minimal 8 karakter');

const userSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  role: true,
  phone: true,
  companyId: true,
  companyName: true,
  assessmentId: true,
  assessmentIds: true,
  assessmentTitle: true,
  gradeLevel: true,
  specialization: true,
  nik: true,
  education: true,
  university: true,
  city: true,
  portfolioUrl: true,
  bio: true,
  candidateCode: true,
  employeeNumber: true,
  department: true,
  assessorName: true,
  interviewScheduledAt: true,
  interviewStatus: true,
  interviewScore: true,
  faceVerifiedAt: true,
  deviceCheckCompletedAt: true,
  mustChangePassword: true,
  profileCompleted: true,
  status: true,
  createdAt: true
} as const;

const signPortalToken = (user: { id: string; email: string; name: string; role: string; tenantId?: string | null }) =>
  jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId, type: 'portal' },
    getJwtSecret(),
    { expiresIn: portalTokenTtl(user.role) as jwt.SignOptions['expiresIn'] }
  );

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 30 * 60 * 1000;

const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

const appBaseUrl = (): string => {
  const explicit = process.env.APP_BASE_URL || process.env.FRONTEND_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const origin = (process.env.CORS_ORIGIN || '').split(',').map((item) => item.trim()).filter(Boolean)[0];
  return (origin || 'http://localhost:5173').replace(/\/$/, '');
};


const normalizePhoneNumber = (value: unknown): string => String(value || '').replace(/[\s-]/g, '');
const isValidPhoneNumber = (value: string): boolean => /^(?:\+62|62|0)8[0-9]{8,12}$/.test(value);

const closeStaleInterviewSession = async <T extends { id: string; interviewStatus: string; interviewScheduledAt?: Date | null }>(
  user: T
): Promise<T> => {
  if (
    ['scheduled', 'waiting', 'called', 'in_progress'].includes(user.interviewStatus) &&
    user.interviewScheduledAt &&
    new Date(user.interviewScheduledAt).getTime() < Date.now() - 3 * 60 * 60 * 1000
  ) {
    await prisma.portalUser.update({
      where: { id: user.id },
      data: { interviewStatus: 'completed' }
    });
    return { ...user, interviewStatus: 'completed' };
  }
  return user;
};
const issueRefreshToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(48).toString('base64url');
  await prisma.portalRefreshToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + REFRESH_TTL_MS) }
  });
  return token;
};

const buildSession = async (user: { id: string; email: string; name: string; role: string; tenantId?: string | null }) => {
  const token = signPortalToken(user);
  const refreshToken = await issueRefreshToken(user.id);
  const safeUser = await prisma.portalUser.findUnique({ where: { id: user.id }, select: userSelect });
  return {
    token,
    refreshToken,
    user: safeUser,
    requiresOnboarding: Boolean(safeUser && (!safeUser.profileCompleted || safeUser.mustChangePassword))
  };
};

const normalizeProgram = (job: { code: string | null; title: string; interviewPassingScore: number | null } | null) => {
  if (!job) return {};
  return {
    assessmentId: job.code || undefined,
    assessmentTitle: job.title,
    gradeLevel: undefined
  };
};

export const loginPortal = async (req: AuthRequest, res: Response) => {
  try {
    const identifier = String(req.body.identifier || req.body.email || req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/username dan kata sandi wajib diisi.' });
    }

    const user = await prisma.portalUser.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier }
        ]
      }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Kredensial tidak valid.' });
    }
    if (user.status !== 'Aktif') {
      return res.status(403).json({ error: 'Akun Anda sedang dinonaktifkan. Hubungi administrator.' });
    }

    const session = await buildSession(user);
    return res.json(session);
  } catch (error) {
    console.error('Portal login error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
};

export const googleLogin = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({ error: 'Login Google belum dikonfigurasi oleh administrator.' });
    }
    const credential = String(req.body.credential || '');
    if (!credential) return res.status(400).json({ error: 'Token Google wajib dikirim.' });

    const tokenResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!tokenResponse.ok) {
      return res.status(401).json({ error: 'Token Google tidak valid.' });
    }
    const tokenInfo = await tokenResponse.json();
    if (tokenInfo.aud !== clientId) {
      return res.status(401).json({ error: 'Token Google bukan untuk aplikasi ini.' });
    }
    if (tokenInfo.email_verified !== 'true' && tokenInfo.email_verified !== true) {
      return res.status(401).json({ error: 'Email Google belum terverifikasi.' });
    }

    const email = String(tokenInfo.email || '').toLowerCase();
    const user = await prisma.portalUser.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Email Google ini belum terdaftar. Gunakan email undangan atau daftar program baru.' });
    }
    if (user.status !== 'Aktif') {
      return res.status(403).json({ error: 'Akun Anda sedang dinonaktifkan.' });
    }

    const session = await buildSession(user);
    return res.json(session);
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ error: 'Gagal masuk dengan Google.' });
  }
};

export const registerPeserta = async (req: AuthRequest, res: Response) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = emailSchema.parse(req.body.email);
    const password = passwordSchema.parse(req.body.password);
    const phone = normalizePhoneNumber(req.body.phone) || null;
    if (phone && !isValidPhoneNumber(phone)) {
      return res.status(400).json({ error: 'Nomor WhatsApp tidak valid. Gunakan format 08xxxxxxxxxx atau +62xxxxxxxxxx.' });
    }
    const programCode = String(req.body.programCode || req.body.assessmentId || '').trim().toUpperCase();

    if (name.length < 2) {
      return res.status(400).json({ error: 'Nama lengkap wajib diisi.' });
    }

    const existing = await prisma.portalUser.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email ini sudah terdaftar. Silakan masuk menggunakan akun Anda.' });
    }

    const job = programCode
      ? await prisma.job.findFirst({ where: { code: programCode } })
      : null;

    const user = await prisma.portalUser.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10),
        phone,
        role: 'peserta',
        profileCompleted: false,
        tenantId: job?.tenantId || null,
        companyId: req.body.companyId ? String(req.body.companyId) : null,
        companyName: req.body.companyName ? String(req.body.companyName) : null,
        gradeLevel: req.body.gradeLevel ? String(req.body.gradeLevel) : null,
        ...normalizeProgram(job)
      },
      select: userSelect
    });

    await ensureApplicantForPortalUser(user.id);
    return res.status(201).json(await buildSession(user));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || 'Data pendaftaran tidak valid.' });
    }
    console.error('Portal register error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
};

export const tokenLogin = async (req: AuthRequest, res: Response) => {
  try {
    const programCode = String(req.body.programCode || '').trim().toUpperCase();
    if (!programCode) {
      return res.status(400).json({ error: 'Kode program asesmen wajib diisi.' });
    }

    const accessCode = await prisma.programAccessCode.findUnique({ where: { code: programCode } });
    if (!accessCode || !accessCode.active) {
      return res.status(404).json({ error: `Kode program "${programCode}" tidak valid atau sudah tidak aktif.` });
    }
    if (accessCode.expiresAt && accessCode.expiresAt.getTime() < Date.now()) {
      return res.status(410).json({ error: 'Kode program ini sudah kedaluwarsa. Hubungi administrator.' });
    }
    if (accessCode.uses >= accessCode.maxUses) {
      return res.status(410).json({ error: 'Kuota penggunaan kode program ini sudah habis.' });
    }
    const job = await prisma.job.findFirst({ where: { code: accessCode.programCode } });
    if (!job) {
      return res.status(404).json({ error: 'Program asesmen untuk kode ini tidak ditemukan.' });
    }
    await prisma.programAccessCode.update({
      where: { code: programCode },
      data: { uses: { increment: 1 } }
    });

    const email = req.body.email ? emailSchema.parse(req.body.email) : null;
    let user = email ? await prisma.portalUser.findUnique({ where: { email } }) : null;

    if (!user) {
      const generatedEmail = email || `token-${programCode.toLowerCase()}-${Date.now()}@talenta.local`;
      user = await prisma.portalUser.create({
        data: {
          name: req.body.name ? String(req.body.name).trim() : '',
          email: generatedEmail,
          password: await bcrypt.hash(`token-${Date.now()}-${Math.random()}`, 10),
          role: 'peserta',
          profileCompleted: false,
          tenantId: job.tenantId || null,
          companyId: req.body.companyId ? String(req.body.companyId) : null,
          companyName: req.body.companyName ? String(req.body.companyName) : null,
          gradeLevel: req.body.gradeLevel ? String(req.body.gradeLevel) : null,
          ...normalizeProgram(job)
        }
      });
    } else if (user.role !== 'peserta') {
      return res.status(403).json({ error: 'Akun ini bukan akun peserta.' });
    } else {
      user = await prisma.portalUser.update({
        where: { id: user.id },
        data: {
          ...normalizeProgram(job),
          ...(req.body.name ? { name: String(req.body.name).trim() } : {})
        }
      });
    }

    await ensureApplicantForPortalUser(user.id);
    return res.json(await buildSession(user));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || 'Data tidak valid.' });
    }
    console.error('Portal token login error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  if (!req.portalUser) {
    return res.status(401).json({ error: 'Sesi tidak valid.' });
  }
  const user = await prisma.portalUser.findUnique({
    where: { id: req.portalUser.id },
    select: userSelect
  });
  return res.json({
    user,
    requiresOnboarding: Boolean(user && !user.profileCompleted)
  });
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const data: Record<string, unknown> = {};
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (name.length < 2) return res.status(400).json({ error: 'Nama lengkap wajib diisi.' });
      data.name = name;
    }
    if (req.body.phone !== undefined) {
      const phone = normalizePhoneNumber(req.body.phone);
      if (phone && !isValidPhoneNumber(phone)) {
        return res.status(400).json({ error: 'Nomor WhatsApp tidak valid. Gunakan format 08xxxxxxxxxx atau +62xxxxxxxxxx.' });
      }
      data.phone = phone || null;
    }
    for (const field of ['nik', 'education', 'university', 'city', 'portfolioUrl', 'bio', 'employeeNumber', 'department']) {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field] === null ? null : String(req.body[field]);
      }
    }
    const existing = await prisma.portalUser.findUnique({ where: { id: req.portalUser.id } });
    const merged = { ...existing, ...data } as any;
    const isPlaceholder = (n?: string | null) => {
      if (!n) return true;
      const s = n.trim().toLowerCase();
      return (
        s === 'kandidat ujian cat' ||
        s === 'kandidat baru' ||
        s.startsWith('token-') ||
        s.startsWith('kandidat ')
      );
    };
    if (merged.name && !isPlaceholder(merged.name) && merged.phone && merged.nik && merged.education && merged.university && merged.city) {
      data.profileCompleted = true;
      data.mustChangePassword = false;
    }
    const user = await prisma.portalUser.update({
      where: { id: req.portalUser.id },
      data,
      select: userSelect
    });
    await ensureApplicantForPortalUser(user.id);
    return res.json({ user });
  } catch (error) {
    console.error('Update portal profile error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui profil.' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = passwordSchema.parse(req.body.newPassword);
    const user = await prisma.portalUser.findUnique({ where: { id: req.portalUser.id } });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ error: 'Kata sandi saat ini tidak sesuai.' });
    }
    await prisma.portalUser.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, 10) }
    });
    return res.json({ message: 'Kata sandi berhasil diperbarui.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || 'Kata sandi baru tidak valid.' });
    }
    console.error('Change portal password error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui kata sandi.' });
  }
};

export const completeOnboarding = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = passwordSchema.parse(req.body.newPassword);
    const user = await prisma.portalUser.findUnique({ where: { id: req.portalUser.id } });
    if (!user) return res.status(404).json({ error: 'Akun tidak ditemukan.' });
    if (user.mustChangePassword || currentPassword) {
      if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(400).json({ error: 'Kata sandi saat ini tidak sesuai.' });
      }
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ error: 'Kata sandi baru harus berbeda dari kata sandi saat ini.' });
    }

    const requiredFields = {
      name: String(req.body.name || '').trim(),
      phone: String(req.body.phone || '').trim(),
      nik: String(req.body.nik || '').trim(),
      education: String(req.body.education || '').trim(),
      university: String(req.body.university || '').trim(),
      city: String(req.body.city || '').trim()
    };
    const missing = Object.entries(requiredFields)
      .filter(([, value]) => !value)
      .map(([key]) => key);
    const nik = String(req.body.nik || '').trim();
    const employeeNumber = String(req.body.employeeNumber || '').trim();
    if (missing.length > 0) {
      return res.status(400).json({ error: `Lengkapi data berikut: ${missing.join(', ')}.` });
    }

    const updated = await prisma.portalUser.update({
      where: { id: user.id },
      data: {
        ...requiredFields,
        nik: nik || null,
        employeeNumber: employeeNumber || null,
        portfolioUrl: req.body.portfolioUrl ? String(req.body.portfolioUrl).trim() : null,
        bio: req.body.bio ? String(req.body.bio).trim() : null,
        department: req.body.department ? String(req.body.department).trim() : null,
        password: await bcrypt.hash(newPassword, 10),
        mustChangePassword: false,
        profileCompleted: true
      },
      select: userSelect
    });

    await ensureApplicantForPortalUser(updated.id);
    return res.json({ user: updated, requiresOnboarding: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || 'Kata sandi baru tidak valid.' });
    }
    console.error('Complete onboarding error:', error);
    return res.status(500).json({ error: 'Gagal menyelesaikan onboarding.' });
  }
};

export const completeDeviceCheck = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    if (!req.body.faceCaptured) {
      return res.status(400).json({ error: 'Snapshot wajah belum diterima.' });
    }
    const user = await prisma.portalUser.update({
      where: { id: req.portalUser.id },
      data: { faceVerifiedAt: new Date() },
      select: userSelect
    });
    return res.json({ user });
  } catch (error) {
    console.error('Complete device check error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan verifikasi perangkat.' });
  }
};

export const completeDeviceCheckSession = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const user = await prisma.portalUser.update({
      where: { id: req.portalUser.id },
      data: { deviceCheckCompletedAt: new Date() },
      select: userSelect
    });
    return res.json({ user });
  } catch (error) {
    console.error('Complete device check session error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan status cek perangkat.' });
  }
};

export const getPortalDashboard = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const foundUser = await prisma.portalUser.findUnique({ where: { id: req.portalUser.id }, select: userSelect });
    if (!foundUser) return res.status(404).json({ error: 'Akun tidak ditemukan.' });
    const user = await closeStaleInterviewSession(foundUser);

    const programCode = user.assessmentId || '';
    const assignedCodes: string[] = (() => {
      if (user.assessmentIds) {
        try {
          const parsed = JSON.parse(user.assessmentIds);
          if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
        } catch {
          // ignore malformed JSON
        }
      }
      return programCode ? [programCode] : [];
    })();
    const jobs = assignedCodes.length
      ? await prisma.job.findMany({ where: { code: { in: assignedCodes } } })
      : [];
    const job = jobs.find((item) => item.code === programCode) || jobs[0] || null;
    const allAttempts = await prisma.examAttempt.findMany({
      where: { userId: user.id },
      orderBy: { submittedAt: 'desc' }
    });
    const normalizedProgramCode = String(programCode || '').trim().toUpperCase();
    const normalizeAttemptStatus = (item: { status: string; submittedAt: Date | null; score: number | null }) =>
      ['submitted', 'graded', 'completed'].includes(item.status) || Boolean(item.submittedAt) || item.score !== null
        ? item.status === 'in_progress'
          ? 'submitted'
          : item.status
        : item.status;

    const attempt =
      (normalizedProgramCode
        ? allAttempts.find((item) => item.programCode.toUpperCase() === normalizedProgramCode)
        : null) ||
      allAttempts.find((item) => ['submitted', 'graded', 'completed'].includes(normalizeAttemptStatus(item))) ||
      allAttempts[0] ||
      null;

    if (
      attempt &&
      ['submitted', 'graded', 'completed'].includes(normalizeAttemptStatus(attempt)) &&
      !user.interviewScheduledAt
    ) {
      const scheduledAt = new Date(new Date(attempt.submittedAt || Date.now()).getTime() + 5 * 60 * 1000);
      await prisma.portalUser.update({
        where: { id: user.id },
        data: { interviewScheduledAt: scheduledAt, interviewStatus: 'scheduled' }
      });
      user.interviewScheduledAt = scheduledAt;
      user.interviewStatus = 'scheduled';
    }

    const lha = user.candidateCode
      ? await prisma.assessorScore.findFirst({
          where: { candidateCode: user.candidateCode, status: 'signed' },
          orderBy: { signedAt: 'desc' }
        })
      : null;

    let queuePosition: number | null = null;
    let queueLength = 0;
    let estimatedWaitMinutes: number | null = null;
    if (programCode) {
      const queue = await prisma.portalUser.findMany({
        where: {
          assessmentId: programCode,
          role: 'peserta',
          status: 'Aktif',
          interviewStatus: { in: ['scheduled', 'waiting', 'called'] }
        },
        orderBy: [{ interviewScheduledAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
        select: { id: true }
      });
      const index = queue.findIndex((item) => item.id === user.id);
      queuePosition = index >= 0 ? index + 1 : null;
      queueLength = queue.length;
      if (queuePosition) {
        estimatedWaitMinutes =
          user.interviewStatus === 'called' ? 0 : Math.max(0, queuePosition - 1) * 15;
      }
    }

    const assessor = user.assessorName
      ? null
      : await prisma.portalUser.findFirst({
          where: { role: 'asesor', status: 'Aktif' },
          select: { name: true }
        });

    return res.json({
      user,
      program: job
        ? {
            code: job.code,
            title: job.title,
            durationMinutes: job.interviewDuration || 30,
            passingScore: job.interviewPassingScore || 70
          }
        : null,
      programs: jobs.map((item) => ({
        code: item.code,
        title: item.title,
        durationMinutes: item.interviewDuration || 30,
        passingScore: item.interviewPassingScore || 70,
        status: item.status,
        assessmentDate: item.assessmentDate,
        assessmentEndDate: item.assessmentEndDate
      })),
      exam: attempt
        ? {
            status: normalizeAttemptStatus(attempt),
            score: attempt.score,
            integrityScore: attempt.integrityScore,
            submittedAt: attempt.submittedAt,
            violationCount: JSON.parse(attempt.violations || '[]').length
          }
        : { status: 'not_started', score: null, integrityScore: null, submittedAt: null, violationCount: 0 },
      examsByProgram: Object.fromEntries(
        allAttempts.map((item) => [
          String(item.programCode || '').trim().toUpperCase(),
          {
            status: normalizeAttemptStatus(item),
            score: item.score,
            integrityScore: item.integrityScore,
            submittedAt: item.submittedAt,
            violationCount: JSON.parse(item.violations || '[]').length
          }
        ])
      ),
      interview: {
        status: user.interviewStatus,
        scheduledAt: user.interviewScheduledAt,
        assessorName: user.assessorName || assessor?.name || 'Tim Asesor Right',
        score: user.interviewScore,
        queuePosition,
        queueLength,
        estimatedWaitMinutes
      },
      lha: lha
        ? {
            signed: true,
            recommendation: lha.recommendation,
            compositeScore: lha.compositeScore,
            interviewScore: lha.interviewScore,
            notes: lha.notes,
            lhaHash: lha.lhaHash,
            lhaNumber: lha.lhaNumber,
            signedAt: lha.signedAt,
            competencies: JSON.parse(lha.competencies || '[]')
          }
        : null
    });
  } catch (error) {
    console.error('Get portal dashboard error:', error);
    return res.status(500).json({ error: 'Gagal memuat dashboard peserta.' });
  }
};

const resolveTenantNameById = async (tenantId: string | null): Promise<string | null> => {
  if (!tenantId || tenantId === '__unassigned__') return null;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
  return tenant?.name || null;
};

const resolveTenantIdForCompanyName = async (companyName?: string | null): Promise<string | null> => {
  const clean = typeof companyName === 'string' ? companyName.trim() : '';
  if (!clean) return null;
  const found = await prisma.tenant.findFirst({ where: { name: clean }, select: { id: true } });
  if (found) return found.id;
  const baseCode = (
    clean
      .replace(/^PT\.?\s+/i, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 16) || 'TENANT'
  ).toUpperCase();
  const codeExists = await prisma.tenant.findUnique({ where: { code: baseCode }, select: { id: true } });
  const created = await prisma.tenant.create({
    data: {
      code: codeExists ? `${baseCode}-${Date.now().toString().slice(-4)}` : baseCode,
      name: clean
    },
    select: { id: true }
  });
  return created.id;
};

export const listPortalUsers = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.query.role ? String(req.query.role) : undefined;
    const search = req.query.search ? String(req.query.search).trim() : '';
    const tenantId = resolveAdminTenantId(req);
    const tenantName = await resolveTenantNameById(tenantId);
    const tenantFilter = tenantId
      ? tenantName
        ? { OR: [{ tenantId }, { companyName: tenantName }] }
        : { tenantId }
      : {};
    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { username: { contains: search } }
          ]
        }
      : {};
    const users = await prisma.portalUser.findMany({
      where: {
        AND: [
          tenantFilter,
          ...(role ? [{ role }] : []),
          searchFilter
        ]
      },
      select: userSelect,
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ data: users });
  } catch (error) {
    console.error('List portal users error:', error);
    return res.status(500).json({ error: 'Gagal memuat pengguna portal.' });
  }
};

export const createPortalUser = async (req: AuthRequest, res: Response) => {
  try {
    const email = emailSchema.parse(req.body.email);
    const password = passwordSchema.parse(req.body.password);
    const role = String(req.body.role || 'peserta');
    if (!['peserta', 'asesor'].includes(role)) {
      return res.status(400).json({ error: 'Role harus peserta atau asesor.' });
    }
    const existing = await prisma.portalUser.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email sudah digunakan.' });
    }

    const resolvedTenantId =
      resolveAdminTenantId(req) ||
      (req.body.tenantId ? String(req.body.tenantId) : null) ||
      (await resolveTenantIdForCompanyName(req.body.companyName));

    const user = await prisma.portalUser.create({
      data: {
        email,
        password: await bcrypt.hash(password, 10),
        name: String(req.body.name || '').trim(),
        username: req.body.username ? String(req.body.username).trim() : null,
        role,
        tenantId: resolvedTenantId,
        profileCompleted: role !== 'peserta',
        mustChangePassword: false,
        phone: req.body.phone ? String(req.body.phone) : null,
        companyId: req.body.companyId ? String(req.body.companyId) : null,
        companyName: req.body.companyName ? String(req.body.companyName) : null,
        assessmentId: (() => {
          if (req.body.assessmentId) return String(req.body.assessmentId);
          if (Array.isArray(req.body.assessmentIds) && req.body.assessmentIds.length > 0) {
            return String(req.body.assessmentIds[0]);
          }
          return null;
        })(),
        assessmentIds: (() => {
          if (Array.isArray(req.body.assessmentIds)) {
            const cleaned = req.body.assessmentIds.map(String).filter(Boolean);
            return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
          }
          if (req.body.assessmentIds) return String(req.body.assessmentIds);
          if (req.body.assessmentId) return JSON.stringify([String(req.body.assessmentId)]);
          return null;
        })(),
        assessmentTitle: req.body.assessmentTitle ? String(req.body.assessmentTitle) : null,
        gradeLevel: req.body.gradeLevel ? String(req.body.gradeLevel) : null,
        specialization: req.body.specialization ? String(req.body.specialization) : null,
        interviewScheduledAt: req.body.interviewScheduledAt ? new Date(req.body.interviewScheduledAt) : req.body.scheduleDate ? new Date(req.body.scheduleDate) : null,
        status: req.body.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif'
      },
      select: userSelect
    });
    if (role === 'peserta') await ensureApplicantForPortalUser(user.id);
    let mail: Awaited<ReturnType<typeof sendCredentialsEmail>> | null = null;
    if (req.body.sendEmail !== false) {
      mail = await sendCredentialsEmail(user.email, user.name, {
        loginUrl: `${appBaseUrl()}/login`,
        programTitle: user.assessmentTitle || user.assessmentId || undefined,
        username: user.username || undefined,
        temporaryPassword: password
      });
    }
    return res.status(201).json({ data: user, mail });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || 'Data tidak valid.' });
    }
    console.error('Create portal user error:', error);
    return res.status(500).json({ error: 'Gagal membuat pengguna portal.' });
  }
};

export const updatePortalUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.portalUser.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Pengguna portal tidak ditemukan.' });
    }
    const tenantId = resolveAdminTenantId(req);
    const tenantName = await resolveTenantNameById(tenantId);
    if (tenantId && existing.tenantId !== tenantId && (!tenantName || existing.companyName !== tenantName)) {
      return res.status(403).json({ error: 'Pengguna bukan milik tenant Anda.' });
    }

    const data: Record<string, unknown> = {};
    for (const field of ['name', 'username', 'phone', 'companyId', 'companyName', 'assessmentId', 'assessmentTitle', 'gradeLevel', 'specialization', 'status', 'nik', 'education', 'university', 'city', 'portfolioUrl', 'bio', 'employeeNumber', 'department']) {
      if (req.body[field] !== undefined) data[field] = req.body[field] === null ? null : String(req.body[field]);
    }
    if (req.body.assessmentIds !== undefined) {
      if (Array.isArray(req.body.assessmentIds)) {
        const cleaned = req.body.assessmentIds.map(String).filter(Boolean);
        data.assessmentIds = cleaned.length > 0 ? JSON.stringify(cleaned) : null;
        if (req.body.assessmentId === undefined) {
          data.assessmentId = cleaned[0] || null;
        }
      } else {
        data.assessmentIds = req.body.assessmentIds === null ? null : String(req.body.assessmentIds);
      }
    }
    if (req.body.interviewScheduledAt !== undefined || req.body.scheduleDate !== undefined) {
      const rawDate = req.body.interviewScheduledAt || req.body.scheduleDate;
      data.interviewScheduledAt = rawDate ? new Date(rawDate) : null;
    }
    if (req.body.role && ['peserta', 'asesor'].includes(req.body.role)) data.role = req.body.role;
    if (req.body.password) {
      data.password = await bcrypt.hash(passwordSchema.parse(req.body.password), 10);
    }

    const user = await prisma.portalUser.update({ where: { id }, data, select: userSelect });
    if (user.role === 'peserta') {
      await ensureApplicantForPortalUser(user.id);
    }
    return res.json({ data: user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || 'Data tidak valid.' });
    }
    console.error('Update portal user error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui pengguna portal.' });
  }
};

export const deletePortalUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.portalUser.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Pengguna portal tidak ditemukan.' });
    const tenantId = resolveAdminTenantId(req);
    const tenantName = await resolveTenantNameById(tenantId);
    if (tenantId && existing.tenantId !== tenantId && (!tenantName || existing.companyName !== tenantName)) {
      return res.status(403).json({ error: 'Pengguna bukan milik tenant Anda.' });
    }
    await prisma.portalUser.delete({ where: { id } });
    return res.json({ message: 'Pengguna portal berhasil dihapus.' });
  } catch (error) {
    console.error('Delete portal user error:', error);
    return res.status(500).json({ error: 'Gagal menghapus pengguna portal.' });
  }
};
export const forgotPassword = async (req: AuthRequest, res: Response) => {
  try {
    const email = emailSchema.parse(req.body.email);
    const user = await prisma.portalUser.findUnique({ where: { email } });
    const generic = {
      message: 'Jika email terdaftar, tautan pengaturan ulang kata sandi telah dikirim. Periksa kotak masuk Anda.'
    };

    if (!user) return res.json(generic);

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MS)
      }
    });

    const resetUrl = `${appBaseUrl()}/login?reset=${token}`;
    const mail = await sendPasswordResetEmail(user.email, user.name, token, resetUrl);
    const payload: Record<string, unknown> = { ...generic, mailDelivered: mail.delivered, mailProvider: mail.provider };
    if (process.env.NODE_ENV !== 'production' && !mail.delivered) {
      payload.devResetToken = token;
      payload.resetUrl = resetUrl;
    }
    return res.json(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || 'Email tidak valid.' });
    }
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Gagal memproses permintaan reset kata sandi.' });
  }
};

export const resetPassword = async (req: AuthRequest, res: Response) => {
  try {
    const token = String(req.body.token || '').trim();
    const newPassword = passwordSchema.parse(req.body.password ?? req.body.newPassword);
    if (!token) return res.status(400).json({ error: 'Token reset wajib diisi.' });

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) }
    });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.' });
    }

    const user = await prisma.portalUser.findUnique({ where: { id: record.userId } });
    if (!user) return res.status(404).json({ error: 'Akun tidak ditemukan.' });

    await prisma.$transaction([
      prisma.portalUser.update({
        where: { id: user.id },
        data: { password: await bcrypt.hash(newPassword, 10), mustChangePassword: false }
      }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.portalRefreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    return res.json({ message: 'Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || 'Kata sandi baru tidak valid.' });
    }
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Gagal mengatur ulang kata sandi.' });
  }
};

export const refreshPortalSession = async (req: AuthRequest, res: Response) => {
  try {
    const refreshToken = String(req.body.refreshToken || '').trim();
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token wajib dikirim.' });

    const record = await prisma.portalRefreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
    if (!record || record.revokedAt || record.expiresAt.getTime() < Date.now()) {
      return res.status(401).json({ error: 'Sesi Anda berakhir. Silakan masuk kembali.' });
    }

    const user = await prisma.portalUser.findUnique({ where: { id: record.userId } });
    if (!user || user.status !== 'Aktif') {
      return res.status(401).json({ error: 'Akun tidak ditemukan atau sudah dinonaktifkan.' });
    }

    await prisma.portalRefreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    return res.json(await buildSession(user));
  } catch (error) {
    console.error('Refresh portal session error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui sesi.' });
  }
};

export const logoutPortal = async (req: AuthRequest, res: Response) => {
  try {
    const refreshToken = String(req.body?.refreshToken || '').trim();
    if (refreshToken) {
      await prisma.portalRefreshToken.updateMany({
        where: { tokenHash: hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() }
      });
    } else if (req.portalUser) {
      await prisma.portalRefreshToken.updateMany({
        where: { userId: req.portalUser.id, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }
    return res.json({ message: 'Sesi berhasil diakhiri.' });
  } catch (error) {
    console.error('Logout portal error:', error);
    return res.status(500).json({ error: 'Gagal mengakhiri sesi.' });
  }
};

export const getAssessmentHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const user = await prisma.portalUser.findUnique({
      where: { id: req.portalUser.id },
      select: { candidateCode: true, assessmentId: true, assessmentIds: true }
    });
    if (!user) return res.status(404).json({ error: 'Akun tidak ditemukan.' });

    const attempts = await prisma.examAttempt.findMany({
      where: { userId: req.portalUser.id },
      orderBy: { startedAt: 'desc' }
    });

    const assignedCodes = new Set<string>(attempts.map((item) => item.programCode));
    if (user.assessmentId) assignedCodes.add(user.assessmentId);
    if (user.assessmentIds) {
      try {
        const parsed = JSON.parse(user.assessmentIds);
        if (Array.isArray(parsed)) parsed.forEach((code) => assignedCodes.add(String(code)));
      } catch {
        // ignore malformed JSON
      }
    }

    const jobs = await prisma.job.findMany({
      where: { code: { in: Array.from(assignedCodes) } },
      select: {
        code: true,
        title: true,
        interviewDuration: true,
        interviewPassingScore: true,
        assessmentDate: true,
        assessmentEndDate: true
      }
    });
    const jobByCode = new Map(jobs.map((job) => [job.code || '', job]));

    const scores = user.candidateCode
      ? await prisma.assessorScore.findMany({
          where: { candidateCode: user.candidateCode },
          orderBy: { updatedAt: 'desc' }
        })
      : [];

    const history = Array.from(assignedCodes).map((code) => {
      const attempt = attempts.find((item) => item.programCode === code) || null;
      const job = jobByCode.get(code);
      const score = scores.find((item) => item.programCode === code || item.programTitle === job?.title);
      return {
        programCode: code,
        programTitle: job?.title || code,
        durationMinutes: job?.interviewDuration || 90,
        passingScore: job?.interviewPassingScore || 70,
        assessmentDate: job?.assessmentDate || null,
        assessmentEndDate: job?.assessmentEndDate || null,
        status: attempt?.status || 'not_started',
        score: attempt?.score ?? null,
        integrityScore: attempt?.integrityScore ?? null,
        violationCount: (() => {
          try {
            const parsed = JSON.parse(attempt?.violations || '[]');
            return Array.isArray(parsed) ? parsed.length : 0;
          } catch {
            return 0;
          }
        })(),
        startedAt: attempt?.startedAt || null,
        submittedAt: attempt?.submittedAt || null,
        lha: score
          ? {
              status: score.status,
              recommendation: score.recommendation,
              compositeScore: score.compositeScore,
              interviewScore: score.interviewScore,
              lhaNumber: score.lhaNumber,
              signedAt: score.signedAt
            }
          : null
      };
    });

    history.sort((a, b) => {
      const left = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const right = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return right - left;
    });

    return res.json({ data: history });
  } catch (error) {
    console.error('Get assessment history error:', error);
    return res.status(500).json({ error: 'Gagal memuat riwayat asesmen.' });
  }
};

export const sendPortalUserCredentials = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.portalUser.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Pengguna portal tidak ditemukan.' });
    const tenantId = resolveAdminTenantId(req);
    const tenantName = await resolveTenantNameById(tenantId);
    if (tenantId && existing.tenantId !== tenantId && (!tenantName || existing.companyName !== tenantName)) {
      return res.status(403).json({ error: 'Pengguna bukan milik tenant Anda.' });
    }

    const programTitle = existing.assessmentTitle || existing.assessmentId || undefined;
    const mail = await sendCredentialsEmail(existing.email, existing.name, {
      loginUrl: `${appBaseUrl()}/login`,
      programTitle: programTitle || undefined,
      username: existing.username || undefined
    });
    return res.json({ message: 'Email kredensial diproses.', mail });
  } catch (error) {
    console.error('Send credentials error:', error);
    return res.status(500).json({ error: 'Gagal mengirim email kredensial.' });
  }
};

export const getPortalConsent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const record = await prisma.masterRecord.findUnique({
      where: { scope_key: { scope: 'portal-consent', key: req.portalUser.id } }
    });
    return res.json({ consent: record ? JSON.parse(record.value) : null });
  } catch (error) {
    console.error('Get portal consent error:', error);
    return res.status(500).json({ error: 'Gagal memuat data persetujuan.' });
  }
};

export const acceptPortalConsent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const version = String(req.body.version || 'v1.0').trim();
    const consent = {
      userId: req.portalUser.id,
      name: req.portalUser.name,
      email: req.portalUser.email,
      version,
      acceptedAt: new Date().toISOString(),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 250)
    };
    await prisma.masterRecord.upsert({
      where: { scope_key: { scope: 'portal-consent', key: req.portalUser.id } },
      create: { scope: 'portal-consent', key: req.portalUser.id, value: JSON.stringify(consent) },
      update: { value: JSON.stringify(consent) }
    });
    return res.status(201).json({ consent });
  } catch (error) {
    console.error('Accept portal consent error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan persetujuan.' });
  }
};
