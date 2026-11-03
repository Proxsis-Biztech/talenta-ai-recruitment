import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { KeyRound, Plus, Copy, CheckCircle2, XCircle, RefreshCw, Calendar } from 'lucide-react';
import {
  Button,
  Badge,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Modal
} from '../ui';

interface AccessCode {
  code: string;
  programCode: string;
  programTitle: string;
  maxUses: number;
  uses: number;
  remainingUses: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

interface ProgramOption {
  code: string | null;
  title: string;
}

export function AdminAccessCodes() {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    code: '',
    programCode: '',
    maxUses: 1000,
    expiresAt: ''
  });

  const headers = { Authorization: `Bearer ${localStorage.getItem('adminToken')}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [codesResponse, jobsResponse] = await Promise.all([
        axios.get('/api/admin/access-codes', { headers }),
        axios.get('/api/admin/jobs', { params: { limit: 100 }, headers })
      ]);
      const list = codesResponse.data.data || [];
      setCodes(list);
      setPrograms(
        (jobsResponse.data.data || [])
          .filter((job: any) => job.code)
          .map((job: any) => ({ code: job.code, title: job.title }))
      );
      if (!form.programCode && list.length === 0) {
        const first = (jobsResponse.data.data || []).find((job: any) => job.code);
        if (first) setForm((prev) => ({ ...prev, programCode: first.code }));
      }
    } catch {
      setCodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!form.code.trim() || !form.programCode) {
      setError('Kode dan program wajib dipilih.');
      return;
    }
    setSaving(true);
    try {
      await axios.post('/api/admin/access-codes', {
        code: form.code.trim().toUpperCase(),
        programCode: form.programCode,
        maxUses: Number(form.maxUses) || 1,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        active: true
      }, { headers });
      setModalOpen(false);
      setForm({ code: '', programCode: form.programCode, maxUses: 1000, expiresAt: '' });
      await load();
      showToast('Kode akses berhasil dibuat.');
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal membuat kode akses.' : 'Gagal membuat kode akses.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (code: AccessCode) => {
    try {
      await axios.put(`/api/admin/access-codes/${code.code}`, { active: !code.active }, { headers });
      await load();
      showToast(`Kode ${code.code} ${code.active ? 'dinonaktifkan' : 'diaktifkan'}.`);
    } catch {
      showToast('Gagal mengubah status kode akses.');
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast(`Kode ${code} disalin.`);
    } catch {
      showToast('Clipboard tidak tersedia.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-heading text-ink">Kode Akses Program</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola token masuk peserta, masa berlaku, dan kuota penggunaan per program asesmen.
          </p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)} className="text-xs py-2.5 px-4 rounded-xl">
          <Plus className="w-4 h-4 mr-1.5" />
          Buat Kode Akses
        </Button>
      </div>

      {toast && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
          {toast}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kode</TableHead>
            <TableHead>Program</TableHead>
            <TableHead>Penggunaan</TableHead>
            <TableHead>Kedaluwarsa</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-xs text-slate-400">
                Memuat kode akses...
              </TableCell>
            </TableRow>
          )}
          {!loading && codes.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-xs text-slate-400">
                Belum ada kode akses. Buat kode pertama untuk membuka portal peserta.
              </TableCell>
            </TableRow>
          )}
          {codes.map((code) => (
            <TableRow key={code.code}>
              <TableCell>
                <span className="font-mono font-bold text-primary-navy">{code.code}</span>
              </TableCell>
              <TableCell>
                <span className="block max-w-[280px] truncate text-sm text-slate-700" title={code.programTitle}>{code.programTitle}</span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs text-slate-700">
                  {code.uses} / {code.maxUses}
                </span>
                <span className="block text-[11px] text-slate-400">{code.remainingUses} tersisa</span>
              </TableCell>
              <TableCell>
                <span className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString('id-ID') : 'Tanpa batas'}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={code.active ? 'success' : 'danger'} format="soft" hasDot>
                  {code.active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => copyCode(code.code)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-primary-navy hover:bg-slate-50 cursor-pointer"
                    title="Salin kode"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(code)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-primary-navy hover:bg-slate-50 cursor-pointer"
                    title={code.active ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {code.active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Buat Kode Akses Program" size="md">
        <form onSubmit={handleCreate} className="space-y-4 p-1">
          {error && (
            <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Kode Akses</label>
            <Input
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
              placeholder="Contoh: SE-402-BATCH5"
              className="font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Program Asesmen</label>
            <select
              value={form.programCode}
              onChange={(event) => setForm((prev) => ({ ...prev, programCode: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 bg-white"
            >
              <option value="">Pilih program</option>
              {programs.map((program) => (
                <option key={program.code} value={program.code || ''}>
                  {program.code} — {program.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Kuota Penggunaan</label>
              <Input
                type="number"
                min={1}
                value={form.maxUses}
                onChange={(event) => setForm((prev) => ({ ...prev, maxUses: Number(event.target.value) }))}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Kedaluwarsa</label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <KeyRound className="w-4 h-4 mr-1.5" />}
              {saving ? 'Menyimpan...' : 'Buat Kode'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}