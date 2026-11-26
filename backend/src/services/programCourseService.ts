import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const normalizeProgramCode = (value: unknown): string =>
  String(value ?? '').trim().toUpperCase();

/**
 * Reads the admin-managed program -> course code mapping (`courses` / `programCourses`).
 * One assessment program may aggregate question banks from several course codes.
 */
export async function loadProgramCourseMap(): Promise<Record<string, string[]>> {
  const record = await prisma.masterRecord.findUnique({
    where: { scope_key: { scope: 'courses', key: 'programCourses' } }
  });
  if (!record?.value) return {};

  try {
    const parsed = JSON.parse(record.value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const map: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      const normalizedKey = normalizeProgramCode(key);
      if (!normalizedKey) continue;
      map[normalizedKey] = Array.from(
        new Set(value.map(normalizeProgramCode).filter(Boolean))
      );
    }
    return map;
  } catch {
    return {};
  }
}

export async function loadProgramCourseCodes(programCode: string): Promise<string[]> {
  const code = normalizeProgramCode(programCode);
  if (!code) return [];
  const map = await loadProgramCourseMap();
  const codes = new Set<string>([code]);
  for (const item of map[code] || []) codes.add(item);
  return Array.from(codes);
}
export async function loadCourseLabelMap(): Promise<Record<string, string>> {
  const record = await prisma.masterRecord.findUnique({
    where: { scope_key: { scope: 'courses', key: 'catalog' } }
  });
  if (!record?.value) return {};

  try {
    const parsed = JSON.parse(record.value);
    if (!Array.isArray(parsed)) return {};
    const labels: Record<string, string> = {};
    for (const item of parsed as Array<Record<string, unknown>>) {
      const label = String(item?.title ?? item?.name ?? '').trim();
      for (const rawCode of [item?.code, item?.id]) {
        const code = normalizeProgramCode(rawCode);
        if (code && label) labels[code] = label;
      }
    }
    return labels;
  } catch {
    return {};
  }
}
