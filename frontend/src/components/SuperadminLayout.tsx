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
  ExternalLink,
  ShieldCheck,
  MessageSquare,
  Bot,
  Scale,
  Layers,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Select } from './ui/Select';

export type AdminMenuKey =
  | 'dashboard'
  | 'peserta'
  | 'org-structure'
  | 'jobs'
  | 'materi'
  | 'bank-soal'
  | 'perusahaan'
  | 'lha-governance'
  | 'ranking'
  | 'pipeline'
  | 'proctoring'
  | 'users'
  | 'ai-config'
  | 'audit-logs'
  | 'analytics'
  | 'faq-helpdesk'
  | 'chatbot-faq'
  | 'helpdesk-internal'
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
      { key: 'perusahaan', label: 'Perusahaan (PT)', icon: Building2 },
      { key: 'jobs', label: 'Program Asesmen', icon: BookOpen },
      { key: 'materi', label: 'Materi & Soal', icon: FileText },
    ],
  },
  {
    id: 'pelaksanaan',
    label: 'PELAKSANAAN & EVALUASI',
    items: [
      { key: 'peserta', label: 'Peserta & Kandidat', icon: Users },
      { key: 'org-structure', label: 'Departemen & Kelas', icon: Layers },
      { key: 'pipeline', label: 'Live Interview Asesor', icon: Video },
      { key: 'proctoring', label: 'Monitoring Proctoring', icon: ShieldAlert },
      { key: 'ranking', label: 'Hasil & Peringkat (LHA)', icon: BarChart3 },
      { key: 'lha-governance', label: 'Kalibrasi & Koreksi LHA', icon: Scale },
    ],
  },
  {
    id: 'sistem',
    label: 'SISTEM & KEAMANAN',
    items: [
      { key: 'users', label: 'Pengguna & Hak Akses', icon: UserCheck },
      { key: 'ai-config', label: 'Konfigurasi Sistem & AI', icon: Sliders, superadminOnly: true },
      { key: 'audit-logs', label: 'Log Audit & Keamanan', icon: Clock, superadminOnly: true },
      { key: 'helpdesk-internal', label: 'Helpdesk Internal', icon: MessageSquare, badge: 'Live' },
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
  const [notifOpen, setNotifOpen] = useState(false);
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
    <div id="superadmin-root" className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex font-sans">
      {/* ─── SIDEBAR CONTAINER (CLEAN WHITE THEME) ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-[#E2E8F0] transition-all duration-200 ${
          isCollapsed ? 'w-16 overflow-visible' : 'w-60'
        } ${
          mobileDrawerOpen
            ? 'translate-x-0 !w-60 shadow-2xl'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Logo */}
        <div className={`h-16 flex items-center border-b border-[#E2E8F0] shrink-0 transition-all ${isCollapsed ? 'justify-center px-2' : 'justify-start px-5'}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="/img/logoRIght.jpeg"
                alt="RIGHT Assessment Platform"
                className="h-8 w-auto max-w-[160px] object-contain"
              />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center p-1 overflow-hidden" title="RIGHT Assessment Platform">
              <img src="/img/logo-symbol.png" alt="RIGHT" className="h-full w-full object-contain" />
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className={`flex-1 ${isCollapsed ? 'overflow-visible py-3 px-2 space-y-2' : 'overflow-y-auto py-3 px-3 space-y-2.5'}`}>
          {NAV_GROUPS.filter((group) => !group.superadminOnly || userRole === 'superadmin').map(
            (group, groupIndex) => (
              <div
                key={group.id}
                className={`${
                  groupIndex > 0 && !isCollapsed
                    ? 'pt-2.5 border-t border-slate-100'
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
                    className="w-full min-w-0 px-3 pt-1 pb-1.5 text-[10px] font-bold tracking-wider text-[#64748B] uppercase flex items-center justify-between gap-2 cursor-pointer hover:text-[#0F172A] transition-colors"
                    aria-expanded={!collapsedGroups[group.id]}
                  >
                    <span className="truncate whitespace-nowrap">{group.label}</span>
                    {collapsedGroups[group.id] ? <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />}
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
                            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#1E3A8A] rounded-r-sm" />
                          )}
                          <button
                            onClick={() => {
                              setActiveMenu(item.key);
                              if (window.innerWidth < 1024) setMobileDrawerOpen(false);
                            }}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-[#EEF2FF] text-[#1E3A8A] font-semibold'
                                : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
                            }`}
                            aria-label={item.label}
                          >
                            <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-[#1E3A8A]' : 'text-[#64748B]'}`} />
                          </button>

                          {/* Floating Tooltip */}
                          <div className="sidebar-tooltip absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-900 border border-slate-700 text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-50 flex flex-col gap-1">
                            <span className="text-[9.5px] uppercase tracking-wider text-slate-400 font-bold">
                              {group.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{item.label}</span>
                              {item.badge && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-[#1E3A8A] text-white rounded font-mono font-bold">
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
                          className={`w-full h-10 flex items-center gap-2.5 px-3 rounded-lg transition-colors text-[14px] group text-left cursor-pointer ${
                            isActive
                              ? 'bg-[#EEF2FF] text-[#1E3A8A] font-semibold border-l-[3px] border-[#1E3A8A] pl-[9px]'
                              : 'text-[#475569] font-medium hover:text-[#0F172A] hover:bg-slate-50'
                          }`}
                        >
                          <item.icon
                            className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                              isActive ? 'text-[#1E3A8A]' : 'text-[#64748B] group-hover:text-[#0F172A]'
                            }`}
                          />
                          <span className="truncate whitespace-nowrap flex-1">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-semibold font-mono transition-colors ${
                                isActive
                                  ? 'bg-white text-[#1E3A8A]'
                                  : 'bg-[#F1F5F9] text-[#475569]'
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
          <div className="p-2 border-t border-[#E2E8F0] flex flex-col items-center gap-2">
            <button
              onClick={onLogout}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-[#64748B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer group relative"
              title="Keluar Sesi"
            >
              <LogOut className="w-[18px] h-[18px]" />
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                Keluar Sesi
              </span>
            </button>
          </div>
        ) : (
          <div className="px-4 py-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span className="font-mono">v2.4.0</span>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-[#475569] hover:text-rose-600 font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 z-20 lg:hidden animate-in fade-in duration-150"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── MAIN CONTENT CONTAINER ─── */}
      <div
        className={`flex-1 flex flex-col min-h-screen min-w-0 w-full transition-all duration-200 ${
          isCollapsed ? 'lg:ml-16' : 'lg:ml-60'
        }`}
      >
        {/* Sticky Topbar */}
        <header className="h-16 bg-white border-b border-[#E2E8F0] sticky top-0 z-30 shrink-0">
          <div className="px-4 sm:px-6 h-full">
            <div className="flex items-center justify-between h-full gap-3">
              {/* Left Breadcrumb & Toggles */}
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Mobile Drawer Toggle */}
                <button
                  onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
                  className="lg:hidden p-2 text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                  aria-label="Toggle Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Desktop Collapse Toggle */}
                <button
                  onClick={toggleCollapse}
                  className="hidden lg:flex p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                  title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
                  aria-label="Toggle Sidebar Collapse"
                >
                  {isCollapsed ? (
                    <PanelLeftOpen className="w-4.5 h-4.5 text-[#1E3A8A]" />
                  ) : (
                    <PanelLeftClose className="w-4.5 h-4.5 text-[#64748B]" />
                  )}
                </button>

                {/* Breadcrumb (1 line fixed) */}
                <div
                  className="flex items-center gap-2 text-[14px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis max-w-[420px]"
                  title={`Right / ${title || 'Admin'}`}
                >
                  <span className="text-[#64748B] font-normal shrink-0">Right</span>
                  <span className="text-[#94A3B8] shrink-0">/</span>
                  <span className="text-[#0F172A] truncate">
                    {title || 'Admin'}
                  </span>
                </div>
              </div>

              {/* Center Search Input (fixed 240px width) */}
              <div className="hidden md:flex items-center flex-none w-[240px]">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari peserta, program, soal..."
                    className="w-full h-9 pl-9 pr-10 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-colors"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#64748B] bg-white border border-[#E2E8F0] px-1.5 py-0.5 rounded pointer-events-none">
                    ⌘K
                  </span>
                </div>
              </div>

              {/* Right Utilities & Profile */}
              <div className="flex items-center gap-2.5 shrink-0">
                {headerRight}

                {/* Topbar Proctoring Live Indicator */}
                <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DCFCE7] border border-[#BBF7D0] shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-[#166534] whitespace-nowrap">Proctoring Live</span>
                </div>

                {tenants.length > 0 && (
                  <div className="hidden lg:flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-[#64748B]">Tenant</span>
                    <div className="w-[180px]">
                      <Select
                        value={activeTenantId}
                        onChange={(event) => {
                          const value = event.target.value;
                          setActiveTenantId(value);
                          if (value) localStorage.setItem('activeTenantId', value);
                          else localStorage.removeItem('activeTenantId');
                          window.location.reload();
                        }}
                        disabled={userRole !== 'superadmin'}
                        placeholder="Semua tenant"
                        className="h-9 rounded-lg font-medium text-xs"
                      >
                        {userRole === 'superadmin' && <option value="">Semua tenant</option>}
                        {tenants.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                )}

                {/* Notification Bell with Badge */}
                <div className="relative">
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="Notifikasi"
                    aria-label="Notifikasi"
                  >
                    <Bell className="w-5 h-5" />
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 top-11 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50">
                      <p className="text-xs font-bold text-slate-800">Notifikasi</p>
                      <p className="text-[11px] text-slate-500 mt-1">Belum ada notifikasi baru.</p>
                    </div>
                  )}
                </div>

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
        <main className="flex-1 p-6 space-y-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
