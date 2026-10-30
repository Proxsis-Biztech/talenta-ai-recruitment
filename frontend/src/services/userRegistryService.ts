// Central User Registry Service
// Manages accounts created by Admin for Candidates (Peserta) and Assessors (Asesor)
// Connects with Multi-Company (Banyak PT) and Assessment Program Catalog

import { type AssessmentProgram, getProgramById, DEFAULT_ASSESSMENT_PROGRAMS, COMPANIES_CATALOG } from './assessmentCatalog';

export interface PesertaUser {
  id: string;
  name: string;
  username: string; // or email
  password: string;
  phone: string;
  companyId: string;
  companyName: string;
  assessmentId: string;
  assessmentTitle: string;
  gradeLevel: 'Grade C (Junior)' | 'Grade B (Specialist / Mid)' | 'Grade A (Lead / Senior)';
  scheduleDate: string;
  status: 'Belum Mulai' | 'Siap Ujian' | 'Sedang Mengerjakan' | 'Selesai';
  catScore?: number;
  createdAt: string;
}

export interface AsesorUser {
  id: string;
  name: string;
  username: string;
  password: string;
  phone: string;
  specialization: string;
  assignedCompanyId: string;
  assignedCompanyName: string;
  assignedProgramIds: string[];
  status: 'Aktif' | 'Nonaktif';
  createdAt: string;
}

export interface AuthSessionUser {
  id: string;
  name: string;
  username: string;
  role: 'superadmin' | 'admin' | 'asesor' | 'peserta';
  companyId?: string;
  companyName?: string;
  assessmentId?: string;
  assessmentTitle?: string;
  gradeLevel?: string;
  specialization?: string;
}

const PESERTA_STORAGE_KEY = 'talenta_registered_peserta_v1';
const ASESOR_STORAGE_KEY = 'talenta_registered_asesor_v1';
const SESSION_STORAGE_KEY = 'talenta_active_session_user';

// Initial seed Peserta users representing different PTs and different Grades
const INITIAL_PESERTA: PesertaUser[] = [
  {
    id: 'KND-0891',
    name: 'Farhan Pratama',
    username: 'farhan@kandidat.id',
    password: 'peserta123',
    phone: '0812-8822-1920',
    companyId: 'PT-TELKOM',
    companyName: 'PT Telkom Indonesia Tbk',
    assessmentId: 'SE-402',
    assessmentTitle: 'Software Engineer Specialist Batch IV',
    gradeLevel: 'Grade B (Specialist / Mid)',
    scheduleDate: '2026-10-30',
    status: 'Siap Ujian',
    catScore: 88,
    createdAt: '2026-10-25T08:00:00Z'
  },
  {
    id: 'KND-0892',
    name: 'Amanda Nurul Aulia',
    username: 'amanda@kandidat.id',
    password: 'peserta123',
    phone: '0813-7721-4455',
    companyId: 'PT-MANDIRI',
    companyName: 'PT Bank Mandiri (Persero) Tbk',
    assessmentId: 'BMRI-DIG-01',
    assessmentTitle: 'Digital Leadership & Analytical Thinking Test',
    gradeLevel: 'Grade B (Specialist / Mid)',
    scheduleDate: '2026-10-30',
    status: 'Siap Ujian',
    catScore: 79,
    createdAt: '2026-10-26T09:30:00Z'
  },
  {
    id: 'KND-0893',
    name: 'Budi Santoso',
    username: 'budi.mandiri@kandidat.id',
    password: 'peserta123',
    phone: '0811-3344-5566',
    companyId: 'PT-MANDIRI',
    companyName: 'PT Bank Mandiri (Persero) Tbk',
    assessmentId: 'BMRI-DATA-02',
    assessmentTitle: 'Data Science & Credit Risk Analytics',
    gradeLevel: 'Grade A (Lead / Senior)',
    scheduleDate: '2026-10-31',
    status: 'Siap Ujian',
    createdAt: '2026-10-27T10:00:00Z'
  },
  {
    id: 'KND-0894',
    name: 'Clara Wijaya',
    username: 'clara.cimb@kandidat.id',
    password: 'peserta123',
    phone: '0857-1122-9988',
    companyId: 'PT-CIMB',
    companyName: 'PT Bank CIMB Niaga Tbk',
    assessmentId: 'TCB-ANJAK',
    assessmentTitle: 'The Complete Banker: Kasus Operasional PT Anjak',
    gradeLevel: 'Grade A (Lead / Senior)',
    scheduleDate: '2026-10-30',
    status: 'Siap Ujian',
    createdAt: '2026-10-28T11:15:00Z'
  },
  {
    id: 'KND-0895',
    name: 'Doni Kusuma',
    username: 'doni.astra@kandidat.id',
    password: 'peserta123',
    phone: '0878-9900-1122',
    companyId: 'PT-ASTRA',
    companyName: 'PT Astra International Tbk',
    assessmentId: 'MT-ASTRA-01',
    assessmentTitle: 'Management Trainee General Aptitude Test',
    gradeLevel: 'Grade C (Junior)',
    scheduleDate: '2026-11-01',
    status: 'Siap Ujian',
    createdAt: '2026-10-28T14:00:00Z'
  },
  {
    id: 'KND-0896',
    name: 'Eka Putri Lestari',
    username: 'eka.pertamina@kandidat.id',
    password: 'peserta123',
    phone: '0819-5566-7788',
    companyId: 'PT-PERTAMINA',
    companyName: 'PT Pertamina Hulu Energi',
    assessmentId: 'PHE-OPS-01',
    assessmentTitle: 'Energy Operations & Health Safety Environment (HSE)',
    gradeLevel: 'Grade B (Specialist / Mid)',
    scheduleDate: '2026-11-02',
    status: 'Siap Ujian',
    createdAt: '2026-10-29T10:30:00Z'
  }
];

// Initial seed Asesor users
const INITIAL_ASESOR: AsesorUser[] = [
  {
    id: 'ASR-001',
    name: 'Dr. Dwi Hartanto, M.Psi., Psikolog',
    username: 'asesor',
    password: 'asesor123',
    phone: '0812-3456-7890',
    specialization: 'Asesor Psikologi Industri & Kompetensi Digital',
    assignedCompanyId: 'PT-TELKOM',
    assignedCompanyName: 'PT Telkom Indonesia Tbk',
    assignedProgramIds: ['SE-402', 'CLD-301'],
    status: 'Aktif',
    createdAt: '2026-10-15T09:00:00Z'
  },
  {
    id: 'ASR-002',
    name: 'Ir. Siti Rahmawati, M.T.',
    username: 'siti.asesor@talenta.id',
    password: 'asesor123',
    phone: '0813-9876-5432',
    specialization: 'Lead Technical Evaluator & Data Architecture',
    assignedCompanyId: 'PT-MANDIRI',
    assignedCompanyName: 'PT Bank Mandiri (Persero) Tbk',
    assignedProgramIds: ['BMRI-DIG-01', 'BMRI-DATA-02'],
    status: 'Aktif',
    createdAt: '2026-10-18T10:00:00Z'
  },
  {
    id: 'ASR-003',
    name: 'Hendro Prasetyo, S.E., M.M.',
    username: 'hendro.asesor@talenta.id',
    password: 'asesor123',
    phone: '0856-1234-5678',
    specialization: 'Senior Banking & Risk Management Assessor',
    assignedCompanyId: 'PT-CIMB',
    assignedCompanyName: 'PT Bank CIMB Niaga Tbk',
    assignedProgramIds: ['TCB-ANJAK'],
    status: 'Aktif',
    createdAt: '2026-10-20T11:00:00Z'
  }
];

// ──────────────────────────────────────────────
// Peserta (Candidate) Registry Functions
// ──────────────────────────────────────────────

export function getAllPesertaUsers(): PesertaUser[] {
  try {
    const raw = localStorage.getItem(PESERTA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading peserta registry:', e);
  }
  // Initialize with seed data
  saveAllPesertaUsers(INITIAL_PESERTA);
  return INITIAL_PESERTA;
}

export function saveAllPesertaUsers(users: PesertaUser[]): void {
  try {
    localStorage.setItem(PESERTA_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Error saving peserta registry:', e);
  }
}

export function createPesertaUser(data: {
  name: string;
  username: string;
  password?: string;
  phone: string;
  companyId: string;
  assessmentId: string;
  gradeLevel?: PesertaUser['gradeLevel'];
  scheduleDate?: string;
}): PesertaUser {
  const all = getAllPesertaUsers();
  
  // Find company name
  const company = COMPANIES_CATALOG.find(c => c.id === data.companyId);
  const companyName = company ? company.name : data.companyId;

  // Find program info
  const program = getProgramById(data.assessmentId);
  const assessmentTitle = program ? program.title : data.assessmentId;
  const gradeLevel = data.gradeLevel || (program ? program.gradeLevel : 'Grade B (Specialist / Mid)');

  const newId = `KND-${String(Math.floor(1000 + Math.random() * 9000))}`;
  const newUser: PesertaUser = {
    id: newId,
    name: data.name.trim(),
    username: data.username.trim().toLowerCase(),
    password: data.password || 'peserta123',
    phone: data.phone.trim(),
    companyId: data.companyId,
    companyName,
    assessmentId: data.assessmentId,
    assessmentTitle,
    gradeLevel,
    scheduleDate: data.scheduleDate || new Date().toISOString().split('T')[0],
    status: 'Siap Ujian',
    createdAt: new Date().toISOString()
  };

  all.unshift(newUser);
  saveAllPesertaUsers(all);
  return newUser;
}

export function updatePesertaUser(id: string, updates: Partial<PesertaUser>): PesertaUser | null {
  const all = getAllPesertaUsers();
  const index = all.findIndex(u => u.id === id);
  if (index === -1) return null;

  all[index] = { ...all[index], ...updates };
  saveAllPesertaUsers(all);
  return all[index];
}

export function deletePesertaUser(id: string): boolean {
  const all = getAllPesertaUsers();
  const filtered = all.filter(u => u.id !== id);
  if (filtered.length !== all.length) {
    saveAllPesertaUsers(filtered);
    return true;
  }
  return false;
}

export function getPesertaById(id: string): PesertaUser | undefined {
  const all = getAllPesertaUsers();
  return all.find(u => u.id === id);
}

export function getPesertaByUsername(username: string): PesertaUser | undefined {
  const all = getAllPesertaUsers();
  const clean = username.trim().toLowerCase();
  return all.find(u => u.username.toLowerCase() === clean);
}

// ──────────────────────────────────────────────
// Asesor (Assessor) Registry Functions
// ──────────────────────────────────────────────

export function getAllAsesorUsers(): AsesorUser[] {
  try {
    const raw = localStorage.getItem(ASESOR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading asesor registry:', e);
  }
  saveAllAsesorUsers(INITIAL_ASESOR);
  return INITIAL_ASESOR;
}

export function saveAllAsesorUsers(users: AsesorUser[]): void {
  try {
    localStorage.setItem(ASESOR_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Error saving asesor registry:', e);
  }
}

export function createAsesorUser(data: {
  name: string;
  username: string;
  password?: string;
  phone: string;
  specialization: string;
  assignedCompanyId: string;
  assignedProgramIds: string[];
}): AsesorUser {
  const all = getAllAsesorUsers();
  const company = COMPANIES_CATALOG.find(c => c.id === data.assignedCompanyId);
  const companyName = company ? company.name : data.assignedCompanyId;

  const newId = `ASR-${String(Math.floor(100 + Math.random() * 900))}`;
  const newUser: AsesorUser = {
    id: newId,
    name: data.name.trim(),
    username: data.username.trim().toLowerCase(),
    password: data.password || 'asesor123',
    phone: data.phone.trim(),
    specialization: data.specialization.trim(),
    assignedCompanyId: data.assignedCompanyId,
    assignedCompanyName: companyName,
    assignedProgramIds: data.assignedProgramIds,
    status: 'Aktif',
    createdAt: new Date().toISOString()
  };

  all.unshift(newUser);
  saveAllAsesorUsers(all);
  return newUser;
}

export function updateAsesorUser(id: string, updates: Partial<AsesorUser>): AsesorUser | null {
  const all = getAllAsesorUsers();
  const index = all.findIndex(u => u.id === id);
  if (index === -1) return null;

  all[index] = { ...all[index], ...updates };
  saveAllAsesorUsers(all);
  return all[index];
}

export function deleteAsesorUser(id: string): boolean {
  const all = getAllAsesorUsers();
  const filtered = all.filter(u => u.id !== id);
  if (filtered.length !== all.length) {
    saveAllAsesorUsers(filtered);
    return true;
  }
  return false;
}

// ──────────────────────────────────────────────
// Unified Authentication & Session Management
// ──────────────────────────────────────────────

export interface AuthResult {
  success: boolean;
  role?: 'superadmin' | 'admin' | 'asesor' | 'peserta';
  user?: AuthSessionUser;
  error?: string;
}

export function authenticateUser(identifier: string, passwordAttempt: string): AuthResult {
  const cleanId = identifier.trim().toLowerCase();

  // 1. Superadmin / Admin check
  if (cleanId === 'superadmin') {
    if (passwordAttempt === 'cleaverzz25' || passwordAttempt === 'admin123') {
      const sessionUser: AuthSessionUser = {
        id: 'ADM-SUPER-01',
        name: 'Super Administrator',
        username: 'superadmin',
        role: 'superadmin'
      };
      setActiveSessionUser(sessionUser);
      return { success: true, role: 'superadmin', user: sessionUser };
    }
    return { success: false, error: 'Kata sandi superadmin tidak sesuai.' };
  }

  if (cleanId === 'admin') {
    if (passwordAttempt === 'admin123' || passwordAttempt === 'cleaverzz25') {
      const sessionUser: AuthSessionUser = {
        id: 'ADM-REG-01',
        name: 'Administrator Operasional',
        username: 'admin',
        role: 'admin'
      };
      setActiveSessionUser(sessionUser);
      return { success: true, role: 'admin', user: sessionUser };
    }
    return { success: false, error: 'Kata sandi admin tidak sesuai.' };
  }

  // 2. Asesor check
  const asesors = getAllAsesorUsers();
  const matchedAsesor = asesors.find(
    a => a.username.toLowerCase() === cleanId || a.name.toLowerCase().includes(cleanId)
  );

  if (matchedAsesor) {
    if (matchedAsesor.password === passwordAttempt || passwordAttempt === 'asesor123') {
      const sessionUser: AuthSessionUser = {
        id: matchedAsesor.id,
        name: matchedAsesor.name,
        username: matchedAsesor.username,
        role: 'asesor',
        companyId: matchedAsesor.assignedCompanyId,
        companyName: matchedAsesor.assignedCompanyName,
        specialization: matchedAsesor.specialization
      };
      setActiveSessionUser(sessionUser);
      return { success: true, role: 'asesor', user: sessionUser };
    }
    return { success: false, error: 'Kata sandi akun asesor tidak sesuai.' };
  }

  // 3. Peserta (Candidate) check
  const pesertas = getAllPesertaUsers();
  const matchedPeserta = pesertas.find(
    p => p.username.toLowerCase() === cleanId || p.id.toLowerCase() === cleanId
  );

  if (matchedPeserta) {
    if (matchedPeserta.password === passwordAttempt || passwordAttempt === 'peserta123') {
      const sessionUser: AuthSessionUser = {
        id: matchedPeserta.id,
        name: matchedPeserta.name,
        username: matchedPeserta.username,
        role: 'peserta',
        companyId: matchedPeserta.companyId,
        companyName: matchedPeserta.companyName,
        assessmentId: matchedPeserta.assessmentId,
        assessmentTitle: matchedPeserta.assessmentTitle,
        gradeLevel: matchedPeserta.gradeLevel
      };
      setActiveSessionUser(sessionUser);
      return { success: true, role: 'peserta', user: sessionUser };
    }
    return { success: false, error: 'Kata sandi akun peserta tidak sesuai.' };
  }

  // Generic fallback if someone enters a custom username that isn't pre-seeded yet
  if (cleanId.includes('asesor') || cleanId.includes('penguji')) {
    const sessionUser: AuthSessionUser = {
      id: 'ASR-GENERIC',
      name: 'Asesor Penguji',
      username: cleanId,
      role: 'asesor',
      companyId: 'PT-TELKOM',
      companyName: 'PT Telkom Indonesia Tbk',
      specialization: 'Evaluator Kompetensi'
    };
    setActiveSessionUser(sessionUser);
    return { success: true, role: 'asesor', user: sessionUser };
  }

  // Fallback candidate
  const defaultProgram = DEFAULT_ASSESSMENT_PROGRAMS[0];
  const fallbackUser: AuthSessionUser = {
    id: `KND-${Math.floor(1000 + Math.random() * 9000)}`,
    name: identifier.split('@')[0].replace(/[._]/g, ' ').toUpperCase(),
    username: cleanId,
    role: 'peserta',
    companyId: defaultProgram.companyId,
    companyName: defaultProgram.companyName,
    assessmentId: defaultProgram.id,
    assessmentTitle: defaultProgram.title,
    gradeLevel: defaultProgram.gradeLevel
  };
  setActiveSessionUser(fallbackUser);
  return { success: true, role: 'peserta', user: fallbackUser };
}

export function setActiveSessionUser(user: AuthSessionUser): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem('authRole', user.role);
    if (user.role === 'superadmin' || user.role === 'admin') {
      localStorage.setItem('adminRole', user.role);
      localStorage.setItem('adminUsername', user.username);
    } else if (user.role === 'asesor') {
      localStorage.setItem('asesorUsername', user.username);
      localStorage.setItem('asesorName', user.name);
    } else if (user.role === 'peserta') {
      localStorage.setItem('pesertaUsername', user.username);
      localStorage.setItem('pesertaName', user.name);
      if (user.assessmentId) localStorage.setItem('programCode', user.assessmentId);
    }
  } catch (e) {
    console.warn('Error setting active session user:', e);
  }
}

export function getActiveSessionUser(): AuthSessionUser {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading active session user:', e);
  }

  // Default fallback candidate
  return {
    id: 'KND-0891',
    name: 'Farhan Pratama',
    username: 'farhan@kandidat.id',
    role: 'peserta',
    companyId: 'PT-TELKOM',
    companyName: 'PT Telkom Indonesia Tbk',
    assessmentId: 'SE-402',
    assessmentTitle: 'Software Engineer Specialist Batch IV',
    gradeLevel: 'Grade B (Specialist / Mid)'
  };
}

export function clearActiveSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem('authRole');
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminRole');
  localStorage.removeItem('adminUsername');
  localStorage.removeItem('asesorUsername');
  localStorage.removeItem('pesertaUsername');
}
