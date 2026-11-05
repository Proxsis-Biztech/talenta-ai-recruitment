import { type AuthRequest } from './auth';

export const UNASSIGNED_TENANT = '__unassigned__';

export const resolveAdminTenantId = (req: AuthRequest): string | null => {
  if (req.user?.role === 'superadmin') {
    const header = req.headers['x-tenant-id'];
    return typeof header === 'string' && header.trim() ? header.trim() : null;
  }
  return req.user?.tenantId || UNASSIGNED_TENANT;
};

export const requireAdminTenantId = (req: AuthRequest): string => {
  const tenantId = resolveAdminTenantId(req);
  return tenantId || UNASSIGNED_TENANT;
};
