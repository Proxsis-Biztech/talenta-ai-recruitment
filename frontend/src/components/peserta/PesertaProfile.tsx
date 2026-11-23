import { isAnyCatCompleted } from '../../services/progressService';
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
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
  ChevronRight,
  Video
} from 'lucide-react';
import { PesertaLayout } from './PesertaLayout';
import { Button, Badge } from '../ui';
import Swal from 'sweetalert2';
import { getActiveSessionUser } from '../../services/userRegistryService';
import { getPortalToken, savePortalSession, getPortalUser, fetchPortalMe } from '../../services/portalAuthService';
import { getProgramById } from '../../services/assessmentCatalog';

export default function PesertaProfile() {
  const navigate = useNavigate();
  const sessionUser = useMemo(() => getActiveSessionUser(), []);

  // Fetch full peserta record if available
  const initialData = useMemo(() => {
    const portal = getPortalUser();
    return {
      id: sessionUser.id || '',
      name: sessionUser.name || '',
      username: sessionUser.username || '',
      phone: portal?.phone || '',
      companyId: sessionUser.companyId || '',
      companyName: sessionUser.companyName || '',
      assessmentId: sessionUser.assessmentId || 'SE-402',
      assessmentTitle: sessionUser.assessmentTitle || '',
      gradeLevel: sessionUser.gradeLevel || 'Grade B (Specialist / Mid)',
      scheduleDate: (() => {
        const raw = portal?.interviewScheduledAt || portal?.createdAt;
        if (!raw) return '09 Nov 2026, 09:00 WIB';
        const d = new Date(raw);
        return isNaN(d.getTime())
          ? '09 Nov 2026, 09:00 WIB'
          : `${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}, 09:00 WIB`;
      })(),
      status: 'Siap Ujian' as const,
      catScore: 0,
      createdAt: ''
    };
  }, [sessionUser]);

  const isPlaceholderName = (name?: string | null) => {
    if (!name) return true;
    const n = name.trim().toLowerCase();
    return (
      n === '' ||
      n === 'kandidat ujian cat' ||
      n === 'kandidat baru' ||
      n.startsWith('token-') ||
      n.startsWith('kandidat ')
    );
  };

  // Form states
  const [activeTab, setActiveTab] = useState<'biodata' | 'asesmen' | 'keamanan'>('biodata');
  const [fullName, setFullName] = useState(() => (isPlaceholderName(initialData.name) ? '' : initialData.name));
  const [phone, setPhone] = useState(initialData.phone);
  const [email] = useState(initialData.username);
  const isAccessCodeUser = Boolean(
    initialData.username?.startsWith('token-') ||
    initialData.username?.endsWith('@talenta.local') ||
    initialData.id?.startsWith('token-')
  );
  const [nik, setNik] = useState(getPortalUser()?.nik || '');
  const [showNik, setShowNik] = useState(false);
  const [education, setEducation] = useState(getPortalUser()?.education || '');
  const [university, setUniversity] = useState(getPortalUser()?.university || '');
  const [city, setCity] = useState(getPortalUser()?.city || '');
  const [employeeNumber, setEmployeeNumber] = useState(getPortalUser()?.employeeNumber || '');
  const [department, setDepartment] = useState(getPortalUser()?.department || '');
  const [portfolioUrl, setPortfolioUrl] = useState(getPortalUser()?.portfolioUrl || '');
  const [bio, setBio] = useState(getPortalUser()?.bio || '');

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Status banners
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [biodataError, setBiodataError] = useState('');
  const [isSavingBiodata, setIsSavingBiodata] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState('');

  // Registered face snapshot from localStorage
  const [savedFacePhoto] = useState<string | null>(localStorage.getItem('candidate_face_photo'));

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

  const isCatCompleted = useMemo(() => {
    return isAnyCatCompleted();
  }, []);

  const isFaceRegistered = Boolean(savedFacePhoto || getPortalUser()?.faceVerifiedAt);

  const isNameValid = fullName.trim().length >= 2 && !isPlaceholderName(fullName);
  const cleanPhoneDigits = phone.replace(/[\s-]/g, '');
  const isPhoneValid = /^(?:\+62|62|0)8[0-9]{8,12}$/.test(cleanPhoneDigits);
  const cleanNikDigits = nik.replace(/\D/g, '');
  const isNikValid = cleanNikDigits.length === 16;
  const isEducationValid = education.trim().length > 0;
  const isUniversityValid = university.trim().length > 0;
  const isCityValid = city.trim().length > 0;

  const completedItemsCount = [
    isNameValid,
    isPhoneValid,
    isNikValid,
    isEducationValid,
    isUniversityValid,
    isCityValid,
    isFaceRegistered
  ].filter(Boolean).length;

  const fieldValidationBorderClass = (valid: boolean) =>
    valid
      ? 'border-emerald-400 bg-emerald-50/15 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10'
      : 'border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10';

  const renderValidationStatus = (valid: boolean, missingText = 'Wajib diisi', validText = 'Lengkap') =>
    valid ? (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>{validText}</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
        <span>{missingText}</span>
      </span>
    );

  const handleOpenLiveScanOnProfile = () => {
    navigate('/peserta/live-scan');
  };

  const renderLiveScanIdentityPanel = () => (
    <div
      id="profile-live-scan"
      className={`rounded-2xl border p-4 sm:p-6 space-y-4 transition-colors ${
        isFaceRegistered
          ? 'border-emerald-300/90 bg-emerald-50/25'
          : 'border-rose-300 bg-rose-50/30'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 font-heading flex items-center gap-2">
            <Camera className={`w-4 h-4 ${isFaceRegistered ? 'text-emerald-600' : 'text-rose-600'}`} />
            <span>
              Foto Identitas Resmi (Live Scan Kamera) <span className="text-rose-600">*</span>
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Gunakan halaman Live Scan Kamera berlayar lebar dengan garis panduan kepala &amp; setengah badan.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
            isFaceRegistered
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : 'bg-rose-100 text-rose-700 border-rose-200'
          }`}
        >
          {isFaceRegistered ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Foto Identitas Lengkap</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Wajib Diambil</span>
            </>
          )}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Saved Photo Summary + Launch Dedicated Live Scan Page */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-4 flex flex-col items-center justify-between text-center space-y-3">
          <span className="text-xs font-bold text-slate-700">Foto Identitas Anda</span>

          <div className="w-40 h-48 rounded-2xl overflow-hidden border-2 border-primary-navy bg-slate-100 relative">
            {savedFacePhoto ? (
              <img
                src={savedFacePhoto}
                alt="Foto identitas terdaftar"
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-4 text-slate-500">
                <Camera className="w-9 h-9 text-slate-400 mb-2" />
                <span className="text-[11px] font-semibold text-center leading-snug">
                  Belum ada foto identitas terdaftar
                </span>
              </div>
            )}
          </div>

          <Button
            type="button"
            variant={isFaceRegistered ? 'outline' : 'primary'}
            size="sm"
            onClick={handleOpenLiveScanOnProfile}
            className="text-xs font-bold cursor-pointer flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isFaceRegistered ? 'Foto Ulang via Halaman Live Scan' : 'Buka Halaman Live Scan Kamera'}</span>
          </Button>
        </div>

        {/* Example Reference Photo (Half Body + Neat Formal Shirt) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-emerald-200/80 p-4 flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
              <Check className="w-3 h-3 text-emerald-600" />
              Contoh Foto yang Benar
            </span>
            <img
              src="/img/contoh-foto-identitas-right.jpg"
              alt="Contoh foto identitas setengah badan memakai kemeja rapi"
              className="w-36 h-48 rounded-xl object-cover object-top border border-slate-200 shadow-2xs"
            />
          </div>

          <div className="space-y-2 text-left">
            <p className="text-xs font-bold text-slate-900">Ketentuan Pose &amp; Pakaian Resmi:</p>
            <ul className="space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Posisi setengah badan</strong> (kepala, bahu, hingga area dada terlihat penuh dan tegak).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Memakai <strong>kemeja atau pakaian berkerah yang rapi</strong> dan sopan.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Wajah menghadap lurus ke kamera dengan pencahayaan terang dan jelas.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Latar belakang ruangan asli tanpa Virtual Background, masker, atau kacamata hitam.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  // Hydrate saved biodata from server on mount so saved values always persist
  useEffect(() => {
    let cancelled = false;
    if (!getPortalToken()) return;
    fetchPortalMe()
      .then((freshUser) => {
        if (cancelled || !freshUser) return;
        if (freshUser.name && !isPlaceholderName(freshUser.name)) {
          setFullName(freshUser.name);
        }
        if (freshUser.phone !== undefined) setPhone(freshUser.phone || '');
        if (freshUser.nik !== undefined) setNik(freshUser.nik || '');
        if (freshUser.education !== undefined) setEducation(freshUser.education || '');
        if (freshUser.university !== undefined) setUniversity(freshUser.university || '');
        if (freshUser.city !== undefined) setCity(freshUser.city || '');
        if (freshUser.employeeNumber !== undefined) setEmployeeNumber(freshUser.employeeNumber || '');
        if (freshUser.department !== undefined) setDepartment(freshUser.department || '');
        if (freshUser.portfolioUrl !== undefined) setPortfolioUrl(freshUser.portfolioUrl || '');
        if (freshUser.bio !== undefined) setBio(freshUser.bio || '');
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Save profile updates
  const handleSaveBiodata = async (e: React.FormEvent) => {
    e.preventDefault();
    setBiodataError('');
    setSaveSuccess(false);

    const cleanPhone = phone.replace(/[\s-]/g, '');
    const phoneValid = /^(?:\+62|62|0)8[0-9]{8,12}$/.test(cleanPhone);
    const cleanNik = nik.replace(/\D/g, '');
    const nikValid = cleanNik.length === 16;

    const validationErrors: string[] = [];
    if (!fullName.trim() || isPlaceholderName(fullName)) {
      validationErrors.push('Nama Lengkap wajib diisi sesuai KTP');
    }
    if (!phone.trim()) {
      validationErrors.push('Nomor WhatsApp belum diisi');
    } else if (!phoneValid) {
      validationErrors.push('Nomor WhatsApp tidak valid (gunakan awalan 08 atau +628, 10-14 digit angka)');
    }
    if (!nik.trim()) {
      validationErrors.push('NIK belum diisi');
    } else if (!nikValid) {
      validationErrors.push(`NIK harus terdiri dari 16 digit angka (saat ini ${cleanNik.length} digit)`);
    }
    if (!education.trim()) validationErrors.push('Pendidikan terakhir belum diisi');
    if (!university.trim()) validationErrors.push('Universitas / Institusi belum diisi');
    if (!city.trim()) validationErrors.push('Kota Domisili belum diisi');

    if (validationErrors.length > 0) {
      const errText = `Periksa kembali data Anda: ${validationErrors.join(' • ')}.`;
      setBiodataError(errText);
      await Swal.fire({
        icon: 'warning',
        title: 'Data Diri Belum Lengkap',
        html: `
          <div class="text-left text-xs sm:text-sm text-slate-700 space-y-2 p-1">
            <p class="font-bold text-rose-700 mb-2">Mohon lengkapi seluruh kolom wajib berikut:</p>
            <ul class="list-disc pl-5 space-y-1 text-slate-600">
              ${validationErrors.map((err) => `<li>${err}</li>`).join('')}
            </ul>
          </div>
        `,
        confirmButtonText: 'Perbaiki Data',
        confirmButtonColor: '#0b192c',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-xl text-xs sm:text-sm font-bold px-5 py-2.5 cursor-pointer'
        }
      });
      return;
    }

    setIsSavingBiodata(true);
    const token = getPortalToken();
    try {
      let updatedUser: any = null;
      if (token) {
        const response = await axios.put('/api/portal/profile', {
          name: fullName.trim(),
          phone: cleanPhone,
          nik: cleanNik,
          education: education.trim(),
          university: university.trim(),
          city: city.trim(),
          employeeNumber: employeeNumber.trim() || null,
          department: department.trim() || null,
          portfolioUrl: portfolioUrl.trim() || null,
          bio: bio.trim() || null
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        updatedUser = response.data?.user;
      } else {
        // Fallback for demo or offline mode
        const current = getPortalUser() || ({} as any);
        updatedUser = {
          ...current,
          name: fullName.trim(),
          phone: cleanPhone,
          nik: cleanNik,
          education: education.trim(),
          university: university.trim(),
          city: city.trim(),
          employeeNumber,
          department,
          portfolioUrl,
          bio,
          profileCompleted: true
        };
      }

      if (updatedUser) {
        savePortalSession({ token: token || 'session-token', user: updatedUser });
      }

      setSaveSuccess(true);
      setBiodataError('');

      await Swal.fire({
        icon: 'success',
        title: 'Perubahan Berhasil Disimpan!',
        text: 'Data profil Anda telah berhasil diperbarui di basis data Right.',
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'rounded-2xl'
        }
      });

      if (updatedUser?.profileCompleted) {
        if (!updatedUser.faceVerifiedAt && !savedFacePhoto) {
          setTimeout(() => navigate('/peserta/live-scan'), 450);
        } else if (!updatedUser.deviceCheckCompletedAt) {
          setTimeout(() => navigate('/peserta/device-check'), 500);
        }
      }
    } catch (error) {
      const errorMsg = axios.isAxiosError(error)
        ? error.response?.data?.error || 'Gagal menyimpan profil ke server.'
        : 'Gagal menyimpan profil.';
      setBiodataError(errorMsg);
      await Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan Data',
        text: errorMsg,
        confirmButtonText: 'Tutup',
        confirmButtonColor: '#0b192c',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-xl text-xs sm:text-sm font-bold px-5 py-2.5 cursor-pointer'
        }
      });
    } finally {
      setIsSavingBiodata(false);
    }
  };

  // Handle password update
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    if (!currentPassword) {
      setPassError('Masukkan kata sandi saat ini.');
      return;
    }
    if (newPassword.length < 8) {
      setPassError('Kata sandi baru minimal harus 8 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    const token = getPortalToken();
    if (!token) {
      setPassError('Sesi Anda tidak ditemukan. Silakan masuk kembali.');
      return;
    }

    try {
      await axios.put('/api/portal/password', { currentPassword, newPassword }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPassSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(false), 3000);
    } catch (error) {
      setPassError(axios.isAxiosError(error) ? error.response?.data?.error || 'Gagal memperbarui kata sandi.' : 'Gagal memperbarui kata sandi.');
    }
  };

  return (
    <PesertaLayout activeTab="profile">
      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
        {/* ─── Top Banner Profile Header ─── */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-100/20 rounded-full -mr-20 -mt-20 pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Profile Avatar / Real Face Snapshot */}
              <div className="relative group">
                {savedFacePhoto ? (
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-sm relative">
                    <img
                      src={savedFacePhoto}
                      alt={fullName}
                      className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[9px] font-bold text-center py-0.5">
                      Identitas
                    </div>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-primary-navy text-white flex items-center justify-center font-heading font-black text-2xl shadow-sm">
                    {userInitials}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleOpenLiveScanOnProfile}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-primary-navy hover:shadow-xs transition-all cursor-pointer"
                  title="Ambil / Perbarui Foto Identitas Live Scan"
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
                    {getPortalUser()?.faceVerifiedAt ? 'Terverifikasi' : 'Belum Verifikasi'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-semibold">
                    {getPortalUser()?.candidateCode || initialData.id.slice(0, 8)}
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
                  Program: <span className="font-bold">{initialData.assessmentTitle || program.title}</span> •{' '}
                  <span className="text-slate-600">{initialData.gradeLevel}</span>
                </p>
              </div>
            </div>

            {/* Quick Action Badges */}
            <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
              {isCatCompleted ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/peserta/asesmen')}
                  className="text-xs gap-1.5 cursor-pointer bg-blue-600 hover:bg-blue-700"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Buka Wawancara di Asesmen Saya</span>
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/peserta/asesmen')}
                  className="text-xs gap-1.5 cursor-pointer"
                >
                  <span>Buka Asesmen Saya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              )}
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
                  Perubahan data diri berhasil disimpan ke basis data Right.
                </span>
              </div>
            )}

            {biodataError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-900 flex items-start gap-3 animate-fadeIn shadow-2xs">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block text-rose-950">Perhatian: Data Belum Lengkap / Sesuai</span>
                  <p className="leading-relaxed text-rose-800">{biodataError}</p>
                </div>
              </div>
            )}

            <div
              className={`rounded-xl border p-3.5 space-y-2 ${
                completedItemsCount === 7
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-rose-200 bg-rose-50/30'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Kelengkapan identitas &amp; foto resmi</span>
                <span
                  className={`font-mono font-bold flex items-center gap-1 ${
                    completedItemsCount === 7 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {completedItemsCount === 7 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  {completedItemsCount} / 7
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    completedItemsCount === 7 ? 'bg-emerald-600' : 'bg-rose-500'
                  }`}
                  style={{ width: `${(completedItemsCount / 7) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-600">
                Kolom bertanda <span className="text-rose-600 font-bold">*</span> wajib dilengkapi (merah = belum valid/kosong, hijau checklist = sudah lengkap).
              </p>
            </div>

            {renderLiveScanIdentityPanel()}

            {isAccessCodeUser && !getPortalUser()?.profileCompleted && (
              <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900 animate-fade-in shadow-2xs">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-amber-950 block text-xs sm:text-sm">Pemberitahuan Peserta Kode Program</span>
                  <p className="leading-relaxed text-amber-800">
                    Anda masuk menggunakan kode program asesmen. Mohon lengkapi data profil dan isi <strong>Nama Lengkap (Sesuai KTP)</strong> Anda untuk verifikasi identitas resmi seleksi dan penerbitan berkas hasil asesmen.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveBiodata} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Nama Lengkap */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Nama Lengkap (Sesuai KTP) <span className="text-rose-600">*</span>
                    </label>
                    {renderValidationStatus(isNameValid, 'Wajib diisi', 'Lengkap')}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      id="profile-fullname"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Masukkan nama lengkap resmi sesuai KTP Anda"
                      required
                      className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm font-medium outline-none transition-all placeholder:text-slate-400 ${fieldValidationBorderClass(isNameValid)}`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      {isNameValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </span>
                  </div>
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
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Nomor WhatsApp / Seluler <span className="text-rose-600">*</span>
                    </label>
                    {renderValidationStatus(
                      isPhoneValid,
                      cleanPhoneDigits.length > 0 ? 'Format 08 / +628 (10-14 digit)' : 'Wajib diisi',
                      `${cleanPhoneDigits.length} Digit`
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="tel"
                      id="profile-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      required
                      className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm font-medium outline-none transition-all font-mono ${fieldValidationBorderClass(isPhoneValid)}`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      {isPhoneValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </span>
                  </div>
                </div>

                {/* NIK / KTP */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Nomor Induk Kependudukan (NIK) <span className="text-rose-600">*</span>
                    </label>
                    {renderValidationStatus(
                      isNikValid,
                      cleanNikDigits.length > 0 ? `${cleanNikDigits.length} / 16 Digit` : 'Wajib 16 Digit',
                      '16 / 16 Digit'
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="profile-nik"
                      type={showNik ? 'text' : 'password'}
                      value={nik}
                      onChange={(e) => setNik(e.target.value)}
                      placeholder="16 digit angka NIK sesuai KTP"
                      maxLength={20}
                      required
                      className={`w-full pl-3.5 pr-16 py-2.5 rounded-xl border text-xs sm:text-sm font-medium outline-none transition-all font-mono tracking-wider ${fieldValidationBorderClass(isNikValid)}`}
                    />
                    <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2">
                      {isNikValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNik(!showNik)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      title={showNik ? 'Sembunyikan NIK' : 'Tampilkan NIK'}
                    >
                      {showNik ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Gunakan 16 digit angka resmi KTP untuk verifikasi seleksi dan penerbitan berkas LHA.
                  </p>
                </div>

                {/* Pendidikan Terakhir */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Jenjang &amp; Jurusan Pendidikan <span className="text-rose-600">*</span>
                    </label>
                    {renderValidationStatus(isEducationValid, 'Wajib diisi', 'Lengkap')}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      id="profile-education"
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      placeholder="Contoh: S1 Teknik Informatika"
                      required
                      className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm font-medium outline-none transition-all ${fieldValidationBorderClass(isEducationValid)}`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      {isEducationValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </span>
                  </div>
                </div>

                {/* Perguruan Tinggi */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Universitas / Institusi Asal <span className="text-rose-600">*</span>
                    </label>
                    {renderValidationStatus(isUniversityValid, 'Wajib diisi', 'Lengkap')}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      id="profile-university"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      placeholder="Contoh: Institut Teknologi Bandung"
                      required
                      className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm font-medium outline-none transition-all ${fieldValidationBorderClass(isUniversityValid)}`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      {isUniversityValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </span>
                  </div>
                </div>

                {/* Domisili */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Kota Domisili Saat Ini <span className="text-rose-600">*</span>
                    </label>
                    {renderValidationStatus(isCityValid, 'Wajib diisi', 'Lengkap')}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      id="profile-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Contoh: Jakarta Selatan"
                      required
                      className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm font-medium outline-none transition-all ${fieldValidationBorderClass(isCityValid)}`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      {isCityValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </span>
                  </div>
                </div>

                {/* Nomor Pegawai */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nomor Pegawai (opsional)
                  </label>
                  <input
                    type="text"
                    value={employeeNumber}
                    onChange={(e) => setEmployeeNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none bg-white transition-all font-mono"
                  />
                </div>

                {/* Departemen / Level */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Departemen / Level (opsional)
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none bg-white transition-all"
                  />
                </div>

                {/* Link Portofolio / GitHub */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tautan GitHub / LinkedIn (opsional)
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
                  Ringkasan Pengalaman Teknis / Bio Profesional (opsional)
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none bg-white transition-all leading-relaxed"
                />
              </div>

              <div className="pt-3 flex flex-col items-end gap-2.5">
                {biodataError && (
                  <p className="text-xs text-rose-600 font-bold flex items-center gap-1.5 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{biodataError}</span>
                  </p>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSavingBiodata}
                  className="px-6 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-xl cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {isSavingBiodata ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Perubahan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>
                        {!isFaceRegistered ? 'Simpan Biodata & Lanjut Live Scan' : 'Simpan Perubahan Data Diri'}
                      </span>
                    </>
                  )}
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
                    {program.category || 'Asesmen Kompetensi'}
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
                    CAT {program.questions?.length || 40} Soal
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
              <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                  onClick={() => navigate('/peserta/asesmen')}
                  className="text-xs font-bold cursor-pointer"
                >
                  Buka Wawancara di Asesmen Saya →
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
                  onClick={() => navigate('/peserta/asesmen')}
                  className="text-xs font-bold gap-2 cursor-pointer"
                >
                  <Laptop className="w-4 h-4" />
                  <span>Buka Menu Asesmen Saya</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: KEAMANAN & KATA SANDI ─── */}
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
