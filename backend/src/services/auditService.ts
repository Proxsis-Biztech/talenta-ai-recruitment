import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const LEGACY_AUDIT_FILE = path.join(__dirname, '../../audit_logs.json');

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  category: 'AUTH' | 'AI_SCREENING' | 'DECISION' | 'EXPORT' | 'SECURITY' | 'DATA_MUTATION';
  ip: string;
  target?: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

const INITIAL_LOGS: AuditLogEntry[] = [
  {
    id: 'log-seed-1',
    timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    actor: 'system_core',
    action: 'SYSTEM_BOOT',
    category: 'SECURITY',
    ip: '127.0.0.1',
    target: 'System Kernel',
    details: 'AI Recruitment Engine core initialized with Gemini 2.5 Flash pipeline',
    status: 'SUCCESS'
  },
  {
    id: 'log-seed-2',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    actor: 'superadmin',
    action: 'ADMIN_LOGIN',
    category: 'AUTH',
    ip: '127.0.0.1',
    target: 'Admin Console',
    details: 'Autentikasi role superadmin berhasil dengan JWT token terverifikasi',
    status: 'SUCCESS'
  },
  {
    id: 'log-seed-3',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    actor: 'system_ai',
    action: 'BATCH_SCREENING_JOB',
    category: 'AI_SCREENING',
    ip: '127.0.0.1',
    target: 'Applicant Pool',
    details: 'Batch screening selesai untuk 15 kandidat antrean ATS',
    status: 'SUCCESS'
  },
  {
    id: 'log-seed-4',
    timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
    actor: 'proctor_watchdog',
    action: 'PROCTORING_ALERT',
    category: 'SECURITY',
    ip: '127.0.0.1',
    target: 'Live Interview Session',
    details: 'Terdeteksi perpindahan tab browser (2 insiden) pada sesi wawancara kandidat',
    status: 'WARNING'
  },
  {
    id: 'log-seed-5',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    actor: 'superadmin',
    action: 'DECISION_LETTER_GENERATED',
    category: 'DECISION',
    ip: '127.0.0.1',
    target: 'Ahmad Rizky Pratama',
    details: 'Penerbitan surat penawaran kerja (Offer Letter) resmi hasil evaluasi komposit 88',
    status: 'SUCCESS'
  }
];

function loadLegacyLogs(): AuditLogEntry[] {
  try {
    if (!fs.existsSync(LEGACY_AUDIT_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(LEGACY_AUDIT_FILE, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let seedPromise: Promise<void> | null = null;

async function ensureSeeded() {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const count = await prisma.auditLog.count();
    if (count > 0) return;
    const legacy = loadLegacyLogs();
    const merged = [...legacy, ...INITIAL_LOGS];
    const seen = new Set<string>();
    const data = merged
      .filter((entry) => {
        if (seen.has(entry.id)) return false;
        seen.add(entry.id);
        return true;
      })
      .map((entry) => ({
        id: entry.id,
        timestamp: new Date(entry.timestamp),
        actor: entry.actor,
        action: entry.action,
        category: entry.category,
        ip: entry.ip,
        target: entry.target || null,
        details: entry.details,
        status: entry.status
      }));
    if (data.length > 0) {
      await prisma.auditLog.createMany({ data, skipDuplicates: true });
    }
  })().catch((error) => {
    console.error('Failed seeding audit logs:', error);
  });
  return seedPromise;
}

export function recordAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  const newEntry: AuditLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };
  void prisma.auditLog
    .create({
      data: {
        id: newEntry.id,
        timestamp: new Date(newEntry.timestamp),
        actor: newEntry.actor,
        action: newEntry.action,
        category: newEntry.category,
        ip: newEntry.ip,
        target: newEntry.target || null,
        details: newEntry.details,
        status: newEntry.status
      }
    })
    .catch((error) => {
      console.error('Failed writing audit log:', error);
    });
  return newEntry;
}

export async function getAuditLogs(filter?: {
  category?: string;
  search?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  await ensureSeeded();
  const where: any = {};
  if (filter?.category && filter.category !== 'ALL') {
    where.category = filter.category;
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    where.OR = [
      { action: { contains: q, mode: 'insensitive' } },
      { actor: { contains: q, mode: 'insensitive' } },
      { details: { contains: q, mode: 'insensitive' } },
      { target: { contains: q, mode: 'insensitive' } }
    ];
  }
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: filter?.limit || 100
  });
  return logs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp.toISOString(),
    actor: log.actor,
    action: log.action,
    category: log.category as AuditLogEntry['category'],
    ip: log.ip,
    target: log.target || undefined,
    details: log.details,
    status: log.status as AuditLogEntry['status']
  }));
}