import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Building2,
  Award,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Clock,
  Camera,
  Laptop,
  Lock,
  Eye,
  EyeOff,
  Save,
  Check,
  ExternalLink,
  MapPin,
  GraduationCap,
  Briefcase,
  KeyRound,
  FileCheck2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { PesertaLayout } from './PesertaLayout';
import { Button, Badge } from '../ui';
import {
  getActiveSessionUser,
  updatePesertaUser,
  getAllPesertaUsers,
  type PesertaUser
} from '../../services/userRegistryService';
import { getProgramById } from '../../services/assessmentCatalog';

export default function PesertaProfile() {
  const navigate = useNavigate();
  const sessionUser = useMemo(() => getActiveSessionUser(), []);

  // Fetch full peserta record if available
  const initialData = useMemo(() => {
    const all = getAllPesertaUsers();
    const found = all.find((u) => u.id === sessionUser.id || u.username === sessionUser.username);
    return (
      found || {
        id: sessionUser.id || 'KND-0891',
        name: sessionUser.name || 'Farhan Pratama',
        username: sessionUser.username || 'farhan@kandidat.id',
        password: '••••••••',
        phone: '0812-8822-1920',
        companyId: sessionUser.companyId || 'PT-TELKOM',
        companyName: sessionUser.companyName || 'PT Telkom Indonesia Tbk',
        assessmentId: sessionUser.assessmentId || 'SE-402',
        assessmentTitle: sessionUser.assessmentTitle || 'Software Engineer Specialist Batch IV',
        gradeLevel: (sessionUser.gradeLevel as any) || 'Grade B (Specialist / Mid)',
        scheduleDate: '2026-10-30',
        status: 'Siap Ujian' as const,
        catScore: 88,
        createdAt: '2026-10-25T08:00:00Z'
      }
    );
  }, [sessionUser]);

  // Form states
  const [activeTab, setActiveTab] = useState<'biodata' | 'asesmen' | 'biometrik' | 'keamanan'>('biodata');
  const [fullName, setFullName] = useState(initialData.name);
  const [phone, setPhone] = useState(initialData.phone);
  const [email] = useState(initialData.username);
  const [nik, setNik] = useState('3271028491820003');
  const [showNik, setShowNik] = useState(false);
  const [education, setEducation] = useState('S1 Teknik Informatika / Ilmu Komputer');
  const [university, setUniversity] = useState('Institut Teknologi Bandung (ITB)');
  const [city, setCity] = useState('Kota Bandung, Jawa Barat');
  const [portfolioUrl, setPortfolioUrl] = useState('https://github.com/farhan-pratama');
  const [bio, setBio] = useState(
    'Software Engineer berfokus pada arsitektur sistem terdistribusi, database concurrency tuning, dan event-driven message queue.'
  );

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Status banners
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState('');

  // Registered face snapshot from localStorage
  const savedFacePhoto = localStorage.getItem('candidate_face_photo');

  const userInitials = useMemo(() => {
    return (
      fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase() || 'P'
    );
  }, [fullName]);

  const program = useMemo(() => {
    return getProgramById(initialData.assessmentId) || getProgramById('SE-402')!;
  }, [initialData.assessmentId]);

  // Save profile updates
  const handleSaveBiodata = (e: React.FormEvent) => {
    e.preventDefault();
    updatePesertaUser(initialData.id, {
      name: fullName,
      phone: phone
    });

    // Also update session user cache
    const currentSession = getActiveSessionUser();
    currentSession.name = fullName;
    localStorage.setItem('talenta_active_session_user', JSON.stringify(currentSession));

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Handle password update
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    if (newPassword.length < 6) {
      setPassError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    updatePesertaUser(initialData.id, {
      password: newPassword
    });

    setPassSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPassSuccess(false), 3000);
  };

  return (
    <PesertaLayout activeTab="profile">
      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
        {/* ─── Top Banner Profile Header ─── */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-100/50 via-indigo-50/20 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Profile Avatar / Real Face Snapshot */}
              <div className="relative group">
                {savedFacePhoto ? (
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-sm relative">
                    <img
                      src={savedFacePhoto}
                      alt={fullName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[9px] font-bold text-center py-0.5">
                      OpenCV AI
                    </div>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary-navy via-navy-dark to-blue-accent text-white flex items-center justify-center font-heading font-black text-2xl shadow-sm">
                    {userInitials}
                  </div>
                )}
                <button
                  onClick={() => navigate('/peserta/device-check')}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-primary-navy hover:shadow-xs transition-all cursor-pointer"
                  title="Perbarui Foto / Cek Perangkat"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Title & Metadata */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
                    {fullName}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Terverifikasi
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-semibold">
                    {initialData.id}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 pt-0.5">
                  <span className="flex items-center gap-1.5 font-medium text-slate-800">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    {initialData.companyName}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {email}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {phone}
                  </span>
                </div>

                <p className="text-xs text-blue-700 font-medium pt-1">
                  Program: <span className="font-bold">{initialData.assessmentTitle}</span> ({program.id}) •{' '}
                  <span className="text-slate-600">{initialData.gradeLevel}</span>
                </p>
              </div>
            </div>

            {/* Quick Action Badges */}
            <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/peserta/device-check')}
                className="text-xs gap-1.5 cursor-pointer"
              >
                <Laptop className="w-3.5 h-3.5 text-blue-600" />
                <span>Cek Perangkat</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/peserta/exam/SE-402')}
                className="text-xs gap-1.5 cursor-pointer"
              >
                <span>Buka Lembar Ujian</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Tab Navigation Pill Bar */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('biodata')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                activeTab === 'biodata'
                  ? 'bg-primary-navy text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Data Diri &amp; Biodata</span>
            </button>

            <button
              onClick={() => setActiveTab('asesmen')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                activeTab === 'asesmen'
                  ? 'bg-primary-navy text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Program Asesmen ({program.companyName})</span>
            </button>

            <button
              onClick={() => setActiveTab('biometrik')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                activeTab === 'biometrik'
                  ? 'bg-primary-navy text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Biometrik &amp; Perangkat</span>
            </button>

            <button
              onClick={() => setActiveTab('keamanan')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                activeTab === 'keamanan'
                  ? 'bg-primary-navy text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Keamanan &amp; Kata Sandi</span>
            </button>
          </div>
        </div>

        {/* ─── TAB 1: DATA DIRI & BIODATA ─── */}
        {activeTab === 'biodata' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                  Informasi Data Diri Peserta
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Data ini digunakan sebagai arsip identitas seleksi resmi dan penerbitan sertifikat hasil asesmen.
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                UU PDP No. 27/2022 Aman
              </span>
            </div>

            {saveSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">
                  Perubahan data diri berhasil disimpan ke basis data Talenta+.
                </span>
              </div>
            )}

            <form onSubmit={handleSaveBiodata} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Nama Lengkap */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nama Lengkap (Sesuai KTP)
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none bg-white transition-all"
                  />
                </div>

                {/* Email (Readonly) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Alamat Email (Username Akun)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      readOnly
                      disabled
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-500 font-mono cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold bg-slate-200/80 px-2 py-0.5 rounded">
                      Terkunci
                    </span>
                  </div>
                </div>

                {/* No Telepon / WA */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nomor WhatsApp / Seluler
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none bg-white transition-all font-mono"
                  />
                </div>

                {/* NIK / KTP */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nomor Induk Kependudukan (NIK)
                  </label>
                  <div className="relative">
                    <input
                      type={showNik ? 'text' : 'password'}
                      value={nik}
                      onChange={(e) => setNik(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none bg-white transition-all font-mono tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNik(!showNik)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNik ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Pendidikan Terakhir */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Jenjang &amp; Jurusan Pendidikan
                  </label>
                  <input
                    type="text"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none bg-white transition-all"
                  />
                </div>

                {/* Perguruan Tinggi */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Universitas / Institusi Asal
                  </label>
                  <input
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none bg-white transition-all"
                  />
                </div>

                {/* Domisili */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kota Domisili Saat Ini
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none bg-white transition-all"
                  />
                </div>

                {/* Link Portofolio / GitHub */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tautan GitHub / LinkedIn
                  </label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none bg-white transition-all font-mono"
                  />
                </div>
              </div>

              {/* Bio Singkat */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ringkasan Pengalaman Teknis / Bio Profesional
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none bg-white transition-all leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  className="px-6 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-xl cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan Data Diri</span>
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ─── TAB 2: PROGRAM ASESMEN TERDAFTAR ─── */}
        {activeTab === 'asesmen' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider font-mono">
                    Program Penugasan Aktif
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading">
                    {program.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Instansi Penguji:{' '}
                    <span className="font-bold text-slate-800">{program.companyName}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    {program.id}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    {initialData.gradeLevel}
                  </span>
                </div>
              </div>

              {/* Grid Assessment Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-medium text-slate-500 block">Metode Ujian</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900 mt-1 block">
                    CAT 40 Soal
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Tingkat {program.gradeLevel}</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-medium text-slate-500 block">Durasi Ujian</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900 mt-1 block font-mono">
                    {program.durationMinutes} Menit
                  </span>
                  <span className="text-[10px] text-slate-500">Auto-submit timer</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-medium text-slate-500 block">Passing Grade</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900 mt-1 block font-mono">
                    {program.passingScore} / 100
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold">Ambang Batas Lolos</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-medium text-slate-500 block">Status Sesi</span>
                  <span className="text-sm sm:text-base font-bold text-emerald-700 mt-1 block">
                    Siap Dikerjakan
                  </span>
                  <span className="text-[10px] text-slate-500">Jadwal: {initialData.scheduleDate}</span>
                </div>
              </div>

              {/* Interview Assignment Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/60 to-indigo-50/40 border border-blue-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-primary-navy text-white flex items-center justify-center font-bold font-heading text-lg shadow-2xs">
                    DH
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                      Dewan Asesor Ditugaskan
                    </span>
                    <p className="font-bold text-slate-900 text-sm sm:text-base">
                      Dr. Ir. Dwi Hartanto, M.Kom
                    </p>
                    <p className="text-xs text-slate-600">
                      Lead Assessor Independen • Sesi Wawancara: Kamis, 29 Oktober 2026 (14:00 - 14:45 WIB)
                    </p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/peserta/interview')}
                  className="text-xs font-bold cursor-pointer"
                >
                  Masuk Sesi Wawancara →
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => navigate('/peserta/asesmen')}
                  className="text-xs cursor-pointer"
                >
                  Lihat Katalog Program Lain
                </Button>
                <Button
                  variant="primary"
                  onClick={() => navigate(`/peserta/exam/${program.id}`)}
                  className="text-xs font-bold gap-2 cursor-pointer"
                >
                  <Laptop className="w-4 h-4" />
                  <span>Mulai Pengerjaan Ujian Sekarang</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: VERIFIKASI BIOMETRIK & PERANGKAT ─── */}
        {activeTab === 'biometrik' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                  Status Verifikasi Biometrik &amp; Perangkat
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Foto dan data telemetri yang digunakan sistem anti-cheat AI selama pengerjaan asesmen.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/peserta/device-check')}
                className="text-xs gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                <span>Uji Ulang Perangkat</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Snapshot Photo Card */}
              <div className="md:col-span-1 p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col items-center text-center space-y-3">
                <span className="text-xs font-bold text-slate-700">Foto Referensi Wajah Ujian</span>

                {savedFacePhoto ? (
                  <div className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md relative group">
                    <img
                      src={savedFacePhoto}
                      alt="Registered candidate face"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => navigate('/peserta/device-check')}
                        className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold shadow"
                      >
                        Foto Ulang
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-36 h-36 rounded-2xl bg-slate-200 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-3 text-slate-500">
                    <Camera className="w-8 h-8 text-slate-400 mb-1" />
                    <span className="text-[11px] font-semibold text-center leading-tight">
                      Belum Ada Foto Terdaftar
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {savedFacePhoto ? '✓ Wajah Terdaftar (OpenCV)' : 'Harap Lakukan Cek Perangkat'}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Digunakan untuk pencocokan frame video 30 FPS saat ujian berlangsung.
                  </p>
                </div>
              </div>

              {/* Hardware Telemetry List */}
              <div className="md:col-span-2 space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Kamera Web (Webcam)</p>
                      <p className="text-[11px] text-slate-500">HD Video Stream (1280x720) • 30 FPS</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Siap
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Mikrofon Sistem</p>
                      <p className="text-[11px] text-slate-500">Web Audio API • Sinyal Responsif</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Siap
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Integritas Browser &amp; Layar</p>
                      <p className="text-[11px] text-slate-500">Deteksi Tab Switch &amp; Fullscreen Lock Aktif</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Aman
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: KEAMANAN & KATA SANDI ─── */}
        {activeTab === 'keamanan' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                  Keamanan &amp; Perubahan Kata Sandi
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Perbarui kata sandi secara berkala untuk menjaga kerahasiaan lembar jawaban dan data pribadi.
                </p>
              </div>
            </div>

            {passSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">Kata sandi baru berhasil diperbarui dan aktif!</span>
              </div>
            )}

            {passError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900 flex items-center gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-semibold">{passError}</span>
              </div>
            )}

            <form onSubmit={handleSavePassword} className="max-w-md space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kata Sandi Lama / Saat Ini
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm outline-none bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kata Sandi Baru (Minimal 6 Karakter)
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm outline-none bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ulangi Kata Sandi Baru
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm outline-none bg-white font-mono"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 rounded-xl cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Perbarui Kata Sandi</span>
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </PesertaLayout>
  );
}
