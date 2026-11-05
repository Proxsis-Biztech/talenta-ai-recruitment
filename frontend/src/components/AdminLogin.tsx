import React from 'react';
import AuthLoginPage from './auth/AuthLoginPage';

/**
 * Unified Admin Login Page
 * Shares the exact modern Right login form with role detection & validation
 * for superadmin, asesor, and peserta.
 */
export default function AdminLogin() {
  return <AuthLoginPage />;
}
