import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, FileQuestion, WifiOff, ArrowLeft, Home, RefreshCw } from 'lucide-react';
import { Button } from '../ui';

export function Error403Page() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-error-red flex items-center justify-center mb-6 shadow-xs">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <span className="font-mono text-xs font-bold text-error-red uppercase tracking-wider bg-red-100 px-2.5 py-1 rounded-full mb-3">
        Error 403 • Akses Terbatas
      </span>
      <h1 className="text-3xl font-extrabold text-ink font-heading tracking-tight">
        Akses Tidak Diizinkan
      </h1>
      <p className="mt-3 text-sm text-muted-slate max-w-md">
        Anda tidak memiliki hak akses untuk membuka halaman ini. Silakan hubungi administrator platform atau login dengan role yang sesuai.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs">
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Button>
        <Button variant="primary" onClick={() => navigate('/')} className="flex items-center gap-2 text-xs">
          <Home className="w-4 h-4" />
          Halaman Utama
        </Button>
      </div>
    </div>
  );
}

export function Error404Page() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center mb-6 shadow-xs">
        <FileQuestion className="w-8 h-8 text-primary-navy" />
      </div>
      <span className="font-mono text-xs font-bold text-primary-navy uppercase tracking-wider bg-soft-blue px-2.5 py-1 rounded-full mb-3 border border-accent-border">
        Error 404 • Not Found
      </span>
      <h1 className="text-3xl font-extrabold text-ink font-heading tracking-tight">
        Halaman Tidak Ditemukan
      </h1>
      <p className="mt-3 text-sm text-muted-slate max-w-md">
        Halaman atau rute asesmen yang Anda tuju tidak tersedia atau telah dipindahkan.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs">
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Button>
        <Button variant="primary" onClick={() => navigate('/')} className="flex items-center gap-2 text-xs">
          <Home className="w-4 h-4" />
          Halaman Utama
        </Button>
      </div>
    </div>
  );
}

export function OfflinePage() {
  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-warning-amber flex items-center justify-center mb-6 shadow-xs">
        <WifiOff className="w-8 h-8" />
      </div>
      <span className="font-mono text-xs font-bold text-warning-amber uppercase tracking-wider bg-amber-100 px-2.5 py-1 rounded-full mb-3">
        Offline Status
      </span>
      <h1 className="text-3xl font-extrabold text-ink font-heading tracking-tight">
        Koneksi Internet Terputus
      </h1>
      <p className="mt-3 text-sm text-muted-slate max-w-md">
        Jawaban dan status sesi Anda tetap tersimpan di penyimpanan lokal browser. Mohon periksa jaringan internet Anda sebelum melanjutkan ujian.
      </p>
      <div className="mt-8">
        <Button variant="primary" onClick={() => window.location.reload()} className="flex items-center gap-2 text-xs">
          <RefreshCw className="w-4 h-4" />
          Muat Ulang Halaman
        </Button>
      </div>
    </div>
  );
}
