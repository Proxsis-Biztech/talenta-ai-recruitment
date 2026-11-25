import { DEFAULT_ASSESSMENT_PROGRAMS } from './assessmentCatalog';
import { loadMasterScope, saveMasterRecord } from './masterDataService';

export interface CourseItem {
  id: string;
  code: string;
  title: string;
  category: string;
  syllabusSummary: string;
  gradeLevel?: string;
  updatedAt?: string;
}

export const COURSE_CATALOG_STORAGE_KEY = 'talenta_courses_catalog_v1';
export const PROGRAM_COURSES_STORAGE_KEY = 'talenta_program_courses_v1';

const stripCompanySuffix = (raw: string): string =>
  String(raw || '')
    .replace(/\s*\([^)]*\b(?:PT|Tbk|Persero|Bank|Telkom|Astra|Mandiri|Niaga|Pertamina)\b[^)]*\)\s*$/i, '')
    .trim();

const DEFAULT_SYLLABUS_BY_CODE: Record<string, { title: string; category: string }> = {
  'SE-402': {
    title: 'Arsitektur Microservices, Concurrency & Clean Code',
    category: 'Rekayasa Perangkat Lunak'
  },
  'CLD-301': {
    title: 'Infrastruktur Cloud Multi-Region, Kubernetes & ISO 27001',
    category: 'Cloud & Infrastruktur DevOps'
  },
  'FED-101': {
    title: 'Rekayasa Antarmuka Modern, Micro-Frontend & Web Vitals',
    category: 'Rekayasa Web & Frontend'
  },
  'BMRI-DATA-02': {
    title: 'Streaming Data Terdistribusi, Lakehouse & Idempotensi Transaksi',
    category: 'Data Engineering & Finansial'
  },
  'BMRI-SEC-03': {
    title: 'Keamanan Siber, Deteksi Anomali SIEM & Mitigasi Fraud',
    category: 'Keamanan Informasi & Risiko'
  },
  'CIMB-BPM-02': {
    title: 'Rekayasa Proses Bisnis, Lean Operations & Tata Kelola SLA',
    category: 'Manajemen Proses Bisnis'
  },
  'CIMB-AUD-01': {
    title: 'Audit Infrastruktur TI, COBIT 2019 & Kepatuhan Data Perbankan',
    category: 'Audit TI & Kepatuhan'
  },
  'ASII-OPS-01': {
    title: 'Lean Manufacturing, Logistik JIT & Analitik Rantai Pasok',
    category: 'Operasional & Rantai Pasok'
  },
  'ASII-FIN-02': {
    title: 'Pemodelan Keuangan, Capital Budgeting & Uji Tuntas M&A',
    category: 'Keuangan Korporasi & Strategi'
  },
  'PHE-HSE-02': {
    title: 'Manajemen Risiko HSE Migas, Dekarbonisasi & Standar ISO 14001',
    category: 'K3L & Keberlanjutan (ESG)'
  },
  'PHE-GEO-01': {
    title: 'Interpretasi Seismik 3D, Pemodelan Reservoir & Petrofisika',
    category: 'Geosains & Eksplorasi'
  }
};

const LEGACY_PROGRAM_TITLES_BY_CODE: Record<string, Set<string>> = Object.fromEntries(
  DEFAULT_ASSESSMENT_PROGRAMS.map((p) => [
    p.id.toUpperCase(),
    new Set([p.title.trim().toLowerCase(), stripCompanySuffix(p.title).toLowerCase()])
  ])
);

/**
 * Upgrade legacy auto-seeded syllabus titles that copied Program Asesmen role titles
 * while preserving any custom syllabus entries or manually renamed items.
 */
function migrateLegacySyllabusCatalog(items: CourseItem[]): { list: CourseItem[]; changed: boolean } {
  let changed = false;
  const list = items.map((item) => {
    const codeKey = String(item.code || item.id || '').trim().toUpperCase();
    const override = DEFAULT_SYLLABUS_BY_CODE[codeKey];
    const legacyTitles = LEGACY_PROGRAM_TITLES_BY_CODE[codeKey];
    const currentTitleLower = String(item.title || '').trim().toLowerCase();
    if (override && legacyTitles?.has(currentTitleLower)) {
      changed = true;
      return {
        ...item,
        title: override.title,
        category: override.category
      };
    }
    return item;
  });
  return { list, changed };
}

export const INITIAL_COURSES: CourseItem[] = DEFAULT_ASSESSMENT_PROGRAMS.map((p) => {
  const code = p.id.toUpperCase();
  const syllabusMeta = DEFAULT_SYLLABUS_BY_CODE[code];
  return {
    id: code,
    code,
    title: syllabusMeta?.title || `Silabus Kompetensi ${stripCompanySuffix(p.title)}`,
    category: syllabusMeta?.category || p.category || 'Kompetensi Teknis & Terapan',
    syllabusSummary: p.description,
    gradeLevel: p.gradeLevel,
    updatedAt: new Date().toISOString().split('T')[0]
  };
});

export function getCachedCourses(): CourseItem[] {
  try {
    const raw = localStorage.getItem(COURSE_CATALOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const { list, changed } = migrateLegacySyllabusCatalog(parsed as CourseItem[]);
        if (changed) cacheCourses(list);
        return list;
      }
    }
  } catch {
    // ignore storage errors
  }
  return INITIAL_COURSES;
}

export function cacheCourses(courses: CourseItem[]): void {
  try {
    localStorage.setItem(COURSE_CATALOG_STORAGE_KEY, JSON.stringify(courses));
  } catch {
    // ignore storage errors
  }
}

export function getCachedProgramCourses(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(PROGRAM_COURSES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const normalized: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (Array.isArray(v)) {
            normalized[k.toUpperCase()] = Array.from(new Set(v.map((c) => String(c).trim().toUpperCase()).filter(Boolean)));
          }
        }
        return normalized;
      }
    }
  } catch {
    // ignore storage errors
  }
  return {};
}

export function cacheProgramCourses(map: Record<string, string[]>): void {
  try {
    localStorage.setItem(PROGRAM_COURSES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

export async function loadCoursesAndAssignments(): Promise<{
  courses: CourseItem[];
  programCourses: Record<string, string[]>;
}> {
  let courses = getCachedCourses();
  let programCourses = getCachedProgramCourses();
  try {
    const data = await loadMasterScope<any>('courses');
    if (Array.isArray(data?.catalog) && data.catalog.length > 0) {
      const { list, changed } = migrateLegacySyllabusCatalog(data.catalog as CourseItem[]);
      courses = list;
      cacheCourses(courses);
      if (changed) {
        void saveMasterRecord('courses', 'catalog', courses).catch(() => undefined);
      }
    }
    if (data?.programCourses && typeof data.programCourses === 'object' && !Array.isArray(data.programCourses)) {
      const normalized: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(data.programCourses)) {
        if (Array.isArray(v)) {
          normalized[k.toUpperCase()] = Array.from(new Set(v.map((c) => String(c).trim().toUpperCase()).filter(Boolean)));
        }
      }
      programCourses = normalized;
      cacheProgramCourses(programCourses);
    }
  } catch {
    // keep cached values when offline or unauthenticated
  }
  return { courses, programCourses };
}

export async function saveCourseCatalog(courses: CourseItem[]): Promise<void> {
  cacheCourses(courses);
  await saveMasterRecord('courses', 'catalog', courses).catch(() => undefined);
}

export async function saveProgramCoursesMap(map: Record<string, string[]>): Promise<void> {
  cacheProgramCourses(map);
  await saveMasterRecord('courses', 'programCourses', map).catch(() => undefined);
}

export function resolveProgramCourseCodes(
  programCodeOrId: string,
  programCourses: Record<string, string[]>,
  courses: CourseItem[]
): string[] {
  const key = String(programCodeOrId || '').trim().toUpperCase();
  if (!key) return [];
  if (Object.prototype.hasOwnProperty.call(programCourses, key)) {
    return programCourses[key];
  }
  const matchingCourse = courses.find((c) => c.code.toUpperCase() === key || c.id.toUpperCase() === key);
  return matchingCourse ? [matchingCourse.code.toUpperCase()] : [];
}
