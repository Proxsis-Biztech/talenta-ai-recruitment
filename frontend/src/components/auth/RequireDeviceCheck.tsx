import React from 'react';
import { Navigate } from 'react-router-dom';
import { getPortalUser } from '../../services/portalAuthService';

export function RequireDeviceCheck({ children }: { children: React.ReactNode }) {
  const user = getPortalUser();
  if (user && !user.faceVerifiedAt) {
    return <Navigate to="/peserta/profile?tab=biometrik" replace />;
  }
  return <>{children}</>;
}
