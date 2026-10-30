import fs from 'fs';
import path from 'path';

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

const AUDIT_FILE = path.join(__dirname, '../../audit_logs.json');

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

function loadLogs(): AuditLogEntry[] {
  try {
    if (fs.existsSync(AUDIT_FILE)) {
      const data = fs.readFileSync(AUDIT_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed reading audit logs file, using default seed:', err);
  }
  return [...INITIAL_LOGS];
}

function saveLogs(logs: AuditLogEntry[]) {
  try {
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs.slice(-500), null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed saving audit logs to disk:', err);
  }
}

export function recordAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  const currentLogs = loadLogs();
  const newEntry: AuditLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };
  currentLogs.unshift(newEntry);
  saveLogs(currentLogs);
  return newEntry;
}

export function getAuditLogs(filter?: { category?: string; search?: string; limit?: number }): AuditLogEntry[] {
  let logs = loadLogs();
  if (filter?.category && filter.category !== 'ALL') {
    logs = logs.filter(l => l.category === filter.category);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    logs = logs.filter(l => 
      l.action.toLowerCase().includes(q) || 
      l.actor.toLowerCase().includes(q) || 
      l.details.toLowerCase().includes(q) ||
      (l.target && l.target.toLowerCase().includes(q))
    );
  }
  return logs.slice(0, filter?.limit || 100);
}
