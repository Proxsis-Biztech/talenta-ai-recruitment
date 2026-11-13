import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const isActive = (item: any) => !item?.status || item.status === 'Aktif';

const matchesCompany = (item: any, context: string, companyName: string) => {
  if (context.includes('telkom') && item.companyId === 'PT-TELKOM') return true;
  if (context.includes('mandiri') && item.companyId === 'PT-MANDIRI') return true;
  if (context.includes('cimb') && item.companyId === 'PT-CIMB') return true;
  if (context.includes('astra') && item.companyId === 'PT-ASTRA') return true;
  if (context.includes('pertamina') && item.companyId === 'PT-PERTAMINA') return true;
  const itemCompany = String(item.companyName || '').toLowerCase();
  const userCompany = String(companyName || '').toLowerCase();
  if (!itemCompany || !userCompany) return false;
  return itemCompany.includes(userCompany) || userCompany.includes(itemCompany);
};

export const getPortalMaterials = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const requestedCode = typeof req.query.programCode === 'string' ? req.query.programCode.trim() : '';
    const allowedCodes = new Set<string>();
    if (req.portalUser.assessmentId) allowedCodes.add(req.portalUser.assessmentId.trim().toUpperCase());
    if (req.portalUser.assessmentIds) {
      try {
        const parsed = JSON.parse(req.portalUser.assessmentIds);
        if (Array.isArray(parsed)) parsed.forEach((c) => c && allowedCodes.add(String(c).trim().toUpperCase()));
      } catch {
        // ignore malformed JSON
      }
    }
    const programCode =
      requestedCode && allowedCodes.has(requestedCode.toUpperCase())
        ? requestedCode
        : req.portalUser.assessmentId || Array.from(allowedCodes)[0] || null;
    if (!programCode) {
      return res.json({ programCode: null, programTitle: null, data: [] });
    }

    const job = await prisma.job.findUnique({
      where: { code: programCode },
      select: { id: true, code: true, title: true, description: true, interviewPassingScore: true }
    });

    let items: any[] = [];
    if (job) {
      const [byId, byCode] = await Promise.all([
        prisma.masterRecord.findUnique({
          where: { scope_key: { scope: 'job-materi', key: job.id } }
        }),
        prisma.masterRecord.findUnique({
          where: { scope_key: { scope: 'job-materi', key: programCode } }
        })
      ]);
      const override = parseJson<any[]>(byId?.value || byCode?.value, []);
      if (Array.isArray(override) && override.length > 0) items = override;
    }

    if (items.length === 0) {
      const master = await prisma.masterRecord.findUnique({
        where: { scope_key: { scope: 'materi', key: 'table' } }
      });
      const list = parseJson<any[]>(master?.value, []);
      if (Array.isArray(list) && list.length > 0) {
        const context = `${req.portalUser.companyName || ''} ${req.portalUser.assessmentTitle || ''} ${job?.title || ''}`.toLowerCase();
        const matched = list.filter((item) => isActive(item) && matchesCompany(item, context, req.portalUser?.companyName || ''));
        items = matched.length > 0 ? matched : list.filter(isActive);
      }
    }

    if (items.length === 0 && job) {
      items = [
        {
          id: `mat-${job.id}-1`,
          code: `MOD-${job.code}`,
          title: `Silabus Teknis & Studi Kasus: ${job.title}`,
          category: 'Kompetensi Inti & Terapan',
          subcategory: 'Standar Operasional & Rekayasa Arsitektur Enterprise',
          competency: 'Problem Solving & Business Alignment',
          companyId: 'PT-DYNAMIC',
          companyName: req.portalUser.companyName || 'Enterprise Partner',
          assessmentType: 'Technical & Hard Competency',
          assessmentLevel: 'Level 3: Senior / Lead Specialist',
          type: 'Studi Kasus',
          version: 'v2.5',
          content: job.description || '',
          rubric: `Ambang kelulusan minimum ${job.interviewPassingScore || 70}%. Penilaian mengevaluasi pemahaman konsep, artikulasi trade-off teknis, dan kesiapan mitigasi risiko.`,
          behavioralIndicators: [
            `Mampu merancang solusi teknis untuk ${job.title}`,
            'Menjelaskan trade-off implementasi, biaya, dan keandalan sistem',
            'Mematuhi tata kelola privasi data dan audit trail integritas'
          ],
          status: 'Aktif'
        }
      ];
    }

    return res.json({
      programCode,
      programTitle: job?.title || req.portalUser.assessmentTitle || null,
      data: items
    });
  } catch (error) {
    console.error('Get portal materials error:', error);
    return res.status(500).json({ error: 'Gagal memuat materi asesmen.' });
  }
};