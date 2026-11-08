import React, { Suspense, lazy, Component, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { RequireRole } from './components/auth/RequireRole';
import { RequireOnboarding } from './components/auth/RequireOnboarding';
import { RequireProfileComplete } from './components/auth/RequireProfileComplete';
import { RequireDeviceCheck } from './components/auth/RequireDeviceCheck';
import { RequireFaceVerified } from './components/auth/RequireFaceVerified';

// Landing & Auth
const RolePortalSelector = lazy(() => import('./components/landing/RolePortalSelector'));
const AuthLoginPage = lazy(() => import('./components/auth/AuthLoginPage'));
const { Error403Page, Error404Page, OfflinePage } = {
  Error403Page: lazy(() => import('./components/auth/StatePages').then(m => ({ default: m.Error403Page }))),
  Error404Page: lazy(() => import('./components/auth/StatePages').then(m => ({ default: m.Error404Page }))),
  OfflinePage: lazy(() => import('./components/auth/StatePages').then(m => ({ default: m.OfflinePage }))),
};

// Portal Peserta
const PesertaDashboard = lazy(() => import('./components/peserta/PesertaDashboard'));
const PesertaAsesmenList = lazy(() => import('./components/peserta/PesertaAsesmenList'));
const PesertaDetailAsesmen = lazy(() => import('./components/peserta/PesertaDetailAsesmen'));
const PesertaMateri = lazy(() => import('./components/peserta/PesertaMateri'));
const PesertaDeviceCheck = lazy(() => import('./components/peserta/PesertaDeviceCheck'));
const PesertaExamPlayer = lazy(() => import('./components/peserta/PesertaExamPlayer'));
const PesertaWaitingRoom = lazy(() => import('./components/peserta/PesertaWaitingRoom'));
const PesertaInterviewLive = lazy(() => import('./components/peserta/PesertaInterviewLive'));
const PesertaHasilScorecard = lazy(() => import('./components/peserta/PesertaHasilScorecard'));
const PesertaProfile = lazy(() => import('./components/peserta/PesertaProfile'));
const PesertaOnboarding = lazy(() => import('./components/peserta/PesertaOnboarding'));

// Portal Asesor
const AsesorDashboard = lazy(() => import('./components/asesor/AsesorDashboard'));
const AsesorQueueTable = lazy(() => import('./components/asesor/AsesorQueueTable'));
const AsesorLiveConsole = lazy(() => import('./components/asesor/AsesorLiveConsole'));
const AsesorProctoringReview = lazy(() => import('./components/asesor/AsesorProctoringReview'));
const AsesorScoringForm = lazy(() => import('./components/asesor/AsesorScoringForm'));
const AsesorRekapProgram = lazy(() => import('./components/asesor/AsesorRekapProgram'));

// Portal Admin
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AdminLogin = lazy(() => import('./components/AdminLogin'));

// Public Recruitment Funnel (Lamaran & Wawancara AI Publik)
const ApplicantForm = lazy(() => import('./components/ApplicantForm'));
const InterviewLive = lazy(() => import('./components/InterviewLive'));

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={{ padding: 24, color: '#dc2626', background: '#fee2e2', fontFamily: 'monospace' }}>
          <h2>Frontend Error Captured:</h2>
          <pre>{this.state.error.message}</pre>
          <pre>{this.state.error.stack}</pre>
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
            <Route path="/peserta" element={<RequireRole roles={['peserta']}><RequireOnboarding><RequireProfileComplete><PesertaDashboard /></RequireProfileComplete></RequireOnboarding></RequireRole>} />
            <Route path="/peserta/dashboard" element={<RequireRole roles={['peserta']}><RequireOnboarding><RequireProfileComplete><PesertaDashboard /></RequireProfileComplete></RequireOnboarding></RequireRole>} />
            <Route path="/peserta/asesmen" element={<RequireRole roles={['peserta']}><RequireOnboarding><RequireProfileComplete><PesertaAsesmenList /></RequireProfileComplete></RequireOnboarding></RequireRole>} />
            <Route path="/peserta/materi" element={<RequireRole roles={['peserta']}><RequireOnboarding><RequireProfileComplete><PesertaMateri /></RequireProfileComplete></RequireOnboarding></RequireRole>} />
            <Route path="/peserta/detail/:id" element={<RequireRole roles={['peserta']}><RequireOnboarding><RequireProfileComplete><PesertaDetailAsesmen /></RequireProfileComplete></RequireOnboarding></RequireRole>} />
            <Route path="/peserta/device-check" element={<RequireRole roles={['peserta']}><PesertaDeviceCheck /></RequireRole>} />
            <Route path="/peserta/exam/:id" element={<RequireRole roles={['peserta']}><RequireOnboarding><RequireProfileComplete><RequireFaceVerified><PesertaExamPlayer /></RequireFaceVerified></RequireProfileComplete></RequireOnboarding></RequireRole>} />
            <Route path="/peserta/waiting-room" element={<RequireRole roles={['peserta']}><RequireOnboarding><RequireProfileComplete><RequireDeviceCheck><PesertaWaitingRoom /></RequireDeviceCheck></RequireProfileComplete></RequireOnboarding></RequireRole>} />
            <Route path="/peserta/interview" element={<RequireRole roles={['peserta']}><RequireOnboarding><RequireProfileComplete><RequireDeviceCheck><PesertaInterviewLive /></RequireDeviceCheck></RequireProfileComplete></RequireOnboarding></RequireRole>} />
            <Route path="/peserta/hasil" element={<RequireRole roles={['peserta']}><RequireOnboarding><RequireProfileComplete><PesertaHasilScorecard /></RequireProfileComplete></RequireOnboarding></RequireRole>} />
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
