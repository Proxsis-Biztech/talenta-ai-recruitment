import React from 'react';
import { Navigate } from 'react-router-dom';
import { getPortalUser } from '../../services/portalAuthService';

export function RequireFaceVerified({ children }: { children: React.ReactNode }) {
  const user = getPortalUser();
  if (user && !user.faceVerifiedAt) {
    return <Navigate to="/peserta/live-scan" replace />;
  }
  return <>{children}</>;
}
