import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
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
  KeyRound,
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

export type AdminMenuKey =
  | 'dashboard'
  | 'peserta'
  | 'jobs'
  | 'access-codes'
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
    id: 'ringkasan',
    label: 'UTAMA & ANALITIKA',
    items: [
      { key: 'dashboard', label: 'Ringkasan Eksekutif', icon: LayoutDashboard },
      { key: 'analytics', label: 'Analitika & Metrik', icon: Activity },
    ],
  },
  {
    id: 'asesmen-soal',
    label: 'ASESMEN & SOAL',
    items: [
      { key: 'jobs', label: 'Program Asesmen', icon: BookOpen },
      { key: 'access-codes', label: 'Kode Akses Peserta', icon: KeyRound },
      { key: 'materi', label: 'Master Materi & Silabus', icon: FileText },
      { key: 'bank-soal', label: 'Bank Soal CAT', icon: CheckSquare },
    ],
  },
  {
    id: 'pelaksanaan',
    label: 'PELAKSANAAN & EVALUASI',
    items: [
      { key: 'peserta', label: 'Peserta & Kandidat', icon: Users },
      { key: 'pipeline', label: 'Live Interview Asesor', icon: Video },
      { key: 'proctoring', label: 'Monitoring Proctoring', icon: ShieldAlert },
      { key: 'ranking', label: 'Hasil & Peringkat (LHA)', icon: BarChart3 },
    ],
  },
  {
    id: 'enterprise',
    label: 'ENTERPRISE & KUOTA',
    items: [
      { key: 'perusahaan', label: 'PT & Klien Enterprise', icon: Building2 },
      { key: 'billing', label: 'Billing & Kuota Kredit', icon: CreditCard },
    ],
  },
  {
    id: 'sistem',
    label: 'SISTEM & KEAMANAN',
    items: [
      { key: 'users', label: 'Pengguna & Hak Akses', icon: UserCheck },
      { key: 'ai-config', label: 'Konfigurasi Sistem & AI', icon: Sliders, superadminOnly: true },
      { key: 'audit-logs', label: 'Log Audit & Keamanan', icon: Clock, superadminOnly: true },
      { key: 'help', label: 'Pusat Bantuan & Panduan', icon: HelpCircle },
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
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('admin_sidebar_groups') || '{}');
    } catch {
      return {};
    }
  });
  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      localStorage.setItem('admin_sidebar_groups', JSON.stringify(next));
      return next;
    });
  };

  // Desktop sidebar collapse state (persisted)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('talenta_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [tenants, setTenants] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [activeTenantId, setActiveTenantId] = useState<string>(() => localStorage.getItem('activeTenantId') || '');
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
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    axios.get('/api/admin/tenants', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        const list = response.data?.data || [];
        setTenants(list);
        if (userRole !== 'superadmin' && list[0]?.id) {
          setActiveTenantId(list[0].id);
          localStorage.setItem('activeTenantId', list[0].id);
        }
      })
      .catch(() => undefined);
  }, [userRole]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = userRole === 'superadmin' ? 'Administrator' : (username || 'Admin Sistem');

  // Compute initials
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div id="superadmin-root" className="min-h-screen bg-[#F1F5F9] text-slate-900 flex font-sans">
      {/* ─── SIDEBAR CONTAINER (CLEAN WHITE THEME) ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-slate-200/90 transition-all duration-300 shadow-[1px_0_4px_rgba(15,23,42,0.03)] ${
          isCollapsed ? 'w-20 overflow-visible' : 'w-72'
        } ${
          mobileDrawerOpen
            ? 'translate-x-0 !w-72 shadow-2xl'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand & Sidebar Collapse / Expand */}
        <div className={`h-20 flex items-center border-b border-slate-100 shrink-0 transition-all ${isCollapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl admin-icon-blue text-white flex items-center justify-center font-extrabold text-xl shadow-md shadow-blue-500/20 shrink-0">
                R
              </div>
              <div className="flex flex-col truncate">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-extrabold text-base tracking-tight text-slate-900">Right</span>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                    Admin
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                  Enterprise Console
                </span>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl admin-icon-blue text-white flex items-center justify-center font-extrabold text-xl shadow-md shadow-blue-500/20 shrink-0">
              R
            </div>
          )}
          <button
            onClick={toggleCollapse}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
            title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className={`flex-1 ${isCollapsed ? 'overflow-visible py-4 px-2 space-y-3' : 'overflow-y-auto py-4 px-3 space-y-4'}`}>
          {NAV_GROUPS.filter((group) => !group.superadminOnly || userRole === 'superadmin').map(
            (group, groupIndex) => (
              <div
                key={group.id}
                className={`${
                  groupIndex > 0 && !isCollapsed
                    ? 'pt-3 mt-3 border-t border-slate-100'
                    : ''
                }`}
              >
                {/* Collapsed Divider */}
                {isCollapsed && groupIndex > 0 && (
                  <div className="w-6 h-px bg-slate-200 mx-auto my-2" />
                )}

                {/* Group Header (Expanded) */}
                {!isCollapsed && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="w-full min-w-0 px-3.5 pt-1 pb-2 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase flex items-center justify-between gap-2 cursor-pointer hover:text-slate-700 transition-colors"
                    aria-expanded={!collapsedGroups[group.id]}
                  >
                    <span className="truncate whitespace-nowrap">{group.label}</span>
                    {collapsedGroups[group.id] ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                )}

                <div className={`space-y-1 ${collapsedGroups[group.id] && !isCollapsed ? 'hidden' : ''}`}>
                  {group.items
                    .filter((item) => !item.superadminOnly || userRole === 'superadmin')
                    .map((item) => {
                      const isActive = activeMenu === item.key;
                      return isCollapsed ? (
                        <div key={item.key} className="relative group sidebar-item-group flex justify-center py-0.5">
                          {isActive && (
                            <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-md" />
                          )}
                          <button
                            onClick={() => {
                              setActiveMenu(item.key);
                              if (window.innerWidth < 1024) setMobileDrawerOpen(false);
                            }}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                            aria-label={item.label}
                          >
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                          </button>

                          {/* Floating Tooltip */}
                          <div className="sidebar-tooltip absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-900 border border-slate-700 text-white text-xs font-medium rounded-xl shadow-xl pointer-events-none whitespace-nowrap z-50 flex flex-col gap-1">
                            <span className="text-[9.5px] uppercase tracking-wider text-slate-400 font-bold">
                              {group.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{item.label}</span>
                              {item.badge && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-blue-600 text-white rounded font-mono font-bold">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          key={item.key}
                          onClick={() => {
                            setActiveMenu(item.key);
                            if (window.innerWidth < 1024) setMobileDrawerOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-sm font-medium group text-left cursor-pointer ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 font-bold border-l-3 border-blue-600 pl-3 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <item.icon
                            className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                              isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'
                            }`}
                          />
                          <span className="truncate whitespace-nowrap flex-1">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono transition-colors ${
                                isActive
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.badge}
                            </span>
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
          <div className="p-2 border-t border-slate-100 flex flex-col items-center gap-2">
            <button
              onClick={onLogout}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer group relative"
              title="Keluar Sesi"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                Keluar Sesi
              </span>
            </button>
          </div>
        ) : (
          <div className="p-3.5 border-t border-slate-100 space-y-3">
            {/* Live AI Status Card */}
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/60 flex flex-col gap-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>AI Proctoring Engine</span>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 font-bold bg-white/80 px-1.5 py-0.5 rounded border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">
                Right Enterprise siap melayani ujian &amp; wawancara terstandar.
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span className="font-mono text-slate-400">v2.4.0 • Enterprise</span>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 text-slate-500 hover:text-rose-600 font-semibold transition-colors cursor-pointer"
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
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-20 lg:hidden animate-in fade-in duration-150"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── MAIN CONTENT CONTAINER ─── */}
      <div
        className={`flex-1 flex flex-col min-h-screen min-w-0 w-full transition-all duration-300 ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-72'
        }`}
      >
        {/* Sticky Topbar */}
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-20 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="px-5 sm:px-8">
            <div className="flex items-center justify-between h-20 gap-4">
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
                  <span className="text-muted-slate">Right</span>
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

                {tenants.length > 0 && (
                  <div className="hidden lg:flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Tenant</span>
                    <select
                      value={activeTenantId}
                      onChange={(event) => {
                        const value = event.target.value;
                        setActiveTenantId(value);
                        if (value) localStorage.setItem('activeTenantId', value);
                        else localStorage.removeItem('activeTenantId');
                        window.location.reload();
                      }}
                      disabled={userRole !== 'superadmin'}
                      className="max-w-[220px] h-10 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-800 shadow-2xs focus:outline-none focus:border-primary-navy disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
                    >
                      {userRole === 'superadmin' && <option value="">Semua tenant</option>}
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Live System Status Pill */}
                <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-xs border border-slate-700/80">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-[11px] tracking-wide text-slate-200">Proxsis Infra Live</span>
                </div>

                {/* Notification Bell with Badge */}
                <button
                  className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="3 Notifikasi Baru"
                  aria-label="Notifikasi"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center font-mono shadow-xs">
                    3
                  </span>
                </button>

                {/* User Dropdown Pill */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer select-none border border-slate-200/80 bg-white shadow-2xs"
                    aria-label="User Menu"
                  >
                    <div className="w-8.5 h-8.5 rounded-lg admin-icon-blue flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-blue-500/20">
                      {initials}
                    </div>
                    <div className="hidden xl:flex flex-col text-left">
                      <span className="text-xs font-bold text-slate-900 leading-tight">
                        {displayName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                        {userRole}
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
        <main className="flex-1 p-6 sm:p-10 space-y-10 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
