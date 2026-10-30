import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  Video,
  ShieldAlert,
  UserCheck,
  Sliders,
  Clock,
  Activity,
  LogOut,
  Menu,
  ChevronRight,
  ChevronDown,
  Search,
  Bell,
  HelpCircle,
  FileText,
  CheckSquare,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

export type AdminMenuKey =
  | 'dashboard'
  | 'peserta'
  | 'jobs'
  | 'materi'
  | 'bank-soal'
  | 'perusahaan'
  | 'billing'
  | 'ranking'
  | 'pipeline'
  | 'proctoring'
  | 'users'
  | 'ai-config'
  | 'audit-logs'
  | 'analytics'
  | 'help'
  | 'settings';

export interface NavMenuItem {
  key: AdminMenuKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  superadminOnly?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  superadminOnly?: boolean;
  items: NavMenuItem[];
}

export interface SuperadminLayoutProps {
  activeMenu: AdminMenuKey;
  setActiveMenu: (key: AdminMenuKey) => void;
  userRole: string;
  username: string;
  onLogout: () => void;
  title?: string;
  subtitle?: string;
  docketRef?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'menu-utama',
    label: 'MENU UTAMA',
    items: [
      { key: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
      { key: 'peserta', label: 'Peserta', icon: Users, badge: '1.248' },
      { key: 'jobs', label: 'Program Asesmen', icon: BookOpen },
      { key: 'materi', label: 'Master Materi', icon: FileText },
      { key: 'bank-soal', label: 'Bank Soal', icon: CheckSquare },
      { key: 'perusahaan', label: 'PT & Perusahaan', icon: Building2 },
      { key: 'billing', label: 'Billing & Kuota', icon: CreditCard, badge: 'Rp' },
      { key: 'ranking', label: 'Hasil Asesmen', icon: BarChart3 },
      { key: 'pipeline', label: 'Live Interview', icon: Video, badge: 'Live' },
      { key: 'proctoring', label: 'Proctoring', icon: ShieldAlert, badge: 'AI' },
      { key: 'users', label: 'Pengguna & Role', icon: UserCheck, superadminOnly: true },
      { key: 'ai-config', label: 'Pengaturan', icon: Sliders, superadminOnly: true },
      { key: 'audit-logs', label: 'Audit Log', icon: Clock, superadminOnly: true },
    ],
  },
  {
    id: 'lainnya',
    label: 'LAINNYA',
    items: [
      { key: 'help', label: 'Pusat Bantuan', icon: HelpCircle },
      { key: 'analytics', label: 'Analitika Eksekutif', icon: Activity },
    ],
  },
];

export const SuperadminLayout: React.FC<SuperadminLayoutProps> = ({
  activeMenu,
  setActiveMenu,
  userRole,
  username,
  onLogout,
  title,
  subtitle,
  docketRef = 'TLN-20261028',
  headerRight,
  children,
}) => {
  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Desktop sidebar collapse state (persisted)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('talenta_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Toggle collapse on desktop
  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('talenta_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute initials
  const initials = username
    ? username
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'RA';

  return (
    <div id="superadmin-root" className="min-h-screen bg-page-bg text-ink flex font-sans">
      {/* ─── SIDEBAR CONTAINER ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-border-slate transition-all duration-300 shadow-[1px_0_4px_rgba(15,23,42,0.03)] ${
          isCollapsed ? 'w-18 overflow-visible' : 'w-68'
        } ${
          mobileDrawerOpen
            ? 'translate-x-0 !w-68'
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
              className="w-10 h-10 rounded-xl bg-primary-navy hover:bg-navy-dark flex items-center justify-center text-white font-extrabold text-xl shadow-xs cursor-pointer transition-transform hover:scale-105 group relative font-heading"
              title="Perluas Sidebar (Talenta+)"
              aria-label="Expand Sidebar"
            >
              <span>T</span>
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                Perluas Sidebar (Talenta+)
              </span>
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9.5 h-9.5 rounded-xl bg-primary-navy flex items-center justify-center text-white font-extrabold text-lg shadow-xs shrink-0 font-heading">
                  T
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-lg font-extrabold tracking-tight text-ink leading-snug font-heading flex items-center">
                    Talenta<span className="text-blue-accent ml-0.5">+</span>
                  </span>
                  <span className="text-[11px] text-muted-slate font-medium tracking-tight">
                    Assessment Platform
                  </span>
                </div>
              </div>

              <button
                onClick={toggleCollapse}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer hidden lg:flex"
                title="Ciutkan Sidebar"
                aria-label="Collapse Sidebar"
              >
                <PanelLeftClose className="w-4.5 h-4.5" />
              </button>
            </>
          )}
        </div>

        {/* User Card */}
        {isCollapsed ? (
          <div className="py-3 flex justify-center border-b border-slate-100">
            <div
              className="w-10 h-10 rounded-full bg-soft-blue border border-accent-border flex items-center justify-center text-primary-navy font-bold text-xs shadow-xs cursor-pointer group relative"
              title={`${username} (${userRole})`}
            >
              {initials}
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                {username} · {userRole}
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-3.5 mt-3.5 mb-2 p-3 rounded-xl bg-page-bg border border-border-slate">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-soft-blue border border-accent-border flex items-center justify-center text-primary-navy font-bold text-xs shadow-xs shrink-0 font-heading">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink truncate leading-tight">
                    {username}
                  </p>
                  <p className="text-xs text-muted-slate capitalize truncate mt-0.5">
                    {userRole === 'superadmin' ? 'Superadmin' : 'Admin'}
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className={`flex-1 ${isCollapsed ? 'overflow-visible py-3 px-2 space-y-4' : 'overflow-y-auto py-3 px-3 space-y-4'}`}>
          {NAV_GROUPS.filter((group) => !group.superadminOnly || userRole === 'superadmin').map(
            (group) => (
              <div key={group.id} className="space-y-1">
                {!isCollapsed && (
                  <div className="px-3 pt-2 pb-1 text-[11px] font-bold tracking-wider text-muted-slate flex items-center justify-between">
                    <span>{group.label}</span>
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.filter((item) => !item.superadminOnly || userRole === 'superadmin').map((item) => {
                    const isActive = activeMenu === item.key;
                    return isCollapsed ? (
                      <div key={item.key} className="relative group sidebar-item-group flex justify-center py-0.5">
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary-navy rounded-r-md" />
                        )}
                        <button
                          onClick={() => {
                            setActiveMenu(item.key);
                            if (window.innerWidth < 1024) setMobileDrawerOpen(false);
                          }}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            isActive
                              ? 'bg-soft-blue text-primary-navy font-semibold shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                          aria-label={item.label}
                        >
                          <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-navy' : 'text-slate-500'}`} />
                        </button>

                        {/* Floating Tooltip */}
                        <div className="sidebar-tooltip absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50 flex items-center gap-2">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-blue-accent text-white rounded font-mono">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <button
                        key={item.key}
                        onClick={() => {
                          setActiveMenu(item.key);
                          if (window.innerWidth < 1024) setMobileDrawerOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium group text-left cursor-pointer ${
                          isActive
                            ? 'bg-soft-blue text-primary-navy font-semibold shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <item.icon
                          className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                            isActive ? 'text-primary-navy' : 'text-slate-400 group-hover:text-slate-700'
                          }`}
                        />
                        <span className="truncate flex-1">{item.label}</span>
                        {item.badge && (
                          <Badge
                            variant={isActive ? 'navy' : 'neutral'}
                            className="text-[10px] px-1.5 py-0 font-medium"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </nav>

        {/* Sidebar Footer */}
        {isCollapsed ? (
          <div className="p-2 border-t border-border-slate flex flex-col items-center gap-2">
            <button
              onClick={onLogout}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer group relative"
              title="Keluar Sesi"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                Keluar Sesi
              </span>
            </button>
          </div>
        ) : (
          <div className="p-3.5 border-t border-border-slate space-y-3">
            {/* Help Card */}
            <div className="p-3 rounded-xl bg-soft-blue border border-accent-border/70 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-primary-navy font-semibold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-accent" />
                <span>Butuh bantuan?</span>
              </div>
              <p className="text-[11px] text-muted-slate leading-tight">
                Hubungi tim support atau buka{' '}
                <button
                  onClick={() => setActiveMenu('help')}
                  className="text-blue-accent hover:underline font-semibold cursor-pointer"
                >
                  dokumentasi
                </button>
                .
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>v2.4.0 • Talenta</span>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 text-slate-500 hover:text-rose-600 font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-20 lg:hidden animate-in fade-in duration-150"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── MAIN CONTENT CONTAINER ─── */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          isCollapsed ? 'lg:ml-18' : 'lg:ml-68'
        }`}
      >
        {/* Sticky Topbar */}
        <header className="bg-white/95 backdrop-blur-md border-b border-border-slate sticky top-0 z-10">
          <div className="px-5 sm:px-8">
            <div className="flex items-center justify-between h-18 gap-4">
              {/* Left Breadcrumb & Toggles */}
              <div className="flex items-center gap-3">
                {/* Mobile Drawer Toggle */}
                <button
                  onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
                  className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  aria-label="Toggle Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Desktop Collapse Toggle */}
                <button
                  onClick={toggleCollapse}
                  className="hidden lg:flex p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
                  aria-label="Toggle Sidebar Collapse"
                >
                  {isCollapsed ? (
                    <PanelLeftOpen className="w-5 h-5 text-primary-navy" />
                  ) : (
                    <PanelLeftClose className="w-5 h-5 text-slate-500" />
                  )}
                </button>

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-muted-slate">Talenta+</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-ink font-bold">
                    {title || 'Admin'}
                  </span>
                </div>

                <Badge variant="navy" className="hidden sm:inline-flex py-0.5 px-2 text-[10.5px]">
                  Admin
                </Badge>
              </div>

              {/* Center Search Input */}
              <div className="hidden md:flex flex-1 max-w-md mx-4">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari peserta, program, soal..."
                    className="w-full h-10 pl-10 pr-12 rounded-xl bg-page-bg border border-border-slate text-sm text-ink placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/15 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
                    ⌘K
                  </span>
                </div>
              </div>

              {/* Right Utilities & Profile */}
              <div className="flex items-center gap-3">
                {headerRight}

                {/* Notification Bell with Badge */}
                <button
                  className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="3 Notifikasi Baru"
                  aria-label="Notifikasi"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-4 h-4 bg-error-red text-white text-[10px] font-bold rounded-full flex items-center justify-center font-mono">
                    3
                  </span>
                </button>

                {/* User Dropdown Pill */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer select-none"
                    aria-label="User Menu"
                  >
                    <div className="w-8.5 h-8.5 rounded-full bg-primary-navy flex items-center justify-center text-white font-bold text-xs shadow-xs">
                      {initials}
                    </div>
                    <div className="hidden xl:flex flex-col text-left">
                      <span className="text-xs font-bold text-ink leading-tight">
                        {username || 'Admin Sistem'}
                      </span>
                      <span className="text-[11px] text-muted-slate">
                        admin@talenta.id
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 hidden xl:block" />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-border-slate rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-sm font-bold text-ink">{username}</p>
                        <p className="text-xs text-muted-slate capitalize">{userRole}</p>
                      </div>

                      <button
                        onClick={() => {
                          setActiveMenu('ai-config');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                      >
                        <Sliders className="w-4 h-4 text-slate-400" />
                        <span>Pengaturan Sistem</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveMenu('help');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                      >
                        <HelpCircle className="w-4 h-4 text-slate-400" />
                        <span>Pusat Bantuan</span>
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        onClick={onLogout}
                        className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Keluar Sesi</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-5 sm:p-8 space-y-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
