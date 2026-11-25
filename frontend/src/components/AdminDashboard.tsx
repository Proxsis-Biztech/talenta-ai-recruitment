import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  LogOut, Search, Filter, FileText, ChevronLeft, ChevronRight, Briefcase,
  Download, LayoutDashboard, ShieldCheck, Calendar, Edit, Trash2, Cpu,
  RefreshCw, Sparkles, Users, Clock, CheckCircle2, ChevronDown,
  X, Menu, Brain, Radio, Sun, Mail, Phone,
  GraduationCap, MapPin, BookOpen, Award, Building,
  Star, Eye, Printer, ShieldAlert, BarChart3, AlertTriangle, Target, Activity,
  Copy, Check, Send, Layers, Loader2, FileCheck, ArrowUpRight, CheckSquare, Video, Sliders, Plus, MessageSquare, Bot, Scale, MoreHorizontal
} from 'lucide-react';
import { AdminStatCard, AdminEmptyState } from './admin/AdminStatCard';
import UserManagement from './UserManagement';
import JobManagement from './JobManagement';
import RankingView from './RankingView';
import RadarChart from './RadarChart';
import PipelineView from './PipelineView';
import ProctoringView from './ProctoringView';
import AIConfigView from './AIConfigView';
import AuditLogsView from './AuditLogsView';
import AnalyticsView from './AnalyticsView';
import { AdminProgramBuilder } from './admin/AdminProgramBuilder';
import { AdminCSVImportWizard } from './admin/AdminCSVImportWizard';
import { AdminVerticalTimeline } from './admin/AdminVerticalTimeline';
import { AdminMateriSoalHub } from './admin/AdminMateriSoalHub';
import { AdminCompanyMatrix } from './admin/AdminCompanyMatrix';
import AdminSecurityCard from './admin/AdminSecurityCard';
import AdminFaqHelpdesk from './AdminFaqHelpdesk';
import AdminLhaGovernanceView from './admin/AdminLhaGovernanceView';
import { DEFAULT_ASSESSMENT_PROGRAMS } from '../services/assessmentCatalog';
import Swal from 'sweetalert2';
import { SuperadminLayout, type AdminMenuKey } from './SuperadminLayout';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Select,
  Textarea,
  TelemetryStrip,
  TelemetryItem,
  Modal,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from './ui';

interface Experience {
  companyName?: string;
  position?: string;
  startDate?: string;
  endDate?: string | null;
  isCurrent?: boolean;
}

export interface CompositeEvaluation {
  compositeScore: number;
  recommendation: 'STRONG HIRE' | 'RECOMMENDED HIRE' | 'CONSIDER' | 'NOT RECOMMENDED' | 'BELUM DINILAI';
  cvContribution: number;
  interviewContribution: number;
  integrityPenalty: number;
  proctorCount: number;
  rationale: string;
}

interface Applicant {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  education: string;
  university: string | null;
  major: string | null;
  gpa: number | null;
  cvFileName: string;
  certificateFileName: string | null;
  createdAt: string;
  experiences: Experience[];
  placeOfBirth: string;
  dateOfBirth: string;
  address: string;
  appliedPosition: string;
  screeningStatus: string;
  screeningScore: number | null;
  screeningSummary: string | null;
  jobId: string | null;
  job?: {
    id: string;
    title: string;
    description: string;
    interviewPassingScore?: number | null;
  } | null;
  interviewResult: string | null;
  interviewTranscript: string | null;
  interviewStatus: string;
  interviewScore: number | null;
  interviewSkillMatrix: string | null;
  interviewPhaseScores: string | null;
  proctorFlags: string | null;
  compositeEvaluation?: CompositeEvaluation;
  candidateCode?: string | null;
  portalCompanyName?: string | null;
  portalAssessmentId?: string | null;
  portalAssessmentIds?: string | null;
  portalAssessmentTitle?: string | null;
  examAttempt?: {
    score?: number | null;
    integrityScore?: number | null;
    submittedAt?: string | null;
    status?: string;
    totalAnswered?: number;
    totalQuestions?: number;
    answers?: string | null;
  } | null;
}

// Helpers for Right Candidate Table representation
const getCompanyForApplicant = (app: Applicant): string => {
  if (app.portalCompanyName) return app.portalCompanyName;
  const experienceCompany = app.experiences?.[0]?.companyName;
  if (experienceCompany) return experienceCompany;
  const match = app.job?.title?.match(/\(([^)]+)\)\s*$/);
  return match?.[1] || '-';
};

const getProgramForApplicant = (app: Applicant): string =>
  app.portalAssessmentTitle || app.job?.title || app.appliedPosition || '-';

const getAssessmentCodesForApplicant = (app: Applicant): string[] => {
  if (app.portalAssessmentIds) {
    try {
      const parsed = JSON.parse(app.portalAssessmentIds);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // ignore malformed JSON
    }
  }
  return app.portalAssessmentId ? [app.portalAssessmentId] : [];
};

const getStageForApplicant = (app: Applicant): string => {
  if (app.interviewStatus === 'completed' || app.interviewStatus === 'scored') {
    return 'Selesai';
  }
  if (app.interviewStatus === 'in_progress') {
    return 'Wawancara';
  }
  if (app.examAttempt?.status === 'submitted' || app.examAttempt?.status === 'graded') {
    return 'Wawancara';
  }
  if (app.screeningStatus === 'success') {
    return 'Tes CAT';
  }
  if (app.screeningStatus === 'failed') {
    return 'Selesai';
  }
  return 'Screening';
};

const getStatusForApplicant = (app: Applicant) => {
  if (app.screeningStatus === 'failed' || app.compositeEvaluation?.recommendation === 'NOT RECOMMENDED') {
    return {
      label: 'Gagal',
      variant: 'danger' as const,
      className: 'bg-[#FEE2E2] text-error-red border border-[#FECACA]',
      dot: 'bg-error-red',
    };
  }
  if (app.screeningStatus === 'success' && (app.interviewStatus === 'completed' || app.interviewStatus === 'scored')) {
    return {
      label: 'Lulus',
      variant: 'success' as const,
      className: 'bg-[#DCFCE7] text-success-green border border-[#BBF7D0]',
      dot: 'bg-success-green',
    };
  }
  return {
    label: 'Proses',
    variant: 'info' as const,
    className: 'bg-soft-blue text-blue-accent border border-accent-border',
    dot: 'bg-blue-accent',
  };
};

const AVATAR_PALETTES = [
  'bg-slate-100 text-slate-600 border border-slate-200',
];

const buildSmoothPath = (points: Array<{ x: number; y: number }>) => {
  if (points.length < 2) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] || points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [allApplicants, setAllApplicants] = useState<Applicant[]>([]);
  const [jobsCatalogCount, setJobsCatalogCount] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const applicantsAbortRef = useRef<AbortController | null>(null);
  const hasLoadedApplicantsRef = useRef(false);
  const [educationFilter, setEducationFilter] = useState('');
  const [interviewStatusFilter, setInterviewStatusFilter] = useState('');
  const [ptFilter, setPtFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [materiHubTab, setMateriHubTab] = useState<'materi' | 'bank-soal'>(() =>
    new URLSearchParams(window.location.search).get('menu') === 'bank-soal' ? 'bank-soal' : 'materi'
  );
  const [materiHubProgramCode, setMateriHubProgramCode] = useState<string | undefined>(undefined);
  const [materiHubCompanyName, setMateriHubCompanyName] = useState<string | undefined>(undefined);
  const [activeMenu, setActiveMenu] = useState<AdminMenuKey>(() => {
    const menu = new URLSearchParams(window.location.search).get('menu');
    if (menu === 'bank-soal') return 'materi';
    const allowed: AdminMenuKey[] = [
      'dashboard', 'peserta', 'pipeline', 'jobs', 'ranking', 'lha-governance', 'proctoring', 'users',
      'ai-config', 'audit-logs', 'analytics', 'materi', 'perusahaan',
      'faq-helpdesk', 'chatbot-faq', 'helpdesk-internal', 'help'
    ];
    return menu && allowed.includes(menu as AdminMenuKey) ? (menu as AdminMenuKey) : 'dashboard';
  });

  useEffect(() => {
    if (activeMenu !== 'materi' && activeMenu !== 'bank-soal') {
      setMateriHubProgramCode(undefined);
      setMateriHubCompanyName(undefined);
    }
  }, [activeMenu]);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [editingApplicant, setEditingApplicant] = useState<Applicant | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [scoringLoading, setScoringLoading] = useState(false);
  const [userRole] = useState<string>(() => localStorage.getItem('adminRole') || 'admin');
  const [username] = useState<string>(() => localStorage.getItem('adminUsername') || 'Admin');
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  // New Professional Feature States
  const [batchScreeningLoading, setBatchScreeningLoading] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionCandidate, setDecisionCandidate] = useState<Applicant | null>(null);
  const [decisionType, setDecisionType] = useState<'offer' | 'rejection'>('offer');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionResult, setDecisionResult] = useState<{
    subject: string;
    letterBody: string;
    highlights: string[];
    candidateName: string;
    candidateId?: string;
    jobTitle: string;
    decisionType: string;
  } | null>(null);
  const [copiedLetter, setCopiedLetter] = useState(false);

  // Assessment Engine States
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineCandidate, setTimelineCandidate] = useState<any>(null);
  const [showProgramBuilder, setShowProgramBuilder] = useState(
    () => new URLSearchParams(window.location.search).get('builder') === '1'
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchApplicants = useCallback(async (silent = false) => {
    applicantsAbortRef.current?.abort();
    const controller = new AbortController();
    applicantsAbortRef.current = controller;
    if (!silent && !hasLoadedApplicantsRef.current) setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        navigate('/admin/login');
        return;
      }
      const response = await axios.get('/api/admin/applicants', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit: 10, search: debouncedSearch, education: educationFilter, interviewStatus: interviewStatusFilter },
        signal: controller.signal
      });
      setApplicants(response.data.data);
      setTotal(response.data.meta.total);
      setLastPage(response.data.meta.lastPage);
      hasLoadedApplicantsRef.current = true;
    } catch (error) {
      if (axios.isCancel(error)) return;
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
      }
    } finally {
      if (!silent && !controller.signal.aborted) setLoading(false);
    }
  }, [page, debouncedSearch, educationFilter, interviewStatusFilter, navigate]);

  const fetchAllApplicants = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      const [appRes, jobsRes] = await Promise.all([
        axios.get('/api/admin/applicants', {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 500 }
        }),
        axios.get('/api/jobs', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
      ]);
      setAllApplicants(appRes.data.data || []);
      if (Array.isArray(jobsRes?.data?.data)) {
        setJobsCatalogCount(jobsRes.data.data.length);
      }
    } catch (error) {
      console.error('Failed to fetch all applicants:', error);
    }
  }, []);

  useEffect(() => {
    void fetchApplicants();
    return () => applicantsAbortRef.current?.abort();
  }, [fetchApplicants]);

  useEffect(() => {
    void fetchAllApplicants();
  }, [fetchAllApplicants]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchApplicants(true);
      void fetchAllApplicants();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [fetchApplicants, fetchAllApplicants]);

  const handleLogout = () => {
    for (const key of ['adminToken', 'adminRole', 'adminUsername', 'portalToken', 'portalUser', 'talenta_active_session_user', 'authRole', 'programCode']) {
      localStorage.removeItem(key);
    }
    navigate('/login');
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data Peserta?',
      text: 'Data peserta, akun portal, dan riwayat asesmennya akan dihapus permanen.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/admin/applicants/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      if (applicants.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchApplicants();
      }
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data peserta berhasil dihapus', timer: 1800, showConfirmButton: false });
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal menghapus data peserta' : 'Gagal menghapus data peserta';
      Swal.fire({ icon: 'error', title: 'Gagal', text: msg });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const result = await Swal.fire({
      title: `Hapus ${count} Data Peserta Terpilih?`,
      text: 'Semua data peserta terpilih beserta akun portal dan riwayat asesmennya akan dihapus permanen.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Ya, Hapus (${count})`,
      cancelButtonText: 'Batal',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        '/api/admin/applicants/bulk-delete',
        { ids: selectedIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const removedSet = new Set(selectedIds);
      const remainingOnPage = applicants.filter((a) => !removedSet.has(a.id)).length;
      setSelectedIds([]);
      if (remainingOnPage === 0 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchApplicants();
      }
      Swal.fire({ icon: 'success', title: 'Berhasil', text: `${count} data peserta berhasil dihapus`, timer: 1800, showConfirmButton: false });
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal menghapus data peserta terpilih' : 'Gagal menghapus data peserta terpilih';
      Swal.fire({ icon: 'error', title: 'Gagal', text: msg });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApplicant) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/admin/applicants/${editingApplicant.id}`, editingApplicant, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data pelamar berhasil diperbarui', timer: 2000, showConfirmButton: false });
      setEditingApplicant(null);
      fetchApplicants();
    } catch {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal memperbarui data pelamar' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadFile = async (fileName: string, originalName: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`/api/admin/applicants/cv/${encodeURIComponent(fileName)}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal mengunduh file', timer: 2000, showConfirmButton: false });
    }
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/applicants/export', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/octet-stream' }));
      const link = document.createElement('a');
      link.href = url;
      link.style.display = 'none';
      link.setAttribute('download', 'data_pelamar.csv');
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => {
        link.remove();
        window.URL.revokeObjectURL(url);
      }, 1500);
    } catch {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal mengekspor data CSV', timer: 2000, showConfirmButton: false });
    }
  };

  const handleScreenCV = async (applicantId: string) => {
    setScreeningLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.post(`/api/admin/applicants/${applicantId}/screen`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updatedApplicant = response.data.data;
      setApplicants(prev => prev.map(app => app.id === applicantId ? { ...app, ...updatedApplicant } : app));
      if (selectedApplicant && selectedApplicant.id === applicantId) {
        setSelectedApplicant({ ...selectedApplicant, ...updatedApplicant });
      }
      Swal.fire({ icon: 'success', title: 'Analisis Selesai', text: 'Analisis CV oleh AI berhasil dilakukan!', timer: 2000, showConfirmButton: false });
    } catch (error: unknown) {
      const errMsg = axios.isAxiosError(error) ? error.response?.data?.error || 'Gagal menganalisis CV' : 'Gagal menganalisis CV';
      Swal.fire({ icon: 'error', title: 'Gagal', text: errMsg });
    } finally {
      setScreeningLoading(false);
    }
  };

  const handleScoreInterview = async (applicantId: string) => {
    setScoringLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.post(`/api/admin/applicants/${applicantId}/score-interview`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updated = res.data.data;
      setSelectedApplicant(prev => prev ? { ...prev, ...updated } : null);
      setApplicants(prev => prev.map(a => a.id === applicantId ? { ...a, ...updated } : a));
      Swal.fire({ icon: 'success', title: 'Penilaian Selesai', text: 'Penilaian wawancara oleh AI berhasil dilakukan!', timer: 2000, showConfirmButton: false });
    } catch (err: unknown) {
      const errMsg = axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal menilai wawancara' : 'Gagal menilai wawancara';
      Swal.fire({ icon: 'error', title: 'Gagal', text: errMsg });
    } finally {
      setScoringLoading(false);
    }
  };

  const escapeHtml = (s: string | null | undefined) =>
    (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Batch Screen Handler
  const handleBatchScreen = async () => {
    const pendingCount = applicants.filter(a => a.screeningStatus === 'pending' || !a.screeningStatus).length;
    if (pendingCount === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Tidak Ada Antrean',
        text: 'Semua pelamar di halaman ini sudah selesai di-screening.',
        confirmButtonColor: '#0E7490'
      });
      return;
    }

    const confirm = await Swal.fire({
      title: 'Screening Massal AI',
      text: `Jalankan analisis CV otomatis dengan Gemini AI untuk ${pendingCount} pelamar dalam antrean?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Mulai Analisis',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#0E7490'
    });

    if (!confirm.isConfirmed) return;

    setBatchScreeningLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.post('/api/admin/applicants/batch-screen', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchApplicants();
      Swal.fire({
        icon: 'success',
        title: 'Screening Massal Selesai',
        text: response.data.message || 'Proses screening batch berhasil!',
        confirmButtonColor: '#0E7490'
      });
    } catch (error: any) {
      const errMsg = axios.isAxiosError(error) ? error.response?.data?.error || 'Gagal screening massal' : 'Gagal screening massal';
      Swal.fire({ icon: 'error', title: 'Gagal', text: errMsg });
    } finally {
      setBatchScreeningLoading(false);
    }
  };

  // AI Decision Letter Modal Handlers
  const openDecisionModal = (app: Applicant, type: 'offer' | 'rejection' = 'offer') => {
    setSelectedApplicant(null);
    setDecisionCandidate(app);
    setDecisionType(type);
    setDecisionNotes('');
    setDecisionResult(null);
    setCopiedLetter(false);
    setDecisionModalOpen(true);
  };

  const handleGenerateDecisionLetter = async () => {
    if (!decisionCandidate) return;
    setDecisionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.post(`/api/admin/applicants/${decisionCandidate.id}/decision-letter`, {
        decisionType,
        customNotes: decisionNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDecisionResult(res.data.data);
    } catch (error: any) {
      const errMsg = axios.isAxiosError(error) ? error.response?.data?.error || 'Gagal menghasilkan surat' : 'Gagal menghasilkan surat';
      Swal.fire({ icon: 'error', title: 'Gagal', text: errMsg });
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleCopyLetter = () => {
    if (!decisionResult) return;
    const fullText = `Subjek: ${decisionResult.subject}\n\n${decisionResult.letterBody}`;
    navigator.clipboard.writeText(fullText);
    setCopiedLetter(true);
    setTimeout(() => setCopiedLetter(false), 2000);
  };

  const handlePrintLetter = () => {
    if (!decisionResult) return;
    const win = window.open('', '_blank', 'width=850,height=750');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${escapeHtml(decisionResult.subject)}</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;padding:48px;line-height:1.7;font-size:14px;max-width:800px;margin:auto;}
  .header{border-bottom:2px solid #0e7490;padding-bottom:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-end;}
  .brand{font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;}
  .brand span{color:#0e7490;}
  .meta{font-size:11px;color:#64748b;font-family:monospace;}
  .subject{font-size:15px;font-weight:700;margin-bottom:24px;color:#0f172a;background:#f8fafc;padding:12px 16px;border-left:3px solid #0e7490;border-radius:4px;}
  .content{white-space:pre-wrap;font-size:13.5px;color:#334155;}
  .footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between;}
  @media print{.no-print{display:none;}}
</style>
</head><body>
<div class="no-print" style="margin-bottom:20px;text-align:right;">
  <button onclick="window.print()" style="background:#0e7490;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-weight:700;cursor:pointer;">Cetak / Simpan PDF</button>
</div>
<div class="header">
  <div>
    <div class="brand">Kinesta <span>HR</span></div>
    <div style="font-size:12px;color:#64748b;margin-top:2px;">Enterprise AI Recruitment & Talent Acquisition</div>
  </div>
  <div class="meta">REF: LET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${(decisionResult.candidateId || '').slice(0, 6).toUpperCase()}</div>
</div>
<div class="subject">Perihal: ${escapeHtml(decisionResult.subject)}</div>
<div class="content">${escapeHtml(decisionResult.letterBody)}</div>
<div class="footer">
  <div>Dokumen resmi Kinesta HR • Generated by HR AI Decision Engine</div>
  <div>Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
</div>
<script>setTimeout(()=>window.print(),300);</script>
</body></html>`);
    win.document.close();
  };

  const openPrintReport = (app: Applicant) => {
    let skillMatrixHtml = '';
    try {
      const skills = app.interviewSkillMatrix ? JSON.parse(app.interviewSkillMatrix) : null;
      if (Array.isArray(skills) && skills.length > 0) {
        skillMatrixHtml = `
        <div style="margin-top:20px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#475569;margin-bottom:10px;font-family:monospace;">
            02 // MATRIKS KOMPETENSI WAWANCARA AI
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#f1f5f9;border-bottom:2px solid #cbd5e1;">
                <th style="padding:8px 12px;text-align:left;font-weight:700;color:#334155;">Dimensi Evaluasi</th>
                <th style="padding:8px 12px;text-align:center;width:120px;font-weight:700;color:#334155;">Skor & Visual</th>
                <th style="padding:8px 12px;text-align:left;font-weight:700;color:#334155;">Catatan Observasi AI</th>
              </tr>
            </thead>
            <tbody>
              ${skills.map((s: { skill: string; score: number; notes: string }) => `
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:8px 12px;font-weight:600;color:#1e293b;">${escapeHtml(s.skill)}</td>
                  <td style="padding:8px 12px;text-align:center;">
                    <div style="font-weight:800;font-family:monospace;color:${s.score >= 75 ? '#047857' : s.score >= 60 ? '#b45309' : '#be123c'};">${s.score}%</div>
                    <div style="height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden;margin-top:4px;">
                      <div style="height:100%;width:${s.score}%;background:${s.score >= 75 ? '#047857' : s.score >= 60 ? '#b45309' : '#be123c'};"></div>
                    </div>
                  </td>
                  <td style="padding:8px 12px;font-size:11.5px;color:#475569;">${escapeHtml(s.notes)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
      }
    } catch { skillMatrixHtml = ''; }

    let phasesHtml = '';
    try {
      const phases = app.interviewPhaseScores ? JSON.parse(app.interviewPhaseScores) : null;
      if (Array.isArray(phases) && phases.length > 0) {
        phasesHtml = `
        <div style="margin-top:20px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#475569;margin-bottom:10px;font-family:monospace;">
            03 // EVALUASI 4 FASE WAWANCARA ADAPTIF
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            ${phases.map((p: any, pi: number) => `
              <div style="border:1px solid #e2e8f0;border-radius:6px;padding:12px;background:#f8fafc;">
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:8px;">
                  <span style="font-weight:700;font-size:12px;color:#0f172a;">Fase ${pi + 1}: ${escapeHtml(p.name)}</span>
                  <span style="font-weight:800;font-family:monospace;font-size:12px;color:#0e7490;">${p.score}%</span>
                </div>
                ${Array.isArray(p.questions) ? p.questions.map((q: any) => `
                  <div style="font-size:11px;color:#475569;margin-top:6px;line-height:1.5;">
                    <span style="font-weight:700;color:#0e7490;">[${q.score}/100]</span> ${escapeHtml(q.question)}
                  </div>
                `).join('') : ''}
              </div>
            `).join('')}
          </div>
        </div>`;
      }
    } catch { phasesHtml = ''; }

    let proctorHtml = '';
    try {
      const p = app.proctorFlags ? JSON.parse(app.proctorFlags) : null;
      const violations = p && Array.isArray(p.violations) ? p.violations : [];
      proctorHtml = `
      <div style="margin-top:20px;padding:12px;border:1px solid ${violations.length > 0 ? '#fecaca' : '#bbf7d0'};background:${violations.length > 0 ? '#fff1f2' : '#f0fdf4'};border-radius:6px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${violations.length > 0 ? '#be123c' : '#047857'};font-family:monospace;margin-bottom:4px;">
          04 // AUDIT INTEGRITAS & PROCTORING SESI
        </div>
        ${violations.length > 0 ? `
          <div style="font-size:12px;color:#9f1239;font-weight:600;">
            Terdeteksi ${violations.length} catatan aktivitas integritas (berpindah tab / keluar layar):
          </div>
          <ul style="margin:6px 0 0 16px;padding:0;font-size:11.5px;color:#be123c;">
            ${violations.map((v: any) => `<li>${escapeHtml(v.reason)} — Pukul: ${escapeHtml(v.time)}</li>`).join('')}
          </ul>
        ` : `
          <div style="font-size:12px;color:#047857;font-weight:600;">
            ✓ Sesi Terverifikasi Patuh (0 Pelanggaran Integritas Terdeteksi)
          </div>
        `}
      </div>`;
    } catch { proctorHtml = ''; }

    const compEval = app.compositeEvaluation;
    const compScore = compEval ? compEval.compositeScore : (app.interviewScore ?? app.screeningScore ?? 0);
    const recommendation = compEval ? compEval.recommendation : (app.interviewScore && app.interviewScore >= 75 ? 'RECOMMENDED HIRE' : 'CONSIDER');

    const recColors: Record<string, { bg: string; text: string; border: string }> = {
      'STRONG HIRE': { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
      'RECOMMENDED HIRE': { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' },
      'CONSIDER': { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
      'NOT RECOMMENDED': { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
      'BELUM DINILAI': { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' }
    };
    const activeBadge = recColors[recommendation] || recColors['CONSIDER'];

    const win = window.open('', '_blank', 'width=950,height=800');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>DOSSIER EKSEKUTIF — ${escapeHtml(app.fullName)} — KINESTA HR</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; font-size: 13px; line-height: 1.5; background: #fff; }
  .no-print { margin-bottom: 20px; text-align: right; }
  .print-btn { cursor: pointer; background: #0e7490; color: #fff; border: 0; padding: 10px 20px; border-radius: 6px; font-weight: 700; font-size: 12px; }
  .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
  .brand-title { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a; }
  .brand-title span { color: #0e7490; }
  .security-tag { font-family: monospace; font-size: 10px; color: #64748b; letter-spacing: 1px; }
  .section-title { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #475569; margin: 20px 0 8px; font-family: monospace; }
  .composite-box { display: grid; grid-template-columns: 200px 1fr; gap: 16px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; background: #f8fafc; margin-top: 16px; }
  .info-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  .info-table th { background: #f1f5f9; padding: 6px 10px; text-align: left; border: 1px solid #e2e8f0; font-weight: 700; width: 18%; color: #334155; }
  .info-table td { padding: 6px 10px; border: 1px solid #e2e8f0; color: #1e293b; width: 32%; }
  .signature-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  .sign-line { margin-top: 48px; border-bottom: 1px solid #0f172a; }
  @media print { .no-print { display: none; } body { padding: 0; } }
</style>
</head>
<body>
<div class="no-print">
  <button class="print-btn" onclick="window.print()">🖨️ Cetak / Simpan PDF Eksekutif</button>
</div>

<div class="header-box">
  <div>
    <div class="brand-title">Kinesta <span>HR</span></div>
    <div style="font-size:12px;color:#475569;margin-top:2px;">Platform Intelijen Rekrutmen & Penilaian Bakat Terakreditasi</div>
  </div>
  <div style="text-align:right;">
    <div class="security-tag">KLASIFIKASI: RAHASIA // TALENT DOSSIER</div>
    <div style="font-family:monospace;font-size:11px;color:#0e7490;font-weight:700;margin-top:2px;">
      REF ID: KIN-${app.id.slice(0, 8).toUpperCase()}-${new Date().getFullYear()}
    </div>
  </div>
</div>

<!-- 01. COMPOSITE EXECUTIVE VERDICT -->
<div class="composite-box">
  <div style="text-align:center;border-right:1px solid #e2e8f0;padding-right:16px;display:flex;align-items:center;justify-content:center;flex-direction:column;">
    <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#64748b;text-transform:uppercase;font-family:monospace;">Skor Komposit AI</div>
    <div style="font-size:48px;font-weight:900;color:#0f172a;line-height:1;margin:8px 0;font-family:monospace;">
      ${compScore}
      <span style="font-size:14px;color:#94a3b8;font-weight:600;">/100</span>
    </div>
    <div style="display:inline-block;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:800;letter-spacing:0.5px;background:${activeBadge.bg};color:${activeBadge.text};border:1px solid ${activeBadge.border};">
      ${recommendation}
    </div>
  </div>

  <div>
    <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:4px;">
      Ringkasan Keputusan Evaluasi Bakat
    </div>
    <div style="font-size:12px;color:#475569;line-height:1.6;margin-bottom:12px;">
      ${compEval ? escapeHtml(compEval.rationale) : (app.interviewResult ? escapeHtml(app.interviewResult.slice(0, 200)) : 'Evaluasi kandidat berbasis perpaduan analisis CV dan wawancara adaptif multi-dimensi.')}
    </div>

    <!-- 3-Pillar Weight Breakdown -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:11px;font-family:monospace;">
      <div style="background:#fff;padding:6px 8px;border:1px solid #e2e8f0;border-radius:4px;">
      </div>
      <div style="background:#fff;padding:6px 8px;border:1px solid #e2e8f0;border-radius:4px;">
        <span style="color:#64748b;">Live Voice (50%):</span> <strong style="color:#0f172a;">${app.interviewScore ?? '-'}%</strong>
      </div>
      <div style="background:#fff;padding:6px 8px;border:1px solid #e2e8f0;border-radius:4px;">
        <span style="color:#64748b;">Integritas (15%):</span> <strong style="color:${(compEval?.integrityPenalty || 0) > 0 ? '#be123c' : '#047857'};">${(compEval?.integrityPenalty || 0) > 0 ? `-${compEval?.integrityPenalty} pt` : 'Terverifikasi'}</strong>
      </div>
    </div>
  </div>
</div>

<!-- 02. CANDIDATE BIO -->
<div class="section-title">01 // PROFIL & INFORMASI KANDIDAT</div>
<table class="info-table">
  <tr>
    <th>Nama Lengkap</th><td><strong>${escapeHtml(app.fullName)}</strong></td>
    <th>Posisi Dilamar</th><td><strong>${escapeHtml(app.job ? app.job.title : app.appliedPosition || 'General')}</strong></td>
  </tr>
  <tr>
    <th>Email Resmi</th><td>${escapeHtml(app.email)}</td>
    <th>Nomor Telepon</th><td>${escapeHtml(app.phone)}</td>
  </tr>
  <tr>
    <th>Pendidikan Terakhir</th><td>${escapeHtml(app.education)} ${escapeHtml(app.university ? `• ${app.university}` : '')}</td>
    <th>Jurusan & IPK</th><td>${escapeHtml(app.major || '-')} ${app.gpa != null ? `(IPK: ${app.gpa})` : ''}</td>
  </tr>
  <tr>
    <th>Tempat, Tgl Lahir</th><td>${escapeHtml(app.placeOfBirth || '-')}, ${app.dateOfBirth ? new Date(app.dateOfBirth).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</td>
    <th>Pengalaman Kerja</th><td>${app.experiences?.length || 0} riwayat tercatat</td>
  </tr>
</table>

${skillMatrixHtml}
${phasesHtml}
${proctorHtml}

${app.interviewResult ? `
<div class="section-title" style="margin-top:20px;">05 // CATATAN EVALUATOR & TRANSKRIP HIGHLIGHT</div>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;font-size:12px;color:#334155;line-height:1.7;white-space:pre-wrap;">${escapeHtml(app.interviewResult)}</div>
` : ''}

<!-- FORMAL SIGN-OFF -->
<div class="section-title" style="margin-top:32px;">06 // LEMBAR PENGESAHAN & PERSETUJUAN DIREKSI</div>
<div class="signature-grid">
  <div>
    <div style="font-size:11px;color:#64748b;">Talent Acquisition Lead</div>
    <div class="sign-line"></div>
    <div style="font-size:11px;font-weight:700;margin-top:4px;">Nama: __________________</div>
    <div style="font-size:10px;color:#94a3b8;">Tgl: ___ / ___ / 2026</div>
  </div>

  <div>
    <div style="font-size:11px;color:#64748b;">User / Hiring Manager</div>
    <div class="sign-line"></div>
    <div style="font-size:11px;font-weight:700;margin-top:4px;">Nama: __________________</div>
    <div style="font-size:10px;color:#94a3b8;">Tgl: ___ / ___ / 2026</div>
  </div>

  <div>
    <div style="font-size:11px;color:#64748b;">Head of Human Resources</div>
    <div class="sign-line"></div>
    <div style="font-size:11px;font-weight:700;margin-top:4px;">Nama: __________________</div>
    <div style="font-size:10px;color:#94a3b8;">Tgl: ___ / ___ / 2026</div>
  </div>
</div>

<div style="margin-top:24px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between;font-family:monospace;">
  <span>Dokumen generated by Kinesta HR AI Recruitment Intelligence Engine</span>
  <span>Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
</div>
<script>setTimeout(()=>window.print(),400);</script>
</body></html>`);
    win.document.close();
  };

  const dashboardApplicants = allApplicants.length > 0 ? allApplicants : applicants;
  const activeApplicantTotal = allApplicants.length > 0 ? allApplicants.length : total;
  const activeProgramCount =
    jobsCatalogCount ??
    new Set(
      dashboardApplicants.map((applicant) => applicant.job?.title || applicant.appliedPosition).filter(Boolean)
    ).size;
  const completedInterviewCount = dashboardApplicants.filter((applicant) =>
    ['completed', 'scored'].includes(applicant.interviewStatus)
  ).length;
  const pendingReviewCount = dashboardApplicants.filter(
    (applicant) =>
      applicant.interviewStatus === 'completed' &&
      (applicant.interviewScore == null || applicant.interviewScore === 0)
  ).length;
  const passRatePercent = useMemo(() => {
    const evaluated = dashboardApplicants.filter(
      (a) =>
        a.compositeEvaluation?.recommendation &&
        a.compositeEvaluation.recommendation !== 'BELUM DINILAI'
    );
    if (evaluated.length === 0) return 0;
    const passed = evaluated.filter((a) =>
      ['STRONG HIRE', 'RECOMMENDED HIRE', 'CONSIDER'].includes(
        a.compositeEvaluation?.recommendation || ''
      )
    ).length;
    return Math.round((passed / evaluated.length) * 100);
  }, [dashboardApplicants]);

  const trendMonths = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString('id-ID', { month: 'short' }),
        value: 0
      };
    });
    for (const applicant of dashboardApplicants) {
      if (!applicant.createdAt) continue;
      const date = new Date(applicant.createdAt);
      if (Number.isNaN(date.getTime())) continue;
      const bucket = months.find((month) => month.key === `${date.getFullYear()}-${date.getMonth()}`);
      if (bucket) bucket.value += 1;
    }
    return months;
  }, [dashboardApplicants]);

  const trendMax = Math.max(1, ...trendMonths.map((month) => month.value));
  const trendPoints = trendMonths.map((month, index) => ({
    ...month,
    x: (index / Math.max(1, trendMonths.length - 1)) * 800,
    y: 170 - 20 - (month.value / trendMax) * 130
  }));
  const trendLinePath = buildSmoothPath(trendPoints);
  const trendAreaPath = `${trendLinePath} L 800 170 L 0 170 Z`;

  const initialAvatar = (name: string) => {
    const colors = [
      'from-blue-600 to-indigo-600', 'from-rose-500 to-pink-600',
      'from-primary-navy to-blue-accent', 'from-blue-accent to-info-cyan',
      'from-amber-500 to-orange-600', 'from-emerald-500 to-green-600'
    ];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 ring-emerald-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 ring-amber-200';
    return 'text-rose-600 bg-rose-50 ring-rose-200';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  interface NavMenuItem {
    key: AdminMenuKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }

  interface NavGroup {
    id: string;
    label: string;
    superadminOnly?: boolean;
    items: NavMenuItem[];
  }

  const navGroups: NavGroup[] = [
    {
      id: 'talent-ops',
      label: 'Operasional Right',
      items: [
        { key: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard },
        { key: 'pipeline', label: 'Pipeline Seleksi', icon: Layers, badge: 'Kanban' },
        { key: 'jobs', label: 'Lowongan Kerja', icon: Briefcase },
      ]
    },
    {
      id: 'ai-intel',
      label: 'Intelijen & Evaluasi AI',
      items: [
        { key: 'ranking', label: 'Peringkat & Matriks', icon: BarChart3 },
        { key: 'lha-governance', label: 'Kalibrasi & Koreksi LHA', icon: Scale },
        { key: 'proctoring', label: 'Audit Proctoring', icon: ShieldAlert, badge: 'Live' },
        { key: 'faq-helpdesk', label: 'Konten FAQ (RAG)', icon: BookOpen },
        { key: 'chatbot-faq', label: 'Chatbot AI', icon: Bot },
        { key: 'helpdesk-internal', label: 'Helpdesk Internal', icon: MessageSquare },
      ]
    },
    {
      id: 'super-ctrl',
      label: 'Kontrol Superadmin',
      superadminOnly: true,
      items: [
        { key: 'users', label: 'Akses & Admin', icon: Users },
        { key: 'ai-config', label: 'Konfigurasi AI Engine', icon: Cpu, badge: 'Core' },
        { key: 'audit-logs', label: 'Log Audit Keamanan', icon: Clock },
        { key: 'analytics', label: 'Analitika Eksekutif', icon: Activity },
      ]
    }
  ];

  const menuMeta: Partial<Record<AdminMenuKey, { title: string; subtitle: string; short: string; dotColor: string }>> = {
    dashboard: {
      title: 'Ringkasan Eksekutif',
      subtitle: 'Pantau seluruh aktivitas asesmen dan progres kandidat secara ringkas',
      short: 'Ringkasan',
      dotColor: 'bg-primary-navy'
    },
    peserta: {
      title: 'Peserta & Kandidat',
      subtitle: 'Manajemen dossier kandidat, tahapan seleksi, dan rekam jejak penilaian AI',
      short: 'Peserta',
      dotColor: 'bg-blue-accent'
    },
    pipeline: {
      title: 'Live Interview Asesor',
      subtitle: 'Jadwal wawancara langsung, transkrip real-time, dan monitor ruang ujian',
      short: 'Interview',
      dotColor: 'bg-blue-accent'
    },
    jobs: {
      title: 'Program Asesmen',
      subtitle: 'Kelola program asesmen lowongan, kriteria kelulusan, dan bobot evaluasi',
      short: 'Program',
      dotColor: 'bg-primary-navy'
    },
    materi: {
      title: materiHubProgramCode && materiHubTab === 'bank-soal' ? `Materi & Soal / ${materiHubProgramCode}` : 'Materi & Soal',
      subtitle: 'Katalog silabus terpadu, panduan materi belajar, dan bank soal CAT untuk Program Asesmen',
      short: 'Materi & Soal',
      dotColor: 'bg-primary-navy'
    },
    perusahaan: {
      title: 'Perusahaan (PT)',
      subtitle: 'Kelola entitas perusahaan mitra dan klik Detail untuk melihat program asesmen pada PT terkait',
      short: 'Perusahaan (PT)',
      dotColor: 'bg-primary-navy'
    },
    ranking: {
      title: 'Hasil & Peringkat (LHA)',
      subtitle: 'Matriks komparasi skor komposit AI, peringkat talenta, dan rekomendasi hiring',
      short: 'Hasil',
      dotColor: 'bg-success-green'
    },
    'lha-governance': {
      title: 'Kalibrasi & Koreksi LHA',
      subtitle: 'Tinjau perbandingan penilaian ganda (Penilai 1 vs Penilai 2) dan setujui permintaan koreksi LHA berversi',
      short: 'Kalibrasi & LHA',
      dotColor: 'bg-primary-navy'
    },
    proctoring: {
      title: 'Monitoring Proctoring',
      subtitle: 'Telemetri anti-cheat, pendeteksi tab switch, dan audit kepatuhan kamera',
      short: 'Proctoring',
      dotColor: 'bg-error-red'
    },
    users: {
      title: 'Pengguna & Hak Akses',
      subtitle: 'Manajemen hak akses asesor, HR admin, dan otorisasi superadmin',
      short: 'Pengguna',
      dotColor: 'bg-primary-navy'
    },
    'ai-config': {
      title: 'Konfigurasi Sistem & AI',
      subtitle: 'Atur model Gemini, suara virtual Ava, threshold kelulusan, dan integritas',
      short: 'Pengaturan',
      dotColor: 'bg-primary-navy'
    },
    'audit-logs': {
      title: 'Log Audit & Keamanan',
      subtitle: 'Rekam jejak mutasi data, histori login, dan kepatuhan sistem audit',
      short: 'Audit Log',
      dotColor: 'bg-slate-700'
    },
    analytics: {
      title: 'Analitika & Metrik',
      subtitle: 'Metrik konversi funnel talent acquisition dan performa asesmen',
      short: 'Analitika',
      dotColor: 'bg-primary-navy'
    },
    'faq-helpdesk': {
      title: 'Konten FAQ',
      subtitle: 'Upload konten FAQ Word (.docx), kelola item FAQ, dan sinkronisasi Proksis MCP Knowledge',
      short: 'Konten FAQ',
      dotColor: 'bg-blue-accent'
    },
    'chatbot-faq': {
      title: 'Chatbot AI',
      subtitle: 'Asisten AI Gemini berbasis referensi pengetahuan resmi yang terhubung ke Helpdesk Internal',
      short: 'Chatbot AI',
      dotColor: 'bg-blue-accent'
    },
    'helpdesk-internal': {
      title: 'Helpdesk Internal',
      subtitle: 'Kelola percakapan Helpdesk Internal dari kandidat (nama, perusahaan, dan program asesmen)',
      short: 'Helpdesk Internal',
      dotColor: 'bg-emerald-600'
    },
    help: {
      title: 'Pusat Bantuan & Panduan',
      subtitle: 'Dokumentasi operasional platform asesmen Right dan bantuan teknis',
      short: 'Bantuan',
      dotColor: 'bg-blue-accent'
    }
  };

  const filteredTableApplicants = useMemo(() => {
    const ptQ = ptFilter.toLowerCase();
    const progQ = programFilter.toLowerCase();
    const statusQ = statusFilter.toLowerCase();
    return applicants.filter((app) => {
      if (ptQ && !getCompanyForApplicant(app).toLowerCase().includes(ptQ)) return false;
      if (progQ && !getProgramForApplicant(app).toLowerCase().includes(progQ)) return false;
      if (statusQ) {
        const s = getStatusForApplicant(app);
        if (statusQ === 'proses' && s.label !== 'Proses') return false;
        if (statusQ === 'lulus' && s.label !== 'Lulus') return false;
        if (statusQ === 'gagal' && s.label !== 'Gagal') return false;
      }
      return true;
    });
  }, [applicants, ptFilter, programFilter, statusFilter]);

  return (
    <SuperadminLayout
      activeMenu={activeMenu}
      setActiveMenu={(nextMenu) => {
        if (nextMenu === 'materi') {
          setMateriHubProgramCode(undefined);
          setMateriHubCompanyName(undefined);
        }
        setActiveMenu(nextMenu);
      }}
      userRole={userRole}
      username={username}
      onLogout={handleLogout}
      title={menuMeta[activeMenu]?.title}
      subtitle={menuMeta[activeMenu]?.subtitle}
      docketRef={`TLN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`}
    >
      {activeMenu === 'dashboard' || activeMenu === 'peserta' ? (
        <div className="animate-fade-in space-y-6">
          {activeMenu === 'dashboard' && (
            <>
              {/* Clean 72px Executive Page Header */}
              <div className="min-h-[72px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight font-heading">
                    Ringkasan Eksekutif
                  </h1>
                  <p className="text-sm text-[#64748B] mt-0.5">
                    Pantau peserta aktif, program asesmen, evaluasi AI, dan audit proctoring terpadu.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    leftIcon={<Download className="w-4 h-4" />}
                    className="h-10 px-4 rounded-lg text-sm font-medium text-[#475569] border-[#E2E8F0] hover:bg-[#F8FAFC]"
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setActiveMenu('jobs')}
                    leftIcon={<Plus className="w-4 h-4" />}
                    className="h-10 px-4 rounded-lg text-sm font-semibold bg-[#1E3A8A] hover:bg-[#172554] text-white"
                  >
                    Tambah Program
                  </Button>
                </div>
              </div>

              {/* 4 Standardized KPI Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <AdminStatCard
                  label="Peserta aktif"
                  value={activeApplicantTotal}
                  subtext="Total kandidat terdaftar"
                  badge="Real-time"
                  badgeVariant="info"
                  icon={Users}
                  loading={loading && applicants.length === 0}
                />
                <AdminStatCard
                  label="Program asesmen"
                  value={activeProgramCount}
                  subtext="Program aktif di katalog"
                  badge="Published"
                  badgeVariant="success"
                  icon={BookOpen}
                  loading={loading && applicants.length === 0}
                />
                <AdminStatCard
                  label="Wawancara selesai"
                  value={completedInterviewCount}
                  subtext="Total sesi wawancara AI"
                  badge="Ava AI"
                  badgeVariant="neutral"
                  icon={Brain}
                  loading={loading && applicants.length === 0}
                />
                <AdminStatCard
                  label="Menunggu skoring"
                  value={pendingReviewCount}
                  subtext="Wawancara belum dinilai AI"
                  badge="Prioritas"
                  badgeVariant="warning"
                  icon={Clock}
                  loading={loading && applicants.length === 0}
                />
              </div>

              {/* Split Section: Spline Area Chart (8) + Priority Actions (4) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Span 8: Tren Peserta Asesmen Area Wave Chart */}
                <div className="lg:col-span-8 p-6 rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
                    <div>
                      <h3 className="text-base font-semibold text-[#0F172A] font-heading">
                        Tren Peserta Asesmen
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Volume pendaftaran &amp; penyelesaian asesmen 6 bulan terakhir
                      </p>
                    </div>
                    <span className="h-8 inline-flex items-center px-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium text-[#475569] shrink-0">
                      6 bulan
                    </span>
                  </div>

                  {/* SVG Spline Area Wave Chart */}
                  {loading && applicants.length === 0 ? (
                    <div className="h-48 mt-4 rounded-lg bg-[#E2E8F0]/70 animate-pulse" />
                  ) : (
                    <>
                      <div className="relative h-52 w-full mt-4 flex">
                        <div className="flex flex-col justify-between h-44 text-xs font-mono text-[#64748B] pr-3 select-none tabular-nums">
                          <span>{trendMax}</span>
                          <span>{Math.round(trendMax * 0.66)}</span>
                          <span>{Math.round(trendMax * 0.33)}</span>
                          <span>0</span>
                        </div>

                        <div className="flex-1 h-44 relative">
                          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                            <div className="border-b border-dashed border-[#E2E8F0] w-full" />
                            <div className="border-b border-dashed border-[#E2E8F0] w-full" />
                            <div className="border-b border-dashed border-[#E2E8F0] w-full" />
                            <div className="border-b border-[#E2E8F0] w-full" />
                          </div>

                          <svg
                            viewBox="0 0 800 170"
                            preserveAspectRatio="none"
                            className="w-full h-full overflow-visible"
                          >
                            <defs>
                              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.12" />
                                <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            <path
                              className="chart-area"
                              d={trendAreaPath}
                              fill="url(#trendGradient)"
                            />

                            <path
                              className="chart-line"
                              d={trendLinePath}
                              fill="none"
                              stroke="#2563EB"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />

                            {trendPoints.map((point) => (
                              <circle
                                key={point.key}
                                className="chart-dot"
                                cx={point.x}
                                cy={point.y}
                                r="4"
                                fill="#FFFFFF"
                                stroke="#2563EB"
                                strokeWidth="2.5"
                              />
                            ))}
                          </svg>
                        </div>
                      </div>
                      <div className="flex justify-between pl-8 pr-1 pt-2 text-xs font-mono text-[#64748B]">
                        {trendMonths.map((month) => (
                          <span key={month.key}>{month.label}</span>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="pt-4 mt-3 border-t border-[#E2E8F0] flex flex-wrap items-center gap-5 text-xs text-[#64748B]">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                      <span>Sesi terdaftar: <strong className="font-mono text-[#0F172A] tabular-nums">{activeApplicantTotal}</strong></span>
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                      <span>Tingkat kelulusan: <strong className="font-mono text-[#0F172A] tabular-nums">{passRatePercent}%</strong></span>
                    </span>
                  </div>
                </div>

                {/* Span 4: Perlu Tindakan Compact List */}
                <div className="lg:col-span-4 min-w-[320px] p-6 rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
                      <div>
                        <h3 className="text-base font-semibold text-[#0F172A] font-heading">
                          Perlu Tindakan
                        </h3>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          Antrean prioritas yang butuh verifikasi
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#F1F5F9] text-[#475569]">
                        3 item
                      </span>
                    </div>

                    <div className="divide-y divide-[#E2E8F0] mt-1">
                      <button
                        type="button"
                        onClick={() => setActiveMenu('jobs')}
                        className="w-full h-16 px-2 flex items-center justify-between gap-3 text-left hover:bg-[#F8FAFC] transition-colors cursor-pointer rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] shrink-0" title="Prioritas P1" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0F172A] truncate">
                              Approval Bank Soal
                            </p>
                            <p className="text-xs text-[#64748B] truncate">
                              P1 • 12 butir soal menunggu review
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#64748B] shrink-0" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveMenu('proctoring')}
                        className="w-full h-16 px-2 flex items-center justify-between gap-3 text-left hover:bg-[#F8FAFC] transition-colors cursor-pointer rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] shrink-0" title="Prioritas P2" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0F172A] truncate">
                              Flag Integritas Proctoring
                            </p>
                            <p className="text-xs text-[#64748B] truncate">
                              P2 • Anomali wajah &amp; pindah tab terdeteksi
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#64748B] shrink-0" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveMenu('pipeline')}
                        className="w-full h-16 px-2 flex items-center justify-between gap-3 text-left hover:bg-[#F8FAFC] transition-colors cursor-pointer rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#64748B] shrink-0" title="Prioritas P3" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0F172A] truncate">
                              Wawancara Belum Dinilai
                            </p>
                            <p className="text-xs text-[#64748B] truncate">
                              P3 • Sesi selesai menunggu input BARS
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#64748B] shrink-0" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
                    <span>Prioritas otomatis oleh AI</span>
                    <span className="font-semibold text-[#1E3A8A]">3 tertunda</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─── CANDIDATE DOSSIER TABLE & FILTER CARD ─── */}
          <Card elevation="flat" className="p-6 space-y-4 rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
            {/* Single Toolbar */}
            <div className="min-h-[64px] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
                <div className="w-full sm:w-[260px]">
                  <Input
                    placeholder="Cari nama atau email peserta..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    leftIcon={<Search className="w-4 h-4 text-[#94A3B8]" />}
                    className="h-10 rounded-lg"
                  />
                </div>

                <div className="w-full sm:w-[180px]">
                  <Select
                    value={ptFilter}
                    onChange={(e) => { setPtFilter(e.target.value); setPage(1); }}
                    className="h-10 rounded-lg text-sm font-medium"
                  >
                    <option value="">Semua PT</option>
                    <option value="Telkom">PT Telkom Indonesia Tbk</option>
                    <option value="Mandiri">Bank Mandiri Tbk</option>
                    <option value="CIMB">Bank CIMB Niaga Tbk</option>
                    <option value="Astra">Astra International Tbk</option>
                    <option value="Pertamina">Pertamina Hulu Energi</option>
                  </Select>
                </div>

                <div className="w-full sm:w-[180px]">
                  <Select
                    value={programFilter}
                    onChange={(e) => { setProgramFilter(e.target.value); setPage(1); }}
                    className="h-10 rounded-lg text-sm font-medium"
                  >
                    <option value="">Semua Program</option>
                    {DEFAULT_ASSESSMENT_PROGRAMS.map((prog) => (
                      <option key={prog.id} value={prog.title}>
                        {prog.title}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="w-full sm:w-[150px]">
                  <Select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="h-10 rounded-lg text-sm font-medium"
                  >
                    <option value="">Semua Status</option>
                    <option value="proses">Proses</option>
                    <option value="lulus">Lulus</option>
                    <option value="gagal">Gagal</option>
                  </Select>
                </div>
              </div>

              {/* Right Utilities + Actions */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <div className="hidden xl:flex items-center gap-1.5 text-xs text-[#64748B] mr-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Diperbarui tiap 15 dtk</span>
                </div>
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  leftIcon={<Download className="w-4 h-4" />}
                  className="h-10 px-4 rounded-lg text-sm font-medium text-[#475569] border-[#E2E8F0] hover:bg-[#F8FAFC]"
                >
                  Export
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setImportWizardOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                  className="h-10 px-4 rounded-lg text-sm font-semibold bg-[#1E3A8A] hover:bg-[#172554] text-white"
                >
                  Import CSV
                </Button>
              </div>
            </div>

            {/* Bulk Action Bar (when >=1 selected) */}
            {userRole === 'superadmin' && selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#EEF2FF] border border-[#C7D2FE] px-4 py-2.5 rounded-lg text-xs">
                <span className="font-semibold text-[#1E3A8A]">
                  {selectedIds.length} dipilih
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="xs"
                    onClick={() => void handleBulkDelete()}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Hapus Terpilih
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setSelectedIds([])}
                    className="bg-white border-[#E2E8F0] text-[#475569]"
                  >
                    Batalkan
                  </Button>
                </div>
              </div>
            )}
            {/* Mobile Responsive Cards (< md) */}
            <div className="md:hidden space-y-3">
              {loading ? (
                <div className="py-10 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-navy" />
                  <span className="text-xs">Memuat data peserta...</span>
                </div>
              ) : applicants.length === 0 ? (
                <div className="py-10 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600 text-sm">Belum ada data peserta</p>
                </div>
              ) : (
                filteredTableApplicants.map((app) => {
                  const statusObj = getStatusForApplicant(app);
                  return (
                    <div key={`m-${app.id}`} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-ink truncate">{app.fullName}</p>
                            <p className="text-xs text-muted-slate truncate">{app.email}</p>
                          </div>
                          <Badge
                            variant={statusObj.label === 'Lulus' ? 'success' : statusObj.label === 'Gagal' ? 'danger' : 'info'}
                            format="soft"
                            hasDot
                          >
                            {statusObj.label}
                          </Badge>
                        </div>
                        <div className="text-xs space-y-1.5 text-slate-600">
                          <p><span className="font-semibold text-slate-500">Perusahaan:</span> {getCompanyForApplicant(app)}</p>
                          <p><span className="font-semibold text-slate-500">Program Asesmen:</span> {getProgramForApplicant(app)}</p>
                          <div className="flex items-center justify-between pt-1">
                            <span>
                              <span className="font-semibold text-slate-500">Skor CAT:</span>{' '}
                              {app.examAttempt?.score != null ? (
                                <strong className="font-mono text-emerald-700">{app.examAttempt.score}/100</strong>
                              ) : (
                                'Belum'
                              )}
                            </span>
                            <span className="font-semibold text-slate-700">{getStageForApplicant(app)}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1">
                          <button onClick={() => setSelectedApplicant(app)} className="px-2.5 py-1.5 text-xs font-semibold text-primary-navy bg-soft-blue rounded-lg cursor-pointer">Detail</button>
                          {userRole === 'superadmin' && (
                            <>
                              <button onClick={() => setEditingApplicant(app)} className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer">Edit</button>
                              <button onClick={() => handleDelete(app.id)} className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 rounded-lg cursor-pointer">Hapus</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Desktop & Tablet Responsive Table */}
            <div className="hidden md:block overflow-x-auto">
            <Table className="w-full min-w-[960px]">
              <TableHeader className="sticky top-0 z-10 bg-white">
                <TableRow className="border-b border-[#E2E8F0]">
                  <TableHead className="w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === applicants.length && applicants.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(applicants.map(a => a.id));
                        else setSelectedIds([]);
                      }}
                      className="rounded border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A] cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="w-[220px] text-xs font-semibold uppercase tracking-wider text-[#64748B] whitespace-nowrap">Peserta</TableHead>
                  <TableHead className="w-[160px] text-xs font-semibold uppercase tracking-wider text-[#64748B] whitespace-nowrap">Perusahaan</TableHead>
                  <TableHead className="w-[240px] text-xs font-semibold uppercase tracking-wider text-[#64748B] whitespace-nowrap">Program Asesmen</TableHead>
                  <TableHead className="w-[110px] text-xs font-semibold uppercase tracking-wider text-[#64748B] whitespace-nowrap">Skor CAT</TableHead>
                  <TableHead className="w-[110px] text-xs font-semibold uppercase tracking-wider text-[#64748B] whitespace-nowrap">Status</TableHead>
                  <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider text-[#64748B] whitespace-nowrap">Tanggal Daftar</TableHead>
                  <TableHead className="w-[80px] text-right text-xs font-semibold uppercase tracking-wider text-[#64748B] whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, skIdx) => (
                    <TableRow key={`sk-${skIdx}`} className="h-16">
                      <TableCell colSpan={8}>
                        <div className="h-5 w-full rounded bg-[#E2E8F0] animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredTableApplicants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <AdminEmptyState
                        icon={Users}
                        title="Belum ada data peserta"
                        description="Data pendaftaran asesmen atau hasil filter Anda akan muncul di sini."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTableApplicants.map((app, appIdx) => {
                    const statusObj = getStatusForApplicant(app);
                    const isChecked = selectedIds.includes(app.id);
                    const initials = app.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();
                    const regDate = app.createdAt
                      ? new Date(app.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                      : '-';
                    const companyName = getCompanyForApplicant(app);
                    const programName = getProgramForApplicant(app).replace(/\s*\([^)]*\)\s*$/, '');

                    return (
                      <TableRow
                        key={app.id}
                        isSelected={isChecked}
                        className="h-16 hover:bg-[#F8FAFC] transition-colors"
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedIds([...selectedIds, app.id]);
                              else setSelectedIds(selectedIds.filter((id) => id !== app.id));
                            }}
                            className="rounded border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A] cursor-pointer"
                          />
                        </TableCell>

                        <TableCell className="w-[220px] max-w-[220px]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                AVATAR_PALETTES[appIdx % AVATAR_PALETTES.length]
                              }`}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#0F172A] truncate" title={app.fullName}>
                                {app.fullName}
                              </p>
                              <p className="text-xs text-[#64748B] truncate" title={app.email}>
                                {app.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="w-[160px] max-w-[160px] text-sm text-[#475569]">
                          <span className="block truncate" title={companyName}>
                            {companyName}
                          </span>
                        </TableCell>

                        <TableCell className="w-[240px] max-w-[240px] text-sm text-[#475569]">
                          <div className="space-y-1 min-w-0">
                            <span className="block line-clamp-2 font-medium text-[#0F172A] leading-snug" title={programName}>
                              {programName}
                            </span>
                            {getAssessmentCodesForApplicant(app).length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {getAssessmentCodesForApplicant(app).slice(0, 2).map((code) => (
                                  <span
                                    key={code}
                                    className="text-[11px] font-mono bg-[#F1F5F9] text-[#475569] px-1.5 py-0.5 rounded"
                                  >
                                    {code}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="w-[110px]">
                          {app.examAttempt?.score != null ? (
                            <div className="flex flex-col tabular-nums">
                              <span className="font-mono text-sm font-semibold text-[#0F172A]">
                                {app.examAttempt.score}
                                <span className="text-xs font-normal text-[#64748B]">/100</span>
                              </span>
                              <span className="text-xs text-[#64748B]">
                                {app.examAttempt.status === 'submitted' ? 'Terkumpul' : app.examAttempt.status || 'CAT'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-[#64748B]">Belum</span>
                          )}
                        </TableCell>

                        <TableCell className="w-[110px]">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
                              statusObj.label === 'Lulus'
                                ? 'bg-[#DCFCE7] text-[#166534]'
                                : statusObj.label === 'Gagal'
                                  ? 'bg-[#FEE2E2] text-[#991B1B]'
                                  : 'bg-[#E0F2FE] text-[#075985]'
                            }`}
                          >
                            {statusObj.label}
                          </span>
                        </TableCell>

                        <TableCell className="w-[120px] text-xs font-mono text-[#475569] whitespace-nowrap tabular-nums">
                          {regDate}
                        </TableCell>

                        <TableCell className="w-[80px] text-right">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() => setOpenActionId((prev) => (prev === app.id ? null : app.id))}
                              className="p-2 text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              aria-label="Menu Aksi"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {openActionId === app.id && (
                              <div className="absolute right-0 mt-1 w-36 bg-white border border-[#E2E8F0] rounded-lg shadow-lg py-1 z-30 text-left">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionId(null);
                                    setSelectedApplicant(app);
                                  }}
                                  className="w-full px-3 py-2 text-xs font-medium text-[#0F172A] hover:bg-[#F8FAFC] flex items-center gap-2 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#64748B]" />
                                  <span>Lihat Detail</span>
                                </button>
                                {userRole === 'superadmin' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionId(null);
                                        setEditingApplicant(app);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-[#0F172A] hover:bg-[#F8FAFC] flex items-center gap-2 cursor-pointer"
                                    >
                                      <Edit className="w-3.5 h-3.5 text-[#64748B]" />
                                      <span>Edit Data</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionId(null);
                                        void handleDelete(app.id);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-[#991B1B] hover:bg-[#FEE2E2]/40 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Hapus</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </div>

            {/* Pagination Controls */}
            {!loading && applicants.length > 0 && (
              <div className="px-2 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-slate">
                <p className="font-sans">
                  Menampilkan <span className="font-semibold text-slate-800">{(page - 1) * 10 + 1}</span> –{' '}
                  <span className="font-semibold text-slate-800">{Math.min(page * 10, total)}</span> dari{' '}
                  <span className="font-semibold text-slate-800">{total}</span> peserta
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-border-slate hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                          page === pageNum
                            ? 'bg-primary-navy text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {lastPage > 5 && <span className="px-1 text-slate-400 font-mono">...</span>}
                  <button
                    onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                    disabled={page >= lastPage}
                    className="p-1.5 rounded-lg border border-border-slate hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : activeMenu === 'pipeline' ? (
            <div className="animate-fade-in">
              <PipelineView 
                applicants={allApplicants.length > 0 ? (allApplicants as any) : (applicants as any)}
                onViewApplicant={(app: any) => setSelectedApplicant(app)}
                onScoreInterview={handleScoreInterview}
                onOpenDecision={(app: any) => openDecisionModal(app)}
                onRefresh={fetchAllApplicants}
                scoringLoading={scoringLoading}
              />
            </div>
          ) : activeMenu === 'jobs' ? (
            <div className="animate-fade-in space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-xl border border-border-slate">
                <span className="text-sm font-semibold text-ink">Mode pengelolaan program</span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={!showProgramBuilder ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setShowProgramBuilder(false)}
                    className="text-xs"
                  >
                    Daftar Program
                  </Button>
                  <Button
                    variant={showProgramBuilder ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setShowProgramBuilder(true)}
                    className="text-xs flex items-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Program Builder</span>
                  </Button>
                </div>
              </div>
              {showProgramBuilder ? (
                <AdminProgramBuilder onBack={() => setShowProgramBuilder(false)} />
              ) : (
                <JobManagement
                  onOpenMateriAndSoal={(programCode, companyName) => {
                    setMateriHubProgramCode(programCode);
                    setMateriHubCompanyName(companyName);
                    setMateriHubTab('materi');
                    setActiveMenu('materi');
                  }}
                />
              )}
            </div>
          ) : activeMenu === 'ranking' ? (
            <div className="animate-fade-in">
              <RankingView />
            </div>
          ) : activeMenu === 'lha-governance' ? (
            <div className="animate-fade-in">
              <AdminLhaGovernanceView />
            </div>
          ) : activeMenu === 'proctoring' ? (
            <div className="animate-fade-in">
              <ProctoringView 
                applicants={allApplicants.length > 0 ? (allApplicants as any) : (applicants as any)}
                onViewApplicant={(app: any) => setSelectedApplicant(app)}
              />
            </div>
          ) : activeMenu === 'users' ? (
            <div className="animate-fade-in">
              <AdminSecurityCard />
              <UserManagement />
            </div>
          ) : activeMenu === 'ai-config' ? (
            <div className="animate-fade-in">
              <AIConfigView />
            </div>
          ) : activeMenu === 'audit-logs' ? (
            <div className="animate-fade-in">
              <AuditLogsView />
            </div>
          ) : activeMenu === 'analytics' ? (
            <div className="animate-fade-in">
              <AnalyticsView 
                applicants={allApplicants.length > 0 ? allApplicants : applicants}
              />
            </div>
          ) : activeMenu === 'materi' || activeMenu === 'bank-soal' ? (
            <div className="animate-fade-in">
              <AdminMateriSoalHub
                initialTab={activeMenu === 'bank-soal' ? 'bank-soal' : materiHubTab}
                initialProgramCode={materiHubProgramCode}
                initialCompanyName={materiHubCompanyName}
                onBackToPrograms={materiHubProgramCode ? () => setActiveMenu('jobs') : undefined}
              />
            </div>
          ) : activeMenu === 'perusahaan' ? (
            <div className="animate-fade-in">
              <AdminCompanyMatrix
                onNavigateToPrograms={() => setActiveMenu('jobs')}
                onNavigateToBankSoal={(programCode, companyName) => {
                  setMateriHubProgramCode(programCode);
                  setMateriHubCompanyName(companyName);
                  setMateriHubTab('bank-soal');
                  setActiveMenu('materi');
                }}
                onNavigateToMateri={(programCode, companyName) => {
                  setMateriHubProgramCode(programCode);
                  setMateriHubCompanyName(companyName);
                  setMateriHubTab('materi');
                  setActiveMenu('materi');
                }}
              />
            </div>
          ) : activeMenu === 'faq-helpdesk' || activeMenu === 'chatbot-faq' || activeMenu === 'helpdesk-internal' ? (
            <div className="animate-fade-in">
              <AdminFaqHelpdesk
                initialTab={
                  activeMenu === 'helpdesk-internal'
                    ? 'helpdesk'
                    : activeMenu === 'chatbot-faq'
                      ? 'chatbot'
                      : 'knowledge'
                }
              />
            </div>
          ) : activeMenu === 'help' ? (
            <div className="animate-fade-in space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-[#0F172A] font-heading">Pusat Bantuan &amp; Panduan Right</h1>
                <p className="text-sm text-[#64748B] mt-0.5">Panduan operasional platform asesmen, integrasi API, dan dukungan tim teknis.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#1E3A8A]" />
                      Bantuan Langsung Tim Support
                    </h3>
                    <p className="text-sm text-[#475569] mt-2 leading-relaxed">
                      Tim support siap membantu kendala operasional, pengaturan bobot ujian, maupun kendala proctoring kandidat.
                    </p>
                    <div className="mt-4 space-y-1.5 text-sm text-[#475569]">
                      <p>Email: <strong className="text-[#0F172A]">support@talenta.id</strong></p>
                      <p>Hotline: <strong className="text-[#0F172A] tabular-nums">+62 21 555-8290</strong> (08:00 – 18:00 WIB)</p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => setActiveMenu('helpdesk-internal')}
                    className="mt-5 w-fit h-10 px-4 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white"
                    leftIcon={<Mail className="w-4 h-4" />}
                  >
                    Hubungi Support
                  </Button>
                </div>

                <div className="p-6 rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[#0F172A]">Dokumentasi Operasional</h3>
                    <ul className="mt-3 divide-y divide-[#E2E8F0]">
                      {[
                        'Panduan Pelaksanaan Live Interview dengan Ava AI',
                        'Aturan Kepatuhan & Kalibrasi AI Proctoring Anti-Cheat',
                        'Format Standar Parsing CV dan Rubrik Penilaian Gemini',
                        'Panduan Ekspor dan Cetak Surat Keputusan Kandidat',
                      ].map((docTitle) => (
                        <li key={docTitle}>
                          <button
                            type="button"
                            onClick={() => setActiveMenu('faq-helpdesk')}
                            className="w-full h-9 flex items-center gap-2.5 text-left text-sm text-[#2563EB] hover:underline cursor-pointer"
                          >
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="truncate">{docTitle}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-[#94A3B8] pt-2">
                Versi Sistem: Right Assessment Platform v2.4.0
              </p>
            </div>
          ) : null}

      {/* Detail Modal - Applicant Detail */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-mono font-bold text-base shadow-xs flex-shrink-0">
                    {selectedApplicant.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary-navy bg-soft-blue border border-accent-border px-1.5 py-0.2 rounded">
                        Dossier Kandidat
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 font-heading mt-0.5">{selectedApplicant.fullName}</h3>
                    <p className="text-xs text-slate-500">{selectedApplicant.gender} &bull; {selectedApplicant.placeOfBirth || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => openDecisionModal(selectedApplicant, 'offer')}
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                    title="Draft Surat Penawaran atau Penolakan dengan AI"
                  >
                    Surat Keputusan
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openPrintReport(selectedApplicant)}
                    leftIcon={<Printer className="w-3.5 h-3.5 text-slate-500" />}
                    title="Cetak Dokumen Dossier Eksekutif"
                  >
                    Cetak
                  </Button>
                  <button
                    onClick={() => setSelectedApplicant(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-white space-y-4 font-sans">
              {/* Executive Composite Verdict Banner */}
              {selectedApplicant.compositeEvaluation && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-xs relative overflow-hidden">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Keputusan Evaluasi Rekrutmen
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                          selectedApplicant.compositeEvaluation.recommendation === 'STRONG HIRE'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : selectedApplicant.compositeEvaluation.recommendation === 'RECOMMENDED HIRE'
                              ? 'bg-soft-blue text-primary-navy border border-accent-border'
                              : selectedApplicant.compositeEvaluation.recommendation === 'CONSIDER'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {selectedApplicant.compositeEvaluation.recommendation}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-normal">
                        {selectedApplicant.compositeEvaluation.rationale}
                      </p>
                      {/* Breakdown Bars */}
                      <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                        <div className="bg-white p-2 rounded-md border border-slate-200">
                          <span className="text-slate-500 block text-[9px] uppercase font-semibold">Voice Live (50%)</span>
                          <strong className="text-slate-900 font-bold font-mono">{selectedApplicant.interviewScore ?? '-'}%</strong>
                        </div>
                        <div className="bg-white p-2 rounded-md border border-slate-200">
                          <span className="text-slate-500 block text-[9px] uppercase font-semibold">Integritas (15%)</span>
                          <strong className={selectedApplicant.compositeEvaluation.integrityPenalty > 0 ? 'text-rose-700 font-bold font-mono' : 'text-emerald-700 font-bold font-mono'}>
                            {selectedApplicant.compositeEvaluation.integrityPenalty > 0 ? `-${selectedApplicant.compositeEvaluation.integrityPenalty} pt` : 'Patuh (0 Flag)'}
                          </strong>
                        </div>
                      </div>
                    </div>
                    {/* Score Dial */}
                    <div className="text-center flex-shrink-0 bg-white px-4 py-3 rounded-md border border-slate-200 shadow-xs">
                      <span className="text-3xl font-extrabold font-mono text-blue-accent block leading-tight">
                        {selectedApplicant.compositeEvaluation.compositeScore}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Skor Komposit
                      </span>
                    </div>
                  </div>
                  {/* Quick Decision CTA Buttons */}
                  <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => openDecisionModal(selectedApplicant, 'offer')}
                    >
                      Kirim Offer Letter
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => openDecisionModal(selectedApplicant, 'rejection')}
                    >
                      Beri Constructive Feedback
                    </Button>
                  </div>
                </div>
              )}

              {/* Hasil CAT */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hasil Pengerjaan CAT</p>
                  <Badge variant={selectedApplicant.examAttempt ? 'success' : 'neutral'} format="soft">
                    {selectedApplicant.examAttempt ? 'Sudah Dikerjakan' : 'Belum Dikerjakan'}
                  </Badge>
                </div>
                {selectedApplicant.examAttempt ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Skor CAT</p>
                      <p className="font-mono text-lg font-bold text-emerald-700">
                        {selectedApplicant.examAttempt.score ?? '-'}
                        <span className="text-[10px] font-normal text-slate-400">/100</span>
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Integritas</p>
                      <p className="font-mono text-lg font-bold text-primary-navy">
                        {selectedApplicant.examAttempt.integrityScore ?? '-'}
                        <span className="text-[10px] font-normal text-slate-400">/100</span>
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Jawaban</p>
                      <p className="font-mono text-lg font-bold text-slate-800">
                        {selectedApplicant.examAttempt.totalAnswered ?? '-'}
                        {selectedApplicant.examAttempt.totalQuestions ? `/${selectedApplicant.examAttempt.totalQuestions}` : ''}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Dikumpulkan</p>
                      <p className="text-xs font-semibold text-slate-800 mt-1">
                        {selectedApplicant.examAttempt.submittedAt
                          ? `${new Date(selectedApplicant.examAttempt.submittedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`
                          : '-'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Kandidat belum menyelesaikan ujian CAT untuk program ini.</p>
                )}
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Posisi Dilamar</p>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary-navy" />
                    <span className="font-bold text-slate-800 text-sm">{selectedApplicant.job ? selectedApplicant.job.title : selectedApplicant.appliedPosition || 'General'}</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pendidikan</p>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary-navy" />
                    <span className="font-bold text-slate-800 text-sm">{selectedApplicant.education}</span>
                    {selectedApplicant.university && <span className="text-slate-500 text-xs">• {selectedApplicant.university}</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 ml-6">{selectedApplicant.major || '-'} {selectedApplicant.gpa ? <span className="font-mono font-bold text-primary-navy">• IPK: {selectedApplicant.gpa}</span> : ''}</p>
                </div>
              </div>

              {/* Job Description */}
              {selectedApplicant.job && (
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-3.5 h-3.5 text-primary-navy" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Deskripsi Pekerjaan</h4>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-slate-600 text-xs leading-relaxed whitespace-pre-line max-h-32 overflow-y-auto">
                    {selectedApplicant.job.description}
                  </div>
                </div>
              )}

              {/* AI Interview Card */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-soft-blue border border-accent-border text-primary-navy">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 font-heading text-sm">AI Interview Multimodal</h4>
                      <p className="text-xs text-slate-500">
                        {selectedApplicant.interviewStatus === 'not_started' ? 'Belum ada sesi wawancara' :
                         selectedApplicant.interviewStatus === 'in_progress' ? 'Sesi sedang berlangsung' :
                         selectedApplicant.interviewStatus === 'completed' ? 'Sesi selesai, menunggu penilaian' :
                         'Sesi selesai dan sudah dinilai AI'}
                      </p>
                    </div>
                  </div>
                  {selectedApplicant.interviewScore !== null && (
                    <div className="px-3 py-1.5 rounded-md text-center bg-soft-blue border border-accent-border font-mono">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-primary-navy">Nilai</p>
                      <p className="text-xl font-bold text-blue-accent">{selectedApplicant.interviewScore}%</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Passing Threshold Badge */}
                  {selectedApplicant.interviewScore !== null && selectedApplicant.job?.interviewPassingScore != null && (
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold ${
                        selectedApplicant.interviewScore >= selectedApplicant.job.interviewPassingScore
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        <Target className="w-3.5 h-3.5" />
                        {selectedApplicant.interviewScore >= selectedApplicant.job.interviewPassingScore
                          ? `Lolos Passing Grade (Min. ${selectedApplicant.job.interviewPassingScore}%)`
                          : `Di Bawah Passing Grade (Min. ${selectedApplicant.job.interviewPassingScore}%)`}
                      </span>
                    </div>
                  )}

                  {/* Skill Matrix & Radar Chart */}
                  {selectedApplicant.interviewSkillMatrix && (() => {
                    try {
                      const skills = JSON.parse(selectedApplicant.interviewSkillMatrix);
                      if (!Array.isArray(skills) || skills.length === 0) return null;
                      return (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Analisis Kompetensi AI (Radar & Breakdown Metrik)
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div className="flex flex-col items-center">
                              <RadarChart
                                axes={skills.map((s: { skill: string; score: number }) => ({ label: s.skill, value: s.score }))}
                                size={240}
                              />
                            </div>
                            <div className="space-y-2">
                              {skills.map((s: { skill: string; score: number; notes: string }, i: number) => (
                                <div key={i} className="bg-white p-2.5 rounded-md border border-slate-200">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-slate-800">{s.skill}</span>
                                    <span className="text-xs font-mono font-bold text-primary-navy">{s.score}%</span>
                                  </div>
                                  <div className="h-1.5 w-full rounded bg-slate-100 overflow-hidden mb-1">
                                    <div className="h-full bg-primary-navy transition-all duration-500"
                                      style={{ width: `${s.score}%` }} />
                                  </div>
                                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{s.notes}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    } catch { return null; }
                  })()}

                  {/* Phase Scores & Question Details */}
                  {selectedApplicant.interviewPhaseScores && (() => {
                    try {
                      const phases = JSON.parse(selectedApplicant.interviewPhaseScores);
                      if (!Array.isArray(phases) || phases.length === 0) return null;
                      return (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-primary-navy" /> Evaluasi per Fase Wawancara
                          </p>
                          <div className="space-y-2">
                            {phases.map((p: any, pi: number) => (
                              <div key={pi} className="bg-white rounded-md p-3 border border-slate-200">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-slate-800">
                                    Fase {pi + 1}: {p.name}
                                  </span>
                                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                    p.score >= 70 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : p.score >= 50 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                                  }`}>
                                    {p.score}%
                                  </span>
                                </div>
                                {Array.isArray(p.questions) && p.questions.length > 0 && (
                                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                                    {p.questions.map((q: any, qi: number) => (
                                      <div key={qi} className="flex items-start gap-2 text-xs">
                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-700 flex-shrink-0">
                                          {q.score}
                                        </span>
                                        <div className="flex-1">
                                          <p className="font-medium text-slate-800">{q.question}</p>
                                          {q.note && <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{q.note}</p>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } catch { return null; }
                  })()}

                  {/* Interview Score / Re-Score Button */}
                  {selectedApplicant.interviewTranscript && (
                    <Button
                      variant="primary"
                      onClick={() => handleScoreInterview(selectedApplicant.id)}
                      disabled={scoringLoading}
                      className="w-full"
                      leftIcon={
                        scoringLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> :
                        selectedApplicant.interviewStatus === 'scored' ? <RefreshCw className="w-3.5 h-3.5" /> :
                        <Brain className="w-3.5 h-3.5" />
                      }
                    >
                      {scoringLoading ? 'Menilai dengan Gemini AI...' :
                       selectedApplicant.interviewStatus === 'scored' ? 'Nilai Ulang Wawancara dengan AI' :
                       'Nilai Wawancara dengan AI'}
                    </Button>
                  )}

                  {/* Interview Result */}
                  {selectedApplicant.interviewResult && (
                    <div className="bg-slate-50 p-3.5 rounded-md border border-slate-200">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Award className="w-3.5 h-3.5 text-primary-navy" />
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Hasil Penilaian Wawancara</p>
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-mono">{selectedApplicant.interviewResult}</div>
                    </div>
                  )}

                  {/* Transcript */}
                  {selectedApplicant.interviewTranscript ? (
                    <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
                      <div className="border-b border-slate-200 px-3.5 py-2 bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Radio className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-[10px] font-bold font-mono text-slate-600 uppercase tracking-wider">Transkrip Wawancara</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{selectedApplicant.interviewTranscript.length.toLocaleString()} karakter</span>
                      </div>
                      <div className="p-3.5 max-h-48 overflow-y-auto text-xs text-slate-600 leading-relaxed whitespace-pre-line font-mono bg-white">
                        {selectedApplicant.interviewTranscript}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-md text-center border border-dashed border-slate-300">
                      <p className="text-slate-500 font-medium text-xs">Belum ada sesi wawancara AI</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Integrity / Proctoring Card */}
              {(() => {
                try {
                  const p = selectedApplicant.proctorFlags ? JSON.parse(selectedApplicant.proctorFlags) : null;
                  const violations = p?.violations;
                  if (!Array.isArray(violations) || violations.length === 0) return null;
                  return (
                    <div className="bg-white p-4 rounded-lg border border-rose-200 shadow-xs">
                      <div className="flex items-center gap-2 mb-2.5">
                        <ShieldAlert className="w-4 h-4 text-rose-700" />
                        <h4 className="text-xs font-bold text-rose-800 font-mono uppercase tracking-wider">Catatan Integritas Sesi</h4>
                        <span className="text-[10px] font-bold font-mono text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">{violations.length} insiden</span>
                      </div>
                      <div className="space-y-2">
                        {violations.map((v: { time: string; reason: string }, i: number) => (
                          <div key={i} className="flex items-start gap-2 bg-rose-50/50 rounded-md p-2.5 border border-rose-100">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs text-rose-900 font-medium">{v.reason}</p>
                              <p className="text-[10px] font-mono text-slate-500 mt-0.5">{v.time}</p>
                            </div>
                          </div>
                        ))}
                        <p className="text-[11px] text-slate-500 pt-1 font-mono">Sesi ini ditandai untuk ditinjau manual oleh HR sebelum keputusan akhir.</p>
                      </div>
                    </div>
                  );
                } catch { return null; }
              })()}

              {/* Experiences */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <Building className="w-4 h-4 text-primary-navy" />
                  <h4 className="text-xs font-bold font-mono text-slate-700 uppercase tracking-wider">Riwayat Pengalaman</h4>
                  <span className="text-xs font-mono text-slate-400">({selectedApplicant.experiences?.length || 0})</span>
                </div>

                {!selectedApplicant.experiences || selectedApplicant.experiences.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 rounded-md border border-dashed border-slate-200">
                    <p className="text-slate-500 text-xs">Tidak ada riwayat pengalaman kerja.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedApplicant.experiences.map((exp, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-md border border-slate-200">
                        <h5 className="text-xs font-bold text-slate-900">{exp.position || 'Posisi tidak disebutkan'}</h5>
                        <p className="text-primary-navy font-medium text-xs mt-0.5">{exp.companyName || 'Perusahaan tidak disebutkan'}</p>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 mt-1.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            {exp.startDate ? new Date(exp.startDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : '-'}
                          </span>
                          <span className="text-slate-300">→</span>
                          <span>
                            {exp.isCurrent ? 'Sekarang' : (exp.endDate ? new Date(exp.endDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : '-')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingApplicant && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                    Edit Data Pelamar
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 font-heading mt-0.5">{editingApplicant.fullName}</h3>
                <p className="text-xs text-slate-500 font-mono">Perbarui data diri dan formasi pekerjaan pelamar</p>
              </div>
              <button
                onClick={() => setEditingApplicant(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <form id="edit-form" onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                    <input
                      type="text" required
                      value={editingApplicant.fullName}
                      onChange={e => setEditingApplicant({ ...editingApplicant, fullName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:bg-white focus:border-primary-navy focus:ring-1 focus:ring-primary-navy outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email" required
                      value={editingApplicant.email}
                      onChange={e => setEditingApplicant({ ...editingApplicant, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:bg-white focus:border-primary-navy focus:ring-1 focus:ring-primary-navy outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <Input
                      label="No. Telepon"
                      type="text"
                      value={editingApplicant.phone || ''}
                      onChange={e => setEditingApplicant({ ...editingApplicant, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Select
                      label="Jenis Kelamin"
                      value={editingApplicant.gender}
                      onChange={e => setEditingApplicant({ ...editingApplicant, gender: e.target.value })}
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </Select>
                  </div>
                  <div>
                    <Input
                      label="Tempat Lahir"
                      type="text"
                      value={editingApplicant.placeOfBirth || ''}
                      onChange={e => setEditingApplicant({ ...editingApplicant, placeOfBirth: e.target.value })}
                    />
                  </div>
                  <div>
                    <Input
                      label="Tanggal Lahir"
                      type="date"
                      value={editingApplicant.dateOfBirth ? editingApplicant.dateOfBirth.split('T')[0] : ''}
                      onChange={e => setEditingApplicant({ ...editingApplicant, dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Textarea
                      label="Alamat"
                      value={editingApplicant.address || ''}
                      onChange={e => setEditingApplicant({ ...editingApplicant, address: e.target.value })}
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  <div>
                    <Input
                      label="Posisi Dilamar"
                      type="text"
                      value={editingApplicant.appliedPosition || ''}
                      onChange={e => setEditingApplicant({ ...editingApplicant, appliedPosition: e.target.value })}
                    />
                  </div>
                  <div>
                    <Select
                      label="Pendidikan"
                      value={editingApplicant.education || ''}
                      onChange={e => setEditingApplicant({ ...editingApplicant, education: e.target.value })}
                    >
                      <option value="SMA">SMA Sederajat</option>
                      <option value="D1">D1</option>
                      <option value="D2">D2</option>
                      <option value="D3">D3</option>
                      <option value="D4">D4</option>
                      <option value="S1">S1</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Universitas</label>
                    <input
                      type="text"
                      value={editingApplicant.university || ''}
                      onChange={e => setEditingApplicant({ ...editingApplicant, university: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:bg-white focus:border-primary-navy focus:ring-1 focus:ring-primary-navy outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Jurusan</label>
                    <input
                      type="text"
                      value={editingApplicant.major || ''}
                      onChange={e => setEditingApplicant({ ...editingApplicant, major: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:bg-white focus:border-primary-navy focus:ring-1 focus:ring-primary-navy outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">IPK</label>
                    <input
                      type="number" step="0.01" min="0" max="4"
                      value={editingApplicant.gpa ?? ''}
                      onChange={e => setEditingApplicant({ ...editingApplicant, gpa: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:bg-white focus:border-primary-navy focus:ring-1 focus:ring-primary-navy outline-none transition-colors"
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingApplicant(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                form="edit-form"
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-primary-navy hover:bg-primary-navy rounded-md shadow-xs transition-colors disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── AI Decision Letter Generator Modal ─── */}
      {decisionModalOpen && decisionCandidate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-soft-blue border border-accent-border flex items-center justify-center text-primary-navy shadow-xs">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-primary-navy">
                      AI Decision Engine
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      REF: LET-{decisionCandidate.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">
                    Draft Surat Keputusan Rekrutmen
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setDecisionModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-white">
              {/* Candidate Context Strip */}
              <div className="bg-slate-50 p-3.5 rounded-md border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{decisionCandidate.fullName}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {decisionCandidate.job?.title || decisionCandidate.appliedPosition} • {decisionCandidate.email}
                  </p>
                </div>
                {decisionCandidate.compositeEvaluation && (
                  <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${
                    decisionCandidate.compositeEvaluation.recommendation === 'STRONG HIRE'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : decisionCandidate.compositeEvaluation.recommendation === 'RECOMMENDED HIRE'
                        ? 'bg-soft-blue text-primary-navy border border-accent-border'
                        : decisionCandidate.compositeEvaluation.recommendation === 'CONSIDER'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {decisionCandidate.compositeEvaluation.recommendation} ({decisionCandidate.compositeEvaluation.compositeScore}/100)
                  </span>
                )}
              </div>

              {/* Decision Type Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 font-mono">
                  Pilih Format Surat Keputusan
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDecisionType('offer')}
                    className={`p-3.5 rounded-md text-left border transition-colors ${
                      decisionType === 'offer'
                        ? 'border-primary-navy bg-soft-blue/70 text-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">Surat Penawaran (Offer Letter)</span>
                      {decisionType === 'offer' && <Check className="w-4 h-4 text-primary-navy" />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Penawaran resmi dengan apresiasi pencapaian wawancara & instruksi onboarding.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionType('rejection')}
                    className={`p-3.5 rounded-md text-left border transition-colors ${
                      decisionType === 'rejection'
                        ? 'border-rose-700 bg-rose-50/70 text-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">Constructive Rejection Feedback</span>
                      {decisionType === 'rejection' && <Check className="w-4 h-4 text-rose-700" />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Penolakan beretika dengan apresiasi & masukan objektif untuk pertumbuhan karier.
                    </p>
                  </button>
                </div>
              </div>

              {/* Custom Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-mono">
                  Instruksi Tambahan HR (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Paket gaji Rp 14jt, tanggal mulai 10 Des, tekankan kemampuan komunikasi..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-primary-navy focus:ring-1 focus:ring-primary-navy outline-none transition-colors"
                />
              </div>

              {/* Generate Trigger */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerateDecisionLetter}
                  disabled={decisionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-navy hover:bg-primary-navy text-white rounded-md text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
                >
                  {decisionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Gemini AI Sedang Menyusun Surat...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{decisionResult ? 'Generate Ulang Surat AI' : 'Generate Surat dengan AI'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Generated Letter Output Section */}
              {decisionResult && (
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  {/* Highlights */}
                  {decisionResult.highlights && decisionResult.highlights.length > 0 && (
                    <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1.5">
                        Poin Kunci yang Ditekankan AI:
                      </p>
                      <ul className="space-y-1">
                        {decisionResult.highlights.map((h: string, idx: number) => (
                          <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-navy mt-1.5 flex-shrink-0" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Subject Line */}
                  <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                      Subjek Surat
                    </label>
                    <input
                      type="text"
                      value={decisionResult.subject}
                      onChange={(e) => setDecisionResult({ ...decisionResult, subject: e.target.value })}
                      className="w-full text-xs font-bold text-slate-900 bg-transparent border-0 outline-none"
                    />
                  </div>

                  {/* Letter Body */}
                  <div className="bg-slate-50 p-3.5 rounded-md border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                        Isi Surat (Dapat Diedit)
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">
                        {decisionResult.letterBody.length} karakter
                      </span>
                    </div>
                    <textarea
                      rows={12}
                      value={decisionResult.letterBody}
                      onChange={(e) => setDecisionResult({ ...decisionResult, letterBody: e.target.value })}
                      className="w-full text-xs text-slate-800 leading-relaxed bg-white p-3 rounded-md border border-slate-200 font-mono focus:border-primary-navy focus:ring-1 focus:ring-primary-navy outline-none resize-y"
                    />
                  </div>

                  {/* Export / Copy Toolbar */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-[11px] font-mono text-slate-400">
                      Status: Draft Siap Dikirim
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyLetter}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                      >
                        {copiedLetter ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                        <span>{copiedLetter ? 'Tersalin!' : 'Salin Teks'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintLetter}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 transition-colors shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak / Ekspor PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Wizard Modal */}
      <AdminCSVImportWizard
        isOpen={importWizardOpen}
        onClose={() => setImportWizardOpen(false)}
        onSuccess={(count) => {
          Swal.fire({
            icon: 'success',
            title: 'Impor Peserta Berhasil',
            text: `Berhasil mengimpor ${count} data kandidat ke dalam sistem!`,
            confirmButtonColor: '#0E7490'
          });
          fetchApplicants();
        }}
      />

      {/* Vertical Timeline Audit Modal */}
      <AdminVerticalTimeline
        isOpen={timelineOpen}
        onClose={() => setTimelineOpen(false)}
        candidate={timelineCandidate}
      />

      {/* Compact 56px Helpdesk FAB (Collapsed = icon only, no floating text overlap) */}
      <button
        type="button"
        onClick={() => {
          setActiveMenu('helpdesk-internal');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#1E3A8A] hover:bg-[#172554] text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
        title="Buka Helpdesk Internal"
        aria-label="Buka Helpdesk Internal"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    </SuperadminLayout>
  );
}
