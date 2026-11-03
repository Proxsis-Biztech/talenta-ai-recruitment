import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { fetchAdminMe, fetchPortalMe, getPortalToken, getPortalUser } from '../../services/portalAuthService';

interface RequireRoleProps {
  roles: string[];
  children: React.ReactNode;
}

const readSessionRole = (): string | null => {
  const adminToken = localStorage.getItem('adminToken');
  const adminRole = localStorage.getItem('adminRole');
  if (adminToken && adminRole) return adminRole;
  const portalUser = getPortalUser();
  if (getPortalToken() && portalUser?.role) return portalUser.role;
  return null;
};

export function RequireRole({ roles, children }: RequireRoleProps) {
  const location = useLocation();
  const role = readSessionRole();
  const [sessionValid, setSessionValid] = useState(true);
  const rolesKey = roles.join(',');

  useEffect(() => {
    if (!role) return;
    const validate = async () => {
      try {
        if (roles.includes('admin') || roles.includes('superadmin')) {
          if (localStorage.getItem('adminToken')) await fetchAdminMe();
        } else {
          await fetchPortalMe();
        }
      } catch {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRole');
        localStorage.removeItem('portalToken');
        localStorage.removeItem('portalUser');
        localStorage.removeItem('talenta_active_session_user');
        setSessionValid(false);
      }
    };
    void validate();
  }, [role, rolesKey]);

  if (!sessionValid || !role || !roles.includes(role)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}