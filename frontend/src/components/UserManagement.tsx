import React, { useEffect, useState, useCallback, useMemo, useDeferredValue } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { loadMasterScope } from '../services/masterDataService';
import {
  Trash2,
  UserPlus,
  Shield,
  Lock,
  Edit2,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building2,
  GraduationCap,
  Scale,
  Calendar,
  Layers,
  Phone,
  Mail,
  User,
  Check,
  ChevronRight,
  Filter,
  Sparkles,
  BookOpen,
  Upload,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
  Checkbox,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal
} from './ui';
import { AdminStatCard } from './admin/AdminStatCard';
import {
  COMPANIES_CATALOG,
  getAllPrograms,
  type AssessmentProgram
} from '../services/assessmentCatalog';
import { companyMatchesName } from '../services/companyDirectory';
import type { PesertaUser, AsesorUser } from '../services/userRegistryService';

const PROGRAM_LINKS_STORAGE_KEY = 'talenta_company_program_links_v1';
const HIDDEN_CATALOG_STORAGE_KEY = 'talenta_hidden_catalog_programs_v1';

const normalizeProgramLinksMap = (raw: unknown): Record<string, string[]> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const normalized: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      normalized[key] = Array.from(new Set(value.map((item) => String(item).trim().toUpperCase()).filter(Boolean)));
    }
  }
  return normalized;
};

const resolveCompanyPrograms = (
  companyId: string,
  companies: Array<{ id: string; name: string }>,
  programs: AssessmentProgram[],
  programLinks: Record<string, string[]>,
  hiddenCatalogCodes: string[]
): AssessmentProgram[] => {
  const company = companies.find((item) => item.id === companyId);
  const linkedKeys = new Set((programLinks[companyId] || []).map((code) => code.toUpperCase()));
  const hiddenSet = new Set(hiddenCatalogCodes.map((code) => code.toUpperCase()));
  const matched: AssessmentProgram[] = [];
  const seenKeys = new Set<string>();

  for (const prog of programs) {
    const key = String(prog.id || '').trim().toUpperCase();
    if (!key || seenKeys.has(key)) continue;
    const isLinked = linkedKeys.has(key);
    const matchesCompanyId = Boolean(prog.companyId && prog.companyId === companyId);
    const matchesCompanyName = Boolean(
      company?.name && prog.companyName && prog.companyName !== '-' && companyMatchesName(company.name, prog.companyName)
    );
    if (!isLinked && !matchesCompanyId && !matchesCompanyName) continue;
    if (hiddenSet.has(key) && !isLinked) continue;
    seenKeys.add(key);
    matched.push(prog);
  }
  return matched;
};

interface Admin {
  id: string;
  username: string;
  role: string;
  tenantId?: string | null;
  tenant?: { id: string; code: string; name: string } | null;
  createdAt: string;
}

export default function UserManagement() {
  // Navigation Tabs: 'peserta' | 'asesor' | 'admin'
  const [activeTab, setActiveTab] = useState<'peserta' | 'asesor' | 'admin'>('peserta');
  const isSuperadmin = localStorage.getItem('adminRole') === 'superadmin';

  // ──────────────────────────────────────────────
  // TAB 1: Peserta (Candidates) State
  // ──────────────────────────────────────────────
  const [pesertaList, setPesertaList] = useState<PesertaUser[]>([]);
  const [importing, setImporting] = useState(false);
  const [sendingActivationId, setSendingActivationId] = useState<string | null>(null);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const [pesertaSearch, setPesertaSearch] = useState('');
  const [pesertaCompanyFilter, setPesertaCompanyFilter] = useState('ALL');
  const [pesertaGradeFilter, setPesertaGradeFilter] = useState('ALL');

  // Modal: Add Peserta
  const [showAddPesertaModal, setShowAddPesertaModal] = useState(false);
  const [editingPesertaId, setEditingPesertaId] = useState<string | null>(null);
  const [pesertaFormName, setPesertaFormName] = useState('');
  const [pesertaFormUsername, setPesertaFormUsername] = useState('');
  const [pesertaFormPassword, setPesertaFormPassword] = useState('');
  const [pesertaFormPhone, setPesertaFormPhone] = useState('');
  const [pesertaFormCompanyId, setPesertaFormCompanyId] = useState(COMPANIES_CATALOG[0].id);
  const [companyOptions, setCompanyOptions] = useState(COMPANIES_CATALOG);
  const [programOptions, setProgramOptions] = useState(getAllPrograms());
  const [programLinks, setProgramLinks] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem(PROGRAM_LINKS_STORAGE_KEY);
      return raw ? normalizeProgramLinksMap(JSON.parse(raw)) : {};
    } catch {
      return {};
    }
  });
  const [hiddenCatalogCodes, setHiddenCatalogCodes] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_CATALOG_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map((item) => String(item).toUpperCase()) : [];
    } catch {
      return [];
    }
  });
  const [pesertaFormAssessmentId, setPesertaFormAssessmentId] = useState('');
  const [pesertaFormAssessmentIds, setPesertaFormAssessmentIds] = useState<string[]>([]);
  const [pesertaFormGrade, setPesertaFormGrade] = useState<'Grade C (Junior)' | 'Grade B (Specialist / Mid)' | 'Grade A (Lead / Senior)'>('Grade B (Specialist / Mid)');
  const [pesertaFormDate, setPesertaFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [pesertaFormError, setPesertaFormError] = useState('');

  // Available programs for the selected company in Add Peserta modal
  const availableProgramsForModal = useMemo(() => {
    const matched = resolveCompanyPrograms(
      pesertaFormCompanyId,
      companyOptions,
      programOptions,
      programLinks,
      hiddenCatalogCodes
    );
    if (!editingPesertaId || pesertaFormAssessmentIds.length === 0) return matched;
    const pool = [...matched];
    for (const assignedId of pesertaFormAssessmentIds) {
      if (!pool.some((p) => p.id.toUpperCase() === assignedId.toUpperCase())) {
        const found = programOptions.find((p) => p.id.toUpperCase() === assignedId.toUpperCase());
        if (found) pool.push(found);
      }
    }
    return pool;
  }, [
    pesertaFormCompanyId,
    companyOptions,
    programOptions,
    programLinks,
    hiddenCatalogCodes,
    editingPesertaId,
    pesertaFormAssessmentIds
  ]);

  // Set default assessment when company changes in modal (preserve valid existing selections on edit)
  useEffect(() => {
    if (availableProgramsForModal.length > 0) {
      setPesertaFormAssessmentIds((prev) => {
        const valid = prev.filter((id) => availableProgramsForModal.some((p) => p.id === id));
        if (valid.length > 0) {
          setPesertaFormAssessmentId(valid[0]);
          return valid;
        }
        const first = availableProgramsForModal[0];
        setPesertaFormAssessmentId(first.id);
        setPesertaFormGrade(first.gradeLevel || 'Grade B (Specialist / Mid)');
        return [first.id];
      });
    } else {
      setPesertaFormAssessmentIds([]);
      setPesertaFormAssessmentId('');
    }
  }, [availableProgramsForModal]);

  const loadPeserta = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/portal-users', {
        params: { role: 'peserta' },
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = (response.data.data || []).map((user: any): PesertaUser => {
        const rawDate = user.interviewScheduledAt || user.createdAt;
        const scheduleDateStr = rawDate
          ? new Date(rawDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        const parsedAssessmentIds: string[] = (() => {
          if (user.assessmentIds) {
            try {
              const parsed = JSON.parse(user.assessmentIds);
              if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
            } catch {
              // ignore malformed JSON
            }
          }
          return user.assessmentId ? [String(user.assessmentId)] : [];
        })();

        return {
          id: user.id,
          name: user.name,
          username: user.email?.endsWith('@username.local') && user.username ? user.username : user.email,
          password: '',
          phone: user.phone || '',
          companyId: user.companyId || '',
          companyName: user.companyName || '',
          assessmentId: user.assessmentId || parsedAssessmentIds[0] || '',
          assignedProgramIds: parsedAssessmentIds,
          assessmentTitle: user.assessmentTitle || '',
          gradeLevel: user.gradeLevel || 'Grade B (Specialist / Mid)',
          scheduleDate: scheduleDateStr,
          status: user.status === 'Nonaktif' ? 'Selesai' : 'Siap Ujian',
          createdAt: user.createdAt
        };
      });
      setPesertaList(list);
    } catch {
      setPesertaList([]);
    }
  }, []);

  // ──────────────────────────────────────────────
  // TAB 2: Asesor (Assessors) State
  // ──────────────────────────────────────────────
  const [asesorList, setAsesorList] = useState<AsesorUser[]>([]);
  const [asesorSearch, setAsesorSearch] = useState('');
  const [asesorCompanyFilter, setAsesorCompanyFilter] = useState('ALL');

  // Modal: Add / Edit Asesor
  const [showAddAsesorModal, setShowAddAsesorModal] = useState(false);
  const [editingAsesorId, setEditingAsesorId] = useState<string | null>(null);
  const [asesorFormName, setAsesorFormName] = useState('');
  const [asesorFormUsername, setAsesorFormUsername] = useState('');
  const [asesorFormPassword, setAsesorFormPassword] = useState('asesor123');
  const [asesorFormPhone, setAsesorFormPhone] = useState('');
  const [asesorFormSpec, setAsesorFormSpec] = useState('Asesor Kompetensi Teknis & Perilaku');
  const [asesorFormCompanyId, setAsesorFormCompanyId] = useState(COMPANIES_CATALOG[0].id);
  const [asesorFormStatus, setAsesorFormStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [asesorFormPrograms, setAsesorFormPrograms] = useState<string[]>([]);
  const [asesorFormError, setAsesorFormError] = useState('');

  const availableProgramsForAsesorModal = useMemo(() => {
    const companyMatched = resolveCompanyPrograms(
      asesorFormCompanyId,
      companyOptions,
      programOptions,
      programLinks,
      hiddenCatalogCodes
    );
    const pool = companyMatched.length > 0 ? [...companyMatched] : [...programOptions];
    // Ensure all currently assigned programs remain visible for editing
    for (const assignedId of asesorFormPrograms) {
      if (!pool.some((p) => p.id.toUpperCase() === assignedId.toUpperCase())) {
        const match = programOptions.find((p) => p.id.toUpperCase() === assignedId.toUpperCase());
        if (match) pool.push(match);
      }
    }
    return pool;
  }, [asesorFormCompanyId, companyOptions, programOptions, programLinks, hiddenCatalogCodes, asesorFormPrograms]);

  const loadAsesor = useCallback(async () => {
    const parseProgramIds = (rawIds: unknown, fallbackId?: unknown): string[] => {
      if (Array.isArray(rawIds)) return rawIds.map(String).filter(Boolean);
      if (typeof rawIds === 'string' && rawIds.trim()) {
        try {
          const parsed = JSON.parse(rawIds);
          if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
        } catch {
          return rawIds.split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
      return fallbackId ? [String(fallbackId)] : [];
    };

    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/portal-users', {
        params: { role: 'asesor' },
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = (response.data.data || []).map((user: any): AsesorUser => ({
        id: user.id,
        name: user.name,
        username: user.email?.endsWith('@username.local') && user.username ? user.username : user.email,
        password: '',
        phone: user.phone || '',
        specialization: user.specialization || '',
        assignedCompanyId: user.companyId || '',
        assignedCompanyName: user.companyName || '',
        assignedProgramIds: parseProgramIds(user.assessmentIds, user.assessmentId),
        status: user.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
        createdAt: user.createdAt
      }));
      setAsesorList(list);
    } catch {
      setAsesorList([]);
    }
  }, []);

  // ──────────────────────────────────────────────
  // TAB 3: Admin (Superadmin & Admins) State
  // ──────────────────────────────────────────────
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'superadmin' | 'admin'>('ALL');

  // Add Admin State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newAdminCompanyId, setNewAdminCompanyId] = useState(COMPANIES_CATALOG[0]?.id || '');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Edit Admin State
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editAdminCompanyId, setEditAdminCompanyId] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdmins(response.data.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        setAccessDenied(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPeserta();
    loadAsesor();
    fetchAdmins();
  }, [loadPeserta, loadAsesor, fetchAdmins]);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('adminToken');
    Promise.allSettled([
      loadMasterScope<any>('company'),
      token
        ? axios.get('/api/admin/jobs', {
            params: { limit: 200 },
            headers: { Authorization: `Bearer ${token}` }
          })
        : Promise.resolve({ data: { data: [] } })
    ]).then(([companyResult, jobResult]) => {
      if (cancelled) return;
      let nextCompanies = [...COMPANIES_CATALOG];
      if (companyResult.status === 'fulfilled') {
        const scopeData = companyResult.value;
        const matrix = Array.isArray(scopeData) ? scopeData : scopeData?.matrix;
        if (Array.isArray(matrix) && matrix.length > 0) {
          nextCompanies = matrix
            .filter((item: any) => item?.id)
            .map((item: any) => ({
              id: item.id,
              name: item.name || item.id,
              industry: item.industry || '-',
              logoCode: item.logoCode || item.name?.slice(0, 3)?.toUpperCase() || 'PT',
              location: item.location || '-'
            })) as any;
        }
        if (scopeData?.programLinks && typeof scopeData.programLinks === 'object') {
          const normalizedLinks = normalizeProgramLinksMap(scopeData.programLinks);
          setProgramLinks(normalizedLinks);
          try {
            localStorage.setItem(PROGRAM_LINKS_STORAGE_KEY, JSON.stringify(normalizedLinks));
          } catch {
            // ignore storage errors
          }
        }
        if (Array.isArray(scopeData?.hiddenCatalogPrograms)) {
          const normalizedHidden = scopeData.hiddenCatalogPrograms.map((s: unknown) => String(s).toUpperCase());
          setHiddenCatalogCodes(normalizedHidden);
          try {
            localStorage.setItem(HIDDEN_CATALOG_STORAGE_KEY, JSON.stringify(normalizedHidden));
          } catch {
            // ignore storage errors
          }
        }
      }
      setCompanyOptions(nextCompanies);

      const mergedPrograms = getAllPrograms();
      if (jobResult.status === 'fulfilled') {
        for (const job of jobResult.value.data?.data || []) {
          const programId = String(job.code || job.id || '').trim();
          if (!programId) continue;
          const parentheticalPt = String(job.title || '').match(/\(([^)]+)\)\s*$/)?.[1] || '';
          const jobCompanyName = job.companyName || job.tenant?.name || parentheticalPt || '-';
          const jobCompanyId = job.tenant?.code || '';
          const existingIdx = mergedPrograms.findIndex(
            (program) => program.id.toUpperCase() === programId.toUpperCase()
          );
          if (existingIdx < 0) {
            mergedPrograms.push({
              id: programId,
              title: job.title,
              companyId: jobCompanyId,
              companyName: jobCompanyName,
              category: 'Program Kustom',
              gradeLevel: 'Grade B (Specialist / Mid)',
              description: job.description || '',
              durationMinutes: job.interviewDuration || 90,
              passingScore: job.interviewPassingScore || 70,
              totalQuestions: 0
            } as any);
          } else if (jobCompanyName !== '-' && (!mergedPrograms[existingIdx].companyName || mergedPrograms[existingIdx].companyName === '-')) {
            mergedPrograms[existingIdx] = {
              ...mergedPrograms[existingIdx],
              companyName: jobCompanyName,
              ...(jobCompanyId ? { companyId: jobCompanyId } : {})
            };
          }
        }
      }
      setProgramOptions(mergedPrograms);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ──────────────────────────────────────────────
  // Handlers for Peserta
  // ──────────────────────────────────────────────
  const handleEditPeserta = (peserta: PesertaUser) => {
    setEditingPesertaId(peserta.id);
    setPesertaFormName(peserta.name);
    setPesertaFormUsername(peserta.username);
    setPesertaFormPassword('');
    setPesertaFormPhone(peserta.phone || '');
    setPesertaFormCompanyId(peserta.companyId || companyOptions[0]?.id || COMPANIES_CATALOG[0].id);
    const initialIds =
      peserta.assignedProgramIds && peserta.assignedProgramIds.length > 0
        ? peserta.assignedProgramIds
        : peserta.assessmentId
        ? [peserta.assessmentId]
        : [];
    setPesertaFormAssessmentIds(initialIds);
    setPesertaFormAssessmentId(initialIds[0] || peserta.assessmentId || '');
    setPesertaFormGrade(peserta.gradeLevel as any);
    setPesertaFormDate(peserta.scheduleDate || new Date().toISOString().split('T')[0]);
    setPesertaFormError('');
    setShowAddPesertaModal(true);
  };

  const handleOpenAddPeserta = () => {
    setEditingPesertaId(null);
    setPesertaFormName('');
    setPesertaFormUsername('');
    setPesertaFormPassword('');
    setPesertaFormPhone('');
    const defaultCompanyId = companyOptions[0]?.id || COMPANIES_CATALOG[0].id;
    setPesertaFormCompanyId(defaultCompanyId);
    const defaultPrograms = resolveCompanyPrograms(
      defaultCompanyId,
      companyOptions,
      programOptions,
      programLinks,
      hiddenCatalogCodes
    );
    if (defaultPrograms.length > 0) {
      setPesertaFormAssessmentId(defaultPrograms[0].id);
      setPesertaFormAssessmentIds([defaultPrograms[0].id]);
      setPesertaFormGrade(defaultPrograms[0].gradeLevel);
    } else {
      setPesertaFormAssessmentId('');
      setPesertaFormAssessmentIds([]);
    }
    setPesertaFormDate(new Date().toISOString().split('T')[0]);
    setPesertaFormError('');
    setShowAddPesertaModal(true);
  };

  const handleCreatePeserta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pesertaFormName.trim() || !pesertaFormUsername.trim()) {
      setPesertaFormError('Nama lengkap dan username/email wajib diisi.');
      return;
    }
    if (pesertaFormAssessmentIds.length === 0) {
      setPesertaFormError('Pilih minimal satu jenis asesmen untuk peserta.');
      return;
    }
    if (!editingPesertaId) {
      const loginInput = pesertaFormUsername.trim().toLowerCase();
      const duplicate = [...pesertaList, ...asesorList].some(
        (user) => String(user.username || '').trim().toLowerCase() === loginInput
      );
      if (duplicate) {
        setPesertaFormError('Email/username sudah digunakan akun lain. Gunakan email berbeda.');
        return;
      }
    }

    try {
      const token = localStorage.getItem('adminToken');
      const selectedPrograms = pesertaFormAssessmentIds
        .map((id) => programOptions.find((item) => item.id === id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
      const primaryId = pesertaFormAssessmentIds[0] || pesertaFormAssessmentId;
      const combinedTitles =
        selectedPrograms.length > 0
          ? selectedPrograms.map((item) => item.title).join(', ')
          : programOptions.find((item) => item.id === primaryId)?.title || '';
      const company = companyOptions.find((item) => item.id === pesertaFormCompanyId);
      const payload: Record<string, unknown> = {
        name: pesertaFormName,
        phone: pesertaFormPhone,
        companyId: pesertaFormCompanyId,
        companyName: company?.name,
        assessmentId: primaryId,
        assessmentIds: pesertaFormAssessmentIds,
        assessmentTitle: combinedTitles,
        gradeLevel: pesertaFormGrade,
        scheduleDate: pesertaFormDate,
        interviewScheduledAt: pesertaFormDate ? new Date(`${pesertaFormDate}T09:00:00.000Z`).toISOString() : null
      };
      if (pesertaFormPassword.trim()) payload.password = pesertaFormPassword;
      let createdResponse: any = null;
      if (editingPesertaId) {
        await axios.put(`/api/admin/portal-users/${editingPesertaId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        const loginInput = pesertaFormUsername.trim();
        const res = await axios.post('/api/admin/portal-users', {
          ...payload,
          ...(loginInput.includes('@') ? { email: loginInput } : { username: loginInput }),
          ...(pesertaFormPassword.trim() ? { password: pesertaFormPassword.trim() } : { activationMode: 'email_link' }),
          role: 'peserta'
        }, { headers: { Authorization: `Bearer ${token}` } });
        createdResponse = res.data;
      }

      await loadPeserta();
      setShowAddPesertaModal(false);
      setEditingPesertaId(null);

      // Reset form
      setPesertaFormName('');
      setPesertaFormUsername('');
      setPesertaFormPhone('');
      setPesertaFormPassword('');
      setPesertaFormError('');

      const fallbackActivationUrl = createdResponse?.activationUrl;
      const mailInfo = createdResponse?.mail as { delivered?: boolean; provider?: string; error?: string } | null | undefined;
      const safeUser = String(pesertaFormUsername).replace(/[<>&"]/g, '');
      const safeName = String(pesertaFormName).replace(/[<>&"]/g, '');
      const safeMailErr = mailInfo?.error ? String(mailInfo.error).replace(/[<>&"]/g, '') : '';
      Swal.fire({
        icon: !editingPesertaId && mailInfo?.error && fallbackActivationUrl ? 'warning' : 'success',
        title: editingPesertaId ? 'Data Peserta Diperbarui!' : 'Akun Peserta Diterbitkan!',
        html: editingPesertaId
          ? `Data <b>${safeName}</b> berhasil diperbarui.`
          : fallbackActivationUrl
            ? `<div class="text-left text-xs space-y-2">
                 <p>Akun <b>${safeUser}</b> dibuat dengan aktivasi mandiri.</p>
                 ${safeMailErr ? `<p class="text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Pengiriman email gagal (${safeMailErr}). Salin tautan manual di bawah:</p>` : '<p class="text-slate-500">Salin tautan aktivasi berikut untuk dibagikan kepada peserta:</p>'}
                 <input readonly value="${fallbackActivationUrl}" onclick="this.select()" class="w-full px-2.5 py-1.5 border rounded font-mono text-[11px] bg-slate-50" />
               </div>`
            : `Akun <b>${safeUser}</b> berhasil didaftarkan dan tautan aktivasi akun telah dikirim ke email peserta${mailInfo?.provider ? ` (${mailInfo.provider.toUpperCase()})` : ''}.`,
        ...(fallbackActivationUrl ? { showConfirmButton: true, confirmButtonText: 'Tutup' } : { timer: 2800, showConfirmButton: false })
      });
    } catch (err: any) {
      const apiMsg = axios.isAxiosError(err) ? err.response?.data?.error : undefined;
      setPesertaFormError(apiMsg || err?.message || 'Gagal mendaftarkan akun peserta.');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/portal-users/template', {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Template_Import_Peserta_Right.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      Swal.fire('Gagal', 'Template Excel tidak dapat diunduh.', 'error');
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const token = localStorage.getItem('adminToken');
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post('/api/admin/portal-users/import', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      await loadPeserta();
      const result = response.data;
      const errorList = Array.isArray(result.errors) && result.errors.length > 0
        ? `<div style="text-align:left;max-height:180px;overflow:auto;margin-top:8px;font-size:11px">${result.errors.slice(0, 8).map((item: any) => `<div>Baris ${item.row}: ${item.message}</div>`).join('')}</div>`
        : '';
      Swal.fire({
        icon: result.skipped > 0 ? 'warning' : 'success',
        title: 'Import Excel Selesai',
        html: `<b>${result.created}</b> akun dibuat, <b>${result.skipped}</b> dilewati dari <b>${result.total}</b> baris.${errorList}`,
        confirmButtonColor: '#1E3A8A'
      });
    } catch (error: any) {
      Swal.fire('Import Gagal', error.response?.data?.error || 'File Excel tidak dapat diproses.', 'error');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleSendActivationLink = async (peserta: any) => {
    setSendingActivationId(peserta.id);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.post(
        `/api/admin/portal-users/${peserta.id}/send-activation`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const fallbackUrl = res.data?.activationUrl;
      const mailInfo = res.data?.mail as { delivered?: boolean; provider?: string; error?: string } | undefined;
      const targetEmail = String(peserta.email || peserta.username || '').replace(/[<>&"]/g, '');
      const safeErr = mailInfo?.error ? String(mailInfo.error).replace(/[<>&"]/g, '') : '';
      Swal.fire({
        icon: mailInfo?.error && fallbackUrl ? 'warning' : 'success',
        title: mailInfo?.delivered ? 'Email Aktivasi Terkirim' : 'Tautan Aktivasi Diproses',
        html: fallbackUrl
          ? `<div class="text-left text-xs space-y-2">
               <p>Tautan aktivasi baru diterbitkan untuk <b>${targetEmail}</b>.</p>
               ${
                 safeErr
                   ? `<p class="text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Email tidak terkirim via ${String(mailInfo?.provider || 'mail').toUpperCase()}: ${safeErr}</p>`
                   : mailInfo?.provider === 'username_only'
                     ? '<p class="text-slate-500">Akun ini tidak memiliki alamat email asli. Bagikan tautan aktivasi secara manual:</p>'
                     : '<p class="text-slate-500">Provider email belum aktif (mode outbox). Salin tautan aktivasi (berlaku 7 hari):</p>'
               }
               <input readonly value="${fallbackUrl}" onclick="this.select()" class="w-full px-2.5 py-1.5 border rounded font-mono text-[11px] bg-slate-50" />
             </div>`
          : `Tautan aktivasi mandiri telah dikirim ke email <b>${targetEmail}</b>${mailInfo?.provider ? ` via ${mailInfo.provider.toUpperCase()}` : ''} (berlaku 7 hari).`,
        ...(fallbackUrl ? { showConfirmButton: true, confirmButtonText: 'Tutup' } : { timer: 2800, showConfirmButton: false })
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengirim Aktivasi',
        text: err?.response?.data?.error || 'Tidak dapat mengirim tautan aktivasi saat ini.'
      });
    } finally {
      setSendingActivationId(null);
    }
  };

  const handleDeletePeserta = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: 'Hapus Akun Peserta?',
      text: `Apakah Anda yakin ingin menghapus akun peserta "${name}" (${id})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1E3A8A',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Ya, Hapus Akun',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/admin/portal-users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await loadPeserta();
      Swal.fire({
        icon: 'success',
        title: 'Akun Terhapus',
        text: `Data peserta ${name} telah dihapus dari sistem.`,
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  // ──────────────────────────────────────────────
  // Handlers for Asesor
  // ──────────────────────────────────────────────
  const handleOpenAddAsesor = () => {
    setEditingAsesorId(null);
    setAsesorFormName('');
    setAsesorFormUsername('');
    setAsesorFormPassword('asesor123');
    setAsesorFormPhone('');
    setAsesorFormSpec('Asesor Kompetensi Teknis & Perilaku');
    const defaultCompanyId = companyOptions[0]?.id || COMPANIES_CATALOG[0].id;
    setAsesorFormCompanyId(defaultCompanyId);
    setAsesorFormStatus('Aktif');
    const defaultProgs = resolveCompanyPrograms(
      defaultCompanyId,
      companyOptions,
      programOptions,
      programLinks,
      hiddenCatalogCodes
    );
    setAsesorFormPrograms(defaultProgs.length > 0 ? [defaultProgs[0].id] : []);
    setAsesorFormError('');
    setShowAddAsesorModal(true);
  };

  const handleEditAsesor = (asesor: AsesorUser) => {
    setEditingAsesorId(asesor.id);
    setAsesorFormName(asesor.name);
    setAsesorFormUsername(asesor.username);
    setAsesorFormPassword('');
    setAsesorFormPhone(asesor.phone || '');
    setAsesorFormSpec(asesor.specialization || 'Asesor Kompetensi Teknis & Perilaku');
    const matchedCompany =
      companyOptions.find((c) => c.id === asesor.assignedCompanyId) ||
      companyOptions.find((c) => c.name === asesor.assignedCompanyName) ||
      companyOptions[0];
    setAsesorFormCompanyId(matchedCompany?.id || COMPANIES_CATALOG[0].id);
    setAsesorFormStatus(asesor.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif');
    setAsesorFormPrograms(asesor.assignedProgramIds || []);
    setAsesorFormError('');
    setShowAddAsesorModal(true);
  };

  const handleSaveAsesor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asesorFormName.trim() || !asesorFormUsername.trim()) {
      setAsesorFormError('Nama lengkap dan username/email asesor wajib diisi.');
      return;
    }
    if (!editingAsesorId && !asesorFormPassword.trim()) {
      setAsesorFormError('Kata sandi wajib diisi untuk akun asesor baru.');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const company = companyOptions.find((item) => item.id === asesorFormCompanyId);
      const asesorLogin = asesorFormUsername.trim();
      const selectedPrograms = asesorFormPrograms
        .map((id) => programOptions.find((item) => item.id === id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
      const primaryProgramId = asesorFormPrograms[0] || '';
      const combinedTitles = selectedPrograms.map((item) => item.title).join(', ');

      const basePayload: Record<string, unknown> = {
        name: asesorFormName.trim(),
        ...(asesorLogin.includes('@') ? { email: asesorLogin } : { username: asesorLogin }),
        phone: asesorFormPhone.trim(),
        specialization: asesorFormSpec.trim(),
        companyId: asesorFormCompanyId,
        companyName: company?.name || '',
        status: asesorFormStatus,
        assessmentId: primaryProgramId || null,
        assessmentIds: asesorFormPrograms,
        assessmentTitle: combinedTitles || null
      };
      if (asesorFormPassword.trim()) {
        basePayload.password = asesorFormPassword.trim();
      }

      if (editingAsesorId) {
        await axios.put(`/api/admin/portal-users/${editingAsesorId}`, basePayload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(
          '/api/admin/portal-users',
          {
            ...basePayload,
            role: 'asesor'
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      await loadAsesor();
      setShowAddAsesorModal(false);
      setEditingAsesorId(null);

      // Reset
      setAsesorFormName('');
      setAsesorFormUsername('');
      setAsesorFormPhone('');
      setAsesorFormPassword('asesor123');
      setAsesorFormStatus('Aktif');
      setAsesorFormError('');

      Swal.fire({
        icon: 'success',
        title: editingAsesorId ? 'Data Asesor Diperbarui!' : 'Akun Asesor Berhasil Dibuat!',
        html: editingAsesorId
          ? `Perubahan data akun <b>${asesorFormName.trim()}</b> berhasil disimpan.`
          : `Akun <b>${asesorFormName.trim()}</b> telah ditugaskan untuk menguji di PT terkait.`,
        timer: 2500,
        showConfirmButton: false
      });
    } catch (err: any) {
      const apiMsg = axios.isAxiosError(err) ? err.response?.data?.error : undefined;
      setAsesorFormError(apiMsg || err?.message || 'Gagal menyimpan data akun asesor.');
    }
  };

  const handleDeleteAsesor = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: 'Cabut Penugasan Asesor?',
      text: `Apakah Anda yakin ingin menghapus akun asesor "${name}" (${id})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1E3A8A',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Ya, Cabut Akun',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/admin/portal-users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await loadAsesor();
      Swal.fire({
        icon: 'success',
        title: 'Akun Asesor Dicabut',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  // ──────────────────────────────────────────────
  // Handlers for Admin
  // ──────────────────────────────────────────────
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) {
      setAddError('Username dan password wajib diisi.');
      return;
    }
    const selectedCompany =
      companyOptions.find((c) => c.id === newAdminCompanyId) || companyOptions[0];
    if (!selectedCompany) {
      setAddError('Perusahaan (PT) wajib dipilih untuk akun Admin.');
      return;
    }
    setAddLoading(true);
    setAddError('');
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        '/api/admin/users',
        {
          username: newUsername.trim(),
          password: newPassword,
          role: 'admin',
          companyName: selectedCompany.name,
          companyCode: selectedCompany.id
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowAddModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewAdminCompanyId(companyOptions[0]?.id || '');
      Swal.fire({
        icon: 'success',
        title: 'Admin Berhasil Ditambahkan',
        text: `Akun "${newUsername}" telah dibuat untuk ${selectedCompany.name}.`,
        timer: 2000,
        showConfirmButton: false
      });
      fetchAdmins();
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
      setAddError(message || 'Gagal menambahkan admin baru.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteAdmin = async (id: string, username: string) => {
    const result = await Swal.fire({
      title: 'Cabut Akses Pengguna?',
      text: `Apakah Anda yakin ingin menghapus akun "${username}"? Akses login akan segera dinonaktifkan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1E3A8A',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Ya, Cabut Akses',
      cancelButtonText: 'Batal',
      reverseButtons: true
    });
    if (!result.isConfirmed) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Swal.fire({
        icon: 'success',
        title: 'Akses Dicabut',
        text: `Akun "${username}" telah dihapus.`,
        timer: 2000,
        showConfirmButton: false
      });
      fetchAdmins();
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
      Swal.fire({
        icon: 'error',
        title: 'Operasi Gagal',
        text: message || 'Gagal menghapus admin.'
      });
    }
  };

  const openEditModal = (admin: Admin) => {
    setEditingAdmin(admin);
    setEditUsername(admin.username);
    setEditPassword('');
    setEditRole(admin.role);
    const matchedCompany = companyOptions.find(
      (c) =>
        c.name.toLowerCase() === (admin.tenant?.name || '').toLowerCase() ||
        c.id.toLowerCase() === (admin.tenant?.code || '').toLowerCase()
    );
    setEditAdminCompanyId(
      matchedCompany?.id || (admin.role === 'superadmin' ? '' : companyOptions[0]?.id || '')
    );
    setEditError('');
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    if (!editUsername.trim()) {
      setEditError('Username tidak boleh kosong.');
      return;
    }
    const selectedCompany = companyOptions.find((c) => c.id === editAdminCompanyId);
    if (editRole === 'admin' && !selectedCompany) {
      setEditError('Perusahaan (PT) wajib dipilih untuk akun Administrator.');
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      const token = localStorage.getItem('adminToken');
      const payload: {
        username: string;
        role: string;
        password?: string;
        tenantId?: string | null;
        companyName?: string;
        companyCode?: string;
      } = {
        username: editUsername.trim(),
        role: editRole
      };
      if (selectedCompany) {
        payload.companyName = selectedCompany.name;
        payload.companyCode = selectedCompany.id;
      } else if (editRole === 'superadmin') {
        payload.tenantId = null;
      }
      if (editPassword) {
        payload.password = editPassword;
      }
      await axios.put(`/api/admin/users/${editingAdmin.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setEditingAdmin(null);
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Diperbarui',
        text: `Data kredensial "${editUsername}" berhasil diperbarui.`,
        timer: 2000,
        showConfirmButton: false
      });
      fetchAdmins();
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
      setEditError(message || 'Gagal memperbarui data admin.');
    } finally {
      setEditLoading(false);
    }
  };

  // ──────────────────────────────────────────────
  // Filtered Lists
  // ──────────────────────────────────────────────
  const deferredPesertaSearch = useDeferredValue(pesertaSearch);
  const deferredAsesorSearch = useDeferredValue(asesorSearch);
  const deferredAdminSearch = useDeferredValue(searchQuery);

  const filteredPeserta = useMemo(() => {
    const q = deferredPesertaSearch.toLowerCase();
    return pesertaList.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.assessmentTitle.toLowerCase().includes(q);
      const matchCompany = pesertaCompanyFilter === 'ALL' || p.companyId === pesertaCompanyFilter;
      const matchGrade = pesertaGradeFilter === 'ALL' || p.gradeLevel.includes(pesertaGradeFilter);
      return matchSearch && matchCompany && matchGrade;
    });
  }, [pesertaList, deferredPesertaSearch, pesertaCompanyFilter, pesertaGradeFilter]);

  const filteredAsesor = useMemo(() => {
    const q = deferredAsesorSearch.toLowerCase();
    return asesorList.filter((a) => {
      const matchSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.username.toLowerCase().includes(q) ||
        a.specialization.toLowerCase().includes(q);
      const matchCompany = asesorCompanyFilter === 'ALL' || a.assignedCompanyId === asesorCompanyFilter;
      return matchSearch && matchCompany;
    });
  }, [asesorList, deferredAsesorSearch, asesorCompanyFilter]);

  const filteredAdmins = useMemo(() => {
    const q = deferredAdminSearch.toLowerCase();
    return admins.filter((a) => {
      const matchesSearch =
        !q ||
        a.username.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'ALL' || a.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [admins, deferredAdminSearch, roleFilter]);

  const pesertaDesktopRows = useMemo(
    () =>
      filteredPeserta.map((p) => {
        const isGradeA = p.gradeLevel.includes('Grade A');
        const isGradeC = p.gradeLevel.includes('Grade C');
        const gradeBadgeVariant = isGradeA ? 'rose' : isGradeC ? 'teal' : 'navy';
        const rawDate = p.scheduleDate || p.createdAt;
        const parsedDate = rawDate ? new Date(rawDate) : new Date();
        const formattedScheduleDate = isNaN(parsedDate.getTime())
          ? new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
          : parsedDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

        return (
          <TableRow key={p.id}>
            <TableCell>
              <div className="flex items-center gap-2.5 min-w-[200px]">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-primary-navy shrink-0">
                  {p.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-ink truncate">{p.name}</div>
                  <div className="text-[11px] text-muted-slate truncate">{p.username}</div>
                </div>
              </div>
            </TableCell>

            <TableCell className="hidden lg:table-cell">
              <div className="whitespace-nowrap">
                <Badge variant="neutral" format="outline" className="font-medium text-[11px] whitespace-nowrap">
                  <Building2 className="w-3 h-3 mr-1 text-slate-500 shrink-0" />
                  {p.companyName || '-'}
                </Badge>
              </div>
            </TableCell>

            <TableCell>
              <div className="space-y-1">
                <span className="font-semibold text-xs text-ink block leading-snug" title={p.assessmentTitle}>
                  {p.assessmentTitle || '-'}
                </span>
                <div className="flex flex-wrap gap-1">
                  {(p.assignedProgramIds && p.assignedProgramIds.length > 0
                    ? p.assignedProgramIds
                    : p.assessmentId
                    ? [p.assessmentId]
                    : []
                  ).map((code) => (
                    <span
                      key={code}
                      className="text-[10px] text-slate-600 font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded whitespace-nowrap"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            </TableCell>

            <TableCell className="hidden xl:table-cell">
              <div className="space-y-1 whitespace-nowrap">
                <Badge variant={gradeBadgeVariant as any} format="soft" hasDot className="whitespace-nowrap">
                  {p.gradeLevel}
                </Badge>
                <div className="text-[10px] text-slate-500">
                  40 Soal CAT
                </div>
              </div>
            </TableCell>

            <TableCell className="hidden lg:table-cell">
              <div className="space-y-1 whitespace-nowrap">
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-900 font-mono">{formattedScheduleDate}</span>
                </div>
                <div className="flex items-center gap-1.5 pl-5">
                  <span className="text-[10px] text-slate-500 font-mono">09:00-11:30</span>
                  <Badge
                    variant={p.status === 'Selesai' ? 'neutral' : 'teal'}
                    format="soft"
                    className="text-[10px] font-semibold"
                  >
                    {p.status}
                  </Badge>
                </div>
              </div>
            </TableCell>

            <TableCell className="text-right">
              <div className="inline-flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => handleSendActivationLink(p)}
                  disabled={sendingActivationId === p.id}
                  leftIcon={<Mail className="w-3 h-3" />}
                  title="Kirim Tautan Aktivasi ke Email"
                >
                  {sendingActivationId === p.id ? 'Mengirim...' : 'Aktivasi'}
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => handleEditPeserta(p)}
                  leftIcon={<Edit2 className="w-3 h-3" />}
                  title="Edit Data Peserta"
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="xs"
                  onClick={() => handleDeletePeserta(p.id, p.name)}
                  leftIcon={<Trash2 className="w-3 h-3" />}
                  title="Hapus Akun"
                >
                  Hapus
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
      }),
    [filteredPeserta]
  );

  const asesorDesktopRows = useMemo(
    () =>
      filteredAsesor.map((a) => (
        <TableRow key={a.id}>
          <TableCell>
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-xs text-primary-navy">
                {a.name.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-xs text-ink">{a.name}</div>
                <div className="text-[11px] text-muted-slate flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-slate-500">{a.id}</span>
                  <span>•</span>
                  <span>{a.username}</span>
                </div>
                {a.phone && (
                  <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{a.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </TableCell>

          <TableCell>
            <span className="text-xs text-slate-700 font-medium">
              {a.specialization}
            </span>
          </TableCell>

          <TableCell>
            <Badge variant="navy" format="soft">
              <Building2 className="w-3 h-3 mr-1" />
              {a.assignedCompanyName || '-'}
            </Badge>
          </TableCell>

          <TableCell>
            <div className="flex flex-wrap gap-1">
              {a.assignedProgramIds.length > 0 ? (
                a.assignedProgramIds.map((pId) => (
                  <span
                    key={pId}
                    className="text-[10px] bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded border border-slate-200"
                  >
                    {pId}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-slate-400">-</span>
              )}
            </div>
          </TableCell>

          <TableCell>
            <Badge variant={a.status === 'Nonaktif' ? 'neutral' : 'teal'} format="soft" hasDot>
              {a.status}
            </Badge>
          </TableCell>

          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="outline"
                size="xs"
                onClick={() => handleEditAsesor(a)}
                leftIcon={<Edit2 className="w-3 h-3" />}
                title="Edit Data Asesor"
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="xs"
                onClick={() => handleDeleteAsesor(a.id, a.name)}
                leftIcon={<Trash2 className="w-3 h-3" />}
              >
                Cabut
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )),
    [filteredAsesor]
  );

  const adminDesktopRows = useMemo(
    () =>
      filteredAdmins.map((admin) => (
        <TableRow key={admin.id}>
          <TableCell>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-primary-navy">
                {admin.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-xs text-ink">{admin.username}</div>
                <div className="text-[11px] text-muted-slate font-mono">{admin.id}</div>
              </div>
            </div>
          </TableCell>
          <TableCell>
            <span className="text-xs font-medium text-slate-700">
              {admin.tenant?.name ||
                (admin.role === 'superadmin' ? 'Semua PT (Global)' : 'Belum Diatur')}
            </span>
          </TableCell>
          <TableCell>
            <Badge
              variant={admin.role === 'superadmin' ? 'navy' : 'neutral'}
              format="soft"
              hasDot={admin.role === 'superadmin'}
            >
              {admin.role.toUpperCase()}
            </Badge>
          </TableCell>
          <TableCell className="text-slate-500 whitespace-nowrap text-xs">
            {new Date(admin.createdAt).toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </TableCell>
          <TableCell className="text-right">
            <div className="inline-flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="xs"
                onClick={() => openEditModal(admin)}
                leftIcon={<Edit2 className="w-3 h-3" />}
              >
                Ubah
              </Button>
              <Button
                variant="danger"
                size="xs"
                onClick={() => handleDeleteAdmin(admin.id, admin.username)}
                leftIcon={<Trash2 className="w-3 h-3" />}
              >
                Cabut
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )),
    [filteredAdmins]
  );

  return (
    <div className="space-y-6 font-sans">
      {/* ─── Segmented Main Tab Bar ─── */}
      <div className="inline-flex flex-wrap items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab('peserta')}
          className={`h-10 px-4 rounded-md text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'peserta'
              ? 'bg-[#1E3A8A] text-white'
              : 'text-[#475569] hover:text-[#0F172A]'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Akun Peserta</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-mono ${
              activeTab === 'peserta' ? 'bg-white/20 text-white' : 'bg-white text-[#475569]'
            }`}
          >
            {pesertaList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('asesor')}
          className={`h-10 px-4 rounded-md text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'asesor'
              ? 'bg-[#1E3A8A] text-white'
              : 'text-[#475569] hover:text-[#0F172A]'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Akun Asesor</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-mono ${
              activeTab === 'asesor' ? 'bg-white/20 text-white' : 'bg-white text-[#475569]'
            }`}
          >
            {asesorList.length}
          </span>
        </button>

        {isSuperadmin && (
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`h-10 px-4 rounded-md text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'admin'
                ? 'bg-[#1E3A8A] text-white'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Akun Administrator</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'admin' ? 'bg-white/20 text-white' : 'bg-white text-[#475569]'
              }`}
            >
              {admins.length}
            </span>
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: AKUN PESERTA (KANDIDAT)                                            */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'peserta' && (
        <div className="space-y-6">
          {/* Standardized Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <AdminStatCard
              label="Total Akun Peserta"
              value={pesertaList.length}
              subtext="100% siap ujian"
              badge="Terdaftar"
              badgeVariant="info"
              icon={GraduationCap}
            />
            <AdminStatCard
              label="Perusahaan Terhubung"
              value={companyOptions.length}
              subtext="Tenant multi-perusahaan"
              badge="Multi-Company"
              badgeVariant="neutral"
              icon={Building2}
            />
            <AdminStatCard
              label="Program Asesmen"
              value={programOptions.length}
              subtext="Grade A / B / C"
              badge="Aktif"
              badgeVariant="success"
              icon={BookOpen}
            />
            <AdminStatCard
              label="Standar Ujian CAT"
              value="40"
              subtext="Real-time anti-cheat"
              badge="AI Proctoring"
              badgeVariant="neutral"
              icon={ShieldCheck}
            />
          </div>

          {/* 64px Action Ribbon & Filters */}
          <div className="min-h-[64px] flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0]">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              <div className="w-full sm:w-[280px]">
                <Input
                  type="text"
                  placeholder="Cari nama, email, program, atau ID..."
                  value={pesertaSearch}
                  onChange={(e) => setPesertaSearch(e.target.value)}
                  leftIcon={<Search className="w-4 h-4 text-[#94A3B8]" />}
                  className="h-10 rounded-lg"
                />
              </div>

              <div className="w-full sm:w-[200px]">
                <Select
                  value={pesertaCompanyFilter}
                  onChange={(e) => setPesertaCompanyFilter(e.target.value)}
                  className="h-10 rounded-lg font-medium"
                >
                  <option value="ALL">Semua Perusahaan (PT)</option>
                  {companyOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="w-full sm:w-[170px]">
                <Select
                  value={pesertaGradeFilter}
                  onChange={(e) => setPesertaGradeFilter(e.target.value)}
                  className="h-10 rounded-lg font-medium"
                >
                  <option value="ALL">Semua Grade</option>
                  <option value="Grade C">Grade C (Dasar)</option>
                  <option value="Grade B">Grade B (Mid)</option>
                  <option value="Grade A">Grade A (Senior)</option>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                leftIcon={<Download className="w-4 h-4" />}
                className="h-10 px-3.5 rounded-lg border-[#E2E8F0] text-[#475569] min-w-fit whitespace-nowrap"
              >
                Template Excel
              </Button>
              <Button
                variant="outline"
                disabled={importing}
                onClick={() => importInputRef.current?.click()}
                leftIcon={importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                className="h-10 px-3.5 rounded-lg border-[#E2E8F0] text-[#475569] min-w-fit whitespace-nowrap"
              >
                {importing ? 'Mengimpor...' : 'Impor Excel'}
              </Button>
              <Button
                variant="primary"
                onClick={handleOpenAddPeserta}
                leftIcon={<UserPlus className="w-4 h-4" />}
                className="h-10 px-4 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white min-w-fit whitespace-nowrap"
              >
                Daftarkan Akun Baru
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportFile}
              />
            </div>
          </div>

          {/* Table of Peserta (desktop) */}
          <div className="hidden md:block">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="lg:w-[24%]">Kandidat &amp; Kontak</TableHead>
                <TableHead className="hidden lg:table-cell lg:w-[16%]">Perusahaan (PT)</TableHead>
                <TableHead className="md:w-[34%]">Jenis Asesmen yang Dipilih</TableHead>
                <TableHead className="hidden xl:table-cell xl:w-[12%]">Grade &amp; Format Soal</TableHead>
                <TableHead className="hidden lg:table-cell lg:w-[16%]">Jadwal Ujian</TableHead>
                <TableHead className="lg:w-[14%] text-right">Aksi Manajemen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPeserta.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                    Tidak ada akun peserta yang cocok dengan kriteria pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                pesertaDesktopRows
              )}
            </TableBody>
          </Table>
          </div>

          {/* Peserta cards (mobile) */}
          <div className="md:hidden space-y-3">
            {filteredPeserta.map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{p.username}</p>
                  </div>
                  <Badge variant={p.status === 'Selesai' ? 'neutral' : 'teal'} format="soft" className="shrink-0 text-[10px]">
                    {p.status}
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    {p.companyName || '-'}
                  </p>
                  <p className="font-semibold text-slate-800 leading-snug">{p.assessmentTitle || '-'}</p>
                  <div className="flex flex-wrap gap-1">
                    {(p.assignedProgramIds && p.assignedProgramIds.length > 0
                      ? p.assignedProgramIds
                      : p.assessmentId
                        ? [p.assessmentId]
                        : []
                    ).map((code) => (
                      <span key={code} className="text-[10px] font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => handleSendActivationLink(p)}
                    leftIcon={<Mail className="w-3 h-3" />}
                    className="flex-1"
                  >
                    Aktivasi
                  </Button>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => handleEditPeserta(p)}
                    leftIcon={<Edit2 className="w-3 h-3" />}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="xs"
                    onClick={() => handleDeletePeserta(p.id, p.name)}
                    leftIcon={<Trash2 className="w-3 h-3" />}
                    className="flex-1"
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Modal: Daftarkan Akun Peserta Baru */}
          <Modal
            isOpen={showAddPesertaModal}
            onClose={() => { setShowAddPesertaModal(false); setEditingPesertaId(null); }}
            title={editingPesertaId ? "Edit Data Peserta & Alokasi Asesmen" : "Daftarkan Akun Peserta & Alokasikan Asesmen"}
            description={editingPesertaId ? "Perbarui data peserta, perusahaan, program asesmen, dan grade soal." : "Buat akun login kandidat dan tentukan perusahaan (PT) serta jenis asesmen dengan grade soal yang sesuai."}
            size="lg"
          >
            <form onSubmit={handleCreatePeserta} className="space-y-4 font-sans text-xs">
              {pesertaFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{pesertaFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap Kandidat *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Rian Pratama, S.Kom"
                    value={pesertaFormName}
                    onChange={(e) => setPesertaFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Username / Email Login *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingPesertaId)}
                    placeholder="Contoh: rian@kandidat.id"
                    value={pesertaFormUsername}
                    onChange={(e) => setPesertaFormUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy disabled:bg-slate-50 disabled:text-slate-500"
                  />
                  {editingPesertaId && <span className="text-[10px] text-slate-400 mt-1 block">Email login tidak dapat diubah.</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kata Sandi Akun (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Kosongkan untuk aktivasi mandiri via email"
                    value={pesertaFormPassword}
                    onChange={(e) => setPesertaFormPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {editingPesertaId
                      ? 'Kosongkan jika tidak ingin mengganti kata sandi.'
                      : 'Direkomendasikan kosong: sistem mengirim tautan aktivasi ke email agar peserta membuat kata sandi sendiri.'}
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp / Kontak
                  </label>
                  <input
                    type="tel"
                    placeholder="Contoh: 0812-3456-7890"
                    value={pesertaFormPhone}
                    onChange={(e) => setPesertaFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary-navy" />
                  <span>Alokasi Perusahaan (PT) & Jenis Asesmen</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <Select
                      label="Pilih Instansi / Perusahaan (PT) *"
                      value={pesertaFormCompanyId}
                      onChange={(e) => setPesertaFormCompanyId(e.target.value)}
                      className="h-11 rounded-xl font-medium"
                    >
                      {companyOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.industry})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-800">
                        Pilih Jenis Asesmen (Bisa Lebih dari 1) *
                      </label>
                      <span className="text-[11px] font-semibold text-primary-navy bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        {pesertaFormAssessmentIds.length} dipilih
                      </span>
                    </div>
                    {availableProgramsForModal.length === 0 ? (
                      <div className="px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                        Tidak ada program untuk PT ini
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-50/70 border border-slate-200 rounded-xl">
                        {availableProgramsForModal.map((p) => {
                          const isChecked = pesertaFormAssessmentIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-blue-50/80 border-blue-300 text-slate-900'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  const nextChecked = checked === true;
                                  const nextIds = nextChecked
                                    ? [...pesertaFormAssessmentIds, p.id]
                                    : pesertaFormAssessmentIds.filter((id) => id !== p.id);
                                  setPesertaFormAssessmentIds(nextIds);
                                  setPesertaFormAssessmentId(nextIds[0] || '');
                                  if (nextChecked && nextIds.length === 1) {
                                    setPesertaFormGrade(p.gradeLevel);
                                  }
                                }}
                                className="mt-0.5"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold leading-snug">
                                  <span className="font-mono text-[11px] text-primary-navy mr-1.5">[{p.id}]</span>
                                  {p.title}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div>
                    <Select
                      label="Tingkat Kesulitan / Grade Soal *"
                      value={pesertaFormGrade}
                      onChange={(e: any) => setPesertaFormGrade(e.target.value)}
                      hint="Mencakup 5 tipe soal: Single Choice, Multiple Choice, Short Answer, Essay, & Matching Pairs."
                      className="h-11 rounded-xl font-medium"
                    >
                      <option value="Grade C (Junior)">Grade C (Junior / Dasar - 40 Soal)</option>
                      <option value="Grade B (Specialist / Mid)">Grade B (Specialist / Mid - 40 Soal)</option>
                      <option value="Grade A (Lead / Senior)">Grade A (Lead / Senior - 40 Soal)</option>
                    </Select>
                  </div>

                  <div>
                    <Input
                      label="Tanggal Pelaksanaan Ujian *"
                      type="date"
                      value={pesertaFormDate}
                      onChange={(e) => setPesertaFormDate(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShowAddPesertaModal(false); setEditingPesertaId(null); }}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary">
                  {editingPesertaId ? 'Simpan Perubahan' : 'Daftarkan & Terbitkan Akun'}
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: AKUN ASESOR (PENGUJI)                                              */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'asesor' && (
        <div className="space-y-6">
          {/* Telemetry Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card elevation="flat" className="admin-card-accent-blue p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl admin-icon-blue text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Scale className="w-5 h-5" />
                </div>
                <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-semibold border border-blue-200/60">
                  Penguji Terverifikasi
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">
                Total Akun Asesor
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                  {asesorList.length}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Assessor Pool</span>
              </div>
            </Card>

            <Card elevation="flat" className="admin-card-accent-emerald p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl admin-icon-emerald text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200/60">
                  Siap Sidang
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">
                Status Asesor Aktif
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-emerald-800 tracking-tight">
                  {asesorList.filter((a) => a.status === 'Aktif').length}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Standby Rubrik</span>
              </div>
            </Card>

            <Card elevation="flat" className="admin-card-accent-purple p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl admin-icon-purple text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-semibold border border-purple-200/60">
                  BUMN &amp; Multi
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">
                Instansi Mitra Penugasan
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-indigo-950 tracking-tight">
                  {companyOptions.length} PT
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Multi-Tenant</span>
              </div>
            </Card>

            <Card elevation="flat" className="admin-card-accent-amber p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl admin-icon-amber text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-semibold border border-amber-200/60">
                  ISO 10667
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">
                Sistem Penilaian Terpadu
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                  LHA &amp; Rubrik
                </span>
                <span className="text-[11px] text-slate-400 font-mono">BSN Standard</span>
              </div>
            </Card>
          </div>

          {/* Action Ribbon & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="min-w-[220px] flex-1 max-w-sm">
                <Input
                  type="text"
                  placeholder="Cari nama asesor, username, atau spesialisasi..."
                  value={asesorSearch}
                  onChange={(e) => setAsesorSearch(e.target.value)}
                  leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                  className="h-11 rounded-xl"
                />
              </div>

              {/* PT Filter */}
              <div className="w-full sm:w-56">
                <Select
                  value={asesorCompanyFilter}
                  onChange={(e) => setAsesorCompanyFilter(e.target.value)}
                  className="h-11 rounded-xl font-semibold"
                >
                  <option value="ALL">Semua Instansi PT</option>
                  {companyOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAddAsesor}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              + Daftarkan Akun Asesor Baru
            </Button>
          </div>

          {/* Table of Asesor */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Asesor & Kontak</TableHead>
                <TableHead>Bidang Spesialisasi</TableHead>
                <TableHead>PT Penugasan</TableHead>
                <TableHead>Program Asesmen Ditugaskan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAsesor.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                    Tidak ada akun asesor yang cocok.
                  </TableCell>
                </TableRow>
              ) : (
                asesorDesktopRows
              )}
            </TableBody>
          </Table>

          {/* Modal: Tambah / Edit Asesor */}
          <Modal
            isOpen={showAddAsesorModal}
            onClose={() => {
              setShowAddAsesorModal(false);
              setEditingAsesorId(null);
            }}
            title={editingAsesorId ? 'Edit Data Akun Asesor / Penguji' : 'Daftarkan Akun Asesor / Penguji Baru'}
            description={
              editingAsesorId
                ? 'Perbarui biodata, spesialisasi, instansi PT, program penugasan, atau status akun asesor.'
                : 'Buat akun login asesor penilai untuk sesi wawancara, rubrik kompetensi, dan verifikasi LHA.'
            }
            size="md"
          >
            <form onSubmit={handleSaveAsesor} className="space-y-4 font-sans text-xs">
              {asesorFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{asesorFormError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap &amp; Gelar *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dr. Maya Indrawati, M.Psi., Psikolog"
                  value={asesorFormName}
                  onChange={(e) => setAsesorFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Username / Email Login *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: maya.asesor@talenta.id"
                    value={asesorFormUsername}
                    onChange={(e) => setAsesorFormUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {editingAsesorId ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi Akun *'}
                  </label>
                  <input
                    type="text"
                    required={!editingAsesorId}
                    placeholder={editingAsesorId ? 'Kosongkan jika tidak mengubah sandi' : 'asesor123'}
                    value={asesorFormPassword}
                    onChange={(e) => setAsesorFormPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {editingAsesorId
                      ? 'Minimal 8 karakter jika ingin mengganti kata sandi.'
                      : 'Minimal 8 karakter (Default: asesor123)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="Contoh: 0812-3456-7890"
                    value={asesorFormPhone}
                    onChange={(e) => setAsesorFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                  />
                </div>

                <div>
                  <Select
                    label="Status Akun Asesor"
                    value={asesorFormStatus}
                    onChange={(e) => setAsesorFormStatus(e.target.value === 'Nonaktif' ? 'Nonaktif' : 'Aktif')}
                    className="h-10 rounded-lg font-medium"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bidang Spesialisasi Asesor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Evaluator Arsitektur Software & Risk Leadership"
                  value={asesorFormSpec}
                  onChange={(e) => setAsesorFormSpec(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                />
              </div>

              <div>
                <Select
                  label="Instansi / PT Penugasan Asesor *"
                  value={asesorFormCompanyId}
                  onChange={(e) => {
                    const nextCompanyId = e.target.value;
                    setAsesorFormCompanyId(nextCompanyId);
                    if (!editingAsesorId) {
                      const nextProgs = resolveCompanyPrograms(
                        nextCompanyId,
                        companyOptions,
                        programOptions,
                        programLinks,
                        hiddenCatalogCodes
                      );
                      setAsesorFormPrograms(nextProgs.length > 0 ? [nextProgs[0].id] : []);
                    }
                  }}
                  className="h-11 rounded-xl font-medium"
                >
                  {companyOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Program Asesmen yang Ditugaskan
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  {availableProgramsForAsesorModal.map((prog) => {
                    const isChecked = asesorFormPrograms.includes(prog.id);
                    return (
                      <label key={prog.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAsesorFormPrograms([...asesorFormPrograms, prog.id]);
                            } else {
                              setAsesorFormPrograms(asesorFormPrograms.filter((id) => id !== prog.id));
                            }
                          }}
                          className="rounded text-primary-navy focus:ring-primary-navy cursor-pointer"
                        />
                        <span className="text-slate-800 font-medium">[{prog.id}] {prog.title}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAddAsesorModal(false);
                    setEditingAsesorId(null);
                  }}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary">
                  {editingAsesorId ? 'Simpan Perubahan' : 'Daftarkan Akun Asesor'}
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: AKUN ADMINISTRATOR PLATFORM                                        */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'admin' && (
        <div className="space-y-6">
          {accessDenied ? (
            <div className="flex flex-col items-center justify-center py-20 font-sans">
              <Card elevation="flat" className="p-8 text-center max-w-md space-y-4">
                <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-700">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">Hak Akses Terbatas</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Modul Pengguna Admin hanya dapat diakses oleh akun dengan peran otorisasi <strong>Superadmin</strong>.
                  </p>
                </div>
              </Card>
            </div>
          ) : (
            <>
              {/* Telemetry Summary Ribbon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card elevation="flat" className="admin-card-accent-blue p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl admin-icon-blue text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                      <Shield className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full font-semibold border border-slate-200">
                      Terdaftar
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">
                    Total Akun Admin
                  </p>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                      {admins.length}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Control Access</span>
                  </div>
                </Card>

                <Card elevation="flat" className="admin-card-accent-emerald p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl admin-icon-emerald text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200/60">
                      Otoritas Penuh
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">
                    Akses Superadmin
                  </p>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-emerald-800 tracking-tight">
                      {admins.filter((a) => a.role === 'superadmin').length}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Root Admin</span>
                  </div>
                </Card>

                <Card elevation="flat" className="admin-card-accent-purple p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl admin-icon-purple text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                      <User className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-semibold border border-indigo-200/60">
                      Pengelola Ujian
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">
                    Administrator Operasional
                  </p>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-indigo-950 tracking-tight">
                      {admins.filter((a) => a.role !== 'superadmin').length}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Operations</span>
                  </div>
                </Card>

                <Card elevation="flat" className="admin-card-accent-amber p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl admin-icon-amber text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                      <Lock className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-semibold border border-amber-200/60">
                      Bcrypt Salted
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">
                    Keamanan Autentikasi
                  </p>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                      JWT 256
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Bcrypt Salted</span>
                  </div>
                </Card>
              </div>

              {/* Action Ribbon */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5 flex-1 max-w-md">
                  <div className="w-full">
                    <Input
                      type="text"
                      placeholder="Cari admin berdasarkan username atau ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="w-44 shrink-0">
                    <Select
                      value={roleFilter}
                      onChange={(e: any) => setRoleFilter(e.target.value)}
                      className="h-11 rounded-xl font-semibold"
                    >
                      <option value="ALL">Semua Peran</option>
                      <option value="superadmin">Superadmin</option>
                      <option value="admin">Administrator</option>
                    </Select>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowAddModal(true)}
                  leftIcon={<UserPlus className="w-4 h-4" />}
                >
                  + Tambah Akun Admin
                </Button>
              </div>

              {/* Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identitas Admin</TableHead>
                    <TableHead>Perusahaan (PT)</TableHead>
                    <TableHead>Peran Otorisasi</TableHead>
                    <TableHead>Tanggal Pembuatan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-slate-400 text-xs">
                        Tidak ada pengguna yang cocok dengan kriteria filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    adminDesktopRows
                  )}
                </TableBody>
              </Table>

              {/* Add Admin Modal */}
              <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Tambah Akun Admin Baru"
                description="Buat akun baru untuk staf penguji atau pengelola operasional platform."
                size="md"
              >
                <form onSubmit={handleAddAdmin} className="space-y-4 font-sans text-xs">
                  {addError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{addError}</span>
                    </div>
                  )}

                  <div>
                    <Input
                      label="Username Pengguna"
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. admin_asesmen"
                    />
                  </div>

                  <div>
                    <Input
                      label="Kata Sandi Sementara"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 8 karakter..."
                    />
                  </div>

                  <div>
                    <Select
                      label="Perusahaan (PT) yang Dikelola"
                      required
                      value={newAdminCompanyId}
                      onChange={(e) => setNewAdminCompanyId(e.target.value)}
                    >
                      {companyOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowAddModal(false)}
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={addLoading}
                      isLoading={addLoading}
                    >
                      Simpan Admin
                    </Button>
                  </div>
                </form>
              </Modal>

              {/* Edit Admin Modal */}
              {editingAdmin && (
                <Modal
                  isOpen={!!editingAdmin}
                  onClose={() => setEditingAdmin(null)}
                  title="Ubah Data Pengguna Administrator"
                  description={`Perbarui kredensial atau peran otorisasi untuk ${editingAdmin.username}.`}
                  size="md"
                >
                  <form onSubmit={handleUpdateAdmin} className="space-y-4 font-sans text-xs">
                    {editError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{editError}</span>
                      </div>
                    )}

                    <div>
                      <Input
                        label="Username Pengguna"
                        type="text"
                        required
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                      />
                    </div>

                    <div>
                      <Input
                        label="Kata Sandi Baru (Kosongkan jika tidak diubah)"
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Biarkan kosong untuk mempertahankan kata sandi lama"
                      />
                    </div>

                    <div>
                      <Select
                        label="Tingkat Otoritas / Peran"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                      >
                        <option value="admin">Administrator (Operasional)</option>
                        <option value="superadmin">Superadmin (Otoritas Penuh)</option>
                      </Select>
                    </div>

                    <div>
                      <Select
                        label="Perusahaan (PT) yang Dikelola"
                        value={editAdminCompanyId}
                        onChange={(e) => setEditAdminCompanyId(e.target.value)}
                        required={editRole === 'admin'}
                      >
                        {editRole === 'superadmin' && (
                          <option value="">Semua PT (Akses Global Superadmin)</option>
                        )}
                        {companyOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setEditingAdmin(null)}
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={editLoading}
                        isLoading={editLoading}
                      >
                        Simpan Perubahan
                      </Button>
                    </div>
                  </form>
                </Modal>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
