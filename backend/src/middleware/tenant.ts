import { PrismaClient } from '@prisma/client';
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

export const normalizeCompanyName = (value?: string | null): string =>
  String(value || '')
    .toLowerCase()
    .replace(/\b(tbk|persero|pt|cv)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

export interface ScopeIdentity {
  tenantId?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  tenant?: { name?: string | null } | null;
}

export interface ResolvedScopeContext {
  tenantId: string | null;
  companyId: string | null;
  companyName: string | null;
  normalizedCompany: string;
}

export const resolveAssessorScopeContext = async (
  portalUser: NonNullable<AuthRequest['portalUser']>,
  prisma: PrismaClient
): Promise<ResolvedScopeContext> => {
  const tenantId = portalUser.tenantId || null;
  const companyId = portalUser.companyId?.trim().toUpperCase() || null;
  let companyName = portalUser.companyName?.trim() || portalUser.tenant?.name?.trim() || null;
  if (tenantId && !companyName) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    companyName = tenant?.name?.trim() || null;
  }
  return {
    tenantId,
    companyId,
    companyName,
    normalizedCompany: normalizeCompanyName(companyName)
  };
};

export const isCandidateInAssessorScope = (
  assessorCtx: ResolvedScopeContext,
  candidate: ScopeIdentity | null | undefined
): boolean => {
  if (!candidate) return false;
  const candNormCompany = normalizeCompanyName(candidate.companyName || candidate.tenant?.name);
  const candCompanyId = candidate.companyId?.trim().toUpperCase() || null;
  const candTenantId = candidate.tenantId || null;

  // When both carry a company/PT name, enforce exact normalized PT match.
  if (assessorCtx.normalizedCompany && candNormCompany) {
    return assessorCtx.normalizedCompany === candNormCompany;
  }
  // Fall back to companyId if both provide one.
  if (assessorCtx.companyId && candCompanyId) {
    return assessorCtx.companyId === candCompanyId;
  }
  // Fall back to tenantId equality when company metadata is missing on either side.
  if (assessorCtx.tenantId && candTenantId) {
    return assessorCtx.tenantId === candTenantId;
  }
  // If assessor is bound to any PT/tenant and candidate lacks matching metadata, deny access.
  if (assessorCtx.tenantId || assessorCtx.normalizedCompany || assessorCtx.companyId) {
    return false;
  }
  return !candTenantId && !candNormCompany && !candCompanyId;
};
