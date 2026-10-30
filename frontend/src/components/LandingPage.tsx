import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  Menu, X, ArrowRight, ChevronRight, Star, Quote,
  Users, Building2, Target, ShieldCheck, Cpu,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------ */
/*  Count-up hook                                                     */
/* ------------------------------------------------------------------ */
function useCountUp(end: number, duration: number, start: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      setCount(Math.round((1 - (1 - p) ** 3) * end));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, start]);
  return count;
}

/* ------------------------------------------------------------------ */
/*  Scroll-to util                                                    */
/* ------------------------------------------------------------------ */
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                         */
/* ------------------------------------------------------------------ */
function StatCard({
  icon: Icon, value, label, suffix, start,
}: {
  icon: React.FC<{ className?: string }>;
  value: number; label: string; suffix: string; start: boolean;
}) {
  const count = useCountUp(value, 2000, start);
  return (
    <div className="group text-center px-4 py-8 sm:py-10">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm mb-5 ring-1 ring-white/20 group-hover:ring-white/40 group-hover:scale-105 transition-all duration-500">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="text-4xl sm:text-5xl font-bold text-white font-heading tracking-tight">{count}{suffix}</div>
      <div className="mt-2 text-sm sm:text-base text-blue-200/80 font-medium">{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Marquee row                                                       */
/* ------------------------------------------------------------------ */
const marqueeItems = [
  'Wawancara Adaptif', 'Analisis CV Otomatis', 'Dashboard Real-time',
  'Skoring AI', 'Manajemen Lowongan', 'Rekrutmen Cerdas',
  'Wawancara Adaptif', 'Analisis CV Otomatis', 'Dashboard Real-time',
];

function Marquee() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const totalW = el.scrollWidth / 3;
      gsap.to(el, {
        x: -totalW,
        duration: 50,
        ease: 'none',
        repeat: -1,
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div className="relative overflow-hidden py-8 border-y border-slate-100 bg-white/60 backdrop-blur-sm">
      {/* Gradient fade edges */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
      <div ref={ref} className="flex gap-16 items-center w-max">
        {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, i) => (
          <span key={i} className="flex items-center gap-3 text-[11px] font-semibold text-slate-400 uppercase tracking-[0.25em] whitespace-nowrap select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#191970]/20" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feedback carousel                                                */
/* ------------------------------------------------------------------ */
const testimonials = [
  {
    name: 'Sari Dewi', role: 'HRD, PT Teknologi Maju',
    quote: 'Wawancara AI menghemat 70% waktu screening kami. Kualitas kandidat yang lolos justru lebih terukur.',
    accent: 'from-[#191970] to-[#2d2daa]',
  },
  {
    name: 'Andi Pratama', role: 'Talent Acquisition, StartupXYZ',
    quote: 'Integrasinya seamless. CV langsung teranalisis, skor kelayakan muncul otomatis di dashboard.',
    accent: 'from-[#191970] to-[#2d2daa]',
  },
  {
    name: 'Rina Kartika', role: 'People Ops, FinCorp',
    quote: 'Kami bisa merekrut 3x lebih cepat tanpa mengorbankan kualitas seleksi.',
    accent: 'from-[#191970] to-[#2d2daa]',
  },
];

function TestimonialGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
      {testimonials.map((t, i) => (
        <div
          key={i}
          className="group relative rounded-2xl bg-white/5 backdrop-blur-sm ring-1 ring-white/10 p-8 flex flex-col justify-between hover:ring-white/20 hover:bg-white/[0.08] transition-all duration-500"
        >
          {/* Accent gradient top edge */}
          <div className={`absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r ${t.accent} rounded-full opacity-40 group-hover:opacity-80 transition-opacity duration-500`} />
          <div>
            <Quote className="w-7 h-7 text-white/10 mb-4 group-hover:text-white/20 transition-colors duration-500" />
            <p className="text-base sm:text-[15px] text-blue-100/80 leading-relaxed font-medium">
              &ldquo;{t.quote}&rdquo;
            </p>
          </div>
          <div className="flex items-center gap-3 mt-8 pt-6 border-t border-white/10">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.accent} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>              {t.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-white/90">{t.name}</p>
              <p className="text-xs text-blue-200/50">{t.role}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const pinSectionRef = useRef<HTMLDivElement>(null);
  const pinTitleRef = useRef<HTMLDivElement>(null);
  const pinContentRef = useRef<HTMLDivElement>(null);
  const textRevealRef = useRef<HTMLParagraphElement>(null);
  const bentoRef = useRef<HTMLDivElement>(null);

  /* ---- scroll shadow ---- */
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  /* ---- close mobile menu on resize ---- */
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  /* ---- stats visibility ---- */
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStatsVisible(true); obs.disconnect(); } },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* ---- GSAP: Hero entrance ---- */
  useGSAP(() => {
    const el = heroRef.current;
    if (!el) return;
    gsap.from(el.querySelectorAll('.hero-anim'), {
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power3.out',
    });
  }, { scope: heroRef });

  /* ---- GSAP: Scroll pinning (pinned title + scrolling gallery) ---- */
  useGSAP(() => {
    const section = pinSectionRef.current;
    const title = pinTitleRef.current;
    const content = pinContentRef.current;
    if (!section || !title || !content) return;

    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${content.scrollHeight - window.innerHeight + 200}`,
      pin: title,
      invalidateOnRefresh: true,
    });
    ScrollTrigger.refresh();
  }, { dependencies: [] });

  /* ---- GSAP: Scrubbing text reveal ---- */
  useGSAP(() => {
    const el = textRevealRef.current;
    if (!el) return;
    const words = el.textContent?.split(' ') || [];
    el.innerHTML = '';
    const spans: HTMLSpanElement[] = [];
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.textContent = word + (i < words.length - 1 ? '\u00A0' : '');
      span.style.opacity = '0.1';
      span.style.transition = 'opacity 0.3s ease';
      el.appendChild(span);
      spans.push(span);
    });

    ScrollTrigger.create({
      trigger: el,
      start: 'top 80%',
      end: 'bottom 20%',
      scrub: 1.5,
      onUpdate: (self) => {
        spans.forEach((span, i) => {
          const delay = i / spans.length;
          const progress = Math.max(0, Math.min(1, (self.progress - delay * 0.6) / (1 - delay * 0.6)));
          span.style.opacity = String(Math.min(1, progress * 2));
        });
      },
    });
  }, { dependencies: [] });

  /* ---- GSAP: Bento card stagger with premium physics ---- */
  useGSAP(() => {
    const el = bentoRef.current;
    if (!el) return;
    gsap.from(el.querySelectorAll('.bento-card'), {
      y: 80,
      opacity: 0,
      scale: 0.95,
      duration: 0.9,
      stagger: 0.15,
      ease: 'back.out(1.2)',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
      },
    });
  }, { scope: bentoRef });

  /* ---- GSAP: Step images scale + fade on scroll (in and out) ---- */
  useGSAP(() => {
    const steps = pinContentRef.current?.querySelectorAll('.step-image');
    if (!steps) return;
    steps.forEach((img) => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: img,
          start: 'top 90%',
          end: 'bottom 10%',
          scrub: 1.2,
        },
      });
      tl.fromTo(img, { scale: 0.85, opacity: 0.2 }, { scale: 1, opacity: 1, ease: 'none', duration: 1 });
      tl.to(img, { scale: 1.05, opacity: 0.2, ease: 'none', duration: 1 });
    });
  }, { scope: pinContentRef });

  const navLinks = [
    { label: 'Platform', href: 'platform' },
    { label: 'Testimonial', href: 'testimonials' },
    { label: 'Mulai', href: 'cta' },
  ];

  return (
    <main id="main-content" className="overflow-x-hidden w-full max-w-full bg-white font-body text-[#191970]">
      {/* ================================================================ */}
      {/*  GLASS PILL NAV                                                  */}
      {/* ================================================================ */}
      <header
        className={`fixed top-4 inset-x-0 z-50 mx-auto w-max max-w-[95vw] transition-all duration-500 ${
          scrolled ? 'shadow-lg shadow-[#191970]/5 scale-100' : 'scale-100'
        }`}
      >
        <div className="flex items-center gap-6 sm:gap-10 px-5 sm:px-8 py-2.5 rounded-full bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 group flex-shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-[#191970] flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold font-heading text-[#191970] tracking-tight hidden sm:inline">
              AI Interviewer
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="text-xs font-semibold text-slate-500 hover:text-[#191970] transition-colors duration-200"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/login')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#191970] text-white text-xs font-bold hover:bg-[#14145a] btn-press transition-all duration-200"
            >
              <ShieldCheck className="w-3 h-3" />
              Login
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-1.5 rounded-full text-[#191970] hover:bg-slate-100 transition-colors"
              aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileOpen ? 'max-h-60 opacity-100 mt-2' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-lg px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => { setMobileOpen(false); scrollTo(link.href); }}
                className="block w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => { setMobileOpen(false); navigate('/admin/login'); }}
              className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#191970] text-white text-sm font-bold btn-press transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              Admin Login
            </button>
          </div>
        </div>
      </header>

      {/* ================================================================ */}
      {/*  H E R O  —  Ethereal Glass / Cinematic Center                  */}
      {/* ================================================================ */}
      <section ref={heroRef} className="relative min-h-[100dvh] flex items-center overflow-hidden bg-[#0a0a2e] pt-28 sm:pt-32">
        {/* Deep ambient mesh gradient — no external images */}
        <div className="absolute inset-0 z-0">
          {/* Primary glow orbs */}
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#4a4aff]/[0.08] blur-[150px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#6366f1]/[0.06] blur-[150px] pointer-events-none" />
          <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] rounded-full bg-[#818cf8]/[0.05] blur-[120px] pointer-events-none" />

          {/* Subtle grid texture */}
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
              backgroundSize: '80px 80px',
            }}
          />

          {/* Radial vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a2e]/80 pointer-events-none" />
        </div>

        {/* Centered content */}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-20 py-24 sm:py-32">
          <div className="text-center max-w-5xl mx-auto">
            {/* Eyebrow badge */}
            <div className="hero-anim inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-white/60 text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] mb-8 sm:mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Platform Rekrutmen Berbasis AI
            </div>

            {/* Hero heading — inline typography image embedded */}
            <h1 className="hero-anim text-[clamp(2.5rem,6vw,5.5rem)] font-extrabold font-heading text-white leading-[1.05] tracking-tight">
              Rekrutmen{' '}
              <span className="inline-block w-24 h-10 sm:w-32 sm:h-12 rounded-full align-middle bg-cover bg-center mx-1 -mt-1 sm:-mt-1 shadow-lg shadow-blue-500/15 mix-blend-luminosity" style={{ backgroundImage: 'url(https://picsum.photos/seed/aiinterview/400/200)', filter: 'brightness(0.95) contrast(1.05)' }}></span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-blue-100">
                Bertemu AI
              </span>
            </h1>

            {/* Subtitle */}
            <p className="hero-anim mt-6 sm:mt-8 text-base sm:text-lg text-blue-200/60 leading-relaxed max-w-2xl mx-auto font-medium">
              Platform rekrutmen pintar yang memadukan kecerdasan buatan dengan proses seleksi
              sumber daya manusia. Temukan kandidat terbaik lebih cepat dan lebih akurat.
            </p>

            {/* CTAs — button-in-button architecture */}
            <div className="hero-anim mt-10 sm:mt-12 flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center">
              <button
                onClick={() => navigate('/apply')}
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 sm:px-10 sm:py-4.5 rounded-full bg-white text-[#0a0a2e] text-sm sm:text-base font-bold hover:bg-blue-50 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-xl shadow-white/10 hover:shadow-2xl"
              >
                <span>Lamar Sekarang</span>
                <span className="w-8 h-8 rounded-full bg-[#0a0a2e]/5 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                  <ArrowRight className="w-4 h-4 text-[#0a0a2e]" />
                </span>
              </button>
              <button
                onClick={() => scrollTo('platform')}
                className="group inline-flex items-center justify-center gap-3 px-8 py-4 sm:px-10 sm:py-4.5 rounded-full border border-white/20 text-white/80 text-sm sm:text-base font-bold hover:bg-white/5 hover:text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
              >
                <span>Jelajahi Platform</span>
                <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                  <ChevronRight className="w-4 h-4 text-white/70" />
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom vignette */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0a0a2e] to-transparent pointer-events-none z-10" />
      </section>

      {/* ================================================================ */}
      {/*  MARQUEE — Trusted Partners                                      */}
      {/* ================================================================ */}
      <Marquee />

      {/* ================================================================ */}
      {/*  PLATFORM — Bento Grid (gapless, grid-flow-dense)                */}
      {/* ================================================================ */}
      <section id="platform" className="py-32 md:py-48 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-14">
          {/* Section heading — no meta-label */}
          <div className="max-w-3xl mb-16 md:mb-24">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-heading text-[#191970] tracking-tight leading-[1.1]">
              Satu platform untuk{' '}
              <span className="text-slate-600">seluruh siklus rekrutmen</span>
            </h2>
            <p ref={textRevealRef} className="mt-6 text-lg text-slate-500 leading-relaxed max-w-2xl">
              Dari pendaftaran hingga keputusan akhir, setiap tahap diperkuat oleh kecerdasan buatan
              yang bekerja di belakang layar. Hasilnya: proses yang lebih cepat, lebih adil, dan lebih
              terukur untuk semua pihak.
            </p>
          </div>

          {/* 5-card gapless bento grid */}
          <div ref={bentoRef} className="grid grid-cols-1 md:grid-cols-4 auto-rows-[200px] md:auto-rows-[240px] gap-4 md:gap-0 md:rounded-3xl md:overflow-hidden md:border md:border-slate-200 md:shadow-sm grid-flow-dense">
            {/* Card 1 — large hero card */}
            <div className="bento-card md:col-span-2 md:row-span-2 bg-[#191970] text-white p-8 sm:p-10 flex flex-col justify-end relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
              <div
                className="absolute inset-0 opacity-30 group-hover:scale-105 transition-transform duration-700 ease-out"
                style={{
                  backgroundImage: 'url(https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'grayscale(1) brightness(0.5)',
                }}
              />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 ring-1 ring-white/20">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold font-heading mb-2">Wawancara AI Adaptif</h3>
                <p className="text-sm sm:text-base text-blue-200/80 max-w-md leading-relaxed">
                  Sistem bertanya menyelidik secara real-time berdasarkan jawaban kandidat, menggali kompetensi lebih dalam dari wawancara manual.
                </p>
              </div>
            </div>

            {/* Card 2 — wide */}
            <div className="bento-card md:col-span-2 bg-white p-8 flex flex-col justify-center border border-slate-100 md:border-0 overflow-hidden group">
              <div className="w-10 h-10 rounded-xl bg-[#191970]/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-500">
                <Star className="w-5 h-5 text-[#191970]" />
              </div>
              <h3 className="text-lg font-bold font-heading text-[#191970] mb-1">Analisis CV Cerdas</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Ekstraksi dan pemetaan kompetensi otomatis dari dokumen CV dengan NLP.</p>
            </div>

            {/* Card 3 — small */}
            <div className="bento-card bg-white p-8 flex flex-col justify-center border border-slate-100 md:border-0 overflow-hidden group">
              <div className="w-10 h-10 rounded-xl bg-[#191970]/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-500">
                <Target className="w-5 h-5 text-[#191970]" />
              </div>
              <h3 className="text-lg font-bold font-heading text-[#191970] mb-1">Skoring Otomatis</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Penilaian objektif berbasis AI tanpa bias manusia.</p>
            </div>

            {/* Card 4 — small */}
            <div className="bento-card bg-white p-8 flex flex-col justify-center border border-slate-100 md:border-0 overflow-hidden group">
              <div className="w-10 h-10 rounded-xl bg-[#191970]/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-500">
                <Building2 className="w-5 h-5 text-[#191970]" />
              </div>
              <h3 className="text-lg font-bold font-heading text-[#191970] mb-1">Manajemen Lowongan</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Buat, atur, dan pantau semua posisi dari satu dashboard.</p>
            </div>

            {/* Card 5 — full width */}
            <div className="bento-card md:col-span-4 bg-white p-8 flex items-center gap-6 border border-slate-100 md:border-0 overflow-hidden group">
              <div className="w-12 h-12 rounded-xl bg-[#191970]/5 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                <Users className="w-6 h-6 text-[#191970]" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-heading text-[#191970] mb-1">Dashboard Analitik Real-time</h3>
                <p className="text-sm text-slate-500 leading-relaxed">Pantau pipeline rekrutmen, konversi kandidat, dan performa setiap lowongan dalam satu tampilan visual yang interaktif.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  SCROLL PINNING — GSAP pin: title left, content right            */}
      {/* ================================================================ */}
      <section id="how-it-works" ref={pinSectionRef} className="relative py-32 md:py-48 bg-white overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-14">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
            {/* Pinned title (GSAP handles scroll pinning) */}
            <div ref={pinTitleRef} className="lg:w-1/3">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-heading text-[#191970] tracking-tight leading-[1.1]">
                Tiga langkah{' '}
                <span className="text-slate-600">menuju talenta terbaik</span>
              </h2>
            </div>

            {/* Scrolling content */}
            <div ref={pinContentRef} className="lg:w-2/3 space-y-32 lg:space-y-48">
              {[
                {
                  number: '01', title: 'Daftar dan Lamar',
                  desc: 'Kandidat mengisi data diri, mengunggah CV, dan memilih posisi yang dilamar melalui formulir yang intuitif.',
                  img: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800&auto=format&fit=crop',
                },
                {
                  number: '02', title: 'Wawancara AI',
                  desc: 'Sistem AI melakukan wawancara adaptif secara otomatis. Pertanyaan berkembang berdasarkan respons kandidat untuk menggali potensi secara mendalam.',
                  img: 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?q=80&w=800&auto=format&fit=crop',
                },
                {
                  number: '03', title: 'Evaluasi dan Putusan',
                  desc: 'Tim HR menerima laporan lengkap: skor wawancara, analisis CV, dan rekomendasi kelayakan dalam satu dashboard komprehensif.',
                  img: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=800&auto=format&fit=crop',
                },
              ].map((step) => (
                <div key={step.number} className="group">
                  <div className="overflow-hidden rounded-2xl mb-6 shadow-sm">
                    <div
                      className="step-image w-full aspect-[16/10] bg-cover bg-center group-hover:scale-105 transition-transform duration-700 ease-out origin-center"
                      style={{
                        backgroundImage: `url(${step.img})`,
                        filter: 'grayscale(0.3) contrast(1.1) saturate(0.9)',
                      }}
                    />
                  </div>
                  <div className="flex items-start gap-4">
                    <span className="text-5xl sm:text-6xl font-extrabold font-heading text-[#191970]/10 leading-none">{step.number}</span>
                    <div className="pt-2">
                      <h3 className="text-xl sm:text-2xl font-bold font-heading text-[#191970] mb-2">{step.title}</h3>
                      <p className="text-sm sm:text-base text-slate-500 leading-relaxed max-w-lg">{step.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  STATS + TESTIMONIALS                                            */}
      {/* ================================================================ */}
      <section id="testimonials" className="py-32 md:py-48 bg-[#191970] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[60%] h-[50%] rounded-full bg-white/[0.04] blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-10 lg:px-14">
          {/* Stats */}
          <div ref={statsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-24">
            <div className="rounded-2xl bg-white/5 backdrop-blur-sm ring-1 ring-white/10">
              <StatCard icon={Users} value={1000} label="Pelamar Terdaftar" suffix="+" start={statsVisible} />
            </div>
            <div className="rounded-2xl bg-white/5 backdrop-blur-sm ring-1 ring-white/10">
              <StatCard icon={Target} value={98} label="Akurasi Seleksi" suffix="%" start={statsVisible} />
            </div>
            <div className="rounded-2xl bg-white/5 backdrop-blur-sm ring-1 ring-white/10">
              <StatCard icon={Building2} value={50} label="Perusahaan Aktif" suffix="+" start={statsVisible} />
            </div>
          </div>

          {/* Testimonial Grid — 3 stacked cards instead of generic carousel */}
          <TestimonialGrid />
        </div>
      </section>

      {/* ================================================================ */}
      {/*  CTA — Massive high-contrast                                     */}
      {/* ================================================================ */}
      <section id="cta" className="py-32 md:py-48 bg-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(25,25,112,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(25,25,112,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-[#191970]/[0.02] to-white pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-10 lg:px-14">
          <div className="relative rounded-3xl bg-[#191970] overflow-hidden shadow-2xl">
            <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />
            <div className="absolute top-[-30%] right-[-10%] w-[50%] h-[60%] bg-white/[0.06] rounded-full blur-[100px] pointer-events-none" />

            <div className="relative px-8 sm:px-16 lg:px-24 py-16 sm:py-20 lg:py-24 text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold font-heading text-white tracking-tight leading-tight">
                Siap merevolusi proses rekrutmen Anda?
              </h2>
              <p className="mt-4 sm:mt-5 text-base sm:text-lg text-blue-200/80 max-w-2xl mx-auto leading-relaxed">
                Bergabunglah dengan puluhan perusahaan yang telah menggunakan AI Interviewer
                untuk menemukan talenta terbaik secara efisien.
              </p>
              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <button
                  onClick={() => navigate('/apply')}
                  className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 sm:px-10 sm:py-4 rounded-xl bg-white text-[#191970] text-sm sm:text-base font-bold hover:bg-blue-50 btn-press transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Lamar Sekarang
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </button>
                <button
                  onClick={() => navigate('/admin/login')}
                  className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 sm:px-10 sm:py-4 rounded-xl border-2 border-white/30 text-white text-sm sm:text-base font-bold hover:bg-white/10 btn-press transition-all duration-200"
                >
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                  Masuk ke Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  FOOTER — Simplified hierarchy, focused on main paths            */}
      {/* ================================================================ */}
      <footer className="bg-[#0c0c3a] text-white relative overflow-hidden">
        {/* Subtle gradient divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[40%] rounded-full bg-[#191970]/10 blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-10 lg:px-14 py-16 sm:py-20">
          {/* Main grid — simplified to 3 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16">
            {/* Brand column */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/10">
                  <Cpu className="w-5 h-5 text-blue-200" />
                </div>
                <span className="text-lg font-bold font-heading text-white tracking-tight">AI Interviewer</span>
              </div>
              <p className="text-sm text-blue-200/50 leading-relaxed max-w-xs">
                Platform rekrutmen berbasis AI untuk membantu perusahaan menemukan talenta terbaik dengan cepat dan akurat.
              </p>
              {/* Social proof mini */}
              <div className="mt-6 flex items-center gap-2 text-xs text-blue-200/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>1.200+ pelamar aktif bulan ini</span>
              </div>
            </div>

            {/* Platform links */}
            <div>
              <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] mb-5">Platform</h4>
              <ul className="space-y-3.5">
                {[
                  { label: 'Wawancara AI', href: '#platform' },
                  { label: 'Analisis CV', href: '#platform' },
                  { label: 'Dashboard HR', href: '#platform' },
                  { label: 'Manajemen Lowongan', href: '#platform' },
                ].map((item) => (
                  <li key={item.label}>
                    <button
                      onClick={() => scrollTo(item.href.replace('#', ''))}
                      className="text-sm text-blue-200/60 hover:text-white transition-colors duration-200"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company + Legal combined column */}
            <div>
              <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] mb-5">Perusahaan</h4>
              <ul className="space-y-3.5">
                {['Tentang', 'Blog', 'Karir', 'Kontak'].map((item) => (
                  <li key={item}>
                    <span className="text-sm text-blue-200/60 hover:text-white transition-colors duration-200 cursor-pointer">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Legal</h4>
                <ul className="space-y-2.5">
                  {['Kebijakan Privasi', 'Syarat & Ketentuan'].map((item) => (
                    <li key={item}>
                      <span className="text-xs text-blue-200/40 hover:text-white/70 transition-colors duration-200 cursor-pointer">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom bar — minimal */}
          <div className="mt-16 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-blue-200/30">&copy; {new Date().getFullYear()} AI Interviewer. Hak cipta dilindungi.</p>
            <a href="mailto:admin@aiinterviewer.id" className="text-xs text-blue-200/30 hover:text-white/60 transition-colors duration-200">
              admin@aiinterviewer.id
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
