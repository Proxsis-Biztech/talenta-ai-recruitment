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

export const INITIAL_COURSES: CourseItem[] = DEFAULT_ASSESSMENT_PROGRAMS.map((p) => ({
  id: p.id.toUpperCase(),
  code: p.id.toUpperCase(),
  title: stripCompanySuffix(p.title),
  category: p.category || 'Kompetensi Teknis & Terapan',
  syllabusSummary: p.description,
  gradeLevel: p.gradeLevel,
  updatedAt: new Date().toISOString().split('T')[0]
}));

export function getCachedCourses(): CourseItem[] {
  try {
    const raw = localStorage.getItem(COURSE_CATALOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as CourseItem[];
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
      courses = data.catalog as CourseItem[];
      cacheCourses(courses);
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
