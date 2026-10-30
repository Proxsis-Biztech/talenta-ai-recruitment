import React, { useState, useEffect } from 'react';
import { useForm as useRHForm, useFieldArray as useRHFieldArray, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';
import { Upload, Plus, Trash2, AlertCircle, Briefcase, User, MapPin, Calendar, Phone, Mail, GraduationCap, Building2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';

const schema = yup.object().shape({
  fullName: yup.string().required('Nama wajib diisi'),
  placeOfBirth: yup.string().required('Tempat lahir wajib diisi'),
  dateOfBirth: yup.string().required('Tanggal lahir wajib diisi').test('age', 'Usia minimal 17 tahun', (value) => {
    if (!value) return false;
    const age = (new Date().getTime() - new Date(value).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return age >= 17;
  }),
  phone: yup.string().matches(/^[0-9]{10,13}$/, 'Nomor HP tidak valid (10-13 digit angka)').required('Nomor HP wajib diisi'),
  email: yup.string().email('Format email tidak valid').required('Email wajib diisi'),
  address: yup.string().required('Alamat wajib diisi'),
  gender: yup.string().oneOf(['Pria', 'Wanita']).required('Pilih jenis kelamin'),
  education: yup.string().oneOf(['SMA', 'D1', 'D2', 'D3', 'D4', 'S1']).required('Pilih pendidikan'),
  university: yup.string().required('Nama Universitas/kampus wajib diisi'),
  major: yup.string().required('Jurusan wajib diisi'),
  gpa: yup.number().typeError('IPK/Nilai harus berupa angka').min(0, 'Minimal 0').max(100, 'Maksimal 100').required('IPK/Nilai wajib diisi'),
  jobId: yup.string().required('Pilih lowongan pekerjaan yang dilamar'),
  experiences: yup.array().of(
    yup.object().shape({
      companyName: yup.string(),
      position: yup.string(),
      startDate: yup.string(),
      endDate: yup.string().nullable(),
      isCurrent: yup.boolean()
    })
  )
});

type ExperienceForm = {
  companyName?: string;
  position?: string;
  startDate?: string;
  endDate?: string | null;
  isCurrent?: boolean;
};

type ApplicantFormData = Record<string, unknown> & {
  experiences?: ExperienceForm[];
};

type FieldErrorMap = Record<string, unknown>;

export default function ApplicantForm() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get('/api/jobs');
        setJobs(response.data.data);
      } catch (err) {
        console.error('Gagal mengambil data lowongan:', err);
      }
    };
    fetchJobs();
  }, []);

  const { register, control, handleSubmit, reset, formState: { errors } } = useRHForm({
    resolver: yupResolver(schema),
    defaultValues: {
      experiences: [{ companyName: '', position: '', startDate: '', endDate: '', isCurrent: false }]
    }
  });

  const { fields, append, remove } = useRHFieldArray({
    control,
    name: 'experiences'
  });

  const watchedExperiences = useWatch({ control, name: 'experiences' }) as ExperienceForm[] | undefined;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setCvError('File harus berupa PDF');
        setCvFile(null);
        Swal.fire({
          icon: 'error',
          title: 'Gagal Upload!',
          text: 'File harus berupa PDF',
          confirmButtonColor: '#ea580c'
        });
      } else if (file.size > 5 * 1024 * 1024) {
        setCvError('Ukuran file maksimal 5MB');
        setCvFile(null);
        Swal.fire({
          icon: 'error',
          title: 'Gagal Upload!',
          text: 'Ukuran file maksimal 5MB',
          confirmButtonColor: '#ea580c'
        });
      } else {
        setCvError('');
        setCvFile(file);
      }
    }
  };

  const onSubmit = async (data: ApplicantFormData) => {
    if (!cvFile) {
      setCvError('CV wajib diunggah');
      Swal.fire({
        icon: 'error',
        title: 'Data Belum Lengkap',
        html: '<p class="mb-2">Mohon lengkapi data berikut sebelum mengirim:</p><ul class="text-left text-sm text-red-600 list-disc list-inside bg-red-50 p-3 rounded-lg"><li>CV wajib diunggah</li></ul>',
        confirmButtonColor: '#ea580c'
      });
      return;
    }

    setSubmitStatus('loading');
    setErrorMessage('');

    const formData = new FormData();
    const selectedJob = jobs.find(j => j.id === String(data.jobId));
    const appliedPosition = selectedJob ? selectedJob.title : 'General';
    formData.append('appliedPosition', appliedPosition);

    Object.keys(data).forEach(key => {
      if (key === 'experiences') {
        const validExperiences = (data[key] as ExperienceForm[]).filter((exp) => exp.companyName && exp.companyName.trim() !== '');
        formData.append('experiences', JSON.stringify(validExperiences));
      } else if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, String(data[key]));
      }
    });
    formData.append('cv', cvFile);

    try {
      await axios.post('/api/applicants', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSubmitStatus('idle');
      reset();
      setCvFile(null);
      window.scrollTo(0, 0);
      Swal.fire({
        icon: 'success',
        title: 'Lamaran Berhasil Dikirim!',
        text: 'Tim kami akan segera meninjau profil Anda.',
        confirmButtonColor: '#ea580c'
      });
    } catch (error) {
      setSubmitStatus('error');
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const message = axios.isAxiosError(error) ? error.response?.data?.error || 'Terjadi kesalahan pada server' : 'Terjadi kesalahan pada server';

      if (status === 403) {
        setErrorMessage('');
        Swal.fire({
          icon: 'warning',
          title: 'Lamaran Sudah Ditutup',
          text: 'Mohon maaf, pendaftaran sudah ditutup. Silakan pantau informasi rekrutmen selanjutnya.',
          confirmButtonColor: '#ea580c'
        });
      } else {
        setErrorMessage(message);
      }
    }
  };

  const onInvalid = (errors: FieldErrorMap) => {
    const getErrorMessages = (obj: FieldErrorMap): string[] => {
      let messages: string[] = [];
      for (const key in obj) {
        const value = obj[key];
        if (typeof value === 'object' && value !== null && 'message' in value && typeof value.message === 'string') {
          messages.push(value.message);
        } else if (typeof value === 'object' && value !== null) {
          messages = messages.concat(getErrorMessages(value as FieldErrorMap));
        }
      }
      return messages;
    };

    const errorMessages = getErrorMessages(errors);

    if (!cvFile) {
      errorMessages.push('CV wajib diunggah');
      setCvError('CV wajib diunggah');
    }

    if (errorMessages.length > 0) {
      const formattedErrors = errorMessages.map(msg => `<li>${msg}</li>`).join('');
      Swal.fire({
        icon: 'error',
        title: 'Data Belum Lengkap',
        html: `<p class="mb-2">Mohon lengkapi data berikut sebelum mengirim:</p><ul class="text-left text-sm text-red-600 list-disc list-inside bg-red-50 p-3 rounded-lg">${formattedErrors}</ul>`,
        confirmButtonColor: '#ea580c'
      });
    }
  };


  return (
    <div id="main-content" className="min-h-screen bg-page-bg font-body relative overflow-x-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-slate-900 rounded-b-[4rem] sm:rounded-b-[6rem] shadow-2xl transform -skew-y-2 origin-top-left -translate-y-10 z-0 pointer-events-none"></div>
      <div className="absolute top-20 right-10 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-40 left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Navbar */}
      <nav className="relative z-10 bg-slate-800/95 backdrop-blur-md border-b border-slate-700 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="bg-slate-700 p-2.5 rounded-xl group-hover:bg-slate-600 transition-colors shadow-sm border border-slate-600">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-wide font-heading">Kinesta Recruitment</span>
            </div>
            <div className="flex items-center space-x-2">
              <Link to="/interview/live" className="text-sm font-semibold text-slate-300 hover:text-white bg-orange-600 hover:bg-orange-500 px-4 py-2 rounded-lg transition-all border border-orange-500 flex items-center shadow-sm">
                AI Interview <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
              <Link to="/admin/login" className="text-sm font-semibold text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-all border border-slate-600 flex items-center shadow-sm">
                Login Admin <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-12 animate-slide-up">
          <div className="inline-flex items-center justify-center bg-white/20 backdrop-blur-md border border-white/30 p-4 rounded-2xl mb-6 shadow-lg">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-md font-heading">
            Wujudkan Karir Impianmu
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-sm">
            Satu langkah kecil menuju perjalanan karir yang luar biasa. Lengkapi data di bawah ini dengan akurat untuk bergabung bersama kami.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-8" noValidate>
          
          {submitStatus === 'error' && (
            <div className="bg-red-50/90 backdrop-blur-sm text-red-700 p-4 rounded-2xl flex items-center gap-3 border border-red-200 shadow-sm animate-slide-up">
              <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-500" />
              <p className="font-medium">{errorMessage}</p>
            </div>
          )}

          {/* Card: Data Pribadi */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-bl-full z-0"></div>
            
            <div className="flex items-center mb-8 border-b border-slate-100 pb-4 relative z-10">
              <div className="bg-slate-800 p-3 rounded-xl mr-4 text-white">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800 font-heading">Data Pribadi</h3>
                <p className="text-slate-500 text-sm mt-1">Informasi dasar sesuai identitas resmi Anda.</p>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nama Sesuai KTP <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    {...register('fullName')} 
                    required
                    placeholder="Contoh: Budi Santoso"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-slate-700 font-medium placeholder:text-slate-400 shadow-sm" 
                  />
                </div>
                <div className="flex justify-between mt-2">
                  {errors.fullName && <p className="text-red-500 text-xs font-bold">{errors.fullName.message as string}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Posisi / Lowongan yang Dilamar <span className="text-red-500">*</span></label>
                <select 
                  {...register('jobId')} 
                  required
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-slate-700 font-medium shadow-sm appearance-none cursor-pointer"
                >
                  <option value="">Pilih Lowongan yang Dilamar</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>{job.title}</option>
                  ))}
                </select>
                {errors.jobId && <p className="text-red-500 text-xs font-bold mt-2">{errors.jobId.message as string}</p>}
                {jobs.length === 0 && (
                  <p className="text-amber-600 text-xs mt-2 font-medium">⚠️ Saat ini belum ada lowongan pekerjaan spesifik yang ditambahkan oleh HRD.</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tempat Lahir <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                      {...register('placeOfBirth')} 
                      required
                      placeholder="Jakarta"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-slate-700 font-medium shadow-sm" 
                    />
                  </div>
                  {errors.placeOfBirth && <p className="text-red-500 text-xs font-bold mt-2">{errors.placeOfBirth.message as string}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tanggal Lahir <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                      type="date" 
                      {...register('dateOfBirth')} 
                      required
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-slate-700 font-medium shadow-sm" 
                    />
                  </div>
                  {errors.dateOfBirth && <p className="text-red-500 text-xs font-bold mt-2">{errors.dateOfBirth.message as string}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Jenis Kelamin <span className="text-red-500">*</span></label>
                  <select 
                    {...register('gender')} 
                    required
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-slate-700 font-medium shadow-sm appearance-none cursor-pointer"
                  >
                    <option value="">Pilih Jenis Kelamin</option>
                    <option value="Pria">Pria</option>
                    <option value="Wanita">Wanita</option>
                  </select>
                  {errors.gender && <p className="text-red-500 text-xs font-bold mt-2">{errors.gender.message as string}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">No HP/WA Aktif <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                      {...register('phone')} 
                      required
                      placeholder="08123456789" 
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-slate-700 font-medium shadow-sm" 
                    />
                  </div>
                  {errors.phone && <p className="text-red-500 text-xs font-bold mt-2">{errors.phone.message as string}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email Aktif <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    type="email" 
                    {...register('email')} 
                    required
                    placeholder="nama@email.com"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-slate-700 font-medium shadow-sm" 
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs font-bold mt-2">{errors.email.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Alamat Domisili <span className="text-red-500">*</span></label>
                <textarea 
                  {...register('address')} 
                  required
                  rows={3} 
                  placeholder="Tuliskan alamat lengkap saat ini..."
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-slate-700 font-medium shadow-sm resize-none" 
                />
                {errors.address && <p className="text-red-500 text-xs font-bold mt-2">{errors.address.message as string}</p>}
              </div>
            </div>
          </div>

          {/* Card: Pendidikan */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-bl-full z-0"></div>
            
            <div className="flex items-center mb-8 border-b border-slate-100 pb-4 relative z-10">
              <div className="bg-slate-800 p-3 rounded-xl mr-4 text-white">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800 font-heading">Pendidikan Terakhir</h3>
                <p className="text-slate-500 text-sm mt-1">Latar belakang edukasi tertinggi Anda.</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tingkat Pendidikan <span className="text-red-500">*</span></label>
                  <select 
                    {...register('education')} 
                    required
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-slate-700 font-medium shadow-sm appearance-none cursor-pointer"
                  >
                    <option value="">Pilih Tingkatan</option>
                    <option value="SMA">SMA/SMK Sederajat</option>
                    <option value="D1">D1</option>
                    <option value="D2">D2</option>
                    <option value="D3">D3</option>
                    <option value="D4">D4</option>
                    <option value="S1">S1</option>
                  </select>
                  {errors.education && <p className="text-red-500 text-xs font-bold mt-2">{errors.education.message as string}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nama Universitas/Sekolah <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                      {...register('university')} 
                      required
                      placeholder="Nama Universitas/Sekolah"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-slate-700 font-medium shadow-sm" 
                    />
                  </div>
                  {errors.university && <p className="text-red-500 text-xs font-bold mt-2">{errors.university.message as string}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Jurusan <span className="text-red-500">*</span></label>
                  <input 
                    {...register('major')} 
                    required
                    placeholder="Contoh: Teknik Informatika"
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-slate-700 font-medium shadow-sm" 
                  />
                  {errors.major && <p className="text-red-500 text-xs font-bold mt-2">{errors.major.message as string}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">IPK/Rata-Rata Nilai Rapor <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    step="0.01" 
                    {...register('gpa')} 
                    required
                    placeholder="Contoh: 3.85" 
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-slate-700 font-medium shadow-sm" 
                  />
                  {errors.gpa && <p className="text-red-500 text-xs font-bold mt-2">{errors.gpa.message as string}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Card: Pengalaman */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-bl-full z-0"></div>
            
            <div className="flex items-center mb-8 border-b border-slate-100 pb-4 relative z-10">
              <div className="bg-slate-800 p-3 rounded-xl mr-4 text-white">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800 font-heading">Pengalaman Kerja/Magang</h3>
                <p className="text-slate-500 text-sm mt-1">Rekam jejak karir dan pencapaian profesional Anda.</p>
              </div>
            </div>

            <div className="space-y-6">
              {fields.map((item, index) => {
                const isCurrent = watchedExperiences?.[index]?.isCurrent;
                return (
                  <div key={item.id} className="p-6 border border-slate-200 rounded-2xl bg-slate-50/50 relative hover:border-slate-400 transition-colors shadow-sm">
                    {fields.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => remove(index)} 
                        className="absolute top-4 right-4 bg-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-colors p-2 rounded-lg shadow-sm"
                        title="Hapus Pengalaman"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    
                    <h4 className="font-bold text-sm text-slate-800 mb-5 flex items-center uppercase tracking-wider">
                      <span className="bg-slate-300 text-slate-800 w-6 h-6 rounded-full inline-flex items-center justify-center mr-2">{index + 1}</span>
                      Posisi Kerja
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Nama Perusahaan</label>
                        <input 
                          {...register(`experiences.${index}.companyName`)} 
                          placeholder="PT Cahaya Abadi"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-slate-700 font-medium shadow-sm" 
                        />
                        {errors.experiences?.[index]?.companyName && <p className="text-red-500 text-xs font-bold mt-2">{errors.experiences[index]?.companyName?.message as string}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Posisi / Jabatan</label>
                        <input 
                          {...register(`experiences.${index}.position`)} 
                          placeholder="Senior Developer"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-slate-700 font-medium shadow-sm" 
                        />
                        {errors.experiences?.[index]?.position && <p className="text-red-500 text-xs font-bold mt-2">{errors.experiences[index]?.position?.message as string}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Bulan/Tahun Mulai</label>
                        <input 
                          type="month" 
                          {...register(`experiences.${index}.startDate`)} 
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-slate-700 font-medium shadow-sm" 
                        />
                        {errors.experiences?.[index]?.startDate && <p className="text-red-500 text-xs font-bold mt-2">{errors.experiences[index]?.startDate?.message as string}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Bulan/Tahun Selesai</label>
                        <input 
                          type="month" 
                          {...register(`experiences.${index}.endDate`)} 
                          disabled={isCurrent} 
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-slate-700 font-medium disabled:bg-slate-100 disabled:text-slate-400 shadow-sm" 
                        />
                        <div className="mt-3 flex items-center bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 w-max">
                          <input 
                            type="checkbox" 
                            {...register(`experiences.${index}.isCurrent`)} 
                            id={`current-${index}`} 
                            className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300" 
                          />
                          <label htmlFor={`current-${index}`} className="ml-2 text-sm font-semibold text-slate-800 cursor-pointer select-none">Masih bekerja di sini</label>
                        </div>
                        {errors.experiences?.[index]?.endDate && <p className="text-red-500 text-xs font-bold mt-2">{errors.experiences[index]?.endDate?.message as string}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <button 
                type="button" 
                onClick={() => append({ companyName: '', position: '', startDate: '', endDate: '', isCurrent: false })}
                className="inline-flex items-center justify-center w-full sm:w-auto text-sm font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors py-3 px-6 rounded-xl shadow-sm"
              >
                <Plus className="w-5 h-5 mr-2" /> Tambah Riwayat Pengalaman
              </button>
            </div>
          </div>

          {/* Card: Upload CV */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-bl-full z-0"></div>
            
            <div className="flex items-center mb-8 border-b border-slate-100 pb-4 relative z-10">
              <div className="bg-slate-800 p-3 rounded-xl mr-4 text-white">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800 font-heading">CV & Ijazah / Surat Keterangan Lulus <span className="text-red-500">*</span></h3>
                <p className="text-slate-500 text-sm mt-1">Unggah CV dan Ijazah terbaru Anda dalam 1 file PDF (Wajib).</p>
              </div>
            </div>
            
            <div className={`relative z-10 border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer ${cvFile ? 'border-orange-500 bg-orange-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}>
              <input 
                type="file" 
                accept=".pdf"
                required={!cvFile}
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center transition-colors ${cvFile ? 'bg-orange-200 text-orange-600' : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300 group-hover:text-slate-700'}`}>
                <Upload className="w-10 h-10" />
              </div>
              
              {cvFile ? (
                <div className="animate-slide-up">
                  <p className="text-slate-800 font-bold text-lg">{cvFile.name}</p>
                  <p className="text-orange-600 font-medium text-sm mt-1">Ukuran File: {(cvFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p className="text-slate-500 text-xs mt-4">Klik area ini jika ingin mengganti file.</p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-800 font-bold text-lg">Tarik & Lepas File CV Anda di Sini</p>
                  <p className="text-slate-500 font-medium mt-2">Atau klik untuk menelusuri file (Hanya PDF)</p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold mt-4">
                    Maksimal 5 MB
                  </div>
                </div>
              )}
            </div>
            {cvError && <p className="text-red-500 text-sm font-bold mt-3 text-center">{cvError}</p>}
          </div>

          {/* Submit Action */}
          <div className="pt-6 pb-12">
            <button 
              type="submit" 
              disabled={submitStatus === 'loading'}
              className="w-full relative overflow-hidden bg-orange-600 text-white font-extrabold text-lg py-5 px-8 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/40 hover:-translate-y-1 hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-300 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <div className="relative z-10 flex items-center justify-center">
                {submitStatus === 'loading' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    MENGIRIM LAMARAN...
                  </>
                ) : (
                  <>
                    KIRIM LAMARAN SEKARANG
                    <ChevronRight className="ml-2 w-6 h-6" />
                  </>
                )}
              </div>
            </button>
          </div>
          
        </form>
      </div>
    </div>
  );
}
