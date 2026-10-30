import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  LogOut, Search, Filter, FileText, ChevronLeft, ChevronRight, Briefcase,
  Download, LayoutDashboard, ShieldCheck, Calendar, Edit, Trash2, Cpu,
  RefreshCw, Sparkles, Users, Clock, CheckCircle2, ChevronDown,
  X, Menu, Brain, Radio, Sun, Mail, Phone,
  GraduationCap, MapPin, BookOpen, Award, Building,
  Star, Eye, Printer, ShieldAlert, BarChart3, AlertTriangle, Target, Activity,
  Copy, Check, Send, Layers, Loader2, FileCheck, ArrowUpRight, CheckSquare, Video, Sliders
} from 'lucide-react';
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
import { AdminMasterMateriTree } from './admin/AdminMasterMateriTree';
import { AdminBankSoalEditor } from './admin/AdminBankSoalEditor';
import { AdminCompanyMatrix } from './admin/AdminCompanyMatrix';
import AdminBillingCredit from './admin/AdminBillingCredit';
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
  recommendation: 'STRONG HIRE' | 'RECOMMENDED HIRE' | 'CONSIDER' | 'NOT RECOMMENDED';
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
}

// Helpers for Talenta+ Candidate Table representation
const getCompanyForApplicant = (app: Applicant): string => {
  if (app.experiences && app.experiences.length > 0 && app.experiences[0]?.companyName) {
    return app.experiences[0].companyName;
  }
  const companies = [
    'GoTo Gojek Tokopedia Tbk',
    'Astra International Tbk',
    'PT Telkom Indonesia Tbk',
    'Pertamina Hulu Energi',
    'Bank Mandiri Tbk',
  ];
  const charSum = app.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return companies[charSum % companies.length];
};

const getProgramForApplicant = (app: Applicant): string => {
  if (app.job?.title) {
    return `Asesmen ${app.job.title} Batch I`;
  }
  if (app.appliedPosition) {
    return `Asesmen ${app.appliedPosition} Batch I`;
  }
  return 'Asesmen Software Engineer Batch I';
};

const getStageForApplicant = (app: Applicant): string => {
  if (app.interviewStatus === 'completed' || app.interviewStatus === 'scored') {
    if (app.screeningStatus === 'success' || app.compositeEvaluation?.recommendation === 'STRONG HIRE') {
      return 'Keputusan Akhir';
    }
    return 'Review Asesor';
  }
  if (app.interviewStatus === 'in_progress') {
    return 'Live Interview';
  }
  if (app.proctorFlags && app.proctorFlags !== '[]' && app.proctorFlags.length > 5) {
    return 'AI Proctoring';
  }
  return 'Tes Soal';
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
  'bg-sky-500 text-white',
  'bg-red-500 text-white',
  'bg-blue-600 text-white',
  'bg-primary-navy text-white',
  'bg-rose-500 text-white',
  'bg-emerald-600 text-white',
  'bg-indigo-600 text-white',
  'bg-amber-500 text-white',
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [allApplicants, setAllApplicants] = useState<Applicant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [educationFilter, setEducationFilter] = useState('');
  const [interviewStatusFilter, setInterviewStatusFilter] = useState('');
  const [ptFilter, setPtFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [chartRange, setChartRange] = useState<'30 hari' | '7 hari' | '90 hari'>('30 hari');
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<AdminMenuKey>('dashboard');
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
  const [showProgramBuilder, setShowProgramBuilder] = useState(false);

  const fetchApplicants = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        navigate('/admin/login');
        return;
      }
      const response = await axios.get('/api/admin/applicants', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit: 10, search, education: educationFilter, interviewStatus: interviewStatusFilter }
      });
      setApplicants(response.data.data);
      setTotal(response.data.meta.total);
      setLastPage(response.data.meta.lastPage);
    } catch (error) {
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, educationFilter, interviewStatusFilter, navigate]);

  const fetchAllApplicants = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      const response = await axios.get('/api/admin/applicants', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100 }
      });
      setAllApplicants(response.data.data);
    } catch (error) {
      console.error('Failed to fetch all applicants:', error);
    }
  }, []);

  useEffect(() => {
    window.setTimeout(() => {
      fetchApplicants();
      fetchAllApplicants();
    }, 0);
  }, [fetchApplicants, fetchAllApplicants]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminUsername');
    navigate('/admin/login');
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data Pelamar?',
      text: 'Data yang dihapus tidak dapat dikembalikan.',
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
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data pelamar berhasil dihapus', timer: 2000, showConfirmButton: false });
      fetchApplicants();
    } catch {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menghapus data pelamar' });
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
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'data_pelamar.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
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
      'NOT RECOMMENDED': { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' }
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
    <div style="font-size:12px;color:#475569;margin-top:2px;">Platform Intelijen Rekrutmen & Penilaian Talenta Terakreditasi</div>
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
      Ringkasan Keputusan Evaluasi Talenta
    </div>
    <div style="font-size:12px;color:#475569;line-height:1.6;margin-bottom:12px;">
      ${compEval ? escapeHtml(compEval.rationale) : (app.interviewResult ? escapeHtml(app.interviewResult.slice(0, 200)) : 'Evaluasi kandidat berbasis perpaduan analisis CV dan wawancara adaptif multi-dimensi.')}
    </div>

    <!-- 3-Pillar Weight Breakdown -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:11px;font-family:monospace;">
      <div style="background:#fff;padding:6px 8px;border:1px solid #e2e8f0;border-radius:4px;">
        <span style="color:#64748b;">CV Match (35%):</span> <strong style="color:#0f172a;">${app.screeningScore ?? '-'}%</strong>
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

  const statsCards = [
    { label: 'Total Pelamar', value: total, icon: Users, gradient: 'from-blue-600 to-indigo-600', badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/50' },
    { label: 'Menunggu Review', value: applicants.filter(a => a.screeningStatus === 'pending' || !a.screeningStatus).length, icon: Clock, gradient: 'from-amber-500 to-orange-600', badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/50' },
    { label: 'Sudah Di-screening', value: applicants.filter(a => a.screeningStatus === 'success').length, icon: CheckCircle2, gradient: 'from-emerald-500 to-green-600', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50' },
    { label: 'Selesai Interview', value: applicants.filter(a => a.interviewStatus === 'completed' || a.interviewStatus === 'scored').length, icon: Brain, gradient: 'from-primary-navy to-blue-accent', badge: 'bg-soft-blue text-primary-navy ring-1 ring-accent-border/50' },
  ];

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
      label: 'Operasional Talenta',
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
        { key: 'proctoring', label: 'Audit Proctoring', icon: ShieldAlert, badge: 'Live' },
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
      title: 'Dashboard Admin',
      subtitle: 'Kelola seluruh aktivitas asesmen dalam satu tampilan',
      short: 'Ringkasan',
      dotColor: 'bg-primary-navy'
    },
    peserta: {
      title: 'Daftar Peserta Asesmen',
      subtitle: 'Manajemen dossier kandidat, tahapan seleksi, dan rekam jejak penilaian AI',
      short: 'Peserta',
      dotColor: 'bg-blue-accent'
    },
    pipeline: {
      title: 'Live Interview & Pipeline',
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
      title: 'Master Materi & Kurikulum',
      subtitle: 'Repositori materi evaluasi, silabus kompetensi, dan panduan asesmen',
      short: 'Materi',
      dotColor: 'bg-primary-navy'
    },
    'bank-soal': {
      title: 'Bank Soal & Bank Studi Kasus',
      subtitle: 'Penyusunan pertanyaan wawancara adaptif dan instrumen tes teknis',
      short: 'Bank Soal',
      dotColor: 'bg-warning-amber'
    },
    perusahaan: {
      title: 'PT & Perusahaan Rekanan',
      subtitle: 'Manajemen entitas perusahaan klien dan unit bisnis penyelenggara asesmen',
      short: 'Perusahaan',
      dotColor: 'bg-primary-navy'
    },
    billing: {
      title: 'Model Monetisasi & Saldo Kredit',
      subtitle: 'Saldo kredit prabayar (Rp 45.000 / kandidat), faktur resmi PPN 11%, dan statement perusahaan',
      short: 'Billing',
      dotColor: 'bg-emerald-600'
    },
    ranking: {
      title: 'Hasil Asesmen & Peringkat',
      subtitle: 'Matriks komparasi skor komposit AI, peringkat talenta, dan rekomendasi hiring',
      short: 'Hasil',
      dotColor: 'bg-success-green'
    },
    proctoring: {
      title: 'Proctoring & Integritas Ujian',
      subtitle: 'Telemetri anti-cheat, pendeteksi tab switch, dan audit kepatuhan kamera',
      short: 'Proctoring',
      dotColor: 'bg-error-red'
    },
    users: {
      title: 'Pengguna & Role',
      subtitle: 'Manajemen hak akses asesor, HR admin, dan otorisasi superadmin',
      short: 'Pengguna',
      dotColor: 'bg-primary-navy'
    },
    'ai-config': {
      title: 'Pengaturan & Konfigurasi AI',
      subtitle: 'Atur model Gemini, suara virtual Ava, threshold kelulusan, dan integritas',
      short: 'Pengaturan',
      dotColor: 'bg-primary-navy'
    },
    'audit-logs': {
      title: 'Audit Log & Keamanan',
      subtitle: 'Rekam jejak mutasi data, histori login, dan kepatuhan sistem audit',
      short: 'Audit Log',
      dotColor: 'bg-slate-700'
    },
    analytics: {
      title: 'Analitika Eksekutif',
      subtitle: 'Metrik konversi funnel talent acquisition dan performa asesmen',
      short: 'Analitika',
      dotColor: 'bg-primary-navy'
    },
    help: {
      title: 'Pusat Bantuan & Panduan',
      subtitle: 'Dokumentasi operasional platform asesmen Talenta+ dan bantuan teknis',
      short: 'Bantuan',
      dotColor: 'bg-blue-accent'
    }
  };

  return (
    <SuperadminLayout
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
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
              {/* Header: Date + Title + Subtitle */}
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <span className="text-xs font-medium text-muted-slate block mb-1">
                    {new Date().toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight font-heading">
                    Dashboard Admin
                  </h1>
                  <p className="text-sm text-muted-slate mt-1 font-normal">
                    Kelola seluruh aktivitas asesmen dalam satu tampilan.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    onClick={handleBatchScreen}
                    isLoading={batchScreeningLoading}
                    leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                    className="shadow-xs"
                  >
                    Screening Massal AI
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleExportCSV}
                    leftIcon={<Download className="w-3.5 h-3.5 text-slate-500" />}
                  >
                    Export
                  </Button>
                </div>
              </div>

              {/* 4 Top Metric Cards (Horizontal Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {/* Card 1: Peserta Aktif */}
                <Card elevation="flat" className="p-5 hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-muted-slate mb-3">
                    <span className="text-xs sm:text-sm font-medium">Peserta aktif</span>
                    <div className="w-8 h-8 rounded-lg bg-soft-blue flex items-center justify-center text-primary-navy">
                      <Users className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold font-heading text-ink tracking-tight">
                      {total > 0 ? total.toLocaleString('id-ID') : '1.248'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100/80">
                    <span className="text-xs font-semibold text-success-green flex items-center gap-1">
                      ↑ 12,5% <span className="font-normal text-muted-slate">dari bulan lalu</span>
                    </span>
                    <div className="flex items-end gap-0.5 h-4">
                      <div className="w-1 bg-soft-blue h-2 rounded-xs" />
                      <div className="w-1 bg-soft-blue h-2.5 rounded-xs" />
                      <div className="w-1 bg-accent-border h-3 rounded-xs" />
                      <div className="w-1 bg-blue-accent/60 h-3.5 rounded-xs" />
                      <div className="w-1 bg-blue-accent h-4 rounded-xs" />
                    </div>
                  </div>
                </Card>

                {/* Card 2: Program Berjalan */}
                <Card elevation="flat" className="p-5 hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-muted-slate mb-3">
                    <span className="text-xs sm:text-sm font-medium">Program berjalan</span>
                    <div className="w-8 h-8 rounded-lg bg-soft-blue flex items-center justify-center text-primary-navy">
                      <BookOpen className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold font-heading text-ink tracking-tight">
                      12
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100/80">
                    <span className="text-xs font-semibold text-success-green flex items-center gap-1">
                      ↑ 8,2% <span className="font-normal text-muted-slate">dari periode lalu</span>
                    </span>
                    <div className="flex items-end gap-0.5 h-4">
                      <div className="w-1 bg-soft-blue h-2 rounded-xs" />
                      <div className="w-1 bg-accent-border h-3 rounded-xs" />
                      <div className="w-1 bg-blue-accent/50 h-2.5 rounded-xs" />
                      <div className="w-1 bg-blue-accent/70 h-3.5 rounded-xs" />
                      <div className="w-1 bg-blue-accent h-4 rounded-xs" />
                    </div>
                  </div>
                </Card>

                {/* Card 3: Ujian Hari Ini */}
                <Card elevation="flat" className="p-5 hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-muted-slate mb-3">
                    <span className="text-xs sm:text-sm font-medium">Ujian hari ini</span>
                    <div className="w-8 h-8 rounded-lg bg-soft-blue flex items-center justify-center text-primary-navy">
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold font-heading text-ink tracking-tight">
                      86
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100/80">
                    <span className="text-xs font-semibold text-success-green flex items-center gap-1">
                      ↑ 3,1% <span className="font-normal text-muted-slate">dari kemarin</span>
                    </span>
                    <div className="flex items-end gap-0.5 h-4">
                      <div className="w-1 bg-soft-blue h-1.5 rounded-xs" />
                      <div className="w-1 bg-soft-blue h-2.5 rounded-xs" />
                      <div className="w-1 bg-accent-border h-3.5 rounded-xs" />
                      <div className="w-1 bg-blue-accent/70 h-3 rounded-xs" />
                      <div className="w-1 bg-blue-accent h-4 rounded-xs" />
                    </div>
                  </div>
                </Card>

                {/* Card 4: Flag Integritas */}
                <Card elevation="flat" className="p-5 hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-muted-slate mb-3">
                    <span className="text-xs sm:text-sm font-medium">Flag integritas</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-warning-amber">
                      <ShieldAlert className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold font-heading text-ink tracking-tight">
                      23
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100/80">
                    <span className="text-xs font-semibold text-warning-amber flex items-center gap-1">
                      ↑ 4,8% <span className="font-normal text-muted-slate">dari minggu lalu</span>
                    </span>
                    <div className="flex items-end gap-0.5 h-4">
                      <div className="w-1 bg-amber-100 h-2 rounded-xs" />
                      <div className="w-1 bg-amber-200 h-2.5 rounded-xs" />
                      <div className="w-1 bg-amber-300 h-3 rounded-xs" />
                      <div className="w-1 bg-amber-400 h-3.5 rounded-xs" />
                      <div className="w-1 bg-amber-500 h-4 rounded-xs" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Split Section: Spline Area Chart (8) + Priority Actions (4) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
                {/* Span 8: Tren Peserta Asesmen Area Wave Chart */}
                <Card elevation="flat" className="lg:col-span-8 p-5 sm:p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-ink font-heading">
                        Tren peserta asesmen
                      </h3>
                      <p className="text-xs text-muted-slate mt-0.5">
                        Aktivitas 30 hari terakhir
                      </p>
                    </div>

                    <div className="relative">
                      <select
                        value={chartRange}
                        onChange={(e) => setChartRange(e.target.value as any)}
                        className="text-xs font-semibold text-slate-700 bg-white border border-border-slate rounded-lg px-3 py-1.5 pr-7 focus:outline-none focus:border-primary-navy cursor-pointer appearance-none"
                      >
                        <option value="30 hari">30 hari</option>
                        <option value="7 hari">7 hari</option>
                        <option value="90 hari">90 hari</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* SVG Spline Area Wave Chart */}
                  <div className="relative h-56 w-full mt-4 flex">
                    {/* Y-Axis scale */}
                    <div className="flex flex-col justify-between h-44 text-[11px] font-mono text-slate-400 pr-3 select-none">
                      <span>1.200</span>
                      <span>800</span>
                      <span>400</span>
                      <span>0</span>
                    </div>

                    {/* SVG Graphic */}
                    <div className="flex-1 h-44 relative">
                      {/* Grid Lines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        <div className="border-b border-dashed border-slate-200 w-full" />
                        <div className="border-b border-dashed border-slate-200 w-full" />
                        <div className="border-b border-dashed border-slate-200 w-full" />
                        <div className="border-b border-slate-200 w-full" />
                      </div>

                      <svg
                        viewBox="0 0 800 170"
                        preserveAspectRatio="none"
                        className="w-full h-full overflow-visible"
                      >
                        <defs>
                          <linearGradient id="talentaWaveGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
                            <stop offset="60%" stopColor="#2563EB" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.00" />
                          </linearGradient>
                        </defs>

                        {/* Spline Area Fill */}
                        <path
                          d="M 0 150 C 90 145, 140 120, 210 108 C 280 95, 330 118, 410 102 C 490 88, 530 96, 610 70 C 690 48, 730 58, 800 38 L 800 170 L 0 170 Z"
                          fill="url(#talentaWaveGradient)"
                        />

                        {/* Spline Stroke Line */}
                        <path
                          d="M 0 150 C 90 145, 140 120, 210 108 C 280 95, 330 118, 410 102 C 490 88, 530 96, 610 70 C 690 48, 730 58, 800 38"
                          fill="none"
                          stroke="#2563EB"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />

                        {/* Interactive Data Dots */}
                        <circle cx="210" cy="108" r="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />
                        <circle cx="410" cy="102" r="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />
                        <circle cx="610" cy="70" r="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />
                        <circle cx="800" cy="38" r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                      </svg>
                    </div>
                  </div>
                </Card>

                {/* Span 4: Perlu Tindakan Priority Items */}
                <Card elevation="flat" className="lg:col-span-4 p-5 sm:p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-bold text-ink font-heading">
                          Perlu tindakan
                        </h3>
                        <p className="text-xs text-muted-slate mt-0.5">
                          Prioritas yang perlu Anda periksa
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-warning-amber">
                        <AlertTriangle className="w-4.5 h-4.5" />
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {/* Priority Item 1: Approval bank soal */}
                      <button
                        onClick={() => setActiveMenu('jobs')}
                        className="w-full p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/80 transition-all flex items-center justify-between text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-[#D97706] shrink-0">
                            <CheckSquare className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-ink group-hover:text-blue-accent transition-colors">
                              Approval bank soal
                            </p>
                            <p className="text-xs text-muted-slate">
                              12 soal menunggu review
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4.5 h-4.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </button>

                      {/* Priority Item 2: Flag integritas */}
                      <button
                        onClick={() => setActiveMenu('proctoring')}
                        className="w-full p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/80 transition-all flex items-center justify-between text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center text-error-red shrink-0">
                            <ShieldAlert className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-ink group-hover:text-blue-accent transition-colors">
                              Flag integritas
                            </p>
                            <p className="text-xs text-muted-slate">
                              6 event perlu diperiksa
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4.5 h-4.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </button>

                      {/* Priority Item 3: Interview belum dinilai */}
                      <button
                        onClick={() => setActiveMenu('pipeline')}
                        className="w-full p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/80 transition-all flex items-center justify-between text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-accent shrink-0">
                            <Video className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-ink group-hover:text-blue-accent transition-colors">
                              Interview belum dinilai
                            </p>
                            <p className="text-xs text-muted-slate">
                              14 sesi selesai hari ini
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4.5 h-4.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-muted-slate">
                    <span>Prioritas otomatis oleh AI</span>
                    <span className="font-semibold text-primary-navy">3 tertunda</span>
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* ─── CANDIDATE DOSSIER TABLE & FILTER CARD ─── */}
          <Card elevation="flat" className="p-5 space-y-4">
            {/* Filter controls row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                {/* Search */}
                <div className="w-full sm:w-60">
                  <Input
                    placeholder="Cari nama, email..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
                  />
                </div>

                {/* PT Filter */}
                <select
                  value={ptFilter}
                  onChange={(e) => { setPtFilter(e.target.value); setPage(1); }}
                  className="h-10 text-xs font-medium text-slate-700 bg-white border border-border-slate rounded-lg px-3 pr-7 focus:outline-none focus:border-primary-navy cursor-pointer"
                >
                  <option value="">Semua PT</option>
                  <option value="GoTo">GoTo Gojek Tokopedia Tbk</option>
                  <option value="Astra">Astra International Tbk</option>
                  <option value="Telkom">PT Telkom Indonesia Tbk</option>
                  <option value="Pertamina">Pertamina Hulu Energi</option>
                  <option value="Mandiri">Bank Mandiri Tbk</option>
                </select>

                {/* Program Filter */}
                <select
                  value={programFilter}
                  onChange={(e) => { setProgramFilter(e.target.value); setPage(1); }}
                  className="h-10 text-xs font-medium text-slate-700 bg-white border border-border-slate rounded-lg px-3 pr-7 focus:outline-none focus:border-primary-navy cursor-pointer"
                >
                  <option value="">Semua Program</option>
                  <option value="Software Engineer">Asesmen Software Engineer Batch I</option>
                  <option value="Manajemen Madya">Asesmen Manajemen Madya Batch II</option>
                  <option value="Data Analyst">Asesmen Data Analyst</option>
                  <option value="Product Manager">Asesmen Product Manager</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="h-10 text-xs font-medium text-slate-700 bg-white border border-border-slate rounded-lg px-3 pr-7 focus:outline-none focus:border-primary-navy cursor-pointer"
                >
                  <option value="">Semua Status</option>
                  <option value="proses">Proses</option>
                  <option value="lulus">Lulus</option>
                  <option value="gagal">Gagal</option>
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setImportWizardOpen(true)}
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Import CSV
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportCSV}
                  leftIcon={<Download className="w-3.5 h-3.5 text-slate-500" />}
                >
                  Export
                </Button>
              </div>
            </div>

            {/* Candidate Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === applicants.length && applicants.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(applicants.map(a => a.id));
                        else setSelectedIds([]);
                      }}
                      className="rounded border-slate-300 text-primary-navy focus:ring-primary-navy cursor-pointer"
                    />
                  </TableHead>
                  <TableHead>Peserta ↕</TableHead>
                  <TableHead>PT / Perusahaan ↕</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Tahap ↕</TableHead>
                  <TableHead>Status ↕</TableHead>
                  <TableHead>Tgl Daftar ↕</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-navy" />
                      <span>Memuat data peserta...</span>
                    </TableCell>
                  </TableRow>
                ) : applicants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-600">Belum ada data peserta</p>
                      <p className="text-xs text-slate-400 mt-1">Data pendaftaran asesmen akan muncul di sini.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  applicants
                    .filter((app) => {
                      if (ptFilter && !getCompanyForApplicant(app).toLowerCase().includes(ptFilter.toLowerCase())) return false;
                      if (programFilter && !getProgramForApplicant(app).toLowerCase().includes(programFilter.toLowerCase())) return false;
                      if (statusFilter) {
                        const s = getStatusForApplicant(app);
                        if (statusFilter.toLowerCase() === 'proses' && s.label !== 'Proses') return false;
                        if (statusFilter.toLowerCase() === 'lulus' && s.label !== 'Lulus') return false;
                        if (statusFilter.toLowerCase() === 'gagal' && s.label !== 'Gagal') return false;
                      }
                      return true;
                    })
                    .map((app, appIdx) => {
                      const statusObj = getStatusForApplicant(app);
                      const isChecked = selectedIds.includes(app.id);
                      const initials = app.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();
                      const regDate = app.createdAt
                        ? new Date(app.createdAt).toISOString().split('T')[0]
                        : '2026-03-13';

                      return (
                        <TableRow
                          key={app.id}
                          isSelected={isChecked}
                        >
                          {/* Checkbox */}
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedIds([...selectedIds, app.id]);
                                else setSelectedIds(selectedIds.filter((id) => id !== app.id));
                              }}
                              className="rounded border-slate-300 text-primary-navy focus:ring-primary-navy cursor-pointer"
                            />
                          </TableCell>

                          {/* Peserta (Avatar + Name + Email) */}
                          <TableCell>
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 font-heading shadow-2xs ${
                                  AVATAR_PALETTES[appIdx % AVATAR_PALETTES.length]
                                }`}
                              >
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-ink truncate leading-tight">
                                  {app.fullName}
                                </p>
                                <p className="text-xs text-muted-slate truncate mt-0.5">
                                  {app.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* PT / Perusahaan */}
                          <TableCell className="text-xs font-medium text-slate-800">
                            {getCompanyForApplicant(app)}
                          </TableCell>

                          {/* Program */}
                          <TableCell className="text-xs text-slate-600">
                            {getProgramForApplicant(app)}
                          </TableCell>

                          {/* Tahap */}
                          <TableCell className="text-xs font-medium text-slate-700">
                            {getStageForApplicant(app)}
                          </TableCell>

                          {/* Status Pill Badge */}
                          <TableCell>
                            <Badge
                              variant={
                                statusObj.label === 'Lulus' ? 'success' :
                                statusObj.label === 'Gagal' ? 'danger' : 'info'
                              }
                              format="soft"
                              hasDot
                            >
                              {statusObj.label}
                            </Badge>
                          </TableCell>

                          {/* Tgl Daftar */}
                          <TableCell className="font-mono text-xs text-muted-slate">
                            {regDate}
                          </TableCell>

                          {/* Aksi */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setSelectedApplicant(app)}
                                className="p-1.5 text-slate-400 hover:text-primary-navy hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Lihat Dossier Lengkap"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setTimelineCandidate({
                                    name: app.fullName,
                                    email: app.email,
                                    program: getProgramForApplicant(app),
                                    pt: getCompanyForApplicant(app),
                                    compositeScore: app.interviewScore || 85,
                                    integrityScore: 98
                                  });
                                  setTimelineOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-primary-navy hover:bg-soft-blue rounded-lg transition-colors cursor-pointer"
                                title="Timeline Vertikal Audit Trail"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openDecisionModal(app, 'offer')}
                                className="p-1.5 text-slate-400 hover:text-blue-accent hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Draft Surat Keputusan AI"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openPrintReport(app)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Cetak Dossier Eksekutif"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              {userRole === 'superadmin' && (
                                <>
                                  <button
                                    onClick={() => setEditingApplicant(app)}
                                    className="p-1.5 text-slate-400 hover:text-primary-navy hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Pelamar"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(app.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus Pelamar"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>

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
                onScreenCV={handleScreenCV}
                onScoreInterview={handleScoreInterview}
                onOpenDecision={(app: any) => openDecisionModal(app)}
                onRefresh={fetchAllApplicants}
                screeningLoading={screeningLoading}
                scoringLoading={scoringLoading}
              />
            </div>
          ) : activeMenu === 'jobs' ? (
            <div className="animate-fade-in space-y-4">
              <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-border-slate">
                <span className="text-xs font-bold text-ink">Mode Pengelolaan Program Asesmen:</span>
                <div className="flex items-center gap-2">
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
                    <span>Program Builder Studio (3 Kolom)</span>
                  </Button>
                </div>
              </div>
              {showProgramBuilder ? (
                <AdminProgramBuilder onBack={() => setShowProgramBuilder(false)} />
              ) : (
                <JobManagement />
              )}
            </div>
          ) : activeMenu === 'ranking' ? (
            <div className="animate-fade-in">
              <RankingView />
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
          ) : activeMenu === 'materi' ? (
            <div className="animate-fade-in">
              <AdminMasterMateriTree />
            </div>
          ) : activeMenu === 'bank-soal' ? (
            <div className="animate-fade-in">
              <AdminBankSoalEditor />
            </div>
          ) : activeMenu === 'perusahaan' ? (
            <div className="animate-fade-in">
              <AdminCompanyMatrix />
            </div>
          ) : activeMenu === 'billing' ? (
            <div className="animate-fade-in">
              <AdminBillingCredit />
            </div>
          ) : activeMenu === 'help' ? (
            <div className="animate-fade-in bg-white rounded-xl border border-border-slate p-6 shadow-xs space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-ink font-heading">Pusat Bantuan & Panduan Talenta+</h2>
                <p className="text-xs text-muted-slate mt-0.5">Panduan operasional platform asesmen, integrasi API, dan dukungan tim teknis.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 rounded-xl border border-accent-border bg-soft-blue flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-primary-navy flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-accent" />
                      Bantuan Langsung Tim Support
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Tim support siap membantu kendala operasional, pengaturan bobot ujian, maupun kendala proctoring kandidat.
                    </p>
                    <div className="mt-4 space-y-1 text-xs text-slate-700">
                      <p>Email: <strong className="text-primary-navy">support@talenta.id</strong></p>
                      <p>Hotline: <strong className="text-primary-navy">+62 21 555-8290</strong> (08:00 – 18:00 WIB)</p>
                    </div>
                  </div>
                  <Button variant="primary" size="sm" className="mt-5 w-fit" leftIcon={<Mail className="w-3.5 h-3.5" />}>
                    Hubungi Support
                  </Button>
                </div>

                <div className="p-5 rounded-xl border border-border-slate bg-slate-50 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-ink">Dokumentasi Operasional</h3>
                    <ul className="mt-3 space-y-2 text-xs text-slate-600">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-navy" />
                        <span>Panduan Pelaksanaan Live Interview dengan Ava AI</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-navy" />
                        <span>Aturan Kepatuhan & Kalibrasi AI Proctoring Anti-Cheat</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-navy" />
                        <span>Format Standar Parsing CV dan Rubrik Penilaian Gemini</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-navy" />
                        <span>Panduan Ekspor dan Cetak Surat Keputusan Kandidat</span>
                      </li>
                    </ul>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-5">Versi Sistem: Talenta+ Assessment Platform v2.4.0</span>
                </div>
              </div>
            </div>
          ) : null}

      {/* Detail Modal - Applicant Detail */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
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
                      <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
                        <div className="bg-white p-2 rounded-md border border-slate-200">
                          <span className="text-slate-500 block text-[9px] uppercase font-semibold">CV Match (35%)</span>
                          <strong className="text-slate-900 font-bold font-mono">{selectedApplicant.screeningScore ?? '-'}%</strong>
                        </div>
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

              {/* AI Screening Card */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-soft-blue border border-accent-border text-primary-navy">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 font-heading text-sm">AI Screening Analisis CV</h4>
                      <p className="text-xs text-slate-500">Pencocokan latar belakang dan riwayat kerja oleh Gemini AI</p>
                    </div>
                  </div>
                  {selectedApplicant.screeningStatus === 'success' && selectedApplicant.screeningScore !== null && (
                    <div className="px-3 py-1.5 rounded-md text-center bg-soft-blue border border-accent-border font-mono">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-primary-navy">Skor CV</p>
                      <p className="text-xl font-bold text-blue-accent">{selectedApplicant.screeningScore}%</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {selectedApplicant.screeningStatus === 'pending' ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <Cpu className="w-6 h-6 text-primary-navy animate-pulse mb-2" />
                      <p className="text-slate-800 font-bold text-xs">AI sedang menganalisis dokumen CV...</p>
                      <p className="text-xs text-slate-400 mt-0.5">Proses screening berjalan di latar belakang.</p>
                    </div>
                  ) : selectedApplicant.screeningStatus === 'failed' ? (
                    <div className="bg-rose-50 p-3.5 rounded-md border border-rose-200">
                      <p className="font-bold text-xs text-rose-800">Analisis AI gagal</p>
                      <p className="text-xs text-rose-700 mt-1">{selectedApplicant.screeningSummary}</p>
                      <button
                        onClick={() => handleScreenCV(selectedApplicant.id)}
                        disabled={screeningLoading}
                        className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 text-white rounded-md text-xs font-semibold hover:bg-rose-800 transition-colors shadow-xs disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${screeningLoading ? 'animate-spin' : ''}`} /> Coba Lagi
                      </button>
                    </div>
                  ) : selectedApplicant.screeningStatus === 'success' && selectedApplicant.screeningSummary ? (
                    <>
                      <div className="bg-slate-50 p-3.5 rounded-md border border-slate-200 text-slate-700 text-xs leading-relaxed whitespace-pre-line font-sans">
                        {selectedApplicant.screeningSummary}
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleScreenCV(selectedApplicant.id)}
                          disabled={screeningLoading}
                          leftIcon={<RefreshCw className={`w-3 h-3 ${screeningLoading ? 'animate-spin' : ''}`} />}
                        >
                          {screeningLoading ? 'Menganalisis...' : 'Analisis Ulang'}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-md text-center border border-dashed border-slate-300">
                      <p className="text-slate-600 font-medium text-xs">CV belum dianalisis</p>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleScreenCV(selectedApplicant.id)}
                        disabled={screeningLoading}
                        className="mt-2.5"
                        leftIcon={<Cpu className={`w-3.5 h-3.5 ${screeningLoading ? 'animate-spin' : ''}`} />}
                      >
                        {screeningLoading ? 'Menganalisis...' : 'Jalankan AI Screening'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">No. Telepon</label>
                    <input
                      type="text"
                      value={editingApplicant.phone || ''}
                      onChange={e => setEditingApplicant({ ...editingApplicant, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:bg-white focus:border-primary-navy focus:ring-1 focus:ring-primary-navy outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                    <select
                      value={editingApplicant.gender}
                      onChange={e => setEditingApplicant({ ...editingApplicant, gender: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:bg-white focus:border-primary-navy focus:ring-1 focus:ring-primary-navy outline-none transition-colors cursor-pointer"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                    <input
                      type="text"
                      value={editingApplicant.placeOfBirth || ''}
                      onChange={e => setEditingApplicant({ ...editingApplicant, placeOfBirth: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:bg-white focus:border-primary-navy focus:ring-1 focus:ring-primary-navy outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                    <input
                      type="date"
                      value={editingApplicant.dateOfBirth ? editingApplicant.dateOfBirth.split('T')[0] : ''}
                      onChange={e => setEditingApplicant({ ...editingApplicant, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:bg-white focus:border-primary-navy focus:ring-1 focus:ring-primary-navy outline-none transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat</label>
                    <textarea
                      value={editingApplicant.address || ''}
                      onChange={e => setEditingApplicant({ ...editingApplicant, address: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:bg-white focus:border-primary-navy focus:ring-1 focus:ring-primary-navy outline-none transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Posisi Dilamar</label>
                    <input
                      type="text"
                      value={editingApplicant.appliedPosition || ''}
                      onChange={e => setEditingApplicant({ ...editingApplicant, appliedPosition: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:bg-white focus:border-primary-navy focus:ring-1 focus:ring-primary-navy outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Pendidikan</label>
                    <select
                      value={editingApplicant.education || ''}
                      onChange={e => setEditingApplicant({ ...editingApplicant, education: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:bg-white focus:border-primary-navy focus:ring-1 focus:ring-primary-navy outline-none transition-colors cursor-pointer"
                    >
                      <option value="SMA">SMA Sederajat</option>
                      <option value="D1">D1</option>
                      <option value="D2">D2</option>
                      <option value="D3">D3</option>
                      <option value="D4">D4</option>
                      <option value="S1">S1</option>
                    </select>
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
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
    </SuperadminLayout>
  );
}
