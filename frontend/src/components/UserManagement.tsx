import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal
} from './ui';
import {
  COMPANIES_CATALOG,
  getAllPrograms,
  getProgramsByCompany,
  type AssessmentProgram
} from '../services/assessmentCatalog';
import type { PesertaUser, AsesorUser } from '../services/userRegistryService';

interface Admin {
  id: string;
  username: string;
  role: string;
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
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const [pesertaSearch, setPesertaSearch] = useState('');
  const [pesertaCompanyFilter, setPesertaCompanyFilter] = useState('ALL');
  const [pesertaGradeFilter, setPesertaGradeFilter] = useState('ALL');

  // Modal: Add Peserta
  const [showAddPesertaModal, setShowAddPesertaModal] = useState(false);
  const [editingPesertaId, setEditingPesertaId] = useState<string | null>(null);
  const [pesertaFormName, setPesertaFormName] = useState('');
  const [pesertaFormUsername, setPesertaFormUsername] = useState('');
  const [pesertaFormPassword, setPesertaFormPassword] = useState('peserta123');
  const [pesertaFormPhone, setPesertaFormPhone] = useState('');
  const [pesertaFormCompanyId, setPesertaFormCompanyId] = useState(COMPANIES_CATALOG[0].id);
  const [companyOptions, setCompanyOptions] = useState(COMPANIES_CATALOG);
  const [programOptions, setProgramOptions] = useState(getAllPrograms());
  const [pesertaFormAssessmentId, setPesertaFormAssessmentId] = useState('');
  const [pesertaFormGrade, setPesertaFormGrade] = useState<'Grade C (Junior)' | 'Grade B (Specialist / Mid)' | 'Grade A (Lead / Senior)'>('Grade B (Specialist / Mid)');
  const [pesertaFormDate, setPesertaFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [pesertaFormError, setPesertaFormError] = useState('');

  // Available programs for the selected company in Add Peserta modal
  const availableProgramsForModal = useMemo(() => {
    const base = getProgramsByCompany(pesertaFormCompanyId);
    const company = companyOptions.find((item) => item.id === pesertaFormCompanyId);
    const extra = programOptions.filter(
      (program) =>
        program.companyName === company?.name && !base.some((item) => item.id === program.id)
    );
    return [...base, ...extra];
  }, [pesertaFormCompanyId, companyOptions, programOptions]);

  // Set default assessment when company changes in modal
  useEffect(() => {
    if (availableProgramsForModal.length > 0) {
      setPesertaFormAssessmentId(availableProgramsForModal[0].id);
      setPesertaFormGrade(availableProgramsForModal[0].gradeLevel);
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

        return {
          id: user.id,
          name: user.name,
          username: user.email,
          password: '',
          phone: user.phone || '',
          companyId: user.companyId || '',
          companyName: user.companyName || '',
          assessmentId: user.assessmentId || '',
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

  // Modal: Add Asesor
  const [showAddAsesorModal, setShowAddAsesorModal] = useState(false);
  const [asesorFormName, setAsesorFormName] = useState('');
  const [asesorFormUsername, setAsesorFormUsername] = useState('');
  const [asesorFormPassword, setAsesorFormPassword] = useState('asesor123');
  const [asesorFormPhone, setAsesorFormPhone] = useState('');
  const [asesorFormSpec, setAsesorFormSpec] = useState('Asesor Kompetensi Teknis & Perilaku');
  const [asesorFormCompanyId, setAsesorFormCompanyId] = useState(COMPANIES_CATALOG[0].id);
  const [asesorFormPrograms, setAsesorFormPrograms] = useState<string[]>([]);
  const [asesorFormError, setAsesorFormError] = useState('');

  const availableProgramsForAsesorModal = useMemo(() => {
    const base = getProgramsByCompany(asesorFormCompanyId);
    const company = companyOptions.find((item) => item.id === asesorFormCompanyId);
    const extra = programOptions.filter(
      (program) =>
        program.companyName === company?.name && !base.some((item) => item.id === program.id)
    );
    return [...base, ...extra];
  }, [asesorFormCompanyId, companyOptions, programOptions]);

  useEffect(() => {
    if (availableProgramsForAsesorModal.length > 0) {
      setAsesorFormPrograms([availableProgramsForAsesorModal[0].id]);
    } else {
      setAsesorFormPrograms([]);
    }
  }, [availableProgramsForAsesorModal]);

  const loadAsesor = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/portal-users', {
        params: { role: 'asesor' },
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = (response.data.data || []).map((user: any): AsesorUser => ({
        id: user.id,
        name: user.name,
        username: user.email,
        password: '',
        phone: user.phone || '',
        specialization: user.specialization || '',
        assignedCompanyId: user.companyId || '',
        assignedCompanyName: user.companyName || '',
        assignedProgramIds: [],
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
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Edit Admin State
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('');
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
            params: { limit: 100 },
            headers: { Authorization: `Bearer ${token}` }
          })
        : Promise.resolve({ data: { data: [] } })
    ]).then(([companyResult, jobResult]) => {
      if (cancelled) return;
      const mergedCompanies = [...COMPANIES_CATALOG];
      if (companyResult.status === 'fulfilled') {
        const matrix = Array.isArray(companyResult.value)
          ? companyResult.value
          : companyResult.value?.matrix;
        if (Array.isArray(matrix)) {
          for (const item of matrix) {
            if (item?.id && !mergedCompanies.some((company) => company.id === item.id)) {
              mergedCompanies.push({
                id: item.id,
                name: item.name || item.id,
                industry: item.industry || '-',
                logoCode: item.logoCode || item.name?.slice(0, 3)?.toUpperCase() || 'PT',
                location: item.location || '-'
              } as any);
            }
          }
        }
      }
      setCompanyOptions(mergedCompanies);

      const mergedPrograms = getAllPrograms();
      if (jobResult.status === 'fulfilled') {
        for (const job of jobResult.value.data?.data || []) {
          if (!job.code) continue;
          if (!mergedPrograms.some((program) => program.id === job.code)) {
            mergedPrograms.push({
              id: job.code,
              title: job.title,
              companyName: job.title.includes('(')
                ? job.title.split('(').slice(-1)[0].replace(')', '').trim()
                : '-',
              category: 'Program Kustom',
              description: job.description || '',
              durationMinutes: job.interviewDuration || 90,
              passingScore: job.interviewPassingScore || 70,
              totalQuestions: 0
            } as any);
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
    setPesertaFormAssessmentId(peserta.assessmentId || '');
    setPesertaFormGrade(peserta.gradeLevel as any);
    setPesertaFormDate(peserta.scheduleDate || new Date().toISOString().split('T')[0]);
    setPesertaFormError('');
    setShowAddPesertaModal(true);
  };

  const handleOpenAddPeserta = () => {
    setEditingPesertaId(null);
    setPesertaFormName('');
    setPesertaFormUsername('');
    setPesertaFormPassword('peserta123');
    setPesertaFormPhone('');
    setPesertaFormCompanyId(companyOptions[0]?.id || COMPANIES_CATALOG[0].id);
    if (availableProgramsForModal.length > 0) {
      setPesertaFormAssessmentId(availableProgramsForModal[0].id);
      setPesertaFormGrade(availableProgramsForModal[0].gradeLevel);
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

    try {
      const token = localStorage.getItem('adminToken');
      const program = programOptions.find((item) => item.id === pesertaFormAssessmentId);
      const company = companyOptions.find((item) => item.id === pesertaFormCompanyId);
      const payload: Record<string, unknown> = {
        name: pesertaFormName,
        phone: pesertaFormPhone,
        companyId: pesertaFormCompanyId,
        companyName: company?.name,
        assessmentId: pesertaFormAssessmentId,
        assessmentTitle: program?.title,
        gradeLevel: pesertaFormGrade,
        scheduleDate: pesertaFormDate,
        interviewScheduledAt: pesertaFormDate ? new Date(`${pesertaFormDate}T09:00:00.000Z`).toISOString() : null
      };
      if (pesertaFormPassword.trim()) payload.password = pesertaFormPassword;
      if (editingPesertaId) {
        await axios.put(`/api/admin/portal-users/${editingPesertaId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/admin/portal-users', {
          ...payload,
          email: pesertaFormUsername,
          password: pesertaFormPassword || 'peserta123',
          role: 'peserta'
        }, { headers: { Authorization: `Bearer ${token}` } });
      }

      await loadPeserta();
      setShowAddPesertaModal(false);
      setEditingPesertaId(null);

      // Reset form
      setPesertaFormName('');
      setPesertaFormUsername('');
      setPesertaFormPhone('');
      setPesertaFormPassword('peserta123');
      setPesertaFormError('');

      Swal.fire({
        icon: 'success',
        title: editingPesertaId ? 'Data Peserta Diperbarui!' : 'Akun Peserta Diterbitkan!',
        html: editingPesertaId
          ? `Data <b>${pesertaFormName}</b> berhasil diperbarui.`
          : `Akun <b>${pesertaFormUsername}</b> berhasil didaftarkan dan dialokasikan ke program asesmen CAT 40 Soal.`,
        timer: 2500,
        showConfirmButton: false
      });
    } catch (err: any) {
      setPesertaFormError(err.message || 'Gagal mendaftarkan akun peserta.');
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
  const handleCreateAsesor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asesorFormName.trim() || !asesorFormUsername.trim()) {
      setAsesorFormError('Nama lengkap dan username/email asesor wajib diisi.');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const company = companyOptions.find((item) => item.id === asesorFormCompanyId);
      await axios.post('/api/admin/portal-users', {
        name: asesorFormName,
        email: asesorFormUsername,
        password: asesorFormPassword,
        phone: asesorFormPhone,
        role: 'asesor',
        specialization: asesorFormSpec,
        companyId: asesorFormCompanyId,
        companyName: company?.name
      }, { headers: { Authorization: `Bearer ${token}` } });

      await loadAsesor();
      setShowAddAsesorModal(false);

      // Reset
      setAsesorFormName('');
      setAsesorFormUsername('');
      setAsesorFormPhone('');
      setAsesorFormPassword('asesor123');
      setAsesorFormError('');

      Swal.fire({
        icon: 'success',
        title: 'Akun Asesor Berhasil Dibuat!',
        html: `Akun <b>${asesorFormName}</b> telah ditugaskan untuk menguji di PT terkait.`,
        timer: 2500,
        showConfirmButton: false
      });
    } catch (err: any) {
      setAsesorFormError(err.message || 'Gagal mendaftarkan akun asesor.');
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
    setAddLoading(true);
    setAddError('');
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        '/api/admin/users',
        {
          username: newUsername.trim(),
          password: newPassword,
          role: 'admin'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowAddModal(false);
      setNewUsername('');
      setNewPassword('');
      Swal.fire({
        icon: 'success',
        title: 'Admin Berhasil Ditambahkan',
        text: `Akun "${newUsername}" telah dibuat dengan role Administrator.`,
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
    setEditError('');
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    if (!editUsername.trim()) {
      setEditError('Username tidak boleh kosong.');
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      const token = localStorage.getItem('adminToken');
      const payload: { username: string; role: string; password?: string } = {
        username: editUsername.trim(),
        role: editRole
      };
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
  const filteredPeserta = useMemo(() => {
    return pesertaList.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(pesertaSearch.toLowerCase()) ||
        p.username.toLowerCase().includes(pesertaSearch.toLowerCase()) ||
        p.id.toLowerCase().includes(pesertaSearch.toLowerCase()) ||
        p.assessmentTitle.toLowerCase().includes(pesertaSearch.toLowerCase());
      const matchCompany = pesertaCompanyFilter === 'ALL' || p.companyId === pesertaCompanyFilter;
      const matchGrade = pesertaGradeFilter === 'ALL' || p.gradeLevel.includes(pesertaGradeFilter);
      return matchSearch && matchCompany && matchGrade;
    });
  }, [pesertaList, pesertaSearch, pesertaCompanyFilter, pesertaGradeFilter]);

  const filteredAsesor = useMemo(() => {
    return asesorList.filter((a) => {
      const matchSearch =
        a.name.toLowerCase().includes(asesorSearch.toLowerCase()) ||
        a.username.toLowerCase().includes(asesorSearch.toLowerCase()) ||
        a.specialization.toLowerCase().includes(asesorSearch.toLowerCase());
      const matchCompany = asesorCompanyFilter === 'ALL' || a.assignedCompanyId === asesorCompanyFilter;
      return matchSearch && matchCompany;
    });
  }, [asesorList, asesorSearch, asesorCompanyFilter]);

  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      const matchesSearch =
        a.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || a.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [admins, searchQuery, roleFilter]);

  return (
    <div className="space-y-6 font-sans">
      {/* ─── Top Main Tab Bar ─── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-2 shadow-xs">
        <div className={`grid grid-cols-1 ${isSuperadmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2`}>
          <button
            onClick={() => setActiveTab('peserta')}
            className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'peserta'
                ? 'bg-primary-navy text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <GraduationCap className={`w-4 h-4 ${activeTab === 'peserta' ? 'text-amber-300' : 'text-slate-500'}`} />
            <span>Akun Peserta (Kandidat)</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'peserta' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {pesertaList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('asesor')}
            className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'asesor'
                ? 'bg-primary-navy text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Scale className={`w-4 h-4 ${activeTab === 'asesor' ? 'text-cyan-300' : 'text-slate-500'}`} />
            <span>Akun Asesor (Penguji)</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'asesor' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {asesorList.length}
            </span>
          </button>

          {isSuperadmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-primary-navy text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Shield className={`w-4 h-4 ${activeTab === 'admin' ? 'text-emerald-300' : 'text-slate-500'}`} />
            <span>Akun Administrator</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'admin' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {admins.length}
            </span>
          </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: AKUN PESERTA (KANDIDAT)                                            */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'peserta' && (
        <div className="space-y-6">
          {/* Telemetry Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card elevation="flat" className="p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200/60">
                  Terdaftar
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">
                Total Akun Peserta
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                  {pesertaList.length}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">100% Siap Ujian</span>
              </div>
            </Card>

            <Card elevation="flat" className="p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-indigo-400 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold border border-indigo-200/60">
                  Multi-Company
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">
                Perusahaan (PT) Terhubung
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-indigo-950 tracking-tight">
                  {companyOptions.length} PT
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Multi-Tenant</span>
              </div>
            </Card>

            <Card elevation="flat" className="p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/20">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-semibold border border-blue-200/60">
                  Grade A / B / C
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">
                Program Asesmen Aktif
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-blue-900 tracking-tight">
                  {programOptions.length}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Syllabus Sync</span>
              </div>
            </Card>

            <Card elevation="flat" className="p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-amber-400 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold border border-amber-200/60">
                  AI Proctoring
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">
                Model Ujian Standard
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                  40 Soal CAT
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Real-time Anti-Cheat</span>
              </div>
            </Card>
          </div>

          {/* Action Ribbon & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama, email, program, atau ID peserta..."
                  value={pesertaSearch}
                  onChange={(e) => setPesertaSearch(e.target.value)}
                  className="w-full h-11 pl-10 pr-3.5 py-2 text-sm font-sans bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                />
              </div>

              {/* PT Filter */}
              <select
                value={pesertaCompanyFilter}
                onChange={(e) => setPesertaCompanyFilter(e.target.value)}
                className="h-11 px-3.5 py-2 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl shadow-2xs focus:outline-none focus:border-primary-navy cursor-pointer"
              >
                <option value="ALL">Semua Perusahaan (PT)</option>
                {companyOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Grade Filter */}
              <select
                value={pesertaGradeFilter}
                onChange={(e) => setPesertaGradeFilter(e.target.value)}
                className="h-11 px-3.5 py-2 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl shadow-2xs focus:outline-none focus:border-primary-navy cursor-pointer"
              >
                <option value="ALL">Semua Grade Soal</option>
                <option value="Grade C">Grade C (Junior / Dasar)</option>
                <option value="Grade B">Grade B (Specialist / Mid)</option>
                <option value="Grade A">Grade A (Lead / Senior)</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Template Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={importing}
                onClick={() => importInputRef.current?.click()}
                leftIcon={importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              >
                {importing ? 'Mengimpor...' : 'Impor Excel'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAddPeserta}
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                + Daftarkan Akun Peserta Baru
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

          {/* Table of Peserta */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kandidat & Kontak</TableHead>
                <TableHead>Perusahaan (PT)</TableHead>
                <TableHead>Jenis Asesmen yang Dipilih</TableHead>
                <TableHead>Grade & Format Soal</TableHead>
                <TableHead>Jadwal Ujian</TableHead>
                <TableHead className="text-right">Aksi Manajemen</TableHead>
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
                filteredPeserta.map((p) => {
                  const isGradeA = p.gradeLevel.includes('Grade A');
                  const isGradeC = p.gradeLevel.includes('Grade C');
                  const gradeBadgeVariant = isGradeA ? 'rose' : isGradeC ? 'teal' : 'navy';

                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-primary-navy">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-ink">{p.name}</div>
                            <div className="text-[11px] text-muted-slate flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-slate-500">{p.id}</span>
                              <span>•</span>
                              <span>{p.username}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Sandi: <span className="font-mono text-slate-600 bg-slate-100 px-1 rounded">{p.password}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="neutral" format="outline" className="font-medium text-[11px]">
                            <Building2 className="w-3 h-3 mr-1 text-slate-500" />
                            {p.companyName}
                          </Badge>
                          <div className="text-[10px] text-slate-400 font-mono pl-1">
                            Kode: {p.companyId}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <span className="font-semibold text-xs text-ink line-clamp-1">
                            {p.assessmentTitle}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                            ID Program: {p.assessmentId}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={gradeBadgeVariant as any} format="soft" hasDot>
                            {p.gradeLevel}
                          </Badge>
                          <div className="text-[10px] text-slate-500">
                            40 Soal CAT (Single, Multi, Short, Essay, Matching)
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="font-semibold text-slate-900 font-mono">
                              {(() => {
                                const raw = p.scheduleDate || p.createdAt;
                                const d = raw ? new Date(raw) : new Date();
                                return isNaN(d.getTime())
                                  ? new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                  : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                              })()}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono pl-5">
                            09:00 - 11:30 WIB
                          </div>
                          <div className="pl-5">
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
                })
              )}
            </TableBody>
          </Table>

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
                    Kata Sandi Akun
                  </label>
                  <input
                    type="text"
                    required
                    value={pesertaFormPassword}
                    onChange={(e) => setPesertaFormPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">{editingPesertaId ? 'Kosongkan jika tidak ingin mengganti kata sandi.' : 'Default: peserta123'}</span>
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
                    <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
                      Pilih Instansi / Perusahaan (PT) *
                    </label>
                    <select
                      value={pesertaFormCompanyId}
                      onChange={(e) => setPesertaFormCompanyId(e.target.value)}
                      className="w-full h-11 px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy cursor-pointer font-medium text-slate-800 shadow-2xs"
                    >
                      {companyOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.industry})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
                      Pilih Jenis Asesmen *
                    </label>
                    <select
                      value={pesertaFormAssessmentId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        setPesertaFormAssessmentId(selectedId);
                        const match = availableProgramsForModal.find((p) => p.id === selectedId);
                        if (match) {
                          setPesertaFormGrade(match.gradeLevel);
                        }
                      }}
                      className="w-full h-11 px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy cursor-pointer font-medium text-slate-800 shadow-2xs"
                    >
                      {availableProgramsForModal.length === 0 ? (
                        <option value="">Tidak ada program untuk PT ini</option>
                      ) : (
                        availableProgramsForModal.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.id}] {p.title}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
                      Tingkat Kesulitan / Grade Soal *
                    </label>
                    <select
                      value={pesertaFormGrade}
                      onChange={(e: any) => setPesertaFormGrade(e.target.value)}
                      className="w-full h-11 px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy cursor-pointer font-medium text-slate-800 shadow-2xs"
                    >
                      <option value="Grade C (Junior)">Grade C (Junior / Dasar - 40 Soal)</option>
                      <option value="Grade B (Specialist / Mid)">Grade B (Specialist / Mid - 40 Soal)</option>
                      <option value="Grade A (Lead / Senior)">Grade A (Lead / Senior - 40 Soal)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Mencakup 5 tipe soal: Single Choice, Multiple Choice, Short Answer, Essay, & Matching Pairs.
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tanggal Pelaksanaan Ujian *
                    </label>
                    <input
                      type="date"
                      value={pesertaFormDate}
                      onChange={(e) => setPesertaFormDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
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
            <Card elevation="flat" className="p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Scale className="w-5 h-5" />
                </div>
                <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-semibold border border-blue-200/60">
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

            <Card elevation="flat" className="p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-emerald-400 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200/60">
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

            <Card elevation="flat" className="p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-indigo-400 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold border border-indigo-200/60">
                  BUMN & Multi
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

            <Card elevation="flat" className="p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-purple-400 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-semibold border border-purple-200/60">
                  ISO 10667
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">
                Sistem Penilaian Terpadu
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                  LHA & Rubrik
                </span>
                <span className="text-[11px] text-slate-400 font-mono">BSN Standard</span>
              </div>
            </Card>
          </div>

          {/* Action Ribbon & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama asesor, username, atau spesialisasi..."
                  value={asesorSearch}
                  onChange={(e) => setAsesorSearch(e.target.value)}
                  className="w-full h-11 pl-10 pr-3.5 py-2 text-sm font-sans bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                />
              </div>

              {/* PT Filter */}
              <select
                value={asesorCompanyFilter}
                onChange={(e) => setAsesorCompanyFilter(e.target.value)}
                className="h-11 px-3.5 py-2 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl shadow-2xs focus:outline-none focus:border-primary-navy cursor-pointer"
              >
                <option value="ALL">Semua Instansi PT</option>
                {companyOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddAsesorModal(true)}
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
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Sandi: <span className="font-mono text-slate-600 bg-slate-100 px-1 rounded">{a.password}</span>
                          </div>
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
                        {a.assignedCompanyName}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {a.assignedProgramIds.map((pId) => (
                          <span
                            key={pId}
                            className="text-[10px] bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded border border-slate-200"
                          >
                            {pId}
                          </span>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="teal" format="soft" hasDot>
                        {a.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => handleDeleteAsesor(a.id, a.name)}
                        leftIcon={<Trash2 className="w-3 h-3" />}
                      >
                        Cabut
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Modal: Tambah Asesor Baru */}
          <Modal
            isOpen={showAddAsesorModal}
            onClose={() => setShowAddAsesorModal(false)}
            title="Daftarkan Akun Asesor / Penguji Baru"
            description="Buat akun login asesor penilai untuk sesi wawancara, rubrik kompetensi, dan verifikasi LHA."
            size="md"
          >
            <form onSubmit={handleCreateAsesor} className="space-y-4 font-sans text-xs">
              {asesorFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{asesorFormError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar *
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
                    Kata Sandi Akun
                  </label>
                  <input
                    type="text"
                    required
                    value={asesorFormPassword}
                    onChange={(e) => setAsesorFormPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Default: asesor123</span>
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
                <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
                  Instansi / PT Penugasan Asesor *
                </label>
                <select
                  value={asesorFormCompanyId}
                  onChange={(e) => setAsesorFormCompanyId(e.target.value)}
                  className="w-full h-11 px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy cursor-pointer font-medium text-slate-800 shadow-2xs"
                >
                  {companyOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
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
                  onClick={() => setShowAddAsesorModal(false)}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary">
                  Daftarkan Akun Asesor
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
                <Card elevation="flat" className="p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                      <Shield className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md font-semibold border border-slate-200">
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

                <Card elevation="flat" className="p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-emerald-400 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200/60">
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

                <Card elevation="flat" className="p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-indigo-400 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                      <User className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold border border-indigo-200/60">
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

                <Card elevation="flat" className="p-4.5 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-amber-400 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                      <Lock className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold border border-amber-200/60">
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
                    <span className="text-[11px] text-slate-400 font-mono">Encrypted Session</span>
                  </div>
                </Card>
              </div>

              {/* Action Ribbon */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari admin berdasarkan username atau ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-11 pl-10 pr-3.5 py-2 text-sm font-sans bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                    />
                  </div>

                  <select
                    value={roleFilter}
                    onChange={(e: any) => setRoleFilter(e.target.value)}
                    className="h-11 px-3.5 py-2 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl shadow-2xs focus:outline-none focus:border-primary-navy cursor-pointer"
                  >
                    <option value="ALL">Semua Peran</option>
                    <option value="superadmin">Superadmin</option>
                    <option value="admin">Administrator</option>
                  </select>
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
                    <TableHead>Peran Otorisasi</TableHead>
                    <TableHead>Tanggal Pembuatan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-slate-400 text-xs">
                        Tidak ada pengguna yang cocok dengan kriteria filter.
                      </TableCell>
                    </TableRow>
                  ) : (
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
                    ))
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
                    <label className="block font-semibold text-slate-700 mb-1">
                      Username Pengguna
                    </label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. admin_asesmen"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Kata Sandi Sementara
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 8 karakter..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                    />
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
                      <label className="block font-semibold text-slate-700 mb-1">
                        Username Pengguna
                      </label>
                      <input
                        type="text"
                        required
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Kata Sandi Baru (Kosongkan jika tidak diubah)
                      </label>
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Biarkan kosong untuk mempertahankan kata sandi lama"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tingkat Otoritas / Peran
                      </label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy cursor-pointer"
                      >
                        <option value="admin">Administrator (Operasional)</option>
                        <option value="superadmin">Superadmin (Otoritas Penuh)</option>
                      </select>
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
