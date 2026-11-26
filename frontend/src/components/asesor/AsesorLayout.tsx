import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Code2,
  MessageSquare,
  ClipboardCheck,
  LogOut,
  Bell,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Scale,
  ChevronDown,
  FileCheck2
} from 'lucide-react';
import { Modal, Button } from '../ui';
import { getActiveSessionUser, clearActiveSession } from '../../services/userRegistryService';
import { logoutPortal } from '../../services/portalAuthService';
import { fetchAssessorCandidates, type AssessorCandidate } from '../../services/assessorService';

export const ASESOR_DATA_UPDATED_EVENT = 'asesor:data-updated';

export const emitAsesorDataUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ASESOR_DATA_UPDATED_EVENT));
  }
};

interface AsesorLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
}

export const resolveAsesorSessionUser = () => {
  try {
    const portalRaw = localStorage.getItem('portalUser');
    if (portalRaw) {
      const portal = JSON.parse(portalRaw);
      if (portal?.role === 'asesor' && portal?.name) {
        return {
          ...getActiveSessionUser(),
          id: portal.id || '',
          name: portal.name,
          username: portal.email || portal.username || '',
          role: 'asesor' as const,
          companyId: portal.companyId || undefined,
          companyName: portal.companyName || undefined,
          specialization: portal.specialization || undefined
        };
      }
    }
  } catch {
    // ignore storage errors
  }

  const session = getActiveSessionUser();
  if (session.role === 'asesor' && session.name) {
    return session;
  }

  const savedAsesorName = localStorage.getItem('asesorName') || localStorage.getItem('asesorUsername');
  if (savedAsesorName && !/^(superadmin|admin)$/i.test(savedAsesorName.trim())) {
    return {
      ...session,
      name: savedAsesorName.trim(),
      role: 'asesor' as const
    };
  }

  return {
    ...session,
    name: session.role === 'asesor' && session.name ? session.name : 'Asesor Evaluator',
    role: 'asesor' as const
  };
};

export function AsesorLayout({ children, activeTab }: AsesorLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('asesor_sidebar_collapsed') === 'true';
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const activeAsesor = useMemo(() => resolveAsesorSessionUser(), []);
  const userInitials = useMemo(() => {
    return (
      String(activeAsesor.name || 'AS')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w: string) => w[0])
        .join('')
        .toUpperCase() || 'AS'
    );
  }, [activeAsesor.name]);

  const [barsModalOpen, setBarsModalOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifCandidates, setNotifCandidates] = useState<AssessorCandidate[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const refreshStats = useCallback(() => {
    let cancelled = false;
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

  useEffect(() => {
    const cancel = refreshStats();
    const handleUpdate = () => {
      void refreshStats();
    };
    window.addEventListener(ASESOR_DATA_UPDATED_EVENT, handleUpdate);
    return () => {
      cancel();
      window.removeEventListener(ASESOR_DATA_UPDATED_EVENT, handleUpdate);
    };
  }, [refreshStats]);

  const interviewDoneCandidates = notifCandidates.filter((candidate) => Boolean(candidate.interviewDone));
  const interviewPendingBarsCandidates = interviewDoneCandidates.filter(
    (candidate) => candidate.gpaScore == null || candidate.barsAverage == null
  );
  const readyLhaCandidates = notifCandidates.filter(
    (candidate) => candidate.gpaScore != null && candidate.lhaStatus !== 'signed'
  );
  const totalPendingActions = interviewPendingBarsCandidates.length + readyLhaCandidates.length;

  useEffect(() => {
    const modalParam = new URLSearchParams(location.search).get('modal');
    if (modalParam === 'bars') setBarsModalOpen(true);
  }, [location.search]);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('asesor_sidebar_collapsed', String(next));
  };

  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    await logoutPortal();
    clearActiveSession();
    navigate('/login', { replace: true });
  };

  const navGroups = [
    {
      group: 'ALUR EVALUASI',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard & Tracking',
          path: '/asesor/dashboard',
          icon: LayoutDashboard,
          badge: !loadingStats && notifCandidates.length > 0 ? String(notifCandidates.length) : undefined
        },
        {
          id: 'hasil-cat',
          label: 'Hasil CAT & Coding',
          path: '/asesor/hasil-cat',
          icon: Code2
        },
        {
          id: 'hasil-interview',
          label: 'Interview & BARS',
          path: '/asesor/hasil-interview',
          icon: MessageSquare,
          badge:
            !loadingStats && interviewPendingBarsCandidates.length > 0
              ? String(interviewPendingBarsCandidates.length)
              : undefined
        },
        {
          id: 'rekap-lha',
          label: 'Rekap & LHA',
          path: '/asesor/rekap-lha',
          icon: ClipboardCheck,
          badge:
            !loadingStats && readyLhaCandidates.length > 0
              ? String(readyLhaCandidates.length)
              : undefined
        }
      ]
    },
    {
      group: 'REFERENSI',
      items: [
        {
          id: 'bars',
          label: 'Standar Rubrik BARS (1-5)',
          action: () => setBarsModalOpen(true),
          icon: Scale
        }
      ]
    }
  ];

  const getActiveTitle = () => {
    for (const grp of navGroups) {
      for (const itm of grp.items) {
        if (
          'path' in itm &&
          (activeTab === itm.id ||
            location.pathname === itm.path ||
            location.pathname.startsWith(`${itm.path}/`))
        ) {
          return itm.label;
        }
      }
    }
    return 'Portal Asesor';
  };

  return (
    <div className="min-h-screen bg-page-bg text-ink flex font-sans antialiased overflow-x-hidden">
      {/* Mobile Overlay Backdrop */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 lg:hidden transition-opacity"
        />
      )}

      {/* SIDEBAR NAVIGATION */}
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
              type="button"
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
                type="button"
                onClick={toggleCollapse}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer hidden lg:flex"
                title="Ciutkan Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            className="p-1 text-slate-500 hover:text-slate-800 lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Groups */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5">
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
                const isActive =
                  isPath &&
                  (activeTab === item.id ||
                    location.pathname === item.path ||
                    location.pathname.startsWith(`${item.path}/`));

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

        {/* Bottom Logout */}
        <div className="p-3.5 border-t border-border-slate shrink-0">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-muted-slate hover:text-error-red hover:bg-red-50 transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Keluar dari Akun"
          >
            <LogOut className="w-4.5 h-4.5" />
            {!isCollapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* MAIN WRAPPER & TOPBAR */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 print:ml-0 print:p-0 ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-68'
        }`}
      >
        <header className="h-18 bg-white border-b border-border-slate px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-ink hover:bg-slate-100 rounded-lg cursor-pointer"
              title="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {isCollapsed && (
              <button
                type="button"
                onClick={toggleCollapse}
                className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer mr-1"
                title="Perluas Sidebar"
              >
                <PanelLeftOpen className="w-4.5 h-4.5" />
              </button>
            )}

            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-slate truncate">
              <span className="font-semibold text-slate-500">Right</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500">Asesor</span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-ink truncate">{getActiveTitle()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Action Telemetry Pill */}
            <button
              type="button"
              onClick={() =>
                navigate(
                  interviewPendingBarsCandidates.length > 0
                    ? `/asesor/hasil-interview/${interviewPendingBarsCandidates[0].code}`
                    : readyLhaCandidates.length > 0
                      ? `/asesor/rekap-lha/${readyLhaCandidates[0].code}`
                      : '/asesor/rekap-lha'
                )
              }
              className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 border rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                totalPendingActions > 0
                  ? 'bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 hover:bg-emerald-100/70 border-emerald-200 text-emerald-900'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  totalPendingActions > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                }`}
              />
              <span className="tabular-nums">
                {interviewPendingBarsCandidates.length > 0
                  ? `${interviewPendingBarsCandidates.length} Belum Nilai BARS`
                  : readyLhaCandidates.length > 0
                    ? `${readyLhaCandidates.length} Siap E-Sign LHA`
                    : `${interviewDoneCandidates.length} Interview Dinilai`}
              </span>
            </button>

            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setNotifModalOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer relative"
              title="Notifikasi Asesor"
            >
              <Bell className="w-4.5 h-4.5" />
              {totalPendingActions > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
              )}
            </button>

            {/* Compact Profile Dropdown */}
            <div className="relative pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1 -mr-1 rounded-2xl hover:bg-slate-100 transition-all cursor-pointer group"
                title="Profil Asesor"
              >
                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs font-heading shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  {userInitials}
                </div>
                <div className="hidden md:block text-left">
                  <div className="flex items-center gap-1">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight group-hover:text-amber-900 transition-colors">
                      {activeAsesor.name}
                    </p>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                        profileDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <p className="text-xs font-sans text-slate-500 mt-0.5 truncate max-w-[170px]">
                    {activeAsesor.companyName || 'Asesor Evaluator'}
                  </p>
                </div>
              </button>

              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-60 bg-white border border-border-slate rounded-xl shadow-lg py-1.5 z-50">
                    <div className="px-4 py-2.5 border-b border-slate-100 space-y-0.5">
                      <p className="text-sm font-bold text-ink truncate">{activeAsesor.name}</p>
                      <p className="text-xs text-muted-slate truncate">{activeAsesor.username}</p>
                      {activeAsesor.specialization && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-block mt-1">
                          {activeAsesor.specialization}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleLogout()}
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

        <main className="flex-1 w-full p-0">{children}</main>
      </div>

      {/* MODAL STANDAR RUBRIK BARS (1 - 5) */}
      <Modal
        isOpen={barsModalOpen}
        onClose={() => setBarsModalOpen(false)}
        title="Standar Rubrik BARS (Behaviorally Anchored Rating Scale)"
        size="lg"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p className="text-slate-600 leading-relaxed">
            Metodologi BARS mengaitkan setiap level skor (1.0 s.d 5.0) dengan indikator perilaku kerja riil dan dikonversi langsung menjadi GPA (0.00–4.00):
          </p>
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
              <span className="font-mono font-bold text-red-700 bg-white px-2 py-0.5 rounded shadow-2xs shrink-0">Skor 1.0</span>
              <div>
                <p className="font-bold text-red-900">Belum Memenuhi (Unsatisfactory)</p>
                <p className="text-red-800 text-[11px] mt-0.5">Tidak mengenali masalah pokok, menghindari tanggung jawab, atau memberikan solusi yang merugikan operasional.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <span className="font-mono font-bold text-amber-800 bg-white px-2 py-0.5 rounded shadow-2xs shrink-0">Skor 2.0</span>
              <div>
                <p className="font-bold text-amber-900">Perlu Pengembangan (Needs Development)</p>
                <p className="text-amber-800 text-[11px] mt-0.5">Mengenali gejala masalah namun kesulitan menentukan akar penyebab dan skala prioritas mitigasi.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded shadow-2xs shrink-0">Skor 3.0</span>
              <div>
                <p className="font-bold text-blue-900">Memenuhi Ekspektasi (Proficient / Baseline Standard)</p>
                <p className="text-blue-800 text-[11px] mt-0.5">Memetakan masalah operasional dengan tepat, memprioritaskan tindakan mendesak, dan merumuskan solusi standar yang logis.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <span className="font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded shadow-2xs shrink-0">Skor 4.0</span>
              <div>
                <p className="font-bold text-emerald-900">Melampaui Ekspektasi (Strong Competency)</p>
                <p className="text-emerald-800 text-[11px] mt-0.5">Analisis komprehensif lintas dimensi dengan rencana mitigasi risiko yang matang.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-start gap-3">
              <span className="font-mono font-bold text-purple-700 bg-white px-2 py-0.5 rounded shadow-2xs shrink-0">Skor 5.0</span>
              <div>
                <p className="font-bold text-purple-900">Sangat Unggul / Teladan (Role Model / Exceptional)</p>
                <p className="text-purple-800 text-[11px] mt-0.5">Kecakapan strategis tingkat pimpinan; mampu menemukan efisiensi inovatif dan solusi sistemik jangka panjang.</p>
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

      {/* MODAL NOTIFIKASI ASESOR */}
      <Modal
        isOpen={notifModalOpen}
        onClose={() => setNotifModalOpen(false)}
        title="Notifikasi & Tugas Asesor"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">
                {interviewPendingBarsCandidates.length} Interview Menunggu Penilaian BARS
              </p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                {interviewPendingBarsCandidates.length > 0
                  ? `${interviewPendingBarsCandidates.length} sesi wawancara Ava AI belum dinilai BARS (termasuk ${interviewPendingBarsCandidates[0].name} • ${interviewPendingBarsCandidates[0].code}).`
                  : 'Semua sesi wawancara yang selesai sudah memiliki nilai BARS & GPA.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setNotifModalOpen(false);
                  navigate(
                    interviewPendingBarsCandidates.length > 0
                      ? `/asesor/hasil-interview/${interviewPendingBarsCandidates[0].code}`
                      : '/asesor/hasil-interview'
                  );
                }}
                className="text-amber-900 font-bold underline mt-1 block cursor-pointer"
              >
                Buka Interview &amp; BARS →
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
            <FileCheck2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-950">
                {readyLhaCandidates.length} LHA Siap Ditandatangani (E-Sign)
              </p>
              <p className="text-blue-800 text-[11px] mt-0.5">
                {readyLhaCandidates.length > 0
                  ? `${readyLhaCandidates.length} peserta sudah dinilai BARS & GPA dan siap diterbitkan LHA resmi (termasuk ${readyLhaCandidates[0].name}).`
                  : 'Tidak ada antrean LHA yang menunggu tanda tangan digital.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setNotifModalOpen(false);
                  navigate(
                    readyLhaCandidates.length > 0
                      ? `/asesor/rekap-lha/${readyLhaCandidates[0].code}`
                      : '/asesor/rekap-lha'
                  );
                }}
                className="text-blue-900 font-bold underline mt-1 block cursor-pointer"
              >
                Buka Rekap &amp; LHA →
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
    </div>
  );
}
