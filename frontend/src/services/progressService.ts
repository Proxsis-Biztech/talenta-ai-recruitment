const normalizeCode = (code?: string | null): string =>
  String(code || '').trim().toUpperCase();

export const activeUserProgressScope = (): string => {
  try {
    const portalRaw = localStorage.getItem('portalUser');
    if (portalRaw) {
      const u = JSON.parse(portalRaw) as { id?: string; email?: string; username?: string };
      const id = String(u.id || u.email || u.username || '').trim().toLowerCase();
      if (id) return id.replace(/[^a-z0-9._-]/g, '_');
    }
    const activeRaw = localStorage.getItem('talenta_active_session_user');
    if (activeRaw) {
      const u = JSON.parse(activeRaw) as { id?: string; username?: string };
      const id = String(u.id || u.username || '').trim().toLowerCase();
      if (id) return id.replace(/[^a-z0-9._-]/g, '_');
    }
  } catch {
    // ignore storage read error
  }
  return 'anon';
};

export const clearLegacyProgressStorage = (): void => {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (
        (key.startsWith('talenta_cat_completed_') && !key.startsWith('talenta_cat_completed_v2_')) ||
        (key.startsWith('talenta_cat_submitted_') && !key.startsWith('talenta_cat_submitted_v2_')) ||
        key === 'talenta_live_coding_completed_map_v1' ||
        key === 'talenta_cat_completed'
      ) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
};

export const catCompletionKey = (code?: string | null, scope = activeUserProgressScope()): string =>
  `talenta_cat_completed_v2_${scope}_${normalizeCode(code)}`;

export const catSubmittedKey = (code?: string | null, scope = activeUserProgressScope()): string =>
  `talenta_cat_submitted_v2_${scope}_${normalizeCode(code)}`;

export const markCatCompleted = (
  code?: string | null,
  submission?: { score?: number | null; integrityScore?: number | null; submittedAt?: string | null }
): void => {
  if (!code) return;
  try {
    const scope = activeUserProgressScope();
    localStorage.setItem(catCompletionKey(code, scope), 'true');
    if (submission) {
      localStorage.setItem(catSubmittedKey(code, scope), JSON.stringify(submission));
    }
  } catch {
    // ignore
  }
};

export const syncCatCompletionFromServer = (
  examsByProgram: Record<string, { status?: string; score?: number | null; integrityScore?: number | null; submittedAt?: string | null }>,
  activeExam?: { status?: string; score?: number | null; integrityScore?: number | null; submittedAt?: string | null } | null,
  activeProgramCode?: string | null
): void => {
  try {
    clearLegacyProgressStorage();
    const scope = activeUserProgressScope();
    const prefixDone = `talenta_cat_completed_v2_${scope}_`;
    const prefixSub = `talenta_cat_submitted_v2_${scope}_`;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefixDone) || key.startsWith(prefixSub)) {
        localStorage.removeItem(key);
      }
    }
    const doneStatuses = new Set(['submitted', 'graded', 'completed']);
    for (const [rawCode, entry] of Object.entries(examsByProgram || {})) {
      if (entry && doneStatuses.has(String(entry.status || ''))) {
        markCatCompleted(rawCode, {
          score: entry.score,
          integrityScore: entry.integrityScore,
          submittedAt: entry.submittedAt
        });
      }
    }
    if (activeProgramCode && activeExam && doneStatuses.has(String(activeExam.status || ''))) {
      markCatCompleted(activeProgramCode, {
        score: activeExam.score,
        integrityScore: activeExam.integrityScore,
        submittedAt: activeExam.submittedAt
      });
    }
  } catch {
    // ignore
  }
};

export const isCatCompletedFor = (code?: string | null): boolean => {
  if (!code) return false;
  try {
    const scope = activeUserProgressScope();
    return (
      localStorage.getItem(catCompletionKey(code, scope)) === 'true' ||
      Boolean(localStorage.getItem(catSubmittedKey(code, scope)))
    );
  } catch {
    return false;
  }
};

export const isAnyCatCompleted = (): boolean => {
  try {
    const scope = activeUserProgressScope();
    const prefixDone = `talenta_cat_completed_v2_${scope}_`;
    const prefixSub = `talenta_cat_submitted_v2_${scope}_`;
    return Object.keys(localStorage).some(
      (key) =>
        (key.startsWith(prefixDone) && localStorage.getItem(key) === 'true') ||
        (key.startsWith(prefixSub) && Boolean(localStorage.getItem(key)))
    );
  } catch {
    return false;
  }
};

export const moduleCompletionKey = (code?: string | null): string =>
  `peserta_completed_modules_${activeUserProgressScope()}_${normalizeCode(code || 'default')}`;

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
  } catch {
    // ignore
  }
};
