import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  Trash2, Briefcase, Plus, Edit2, AlertCircle, Clock, 
  Target, Search, RefreshCw
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

interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  interviewDuration: number | null;
  interviewPassingScore: number | null;
  createdAt: string;
}

export default function JobManagement() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');

  // Add Job Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState<'active' | 'inactive'>('active');
  const [newDuration, setNewDuration] = useState<number | ''>(15);
  const [newPassingScore, setNewPassingScore] = useState<number | ''>(70);
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Edit Job Modal State
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editDuration, setEditDuration] = useState<number | ''>('');
  const [editPassingScore, setEditPassingScore] = useState<number | ''>('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/jobs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobs(response.data.data);
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal mengambil data lowongan pekerjaan.' : 'Gagal mengambil data lowongan pekerjaan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setAddError('Judul posisi wajib diisi.');
      return;
    }
    setAddLoading(true);
    setAddError('');
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post('/api/admin/jobs', {
        title: newTitle.trim(),
        description: newDescription.trim(),
        status: newStatus,
        interviewDuration: newDuration === '' ? null : Number(newDuration),
        interviewPassingScore: newPassingScore === '' ? null : Number(newPassingScore),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowAddModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewStatus('active');
      setNewDuration(15);
      setNewPassingScore(70);
      Swal.fire({
        icon: 'success',
        title: 'Formasi Berhasil Dibuat',
        text: 'Formasi pekerjaan baru siap menerima pendaftar asesmen.',
        timer: 2000,
        showConfirmButton: false
      });
      fetchJobs();
    } catch (err: unknown) {
      setAddError(axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal membuat lowongan.' : 'Gagal membuat lowongan.');
    } finally {
      setAddLoading(false);
    }
  };

  const openEditModal = (job: Job) => {
    setEditingJob(job);
    setEditTitle(job.title);
    setEditDescription(job.description || '');
    setEditStatus((job.status as 'active' | 'inactive') || 'active');
    setEditDuration(job.interviewDuration ?? 15);
    setEditPassingScore(job.interviewPassingScore ?? 70);
    setEditError('');
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;
    if (!editTitle.trim()) {
      setEditError('Judul posisi wajib diisi.');
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/admin/jobs/${editingJob.id}`, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        status: editStatus,
        interviewDuration: editDuration === '' ? null : Number(editDuration),
        interviewPassingScore: editPassingScore === '' ? null : Number(editPassingScore),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setEditingJob(null);
      Swal.fire({
        icon: 'success',
        title: 'Formasi Diperbarui',
        text: 'Perubahan konfigurasi asesmen berhasil disimpan.',
        timer: 2000,
        showConfirmButton: false
      });
      fetchJobs();
    } catch (err: unknown) {
      setEditError(axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal memperbarui lowongan.' : 'Gagal memperbarui lowongan.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteJob = async (id: string, title: string) => {
    const result = await Swal.fire({
      title: 'Hapus Formasi Asesmen?',
      text: `Apakah Anda yakin ingin menghapus "${title}"? Data pendaftar pada formasi ini tidak dapat dipulihkan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1E3A8A',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Ya, Hapus Formasi',
      cancelButtonText: 'Batal',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/admin/jobs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Dihapus',
        text: 'Formasi lowongan telah dihapus dari sistem.',
        timer: 2000,
        showConfirmButton: false
      });
      fetchJobs();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal menghapus lowongan.' : 'Gagal menghapus lowongan.';
      Swal.fire({ icon: 'error', title: 'Gagal Menghapus', text: msg });
    }
  };

  // Metrics
  const activeCount = useMemo(() => {
    return jobs.filter(j => j.status === 'active').length;
  }, [jobs]);

  const inactiveCount = useMemo(() => {
    return jobs.filter(j => j.status !== 'active').length;
  }, [jobs]);

  const avgPassingScore = useMemo(() => {
    const scored = jobs.filter(j => j.interviewPassingScore !== null);
    if (scored.length === 0) return 70;
    const sum = scored.reduce((acc, curr) => acc + (curr.interviewPassingScore || 0), 0);
    return Math.round(sum / scored.length);
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 font-sans">
      {/* Telemetry Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card elevation="flat" className="p-4.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Formasi Lowongan
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-ink">
              {jobs.length}
            </span>
            <span className="text-xs text-muted-slate">Posisi Dibuka</span>
          </div>
        </Card>

        <Card elevation="flat" className="p-4.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Lowongan Aktif
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-success-green">
              {activeCount}
            </span>
            <span className="text-xs text-success-green font-medium">Menerima Pelamar</span>
          </div>
        </Card>

        <Card elevation="flat" className="p-4.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Rata-rata Passing Score
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-primary-navy">
              {avgPassingScore}%
            </span>
            <span className="text-xs text-muted-slate">Ambang Kelulusan</span>
          </div>
        </Card>

        <Card elevation="flat" className="p-4.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Formasi Arsip / Nonaktif
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-700">
              {inactiveCount}
            </span>
            <span className="text-xs text-muted-slate">Ditutup</span>
          </div>
        </Card>
      </div>

      {/* Control & Filter Ledger Bar */}
      <Card elevation="flat" className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Input
              placeholder="Cari judul lowongan atau keahlian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-sans">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-md transition-colors font-medium cursor-pointer ${
                statusFilter === 'ALL' 
                  ? 'bg-white text-slate-900 font-bold shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({jobs.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-md transition-colors font-medium cursor-pointer ${
                statusFilter === 'active' 
                  ? 'bg-white text-emerald-800 font-bold shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aktif ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-md transition-colors font-medium cursor-pointer ${
                statusFilter === 'inactive' 
                  ? 'bg-white text-slate-800 font-bold shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nonaktif ({inactiveCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchJobs}
            title="Refresh Data"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Segarkan
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Buat Lowongan Baru
          </Button>
        </div>
      </Card>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Jobs Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 text-center">#</TableHead>
            <TableHead>Formasi Lowongan</TableHead>
            <TableHead>Konfigurasi Interview AI</TableHead>
            <TableHead>Status Perekrutan</TableHead>
            <TableHead>Tanggal Rilis</TableHead>
            <TableHead className="text-right">Opsi Pengelolaan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-slate-400 font-sans text-sm">
                Memuat daftar formasi lowongan...
              </TableCell>
            </TableRow>
          ) : filteredJobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-14 text-center">
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-11 h-11 rounded-full bg-slate-100 text-muted-slate flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-ink">Belum ada lowongan</p>
                  <p className="text-xs text-muted-slate">Tidak ada lowongan yang sesuai kriteria filter. Ubah filter atau tambah formasi baru.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredJobs.map((job, idx) => (
              <TableRow key={job.id}>
                <TableCell className="text-center font-mono text-muted-slate">
                  {(idx + 1).toString().padStart(2, '0')}
                </TableCell>
                <TableCell className="max-w-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-soft-blue border border-accent-border flex items-center justify-center text-primary-navy shrink-0 mt-0.5">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 leading-snug">{job.title}</div>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 font-sans">
                        {job.description}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono text-xs">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {job.interviewDuration ? `${job.interviewDuration}m` : '15m'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary-navy bg-soft-blue border border-accent-border px-2 py-0.5 rounded font-bold font-mono text-xs">
                      <Target className="w-3 h-3 text-primary-navy" />
                      Pass: {job.interviewPassingScore !== null ? `${job.interviewPassingScore}%` : '70%'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={job.status === 'active' ? 'success' : 'neutral'}
                    format="soft"
                    hasDot={job.status === 'active'}
                  >
                    {job.status === 'active' ? 'AKTIF' : 'NONAKTIF'}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-500 whitespace-nowrap text-xs">
                  {new Date(job.createdAt).toLocaleDateString('id-ID', {
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
                      onClick={() => openEditModal(job)}
                      leftIcon={<Edit2 className="w-3 h-3" />}
                    >
                      Ubah
                    </Button>
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => handleDeleteJob(job.id, job.title)}
                      leftIcon={<Trash2 className="w-3 h-3" />}
                    >
                      Hapus
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Add Job Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Buat Formasi Lowongan Pekerjaan Baru"
        description="Konfigurasikan judul posisi, durasi wawancara AI, dan passing grade kelulusan."
        size="lg"
      >
        <form onSubmit={handleAddJob} className="space-y-4 font-sans">
          {addError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Judul Posisi Pekerjaan
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              className="w-full px-3 py-2 text-xs font-sans bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deskripsi Pekerjaan &amp; Kriteria Kualifikasi
            </label>
            <textarea
              required
              rows={4}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Deskripsikan tanggung jawab utama, tech stack, dan persyaratan kompetensi..."
              className="w-full px-3 py-2 text-xs font-sans bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Durasi Wawancara AI (Menit)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ambang Kelulusan (Passing Score 0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={newPassingScore}
                onChange={(e) => setNewPassingScore(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status Formasi
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as 'active' | 'inactive')}
              className="w-full px-3 py-2 text-xs font-sans bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy cursor-pointer"
            >
              <option value="active">Aktif (Terbuka untuk Pendaftaran)</option>
              <option value="inactive">Nonaktif (Arsip Internal)</option>
            </select>
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
              Simpan Formasi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Job Modal */}
      {editingJob && (
        <Modal
          isOpen={!!editingJob}
          onClose={() => setEditingJob(null)}
          title="Ubah Konfigurasi Formasi Lowongan"
          description={`Perbarui parameter evaluasi dan passing grade untuk ${editingJob.title}.`}
          size="lg"
        >
          <form onSubmit={handleUpdateJob} className="space-y-4 font-sans">
            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Judul Posisi Pekerjaan
              </label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs font-sans bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deskripsi Pekerjaan &amp; Kriteria Kualifikasi
              </label>
              <textarea
                required
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs font-sans bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Durasi Wawancara AI (Menit)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ambang Kelulusan (Passing Score 0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editPassingScore}
                  onChange={(e) => setEditPassingScore(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Formasi
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
                className="w-full px-3 py-2 text-xs font-sans bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy cursor-pointer"
              >
                <option value="active">Aktif (Terbuka untuk Pendaftaran)</option>
                <option value="inactive">Nonaktif (Arsip Internal)</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingJob(null)}
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
    </div>
  );
}
