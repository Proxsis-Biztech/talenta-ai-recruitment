import React, { useState } from 'react';
import { Award, CheckCircle2, Cpu, ShieldCheck, Sparkles } from 'lucide-react';

/**
 * Interactive 3D CSS/SVG assessment showcase for the login page left panel.
 * Responds to pointer movement with smooth 3D perspective tilt and layered depth.
 */
export function LoginAssessment3D() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -py * 10, y: px * 12 });
  };

  const resetTilt = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      className="relative w-full h-full overflow-hidden rounded-[24px] bg-gradient-to-br from-[#071330] via-[#0F275C] to-[#163880] flex items-center justify-center select-none"
      style={{ perspective: '1200px' }}
    >
      {/* Ambient glowing mesh */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-[90px] animate-pulse" />
        <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-indigo-400/25 blur-[100px] animate-pulse" />
        {/* 3D perspective grid floor */}
        <div
          className="absolute inset-x-[-20%] bottom-[-15%] h-[55%] opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(148, 163, 184, 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.35) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            transform: 'rotateX(65deg)',
            transformOrigin: 'bottom center'
          }}
        />
      </div>

      {/* Interactive 3D Stage */}
      <div
        className="relative w-[84%] max-w-[390px] transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Rotating orbital ring behind centerpiece */}
        <svg
          viewBox="0 0 320 320"
          className="pointer-events-none absolute -inset-10 w-[calc(100%+5rem)] h-[calc(100%+5rem)] opacity-35 animate-[spin_28s_linear_infinite]"
          style={{ transform: 'translateZ(-20px)' }}
        >
          <circle
            cx="160"
            cy="160"
            r="142"
            fill="none"
            stroke="url(#orbitGrad)"
            strokeWidth="1.5"
            strokeDasharray="6 8"
          />
          <circle cx="160" cy="18" r="4" fill="#38BDF8" />
          <circle cx="298" cy="185" r="3.5" fill="#34D399" />
          <defs>
            <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
          </defs>
        </svg>

        {/* Back depth card */}
        <div
          className="hidden sm:block absolute inset-0 translate-x-4 translate-y-4 rounded-3xl border border-white/10 bg-white/[0.04]"
          style={{ transform: 'translateZ(-15px) translate(16px, 16px)' }}
        />

        {/* Main 3D Glassmorphic Assessment Card */}
        <div
          className="relative rounded-3xl border border-white/20 bg-white/[0.10] backdrop-blur-xl p-5 sm:p-6 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.65)] text-white space-y-4"
          style={{ transform: 'translateZ(35px)' }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-400/20 border border-cyan-300/30 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-cyan-300" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-200/80">
                  Competency Engine
                </p>
                <p className="text-xs sm:text-sm font-bold text-white leading-tight">
                  CAT &amp; AI Evaluation
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/30 text-[10px] font-mono font-bold text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE
            </span>
          </div>

          {/* Animated Competency Bars */}
          <div className="space-y-2.5 pt-1">
            {[
              { label: 'System Architecture', pct: 94, color: 'from-cyan-400 to-blue-400' },
              { label: 'Problem Solving & BARS', pct: 88, color: 'from-indigo-400 to-cyan-300' },
              { label: 'Integrity & Proctoring', pct: 100, color: 'from-emerald-400 to-teal-300' }
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-200 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {item.label}
                  </span>
                  <span className="font-mono font-bold text-white">{item.pct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-1000`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Mini 3D Footer inside card */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Adaptive Scoring Active
            </span>
            <span className="font-mono text-cyan-200 font-semibold">40 Soal • LHA</span>
          </div>
        </div>

        {/* Floating 3D Shield Badge (Top-Left) */}
        <div
          className="hidden sm:flex absolute -top-6 -left-6 items-center gap-2 rounded-2xl border border-emerald-300/30 bg-[#0B1D47]/90 backdrop-blur-md px-3.5 py-2 shadow-xl animate-[bounce_5s_ease-in-out_infinite]"
          style={{ transform: 'translateZ(75px)' }}
        >
          <div className="w-7 h-7 rounded-xl bg-emerald-400/20 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <p className="text-[9px] font-mono uppercase tracking-wider text-emerald-300/90">
              Verified Guard
            </p>
            <p className="text-[11px] font-bold text-white leading-tight">AI Proctoring</p>
          </div>
        </div>

        {/* Floating 3D Score Badge (Bottom-Right) */}
        <div
          className="hidden sm:flex absolute -bottom-5 -right-5 items-center gap-2.5 rounded-2xl border border-cyan-300/30 bg-[#0B1D47]/90 backdrop-blur-md px-3.5 py-2 shadow-xl animate-[bounce_6s_ease-in-out_infinite]"
          style={{ transform: 'translateZ(70px)' }}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-sm">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-mono uppercase tracking-wider text-cyan-200">
              Skor Komposit
            </p>
            <p className="text-xs font-extrabold font-mono text-white leading-tight">
              92.4 <span className="text-[10px] font-normal text-slate-300">/ 100</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Label Bar */}
      <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 flex items-center justify-between gap-2 rounded-2xl bg-white/90 backdrop-blur-md px-3.5 py-2 border border-white/70 shadow-xs">
        <span className="text-[11px] sm:text-xs font-bold text-[#0F275C] truncate">
          Portal Asesmen &amp; Seleksi Terpadu
        </span>
        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#0F275C] text-white shrink-0">
          CAT • AI
        </span>
      </div>
    </div>
  );
}
