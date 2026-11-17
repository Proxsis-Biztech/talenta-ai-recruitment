import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Building2,
  Layers,
  Plus,
  Trash2,
  Users,
  Search,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button, Badge, Input, Select } from '../ui';

interface Department {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  memberCount: number;
}

interface ClassGroup {
  id: string;
  name: string;
  programCode: string | null;
  description: string | null;
  capacity: number | null;
  memberCount: number;
  program?: { code: string; title: string } | null;
}

interface Member {
  id: string;
  name: string;
  email: string;
  candidateCode: string | null;
  membershipId: string;
}

interface PortalUserOption {
  id: string;
  name: string;
  email: string;
  candidateCode?: string | null;
}

const authHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function AdminOrgStructure() {
  const [tab, setTab] = useState<'departments' | 'classes'>('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [programs, setPrograms] = useState<Array<{ code: string; title: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const [deptName, setDeptName] = useState('');
  const [deptParent, setDeptParent] = useState('');

  const [className, setClassName] = useState('');
  const [classProgram, setClassProgram] = useState('');
  const [classCapacity, setClassCapacity] = useState('');

  const [activeClass, setActiveClass] = useState<ClassGroup | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [candidates, setCandidates] = useState<PortalUserOption[]>([]);

  const notify = (type: 'ok' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, classRes, jobRes] = await Promise.all([
        axios.get('/api/admin/departments', { headers: authHeaders() }),
        axios.get('/api/admin/classes', { headers: authHeaders() }),
        axios.get('/api/admin/jobs', { headers: authHeaders() })
      ]);
      setDepartments(deptRes.data?.data || []);
      setClasses(classRes.data?.data || []);
      const jobs = jobRes.data?.data || [];
      setPrograms(
        jobs
          .filter((job: any) => job.code)
          .map((job: any) => ({ code: job.code, title: job.title }))
      );
    } catch {
      notify('error', 'Gagal memuat struktur organisasi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const sortedDepartments = useMemo(
    () => [...departments].sort((a, b) => (a.level - b.level) || a.name.localeCompare(b.name)),
    [departments]
  );

  const createDepartment = async () => {
    if (deptName.trim().length < 2) return;
    try {
      await axios.post(
        '/api/admin/departments',
        { name: deptName.trim(), parentId: deptParent || null },
        { headers: authHeaders() }
      );
      setDeptName('');
      setDeptParent('');
      notify('ok', 'Departemen ditambahkan.');
      void loadAll();
    } catch (error) {
      notify('error', axios.isAxiosError(error) ? error.response?.data?.error || 'Gagal menambah departemen.' : 'Gagal menambah departemen.');
    }
  };

  const deleteDepartment = async (id: string) => {
    try {
      await axios.delete(`/api/admin/departments/${id}`, { headers: authHeaders() });
      notify('ok', 'Departemen dihapus.');
      void loadAll();
    } catch (error) {
      notify('error', axios.isAxiosError(error) ? error.response?.data?.error || 'Gagal menghapus departemen.' : 'Gagal menghapus departemen.');
    }
  };

  const createClass = async () => {
    if (className.trim().length < 2) return;
    try {
      await axios.post(
        '/api/admin/classes',
        {
          name: className.trim(),
          programCode: classProgram || null,
          capacity: classCapacity ? Number(classCapacity) : null
        },
        { headers: authHeaders() }
      );
      setClassName('');
      setClassCapacity('');
      notify('ok', 'Kelas dibuat.');
      void loadAll();
    } catch (error) {
      notify('error', axios.isAxiosError(error) ? error.response?.data?.error || 'Gagal membuat kelas.' : 'Gagal membuat kelas.');
    }
  };

  const deleteClass = async (id: string) => {
    try {
      await axios.delete(`/api/admin/classes/${id}`, { headers: authHeaders() });
      if (activeClass?.id === id) setActiveClass(null);
      notify('ok', 'Kelas dihapus.');
      void loadAll();
    } catch (error) {
      notify('error', axios.isAxiosError(error) ? error.response?.data?.error || 'Gagal menghapus kelas.' : 'Gagal menghapus kelas.');
    }
  };

  const openClass = async (group: ClassGroup) => {
    setActiveClass(group);
    try {
      const response = await axios.get(`/api/admin/classes/${group.id}/members`, { headers: authHeaders() });
      setMembers(response.data?.data?.members || []);
    } catch {
      setMembers([]);
    }
  };

  const searchCandidates = async (query: string) => {
    setMemberQuery(query);
    if (query.trim().length < 2) {
      setCandidates([]);
      return;
    }
    try {
      const response = await axios.get('/api/admin/portal-users', {
        headers: authHeaders(),
        params: { role: 'peserta', search: query.trim() }
      });
      setCandidates((response.data?.data || []).slice(0, 8));
    } catch {
      setCandidates([]);
    }
  };

  const addMember = async (userId: string) => {
    if (!activeClass) return;
    try {
      await axios.post(`/api/admin/classes/${activeClass.id}/members`, { userIds: [userId] }, { headers: authHeaders() });
      setMemberQuery('');
      setCandidates([]);
      await openClass(activeClass);
      notify('ok', 'Peserta ditambahkan ke kelas.');
    } catch (error) {
      notify('error', axios.isAxiosError(error) ? error.response?.data?.error || 'Gagal menambah anggota.' : 'Gagal menambah anggota.');
    }
  };

  const removeMember = async (userId: string) => {
    if (!activeClass) return;
    try {
      await axios.delete(`/api/admin/classes/${activeClass.id}/members/${userId}`, { headers: authHeaders() });
      await openClass(activeClass);
      notify('ok', 'Anggota dikeluarkan dari kelas.');
    } catch {
      notify('error', 'Gagal mengeluarkan anggota.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold font-heading text-ink">Struktur Organisasi & Kelas</h2>
          <p className="text-xs text-muted-slate mt-0.5">
            Kelola hierarki perusahaan → departemen → sub-departemen serta penetapan peserta ke banyak kelas sekaligus.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadAll()} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Muat Ulang
        </Button>
      </div>

      {notice && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
            notice.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notice.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {notice.text}
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-slate-200">
        {(['departments', 'classes'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 -mb-px transition-colors cursor-pointer ${
              tab === key
                ? 'border-primary-navy text-primary-navy'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {key === 'departments' ? 'Departemen' : 'Kelas & Anggota'}
          </button>
        ))}
      </div>

      {tab === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-navy" />
              Hierarki Departemen
            </h3>
            {loading ? (
              <p className="text-xs text-slate-500">Memuat...</p>
            ) : sortedDepartments.length === 0 ? (
              <p className="text-xs text-slate-500">Belum ada departemen. Tambahkan departemen induk terlebih dahulu.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {sortedDepartments.map((department) => (
                  <div key={department.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: department.level * 16 }}>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{department.name}</p>
                        <p className="text-[11px] text-slate-500">
                          Level {department.level} • {department.memberCount} anggota
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteDepartment(department.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Hapus departemen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 h-fit">
            <h3 className="text-sm font-bold text-slate-800">Tambah Departemen</h3>
            <Input
              value={deptName}
              onChange={(event) => setDeptName(event.target.value)}
              placeholder="Nama departemen / sub-departemen"
            />
            <Select value={deptParent} onChange={(event) => setDeptParent(event.target.value)}>
              <option value="">Tanpa induk (level 0)</option>
              {sortedDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {'—'.repeat(department.level)} {department.name}
                </option>
              ))}
            </Select>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void createDepartment()}
              disabled={deptName.trim().length < 2}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Simpan Departemen
            </Button>
          </div>
        </div>
      )}

      {tab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary-navy" />
                Kelas Asesmen
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="Nama kelas" />
                <Select value={classProgram} onChange={(event) => setClassProgram(event.target.value)}>
                  <option value="">Tanpa program</option>
                  {programs.map((program) => (
                    <option key={program.code} value={program.code}>
                      {program.code} — {program.title}
                    </option>
                  ))}
                </Select>
                <Input
                  value={classCapacity}
                  onChange={(event) => setClassCapacity(event.target.value.replace(/\D/g, ''))}
                  placeholder="Kapasitas (opsional)"
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void createClass()}
                disabled={className.trim().length < 2}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Buat Kelas
              </Button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
              {loading ? (
                <p className="text-xs text-slate-500">Memuat...</p>
              ) : classes.length === 0 ? (
                <p className="text-xs text-slate-500">Belum ada kelas.</p>
              ) : (
                classes.map((group) => (
                  <div
                    key={group.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                      activeClass?.id === group.id ? 'border-primary-navy bg-soft-blue/40' : 'border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void openClass(group)}
                      className="text-left min-w-0 flex-1 cursor-pointer"
                    >
                      <p className="text-xs font-bold text-slate-800 truncate">{group.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {group.program?.title || group.programCode || 'Tanpa program'} • {group.memberCount} anggota
                        {group.capacity ? ` / ${group.capacity}` : ''}
                      </p>
                    </button>
                    <Badge variant="default" className="text-[10px]">
                      {group.memberCount} peserta
                    </Badge>
                    <button
                      type="button"
                      onClick={() => void deleteClass(group.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Hapus kelas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-navy" />
              {activeClass ? `Anggota: ${activeClass.name}` : 'Pilih kelas'}
            </h3>
            {!activeClass ? (
              <p className="text-xs text-slate-500">Pilih salah satu kelas untuk mengelola anggotanya.</p>
            ) : (
              <>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={memberQuery}
                    onChange={(event) => void searchCandidates(event.target.value)}
                    placeholder="Cari peserta (nama/email)..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-primary-navy"
                  />
                </div>
                {candidates.length > 0 && (
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-40 overflow-y-auto">
                    {candidates.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => void addMember(candidate.id)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer"
                      >
                        <p className="text-xs font-semibold text-slate-800">{candidate.name}</p>
                        <p className="text-[11px] text-slate-500">{candidate.email}</p>
                      </button>
                    ))}
                  </div>
                )}
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {members.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">Belum ada anggota di kelas ini.</p>
                  ) : (
                    members.map((member) => (
                      <div key={member.membershipId} className="py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{member.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {member.candidateCode || member.email}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void removeMember(member.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Keluarkan dari kelas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}