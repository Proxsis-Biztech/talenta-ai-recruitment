import React, { useState } from 'react';
import { Award, ShieldCheck, Sparkles } from 'lucide-react';

const CUBE_FACES = [
  'border-cyan-300/40 bg-gradient-to-br from-cyan-400/30 to-blue-500/10',
  'border-blue-300/30 bg-gradient-to-br from-blue-500/25 to-indigo-600/10',
  'border-indigo-300/30 bg-gradient-to-br from-indigo-400/25 to-blue-600/10',
  'border-sky-300/25 bg-gradient-to-br from-sky-400/20 to-cyan-500/10',
  'border-cyan-200/40 bg-gradient-to-br from-cyan-300/35 to-sky-500/15',
  'border-blue-400/20 bg-gradient-to-br from-blue-600/20 to-slate-900/20'
];

function Cube({
  size,
  label,
  accent = '',
  spin = true,
  className = '',
  style
}: {
  size: number;
  label: string;
  accent?: string;
  spin?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const half = size / 2;
  const faces = [
    `translateZ(${half}px)`,
    `rotateY(180deg) translateZ(${half}px)`,
    `rotateY(90deg) translateZ(${half}px)`,
    `rotateY(-90deg) translateZ(${half}px)`,
    `rotateX(90deg) translateZ(${half}px)`,
    `rotateX(-90deg) translateZ(${half}px)`
  ];

  return (
    <div
      className={`${spin ? 'login-cube-spin' : ''} ${className}`}
      style={{ width: size, height: size, transformStyle: 'preserve-3d', ...style }}
    >
      {faces.map((transform, index) => (
        <div
          key={transform}
          className={`absolute inset-0 rounded-[14px] border backdrop-blur-[2px] shadow-[inset_0_0_24px_rgba(255,255,255,0.08)] flex items-center justify-center ${
            accent || CUBE_FACES[index]
          }`}
          style={{ transform, backfaceVisibility: 'hidden' }}
        >
          {index === 0 && (
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-white/85">
              {label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Animated 3D block scene for the login page left panel.
 * Pure CSS transforms: rotating cubes, orbiting ring, floating glass chips.
 */
export function LoginAssessment3D() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -py * 9, y: px * 11 });
  };

  const resetTilt = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      className="relative w-full h-full overflow-hidden rounded-[24px] bg-gradient-to-br from-[#050B1F] via-[#0B1B45] to-[#163A85] select-none"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-80 w-80 rounded-full bg-cyan-400/25 blur-[100px]" />
        <div className="absolute -bottom-28 -right-16 h-96 w-96 rounded-full bg-indigo-500/30 blur-[110px]" />
        <div className="absolute top-1/3 right-1/4 h-40 w-40 rounded-full bg-emerald-400/15 blur-[80px]" />
        <div
          className="absolute inset-x-[-25%] bottom-[-18%] h-[60%] opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(148,163,184,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.4) 1px, transparent 1px)',
            backgroundSize: '38px 38px',
            transform: 'rotateX(66deg)',
            transformOrigin: 'bottom center'
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #fff 0.6px, transparent 0.6px), radial-gradient(circle at 70% 60%, #fff 0.6px, transparent 0.6px)',
            backgroundSize: '90px 90px, 130px 130px'
          }}
        />
      </div>

      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ perspective: '1100px' }}
      >
        <div
          className="relative scale-[0.72] sm:scale-90 lg:scale-100 transition-transform duration-200 ease-out"
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transformStyle: 'preserve-3d'
          }}
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="login-pulse-ring h-72 w-72 rounded-full border border-cyan-300/20" />
          </div>
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="h-56 w-56 rounded-full border border-dashed border-cyan-200/25 login-orbit-ring">
              <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9]" />
              <span className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-emerald-300 shadow-[0_0_10px_#6ee7b7]" />
            </div>
          </div>

          <div className="login-float-soft" style={{ transformStyle: 'preserve-3d' }}>
            <Cube size={152} label="RIGHT" style={{ transform: 'translateZ(0px)' }} />
          </div>

          <div
            className="absolute -top-28 -left-28 login-float"
            style={{ transform: 'translateZ(90px)' }}
          >
            <Cube
              size={74}
              label="CAT"
              accent="border-amber-300/50 bg-gradient-to-br from-amber-300/40 to-orange-500/15"
            />
          </div>

          <div
            className="absolute -bottom-24 -right-24 login-float-soft"
            style={{ transform: 'translateZ(110px)', animationDelay: '-3s' }}
          >
            <Cube
              size={64}
              label="AI"
              accent="border-emerald-300/50 bg-gradient-to-br from-emerald-300/40 to-teal-500/15"
            />
          </div>

          <div
            className="absolute -top-16 -right-24 login-float"
            style={{ transform: 'translateZ(60px)', animationDelay: '-4.5s' }}
          >
            <Cube
              size={52}
              label="LHA"
              accent="border-violet-300/50 bg-gradient-to-br from-violet-300/40 to-indigo-500/15"
            />
          </div>

          <div className="hidden sm:flex absolute -bottom-10 -left-24 items-center gap-2 rounded-2xl border border-emerald-300/30 bg-[#08152F]/85 backdrop-blur-md px-3.5 py-2 shadow-xl login-float">
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

          <div className="hidden sm:flex absolute -top-10 left-16 items-center gap-2 rounded-2xl border border-amber-300/30 bg-[#08152F]/85 backdrop-blur-md px-3 py-1.5 shadow-xl login-float-soft">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-[10px] font-mono font-bold text-amber-100">Adaptive Scoring</span>
          </div>

          <div className="hidden sm:flex absolute bottom-16 -right-16 items-center gap-2.5 rounded-2xl border border-cyan-300/30 bg-[#08152F]/85 backdrop-blur-md px-3.5 py-2 shadow-xl login-float">
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
      </div>

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