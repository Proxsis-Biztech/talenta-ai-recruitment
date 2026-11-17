import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';
import { resolveAdminTenantId } from '../middleware/tenant';
import { sendInvitationEmail } from '../services/mailService';

const prisma = new PrismaClient();

const tenantScope = (req: AuthRequest): string | null => resolveAdminTenantId(req);

const resolveLevel = async (parentId: string | null, tenantId: string | null): Promise<number> => {
  if (!parentId) return 0;
  const parent = await prisma.department.findFirst({
    where: { id: parentId, ...(tenantId ? { tenantId } : {}) },
    select: { level: true }
  });
  if (!parent) throw new Error('Departemen induk tidak ditemukan.');
  return parent.level + 1;
};

export const listDepartments = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = tenantScope(req);
    const departments = await prisma.department.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: [{ level: 'asc' }, { name: 'asc' }]
    });
    const counts = await prisma.portalUser.groupBy({
      by: ['departmentId'],
      where: { departmentId: { not: null }, ...(tenantId ? { tenantId } : {}) },
      _count: { _all: true }
    });
    const countByDept = new Map(counts.map((row) => [row.departmentId, row._count._all]));
    return res.json({
      data: departments.map((department) => ({
        ...department,
        memberCount: countByDept.get(department.id) || 0
      }))
    });
  } catch (error) {
    console.error('List departments error:', error);
    return res.status(500).json({ error: 'Gagal memuat struktur departemen.' });
  }
};

export const createDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = tenantScope(req);
    const name = String(req.body.name || '').trim();
    if (name.length < 2) return res.status(400).json({ error: 'Nama departemen minimal 2 karakter.' });
    const parentId = req.body.parentId ? String(req.body.parentId) : null;
    const level = await resolveLevel(parentId, tenantId);

    const department = await prisma.department.create({
      data: { name, parentId, level, tenantId }
    });
    return res.status(201).json({ data: department });
  } catch (error: any) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'Departemen dengan nama tersebut sudah ada pada induk yang sama.' });
    console.error('Create department error:', error);
    return res.status(500).json({ error: error?.message || 'Gagal membuat departemen.' });
  }
};

export const updateDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = tenantScope(req);
    const id = String(req.params.id);
    const existing = await prisma.department.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) }
    });
    if (!existing) return res.status(404).json({ error: 'Departemen tidak ditemukan.' });

    const data: Record<string, unknown> = {};
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (name.length < 2) return res.status(400).json({ error: 'Nama departemen minimal 2 karakter.' });
      data.name = name;
    }
    if (req.body.parentId !== undefined) {
      const parentId = req.body.parentId ? String(req.body.parentId) : null;
      if (parentId === id) return res.status(400).json({ error: 'Departemen tidak dapat menjadi induk dirinya sendiri.' });
      data.parentId = parentId;
      data.level = await resolveLevel(parentId, tenantId);
    }

    const department = await prisma.department.update({ where: { id }, data });
    return res.json({ data: department });
  } catch (error: any) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'Nama departemen sudah dipakai pada induk yang sama.' });
    console.error('Update department error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui departemen.' });
  }
};

export const deleteDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = tenantScope(req);
    const id = String(req.params.id);
    const existing = await prisma.department.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      include: { _count: { select: { children: true, members: true } } }
    });
    if (!existing) return res.status(404).json({ error: 'Departemen tidak ditemukan.' });
    if (existing._count.children > 0) {
      return res.status(409).json({ error: 'Pindahkan atau hapus sub-departemen terlebih dahulu.' });
    }

    await prisma.department.delete({ where: { id } });
    return res.json({ message: 'Departemen berhasil dihapus.' });
  } catch (error) {
    console.error('Delete department error:', error);
    return res.status(500).json({ error: 'Gagal menghapus departemen.' });
  }
};

export const assignUserDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = tenantScope(req);
    const userId = String(req.params.userId);
    const departmentId = req.body.departmentId ? String(req.body.departmentId) : null;

    const user = await prisma.portalUser.findFirst({
      where: { id: userId, ...(tenantId ? { tenantId } : {}) }
    });
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    let departmentName: string | null = null;
    if (departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: departmentId, ...(tenantId ? { tenantId } : {}) }
      });
      if (!department) return res.status(404).json({ error: 'Departemen tidak ditemukan.' });
      departmentName = department.name;
    }

    const updated = await prisma.portalUser.update({
      where: { id: userId },
      data: { departmentId, department: departmentName },
      select: { id: true, name: true, departmentId: true, department: true }
    });
    return res.json({ data: updated });
  } catch (error) {
    console.error('Assign user department error:', error);
    return res.status(500).json({ error: 'Gagal menetapkan departemen pengguna.' });
  }
};

export const listClassGroups = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = tenantScope(req);
    const programCode = req.query.programCode ? String(req.query.programCode).toUpperCase() : undefined;
    const groups = await prisma.classGroup.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        ...(programCode ? { programCode } : {})
      },
      orderBy: { createdAt: 'desc' },
      include: {
        program: { select: { code: true, title: true } },
        _count: { select: { members: true } }
      }
    });
    return res.json({
      data: groups.map((group) => ({
        ...group,
        memberCount: group._count.members
      }))
    });
  } catch (error) {
    console.error('List class groups error:', error);
    return res.status(500).json({ error: 'Gagal memuat daftar kelas.' });
  }
};

export const createClassGroup = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = tenantScope(req);
    const name = String(req.body.name || '').trim();
    if (name.length < 2) return res.status(400).json({ error: 'Nama kelas minimal 2 karakter.' });
    const programCode = req.body.programCode ? String(req.body.programCode).toUpperCase() : null;

    if (programCode) {
      const program = await prisma.job.findFirst({ where: { code: programCode } });
      if (!program) return res.status(404).json({ error: 'Program asesmen tidak ditemukan.' });
    }

    const group = await prisma.classGroup.create({
      data: {
        name,
        tenantId,
        programCode,
        description: req.body.description ? String(req.body.description) : null,
        capacity: Number.isFinite(Number(req.body.capacity)) ? Number(req.body.capacity) : null
      }
    });
    return res.status(201).json({ data: group });
  } catch (error: any) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'Nama kelas sudah ada pada program tersebut.' });
    console.error('Create class group error:', error);
    return res.status(500).json({ error: 'Gagal membuat kelas.' });
  }
};

export const updateClassGroup = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = tenantScope(req);
    const id = String(req.params.id);
    const existing = await prisma.classGroup.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) }
    });
    if (!existing) return res.status(404).json({ error: 'Kelas tidak ditemukan.' });

    const data: Record<string, unknown> = {};
    if (req.body.name !== undefined) data.name = String(req.body.name).trim();
    if (req.body.description !== undefined) data.description = req.body.description ? String(req.body.description) : null;
    if (req.body.capacity !== undefined) data.capacity = Number.isFinite(Number(req.body.capacity)) ? Number(req.body.capacity) : null;
    if (req.body.programCode !== undefined) data.programCode = req.body.programCode ? String(req.body.programCode).toUpperCase() : null;

    const group = await prisma.classGroup.update({ where: { id }, data });
    return res.json({ data: group });
  } catch (error) {
    console.error('Update class group error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui kelas.' });
  }
};

export const deleteClassGroup = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = tenantScope(req);
    const id = String(req.params.id);
    const existing = await prisma.classGroup.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) }
    });
    if (!existing) return res.status(404).json({ error: 'Kelas tidak ditemukan.' });
    await prisma.classGroup.delete({ where: { id } });
    return res.json({ message: 'Kelas berhasil dihapus.' });
  } catch (error) {
    console.error('Delete class group error:', error);
    return res.status(500).json({ error: 'Gagal menghapus kelas.' });
  }
};

export const listClassMembers = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = tenantScope(req);
    const classId = String(req.params.id);
    const group = await prisma.classGroup.findFirst({
      where: { id: classId, ...(tenantId ? { tenantId } : {}) }
    });
    if (!group) return res.status(404).json({ error: 'Kelas tidak ditemukan.' });

    const members = await prisma.classMember.findMany({
      where: { classId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, email: true, candidateCode: true, assessmentId: true, department: true } }
      }
    });
    return res.json({
      data: {
        class: group,
        members: members.map((member) => ({ ...member.user, membershipId: member.id, joinedAt: member.createdAt }))
      }
    });
  } catch (error) {
    console.error('List class members error:', error);
    return res.status(500).json({ error: 'Gagal memuat anggota kelas.' });
  }
};

export const addClassMembers = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = tenantScope(req);
    const classId = String(req.params.id);
    const group = await prisma.classGroup.findFirst({
      where: { id: classId, ...(tenantId ? { tenantId } : {}) },
      include: { program: { select: { code: true, title: true } } }
    });
    if (!group) return res.status(404).json({ error: 'Kelas tidak ditemukan.' });

    const userIds: string[] = Array.isArray(req.body.userIds)
      ? req.body.userIds.map(String).filter(Boolean)
      : req.body.userId
        ? [String(req.body.userId)]
        : [];
    if (userIds.length === 0) return res.status(400).json({ error: 'Pilih minimal satu peserta.' });

    const users = await prisma.portalUser.findMany({
      where: { id: { in: userIds }, ...(tenantId ? { tenantId } : {}) },
      select: { id: true }
    });
    if (users.length === 0) return res.status(404).json({ error: 'Peserta tidak ditemukan pada tenant ini.' });

    await prisma.classMember.createMany({
      data: users.map((user) => ({ classId, userId: user.id })),
      skipDuplicates: true
    });

    if (group.programCode) {
      for (const user of users) {
        const record = await prisma.portalUser.findUnique({ where: { id: user.id }, select: { assessmentIds: true } });
        const current: string[] = (() => {
          try {
            const parsed = JSON.parse(record?.assessmentIds || '[]');
            return Array.isArray(parsed) ? parsed.map(String) : [];
          } catch {
            return [];
          }
        })();
        if (!current.includes(group.programCode)) {
          current.push(group.programCode);
          await prisma.portalUser.update({
            where: { id: user.id },
            data: {
              assessmentIds: JSON.stringify(current),
              assessmentId: current[0] || group.programCode,
              assessmentTitle: group.program?.title || undefined
            }
          });
        }
      }
    }

    let invited = 0;
    if (req.body.notify !== false && group.program) {
      const baseUrl = (process.env.APP_BASE_URL || process.env.FRONTEND_URL || (process.env.CORS_ORIGIN || '').split(',')[0] || 'http://localhost:5173').replace(/\/$/, '');
      const details = await prisma.portalUser.findMany({
        where: { id: { in: users.map((user) => user.id) } },
        select: { email: true, name: true }
      });
      for (const detail of details) {
        const result = await sendInvitationEmail(detail.email, detail.name, {
          programTitle: group.program.title,
          loginUrl: `${baseUrl}/login`,
          note: `Anda ditambahkan ke kelas ${group.name}.`
        });
        if (result.delivered || result.provider === 'outbox') invited += 1;
      }
    }

    return res.json({
      message: `${users.length} peserta ditambahkan ke kelas ${group.name}.`,
      invited
    });
  } catch (error) {
    console.error('Add class members error:', error);
    return res.status(500).json({ error: 'Gagal menambahkan anggota kelas.' });
  }
};

export const removeClassMember = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = tenantScope(req);
    const classId = String(req.params.id);
    const userId = String(req.params.userId);
    const group = await prisma.classGroup.findFirst({
      where: { id: classId, ...(tenantId ? { tenantId } : {}) }
    });
    if (!group) return res.status(404).json({ error: 'Kelas tidak ditemukan.' });

    await prisma.classMember.deleteMany({ where: { classId, userId } });
    return res.json({ message: 'Anggota dikeluarkan dari kelas.' });
  } catch (error) {
    console.error('Remove class member error:', error);
    return res.status(500).json({ error: 'Gagal mengeluarkan anggota kelas.' });
  }
};

export const assignUserClasses = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = tenantScope(req);
    const userId = String(req.params.userId);
    const user = await prisma.portalUser.findFirst({
      where: { id: userId, ...(tenantId ? { tenantId } : {}) }
    });
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    const classIds: string[] = Array.isArray(req.body.classIds) ? req.body.classIds.map(String).filter(Boolean) : [];
    const groups = await prisma.classGroup.findMany({
      where: { id: { in: classIds }, ...(tenantId ? { tenantId } : {}) }
    });
    const validIds = groups.map((group) => group.id);

    await prisma.$transaction([
      prisma.classMember.deleteMany({ where: { userId, classId: { notIn: validIds.length ? validIds : ['__none__'] } } }),
      prisma.classMember.createMany({
        data: validIds.map((classId) => ({ classId, userId })),
        skipDuplicates: true
      })
    ]);

    const programCodes = Array.from(new Set(groups.map((group) => group.programCode).filter(Boolean))) as string[];
    if (programCodes.length > 0) {
      await prisma.portalUser.update({
        where: { id: userId },
        data: {
          assessmentIds: JSON.stringify(programCodes),
          assessmentId: programCodes[0]
        }
      });
    }

    return res.json({
      message: 'Kelas pengguna diperbarui.',
      data: { userId, classIds: validIds, programCodes }
    });
  } catch (error) {
    console.error('Assign user classes error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui kelas pengguna.' });
  }
};

export const listMyClasses = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const memberships = await prisma.classMember.findMany({
      where: { userId: req.portalUser.id },
      include: {
        class: {
          include: { program: { select: { code: true, title: true } } }
        }
      }
    });
    return res.json({
      data: memberships.map((membership) => ({
        id: membership.class.id,
        name: membership.class.name,
        programCode: membership.class.programCode,
        programTitle: membership.class.program?.title || null
      }))
    });
  } catch (error) {
    console.error('List my classes error:', error);
    return res.status(500).json({ error: 'Gagal memuat kelas Anda.' });
  }
};