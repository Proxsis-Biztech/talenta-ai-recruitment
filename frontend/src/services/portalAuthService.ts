import axios from 'axios';
import { clearLegacyProgressStorage } from './progressService';

export interface PortalUser {
  id: string;
  email: string;
  username?: string | null;
  name: string;
  role: 'peserta' | 'asesor' | 'admin' | 'superadmin';
  phone?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  assessmentId?: string | null;
  assessmentIds?: string | null;
  assessmentTitle?: string | null;
  gradeLevel?: string | null;
  specialization?: string | null;
  nik?: string | null;
  education?: string | null;
  university?: string | null;
  city?: string | null;
  portfolioUrl?: string | null;
  bio?: string | null;
  candidateCode?: string | null;
  employeeNumber?: string | null;
  department?: string | null;
  assessorName?: string | null;
  interviewScheduledAt?: string | null;
  interviewStatus?: string | null;
  interviewScore?: number | null;
  faceVerifiedAt?: string | null;
  deviceCheckCompletedAt?: string | null;
  mustChangePassword?: boolean;
  profileCompleted?: boolean;
  status?: string;
  createdAt?: string | null;
}

export interface PortalSession {
  token: string;
  refreshToken?: string;
  user: PortalUser;
  requiresOnboarding?: boolean;
}

export const needsOnboarding = (user: PortalUser | null | undefined): boolean =>
  Boolean(user && user.profileCompleted === false);

const PORTAL_TOKEN_KEY = 'portalToken';
const PORTAL_REFRESH_KEY = 'portalRefreshToken';
const PORTAL_USER_KEY = 'portalUser';
const SESSION_USER_KEY = 'talenta_active_session_user';

export const getPortalToken = (): string | null => localStorage.getItem(PORTAL_TOKEN_KEY);

export const getPortalUser = (): PortalUser | null => {
  const raw = localStorage.getItem(PORTAL_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PortalUser;
  } catch {
    return null;
  }
};

export const getPortalRole = (): string | null => {
  const user = getPortalUser();
  if (user?.role) return user.role;
  const adminRole = localStorage.getItem('adminRole');
  if (localStorage.getItem('adminToken') && adminRole) return adminRole;
  return null;
};

export const isPortalAuthenticated = (): boolean => Boolean(getPortalToken() && getPortalUser());

export const getAuthenticatedHomeRoute = (): string | null => {
  const adminToken = localStorage.getItem('adminToken');
  const adminRole = localStorage.getItem('adminRole');
  if (adminToken && (adminRole === 'admin' || adminRole === 'superadmin')) {
    return '/admin/dashboard';
  }
  if (isPortalAuthenticated()) {
    const user = getPortalUser();
    if (user?.role === 'asesor') return '/asesor';
    if (user?.role === 'peserta') {
      return user.profileCompleted === false ? '/peserta/profile' : '/peserta/dashboard';
    }
    if (user?.role === 'admin' || user?.role === 'superadmin') return '/admin/dashboard';
  }
  return null;
};

export const savePortalSession = ({ token, refreshToken, user }: PortalSession): void => {
  clearLegacyProgressStorage();
  localStorage.setItem(PORTAL_TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(PORTAL_REFRESH_KEY, refreshToken);
  localStorage.setItem(PORTAL_USER_KEY, JSON.stringify(user));
  localStorage.setItem('authRole', user.role);
  const assignedProgramIds = (() => {
    if (user.assessmentIds) {
      try {
        const parsed = JSON.parse(user.assessmentIds);
        if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
      } catch {
        // ignore malformed JSON
      }
    }
    return user.assessmentId ? [user.assessmentId] : undefined;
  })();
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify({
    id: user.id,
    name: user.name,
    username: user.email || user.username || '',
    role: user.role,
    companyId: user.companyId || undefined,
    companyName: user.companyName || undefined,
    assessmentId: user.assessmentId || undefined,
    assignedProgramIds,
    assessmentTitle: user.assessmentTitle || undefined,
    gradeLevel: user.gradeLevel || undefined,
    specialization: user.specialization || undefined
  }));

  if (user.role === 'peserta') {
    localStorage.setItem('pesertaUsername', user.email);
    localStorage.setItem('pesertaName', user.name);
    if (user.assessmentId) localStorage.setItem('programCode', user.assessmentId);
  }
  if (user.role === 'asesor') {
    localStorage.setItem('asesorUsername', user.username || user.email);
    localStorage.setItem('asesorName', user.name);
  }
};

export const clearPortalSession = (): void => {
  clearLegacyProgressStorage();
  for (const key of [
    PORTAL_TOKEN_KEY,
    PORTAL_REFRESH_KEY,
    PORTAL_USER_KEY,
    SESSION_USER_KEY,
    'authRole',
    'programCode',
    'asesorUsername',
    'asesorName',
    'pesertaUsername',
    'pesertaName'
  ]) {
    localStorage.removeItem(key);
  }
};

const authHeaders = () => {
  const token = getPortalToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const mapSession = (data: any): PortalSession => ({
  token: data.token,
  refreshToken: data.refreshToken,
  user: data.user,
  requiresOnboarding: data.requiresOnboarding ?? needsOnboarding(data.user)
});

export const loginPortal = async (identifier: string, password: string): Promise<PortalSession> => {
  const response = await axios.post('/api/portal/auth/login', { identifier, password });
  return mapSession(response.data);
};

export const registerPeserta = async (payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  programCode?: string;
  companyId?: string;
  companyName?: string;
  gradeLevel?: string;
}): Promise<PortalSession> => {
  const response = await axios.post('/api/portal/auth/register', payload);
  return mapSession(response.data);
};

export const tokenLogin = async (payload: {
  programCode: string;
  email?: string;
  name?: string;
  companyId?: string;
  companyName?: string;
  gradeLevel?: string;
}): Promise<PortalSession> => {
  const response = await axios.post('/api/portal/auth/token-login', payload);
  return mapSession(response.data);
};

export const fetchPortalMe = async (): Promise<PortalUser | null> => {
  if (!getPortalToken()) return null;
  const response = await axios.get('/api/portal/auth/me', { headers: authHeaders() });
  const user = response.data.user as PortalUser;
  if (user) savePortalSession({ token: getPortalToken() as string, user });
  return user;
};

export const fetchAdminMe = async () => {
  const token = localStorage.getItem('adminToken');
  if (!token) return null;
  const response = await axios.get('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } });
  return response.data.data as { id: string; username: string; role: string };
};

export const refreshPortalSession = async (): Promise<PortalSession | null> => {
  const refreshToken = localStorage.getItem(PORTAL_REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const response = await axios.post('/api/portal/auth/refresh', { refreshToken });
    const session = mapSession(response.data);
    savePortalSession(session);
    return session;
  } catch {
    return null;
  }
};

export const logoutPortal = async (): Promise<void> => {
  const refreshToken = localStorage.getItem(PORTAL_REFRESH_KEY);
  try {
    await axios.post('/api/portal/auth/logout', { refreshToken }, { headers: authHeaders() });
  } catch {
    // best effort
  }
  clearPortalSession();
};

export const requestPasswordReset = async (email: string) => {
  const response = await axios.post('/api/portal/auth/forgot-password', { email });
  return response.data as {
    message: string;
    mailDelivered?: boolean;
    mailProvider?: string;
    devResetToken?: string;
    resetUrl?: string;
  };
};

export const resetPasswordWithToken = async (token: string, password: string) => {
  const response = await axios.post('/api/portal/auth/reset-password', { token, password });
  return response.data as { message: string };
};

let refreshing: Promise<PortalSession | null> | null = null;

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;
    const status = error?.response?.status;
    const url: string = config?.url || '';
    const isAuthEndpoint = url.includes('/api/portal/auth/');
    if (status === 401 && config && !config.__portalRetry && !isAuthEndpoint && getPortalToken()) {
      config.__portalRetry = true;
      if (!refreshing) refreshing = refreshPortalSession().finally(() => { refreshing = null; });
      const session = await refreshing;
      if (session?.token) {
        config.headers = { ...(config.headers || {}), Authorization: `Bearer ${session.token}` };
        return axios(config);
      }
      clearPortalSession();
    }
    return Promise.reject(error);
  }
);
