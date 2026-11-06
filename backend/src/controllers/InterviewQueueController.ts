import { Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const ENTRY_WINDOW_MS = 5 * 60 * 1000;
const INTERVIEW_SLOT_MINUTES = 15;
const QUEUE_STATUSES = ['scheduled', 'waiting', 'called'] as const;

const queueUserSelect = {
  id: true,
  assessmentId: true,
  interviewStatus: true,
  interviewScheduledAt: true,
  interviewCalledAt: true,
  interviewCompletedAt: true,
  assessorName: true
} satisfies Prisma.PortalUserSelect;

const queueOrder: Prisma.PortalUserOrderByWithRelationInput[] = [
  { interviewScheduledAt: { sort: 'asc', nulls: 'last' } },
  { createdAt: 'asc' }
];

const acquireQueueLock = async (tx: Prisma.TransactionClient, programCode: string) => {
  await tx.$queryRawUnsafe(
    'SELECT pg_advisory_xact_lock(hashtext($1)) IS NULL AS locked',
    `interview_queue:${programCode}`
  );
};

const estimateWait = (position: number, status: string, scheduledAt: Date | null) => {
  if (status === 'called') {
    return { estimatedWaitMinutes: 0, estimatedStartAt: new Date() };
  }
  const now = Date.now();
  const queueWaitMinutes = Math.max(0, position - 1) * INTERVIEW_SLOT_MINUTES;
  const scheduledWaitMinutes = scheduledAt
    ? Math.max(0, Math.ceil((scheduledAt.getTime() - now) / 60000))
    : 0;
  const estimatedWaitMinutes = Math.max(queueWaitMinutes, scheduledWaitMinutes);
  return {
    estimatedWaitMinutes,
    estimatedStartAt: new Date(now + estimatedWaitMinutes * 60000)
  };
};

export const getWaitingRoomStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const portalUserId = req.portalUser.id;

    const result = await prisma.$transaction(async (tx) => {
      const initial = await tx.portalUser.findUnique({
        where: { id: portalUserId },
        select: queueUserSelect
      });
      if (!initial) return { kind: 'missing' as const };
      if (initial.interviewStatus === 'completed') return { kind: 'completed' as const };
      if (!initial.assessmentId) return { kind: 'not_ready' as const, queueLength: 0 };

      await acquireQueueLock(tx, initial.assessmentId);

      const user = await tx.portalUser.findUnique({
        where: { id: portalUserId },
        select: queueUserSelect
      });
      if (!user) return { kind: 'missing' as const };
      if (user.interviewStatus === 'completed') return { kind: 'completed' as const };

      const queue = await tx.portalUser.findMany({
        where: {
          assessmentId: user.assessmentId,
          role: 'peserta',
          status: 'Aktif',
          interviewStatus: { in: [...QUEUE_STATUSES] }
        },
        orderBy: queueOrder,
        select: { id: true, interviewStatus: true }
      });

      const index = queue.findIndex((item) => item.id === user.id);
      if (index === -1) {
        return { kind: 'not_ready' as const, queueLength: queue.length };
      }

      const position = index + 1;
      const anotherActive = queue.some(
        (item) => item.id !== user.id && item.interviewStatus === 'called'
      );

      let status: 'waiting' | 'next' | 'called' =
        user.interviewStatus === 'called'
          ? 'called'
          : position === 1 && !anotherActive
            ? 'called'
            : position <= 2
              ? 'next'
              : 'waiting';

      let calledAt = user.interviewCalledAt;
      if (status === 'called' && !calledAt) {
        const now = new Date();
        const claimed = await tx.portalUser.updateMany({
          where: { id: user.id, interviewStatus: { in: ['scheduled', 'waiting'] } },
          data: { interviewStatus: 'called', interviewCalledAt: now }
        });
        if (claimed.count > 0) {
          calledAt = now;
        } else {
          const latest = await tx.portalUser.findUnique({
            where: { id: user.id },
            select: { interviewStatus: true, interviewCalledAt: true }
          });
          if (latest?.interviewStatus === 'completed') return { kind: 'completed' as const };
          calledAt = latest?.interviewCalledAt ?? calledAt;
          if (latest?.interviewStatus === 'called') status = 'called';
        }
      }

      return {
        kind: 'ok' as const,
        user,
        queueLength: queue.length,
        position,
        status,
        calledAt
      };
    });

    if (result.kind === 'missing') {
      return res.status(404).json({ error: 'Akun tidak ditemukan.' });
    }
    if (result.kind === 'completed') {
      return res.json({
        status: 'completed',
        position: null,
        queueLength: 0,
        aheadCount: null,
        slotMinutes: INTERVIEW_SLOT_MINUTES,
        estimatedWaitMinutes: 0,
        estimatedStartAt: null,
        canEnter: false
      });
    }
    if (result.kind === 'not_ready') {
      return res.json({
        status: 'not_ready',
        position: null,
        queueLength: result.queueLength,
        aheadCount: null,
        slotMinutes: INTERVIEW_SLOT_MINUTES,
        estimatedWaitMinutes: null,
        estimatedStartAt: null,
        canEnter: false,
        assessorName: 'Tim Asesor Right'
      });
    }

    const { user, queueLength, position, status, calledAt } = result;
    const wait = estimateWait(position, status, user.interviewScheduledAt);

    return res.json({
      status,
      position,
      queueLength,
      aheadCount: Math.max(0, position - 1),
      slotMinutes: INTERVIEW_SLOT_MINUTES,
      estimatedWaitMinutes: wait.estimatedWaitMinutes,
      estimatedStartAt: wait.estimatedStartAt.toISOString(),
      scheduledAt: user.interviewScheduledAt,
      calledAt,
      deadline: calledAt ? new Date(calledAt.getTime() + ENTRY_WINDOW_MS) : null,
      assessorName: user.assessorName || 'Tim Asesor Right',
      canEnter: status === 'called'
    });
  } catch (error) {
    console.error('Get waiting room status error:', error);
    return res.status(500).json({ error: 'Gagal memuat status antrean.' });
  }
};

export const completeAndCallNext = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const candidateCode = String(req.params.candidateCode);

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.portalUser.findFirst({
        where: { candidateCode, role: 'peserta' },
        select: { id: true, name: true, assessmentId: true, tenantId: true, interviewStatus: true }
      });
      if (!current) return { kind: 'not_found' as const };
      if (current.interviewStatus === 'completed') {
        return { kind: 'ok' as const, completed: current, next: null, alreadyCompleted: true };
      }
      if (!['called', 'in_progress'].includes(current.interviewStatus)) {
        return { kind: 'not_active' as const, current };
      }

      await acquireQueueLock(tx, current.assessmentId || current.id);

      const fresh = await tx.portalUser.findUnique({
        where: { id: current.id },
        select: { id: true, name: true, assessmentId: true, tenantId: true, interviewStatus: true }
      });
      if (!fresh) return { kind: 'not_found' as const };

      if (fresh.interviewStatus === 'completed') {
        return { kind: 'ok' as const, completed: fresh, next: null, alreadyCompleted: true };
      }
      if (!['called', 'in_progress'].includes(fresh.interviewStatus)) {
        return { kind: 'not_active' as const, current: fresh };
      }

      await tx.portalUser.update({
        where: { id: fresh.id },
        data: { interviewStatus: 'completed', interviewCompletedAt: new Date() }
      });

      if (!fresh.assessmentId) {
        return { kind: 'ok' as const, completed: fresh, next: null };
      }

      const activeOther = await tx.portalUser.findFirst({
        where: {
          assessmentId: fresh.assessmentId,
          tenantId: fresh.tenantId,
          role: 'peserta',
          status: 'Aktif',
          interviewStatus: 'called',
          id: { not: fresh.id }
        },
        select: { id: true }
      });
      if (activeOther) {
        return { kind: 'ok' as const, completed: fresh, next: null, busy: true };
      }

      const next = await tx.portalUser.findFirst({
        where: {
          assessmentId: fresh.assessmentId,
          tenantId: fresh.tenantId,
          role: 'peserta',
          status: 'Aktif',
          id: { not: fresh.id },
          interviewStatus: { in: ['scheduled', 'waiting'] }
        },
        orderBy: queueOrder,
        select: { id: true, name: true, candidateCode: true }
      });
      if (!next) {
        return { kind: 'ok' as const, completed: fresh, next: null };
      }

      const claimed = await tx.portalUser.updateMany({
        where: { id: next.id, interviewStatus: { in: ['scheduled', 'waiting'] } },
        data: { interviewStatus: 'called', interviewCalledAt: new Date() }
      });

      return {
        kind: 'ok' as const,
        completed: fresh,
        next: claimed.count > 0 ? next : null
      };
    });

    if (result.kind === 'not_found') {
      return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    }
    if (result.kind === 'not_active') {
      return res.status(409).json({
        error: 'Peserta belum berada dalam sesi wawancara aktif. Panggil peserta dari antrean terlebih dahulu.',
        status: result.current.interviewStatus
      });
    }

    return res.json({
      completed: { id: result.completed.id, name: result.completed.name },
      next: result.next,
      ...('alreadyCompleted' in result && result.alreadyCompleted ? { alreadyCompleted: true } : {}),
      ...('busy' in result && result.busy ? { busy: true } : {})
    });
  } catch (error) {
    console.error('Complete and call next error:', error);
    return res.status(500).json({ error: 'Gagal memanggil peserta berikutnya.' });
  }
};