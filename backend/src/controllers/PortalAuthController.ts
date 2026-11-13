import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { type AuthRequest, getJwtSecret } from '../middleware/auth';
import { resolveAdminTenantId } from '../middleware/tenant';
import { ensureApplicantForPortalUser } from '../services/portalApplicantSync';

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
    { expiresIn: '12h' }
  );

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

    const token = signPortalToken(user);
    const safeUser = await prisma.portalUser.findUnique({ where: { id: user.id }, select: userSelect });
    return res.json({
      token,
      user: safeUser,
      requiresOnboarding: Boolean(safeUser && (!safeUser.profileCompleted || safeUser.mustChangePassword))
    });
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

    const token = signPortalToken(user);
    const safeUser = await prisma.portalUser.findUnique({ where: { id: user.id }, select: userSelect });
    return res.json({
      token,
      user: safeUser,
      requiresOnboarding: Boolean(safeUser && (!safeUser.profileCompleted || safeUser.mustChangePassword))
    });
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
    const phone = String(req.body.phone || '').trim() || null;
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
    return res.status(201).json({ token: signPortalToken(user), user });
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
    const safeUser = await prisma.portalUser.findUnique({ where: { id: user.id }, select: userSelect });
    return res.json({ token: signPortalToken(user), user: safeUser });
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
    requiresOnboarding: Boolean(user && (!user.profileCompleted || user.mustChangePassword))
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
    if (req.body.phone !== undefined) data.phone = String(req.body.phone).trim() || null;
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
    const user = await prisma.portalUser.findUnique({ where: { id: req.portalUser.id }, select: userSelect });
    if (!user) return res.status(404).json({ error: 'Akun tidak ditemukan.' });

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
      where: { userId: user.id }
    });
    const attempt = programCode
      ? allAttempts.find((item) => item.programCode === programCode) || null
      : null;

    if (
      attempt &&
      ['submitted', 'graded'].includes(attempt.status) &&
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
        passingScore: item.interviewPassingScore || 70
      })),
      exam: attempt
        ? {
            status: attempt.status,
            score: attempt.score,
            integrityScore: attempt.integrityScore,
            submittedAt: attempt.submittedAt,
            violationCount: JSON.parse(attempt.violations || '[]').length
          }
        : { status: 'not_started', score: null, integrityScore: null, submittedAt: null, violationCount: 0 },
      examsByProgram: Object.fromEntries(
        allAttempts.map((item) => [
          item.programCode,
          {
            status: item.status,
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

export const listPortalUsers = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.query.role ? String(req.query.role) : undefined;
    const search = req.query.search ? String(req.query.search).trim() : '';
    const tenantId = resolveAdminTenantId(req);
    const users = await prisma.portalUser.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        ...(role ? { role } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
                { username: { contains: search } }
              ]
            }
          : {})
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

    const user = await prisma.portalUser.create({
      data: {
        email,
        password: await bcrypt.hash(password, 10),
        name: String(req.body.name || '').trim(),
        username: req.body.username ? String(req.body.username).trim() : null,
        role,
        tenantId: resolveAdminTenantId(req) || (req.body.tenantId ? String(req.body.tenantId) : null),
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
    return res.status(201).json({ data: user });
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
    if (tenantId && existing.tenantId !== tenantId) {
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
    if (tenantId && existing.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Pengguna bukan milik tenant Anda.' });
    }
    await prisma.portalUser.delete({ where: { id } });
    return res.json({ message: 'Pengguna portal berhasil dihapus.' });
  } catch (error) {
    console.error('Delete portal user error:', error);
    return res.status(500).json({ error: 'Gagal menghapus pengguna portal.' });
  }
};