import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import PesertaFaqChatbot from './PesertaFaqChatbot';
import { getPortalToken } from '../../services/portalAuthService';
import { isAnyCatCompleted } from '../../services/progressService';
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
  Compass,
  Video,
  Laptop,
  BookOpen
} from 'lucide-react';
import { Badge, Modal, Button } from '../ui';
import { getActiveSessionUser, clearActiveSession } from '../../services/userRegistryService';
import { getPortalUser } from '../../services/portalAuthService';

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
  const faceVerified = Boolean(getPortalUser()?.deviceCheckCompletedAt);
  const [interviewCalled, setInterviewCalled] = useState(
    () => localStorage.getItem('peserta_interview_called') === 'true' || getPortalUser()?.interviewStatus === 'called'
  );
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
    const interviewStatus = String(getPortalUser()?.interviewStatus || '');
    return (
      isAnyCatCompleted() ||
      ['scheduled', 'called', 'completed'].includes(interviewStatus)
    );
  }, []);

  // Functional interactive modals & dropdowns
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [helpActiveTab, setHelpActiveTab] = useState<'roadmap' | 'korelasi' | 'faq'>('roadmap');
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const [notifItems, setNotifItems] = useState<Array<{
    id: string;
    title: string;
    detail: string;
    timestamp: string | null;
    tone: 'blue' | 'emerald' | 'rose' | 'amber';
  }>>([]);
  const [notifSeenCount, setNotifSeenCount] = useState<number>(() => {
    const raw = localStorage.getItem('peserta_notif_seen_count');
    return raw ? Number(raw) || 0 : 0;
  });
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const savedFacePhoto = localStorage.getItem('candidate_face_photo');

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('peserta_sidebar_collapsed', String(next));
  };

  const loadNotifications = React.useCallback(async () => {
    const token = getPortalToken();
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [dashRes, histRes, consentRes, helpdeskRes] = await Promise.all([
        axios.get('/api/portal/dashboard', { headers }).catch(() => null),
        axios.get('/api/portal/history', { headers }).catch(() => null),
        axios.get('/api/portal/consent', { headers }).catch(() => null),
        axios.get('/api/peserta/helpdesk/tickets', { headers }).catch(() => null)
      ]);

      const events: Array<{
        id: string;
        title: string;
        detail: string;
        timestamp: string | null;
        tone: 'blue' | 'emerald' | 'rose' | 'amber';
        sortAt: number;
      }> = [];

      const dash = dashRes?.data;
      if (dash?.user?.deviceCheckCompletedAt) {
        const ts = dash.user.deviceCheckCompletedAt;
        events.push({
          id: 'device-check-done',
          title: 'Verifikasi Perangkat & Kamera Selesai',
          detail: 'Kesiapan kamera, mikrofon, dan biometrik telah tervalidasi.',
          timestamp: ts,
          tone: 'emerald',
          sortAt: new Date(ts).getTime()
        });
      }

      if (consentRes?.data?.accepted && consentRes.data?.consentedAt) {
        const ts = consentRes.data.consentedAt;
        events.push({
          id: 'consent-accepted',
          title: `Pakta Integritas & UU PDP (${consentRes.data.version || 'v1.0'})`,
          detail: 'Persetujuan perlindungan data pribadi telah tercatat di server.',
          timestamp: ts,
          tone: 'blue',
          sortAt: new Date(ts).getTime()
        });
      }

      const histList = Array.isArray(histRes?.data?.data) ? histRes.data.data : [];
      histList.forEach((item: any) => {
        const done = ['submitted', 'graded', 'completed'].includes(String(item.status || ''));
        if (done) {
          const ts = item.submittedAt || null;
          events.push({
            id: `exam-${item.programCode}`,
            title: item.programTitle || 'Asesmen Teknis',
            detail: `Ujian CAT telah dikumpulkan${item.lha?.status === 'signed' ? ' • LHA resmi tersedia' : ' • Menunggu penilaian asesor'}.`,
            timestamp: ts,
            tone: item.lha?.status === 'signed' ? 'emerald' : 'blue',
            sortAt: ts ? new Date(ts).getTime() : 0
          });
        }
        if (item.lha?.status === 'signed' && item.lha?.signedAt) {
          events.push({
            id: `lha-${item.programCode}`,
            title: `LHA Resmi Diterbitkan — ${item.programTitle || 'Program Asesmen'}`,
            detail: 'Laporan Hasil Asesmen sudah ditandatangani dan siap diunduh.',
            timestamp: item.lha.signedAt,
            tone: 'emerald',
            sortAt: new Date(item.lha.signedAt).getTime()
          });
        }
      });

      const progList = Array.isArray(dash?.programs) ? dash.programs : [];
      progList.forEach((p: any) => {
        if (!histList.some((h: any) => String(h.programCode).toUpperCase() === String(p.code).toUpperCase())) {
          events.push({
            id: `assigned-${p.code}`,
            title: p.title || 'Program Asesmen Terdaftar',
            detail: 'Program asesmen ditugaskan ke akun Anda dan siap dikerjakan.',
            timestamp: p.assessmentDate || null,
            tone: 'amber',
            sortAt: p.assessmentDate ? new Date(p.assessmentDate).getTime() : 0
          });
        }
      });

      if (dash?.interview?.scheduledAt) {
        const ts = dash.interview.scheduledAt;
        events.push({
          id: 'interview-sched',
          title: 'Jadwal Wawancara Asesor',
          detail: dash.interview.status === 'completed' ? 'Sesi wawancara telah selesai dilaksanakan.' : 'Jadwal sesi wawancara Anda telah ditentukan.',
          timestamp: ts,
          tone: dash.interview.status === 'completed' ? 'emerald' : 'blue',
          sortAt: new Date(ts).getTime()
        });
      }

      const tickets = Array.isArray(helpdeskRes?.data?.tickets) ? helpdeskRes.data.tickets : [];
      tickets.forEach((t: any) => {
        const adminReplies = Array.isArray(t.messages)
          ? t.messages.filter((m: any) => m.senderRole === 'admin')
          : [];
        const latestAdmin = adminReplies[adminReplies.length - 1];
        if (latestAdmin) {
          events.push({
            id: `hd-${t.id}-${latestAdmin.id}`,
            title: 'Balasan Baru dari Helpdesk Internal',
            detail: latestAdmin.text,
            timestamp: latestAdmin.createdAt,
            tone: 'blue',
            sortAt: new Date(latestAdmin.createdAt).getTime()
          });
        }
      });

      events.sort((a, b) => b.sortAt - a.sortAt);
      setNotifItems(events.map(({ sortAt: _s, ...rest }) => rest));
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (notifModalOpen) {
      void loadNotifications().then(() => {
        setNotifSeenCount((prev) => {
          const next = Math.max(prev, notifItems.length);
          localStorage.setItem('peserta_notif_seen_count', String(next));
          return next;
        });
      });
    }
  }, [notifModalOpen, loadNotifications, notifItems.length]);

  useEffect(() => {
    const sync = () => {
      setInterviewCalled(
        localStorage.getItem('peserta_interview_called') === 'true' || getPortalUser()?.interviewStatus === 'called'
      );
      void loadNotifications();
    };
    window.addEventListener('interview-called', sync);
    window.addEventListener('portal-event-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('interview-called', sync);
      window.removeEventListener('portal-event-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, [loadNotifications]);

  const navGroups = [
    {
      group: 'TAHAPAN ASESMEN',
      items: [
        { id: 'dashboard', label: 'Dashboard Peserta', path: '/peserta', icon: LayoutDashboard },
        { id: 'asesmen', label: 'Asesmen Saya', path: '/peserta/asesmen', icon: FileCheck2, badge: '1 Aktif' },
        { id: 'hasil', label: 'Hasil Nilai & LHA', path: '/peserta/hasil', icon: CheckCircle2 },
        { id: 'profile', label: 'Profil & Dokumen', path: '/peserta/profile', icon: User },
      ]
    },
    {
      group: 'PERSIAPAN & BANTUAN',
      items: [
        { id: 'device-check', label: 'Cek Kamera & Mic', path: '/peserta/device-check', icon: Laptop },
        { id: 'help', label: 'Panduan & Alur Asesmen', action: () => setHelpModalOpen(true), icon: HelpCircle },
        { id: 'terms', label: 'Pakta Integritas & UU PDP', action: () => setTermsModalOpen(true), icon: ShieldCheck },
      ]
    }
  ];

  const pageTitleMap: Record<string, string> = {
    '/peserta/device-check': 'Uji Kesiapan Perangkat',
    '/peserta/waiting-room': 'Persiapan Wawancara AI',
    '/peserta/interview': 'Wawancara Ava AI',
    '/peserta/hasil': 'Hasil & Nilai Akhir',
    '/peserta/profile': 'Profil Saya',
    '/peserta/asesmen': 'Asesmen Saya',
    '/peserta/materi': 'Materi & Silabus',
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

  const handleAcceptConsent = async () => {
    const token = getPortalToken();
    if (!token) {
      setTermsModalOpen(false);
      return;
    }
    setConsentSaving(true);
    try {
      await axios.post(
        '/api/portal/consent',
        { version: 'v1.0' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTermsModalOpen(false);
      window.dispatchEvent(new Event('portal-event-updated'));
    } catch {
      window.alert('Gagal menyimpan persetujuan. Periksa koneksi lalu coba lagi.');
    } finally {
      setConsentSaving(false);
    }
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
        className={`fixed top-0 bottom-0 left-0 z-50 lg:z-30 bg-white border-r border-slate-200/80 flex flex-col transition-all duration-200 select-none shadow-xs print:hidden ${
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
            isCollapsed ? 'justify-center px-2' : 'justify-between px-5'
          }`}
        >
          {isCollapsed ? (
            <button
              onClick={toggleCollapse}
              className="w-11 h-11 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-center p-2 shadow-2xs cursor-pointer transition-transform hover:scale-105 group relative overflow-hidden"
              title="Perluas Menu Sidebar"
            >
              <img src="/img/logo-symbol.png" alt="RIGHT" className="h-full w-full object-contain" />
              <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                Perluas Menu
              </span>
            </button>
          ) : (
            <>
              <div
                onClick={() => navigate('/peserta/dashboard')}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
              >
                <img
                  src="/img/logoRIght.jpeg"
                  alt="RIGHT Assessment Platform"
                  className="h-9 w-auto max-w-[165px] object-contain group-hover:opacity-90 transition-opacity"
                />
                <span className="text-xs font-semibold bg-blue-50 text-primary-navy px-2 py-0.5 rounded-full border border-blue-200/60 shrink-0">
                  Peserta
                </span>
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

        {/* Scrollable Nav Item Groups */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-7">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2">
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
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer relative group ${
                      isActive
                        ? 'bg-soft-blue text-primary-navy font-bold border border-accent-border shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent hover:translate-x-0.5'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    {/* Active indicator rail */}
                    <span
                      aria-hidden
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary-navy transition-opacity duration-200 ${
                        isActive && !isCollapsed ? 'opacity-100' : 'opacity-0'
                      }`}
                    />

                    <Icon
                      className={`w-4.5 h-4.5 shrink-0 transition-all ${
                        isActive
                          ? 'text-blue-accent scale-110'
                          : 'text-slate-400 group-hover:text-slate-600 group-hover:scale-105'
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
        <div className="p-4 border-t border-slate-100 shrink-0 space-y-3">
          {!isCollapsed && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-xs text-emerald-950 space-y-1.5">
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
            onClick={() => { clearActiveSession(); navigate('/'); }}
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
        className={`relative flex-1 flex flex-col min-w-0 transition-all duration-200 print:ml-0 print:p-0 ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-72'
        }`}
      >
        {/* ─── Topbar ─── */}
        <header className="h-20 bg-white border-b border-slate-200/70 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs print:hidden">
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
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-500 truncate">
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100/80 border border-slate-200/70 text-slate-500 text-[11px] font-bold tracking-wide">
                Portal Peserta
              </span>
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

            {/* Proctoring readiness */}
            <button
              type="button"
              onClick={() => navigate('/peserta/device-check')}
              className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${faceVerified ? 'bg-emerald-50 border-emerald-200/80 text-emerald-800' : 'bg-amber-50 border-amber-200/80 text-amber-800'}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${faceVerified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{faceVerified ? 'Pengawasan Siap' : 'Perlu Cek Perangkat'}</span>
            </button>

            {/* Notification Bell (Functional popover modal) */}
            <button
              onClick={() => {
                setNotifModalOpen(true);
                setNotifSeenCount(notifItems.length);
                localStorage.setItem('peserta_notif_seen_count', String(notifItems.length));
              }}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer relative"
              title="Pemberitahuan Asesmen"
            >
              <Bell className="w-4.5 h-4.5" />
              {(interviewCalled || notifItems.length > notifSeenCount) && (
                <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white ${interviewCalled ? 'bg-rose-500 animate-pulse' : 'bg-blue-600'}`} />
              )}
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
                  <div className="w-9 h-9 rounded-2xl bg-primary-navy text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
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
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-border-slate rounded-xl shadow-lg py-1.5 z-50">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-bold text-ink truncate">{activeUser.name}</p>
                      <p className="text-xs text-muted-slate truncate">{activeUser.username}</p>
                    </div>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('/peserta/profile');
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Profil Lengkap</span>
                    </button>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setHelpModalOpen(true);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <span>Panduan &amp; Tata Tertib</span>
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
                  🚀 Langkah Demi Langkah Mengikuti Asesmen di Right
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
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Lengkapi Data Diri &amp; Identitas KTP</p>
                    <p className="text-xs text-muted-slate leading-relaxed">
                      Buka menu <strong>Profil &amp; Dokumen</strong>. Pastikan Nama Lengkap sesuai KTP, NIK, nomor kontak WhatsApp, dan data pendidikan telah terisi lengkap sebagai arsip resmi seleksi.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Uji Kesiapan Perangkat &amp; Registrasi Wajah</p>
                    <p className="text-xs text-muted-slate leading-relaxed">
                      Buka menu <strong>Cek Kamera &amp; Mic</strong>. Pastikan webcam, audio output, mikrofon, dan jaringan normal, lalu ambil snapshot foto wajah dan tekan tombol konfirmasi kesiapan sistem.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    3
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Baca Aturan Ujian &amp; Pakta Integritas</p>
                    <p className="text-xs text-muted-slate leading-relaxed">
                      Patuhi standar anti-kecurangan: <strong>dilarang menggunakan virtual background/filter</strong>, dilarang membuka tab/aplikasi lain, dan pastikan tidak ada orang lain di sekitar ruangan ujian.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    4
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Kerjakan Paket Ujian Teknis (CAT &amp; Live Coding)</p>
                    <p className="text-xs text-muted-slate leading-relaxed">
                      Kerjakan paket butir soal sesuai formasi yang Anda lamar. Seluruh pilihan jawaban tersimpan secara instan dan otomatis ke server penguji.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    5
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Masuk Ruang Tunggu Asesor (Waiting Room)</p>
                    <p className="text-xs text-muted-slate leading-relaxed">
                      Setelah submit ujian teknis, Anda diarahkan ke Ruang Tunggu. Sistem antrean waktu-nyata akan memberikan nomor giliran dan notifikasi otomatis saat giliran Anda tiba.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    6
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Wawancara Live Terstandar BARS</p>
                    <p className="text-xs text-muted-slate leading-relaxed">
                      Ikuti sesi wawancara interaktif bersama Dewan Asesor / Right AI Assistant. Pertanyaan menggali kompetensi perilaku kerja dan penalaran jawaban ujian teknis Anda.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    7
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Penerbitan Laporan Hasil Asesmen (LHA)</p>
                    <p className="text-xs text-muted-slate leading-relaxed">
                      LHA resmi dan rekomendasi seleksi diterbitkan setelah seluruh hasil dievaluasi dan ditandatangani secara elektronik (e-sign) oleh asesor berwenang.
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
                    Ujian CAT menguji pilihan keputusan teknis Anda (contoh: pemecahan masalah penurunan OTP atau arsitektur cloud). Pada sesi wawancara, asesor akan menanyakan: <em>"Mengapa Anda memilih pendekatan tersebut di soal nomor 3?"</em> atau <em>"Bagaimana Anda memitigasi risiko jika solusi tersebut gagal?"</em>. Ini menguji apakah Anda benar-benar memahami konsep dan memiliki kompetensi perilaku kerja (BARS).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">
                    ❓ Mengapa menu wawancara terpisah di navigasi sidebar?
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Menu wawancara disediakan secara khusus karena memiliki infrastruktur interaktif video/audio real-time, integrasi antrean (*Waiting Room*), serta dukungan wawancara video/audio. Dengan memisahkannya ke dalam 5 tahapan berurutan, Anda dapat dengan mudah berpindah antar tahapan secara terstruktur.
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
                <p className="font-bold text-slate-900 text-xs sm:text-sm">📷 Bagaimana aturan kamera web dan larangan Virtual Background?</p>
                <p className="text-xs text-muted-slate leading-relaxed">
                  Kamera web wajib aktif sepanjang ujian dan wawancara. <strong>Dilarang keras menggunakan Virtual Background, filter kamera, atau green screen buatan</strong>. Sistem proctoring AI memerlukan latar belakang ruangan yang asli dan pencahayaan yang cukup untuk memvalidasi integritas pengawasan Anda.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="font-bold text-slate-900 text-xs sm:text-sm">🛡️ Apa saja aturan anti-kecurangan (Proctoring AI)?</p>
                <p className="text-xs text-muted-slate leading-relaxed">
                  Sistem AI mendeteksi anomali secara waktu-nyata: perpindahan jendela/tab peramban (maksimal toleransi 3x peringatan), deteksi wajah ganda atau tidak ada wajah, dan suara pihak ketiga. Setiap pelanggaran dicatat ke dalam audit trail asesor.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="font-bold text-slate-900 text-xs sm:text-sm">🔔 Bagaimana mengetahui giliran masuk wawancara?</p>
                <p className="text-xs text-muted-slate leading-relaxed">
                  Setelah ujian teknis selesai, Anda akan masuk ke <strong>Ruang Tunggu (Waiting Room)</strong>. Di sana tertera nomor urut antrean Anda dan estimasi waktu tunggu. Ketika asesor memanggil nomor Anda, banner notifikasi dan nada panggil akan berbunyi di layar Anda.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="font-bold text-slate-900 text-xs sm:text-sm">📜 Kapan Laporan Hasil Asesmen (LHA) dapat diunduh?</p>
                <p className="text-xs text-muted-slate leading-relaxed">
                  LHA resmi diterbitkan setelah Dewan Asesor menyelesaikan rekap nilai komposit (CAT + Interview BARS) dan membubuhkan tanda tangan elektronik (e-sign). Anda dapat melihat dan mengunduh berkas dossier resmi di menu <strong>Hasil Nilai &amp; LHA</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="font-bold text-slate-900 text-xs sm:text-sm">🌐 Apa yang harus dilakukan jika sambungan internet terputus?</p>
                <p className="text-xs text-muted-slate leading-relaxed">
                  Jawaban Anda disimpan otomatis ke server setiap kali Anda memilih opsi. Jika jaringan terputus, muat ulang (refresh) halaman peramban Anda. Anda akan langsung kembali ke nomor soal terakhir tanpa kehilangan data.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="font-bold text-slate-900 text-xs sm:text-sm">📞 Butuh bantuan teknis segera?</p>
                <p className="text-xs text-muted-slate leading-relaxed">
                  Hubungi Helpdesk Panitia melalui email di <strong>support@right.id</strong> atau hubungi tim pengawas seleksi institusi Anda.
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
          {interviewCalled && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <Bell className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-950">Giliran wawancara Anda tiba</p>
                <p className="text-xs text-rose-800 mt-0.5">Sesi peserta sebelumnya selesai. Masuk ke Ruang Wawancara sekarang.</p>
                <Button variant="primary" size="sm" onClick={() => { setNotifModalOpen(false); navigate('/peserta/asesmen'); }} className="mt-2 text-xs">Buka Asesmen Saya</Button>
              </div>
            </div>
          )}
          {notifItems.length === 0 ? (
            <p className="text-xs text-slate-500">Belum ada pemberitahuan asesmen.</p>
          ) : (
            notifItems.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                  item.tone === 'emerald'
                    ? 'bg-emerald-50 border-emerald-200'
                    : item.tone === 'amber'
                      ? 'bg-amber-50 border-amber-200'
                      : item.tone === 'rose'
                        ? 'bg-rose-50 border-rose-200'
                        : 'bg-blue-50 border-blue-200'
                }`}
              >
                <Bell
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    item.tone === 'emerald'
                      ? 'text-emerald-600'
                      : item.tone === 'amber'
                        ? 'text-amber-600'
                        : item.tone === 'rose'
                          ? 'text-rose-600'
                          : 'text-blue-600'
                  }`}
                />
                <div>
                  <p className="font-bold text-primary-navy">{item.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{item.detail}</p>
                  <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                    {item.timestamp ? new Date(item.timestamp).toLocaleString('id-ID') : 'Terjadwal'}
                  </span>
                </div>
              </div>
            ))
          )}

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
              Platform Right menjamin keamanan data biometrik, jawaban ujian, dan rekaman wawancara Anda dienkripsi end-to-end.
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
              onClick={() => void handleAcceptConsent()}
              disabled={consentSaving}
              className="text-xs py-2 px-4 rounded-xl font-bold"
            >
              {consentSaving ? 'Menyimpan...' : 'Saya Memahami & Menyetujui'}
            </Button>
          </div>
        </div>
      </Modal>

      <PesertaFaqChatbot />
    </div>
  );
}