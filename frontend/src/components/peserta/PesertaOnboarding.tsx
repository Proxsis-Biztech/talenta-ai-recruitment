import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, LockKeyhole, UserRound, ArrowRight } from 'lucide-react';
import { Button, Input } from '../ui';
import { getPortalToken, getPortalUser, savePortalSession } from '../../services/portalAuthService';

export default function PesertaOnboarding() {
  const navigate = useNavigate();
  const currentUser = getPortalUser();
  const requiresCurrentPassword = Boolean(currentUser?.mustChangePassword);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [nik, setNik] = useState(currentUser?.nik || '');
  const [education, setEducation] = useState(currentUser?.education || '');
  const [university, setUniversity] = useState(currentUser?.university || '');
  const [city, setCity] = useState(currentUser?.city || '');
  const [employeeNumber, setEmployeeNumber] = useState(currentUser?.employeeNumber || '');
  const [department, setDepartment] = useState(currentUser?.department || '');
  const [portfolioUrl, setPortfolioUrl] = useState(currentUser?.portfolioUrl || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (requiresCurrentPassword && !currentPassword) {
      setError('Masukkan kata sandi saat ini.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Kata sandi baru minimal 8 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    if (!nik.trim()) {
      setError('NIK wajib diisi.');
      return;
    }
    const token = getPortalToken();
    if (!token) {
      setError('Sesi Anda tidak ditemukan. Silakan masuk kembali.');
      return;
    }
    setSaving(true);
    try {
      const response = await axios.post('/api/portal/onboarding', {
        currentPassword,
        newPassword,
        name,
        phone,
        nik,
        education,
        university,
        city,
        employeeNumber,
        department,
        portfolioUrl,
        bio
      }, { headers: { Authorization: `Bearer ${token}` } });
      savePortalSession({ token, user: response.data.user });
      navigate('/peserta/profile?tab=biometrik', { replace: true });
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal menyimpan data onboarding.' : 'Gagal menyimpan data onboarding.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <img
            src="/img/logoRIght.jpeg"
            alt="RIGHT Assessment Platform"
            className="h-10 w-auto max-w-[200px] object-contain"
          />
          <div className="border-l border-slate-300 pl-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Lengkapi Akun Peserta</h1>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-3 pb-5 border-b border-slate-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600">
              Sebelum mengikuti asesmen, lengkapi data diri, ganti kata sandi awal, lalu selesaikan verifikasi biometrik & perangkat pada langkah berikutnya.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="pt-6 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <LockKeyhole className="w-4 h-4 text-primary-navy" />
                <h2 className="text-sm font-bold text-slate-900">Keamanan Akun</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label={requiresCurrentPassword ? "Kata Sandi Saat Ini" : "Kata Sandi Saat Ini (opsional)"} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required={requiresCurrentPassword} />
                <Input label="Kata Sandi Baru" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} hint="Minimal 8 karakter" required />
                <Input label="Konfirmasi Kata Sandi Baru" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <UserRound className="w-4 h-4 text-primary-navy" />
                <h2 className="text-sm font-bold text-slate-900">Data Profil</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nama Lengkap" value={name} onChange={(e) => setName(e.target.value)} required />
                <Input label="No. Telepon" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                <Input label="NIK" value={nik} onChange={(e) => setNik(e.target.value)} required />
                <Input label="Pendidikan" value={education} onChange={(e) => setEducation(e.target.value)} placeholder="Contoh: S1 Teknik Informatika" required />
                <Input label="Universitas" value={university} onChange={(e) => setUniversity(e.target.value)} required />
                <Input label="Kota Domisili" value={city} onChange={(e) => setCity(e.target.value)} required />
                <Input label="Nomor Pegawai (opsional)" value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} />
                <Input label="Departemen / Level (opsional)" value={department} onChange={(e) => setDepartment(e.target.value)} />
                <Input label="Portfolio / LinkedIn" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="Opsional" />
              </div>
              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-semibold text-slate-700">Ringkasan Profil</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Opsional: ringkasan pengalaman dan keahlian"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/15"
                />
              </div>
            </section>

            {error && (
              <p className="text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" disabled={saving} className="w-full sm:w-auto">
                {saving ? 'Menyimpan...' : 'Simpan & Lanjutkan'}
                {!saving && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
