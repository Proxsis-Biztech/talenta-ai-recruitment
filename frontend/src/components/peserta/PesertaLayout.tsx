import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck2,
  Bell,
  LogOut,
  HelpCircle,
  ShieldCheck,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  Sparkles,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  HeartHandshake,
  Calendar,
  AlertTriangle,
  Phone,
  Mail,
  FileText,
  User,
  Info,
  MapPin,
  Compass
} from 'lucide-react';
import { Badge, Modal, Button } from '../ui';
import { getActiveSessionUser, clearActiveSession } from '../../services/userRegistryService';

interface PesertaLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
}

export function PesertaLayout({ children, activeTab }: PesertaLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('peserta_sidebar_collapsed') === 'true';
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Active candidate session data
  const activeUser = useMemo(() => getActiveSessionUser(), []);
  const userInitials = useMemo(() => {
    return (
      activeUser.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase() || 'P'
    );
  }, [activeUser.name]);

  // Check if CAT is completed
  const isCatCompleted = useMemo(() => {
    return localStorage.getItem('talenta_cat_completed') === 'true';
  }, []);

  // Functional interactive modals & dropdowns
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [helpActiveTab, setHelpActiveTab] = useState<'roadmap' | 'korelasi' | 'faq'>('roadmap');
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const savedFacePhoto = localStorage.getItem('candidate_face_photo');

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('peserta_sidebar_collapsed', String(next));
  };

  const navGroups = [
    {
      group: 'NAVIGASI UTAMA',
      items: [
        { id: 'dashboard', label: 'Dashboard Peserta', path: '/peserta', icon: LayoutDashboard },
        { id: 'asesmen', label: 'Asesmen Saya', path: '/peserta/asesmen', icon: FileCheck2, badge: '1 Aktif' },
        { id: 'profile', label: 'Profil Saya', path: '/peserta/profile', icon: User },
      ]
    },
    {
      group: 'BANTUAN & PANDUAN',
      items: [
        { id: 'help', label: 'Panduan & Alur Asesmen', action: () => setHelpModalOpen(true), icon: HelpCircle },
        { id: 'terms', label: 'Pakta Integritas & UU PDP', action: () => setTermsModalOpen(true), icon: ShieldCheck },
      ]
    }
  ];

  const pageTitleMap: Record<string, string> = {
    '/peserta/device-check': 'Uji Kesiapan Perangkat',
    '/peserta/waiting-room': 'Ruang Tunggu Asesor',
    '/peserta/interview': 'Wawancara Live Asesor',
    '/peserta/hasil': 'Hasil & Nilai Akhir',
    '/peserta/profile': 'Profil Saya',
    '/peserta/asesmen': 'Asesmen Saya',
    '/peserta': 'Dashboard Peserta',
  };

  const getActiveTitle = () => {
    for (const grp of navGroups) {
      for (const itm of grp.items) {
        if ('path' in itm && (activeTab === itm.id || location.pathname === itm.path)) {
          return itm.label;
        }
      }
    }
    for (const [pathPrefix, title] of Object.entries(pageTitleMap)) {
      if (location.pathname.startsWith(pathPrefix)) {
        return title;
      }
    }
    if (location.pathname.includes('/peserta/exam')) {
      return 'Ujian CAT';
    }
    return 'Portal Peserta';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex font-sans antialiased overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      {/* ─── Mobile Overlay Backdrop ─── */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 lg:hidden transition-opacity"
        />
      )}

      {/* ═══════════════════════════════════════════════════════════
          USER-FRIENDLY SIDEBAR NAVIGATION (PESERTA)
      ═══════════════════════════════════════════════════════════ */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 lg:z-30 bg-white border-r border-slate-200/80 flex flex-col transition-all duration-200 select-none shadow-xs ${
          isCollapsed ? 'w-20' : 'w-72'
        } ${
          mobileDrawerOpen
            ? 'translate-x-0 !w-72 shadow-2xl'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`h-20 flex items-center border-b border-slate-100 shrink-0 transition-all ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-6'
          }`}
        >
          {isCollapsed ? (
            <button
              onClick={toggleCollapse}
              className="w-11 h-11 rounded-2xl bg-primary-navy hover:bg-slate-900 flex items-center justify-center text-white font-extrabold text-xl shadow-sm cursor-pointer transition-transform hover:scale-105 group relative"
              title="Perluas Menu Sidebar"
            >
              <span>T</span>
              <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                Perluas Menu
              </span>
            </button>
          ) : (
            <>
              <div
                onClick={() => navigate('/')}
                className="flex items-center gap-3 min-w-0 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-navy to-blue-accent text-white flex items-center justify-center font-extrabold text-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  T
                </div>
                <div className="flex flex-col truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold tracking-tight text-slate-900 font-heading">
                      Talenta<span className="text-blue-accent">+</span>
                    </span>
                    <span className="text-xs font-semibold bg-blue-50 text-primary-navy px-2 py-0.5 rounded-full border border-blue-200/60">
                      Peserta
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    Ruang Asesmen Mandiri
                  </span>
                </div>
              </div>

              <button
                onClick={toggleCollapse}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer hidden lg:flex"
                title="Ciutkan Menu"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="p-2 text-slate-500 hover:text-slate-800 lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Friendly Candidate Profile Card */}
        {isCollapsed ? (
          <div className="py-4 flex justify-center border-b border-slate-100">
            <div
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-navy to-blue-accent text-white flex items-center justify-center font-bold text-sm shadow-xs cursor-pointer group relative"
              title={`${activeUser.name} (${activeUser.id})`}
            >
              {userInitials}
              <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                {activeUser.name} • {activeUser.id}
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-4 mt-4 mb-2 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-navy to-blue-accent text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate leading-tight">
                  {activeUser.name}
                </p>
                <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
                  ID: {activeUser.id}
                </p>
              </div>
            </div>

            {/* Assessment Progress Stepper Pill */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Status Anda:</span>
              <span className="font-semibold text-primary-navy bg-soft-blue px-2.5 py-0.5 rounded-full border border-accent-border">
                {isCatCompleted ? 'Menuju Wawancara' : 'Tahap Ujian CAT'}
              </span>
            </div>
            <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-primary-navy h-full rounded-full transition-all duration-300"
                style={{ width: isCatCompleted ? '75%' : '40%' }}
              />
            </div>
          </div>
        )}

        {/* Scrollable Nav Item Groups */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-5">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              {!isCollapsed && (
                <div className="px-3 pt-1 text-xs font-bold tracking-wider text-slate-400 uppercase">
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
                    onClick={() => {
                      if ('action' in item && typeof item.action === 'function') {
                        item.action();
                      } else if ('path' in item && item.path) {
                        navigate(item.path);
                      }
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer relative group ${
                      isActive
                        ? 'bg-blue-50 text-primary-navy font-bold shadow-2xs border border-blue-200/70'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon
                      className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                        isActive ? 'text-blue-accent' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />

                    {!isCollapsed && (
                      <>
                        <span className="truncate flex-1 text-left">{item.label}</span>
                        {'badge' in item && item.badge && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                              isActive
                                ? 'bg-primary-navy text-white'
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
                      <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Support Footer */}
        <div className="p-3.5 border-t border-slate-100 shrink-0 space-y-2.5">
          {!isCollapsed && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/70 text-xs text-emerald-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Privasi Terlindungi</span>
              </div>
              <p className="text-emerald-800 leading-relaxed text-[11px]">
                Data rekaman &amp; hasil Anda diproses aman dan terenkripsi sesuai UU PDP No. 27/2022.
              </p>
            </div>
          )}

          <button
            onClick={() => navigate('/')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Ganti Portal / Keluar"
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span>Ganti Portal / Keluar</span>}
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
          MAIN WRAPPER & TOPBAR (OFFSET)
      ═══════════════════════════════════════════════════════════ */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-72'
        }`}
      >
        {/* ─── Topbar ─── */}
        <header className="h-20 bg-white/90 backdrop-blur-md border-b border-slate-200/70 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          {/* Left Topbar Content */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer"
              title="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Expand Button if Collapsed */}
            {isCollapsed && (
              <button
                onClick={toggleCollapse}
                className="hidden lg:flex p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer mr-1"
                title="Perluas Menu Sidebar"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>
            )}

            {/* Warm Breadcrumb Info */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 truncate">
              <span className="font-medium text-slate-500">Portal Peserta</span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-slate-900 truncate">{getActiveTitle()}</span>
            </div>
          </div>

          {/* Right Topbar Indicators */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Direct Quick Guide Button */}
            <button
              onClick={() => setHelpModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100/80 text-primary-navy border border-blue-200/70 text-xs font-bold transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-accent" />
              <span>Panduan &amp; Alur</span>
            </button>

            {/* Live Connection Telemetry */}
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-full text-emerald-800 text-xs font-semibold shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sistem Siap • Koneksi Lancar</span>
            </div>

            {/* Notification Bell (Functional popover modal) */}
            <button
              onClick={() => setNotifModalOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer relative"
              title="Pemberitahuan Asesmen"
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
            </button>

            {/* Profile Dropdown Navigation (Top Right) */}
            <div className="relative pl-2 sm:pl-3 border-l border-slate-200">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1 -mr-1 rounded-2xl hover:bg-slate-100 transition-all cursor-pointer group"
                title="Buka Menu Profil Peserta"
              >
                {savedFacePhoto ? (
                  <div className="w-9 h-9 rounded-2xl overflow-hidden border border-emerald-500 shadow-2xs shrink-0">
                    <img src={savedFacePhoto} alt={activeUser.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary-navy to-blue-accent text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                    {userInitials}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-slate-900 leading-tight group-hover:text-primary-navy transition-colors">
                      {activeUser.name}
                    </p>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-[160px]">
                    {activeUser.companyName || activeUser.assessmentTitle || 'Peserta Seleksi'}
                  </p>
                </div>
              </button>

              {/* Profile Popover Menu */}
              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 py-3 animate-fadeIn divide-y divide-slate-100">
                    {/* Header info */}
                    <div className="px-5 py-3.5">
                      <div className="flex items-center gap-3.5">
                        {savedFacePhoto ? (
                          <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-emerald-500 shrink-0 shadow-xs">
                            <img src={savedFacePhoto} alt={activeUser.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-navy to-blue-accent text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                            {userInitials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-base font-extrabold text-slate-900 truncate leading-tight">{activeUser.name}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{activeUser.username}</p>
                          <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-primary-navy border border-blue-200/80">
                            ID: {activeUser.id || 'KND-0891'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Navigation Items (Simple & Larger Text) */}
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          navigate('/peserta/profile');
                        }}
                        className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-slate-800 hover:text-primary-navy hover:bg-slate-50 font-bold transition-all cursor-pointer text-left text-sm sm:text-base group"
                      >
                        <User className="w-5 h-5 text-blue-600 shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="flex-1">Halaman Profil Lengkap</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setHelpModalOpen(true);
                        }}
                        className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-slate-800 hover:text-primary-navy hover:bg-slate-50 font-bold transition-all cursor-pointer text-left text-sm sm:text-base group"
                      >
                        <HelpCircle className="w-5 h-5 text-slate-500 shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="flex-1">Panduan &amp; Tata Tertib</span>
                      </button>
                    </div>

                    {/* Logout Section */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          clearActiveSession();
                          navigate('/login');
                        }}
                        className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-red-600 hover:bg-red-50 text-sm sm:text-base font-extrabold transition-all cursor-pointer text-left group"
                      >
                        <LogOut className="w-5 h-5 text-red-600 shrink-0 group-hover:scale-110 transition-transform" />
                        <span>Keluar dari Akun</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ─── Main Content Canvas ─── */}
        <main className="flex-1 w-full p-0">{children}</main>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MODAL PANDUAN, ROADMAP & KORELASI WAWANCARA (COMPREHENSIVE)
      ═══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        title="Panduan Lengkap, Alur Asesmen & Korelasi Wawancara"
        size="lg"
      >
        <div className="space-y-5 text-xs sm:text-sm text-slate-700">
          {/* Tabs Selector */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setHelpActiveTab('roadmap')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                helpActiveTab === 'roadmap'
                  ? 'bg-white text-primary-navy shadow-xs'
                  : 'text-slate-600 hover:text-ink'
              }`}
            >
              1. Peta Alur Asesmen
            </button>
            <button
              onClick={() => setHelpActiveTab('korelasi')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                helpActiveTab === 'korelasi'
                  ? 'bg-white text-primary-navy shadow-xs'
                  : 'text-slate-600 hover:text-ink'
              }`}
            >
              2. Mengapa Ada Wawancara?
            </button>
            <button
              onClick={() => setHelpActiveTab('faq')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                helpActiveTab === 'faq'
                  ? 'bg-white text-primary-navy shadow-xs'
                  : 'text-slate-600 hover:text-ink'
              }`}
            >
              3. FAQ &amp; Kendala Teknis
            </button>
          </div>

          {/* TAB 1: PETA ALUR ASESMEN STEP-BY-STEP */}
          {helpActiveTab === 'roadmap' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200/80 rounded-2xl space-y-1 text-primary-navy">
                <span className="font-heading font-extrabold text-sm sm:text-base block">
                  🚀 Langkah Demi Langkah Mengikuti Asesmen di Talenta+
                </span>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Ikuti urutan langkah di bawah ini untuk memastikan seluruh tahapan evaluasi Anda tercatat sempurna.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-primary-navy text-white flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Buka Menu "Asesmen Saya"</p>
                    <p className="text-xs text-muted-slate leading-relaxed">
                      Klik menu <strong>Asesmen Saya</strong> di sidebar kiri. Anda akan melihat daftar asesmen yang ditugaskan oleh perusahaan mitra. Gunakan tab filter <strong>"Belum Dikerjakan"</strong> untuk memilih program aktif Anda.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Lakukan Tahap 1: Cek Perangkat (Kamera &amp; Mic)</p>
                    <p className="text-xs text-muted-slate leading-relaxed">
                      Pastikan kamera web Anda menghasilkan video yang jelas, mikrofon menangkap suara Anda tanpa dengung, dan lakukan verifikasi foto biometrik wajah.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    3
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Kerjakan Tahap 2: Ujian CAT (40 Soal)</p>
                    <p className="text-xs text-muted-slate leading-relaxed">
                      Masuk ke Ruang Ujian CAT. Anda akan mengerjakan 40 butir soal pilihan ganda &amp; studi kasus situasional. Jawaban Anda tersimpan otomatis ke server secara real-time.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    4
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Masuk Tahap 3: Ruang Tunggu Asesor</p>
                    <p className="text-xs text-muted-slate leading-relaxed">
                      Setelah menekan "Kumpulkan Jawaban CAT", Anda diarahkan ke Ruang Tunggu (Waiting Room) untuk sinkronisasi antrean wawancara dan persiapan feed audio-video.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    5
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Ikuti Tahap 4: Wawancara Live Asesor / Gemini AI</p>
                    <p className="text-xs text-muted-slate leading-relaxed">
                      Saat giliran tiba, masuk ke ruang wawancara live. Asesor / AI Gemini Live akan mengajukan pertanyaan mendalam seputar penalaran jawaban Anda di lembar CAT.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    6
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Buka Tahap 5: Hasil &amp; Nilai Akhir (LHA)</p>
                    <p className="text-xs text-muted-slate leading-relaxed">
                      Setelah asesor menyelesaikan penilaian rubrik BARS, rekapitulasi nilai komposit dan Laporan Hasil Asesmen (LHA) resmi dapat diunduh langsung.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KORELASI UJIAN CAT & MENU WAWANCARA */}
          {helpActiveTab === 'korelasi' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1 text-amber-950">
                <span className="font-heading font-extrabold text-sm sm:text-base block">
                  💡 Korelasi Antara Ujian CAT &amp; Sesi Wawancara (Interview)
                </span>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Memahami mengapa ada menu interview dan bagaimana keterhubungannya dengan lembar ujian Anda.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">
                    ❓ Kapan sesi wawancara dilakukan?
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sesi wawancara dilakukan <strong>SETELAH</strong> Anda selesai mengerjakan seluruh 40 butir soal CAT. Anda tidak dapat langsung mengikuti wawancara sebelum lembar CAT dikumpulkan karena bahan pertanyaan wawancara berpijak pada jawaban Anda di CAT.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">
                    ❓ Apa hubungan antara soal CAT dan wawancara?
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ujian CAT menguji pilihan keputusan teknis Anda (contoh: pemecahan masalah penurunan OTP atau arsitektur cloud). Pada sesi wawancara, Asesor atau Gemini AI Live akan menanyakan: <em>"Mengapa Anda memilih pendekatan tersebut di soal nomor 3?"</em> atau <em>"Bagaimana Anda memitigasi risiko jika solusi tersebut gagal?"</em>. Ini menguji apakah Anda benar-benar memahami konsep dan memiliki kompetensi perilaku kerja (BARS).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">
                    ❓ Mengapa menu wawancara terpisah di navigasi sidebar?
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Menu wawancara disediakan secara khusus karena memiliki infrastruktur interaktif video/audio real-time, integrasi antrean (*Waiting Room*), serta dukungan <strong>Gemini AI Live Voice</strong>. Dengan memisahkannya ke dalam 5 tahapan berurutan, Anda dapat dengan mudah berpindah antar tahapan secara terstruktur.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">
                    ⚖️ Berapa bobot penilaian masing-masing?
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Nilai akhir Anda dihitung dari gabungan: <strong>40% Ujian CAT</strong> + <strong>60% Wawancara Kompetensi Asesor</strong>. Skor passing grade program Anda adalah 75/100.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FAQ & KENDALA TEKNIS */}
          {helpActiveTab === 'faq' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="font-bold text-slate-900 text-xs sm:text-sm">🌐 Apa yang harus dilakukan jika sambungan internet terputus?</p>
                <p className="text-xs text-muted-slate leading-relaxed">
                  Jawaban Anda disimpan otomatis ke server setiap kali Anda memilih opsi. Jika jaringan terputus, muat ulang (refresh) halaman peramban Anda. Anda akan langsung kembali ke nomor soal terakhir tanpa kehilangan data.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="font-bold text-slate-900 text-xs sm:text-sm">📷 Bagaimana aturan kamera web (webcam)?</p>
                <p className="text-xs text-muted-slate leading-relaxed">
                  Kamera web wajib aktif selama ujian CAT dan wawancara berlangsung. Pastikan wajah Anda selalu berada di dalam bingkai kamera dan ruangan memiliki pencahayaan cukup.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="font-bold text-slate-900 text-xs sm:text-sm">🎙️ Bagaimana jika mikrofon tidak terdengar saat wawancara?</p>
                <p className="text-xs text-muted-slate leading-relaxed">
                  Periksa izin akses mikrofon di peramban (ikon gembok di bilah URL). Anda juga dapat membuka menu <strong>1. Cek Perangkat</strong> untuk menguji input volume suara sebelum masuk ke ruang wawancara.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="font-bold text-slate-900 text-xs sm:text-sm">📞 Butuh bantuan teknis segera?</p>
                <p className="text-xs text-muted-slate leading-relaxed">
                  Hubungi Helpdesk Panitia melalui email di <strong>support@talenta-plus.id</strong> atau hubungi nomor hotline WhatsApp resmi yang tertera di kartu ujian Anda.
                </p>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => {
                setHelpModalOpen(false);
                navigate('/peserta/asesmen');
              }}
              className="text-xs font-bold text-primary-navy hover:underline cursor-pointer"
            >
              Ke Menu Asesmen Saya →
            </button>
            <Button
              variant="primary"
              onClick={() => setHelpModalOpen(false)}
              className="w-full sm:w-auto text-xs py-2 px-5 rounded-xl font-bold"
            >
              Saya Mengerti Panduan Ini
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── MODAL PEMBERITAHUAN / NOTIFIKASI ─── */}
      <Modal
        isOpen={notifModalOpen}
        onClose={() => setNotifModalOpen(false)}
        title="Pemberitahuan & Pengumuman Seleksi"
        size="md"
      >
        <div className="space-y-3 text-xs sm:text-sm">
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-950">Sesi Ujian CAT 40 Soal Telah Dibuka</p>
              <p className="text-xs text-emerald-800 mt-0.5">
                Anda dapat memulai pengerjaan 40 butir soal kapan saja sebelum pukul 23:59 WIB hari ini.
              </p>
              <span className="text-[10px] text-emerald-700 font-mono mt-1 block">Baru saja</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-primary-navy">Jadwal Wawancara Terkonfirmasi</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Wawancara kompetensi dilakukan setelah Anda menyelesaikan 40 soal CAT bersama Lead Assessor atau Gemini AI Live.
              </p>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">Kemarin, 16:30 WIB</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Device Check Berhasil Terverifikasi</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Kamera web HD dan mikrofon sistem Anda telah lulus uji kelayakan teknis.
              </p>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">24 Okt 2026</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setNotifModalOpen(false)}
              className="text-xs py-2 px-4 rounded-xl"
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── MODAL PAKTA INTEGRITAS & UU PDP ─── */}
      <Modal
        isOpen={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        title="Pakta Integritas & Perlindungan Data Pribadi"
        size="md"
      >
        <div className="space-y-4 text-xs sm:text-sm text-slate-700">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1 text-emerald-950">
            <span className="font-heading font-bold text-sm block">
              Kepatuhan UU PDP No. 27 Tahun 2022
            </span>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Platform Talenta+ menjamin keamanan data biometrik, jawaban ujian, dan rekaman wawancara Anda dienkripsi end-to-end.
            </p>
          </div>

          <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
            <p><strong>1. Komitmen Kejujuran:</strong> Peserta berkomitmen menyelesaikan seluruh butir soal ujian secara mandiri tanpa bantuan pihak ketiga atau perangkat di luar yang diizinkan.</p>
            <p><strong>2. Retensi Data:</strong> Seluruh foto biometrik wajah hanya digunakan untuk verifikasi integritas ujian dan otomatis dihapus maksimal 30 hari kerja setelah pengumuman akhir batch.</p>
            <p><strong>3. Hak Peserta:</strong> Peserta berhak mengajukan klarifikasi hasil evaluasi kepada panitia asesmen melalui saluran resmi yang disediakan.</p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <Button
              variant="primary"
              onClick={() => setTermsModalOpen(false)}
              className="text-xs py-2 px-4 rounded-xl font-bold"
            >
              Saya Memahami & Menyetujui
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}