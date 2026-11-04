import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const ENTRY_WINDOW_MS = 5 * 60 * 1000;

export const getWaitingRoomStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const user = await prisma.portalUser.findUnique({
      where: { id: req.portalUser.id },
      select: {
        id: true,
        assessmentId: true,
        interviewStatus: true,
        interviewScheduledAt: true,
        interviewCalledAt: true,
        interviewCompletedAt: true,
        assessorName: true
      }
    });
    if (!user) return res.status(404).json({ error: 'Akun tidak ditemukan.' });
    if (user.interviewStatus === 'completed') {
      return res.json({ status: 'completed', position: null, queueLength: 0, canEnter: false });
    }
    if (!user.assessmentId) {
      return res.json({ status: 'not_ready', position: null, queueLength: 0, canEnter: false });
    }

    const queue = await prisma.portalUser.findMany({
      where: {
        assessmentId: user.assessmentId,
        role: 'peserta',
        status: 'Aktif',
        interviewStatus: { in: ['scheduled', 'waiting', 'called'] }
      },
      orderBy: [{ interviewScheduledAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
      select: { id: true, interviewStatus: true, interviewScheduledAt: true, interviewCalledAt: true }
    });

    let position = queue.findIndex((item) => item.id === user.id) + 1;
    if (position === 0) position = 1;

    const anotherActive = queue.some(
      (item) => item.id !== user.id && ['called', 'in_progress'].includes(item.interviewStatus)
    );
    let status: 'waiting' | 'next' | 'called' =
      ['called', 'in_progress'].includes(user.interviewStatus)
        ? 'called'
        : position === 1 && !anotherActive
          ? 'called'
          : position <= 2
            ? 'next'
            : 'waiting';

    let calledAt = user.interviewCalledAt;
    if (status === 'called' && !calledAt) {
      calledAt = new Date();
      await prisma.portalUser.update({
        where: { id: user.id },
        data: { interviewStatus: 'called', interviewCalledAt: calledAt }
      });
    }

    return res.json({
      status,
      position,
      queueLength: queue.length,
      scheduledAt: user.interviewScheduledAt,
      calledAt,
      deadline: calledAt ? new Date(new Date(calledAt).getTime() + ENTRY_WINDOW_MS) : null,
      assessorName: user.assessorName || 'Tim Asesor Talenta+',
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
    const current = await prisma.portalUser.findFirst({
      where: { candidateCode, role: 'peserta' },
      select: { id: true, assessmentId: true, name: true }
    });
    if (!current) return res.status(404).json({ error: 'Peserta tidak ditemukan.' });

    await prisma.portalUser.update({
      where: { id: current.id },
      data: {
        interviewStatus: 'completed',
        interviewCompletedAt: new Date()
      }
    });

    const next = current.assessmentId
      ? await prisma.portalUser.findFirst({
          where: {
            assessmentId: current.assessmentId,
            role: 'peserta',
            status: 'Aktif',
            id: { not: current.id },
            interviewStatus: { in: ['scheduled', 'waiting'] }
          },
          orderBy: [{ interviewScheduledAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
          select: { id: true, name: true, candidateCode: true }
        })
      : null;

    if (next) {
      await prisma.portalUser.update({
        where: { id: next.id },
        data: { interviewStatus: 'called', interviewCalledAt: new Date() }
      });
    }

    return res.json({
      completed: { id: current.id, name: current.name },
      next: next || null
    });
  } catch (error) {
    console.error('Complete and call next error:', error);
    return res.status(500).json({ error: 'Gagal memanggil peserta berikutnya.' });
  }
};
