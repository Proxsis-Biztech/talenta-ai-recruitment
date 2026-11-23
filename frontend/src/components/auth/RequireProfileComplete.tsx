import React from 'react';
import { Navigate } from 'react-router-dom';
import { getPortalUser } from '../../services/portalAuthService';

export function RequireProfileComplete({ children }: { children: React.ReactNode }) {
  const user = getPortalUser();
  const isPlaceholderName = (name?: string | null) => {
    if (!name) return true;
    const n = name.trim().toLowerCase();
    return (
      n === '' ||
      n === 'kandidat ujian cat' ||
      n === 'kandidat baru' ||
      n.startsWith('token-') ||
      n.startsWith('kandidat ')
    );
  };
  const biodataComplete = Boolean(
    user?.name &&
    !isPlaceholderName(user.name) &&
    user?.phone &&
    user?.nik &&
    user?.education &&
    user?.university &&
    user?.city
  );
  if (user && !biodataComplete) {
    return <Navigate to="/peserta/profile" replace />;
  }
  if (user && !user.faceVerifiedAt) {
    return <Navigate to="/peserta/live-scan" replace />;
  }
  return <>{children}</>;
}
