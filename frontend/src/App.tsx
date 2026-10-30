import React, { Suspense, lazy, Component, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Landing & Auth
const RolePortalSelector = lazy(() => import('./components/landing/RolePortalSelector'));
const AuthLoginPage = lazy(() => import('./components/auth/AuthLoginPage'));
const AuthRegisterPage = lazy(() => import('./components/auth/AuthRegisterPage'));
const { Error403Page, Error404Page, OfflinePage } = {
  Error403Page: lazy(() => import('./components/auth/StatePages').then(m => ({ default: m.Error403Page }))),
  Error404Page: lazy(() => import('./components/auth/StatePages').then(m => ({ default: m.Error404Page }))),
  OfflinePage: lazy(() => import('./components/auth/StatePages').then(m => ({ default: m.OfflinePage }))),
};

// Portal Peserta
const PesertaDashboard = lazy(() => import('./components/peserta/PesertaDashboard'));
const PesertaAsesmenList = lazy(() => import('./components/peserta/PesertaAsesmenList'));
const PesertaDetailAsesmen = lazy(() => import('./components/peserta/PesertaDetailAsesmen'));
const PesertaDeviceCheck = lazy(() => import('./components/peserta/PesertaDeviceCheck'));
const PesertaExamPlayer = lazy(() => import('./components/peserta/PesertaExamPlayer'));
const PesertaWaitingRoom = lazy(() => import('./components/peserta/PesertaWaitingRoom'));
const PesertaInterviewLive = lazy(() => import('./components/peserta/PesertaInterviewLive'));
const PesertaHasilScorecard = lazy(() => import('./components/peserta/PesertaHasilScorecard'));
const PesertaProfile = lazy(() => import('./components/peserta/PesertaProfile'));

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
      <span className="text-xs font-mono text-muted-slate">Memuat Talenta+ Engine...</span>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      {/* Skip-to-content link for keyboard users */}
      <a href="#main-content" className="skip-to-content">
        Langsung ke konten utama
      </a>
      <ErrorBoundary>
        <Suspense fallback={<Loader />}>
          <Routes>
            {/* Landing: Multi-Role Hub Selector */}
            <Route path="/" element={<RolePortalSelector />} />

            {/* Auth & Static States */}
            <Route path="/login" element={<AuthLoginPage />} />
            <Route path="/register" element={<AuthRegisterPage />} />
            <Route path="/403" element={<Error403Page />} />
            <Route path="/404" element={<Error404Page />} />
            <Route path="/offline" element={<OfflinePage />} />

            {/* Route Group A: PESERTA (/peserta) */}
            <Route path="/peserta" element={<PesertaDashboard />} />
            <Route path="/peserta/dashboard" element={<PesertaDashboard />} />
            <Route path="/peserta/asesmen" element={<PesertaAsesmenList />} />
            <Route path="/peserta/detail/:id" element={<PesertaDetailAsesmen />} />
            <Route path="/peserta/device-check" element={<PesertaDeviceCheck />} />
            <Route path="/peserta/exam/:id" element={<PesertaExamPlayer />} />
            <Route path="/peserta/waiting-room" element={<PesertaWaitingRoom />} />
            <Route path="/peserta/interview" element={<PesertaInterviewLive />} />
            <Route path="/peserta/hasil" element={<PesertaHasilScorecard />} />
            <Route path="/peserta/profile" element={<PesertaProfile />} />

            {/* Route Group B: ASESOR (/asesor) */}
            <Route path="/asesor" element={<AsesorDashboard />} />
            <Route path="/asesor/dashboard" element={<AsesorDashboard />} />
            <Route path="/asesor/interview-queue" element={<AsesorQueueTable />} />
            <Route path="/asesor/live-console/:id" element={<AsesorLiveConsole />} />
            <Route path="/asesor/proctoring" element={<AsesorProctoringReview />} />
            <Route path="/asesor/scoring" element={<Navigate to="/asesor/scoring/demo" replace />} />
            <Route path="/asesor/scoring/:id" element={<AsesorScoringForm />} />
            <Route path="/asesor/penilaian" element={<Navigate to="/asesor/scoring/demo" replace />} />
            <Route path="/asesor/rekap" element={<AsesorRekapProgram />} />

            {/* Route Group C: ADMIN (/admin) */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Fallback */}
            <Route path="*" element={<Error404Page />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
