import React, { useEffect, useState, useMemo } from 'react';
import PesertaFaqChatbot from '../peserta/PesertaFaqChatbot';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Video,
  ShieldAlert,
  ClipboardCheck,
  FileSpreadsheet,
  LogOut,
  Bell,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Scale,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Info,
  CheckCircle2,
  ChevronDown,
  User
} from 'lucide-react';
import { Badge, Modal, Button } from '../ui';
import { getActiveSessionUser, clearActiveSession } from '../../services/userRegistryService';
import { fetchAssessorCandidates, type AssessorCandidate } from '../../services/assessorService';
import { resolveCandidateReviewStage } from '../../services/asesorReviewState';

interface AsesorLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
}

export function AsesorLayout({ children, activeTab }: AsesorLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('asesor_sidebar_collapsed') === 'true';
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Active asesor session data
  const activeAsesor = useMemo(() => getActiveSessionUser(), []);
  const userInitials = useMemo(() => {
    return (
      activeAsesor.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase() || 'AS'
    );
  }, [activeAsesor.name]);

  // Functional interactive reference modals & dropdown
  const [barsModalOpen, setBarsModalOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifCandidates, setNotifCandidates] = useState<AssessorCandidate[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingStats(true);
    fetchAssessorCandidates()
      .then((data) => {
        if (!cancelled) setNotifCandidates(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingStats(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const proctoringAlerts = notifCandidates.filter(
    (candidate) =>
      (candidate.proctoringFlagCount ?? 0) > 0 ||
      (candidate.integrityScore != null && candidate.integrityScore < 100)
  );
  const totalProctoringEvents = notifCandidates.reduce(
    (sum, candidate) =>
      sum +
      (candidate.proctoringFlagCount ??
        (candidate.integrityScore != null && candidate.integrityScore < 100 ? 1 : 0)),
    0
  );
  const waitingReviewCandidates = notifCandidates.filter((candidate) => {
    const stage = resolveCandidateReviewStage(candidate).stage;
    return stage === 'MENUNGGU_REVIEW' || stage === 'PERLU_TINDAKAN';
  });
  const inReviewCandidates = notifCandidates.filter((candidate) => {
    const stage = resolveCandidateReviewStage(candidate).stage;
    return stage === 'DIREVIEW' || stage === 'FINALISASI';
  });
  const firstConsoleTarget =
    waitingReviewCandidates[0]?.code ||
    inReviewCandidates[0]?.code ||
    notifCandidates[0]?.code ||
    '';
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const modalParam = new URLSearchParams(location.search).get('modal');
    if (modalParam === 'bars') setBarsModalOpen(true);
  }, [location.search]);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('asesor_sidebar_collapsed', String(next));
  };

  const navGroups = [
    {
      group: 'KONSOL PENILAIAN',
      items: [
        { id: 'dashboard', label: 'Dashboard', path: '/asesor/dashboard', icon: LayoutDashboard },
        {
          id: 'queue',
          label: 'Antrean Review',
          path: '/asesor/interview-queue',
          icon: Users,
          badge: loadingStats ? undefined : String(waitingReviewCandidates.length)
        },
        {
          id: 'console',
          label: 'Review Console',
          path: firstConsoleTarget ? `/asesor/review-console/${firstConsoleTarget}` : '/asesor/review-console',
          icon: Video,
          badge: 'BARS'
        },
        {
          id: 'proctoring',
          label: 'Review Proctoring',
          path: '/asesor/proctoring',
          icon: ShieldAlert,
          badge: loadingStats ? undefined : String(totalProctoringEvents)
        },
        { id: 'scoring', label: 'Penilaian & LHA', path: '/asesor/scoring', icon: ClipboardCheck, badge: 'E-Sign' },
        { id: 'rekap', label: 'Rekap Program', path: '/asesor/rekap', icon: FileSpreadsheet },
      ]
    },
    {
      group: 'METODOLOGI & STANDAR',
      items: [
        { id: 'bars', label: 'Standar Rubrik BARS (1-5)', action: () => setBarsModalOpen(true), icon: Scale },
      ]
    }
  ];

  const getActiveTitle = () => {
    for (const grp of navGroups) {
      for (const itm of grp.items) {
        if ('path' in itm && (activeTab === itm.id || location.pathname === itm.path)) {
          return itm.label;
        }
      }
    }
    return 'Portal Asesor';
  };

  return (
    <div className="min-h-screen bg-page-bg text-ink flex font-sans antialiased overflow-x-hidden">
      {/* ─── Mobile Overlay Backdrop ─── */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 lg:hidden transition-opacity"
        />
      )}

      {/* ═══════════════════════════════════════════════════════════
          SIDEBAR NAVIGATION (ROLE ASESOR)
      ═══════════════════════════════════════════════════════════ */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 lg:z-30 bg-white border-r border-border-slate flex flex-col transition-all duration-200 select-none print:hidden ${
          isCollapsed ? 'w-20' : 'w-68'
        } ${
          mobileDrawerOpen
            ? 'translate-x-0 !w-68 shadow-2xl'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`h-18 flex items-center border-b border-border-slate shrink-0 transition-all ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-5'
          }`}
        >
          {isCollapsed ? (
            <button
              onClick={toggleCollapse}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-center p-1.5 shadow-2xs cursor-pointer transition-transform hover:scale-105 group relative overflow-hidden"
              title="Perluas Sidebar (Right Asesor)"
            >
              <img src="/img/logo-symbol.png" alt="RIGHT" className="h-full w-full object-contain" />
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                Perluas Sidebar
              </span>
            </button>
          ) : (
            <>
              <div
                onClick={() => navigate('/asesor/dashboard')}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
              >
                <img
                  src="/img/logoRIght.jpeg"
                  alt="RIGHT Assessment Platform"
                  className="h-9 w-auto max-w-[165px] object-contain group-hover:opacity-90 transition-opacity"
                />
                <span className="text-[10px] font-sans font-bold uppercase tracking-wide bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                  Asesor
                </span>
              </div>

              <button
                onClick={toggleCollapse}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer hidden lg:flex"
                title="Ciutkan Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="p-1 text-slate-500 hover:text-slate-800 lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Assessor Pill */}
        {isCollapsed ? (
          <div className="py-3 flex justify-center border-b border-slate-100">
            <div
              className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 font-bold text-xs font-heading cursor-pointer group relative shadow-2xs"
              title={`${activeAsesor.name} (${activeAsesor.companyName || 'Asesor'})`}
            >
              {userInitials}
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                {activeAsesor.name} • {activeAsesor.specialization || 'Asesor Penguji'}
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-3.5 mt-3 mb-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm font-heading shrink-0 shadow-xs">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate leading-tight">
                  {activeAsesor.name}
                </p>
                <p className="text-xs font-sans text-slate-500 truncate mt-0.5">
                  {activeAsesor.companyName || 'Asesor Evaluator'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Nav Groups */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              {!isCollapsed && (
                <div className="px-3 pt-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase font-sans">
                  {group.group}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isPath = 'path' in item;
                const isActive = isPath && (activeTab === item.id || location.pathname === item.path);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if ('action' in item && typeof item.action === 'function') {
                        item.action();
                      } else if ('path' in item && item.path) {
                        navigate(item.path);
                      }
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all cursor-pointer relative group ${
                      isActive
                        ? 'bg-amber-50 text-amber-950 font-semibold shadow-2xs border border-amber-200'
                        : 'text-slate-600 hover:text-ink hover:bg-slate-100'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-amber-700' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />

                    {!isCollapsed && (
                      <>
                        <span className="truncate flex-1 text-left">{item.label}</span>
                        {'badge' in item && item.badge && (
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-semibold tabular-nums shrink-0 ${
                              isActive
                                ? 'bg-amber-900 text-white'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}

                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Switcher */}
        <div className="p-3.5 border-t border-border-slate shrink-0">
          <button
            onClick={() => { clearActiveSession(); navigate('/'); }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-muted-slate hover:text-error-red hover:bg-red-50 transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Keluar / Ganti Peran"
          >
            <LogOut className="w-4.5 h-4.5" />
            {!isCollapsed && <span>Keluar / Ganti Peran</span>}
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
          MAIN WRAPPER & TOPBAR (OFFSET)
      ═══════════════════════════════════════════════════════════ */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 print:ml-0 print:p-0 ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-68'
        }`}
      >
        {/* Topbar */}
        <header className="h-18 bg-white border-b border-border-slate px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-ink hover:bg-slate-100 rounded-lg cursor-pointer"
              title="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Expand Button if Collapsed */}
            {isCollapsed && (
              <button
                onClick={toggleCollapse}
                className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer mr-1"
                title="Perluas Sidebar"
              >
                <PanelLeftOpen className="w-4.5 h-4.5" />
              </button>
            )}

            {/* Breadcrumb Info */}
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-slate truncate">
              <span className="font-semibold text-slate-500">Right</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500">Asesor</span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-ink truncate">{getActiveTitle()}</span>
            </div>
          </div>

          {/* Right Topbar Indicators */}
          <div className="flex items-center gap-3">
            {/* Pending Reviews Telemetry */}
            <button
              type="button"
              onClick={() => navigate('/asesor/interview-queue?status=MENUNGGU_REVIEW')}
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 rounded-full text-amber-900 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>{waitingReviewCandidates.length} Menunggu Review</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setNotifModalOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer relative"
              title="Notifikasi Asesor"
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
            </button>

            {/* Profile Dropdown Navigation (Top Right - Matching Peserta Style) */}
            <div className="relative pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1 -mr-1 rounded-2xl hover:bg-slate-100 transition-all cursor-pointer group"
                title="Buka Menu Asesor"
              >
                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs font-heading shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  {userInitials}
                </div>
                <div className="hidden md:block text-left">
                  <div className="flex items-center gap-1">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight group-hover:text-amber-900 transition-colors">
                      {activeAsesor.name}
                    </p>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <p className="text-xs font-sans text-slate-500 mt-0.5 truncate max-w-[170px]">
                    {activeAsesor.companyName || 'Asesor Evaluator'}
                  </p>
                </div>
              </button>

              {/* Profile Popover Menu (Enlarged & Matching Peserta Portal) */}
              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-border-slate rounded-xl shadow-lg py-1.5 z-50">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-bold text-ink truncate">{activeAsesor.name}</p>
                      <p className="text-xs text-muted-slate truncate">{activeAsesor.username}</p>
                    </div>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('/asesor/dashboard');
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <LayoutDashboard className="w-4 h-4 text-slate-400" />
                      <span>Dashboard Asesor</span>
                    </button>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setBarsModalOpen(true);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Scale className="w-4 h-4 text-slate-400" />
                      <span>Panduan Rubrik BARS</span>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        clearActiveSession();
                        navigate('/login');
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Keluar dari Akun</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Canvas */}
        <main className="flex-1 w-full p-0">{children}</main>
      </div>

      {/* ─── MODAL STANDAR RUBRIK BARS (1 - 5) ─── */}
      <Modal
        isOpen={barsModalOpen}
        onClose={() => setBarsModalOpen(false)}
        title="Standar Rubrik BARS (Behaviorally Anchored Rating Scale)"
        size="lg"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p className="text-slate-600 leading-relaxed">
            Metodologi BARS mengaitkan setiap level skor (1.0 s.d 5.0) dengan indikator perilaku kerja riil untuk menjamin objektivitas evaluasi asesor:
          </p>
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
              <span className="font-mono font-bold text-red-700 bg-white px-2 py-0.5 rounded shadow-2xs">Skor 1.0</span>
              <div>
                <p className="font-bold text-red-900">Belum Memenuhi (Unsatisfactory)</p>
                <p className="text-red-800 text-[11px] mt-0.5">Tidak mengenali masalah pokok, menghindari tanggung jawab, atau memberikan solusi yang merugikan operasional.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <span className="font-mono font-bold text-amber-800 bg-white px-2 py-0.5 rounded shadow-2xs">Skor 2.0</span>
              <div>
                <p className="font-bold text-amber-900">Perlu Pengembangan (Needs Development)</p>
                <p className="text-amber-800 text-[11px] mt-0.5">Mengenali gejala masalah namun kesulitan menentukan akar penyebab dan skala prioritas mitigasi.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded shadow-2xs">Skor 3.0</span>
              <div>
                <p className="font-bold text-blue-900">Memenuhi Ekspektasi (Proficient / Baseline Standard)</p>
                <p className="text-blue-800 text-[11px] mt-0.5">Memetakan masalah operasional dengan tepat, memprioritaskan tindakan mendesak, dan merumuskan solusi standar yang logis.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <span className="font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded shadow-2xs">Skor 4.0</span>
              <div>
                <p className="font-bold text-emerald-900">Melampaui Ekspektasi (Strong Competency)</p>
                <p className="text-emerald-800 text-[11px] mt-0.5">Analisis komprehensif lintas dimensi (teknis, finansial, kepuasan nasabah) dengan rencana mitigasi risiko yang matang.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-start gap-3">
              <span className="font-mono font-bold text-purple-700 bg-white px-2 py-0.5 rounded shadow-2xs">Skor 5.0</span>
              <div>
                <p className="font-bold text-purple-900">Sangat Unggul / Teladan (Role Model / Exceptional)</p>
                <p className="text-purple-800 text-[11px] mt-0.5">Kecakapan strategis tingkat pimpinan; mampu menemukan efisiensi biaya inovatif dan solusi sistemik jangka panjang.</p>
              </div>
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <Button variant="primary" onClick={() => setBarsModalOpen(false)} className="text-xs">
              Tutup Referensi
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── MODAL NOTIFIKASI ASESOR ─── */}
      <Modal
        isOpen={notifModalOpen}
        onClose={() => setNotifModalOpen(false)}
        title="Notifikasi & Peringatan Asesor"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">{totalProctoringEvents} Event Proctoring Menunggu Verifikasi</p>
              <p className="text-amber-800 text-[11px] mt-0.5">{totalProctoringEvents > 0 ? `${totalProctoringEvents} event tercatat pada ${proctoringAlerts.length} kandidat (${proctoringAlerts.slice(0, 3).map((candidate) => candidate.name).join(', ')}).` : 'Tidak ada temuan integritas yang menunggu verifikasi.'}</p>
              <button
                onClick={() => {
                  setNotifModalOpen(false);
                  navigate('/asesor/proctoring');
                }}
                className="text-amber-900 font-bold underline mt-1 block cursor-pointer"
              >
                Buka Layar Review Proctoring →
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
            <Users className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-950">Sesi Wawancara Ava AI Menunggu Review</p>
              <p className="text-blue-800 text-[11px] mt-0.5">
                {waitingReviewCandidates.length > 0
                  ? `${waitingReviewCandidates.length} sesi menunggu review / tindakan (termasuk ${waitingReviewCandidates[0].name} • ${waitingReviewCandidates[0].code}).`
                  : 'Semua sesi wawancara AI saat ini sudah direview.'}
              </p>
              <button
                onClick={() => {
                  setNotifModalOpen(false);
                  navigate('/asesor/interview-queue?status=MENUNGGU_REVIEW');
                }}
                className="text-blue-900 font-bold underline mt-1 block cursor-pointer"
              >
                Buka Antrean Review →
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="outline" onClick={() => setNotifModalOpen(false)} className="text-xs">
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      <PesertaFaqChatbot />
    </div>
  );
}
