import React from 'react';
import { Navigate } from 'react-router-dom';
import { getPortalUser } from '../../services/portalAuthService';

export function RequireProfileComplete({ children }: { children: React.ReactNode }) {
  const user = getPortalUser();
  const complete = Boolean(
    user?.name && user?.phone && user?.nik && user?.education && user?.university && user?.city
  );
  if (user && !complete) {
    return <Navigate to="/peserta/profile" replace />;
  }
  return <>{children}</>;
}
