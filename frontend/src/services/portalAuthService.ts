import axios from 'axios';

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
  assessmentTitle?: string | null;
  gradeLevel?: string | null;
  specialization?: string | null;
  status?: string;
}

export interface PortalSession {
  token: string;
  user: PortalUser;
}

const PORTAL_TOKEN_KEY = 'portalToken';
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

export const savePortalSession = ({ token, user }: PortalSession): void => {
  localStorage.setItem(PORTAL_TOKEN_KEY, token);
  localStorage.setItem(PORTAL_USER_KEY, JSON.stringify(user));
  localStorage.setItem('authRole', user.role);
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify({
    id: user.id,
    name: user.name,
    username: user.email || user.username || '',
    role: user.role,
    companyId: user.companyId || undefined,
    companyName: user.companyName || undefined,
    assessmentId: user.assessmentId || undefined,
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
  for (const key of [
    PORTAL_TOKEN_KEY,
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

export const loginPortal = async (identifier: string, password: string): Promise<PortalSession> => {
  const response = await axios.post('/api/portal/auth/login', { identifier, password });
  return { token: response.data.token, user: response.data.user };
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
  return { token: response.data.token, user: response.data.user };
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
  return { token: response.data.token, user: response.data.user };
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