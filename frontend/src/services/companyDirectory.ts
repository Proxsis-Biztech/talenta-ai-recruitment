import { loadMasterScope } from './masterDataService';

export interface CompanyItem {
  id: string;
  name: string;
  industry: string;
  pic: string;
  quotaMax: number;
  quotaUsed: number;
  contractPeriod: string;
  activeProgramsCount: number;
}

export const INITIAL_COMPANIES: CompanyItem[] = [
  {
    id: 'PT-01',
    name: 'PT Telkom Indonesia Tbk',
    industry: 'Telekomunikasi & Digital Tech',
    pic: 'Indra Gunawan (VP Human Capital)',
    quotaMax: 1500,
    quotaUsed: 1240,
    contractPeriod: 'Jan 2026 - Des 2026',
    activeProgramsCount: 3
  },
  {
    id: 'PT-02',
    name: 'Astra International Tbk',
    industry: 'Konglomerasi Otomotif & Energi',
    pic: 'Budi Santosa (HR Director)',
    quotaMax: 800,
    quotaUsed: 620,
    contractPeriod: 'Mar 2026 - Mar 2027',
    activeProgramsCount: 2
  },
  {
    id: 'PT-03',
    name: 'Bank Mandiri Tbk',
    industry: 'Perbankan & Jasa Keuangan',
    pic: 'Rina Marlina (Talent Acquisition Lead)',
    quotaMax: 2000,
    quotaUsed: 1450,
    contractPeriod: 'Feb 2026 - Feb 2027',
    activeProgramsCount: 4
  },
  {
    id: 'PT-04',
    name: 'PT Bank CIMB Niaga Tbk',
    industry: 'Perbankan Komersial (The Complete Banker)',
    pic: 'Sari Handayani (VP Talent Acquisition)',
    quotaMax: 1200,
    quotaUsed: 780,
    contractPeriod: 'Jan 2026 - Des 2026',
    activeProgramsCount: 2
  },
  {
    id: 'PT-05',
    name: 'Pertamina Hulu Energi',
    industry: 'Minyak & Gas Bumi',
    pic: 'Agus Purnomo (Head of Talent Development)',
    quotaMax: 500,
    quotaUsed: 210,
    contractPeriod: 'Mei 2026 - Mei 2027',
    activeProgramsCount: 1
  }
];

export const normalizeCompanyName = (raw?: string | null): string =>
  String(raw || '')
    .toLowerCase()
    .replace(/\b(pt|tbk|persero|indonesia)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const companyMatchesName = (companyName?: string | null, targetName?: string | null): boolean => {
  const a = normalizeCompanyName(companyName);
  const b = normalizeCompanyName(targetName);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const aTokens = a.split(' ').filter((w) => w.length >= 3);
  const bTokens = b.split(' ').filter((w) => w.length >= 3);
  return aTokens.some((token) => bTokens.includes(token));
};

export async function loadCompanyDirectory(): Promise<CompanyItem[]> {
  try {
    const data = await loadMasterScope<any>('company');
    if (Array.isArray(data?.matrix) && data.matrix.length > 0) {
      return data.matrix as CompanyItem[];
    }
  } catch {
    // fallback to INITIAL_COMPANIES
  }
  return INITIAL_COMPANIES;
}
