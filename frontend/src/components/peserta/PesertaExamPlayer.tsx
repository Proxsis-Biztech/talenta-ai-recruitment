import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Flag,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Maximize2,
  Minimize2,
  X,
  Camera,
  AlertCircle,
  Eye,
  Send,
  FileCheck2,
  Check,
  Volume2,
  FileText,
  Search,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Type,
  ListFilter,
  CheckSquare,
  SlidersHorizontal,
  Info,
  Building2,
  Video,
  Lock,
  RotateCcw,
  Award
} from 'lucide-react';
import { PesertaLayout } from './PesertaLayout';
import { ProctoringEngine, type ProctoringViolationEvent } from '../../utils/proctoringEngine';
import { Button, Badge, Modal, Card, CardContent } from '../ui';
import { getActiveSessionUser } from '../../services/userRegistryService';
import { getProgramById, DEFAULT_ASSESSMENT_PROGRAMS } from '../../services/assessmentCatalog';

// Mock 40 questions covering realistic IT & Engineering competencies for CAT mode
interface Question {
  id: number;
  type: 'single' | 'multi' | 'short' | 'essay' | 'matching';
  competency: string;
  difficulty: 'Mudah' | 'Sedang' | 'Sulit';
  text: string;
  codeSnippet?: string;
  options?: { key: string; label: string }[];
  matchingPairs?: { left: string; rightOptions: string[] }[];
}

const MOCK_QUESTIONS: Question[] = [
  {
    id: 1,
    type: 'single',
    competency: 'System Architecture',
    difficulty: 'Sedang',
    text: 'Manakah dari strategi caching berikut yang paling tepat diterapkan pada arsitektur microservices dengan intensitas baca tinggi (read-heavy) untuk mencegah fenomena "Cache Stampede"?',
    options: [
      { key: 'A', label: 'Cache-Aside dengan Randomized TTL (Jitter) dan Distributed Mutex Locking' },
      { key: 'B', label: 'Write-Through Cache dengan TTL statis yang seragam di seluruh node' },
      { key: 'C', label: 'Direct Database Bypassing tanpa mekanisme failover atau fallback' },
      { key: 'D', label: 'Write-Behind Caching tanpa antrean invalidation queue' }
    ]
  },
  {
    id: 2,
    type: 'multi',
    competency: 'Database Optimization',
    difficulty: 'Sulit',
    text: 'Pilihlah DUA kondisi di mana penggunaan Composite B-Tree Index pada PostgreSQL TIDAK akan dioptimalkan secara efektif oleh Query Planner:',
    options: [
      { key: 'A', label: 'Klausa WHERE tidak menyertakan kolom urutan pertama (leading column) dari indeks composite' },
      { key: 'B', label: 'Query memanggil fungsi transformasi kolom seperti LOWER(nama_kolom) tanpa functional index' },
      { key: 'C', label: 'Query melakukan operasi JOIN antar primary key yang telah di-cluster dengan baik' },
      { key: 'D', label: 'Tabel memiliki jumlah baris di atas 10 juta dengan jadwal autovacuum berkala' }
    ]
  },
  {
    id: 3,
    type: 'short',
    competency: 'Network Protocols',
    difficulty: 'Mudah',
    text: 'Sebutkan kode status HTTP standar (misal: 404, 500, 502) yang merepresentasikan bahwa server bertindak sebagai gateway atau proxy dan menerima respons tidak valid dari upstream server:',
    options: []
  },
  {
    id: 4,
    type: 'essay',
    competency: 'Reliability & DevOps',
    difficulty: 'Sulit',
    text: 'Jelaskan pendekatan arsitektural Anda dalam menerapkan pola "Circuit Breaker" dan "Graceful Degradation" saat downstream payment gateway pihak ketiga mengalami timeout atau latensi ekstrem secara tiba-tiba.',
    codeSnippet: `// Skenario Penanganan Error Downstream Gateway\ntry {\n  const paymentResponse = await paymentGatewayClient.chargeOrder({\n    orderId: "ORD-9921",\n    amount: 750000,\n    timeoutMs: 3000\n  });\n} catch (error) {\n  // Implementasikan mitigasi Circuit Breaker di sini\n}`
  },
  {
    id: 5,
    type: 'matching',
    competency: 'Data Structures & Algorithms',
    difficulty: 'Sedang',
    text: 'Jodohkan struktur data atau algoritma di kolom kiri dengan kompleksitas waktu rata-rata (Average Time Complexity) yang paling tepat di kolom kanan:',
    matchingPairs: [
      { left: 'Pencarian Hash Map (Ideal / Low Collision)', rightOptions: ['O(1)', 'O(log n)', 'O(n log n)', 'O(n²)'] },
      { left: 'Binary Search pada Array Terurut', rightOptions: ['O(1)', 'O(log n)', 'O(n log n)', 'O(n²)'] },
      { left: 'QuickSort (Average Case)', rightOptions: ['O(1)', 'O(log n)', 'O(n log n)', 'O(n²)'] },
      { left: 'Bubble Sort (Worst Case)', rightOptions: ['O(1)', 'O(log n)', 'O(n log n)', 'O(n²)'] }
    ]
  }
];

// Generate 40 questions total
const COMPETENCIES = [
  'Cloud Architecture & Microservices',
  'Software Design Patterns',
  'Database Engineering',
  'API Security & OAuth2',
  'Algorithms & Optimization',
  'DevOps & CI/CD Pipelines',
  'Clean Code & Refactoring'
];

for (let i = 6; i <= 40; i++) {
  const comp = COMPETENCIES[(i - 1) % COMPETENCIES.length];
  const qType: Question['type'] =
    i % 8 === 0 ? 'matching' : i % 7 === 0 ? 'essay' : i % 5 === 0 ? 'short' : i % 4 === 0 ? 'multi' : 'single';
  const diff: Question['difficulty'] = i % 3 === 0 ? 'Sulit' : i % 2 === 0 ? 'Sedang' : 'Mudah';

  MOCK_QUESTIONS.push({
    id: i,
    type: qType,
    competency: comp,
    difficulty: diff,
    text: `Butir Soal #${i}: Berdasarkan prinsip Clean Architecture dan Domain-Driven Design (DDD), bagaimana pemisahan tanggung jawab yang tepat antara Domain Entity, Domain Service, dan Application Use Case saat menangani validasi transaksi lintas agregat?`,
    options: [
      { key: 'A', label: 'Domain Service memegang aturan bisnis murni yang melibatkan banyak agregat, sedangkan Application Use Case mengorkestrasi alur interaksi dan persistensi.' },
      { key: 'B', label: 'Application Use Case langsung mengakses schema basis data tanpa melalui entitas domain untuk meminimalkan beban komputasi.' },
      { key: 'C', label: 'Semua validasi bisnis dipusatkan pada sisi controller HTTP agar lapisan core domain tetap murni statis.' },
      { key: 'D', label: 'Menggunakan trigger database relational untuk mengontrol validasi model dan aturan bisnis transaksi.' }
    ],
    matchingPairs: [
      { left: `Domain Entity #${i}`, rightOptions: ['Core Business Logic & Invariants', 'Data Persistence Layer', 'API Transport Layer'] },
      { left: `Repository Interface #${i}`, rightOptions: ['Core Business Logic & Invariants', 'Data Persistence Layer', 'API Transport Layer'] }
    ]
  });
}

export default function PesertaExamPlayer() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Retrieve active session user
  const activeUser = useMemo(() => getActiveSessionUser(), []);

  // Retrieve assigned assessment program (or from URL id)
  const activeProgram = useMemo(() => {
    const targetId = id && id !== 'demo' ? id : (activeUser.assessmentId || 'SE-402');
    return getProgramById(targetId) || DEFAULT_ASSESSMENT_PROGRAMS[0];
  }, [id, activeUser.assessmentId]);

  // Load 40 questions specific to this company, grade, and program
  const questions = useMemo(() => {
    return activeProgram.questions && activeProgram.questions.length > 0
      ? activeProgram.questions
      : MOCK_QUESTIONS;
  }, [activeProgram]);

  // Font Size Accessibility Setting: 'normal' (16px), 'large' (18px), 'xlarge' (20px)
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');

  // Exam timer: 90 minutes = 5400 seconds
  const [timeLeft, setTimeLeft] = useState(5340);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Active question index (0..39)
  const [currentIdx, setCurrentIdx] = useState(0);

  // Candidate answers dictionary: { [questionId]: answerValue }
  const [answers, setAnswers] = useState<Record<number, any>>({
    1: 'A',
    2: ['A', 'B'],
    3: '502'
  });

  // Doubt marker: { [questionId]: boolean }
  const [markedDoubt, setMarkedDoubt] = useState<Record<number, boolean>>({
    2: true
  });

  // Navigator filter: 'all' | 'unanswered' | 'doubt'
  const [navFilter, setNavFilter] = useState<'all' | 'unanswered' | 'doubt'>('all');
  const [showMobileNav, setShowMobileNav] = useState(false);

  // Auto-save feedback
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Tersimpan otomatis');

  // Check if candidate has already submitted this CAT exam prior to this session
  const [isExamLocked, setIsExamLocked] = useState<boolean>(() => {
    const specificSubmitted = localStorage.getItem(`talenta_cat_submitted_${activeProgram.id}`);
    const globalSubmitted = localStorage.getItem('talenta_cat_completed') === 'true';
    return Boolean(specificSubmitted || globalSubmitted);
  });

  const submissionData = useMemo(() => {
    const raw = localStorage.getItem(`talenta_cat_submitted_${activeProgram.id}`);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fallback
      }
    }
    return {
      submittedAt: localStorage.getItem('talenta_cat_submitted_at') || 'Hari ini, 13:56 WIB',
      totalAnswered: 40,
      totalQuestions: 40,
      score: 86.5,
      integrityScore: 100
    };
  }, [activeProgram.id]);

  // Modals & Proctoring
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [submitSuccessModalOpen, setSubmitSuccessModalOpen] = useState(false);
  const [violationAlertOpen, setViolationAlertOpen] = useState(false);
  const [latestViolation, setLatestViolation] = useState<ProctoringViolationEvent | null>(null);
  const [violations, setViolations] = useState<ProctoringViolationEvent[]>([]);

  // Live Helpdesk Chat
  const [liveChatOpen, setLiveChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'admin'; text: string; time: string }[]>([
    {
      sender: 'admin',
      text: `Halo ${activeUser.name}! Tim pengawas dan helpdesk ${activeProgram.companyName} siap membantu jika Anda mengalami kendala teknis. Semoga ujian berjalan lancar!`,
      time: '09:00'
    }
  ]);
  const [chatInput, setChatInput] = useState('');

  const proctoringRef = useRef<ProctoringEngine | null>(null);

  // Robust check if question is answered
  const isQuestionAnswered = (qId: number): boolean => {
    const ans = answers[qId];
    if (ans === undefined || ans === null || ans === '') return false;
    if (Array.isArray(ans)) return ans.length > 0;
    if (typeof ans === 'object') {
      return Object.values(ans).some((v) => v !== '' && v !== undefined && v !== null);
    }
    return true;
  };

  const totalQuestions = questions.length;
  const currentQ = questions[currentIdx] || questions[0];

  const answeredCount = useMemo(() => {
    return Array.from({ length: totalQuestions }).filter((_, i) => isQuestionAnswered(i + 1)).length;
  }, [answers, totalQuestions]);

  const doubtCount = useMemo(() => {
    return Object.values(markedDoubt).filter(Boolean).length;
  }, [markedDoubt]);

  const unansweredCount = totalQuestions - answeredCount;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  // Initialize Proctoring Engine (Tolerant & supportive for smooth experience)
  useEffect(() => {
    if (isExamLocked) return;

    const engine = new ProctoringEngine({
      preset: 'Sedang',
      maxViolations: 10,
      enforceFullscreen: false, // gentle for web sandbox review
      blockShortcuts: true,
      blockContextMenu: true,
      blockCopyPaste: true,
      detectFace: false,
      onViolation: (evt) => {
        setLatestViolation(evt);
        setViolations((prev) => [evt, ...prev]);
        setViolationAlertOpen(true);
      },
      onMaxViolationsReached: () => {
        alert('Pemberitahuan: Batas pengawasan tercapai. Jawaban Anda akan diserahkan secara aman ke panitia seleksi.');
        navigate('/peserta/hasil');
      }
    });

    engine.start();
    proctoringRef.current = engine;

    return () => {
      engine.stop();
    };
  }, [navigate, isExamLocked]);

  // Timer Countdown
  useEffect(() => {
    if (isExamLocked) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isExamLocked]);

  // Periodic Local Auto-Save
  useEffect(() => {
    if (isExamLocked) return;

    const saveTimer = setInterval(() => {
      try {
        localStorage.setItem(
          'peserta_cat_answers',
          JSON.stringify({
            answers,
            markedDoubt,
            savedAt: new Date().toISOString()
          })
        );
        setAutoSaveStatus(`Tersimpan aman • ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
      } catch (err) {
        console.warn('Auto-save error:', err);
      }
    }, 8000);
    return () => clearInterval(saveTimer);
  }, [answers, markedDoubt, isExamLocked]);

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = {
      sender: 'user' as const,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'admin',
          text: 'Pesan Anda telah diterima oleh Helpdesk Pengawas. Tetap tenang dan lanjutkan pengerjaan soal ujian.',
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1200);
  };

  const handleSubmitExam = () => {
    const timestamp =
      new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }) +
      ', ' +
      new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
      ' WIB';

    const submissionPayload = {
      submittedAt: timestamp,
      programId: activeProgram.id,
      programTitle: activeProgram.title,
      totalAnswered: answeredCount,
      totalQuestions: totalQuestions,
      score: 86.5,
      integrityScore: Math.max(70, 100 - violations.length * 5)
    };

    localStorage.setItem('talenta_cat_completed', 'true');
    localStorage.setItem('talenta_cat_submitted_at', timestamp);
    localStorage.setItem(`talenta_cat_submitted_${activeProgram.id}`, JSON.stringify(submissionPayload));
    localStorage.setItem(`talenta_cat_answers_${activeProgram.id}`, JSON.stringify(answers));

    setSummaryModalOpen(false);
    setSubmitSuccessModalOpen(true);
  };

  // Filtered navigator numbers
  const filteredIndices = Array.from({ length: totalQuestions }).map((_, i) => i).filter((idx) => {
    const qNum = idx + 1;
    const isAns = isQuestionAnswered(qNum);
    const isDoubt = !!markedDoubt[qNum];
    if (navFilter === 'unanswered') return !isAns;
    if (navFilter === 'doubt') return isDoubt;
    return true;
  });

  // Font size classes based on state
  const questionTextClass =
    fontSize === 'xlarge'
      ? 'text-xl sm:text-2xl leading-relaxed'
      : fontSize === 'large'
      ? 'text-lg sm:text-xl leading-relaxed'
      : 'text-base sm:text-lg leading-relaxed';

  const optionTextClass =
    fontSize === 'xlarge'
      ? 'text-base sm:text-lg'
      : fontSize === 'large'
      ? 'text-sm sm:text-base'
      : 'text-sm sm:text-base';

  // ─── LOCKED EXAM VIEW (If already submitted & locked) ───
  if (isExamLocked && !submitSuccessModalOpen) {
    return (
      <PesertaLayout activeTab="exam">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-7 antialiased">
          {/* Top Breadcrumb & Status Pill */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              onClick={() => navigate('/peserta/asesmen')}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-slate hover:text-ink transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali ke Daftar Asesmen Saya</span>
            </button>

            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto shadow-2xs">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Lembar Ujian Telah Dikunci &amp; Diarsipkan</span>
            </span>
          </div>

          {/* Main Hero Card: Submission Confirmed */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-primary-navy bg-soft-blue px-2.5 py-0.5 rounded-md border border-accent-border">
                      {activeProgram.id}
                    </span>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Sesi Ujian CAT Selesai
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-ink">
                    {activeProgram.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-slate flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>Instansi: <strong>{activeProgram.companyName}</strong></span>
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left md:text-right shrink-0">
                <span className="text-[11px] text-muted-slate block font-medium">Waktu Pengumpulan Ujian:</span>
                <span className="font-mono text-xs sm:text-sm font-bold text-slate-800">
                  {submissionData.submittedAt || 'Hari ini, 13:56 WIB'}
                </span>
                <span className="text-[10px] text-emerald-600 block mt-0.5 font-semibold">
                  Terenkripsi SHA-256 ✓
                </span>
              </div>
            </div>

            {/* Lock Notice Callout */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3 text-xs sm:text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-amber-950">
                <p className="font-bold">
                  Sesi Ujian Ini Sudah Tidak Dapat Dikerjakan Ulang
                </p>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Seluruh 40 butir jawaban CAT Anda telah disimpan secara permanen di basis data seleksi {activeProgram.companyName}. Untuk menjamin integritas dan kepatuhan pakta seleksi, akses pengisian soal telah ditutup dan dikunci.
                </p>
              </div>
            </div>

            {/* 4 Stat Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <span className="text-xs text-muted-slate block font-medium">Status Soal</span>
                <p className="font-mono text-base sm:text-lg font-bold text-primary-navy mt-1">
                  {submissionData.totalAnswered || 40} / {submissionData.totalQuestions || 40} Terjawab
                </p>
                <span className="text-[11px] text-emerald-600 font-semibold">100% Selesai</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <span className="text-xs text-muted-slate block font-medium">Estimasi Skor CAT</span>
                <p className="font-mono text-base sm:text-lg font-bold text-emerald-600 mt-1">
                  {submissionData.score || 86.5} / 100
                </p>
                <span className="text-[11px] text-slate-500">Passing Grade: {activeProgram.passingScore}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <span className="text-xs text-muted-slate block font-medium">Pengawasan (AI)</span>
                <p className="font-mono text-base sm:text-lg font-bold text-emerald-600 mt-1">
                  {submissionData.integrityScore || 100}% Bersih
                </p>
                <span className="text-[11px] text-slate-500">Tidak ada anomali</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <span className="text-xs text-muted-slate block font-medium">Tahap Berikutnya</span>
                <p className="font-mono text-xs sm:text-sm font-bold text-blue-700 mt-1">Wawancara Live</p>
                <span className="text-[11px] text-slate-500">Tahap 3 &amp; 4</span>
              </div>
            </div>

            {/* Next Stage Guide Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-200 space-y-3">
              <div className="flex items-center gap-2.5 text-primary-navy font-extrabold text-sm sm:text-base font-heading">
                <Video className="w-5 h-5 text-blue-600" />
                <span>Tahap Berikutnya: Masuk ke Ruang Tunggu Wawancara (Waiting Room)</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Jawaban dan penalaran studi kasus yang Anda pilih saat ujian CAT telah diteruskan kepada <strong>Lead Assessor (Dr. Ir. Dwi Hartanto / Gemini AI Live)</strong>. Pada sesi wawancara, Asesor akan mendalami alasan pengambilan keputusan Anda dan menguji kompetensi perilaku kerja (BARS).
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => navigate('/peserta/waiting-room')}
                  className="text-xs sm:text-sm py-2.5 px-6 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Video className="w-4 h-4" />
                  <span>Masuk Ruang Tunggu Wawancara Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/peserta/hasil')}
                  className="text-xs sm:text-sm py-2.5 px-4 rounded-xl cursor-pointer bg-white"
                >
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Lihat Rekap Nilai CAT</span>
                </Button>
              </div>
            </div>

            {/* Read-Only Answer Review Section */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-bold text-sm sm:text-base text-ink">
                    Arsip Lembar Jawaban Anda (Read-Only)
                  </h3>
                  <p className="text-xs text-muted-slate mt-0.5">
                    Tinjauan arsip butir soal yang telah tersimpan di server. Jawaban tidak dapat diubah kembali.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                  Terkunci
                </span>
              </div>

              <div className="space-y-3">
                {questions.slice(0, 3).map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Soal #{idx + 1}: {q.competency}</span>
                      <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Status: Terjawab &amp; Terkunci
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs">{q.text}</p>
                    <div className="pt-1 text-xs text-slate-500 font-mono">
                      Jawaban Anda: <strong className="text-primary-navy">Tersimpan di Server (Enkripsi SHA-256)</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Demo Testing Utility: Reset Exam Button */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-slate">
              <div className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-slate-400" />
                <span>Mode Pengujian &amp; Evaluasi Sistem</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Apakah Anda ingin mereset status ujian CAT ini untuk mencoba simulasi pengerjaan ulang soal dari awal?')) {
                    localStorage.removeItem('talenta_cat_completed');
                    localStorage.removeItem('talenta_cat_submitted_at');
                    localStorage.removeItem(`talenta_cat_submitted_${activeProgram.id}`);
                    localStorage.removeItem(`talenta_cat_answers_${activeProgram.id}`);
                    localStorage.removeItem('peserta_cat_answers');
                    setIsExamLocked(false);
                    window.location.reload();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-red-700 hover:border-red-300 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
                title="Reset sesi ujian untuk pengujian ulang dari awal"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Status Ujian (Mode Pengujian)</span>
              </button>
            </div>
          </div>
        </div>
      </PesertaLayout>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans select-none antialiased">
      {/* ─── Topbar / Header (Calm, Professional, User-Friendly) ─── */}
      <header className="h-18 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        {/* Left: Program Info & Candidate Name */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-navy to-blue-accent text-white font-heading font-extrabold flex items-center justify-center text-sm shadow-sm shrink-0">
            CAT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-bold text-sm sm:text-base text-ink truncate max-w-xs sm:max-w-md">
                {activeProgram.title}
              </h1>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                {activeProgram.gradeLevel.split(' ')[0]}
              </span>
            </div>
            <p className="text-xs text-muted-slate flex items-center gap-2">
              <span className="font-medium text-slate-800">{activeUser.name}</span>
              <span>•</span>
              <span className="text-primary-navy font-semibold">{activeProgram.companyName}</span>
              <span>•</span>
              <span className="font-mono text-xs text-slate-400">ID: {activeUser.id}</span>
            </p>
          </div>
        </div>

        {/* Center: Reassuring Telemetry (Auto-save + Countdown Timer) */}
        <div className="flex items-center gap-3">
          {/* Auto-Save Status Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{autoSaveStatus}</span>
          </div>

          {/* Sticky Countdown Timer */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm sm:text-base font-bold border shadow-xs transition-colors ${
              timeLeft < 600
                ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                : 'bg-blue-50/80 text-primary-navy border-blue-200/80'
            }`}
          >
            <Clock className="w-4 h-4 text-blue-accent" />
            <span>{formatTimer(timeLeft)}</span>
          </div>
        </div>

        {/* Right Controls: Font Zoomer, Helpdesk, Fullscreen, Submit */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Text Size Adjuster (A- / A / A+) for User Eye Comfort */}
          <div className="hidden sm:flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setFontSize('normal')}
              title="Ukuran Teks Normal"
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                fontSize === 'normal' ? 'bg-white text-primary-navy shadow-xs font-bold' : 'text-slate-600 hover:text-ink'
              }`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize('large')}
              title="Ukuran Teks Besar"
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                fontSize === 'large' ? 'bg-white text-primary-navy shadow-xs font-bold' : 'text-slate-600 hover:text-ink'
              }`}
            >
              A+
            </button>
            <button
              onClick={() => setFontSize('xlarge')}
              title="Ukuran Teks Sangat Besar"
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                fontSize === 'xlarge' ? 'bg-white text-primary-navy shadow-xs font-bold' : 'text-slate-600 hover:text-ink'
              }`}
            >
              A++
            </button>
          </div>

          {/* Live Helpdesk Chat Pill */}
          <button
            onClick={() => setLiveChatOpen(!liveChatOpen)}
            className="p-2 text-slate-600 hover:text-primary-navy hover:bg-slate-100 rounded-xl transition-colors relative cursor-pointer"
            title="Bantuan Pengawas / Helpdesk"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-accent rounded-full animate-pulse" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-600 hover:text-primary-navy hover:bg-slate-100 rounded-xl transition-colors hidden sm:block cursor-pointer"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Mobile Navigator Drawer Toggle */}
          <button
            onClick={() => setShowMobileNav(!showMobileNav)}
            className="lg:hidden p-2 text-primary-navy bg-blue-50 rounded-xl border border-blue-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ListFilter className="w-4 h-4" />
            <span>Soal ({answeredCount}/40)</span>
          </button>

          {/* Primary Submit Button */}
          <Button
            variant="primary"
            onClick={() => setSummaryModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm px-4 py-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            <span>Kumpulkan</span>
          </Button>
        </div>
      </header>

      {/* ─── Gentle Progress Bar & Guidance Sub-Header ─── */}
      <div className="bg-white border-b border-slate-200/60 px-4 sm:px-8 py-2.5 flex items-center justify-between text-xs text-muted-slate">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-ink">
            Progres: <strong className="text-primary-navy font-bold">{answeredCount}</strong> dari {totalQuestions} Soal Terjawab ({progressPercent}%)
          </span>
          {doubtCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
              <Flag className="w-3 h-3 text-amber-600" />
              {doubtCount} Ragu-ragu
            </span>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <div className="w-48 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
            <div
              className="bg-primary-navy h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="font-mono text-xs font-bold text-slate-600">{progressPercent}%</span>
        </div>
      </div>

      {/* ─── Main Content Container (Question Area + Navigator Sidebar) ─── */}
      <div className="flex-1 flex overflow-hidden" style={{ minHeight: 'calc(100vh - 7rem)' }}>
        {/* ◄ SISI KIRI: LEMBAR PERTANYAAN (Scrollable, Spacious, Comfortable) ► */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 flex flex-col items-center">
          <div className="w-full max-w-3xl space-y-6">
            {/* Top Question Metadata Card */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm font-extrabold text-white bg-primary-navy px-3 py-1 rounded-xl shadow-xs">
                  SOAL #{currentQ.id}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ 40 Butir</span>
                <Badge variant="navy" className="text-xs font-semibold">
                  {currentQ.competency}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-slate">Tingkat Kesulitan:</span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                    currentQ.difficulty === 'Sulit'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : currentQ.difficulty === 'Sedang'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {currentQ.difficulty}
                </span>
              </div>
            </div>

            {/* Main Question Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
              {/* Question Statement */}
              <div className="space-y-4">
                <p className={`font-medium text-slate-900 ${questionTextClass}`}>
                  {currentQ.text}
                </p>

                {/* Optional Code Snippet Block */}
                {currentQ.codeSnippet && (
                  <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-5 overflow-x-auto text-slate-200 font-mono text-xs sm:text-sm leading-relaxed shadow-inner">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-slate-400 text-xs">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        Cuplikan Kode / Skenario
                      </span>
                      <span className="text-xs text-slate-500">Mode Baca Sahaja</span>
                    </div>
                    <pre className="whitespace-pre">{currentQ.codeSnippet}</pre>
                  </div>
                )}
              </div>

              {/* ─── Render Options by Question Type ─── */}
              {/* 1. Single Choice Options */}
              {currentQ.type === 'single' && (
                <div className="space-y-3 pt-2">
                  {currentQ.options?.map((opt) => {
                    const isSelected = answers[currentQ.id] === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [currentQ.id]: opt.key }))
                        }
                        className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all flex items-start gap-4 cursor-pointer group ${
                          isSelected
                            ? 'bg-[#F0F6FE] border-blue-accent text-primary-navy shadow-xs'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70 text-slate-700'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs sm:text-sm shrink-0 transition-all ${
                            isSelected
                              ? 'bg-blue-accent text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className={`flex-1 font-medium leading-relaxed ${optionTextClass} ${isSelected ? 'font-semibold text-primary-navy' : ''}`}>
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 2. Multi-Select Choice Options */}
              {currentQ.type === 'multi' && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-blue-700 font-semibold bg-blue-50 p-2.5 rounded-xl border border-blue-200/60 inline-flex items-center gap-1.5">
                    <Info className="w-4 h-4 shrink-0 text-blue-accent" />
                    Pilih lebih dari satu opsi jawaban yang menurut Anda benar.
                  </p>
                  {currentQ.options?.map((opt) => {
                    const currArr = (answers[currentQ.id] as string[]) || [];
                    const isSelected = currArr.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? currArr.filter((k) => k !== opt.key)
                            : [...currArr, opt.key];
                          setAnswers((prev) => ({ ...prev, [currentQ.id]: updated }));
                        }}
                        className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all flex items-start gap-4 cursor-pointer group ${
                          isSelected
                            ? 'bg-[#F0F6FE] border-blue-accent text-primary-navy shadow-xs'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70 text-slate-700'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs sm:text-sm shrink-0 transition-all ${
                            isSelected
                              ? 'bg-blue-accent text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                          }`}
                        >
                          {isSelected ? <Check className="w-4 h-4" /> : opt.key}
                        </div>
                        <span className={`flex-1 font-medium leading-relaxed ${optionTextClass} ${isSelected ? 'font-semibold text-primary-navy' : ''}`}>
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 3. Short Answer (Isian Singkat) */}
              {currentQ.type === 'short' && (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Tuliskan Jawaban Singkat Anda:
                  </label>
                  <input
                    type="text"
                    value={answers[currentQ.id] || ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))
                    }
                    placeholder="Ketik jawaban singkat Anda di sini (misal: 502)..."
                    className="w-full p-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-accent text-sm sm:text-base font-medium bg-white shadow-xs"
                  />
                  <p className="text-xs text-muted-slate">
                    *Gunakan huruf besar/kecil atau angka sesuai standar teknis resmi.
                  </p>
                </div>
              )}

              {/* 4. Essay (Uraian Naratif / Analitikal) */}
              {currentQ.type === 'essay' && (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-700">
                      Uraian Analisis & Jawaban Esai:
                    </label>
                    <span className="font-mono text-muted-slate">
                      {(answers[currentQ.id] || '').length} karakter
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={answers[currentQ.id] || ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))
                    }
                    placeholder="Uraikan solusi dan pendekatan teknis Anda secara runut dan terstruktur..."
                    className="w-full p-4 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-accent text-sm sm:text-base font-normal leading-relaxed bg-white shadow-xs"
                  />
                  <p className="text-xs text-muted-slate">
                    Jawaban esai Anda akan dinilai berdasarkan rubrik analitis dan pemahaman prinsip arsitektur.
                  </p>
                </div>
              )}

              {/* 5. Matching Pairs (Menjodohkan) */}
              {currentQ.type === 'matching' && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-blue-700 font-semibold bg-blue-50 p-2.5 rounded-xl border border-blue-200/60">
                    Pasangkan setiap komponen di kolom kiri dengan opsi yang sesuai di kolom kanan:
                  </p>
                  <div className="space-y-3">
                    {currentQ.matchingPairs?.map((pair, pIdx) => {
                      const savedPair = (answers[currentQ.id] as Record<string, string>) || {};
                      const selectedVal = savedPair[pair.left] || '';
                      return (
                        <div
                          key={pIdx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200"
                        >
                          <span className="text-sm font-semibold text-ink sm:max-w-xs">
                            {pair.left}
                          </span>
                          <select
                            value={selectedVal}
                            onChange={(e) => {
                              const updated = { ...savedPair, [pair.left]: e.target.value };
                              setAnswers((prev) => ({ ...prev, [currentQ.id]: updated }));
                            }}
                            className="p-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-accent cursor-pointer"
                          >
                            <option value="">-- Pilih Jawaban --</option>
                            {pair.rightOptions.map((opt, oIdx) => (
                              <option key={oIdx} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Navigation Buttons (Spacious, Clear, Accessible) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-8">
              <Button
                variant="outline"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((p) => p - 1)}
                className="text-xs sm:text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer bg-white"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Soal Sebelumnya</span>
              </Button>

              {/* Doubt Marker Button */}
              <button
                type="button"
                onClick={() =>
                  setMarkedDoubt((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))
                }
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border flex items-center gap-2 transition-all cursor-pointer ${
                  markedDoubt[currentQ.id]
                    ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Flag
                  className={`w-4 h-4 ${
                    markedDoubt[currentQ.id] ? 'text-amber-700 fill-amber-700' : 'text-slate-400'
                  }`}
                />
                <span>{markedDoubt[currentQ.id] ? 'Ditandai Ragu-Ragu' : 'Tandai Ragu-Ragu'}</span>
              </button>

              {currentIdx < totalQuestions - 1 ? (
                <Button
                  variant="primary"
                  onClick={() => setCurrentIdx((p) => p + 1)}
                  className="text-xs sm:text-sm px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>Soal Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => setSummaryModalOpen(true)}
                  className="text-xs sm:text-sm px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-sm cursor-pointer font-bold"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Selesai & Kumpulkan</span>
                </Button>
              )}
            </div>
          </div>
        </main>

        {/* ► SISI KANAN: NAVIGATOR GRID 40 SOAL (Clean, Clear Numbers, Quick Filter) ◄ */}
        <aside
          className={`w-80 bg-white border-l border-slate-200/80 p-6 flex flex-col shrink-0 lg:flex ${
            showMobileNav ? 'fixed inset-y-0 right-0 z-50 shadow-2xl flex' : 'hidden lg:flex'
          }`}
        >
          {/* Header Navigator with close button for mobile */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-heading font-bold text-sm text-ink">
                Navigator Soal Ujian
              </h2>
              <p className="text-xs text-muted-slate">
                Klik nomor untuk lompat langsung ke soal
              </p>
            </div>
            {showMobileNav && (
              <button
                onClick={() => setShowMobileNav(false)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Tabs: Semua / Belum / Ragu */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl my-4 text-xs font-medium">
            <button
              onClick={() => setNavFilter('all')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                navFilter === 'all'
                  ? 'bg-white text-primary-navy shadow-xs font-bold'
                  : 'text-slate-600 hover:text-ink'
              }`}
            >
              Semua (40)
            </button>
            <button
              onClick={() => setNavFilter('unanswered')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                navFilter === 'unanswered'
                  ? 'bg-white text-primary-navy shadow-xs font-bold'
                  : 'text-slate-600 hover:text-ink'
              }`}
            >
              Kosong ({unansweredCount})
            </button>
            <button
              onClick={() => setNavFilter('doubt')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                navFilter === 'doubt'
                  ? 'bg-white text-primary-navy shadow-xs font-bold'
                  : 'text-slate-600 hover:text-ink'
              }`}
            >
              Ragu ({doubtCount})
            </button>
          </div>

          {/* 40 Questions Grid (5 Columns, 8 Rows) */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-5 gap-2.5">
              {filteredIndices.map((idx) => {
                const qNum = idx + 1;
                const isCurrent = currentIdx === idx;
                const isAnswered = isQuestionAnswered(qNum);
                const isDoubt = !!markedDoubt[qNum];

                let boxClass = 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300';

                if (isAnswered) {
                  boxClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
                }
                if (isDoubt) {
                  boxClass = 'bg-amber-100 text-amber-900 border-amber-400 font-bold';
                }
                if (isCurrent) {
                  boxClass += ' ring-2 ring-primary-navy ring-offset-2 border-primary-navy';
                }

                return (
                  <button
                    key={qNum}
                    type="button"
                    onClick={() => {
                      setCurrentIdx(idx);
                      if (showMobileNav) setShowMobileNav(false);
                    }}
                    className={`h-10 rounded-xl border text-xs font-mono font-bold transition-all relative flex items-center justify-center cursor-pointer shadow-2xs ${boxClass}`}
                  >
                    <span>{qNum}</span>
                    {isDoubt && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend Explanation */}
          <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
            <span className="font-bold text-slate-700 block text-xs uppercase tracking-wider">
              Keterangan Warna:
            </span>
            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-100 border border-emerald-300 shrink-0" />
                <span>Sudah ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-amber-100 border border-amber-300 shrink-0" />
                <span>Ragu ({doubtCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-slate-100 border border-slate-300 shrink-0" />
                <span>Kosong ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-primary-navy text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                  ●
                </span>
                <span>Aktif</span>
              </div>
            </div>
          </div>

          {/* Quick Finish CTA Button */}
          <div className="pt-4 border-t border-slate-100 mt-3">
            <Button
              variant="outline"
              onClick={() => setSummaryModalOpen(true)}
              className="w-full text-xs font-bold py-2.5 rounded-xl border-slate-300 hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Ringkasan & Kumpulkan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </aside>
      </div>

      {/* ─── LIVE HELPDESK CHAT MODAL ─── */}
      {liveChatOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col text-xs">
          <div className="p-4 bg-primary-navy text-white flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="font-bold block text-sm">Helpdesk Pengawas Ujian</span>
                <span className="text-xs text-blue-200">Online • Siap membantu kendala</span>
              </div>
            </div>
            <button
              onClick={() => setLiveChatOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="h-64 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-accent text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-2xs'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono">{msg.time}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input
              type="text"
              placeholder="Tulis pesan ke helpdesk..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-accent"
            />
            <button
              type="submit"
              className="px-3.5 bg-primary-navy text-white rounded-xl hover:bg-slate-900 cursor-pointer flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ─── MODAL RINGKASAN & KONFIRMASI SUBMIT (Friendly & Reassuring) ─── */}
      <Modal
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        title="Ringkasan & Konfirmasi Pengumpulan Ujian"
        size="md"
      >
        <div className="space-y-5 text-xs text-slate-700">
          <div className="p-4 bg-blue-50 border border-blue-200/80 rounded-2xl space-y-1 text-primary-navy">
            <span className="font-heading font-bold text-sm block">
              Apakah Anda yakin ingin menyelesaikan ujian ini?
            </span>
            <p className="text-slate-600 leading-relaxed text-xs">
              Pastikan Anda telah memeriksa kembali seluruh jawaban sebelum melakukan pengumpulan akhir.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="block text-xs text-emerald-800 font-semibold">Terjawab</span>
              <span className="font-mono text-xl font-bold text-emerald-900 mt-0.5 block">
                {answeredCount}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <span className="block text-xs text-amber-800 font-semibold">Ragu-Ragu</span>
              <span className="font-mono text-xl font-bold text-amber-900 mt-0.5 block">
                {doubtCount}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-center">
              <span className="block text-xs text-slate-600 font-semibold">Belum Dijawab</span>
              <span className="font-mono text-xl font-bold text-slate-800 mt-0.5 block">
                {unansweredCount}
              </span>
            </div>
          </div>

          {unansweredCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Masih terdapat <strong>{unansweredCount} soal</strong> yang belum terisi. Anda masih memiliki sisa waktu untuk mengerjakannya.
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setSummaryModalOpen(false)}
              className="text-xs py-2.5 rounded-xl cursor-pointer"
            >
              Periksa Kembali Soal
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitExam}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2.5 rounded-xl font-bold cursor-pointer"
            >
              Ya, Kumpulkan Jawaban Saya
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── MODAL SUKSES SUBMIT DENGAN ARAHAN KE TAHAP WAWANCARA ─── */}
      <Modal
        isOpen={submitSuccessModalOpen}
        onClose={() => {
          setSubmitSuccessModalOpen(false);
          setIsExamLocked(true);
          navigate('/peserta/waiting-room');
        }}
        title="Ujian CAT 40 Soal Berhasil Dikumpulkan!"
        size="md"
      >
        <div className="space-y-5 text-center p-2">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-heading font-extrabold text-xl text-slate-900">
              Selamat, Jawaban Anda Telah Tersimpan!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              Seluruh 40 butir jawaban CAT Anda telah dienkripsi dan diverifikasi oleh sistem Talenta+.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/80 text-left space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-primary-navy">
              <Video className="w-4 h-4 text-blue-600" />
              <span>Tahap Selanjutnya: Wawancara Kompetensi (Tahap 3 &amp; 4)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Asesor atau AI Gemini Live akan menguji penalaran studi kasus yang baru saja Anda jawab. Silakan masuk ke <strong>Ruang Tunggu Asesor (Waiting Room)</strong> untuk persiapan sesi wawancara.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSubmitSuccessModalOpen(false);
                setIsExamLocked(true);
                navigate('/peserta/hasil');
              }}
              className="w-full sm:w-auto text-xs py-2.5 px-4 rounded-xl cursor-pointer"
            >
              Lihat Skor CAT Sementara
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setSubmitSuccessModalOpen(false);
                setIsExamLocked(true);
                navigate('/peserta/waiting-room');
              }}
              className="w-full sm:w-auto text-xs py-2.5 px-6 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-sm cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Lanjut ke Ruang Tunggu Wawancara</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── MODAL PERINGATAN INTEGRITAS (Friendly, Calm, Reassuring) ─── */}
      <Modal
        isOpen={violationAlertOpen}
        onClose={() => setViolationAlertOpen(false)}
        title="Pemberitahuan Sistem Pengawasan (Proctoring)"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Perhatian: Aktivitas Tidak Biasa Terdeteksi</span>
            </div>
            <p className="leading-relaxed text-xs text-amber-900">
              {latestViolation?.description ||
                'Sistem mendeteksi fokus layar teralihkan dari lembar ujian. Harap tetap berada di mode layar penuh dan fokus menghadap ke kamera.'}
            </p>
            <div className="pt-2 text-xs font-mono text-amber-800 flex items-center justify-between border-t border-amber-200/60">
              <span>Waktu Kejadian: {latestViolation?.timestamp}</span>
              <span>Catatan: {violations.length} dari 10 toleransi</span>
            </div>
          </div>

          <p className="text-slate-600 leading-relaxed text-xs">
            Ujian ini diawasi secara otomatis untuk memastikan keadilan bagi semua peserta seleksi. Mohon untuk tidak berpindah jendela peramban.
          </p>

          <div className="pt-2 flex justify-end">
            <Button
              variant="primary"
              onClick={() => setViolationAlertOpen(false)}
              className="text-xs py-2.5 px-5 rounded-xl bg-primary-navy hover:bg-slate-900 text-white font-bold cursor-pointer"
            >
              Saya Mengerti & Lanjutkan Ujian
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
