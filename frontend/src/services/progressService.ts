export const catCompletionKey = (code?: string | null): string =>
  `talenta_cat_completed_${String(code || '').trim().toUpperCase()}`;

export const markCatCompleted = (code?: string | null): void => {
  if (!code) return;
  try {
    localStorage.setItem(catCompletionKey(code), 'true');
  } catch {}
};

export const isCatCompletedFor = (code?: string | null): boolean => {
  if (!code) return false;
  try {
    return localStorage.getItem(catCompletionKey(code)) === 'true';
  } catch {
    return false;
  }
};

export const isAnyCatCompleted = (): boolean => {
  try {
    return Object.keys(localStorage).some(
      (key) => key.startsWith('talenta_cat_completed_') && localStorage.getItem(key) === 'true'
    );
  } catch {
    return false;
  }
};

export const moduleCompletionKey = (code?: string | null): string =>
  `peserta_completed_modules_${String(code || 'default').trim().toUpperCase()}`;

export const loadModuleCompletion = (code?: string | null): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(moduleCompletionKey(code));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const saveModuleCompletion = (code: string | null | undefined, value: Record<string, boolean>): void => {
  try {
    localStorage.setItem(moduleCompletionKey(code), JSON.stringify(value));
  } catch {}
};
