import React, { Suspense, lazy, Component, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { RequireRole } from './components/auth/RequireRole';
import { RequireOnboarding } from './components/auth/RequireOnboarding';
import { RequireProfileComplete } from './components/auth/RequireProfileComplete';
import { RequireDeviceCheck } from './components/auth/RequireDeviceCheck';
import { RequireFaceVerified } from './components/auth/RequireFaceVerified';

/**
 * Wraps dynamic React component imports with automatic chunk reload retry.
 * When a deployment replaces chunks on Coolify, an open tab navigating to a route
 * with an outdated chunk hash will automatically refresh to fetch the latest bundle.
 */
function lazyWithRetry<T extends React.ComponentType<any>>(
  componentFactory: () => Promise<{ default: T }>,
  keyName: string
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const storageKey = `right_chunk_retry_${keyName}`;
    try {
      const module = await componentFactory();
      sessionStorage.removeItem(storageKey);
      return module;
    } catch (error: any) {
      const errorMsg = error?.message || String(error || '');
      const isChunkError =
        errorMsg.includes('Failed to fetch dynamically imported module') ||
        errorMsg.includes('error loading dynamically imported module') ||
        errorMsg.includes('Importing a module script failed') ||
        errorMsg.includes('Loading chunk') ||
        errorMsg.includes('SyntaxError: Unexpected token');

      const alreadyRetried = sessionStorage.getItem(storageKey);
      if (isChunkError && !alreadyRetried) {
        sessionStorage.setItem(storageKey, 'true');
        console.warn(`[LazyRetry] Dynamic chunk expired for ${keyName}, reloading to latest build...`);
        window.location.reload();
        // Return a never-resolving promise so React doesn't crash during page reload
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}

// Landing & Auth
const RolePortalSelector = lazyWithRetry(() => import('./components/landing/RolePortalSelector'), 'RolePortalSelector');
const AuthLoginPage = lazyWithRetry(() => import('./components/auth/AuthLoginPage'), 'AuthLoginPage');
const { Error403Page, Error404Page, OfflinePage } = {
  Error403Page: lazyWithRetry(() => import('./components/auth/StatePages').then(m => ({ default: m.Error403Page })), 'Error403Page'),
  Error404Page: lazyWithRetry(() => import('./components/auth/StatePages').then(m => ({ default: m.Error404Page })), 'Error404Page'),
  OfflinePage: lazyWithRetry(() => import('./components/auth/StatePages').then(m => ({ default: m.OfflinePage })), 'OfflinePage'),
};

// Portal Peserta
const PesertaDashboard = lazyWithRetry(() => import('./components/peserta/PesertaDashboard'), 'PesertaDashboard');
const PesertaAsesmenList = lazyWithRetry(() => import('./components/peserta/PesertaAsesmenList'), 'PesertaAsesmenList');
const PesertaDetailAsesmen = lazyWithRetry(() => import('./components/peserta/PesertaDetailAsesmen'), 'PesertaDetailAsesmen');
const PesertaMateri = lazyWithRetry(() => import('./components/peserta/PesertaMateri'), 'PesertaMateri');
const PesertaDeviceCheck = lazyWithRetry(() => import('./components/peserta/PesertaDeviceCheck'), 'PesertaDeviceCheck');
const PesertaExamPlayer = lazyWithRetry(() => import('./components/peserta/PesertaExamPlayer'), 'PesertaExamPlayer');
const PesertaWaitingRoom = lazyWithRetry(() => import('./components/peserta/PesertaWaitingRoom'), 'PesertaWaitingRoom');
const PesertaInterviewLive = lazyWithRetry(() => import('./components/peserta/PesertaInterviewLive'), 'PesertaInterviewLive');
const PesertaHasilScorecard = lazyWithRetry(() => import('./components/peserta/PesertaHasilScorecard'), 'PesertaHasilScorecard');
const PesertaProfile = lazyWithRetry(() => import('./components/peserta/PesertaProfile'), 'PesertaProfile');
const PesertaOnboarding = lazyWithRetry(() => import('./components/peserta/PesertaOnboarding'), 'PesertaOnboarding');

// Portal Asesor
const AsesorDashboard = lazyWithRetry(() => import('./components/asesor/AsesorDashboard'), 'AsesorDashboard');
const AsesorQueueTable = lazyWithRetry(() => import('./components/asesor/AsesorQueueTable'), 'AsesorQueueTable');
const AsesorLiveConsole = lazyWithRetry(() => import('./components/asesor/AsesorLiveConsole'), 'AsesorLiveConsole');
const AsesorProctoringReview = lazyWithRetry(() => import('./components/asesor/AsesorProctoringReview'), 'AsesorProctoringReview');
const AsesorScoringForm = lazyWithRetry(() => import('./components/asesor/AsesorScoringForm'), 'AsesorScoringForm');
const AsesorRekapProgram = lazyWithRetry(() => import('./components/asesor/AsesorRekapProgram'), 'AsesorRekapProgram');

// Portal Admin
const AdminDashboard = lazyWithRetry(() => import('./components/AdminDashboard'), 'AdminDashboard');
const AdminLogin = lazyWithRetry(() => import('./components/AdminLogin'), 'AdminLogin');

// Public Recruitment Funnel (Lamaran & Wawancara AI Publik)
const ApplicantForm = lazyWithRetry(() => import('./components/ApplicantForm'), 'ApplicantForm');
const InterviewLive = lazyWithRetry(() => import('./components/InterviewLive'), 'InterviewLive');

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null; isChunkError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error) {
    const msg = error?.message || '';
    const isChunk =
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('Loading chunk') ||
      msg.includes('SyntaxError: Unexpected token');
    return { hasError: true, error, isChunkError: isChunk };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    if (this.state.isChunkError) {
      const reloadKey = 'right_app_chunk_reload';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem(reloadKey, now.toString());
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800">Pembaruan Sistem Tersedia</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Versi terbaru dari sistem telah siap. Kami sedang memuat ulang halaman secara otomatis untuk memperbarui sesi Anda...
              </p>
              <div className="pt-2">
                <button
                  onClick={this.handleReload}
                  className="w-full py-2.5 px-4 bg-primary-navy hover:bg-slate-800 text-white rounded-xl font-medium text-sm transition shadow-sm cursor-pointer"
                >
                  Muat Ulang Sekarang
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800">Terjadi Kendala pada Sesi Ini</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Sistem mendeteksi kendala pada antarmuka. Anda dapat memuat ulang halaman untuk memulihkan sesi Anda secara normal.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-primary-navy hover:bg-slate-800 text-white rounded-xl font-medium text-sm transition shadow-sm cursor-pointer"
              >
                Muat Ulang Halaman
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="py-2.5 px-4 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-medium text-sm transition cursor-pointer"
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center bg-page-bg">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary-navy flex items-center justify-center text-white font-bold text-xl shadow-xs animate-pulse">
        T
      </div>
      <div className="w-6 h-6 border-2 border-primary-navy border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-mono text-muted-slate">Memuat Right Engine...</span>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Suspense fallback={<Loader />}>
          <Routes>
            {/* Landing: Multi-Role Hub Selector */}
            <Route path="/" element={<RolePortalSelector />} />

            {/* Auth & Static States */}
            <Route path="/login" element={<AuthLoginPage />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route path="/403" element={<Error403Page />} />
            <Route path="/404" element={<Error404Page />} />
            <Route path="/offline" element={<OfflinePage />} />

            {/* Route Group A: PESERTA (/peserta) */}
            <Route path="/peserta" element={<RequireRole roles={['peserta']}><RequireOnboarding><RequireProfileComplete><RequireDeviceCheck><PesertaDashboard /></RequireDeviceCheck></RequireProfileComplete></RequireOnboarding></RequireRole>} />
            <Route path="/peserta/dashboard" element={<RequireRole roles={['peserta']}><RequireOnboarding><RequireProfileComplete><RequireDeviceCheck><PesertaDashboard /></RequireDeviceCheck></RequireProfileComplete></RequireOnboarding></RequireRole>} />
            <Route path="/peserta/asesmen" element={<RequireRole roles={['peserta']}><RequireOnboarding><RequireProfileComplete><RequireDeviceCheck><PesertaAsesmenList /></RequireDeviceCheck></RequireProfileComplete></RequireOnboarding></RequireRole>} />
            <Route path="/peserta/materi" element={<Navigate to="/peserta/asesmen?tab=materi" replace />} />
            <Route path="/peserta/detail/:id" element={<RequireRole roles={['peserta']}><RequireOnboarding><RequireProfileComplete><RequireDeviceCheck><PesertaDetailAsesmen /></RequireDeviceCheck></RequireProfileComplete></RequireOnboarding></RequireRole>} />
            <Route path="/peserta/device-check" element={<RequireRole roles={['peserta']}><PesertaDeviceCheck /></RequireRole>} />
            <Route path="/peserta/exam/:id" element={<RequireRole roles={['peserta']}><RequireOnboarding><RequireProfileComplete><RequireDeviceCheck><RequireFaceVerified><PesertaExamPlayer /></RequireFaceVerified></RequireDeviceCheck></RequireProfileComplete></RequireOnboarding></RequireRole>} />
            <Route path="/peserta/waiting-room" element={<RequireRole roles={['peserta']}><RequireOnboarding><RequireProfileComplete><RequireDeviceCheck><PesertaWaitingRoom /></RequireDeviceCheck></RequireProfileComplete></RequireOnboarding></RequireRole>} />
            <Route path="/peserta/interview" element={<RequireRole roles={['peserta']}><RequireOnboarding><RequireProfileComplete><RequireDeviceCheck><PesertaInterviewLive /></RequireDeviceCheck></RequireProfileComplete></RequireOnboarding></RequireRole>} />
            <Route path="/peserta/wawancara" element={<Navigate to="/peserta/interview" replace />} />
            <Route path="/peserta/hasil" element={<RequireRole roles={['peserta']}><RequireOnboarding><RequireProfileComplete><RequireDeviceCheck><PesertaHasilScorecard /></RequireDeviceCheck></RequireProfileComplete></RequireOnboarding></RequireRole>} />
            <Route path="/peserta/onboarding" element={<RequireRole roles={['peserta']}><PesertaOnboarding /></RequireRole>} />
            <Route path="/peserta/profile" element={<RequireRole roles={['peserta']}><PesertaProfile /></RequireRole>} />

            {/* Route Group B: ASESOR (/asesor) */}
            <Route path="/asesor" element={<RequireRole roles={['asesor']}><AsesorDashboard /></RequireRole>} />
            <Route path="/asesor/dashboard" element={<RequireRole roles={['asesor']}><AsesorDashboard /></RequireRole>} />
            <Route path="/asesor/interview-queue" element={<RequireRole roles={['asesor']}><AsesorQueueTable /></RequireRole>} />
            <Route path="/asesor/live-console/:id" element={<RequireRole roles={['asesor']}><AsesorLiveConsole /></RequireRole>} />
            <Route path="/asesor/proctoring" element={<RequireRole roles={['asesor']}><AsesorProctoringReview /></RequireRole>} />
            <Route path="/asesor/live-console" element={<Navigate to="/asesor/live-console/KND-0891" replace />} />
            <Route path="/asesor/scoring" element={<Navigate to="/asesor/scoring/KND-0891" replace />} />
            <Route path="/asesor/scoring/:id" element={<RequireRole roles={['asesor']}><AsesorScoringForm /></RequireRole>} />
            <Route path="/asesor/penilaian" element={<Navigate to="/asesor/scoring/KND-0891" replace />} />
            <Route path="/asesor/rekap" element={<RequireRole roles={['asesor']}><AsesorRekapProgram /></RequireRole>} />

            {/* Route Group C: ADMIN (/admin) */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<RequireRole roles={['admin', 'superadmin']}><AdminDashboard /></RequireRole>} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/programs" element={<Navigate to="/admin/dashboard?menu=jobs&builder=1" replace />} />
            <Route path="/admin/bank-soal" element={<Navigate to="/admin/dashboard?menu=bank-soal" replace />} />

            {/* Public Recruitment Funnel */}
            <Route path="/apply" element={<ApplicantForm />} />
            <Route path="/interview/live" element={<InterviewLive />} />

            {/* Fallback */}
            <Route path="*" element={<Error404Page />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
