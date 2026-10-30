import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KeyRound,
  User,
  Mail,
  Lock,
  Phone,
  Building,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Button } from '../ui';

export default function AuthRegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    programCode: '',
    institution: '',
    password: '',
    agreeConsent: false
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Route straight to participant dashboard with onboarding
      navigate('/peserta');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-page-bg flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center justify-center gap-3 cursor-pointer mb-6"
        >
          <div className="w-10 h-10 rounded-xl bg-primary-navy flex items-center justify-center text-white font-bold text-xl shadow-xs font-heading">
            T
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-heading font-extrabold text-xl text-ink tracking-tight">
                Talenta
              </span>
              <span className="font-heading font-extrabold text-xl text-blue-accent">
                +
              </span>
            </div>
            <p className="text-xs text-muted-slate">Assessment Platform</p>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-ink tracking-tight font-heading">
            Registrasi Peserta Asesmen
          </h2>
          <p className="mt-1 text-xs text-muted-slate">
            Daftarkan diri Anda menggunakan Kode Program resmi dari instansi penguji
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-sm border border-border-slate sm:rounded-2xl sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">
                Kode Program Asesmen (Wajib)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.programCode}
                  onChange={(e) => setFormData({ ...formData, programCode: e.target.value.toUpperCase() })}
                  placeholder="CONTOH: TLN-BUMN-2026"
                  className="w-full px-4 py-2.5 rounded-xl border border-accent-border bg-soft-blue/40 text-primary-navy font-mono font-bold tracking-wider focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/10 text-sm outline-none uppercase"
                />
              </div>
              <p className="text-[11px] text-muted-slate mt-1">
                Ketik kode token yang tercantum pada surat/email panggilan asesmen.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Sesuai KTP / Identitas"
                  className="w-full px-4 py-2.5 rounded-xl border border-border-slate focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/10 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="081234567890"
                  className="w-full px-4 py-2.5 rounded-xl border border-border-slate focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/10 text-sm outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">
                  Alamat Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email.aktif@domain.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-border-slate focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/10 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimal 8 karakter"
                  className="w-full px-4 py-2.5 rounded-xl border border-border-slate focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/10 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">
                Instansi / Perusahaan Tujuan
              </label>
              <input
                type="text"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                placeholder="Contoh: PT Telkom Indonesia (Opsional)"
                className="w-full px-4 py-2.5 rounded-xl border border-border-slate focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/10 text-sm outline-none"
              />
            </div>

            <div className="pt-2 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="agreeConsent"
                required
                checked={formData.agreeConsent}
                onChange={(e) => setFormData({ ...formData, agreeConsent: e.target.checked })}
                className="mt-1 w-4 h-4 rounded text-primary-navy border-slate-300 focus:ring-primary-navy"
              />
              <label htmlFor="agreeConsent" className="text-xs text-muted-slate leading-relaxed">
                Saya menyetujui Ketentuan Layanan, Kebijakan Privasi, dan Pakta Integritas Ujian Berbasis AI Proctoring Talenta+.
              </label>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Daftar & Lanjutkan ke Asesmen</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-muted-slate">
            Sudah memiliki akun terdaftar?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-bold text-primary-navy hover:underline cursor-pointer"
            >
              Masuk di sini
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
