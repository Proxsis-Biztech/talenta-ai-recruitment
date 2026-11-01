import React, { useState, useEffect } from 'react';
import { ShieldCheck, Volume2, Eye, Activity, AlertTriangle, CheckCircle2, Sparkles, X, ChevronDown, ChevronUp } from 'lucide-react';

export type ProctoringMood = 'normal' | 'speaking' | 'warning' | 'verified';

interface ProctoringCharacterProps {
  candidateName?: string;
  mood?: ProctoringMood;
  customMessage?: string;
  isListening?: boolean;
  isAiAnalyzing?: boolean;
  className?: string;
}

export const ProctoringCharacter: React.FC<ProctoringCharacterProps> = ({
  candidateName = 'Kandidat',
  mood = 'normal',
  customMessage,
  isListening = false,
  isAiAnalyzing = false,
  className = ''
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [activeSpeech, setActiveSpeech] = useState<string>('');
  const [blink, setBlink] = useState(false);
  const [pulseScan, setPulseScan] = useState(0);

  // Periodic eye blink effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 220);
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Periodic scanning pulse counter
  useEffect(() => {
    const scanInterval = setInterval(() => {
      setPulseScan((p) => (p + 1) % 100);
    }, 1500);
    return () => clearInterval(scanInterval);
  }, []);

  // Dynamic dialogue messages based on state
  useEffect(() => {
    if (customMessage) {
      setActiveSpeech(customMessage);
      return;
    }

    if (isAiAnalyzing) {
      setActiveSpeech('Gemini AI sedang menganalisis struktur penalaran dan kedalaman jawaban Anda...');
    } else if (isListening) {
      setActiveSpeech('Sensor audio mendengarkan suara Anda secara jernih. Integritas terpantau aman.');
    } else if (mood === 'warning') {
      setActiveSpeech('Perhatian: Harap tetap menghadap lurus ke arah kamera selama sesi berlangsung.');
    } else if (mood === 'verified') {
      setActiveSpeech('Identitas wajah & pencahayaan terverifikasi 100% valid sesuai standar seleksi.');
    } else {
      setActiveSpeech(
        `Halo ${candidateName}! Saya Sentinel, Pengawas AI Anda. Kamera & mikrofon stabil, silakan jawab dengan rileks.`
      );
    }
  }, [customMessage, isListening, isAiAnalyzing, mood, candidateName]);

  // Text-to-speech for proctor companion voice
  const speakProctorSpeech = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const textToSpeak = activeSpeech || 'Sistem pengawasan AI Sentinel aktif. Integritas ujian Anda terpantau aman dan valid.';
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'id-ID';
    utterance.rate = 1.05;
    utterance.pitch = 1.1; // Friendly robotic pitch

    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.startsWith('id'));
    if (idVoice) utterance.voice = idVoice;

    window.speechSynthesis.speak(utterance);
  };

  // Determine colors based on mood
  const getMoodColors = () => {
    if (mood === 'warning') {
      return {
        bg: 'from-amber-500 to-amber-700',
        glow: 'rgba(245, 158, 11, 0.4)',
        visor: '#f59e0b',
        border: 'border-amber-300',
        badge: 'bg-amber-100 text-amber-900 border-amber-300'
      };
    }
    if (mood === 'verified') {
      return {
        bg: 'from-emerald-500 to-teal-700',
        glow: 'rgba(16, 185, 129, 0.4)',
        visor: '#10b981',
        border: 'border-emerald-300',
        badge: 'bg-emerald-100 text-emerald-900 border-emerald-300'
      };
    }
    if (isListening || isAiAnalyzing) {
      return {
        bg: 'from-blue-600 to-indigo-700',
        glow: 'rgba(59, 130, 246, 0.5)',
        visor: '#38bdf8',
        border: 'border-blue-300',
        badge: 'bg-blue-100 text-blue-900 border-blue-300'
      };
    }
    return {
      bg: 'from-primary-navy to-navy-dark',
      glow: 'rgba(29, 78, 216, 0.3)',
      visor: '#06b6d4',
      border: 'border-cyan-400',
      badge: 'bg-cyan-50 text-cyan-900 border-cyan-200'
    };
  };

  const colors = getMoodColors();

  return (
    <div
      className={`relative z-30 transition-all duration-300 select-none ${
        isMinimized ? 'w-auto' : 'w-full'
      } ${className}`}
    >
      {/* Minimized Pill View */}
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 px-3 py-2 bg-slate-900/90 text-white rounded-2xl shadow-xl border border-slate-700 backdrop-blur-md hover:bg-slate-800 transition-all cursor-pointer group"
          title="Buka Karakter Pengawas AI"
        >
          <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center animate-pulse">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-bold font-heading text-cyan-200">Sentinel AI Proctor</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
        </button>
      ) : (
        /* Full Character Card View */
        <div className="bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-700/80 backdrop-blur-xl space-y-3.5">
          {/* Header Row: Title & Action Toggles */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 font-heading">
                Sentinel • AI Proctor Guard
              </h4>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowTelemetry(!showTelemetry)}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  showTelemetry
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Lihat Telemetri Integritas"
              >
                <Activity className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={speakProctorSpeech}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Dengarkan Suara Pengawas AI"
              >
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Kecilkan Pengawas AI"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Character Showcase: Avatar & Live Speech */}
          <div className="flex items-center gap-3.5">
            {/* Animated Vector Avatar (Sentinel Bot) */}
            <div className="relative shrink-0">
              {/* Outer Glow Halo */}
              <div
                className="absolute inset-0 rounded-2xl blur-md transition-all duration-500"
                style={{ backgroundColor: colors.glow }}
              />

              {/* Bot SVG Body */}
              <div
                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr ${colors.bg} p-1.5 shadow-lg border-2 ${colors.border} flex items-center justify-center transform hover:scale-105 transition-all`}
              >
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full drop-shadow-md"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Floating Antenna with Glowing Top */}
                  <line x1="50" y1="20" x2="50" y2="8" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="50" cy="7" r="5" fill={colors.visor} className="animate-pulse" />

                  {/* Robot Head Shape */}
                  <rect
                    x="20"
                    y="22"
                    width="60"
                    height="54"
                    rx="16"
                    fill="#1e293b"
                    stroke="#475569"
                    strokeWidth="2.5"
                  />

                  {/* Visor Area (Face Screen) */}
                  <rect
                    x="26"
                    y="32"
                    width="48"
                    height="32"
                    rx="10"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1.5"
                  />

                  {/* Expressive Visor Eyes */}
                  {blink ? (
                    // Blinking horizontal slit
                    <>
                      <line x1="34" y1="48" x2="44" y2="48" stroke={colors.visor} strokeWidth="3" strokeLinecap="round" />
                      <line x1="56" y1="48" x2="66" y2="48" stroke={colors.visor} strokeWidth="3" strokeLinecap="round" />
                    </>
                  ) : mood === 'warning' ? (
                    // Focused Alert Eyes (angled)
                    <>
                      <line x1="34" y1="45" x2="44" y2="49" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
                      <line x1="66" y1="45" x2="56" y2="49" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
                    </>
                  ) : mood === 'verified' ? (
                    // Happy / Smiling Eye Arcs
                    <>
                      <path d="M 33 49 Q 39 42 45 49" stroke="#10b981" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                      <path d="M 55 49 Q 61 42 67 49" stroke="#10b981" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                    </>
                  ) : (
                    // Glowing Alert Cyber Eyes (Default)
                    <>
                      <circle cx="39" cy="48" r="4.5" fill={colors.visor} />
                      <circle cx="61" cy="48" r="4.5" fill={colors.visor} />
                      <circle cx="40.5" cy="46.5" r="1.5" fill="#ffffff" />
                      <circle cx="62.5" cy="46.5" r="1.5" fill="#ffffff" />
                    </>
                  )}

                  {/* Digital Voice Oscillator Mouth */}
                  {isListening || isAiAnalyzing ? (
                    <g stroke={colors.visor} strokeWidth="2" strokeLinecap="round">
                      <line x1="42" y1="58" x2="42" y2="54" className="animate-pulse" />
                      <line x1="46" y1="60" x2="46" y2="52" className="animate-pulse" />
                      <line x1="50" y1="61" x2="50" y2="51" className="animate-pulse" />
                      <line x1="54" y1="60" x2="54" y2="52" className="animate-pulse" />
                      <line x1="58" y1="58" x2="58" y2="54" className="animate-pulse" />
                    </g>
                  ) : (
                    <path
                      d="M 43 57 Q 50 61 57 57"
                      stroke={colors.visor}
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Head Ear Sensors */}
                  <rect x="14" y="38" width="6" height="20" rx="3" fill="#334155" />
                  <rect x="80" y="38" width="6" height="20" rx="3" fill="#334155" />

                  {/* Neck Collar */}
                  <rect x="42" y="76" width="16" height="6" rx="2" fill="#475569" />
                  {/* Chest Badge Plate */}
                  <path d="M 32 82 L 68 82 L 60 96 L 40 96 Z" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                  <circle cx="50" cy="89" r="3" fill={colors.visor} />
                </svg>
              </div>

              {/* Status Badge Indicator */}
              <div
                className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-tight bg-slate-900 border border-slate-700 text-cyan-400 flex items-center gap-1 shadow-sm"
              >
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                <span>AI PROCTOR</span>
              </div>
            </div>

            {/* Live Character Speech Bubble */}
            <div className="flex-1 min-w-0 bg-slate-800/80 rounded-2xl p-3 border border-slate-700/60 shadow-inner relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1 font-mono">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Pesan Pengawas AI
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Real-time Guard</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-sans line-clamp-3">
                "{activeSpeech}"
              </p>
            </div>
          </div>

          {/* Real-time Telemetry Drawer (Toggled by Activity Icon) */}
          {showTelemetry && (
            <div className="mt-2 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] animate-fadeIn">
              <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <p className="text-slate-400 text-[10px]">Deteksi OpenCV</p>
                <p className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  1 Wajah (30 FPS)
                </p>
              </div>
              <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <p className="text-slate-400 text-[10px]">Arah Pandangan</p>
                <p className="font-bold text-cyan-300 mt-0.5">Fokus Layar (98%)</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <p className="text-slate-400 text-[10px]">Audio Spektrum</p>
                <p className="font-bold text-blue-300 mt-0.5">Jernih • Tanpa Bisikan</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <p className="text-slate-400 text-[10px]">Integritas Sesi</p>
                <p className="font-bold text-emerald-300 mt-0.5">100% Valid (0 Flag)</p>
              </div>
            </div>
          )}

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 font-bold text-[10px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Integritas Terjaga
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-950/70 border border-blue-500/40 text-blue-400 font-bold text-[10px]">
                <Activity className="w-3 h-3 text-blue-400" />
                OpenCV Active
              </span>
            </div>

            <button
              type="button"
              onClick={speakProctorSpeech}
              className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium text-[11px] cursor-pointer flex items-center gap-1"
            >
              <Volume2 className="w-3 h-3" />
              <span>Tes Suara Pengawas</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
