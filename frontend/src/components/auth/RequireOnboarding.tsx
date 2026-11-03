import React from 'react';
import { Navigate } from 'react-router-dom';
import { getPortalUser, needsOnboarding } from '../../services/portalAuthService';

export function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const user = getPortalUser();
  if (user && needsOnboarding(user)) {
    return <Navigate to="/peserta/onboarding" replace />;
  }
  return <>{children}</>;
}
