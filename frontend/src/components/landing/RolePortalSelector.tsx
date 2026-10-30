import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Scale,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Eye,
  Sliders,
  FileText,
  Video,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Badge, Button } from '../ui';

const pipelineStages = [
  { label: 'Registrasi & Verifikasi Dokumen', meta: 'Selesai', state: 'done' },
  { label: 'Tes CAT Berbasis Komputer', meta: 'Selesai', state: 'done' },
  { label: 'AI Proctoring & Integrity Check', meta: 'Live', state: 'live' },
  { label: 'Live Interview Terstruktur', meta: 'Terjadwal', state: 'next' },
  { label: 'Skoring Rubrik & Rekomendasi', meta: 'Antrean', state: 'idle' }
];

export default function RolePortalSelector() {
  const navigate = useNavigate();

  const roles = [
    {
      id: 'peserta',
      index: '01',
      title: 'Portal Peserta',
      subtitle: 'Kandidat Asesmen & Ujian',
      badge: 'Candidate Hub',
      badgeVariant: 'info' as const,
      route: '/peserta',
      icon: GraduationCap,
      description:
        'Akses terpusat untuk mengikuti rangkaian asesmen terstandar, verifikasi kesiapan perangkat, ruang ujian AI proctoring, live interview interaktif, dan scorecard kompetensi.',
      features: [
        'Dashboard & Progres Tahapan Asesmen',
        'Interactive Device Check (Kamera, Mic, Jaringan)',
        'Exam Player dengan AI Proctoring & Anti-Cheat',
        'Waiting Room & Live Interview Interaktif',
        'Scorecard Kompetensi & Sertifikat Hasil'
      ],
      quickLinks: [
        { label: 'Device Check', path: '/peserta/device-check' },
        { label: 'Exam Player (40 Soal)', path: '/peserta/exam/demo' },
        { label: 'Hasil Scorecard', path: '/peserta/hasil' }
      ]
    },
    {
      id: 'asesor',
      index: '02',
      title: 'Portal Asesor',
      subtitle: 'Penguji & Penilai Independen',
      badge: 'Evaluation Console',
      badgeVariant: 'warning' as const,
      route: '/asesor',
      icon: Scale,
      description:
        'Konsol khusus dewan asesor untuk menguji kandidat dalam sesi live interview terstruktur, pengisian rubrik multi-kompetensi berbobot, validasi proctoring flag, dan rekomendasi hasil.',
      features: [
        'Jadwal & Antrean Interview Real-time',
        'Live Console Rubrik Penilaian Multi-Kompetensi',
        'Review Proctoring AI (Integrity Gauge & Snapshot)',
        'Form Rekomendasi Hasil (Lanjut / Dipertimbangkan)',
        'Rekap Nilai Program & Ekspor Matriks Nilai'
      ],
      quickLinks: [
        { label: 'Antrean Interview', path: '/asesor/interview-queue' },
        { label: 'Live Console', path: '/asesor/live-console/demo' },
        { label: 'Review Proctoring', path: '/asesor/proctoring' }
      ]
    },
    {
      id: 'admin',
      index: '03',
      title: 'Portal Admin',
      subtitle: 'Superadmin & Manajemen Platform',
      badge: 'Platform Control',
      badgeVariant: 'navy' as const,
      route: '/admin/dashboard',
      icon: ShieldCheck,
      description:
        'Pusat kendali komprehensif untuk pengelola program: Pipeline Builder tahapan asesmen, Bank Soal AI, Master Materi, pengelolaan kuota PT Mitra, dan audit trail.',
      features: [
        'Dashboard Eksekutif & Prioritas Tindakan',
        'Peserta & Import CSV Wizard 3 Langkah',
        'Program Builder Drag-List Pipeline 5 Tahap',
        'Bank Soal AI & Master Materi Multi-Level',
        'Timeline Vertikal Audit Trail Peserta'
      ],
      quickLinks: [
        { label: 'Dashboard Admin', path: '/admin/dashboard' },
        { label: 'Program Builder', path: '/admin/programs' },
        { label: 'Bank Soal AI', path: '/admin/bank-soal' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-page-bg text-ink flex flex-col font-sans">
      {/* ─── Top Brand Navbar ─── */}
      <header className="h-20 bg-white border-b border-border-slate px-6 lg:px-12 flex items-center justify-between shadow-2xs sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-navy flex items-center justify-center text-white font-bold text-xl shadow-2xs font-heading">
            T
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-extrabold text-xl text-ink tracking-tight">
                Talenta
              </span>
              <span className="font-heading font-extrabold text-xl text-blue-accent">
                +
              </span>
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider bg-soft-blue text-primary-navy px-2 py-0.5 rounded-full ml-1 border border-accent-border">
                Assessment Engine
              </span>
            </div>
            <p className="text-xs text-muted-slate -mt-0.5">
              Enterprise Talent Assessment & Evaluation System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 text-sm font-semibold text-primary-navy hover:bg-soft-blue rounded-lg transition-colors cursor-pointer"
          >
            Masuk Akun
          </button>
          <button
            onClick={() => navigate('/peserta/exam/demo')}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary-navy hover:bg-navy-dark rounded-lg shadow-2xs transition-all flex items-center gap-2 cursor-pointer btn-press"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            Coba Exam Player
          </button>
        </div>
      </header>

      {/* ─── Hero: asymmetric 7 / 5 with ruled canvas ─── */}
      <main className="flex-1 w-full">
        <div className="relative overflow-hidden border-b border-border-slate bg-white">
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.55]"
            style={{
              backgroundImage:
                'linear-gradient(#EEF2FF 1px, transparent 1px), linear-gradient(90deg, #EEF2FF 1px, transparent 1px)',
              backgroundSize: '44px 44px',
              maskImage: 'radial-gradient(ellipse 90% 80% at 30% 20%, #000 30%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 30% 20%, #000 30%, transparent 75%)'
            }}
          />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-12 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left 7 cols — editorial headline */}
            <div className="lg:col-span-7 animate-slide-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-soft-blue border border-accent-border text-primary-navy text-xs font-semibold mb-6">
                <Sparkles className="w-3.5 h-3.5 text-blue-accent" />
                Multi-Role Gateway Reviewer & Penguji
              </div>
              <h1 className="text-[2.35rem] sm:text-5xl lg:text-[3.4rem] font-extrabold text-ink font-heading leading-[1.08] tracking-[-0.03em]">
                Pilih portal sesuai{' '}
                <span className="text-primary-navy">peran Anda</span>, lanjutkan tanpa friksi.
              </h1>
              <p className="mt-6 text-base sm:text-lg text-muted-slate leading-relaxed max-w-xl">
                Talenta+ mengintegrasikan ekosistem evaluasi terpadu — peserta, asesor, dan
                administrator berbagi satu pipeline data yang sama, dari pendaftaran hingga
                rekomendasi akhir.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/peserta')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Mulai sebagai Peserta
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => navigate('/peserta/device-check')}
                >
                  Uji Coba Device Check
                </Button>
              </div>
              <p className="mt-6 text-xs text-muted-slate font-mono tracking-wide">
                ISO 27001 • Enkripsi SSL 256-bit • Anti-Cheat AI
              </p>
            </div>

            {/* Right 5 cols — pipeline console visual with overlap */}
            <div className="lg:col-span-5 relative animate-fade-in">
              <div className="bg-white rounded-2xl border border-border-slate shadow-tinted-lg p-6 sm:p-7">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-slate">
                      Pipeline Tahapan
                    </p>
                    <p className="text-sm font-bold text-ink mt-0.5">
                      Program TLN-SE-2026
                    </p>
                  </div>
                  <Badge variant="success" hasDot>
                    Live
                  </Badge>
                </div>
                <ol className="space-y-0">
                  {pipelineStages.map((stage, idx) => (
                    <li key={idx} className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
                      <span
                        className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                          stage.state === 'done'
                            ? 'bg-success-green'
                            : stage.state === 'live'
                            ? 'bg-blue-accent ring-4 ring-soft-blue'
                            : stage.state === 'next'
                            ? 'bg-warning-amber'
                            : 'bg-slate-300'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-[13px] leading-snug ${
                            stage.state === 'idle' ? 'text-muted-slate' : 'text-ink font-medium'
                          }`}
                        >
                          {stage.label}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-muted-slate bg-exam-bg px-1.5 py-0.5 rounded">
                        {stage.meta}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              {/* floating score chip — overlap for depth */}
              <div className="absolute -bottom-5 -left-4 sm:-left-8 bg-primary-navy text-white rounded-xl px-5 py-3.5 shadow-tinted-lg border border-navy-dark">
                <p className="text-[10px] font-mono uppercase tracking-wider text-blue-200">
                  Skor Kompetensi
                </p>
                <p className="text-2xl font-extrabold font-mono tabular-nums leading-tight">
                  87.4
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Role rows: numbered editorial bands (no equal 3-col grid) ─── */}
        <section className="max-w-7xl mx-auto w-full px-6 lg:px-12 py-14 lg:py-16">
          <div className="flex items-end justify-between gap-8 mb-10">
            <div className="max-w-xl">
              <p className="text-xs font-mono font-semibold uppercase tracking-wider text-blue-accent mb-2">
                Akses Cepat
              </p>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-ink font-heading tracking-tight leading-tight">
                Tiga portal, satu standar integritas yang sama
              </h2>
            </div>
            <p className="hidden md:block text-sm text-muted-slate max-w-xs leading-relaxed">
              Setiap peran memakai data pipeline yang sama sehingga hasil asesmen tidak perlu
              dikonversi ulang antar-tahap.
            </p>
          </div>

          <div className="space-y-6">
            {roles.map((role, roleIdx) => {
              const Icon = role.icon;
              return (
                <article
                  key={role.id}
                  className={`group bg-white rounded-2xl border border-border-slate hover:border-accent-border shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-tinted-lg transition-all duration-300 overflow-hidden cursor-pointer animate-slide-up ${
                    roleIdx % 2 === 1 ? 'lg:ml-10' : 'lg:mr-10'
                  }`}
                  style={{ animationDelay: `${roleIdx * 90}ms` }}
                  onClick={() => navigate(role.route)}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                    {/* Left 8 cols — identity + features */}
                    <div className="lg:col-span-8 p-7 sm:p-9 lg:border-r border-slate-100">
                      <div className="flex items-start gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-exam-bg text-primary-navy flex items-center justify-center shrink-0 group-hover:bg-soft-blue group-hover:text-blue-accent transition-colors">
                          <Icon className="w-7 h-7" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-mono text-xs font-bold text-muted-slate tabular-nums">
                              {role.index}
                            </span>
                            <h3 className="text-xl sm:text-2xl font-extrabold text-ink font-heading tracking-tight group-hover:text-primary-navy transition-colors">
                              {role.title}
                            </h3>
                            <Badge variant={role.badgeVariant}>{role.badge}</Badge>
                          </div>
                          <p className="text-xs font-semibold text-muted-slate uppercase tracking-wider mt-1">
                            {role.subtitle}
                          </p>
                          <p className="mt-3.5 text-sm text-slate-600 leading-relaxed max-w-2xl">
                            {role.description}
                          </p>
                        </div>
                      </div>

                      <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
                        {role.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-[13px] text-slate-600">
                            <CheckCircle2 className="w-4 h-4 text-success-green shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Right 4 cols — quick links + CTA pinned bottom */}
                    <div className="lg:col-span-4 p-7 sm:p-9 bg-exam-bg/60 flex flex-col">
                      <p className="text-[11px] font-bold text-muted-slate uppercase tracking-wider mb-3">
                        Akses Cepat Modul
                      </p>
                      <div className="space-y-2">
                        {role.quickLinks.map((ql, qIdx) => (
                          <button
                            key={qIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(ql.path);
                            }}
                            className="w-full text-xs font-medium px-3 py-2.5 rounded-lg bg-white hover:bg-soft-blue text-primary-navy border border-border-slate hover:border-accent-border transition-colors flex items-center justify-between gap-2 cursor-pointer"
                          >
                            {ql.label}
                            <ArrowRight className="w-3 h-3 opacity-60" />
                          </button>
                        ))}
                      </div>
                      <div className="mt-auto pt-7">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(role.route);
                          }}
                          className="w-full py-3 px-5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-2xs hover:shadow-tinted transition-all bg-primary-navy hover:bg-navy-dark cursor-pointer btn-press"
                        >
                          <span>Masuk ke {role.title}</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ─── Integrity banner: 7 / 5, not symmetric ─── */}
        <section className="max-w-7xl mx-auto w-full px-6 lg:px-12 pb-16">
          <div className="rounded-2xl border border-navy-dark bg-navy-dark text-white overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 lg:p-10">
              <div className="lg:col-span-7">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                    <ShieldCheck className="w-5.5 h-5.5 text-white" />
                  </div>
                  <h3 className="font-heading font-bold text-lg tracking-tight">
                    AI Proctoring & Anti-Cheat Standar Industri
                  </h3>
                </div>
                <p className="text-sm text-blue-100/90 leading-relaxed max-w-2xl">
                  Dilengkapi deteksi pindah tab (Page Visibility), pencegahan shortcut
                  (PrintScreen / Ctrl+P), kunci full-screen, pelarangan copy-paste, dan
                  pelacakan wajah OpenCV dengan telemetry pitch-yaw real-time.
                </p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {[Eye, Sliders, FileText, Video, Layers].map((Icon, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-blue-100 bg-white/8 border border-white/12 rounded-md px-2.5 py-1.5"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {['Face Detection', 'Full-Screen Lock', 'Print Block', 'Live Stream', 'Audit Trail'][i]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-5 flex flex-col justify-between gap-6 lg:border-l border-white/10 lg:pl-10">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-mono text-3xl font-extrabold tabular-nums">47.2K</p>
                    <p className="text-xs text-blue-200 mt-1 leading-snug">
                      Sesi ujian diawasi proctoring tahun ini
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-3xl font-extrabold tabular-nums">99.8%</p>
                    <p className="text-xs text-blue-200 mt-1 leading-snug">
                      Insiden kecurangan tertangkap otomatis
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => navigate('/peserta/device-check')}
                    className="px-4 py-2.5 rounded-lg border border-white/15 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Uji Coba Device Check
                  </button>
                  <button
                    onClick={() => navigate('/admin/dashboard')}
                    className="px-4 py-2.5 rounded-lg bg-white text-xs font-semibold text-navy-dark hover:bg-blue-50 transition-colors flex items-center gap-1.5 cursor-pointer btn-press"
                  >
                    Buka Admin Dashboard
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer with legal links ─── */}
      <footer className="border-t border-border-slate bg-white py-8 px-6 lg:px-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary-navy flex items-center justify-center text-white font-bold text-xs font-heading">
              T
            </div>
            <p className="text-xs text-muted-slate">
              © 2026 Talenta+ Assessment Platform. Seluruh hak cipta dilindungi.
            </p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
            <button onClick={() => navigate('/')} className="text-muted-slate hover:text-primary-navy transition-colors cursor-pointer">
              Beranda
            </button>
            <button onClick={() => navigate('/login')} className="text-muted-slate hover:text-primary-navy transition-colors cursor-pointer">
              Masuk
            </button>
            <button onClick={() => navigate('/register')} className="text-muted-slate hover:text-primary-navy transition-colors cursor-pointer">
              Pendaftaran
            </button>
            <span className="text-muted-slate/70">Kebijakan Privasi</span>
            <span className="text-muted-slate/70">Ketentuan Layanan</span>
            <span className="font-mono text-[11px] text-primary-navy font-semibold bg-soft-blue px-2 py-0.5 rounded border border-accent-border">
              v2.4.0-enterprise
            </span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
