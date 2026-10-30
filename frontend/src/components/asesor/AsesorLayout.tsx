import React, { useState, useMemo } from 'react';
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
  FileText,
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
  const [factsheetModalOpen, setFactsheetModalOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('asesor_sidebar_collapsed', String(next));
  };

  const navGroups = [
    {
      group: 'KONSOL PENILAIAN',
      items: [
        { id: 'dashboard', label: 'Dashboard', path: '/asesor', icon: LayoutDashboard },
        { id: 'queue', label: 'Antrean Interview', path: '/asesor/interview-queue', icon: Users, badge: '5 Slot' },
        { id: 'console', label: 'Live Console', path: '/asesor/live-console/demo', icon: Video, badge: 'Scoring' },
        { id: 'proctoring', label: 'Review Proctoring', path: '/asesor/proctoring', icon: ShieldAlert, badge: '7 Flag' },
        { id: 'scoring', label: 'Penilaian & LHA', path: '/asesor/scoring/demo', icon: ClipboardCheck, badge: 'E-Sign' },
        { id: 'rekap', label: 'Rekap Program', path: '/asesor/rekap', icon: FileSpreadsheet },
      ]
    },
    {
      group: 'METODOLOGI & STANDAR',
      items: [
        { id: 'bars', label: 'Standar Rubrik BARS (1-5)', action: () => setBarsModalOpen(true), icon: Scale },
        { id: 'factsheet', label: 'Kamus Fakta PT Anjak', action: () => setFactsheetModalOpen(true), icon: FileText },
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
        className={`fixed top-0 bottom-0 left-0 z-50 lg:z-30 bg-white border-r border-border-slate flex flex-col transition-all duration-200 select-none ${
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
              className="w-10 h-10 rounded-xl bg-primary-navy hover:bg-navy-dark flex items-center justify-center text-white font-extrabold text-xl shadow-xs cursor-pointer transition-transform hover:scale-105 group relative font-heading"
              title="Perluas Sidebar (Talenta+ Asesor)"
            >
              <span>T</span>
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                Perluas Sidebar
              </span>
            </button>
          ) : (
            <>
              <div
                onClick={() => navigate('/')}
                className="flex items-center gap-3 min-w-0 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-primary-navy text-white flex items-center justify-center font-extrabold text-lg shadow-xs shrink-0 group-hover:bg-blue-accent transition-colors font-heading">
                  T
                </div>
                <div className="flex flex-col truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold font-heading tracking-tight text-ink">
                      Talenta<span className="text-blue-accent">+</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-900 px-1.5 py-0.2 rounded border border-amber-200">
                      Asesor
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-slate truncate font-sans">
                    Konsol Penilaian LHA
                  </span>
                </div>
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
              className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 font-bold text-xs font-heading cursor-pointer group relative"
              title={`${activeAsesor.name} (${activeAsesor.companyName || 'Asesor'})`}
            >
              {userInitials}
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                {activeAsesor.name} • {activeAsesor.specialization || 'Asesor Penguji'}
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-3 mt-3 mb-1 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 font-bold text-xs font-heading shrink-0">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-ink truncate leading-tight">
                  {activeAsesor.name}
                </p>
                <p className="text-[11px] text-muted-slate truncate font-mono mt-0.5">
                  {activeAsesor.companyName || 'Asesor Evaluator'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Nav Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2.5 pt-1 text-[10px] font-bold tracking-wider text-muted-slate uppercase font-mono">
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer relative group ${
                      isActive
                        ? 'bg-soft-blue text-primary-navy font-bold shadow-2xs border border-accent-border'
                        : 'text-slate-600 hover:text-ink hover:bg-slate-100'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-primary-navy' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />

                    {!isCollapsed && (
                      <>
                        <span className="truncate flex-1 text-left">{item.label}</span>
                        {'badge' in item && item.badge && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
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
        <div className="p-3 border-t border-border-slate shrink-0">
          <button
            onClick={() => navigate('/')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-muted-slate hover:text-error-red hover:bg-red-50 transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Keluar / Ganti Peran"
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span>Keluar / Ganti Peran</span>}
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
          MAIN WRAPPER & TOPBAR (OFFSET)
      ═══════════════════════════════════════════════════════════ */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-68'
        }`}
      >
        {/* Topbar */}
        <header className="h-18 bg-white border-b border-border-slate px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
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
            <div className="flex items-center gap-1.5 text-xs text-muted-slate truncate">
              <span className="font-semibold text-slate-500">Talenta+</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500">Asesor</span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-ink truncate">{getActiveTitle()}</span>
            </div>
          </div>

          {/* Right Topbar Indicators */}
          <div className="flex items-center gap-3">
            {/* Pending Reviews Telemetry */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-900 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>5 Antrean Menunggu Review</span>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setNotifModalOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer relative"
              title="Notifikasi Asesor"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
            </button>

            {/* Profile Dropdown Navigation (Top Right) */}
            <div className="relative pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1 -mr-1 rounded-xl hover:bg-slate-100 transition-all cursor-pointer group"
                title="Buka Menu Asesor"
              >
                <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 font-bold text-xs font-heading shrink-0 group-hover:scale-105 transition-transform">
                  {userInitials}
                </div>
                <div className="hidden md:block text-left">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-ink leading-tight group-hover:text-amber-900 transition-colors">
                      {activeAsesor.name}
                    </p>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <p className="text-[11px] text-muted-slate font-mono truncate max-w-[160px]">
                    {activeAsesor.companyName || 'Asesor Evaluator'}
                  </p>
                </div>
              </button>

              {/* Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 py-2 animate-fadeIn divide-y divide-slate-100">
                    <div className="px-4 py-3">
                      <p className="text-xs font-bold text-slate-900 truncate">{activeAsesor.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{activeAsesor.username}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Dewan Asesor Independen
                      </span>
                    </div>
                    <div className="p-1.5 space-y-0.5 text-xs">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          navigate('/asesor/dashboard');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:text-ink hover:bg-slate-50 font-medium transition-colors cursor-pointer text-left"
                      >
                        <LayoutDashboard className="w-4 h-4 text-amber-600" />
                        <span>Dashboard Asesor</span>
                      </button>
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setBarsModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:text-ink hover:bg-slate-50 font-medium transition-colors cursor-pointer text-left"
                      >
                        <Scale className="w-4 h-4 text-blue-600" />
                        <span>Panduan Rubrik BARS</span>
                      </button>
                    </div>
                    <div className="p-1.5">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          clearActiveSession();
                          navigate('/login');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 text-red-600" />
                        <span>Keluar / Logout</span>
                      </button>
                    </div>
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

      {/* ─── MODAL KAMUS FAKTA PT ANJAK ─── */}
      <Modal
        isOpen={factsheetModalOpen}
        onClose={() => setFactsheetModalOpen(false)}
        title="Kamus Fakta Kasus PT Anjak (The Complete Banker - CIMB Niaga)"
        size="md"
      >
        <div className="space-y-3.5 text-xs text-slate-700">
          <p className="text-slate-600">
            Berikut adalah 5 data fakta acuan ground-truth kasus simulasi PT Anjak yang dicocokkan otomatis oleh AI Fact Sheet:
          </p>
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-900">1. Penurunan On-Time Performance (OTP)</p>
              <p className="text-slate-600 mt-0.5">OTP turun dari 99.2% menjadi 97.8% akibat kegagalan modul mesin setor tarik tunai (CRM) pada jam sibuk.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-900">2. Customer Satisfaction Index (CSI) Anjlok</p>
              <p className="text-slate-600 mt-0.5">Skor CSI merosot dari 89 ke 83 pada segmen nasabah prioritas karena antrean fisik counter teller yang menumpuk.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-900">3. Lonjakan Beban OPEX Listrik (+14.2%)</p>
              <p className="text-slate-600 mt-0.5">Beban tagihan listrik cabang melonjak Rp 180 Juta (+14%) tanpa pengendalian sistem kelistrikan terpusat.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-900">4. Keterlambatan Pemeliharaan Vendor Pihak Ketiga</p>
              <p className="text-slate-600 mt-0.5">Kontrak maintenance retainer Rp 450 Juta/bulan belum memiliki klausul denda penalti keterlambatan respon SLA.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-900">5. Kepadatan Jam Operasional Pagi (08.00 - 10.30)</p>
              <p className="text-slate-600 mt-0.5">Krisis antrean terkonsentrasi di 4 hub transit utama pada jam kedatangan nasabah.</p>
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <Button variant="primary" onClick={() => setFactsheetModalOpen(false)} className="text-xs">
              Tutup Kamus Fakta
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
              <p className="font-bold text-amber-950">7 Event Pelanggaran Proctoring Menunggu Verifikasi</p>
              <p className="text-amber-800 text-[11px] mt-0.5">Terdapat indikasi tab switch pada kandidat Farhan Pratama & Amanda Nurul.</p>
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
              <p className="font-bold text-blue-950">Jadwal Sesi Live Interview Berikutnya</p>
              <p className="text-blue-800 text-[11px] mt-0.5">Kandidat Amanda Nurul (KND-0892) telah bersiap di waiting room.</p>
              <button
                onClick={() => {
                  setNotifModalOpen(false);
                  navigate('/asesor/interview-queue');
                }}
                className="text-blue-900 font-bold underline mt-1 block cursor-pointer"
              >
                Lihat Antrean Kandidat →
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
