import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'biometrik' ? 'biometrik' : 'biodata';
  const [activeTab, setActiveTab] = useState<'biodata' | 'asesmen' | 'biometrik' | 'keamanan'>(initialTab);
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
  const [savedFacePhoto, setSavedFacePhoto] = useState<string | null>(localStorage.getItem('candidate_face_photo'));
  const faceVideoRef = useRef<HTMLVideoElement | null>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [faceCameraActive, setFaceCameraActive] = useState(false);
  const [faceCapturing, setFaceCapturing] = useState(false);
  const [faceError, setFaceError] = useState('');

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
    return localStorage.getItem('talenta_cat_completed') === 'true';
  }, []);

  const stopFaceCamera = () => {
    const stream = faceVideoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (faceVideoRef.current) faceVideoRef.current.srcObject = null;
    setFaceCameraActive(false);
  };

  const startFaceCamera = async () => {
    setFaceError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream;
        await faceVideoRef.current.play().catch(() => undefined);
      }
      setFaceCameraActive(true);
    } catch {
      setFaceError('Izin kamera ditolak. Aktifkan kamera untuk registrasi wajah.');
    }
  };

  const captureFacePhoto = async () => {
    if (!faceVideoRef.current || faceVideoRef.current.videoWidth === 0) {
      setFaceError('Kamera belum siap. Coba lagi.');
      return;
    }
    setFaceCapturing(true);
    setFaceError('');
    try {
      const canvas = faceCanvasRef.current || document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas tidak tersedia');
      context.drawImage(faceVideoRef.current, 0, 0, canvas.width, canvas.height);
      const photo = canvas.toDataURL('image/jpeg', 0.88);
      setSavedFacePhoto(photo);
      localStorage.setItem('candidate_face_photo', photo);
      const token = getPortalToken();
      if (token) {
        const response = await axios.post('/api/portal/device-check', { faceCaptured: true }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data?.user) {
          savePortalSession({ token, user: response.data.user });
          if (!response.data.user.profileCompleted) {
            setTimeout(() => setActiveTab('biodata'), 500);
          }
        }
      }
      stopFaceCamera();
    } catch (error) {
      setFaceError(axios.isAxiosError(error) ? error.response?.data?.error || 'Gagal menyimpan foto wajah.' : 'Gagal mengambil foto wajah.');
    } finally {
      setFaceCapturing(false);
    }
  };

  useEffect(() => () => stopFaceCamera(), []);

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
        if (!updatedUser.deviceCheckCompletedAt) {
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
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[9px] font-bold text-center py-0.5">
                      OpenCV AI
                    </div>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-primary-navy text-white flex items-center justify-center font-heading font-black text-2xl shadow-sm">
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

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Kelengkapan profil</span>
                <span className="font-mono font-bold text-primary-navy">
                  {[fullName, phone, nik, education, university, city].filter(Boolean).length} / 6
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-primary-navy rounded-full"
                  style={{ width: `${([fullName, phone, nik, education, university, city].filter(Boolean).length / 6) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                <span className="text-rose-600 font-bold">*</span> wajib diisi. Kolom bertanda (opsional) tidak menghalangi tahap berikutnya.
              </p>
            </div>

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
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nama Lengkap (Sesuai KTP) *
                  </label>
                  <input
                    type="text"
                    id="profile-fullname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Masukkan nama lengkap resmi sesuai KTP Anda"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none bg-white transition-all placeholder:text-slate-400"
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Nomor WhatsApp / Seluler *
                    </label>
                    <span className={`text-[11px] font-mono font-bold ${/^(?:\+62|62|0)8[0-9]{8,12}$/.test(phone.replace(/[\s-]/g, '')) ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {phone.replace(/[\s-]/g, '').length > 0 ? `${phone.replace(/[\s-]/g, '').length} Digit` : ''}
                    </span>
                  </div>
                  <input
                    type="tel"
                    id="profile-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none bg-white transition-all font-mono"
                  />
                </div>

                {/* NIK / KTP */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Nomor Induk Kependudukan (NIK) *
                    </label>
                    <span className={`text-[11px] font-mono font-bold ${nik.replace(/\D/g, '').length === 16 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {nik.replace(/\D/g, '').length} / 16 Digit
                    </span>
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none bg-white transition-all font-mono tracking-wider"
                    />
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
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Jenjang &amp; Jurusan Pendidikan *
                  </label>
                  <input
                    type="text"
                    id="profile-education"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none bg-white transition-all"
                  />
                </div>

                {/* Perguruan Tinggi */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Universitas / Institusi Asal *
                  </label>
                  <input
                    type="text"
                    id="profile-university"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none bg-white transition-all"
                  />
                </div>

                {/* Domisili */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kota Domisili Saat Ini *
                  </label>
                  <input
                    type="text"
                    id="profile-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 text-xs sm:text-sm font-medium outline-none bg-white transition-all"
                  />
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
                      <span>Simpan Perubahan Data Diri</span>
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
              {/* Face Registration Card */}
              <div className="md:col-span-1 p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col items-center text-center space-y-3">
                <span className="text-xs font-bold text-slate-700">Foto Referensi Wajah Ujian</span>
                <canvas ref={faceCanvasRef} className="hidden" />

                <div className="w-40 h-40 rounded-2xl overflow-hidden border-2 border-primary-navy bg-slate-900">
                  <video
                    ref={faceVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={faceCameraActive ? 'w-full h-full object-cover scale-x-[-1]' : 'hidden'}
                  />
                  {!faceCameraActive && (
                    savedFacePhoto ? (
                      <img src={savedFacePhoto} alt="Foto wajah terdaftar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-3 text-slate-500">
                        <Camera className="w-8 h-8 text-slate-400 mb-1" />
                        <span className="text-[11px] font-semibold text-center leading-tight">Belum ada foto terdaftar</span>
                      </div>
                    )
                  )}
                </div>

                {faceError && (
                  <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                    {faceError}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center gap-2">
                  {faceCameraActive ? (
                    <>
                      <Button variant="primary" size="sm" onClick={captureFacePhoto} disabled={faceCapturing} className="text-xs">
                        {faceCapturing ? 'Menyimpan...' : 'Ambil Foto'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={stopFaceCamera} className="text-xs">Batal</Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={startFaceCamera} className="text-xs">
                      <Camera className="w-3.5 h-3.5 mr-1.5" />
                      {savedFacePhoto ? 'Foto Ulang' : 'Aktifkan Kamera'}
                    </Button>
                  )}
                </div>

                <div className="space-y-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${savedFacePhoto || getPortalUser()?.faceVerifiedAt ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {savedFacePhoto || getPortalUser()?.faceVerifiedAt ? 'Wajah terdaftar' : 'Belum terverifikasi'}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Foto disimpan sebagai referensi verifikasi integritas saat ujian.
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
